import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import app from "../src/app.js";
import { pool } from "../src/db.js";

test("GET /api/employees returns mapped employee list", async (t) => {
  const created = "2026-10-20T12:00:00.000Z";

  t.mock.method(pool, "query", async (sql) => {
    assert.match(sql, /FROM employees/i);
    assert.match(sql, /LEFT JOIN equipments/i);

    return {
      rows: [
        {
          id: "employee-1",
          first_name: "Anna",
          middle_name: null,
          last_name: "Kovacs",
          full_name: "anna kovacs",
          position: "Developer",
          level: "Junior",
          equipment: "Laptop",
          created,
        },
      ],
    };
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/employees`
    );

    assert.equal(response.status, 200);

    assert.deepEqual(await response.json(), [
      {
        id: "employee-1",
        name: {
          firstName: "Anna",
          middleName: "",
          lastName: "Kovacs",
        },
        fullName: "anna kovacs",
        position: "Developer",
        level: "Junior",
        equipment: "Laptop",
        created,
      },
    ]);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

const withServer = async (callback) => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const url = `http://127.0.0.1:${server.address().port}`;
    await callback(url);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
};

const employeeId = "00000000-0000-4000-8000-000000000001";

test("GET /api/employees/:id returns an employee", async (t) => {
  const row = {
    id: employeeId,
    first_name: "Anna",
    middle_name: null,
    last_name: "Kovacs",
    full_name: "anna kovacs",
    position: "Developer",
    level: "Junior",
    equipment: "Laptop",
    created: "2026-10-20T12:00:00.000Z",
  };

  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /FROM employees/i);
    assert.match(sql, /LEFT JOIN equipments/i);
    assert.match(sql, /WHERE e\.id = \$1/i);
    assert.deepEqual(params, [employeeId]);

    return { rows: [row] };
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: employeeId,
      name: {
        firstName: "Anna",
        middleName: "",
        lastName: "Kovacs",
      },
      fullName: "anna kovacs",
      position: "Developer",
      level: "Junior",
      equipment: "Laptop",
      created: row.created,
    });
  });
});

test("GET /api/employees/:id rejects invalid UUID", async (t) => {
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Database should not be called");
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/invalid-id`
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid employee ID.",
    });

    assert.equal(query.mock.callCount(), 0);
  });
});

test("GET /api/employees/:id returns 404 when not found", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rows: [],
  }));

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "Employee not found.",
    });
  });
});

test("POST /api/employees creates an employee", async (t) => {
  const created = "2026-10-20T14:00:00.000Z";
  const equipmentId = "66227f26-85d0-478d-bc4e-86cf09949250";

  t.mock.method(pool, "query", async (sql, params) => {
    if (/SELECT id FROM equipments/i.test(sql)) {
      assert.deepEqual(params, ["Laptop"]);

      return {
        rows: [{ id: equipmentId }],
      };
    }

    assert.match(sql, /INSERT INTO employees/i);
    assert.deepEqual(params, [
      "Peter",
      null,
      "Nagy",
      "Backend Developer",
      "Junior",
      equipmentId,
    ]);

    return {
      rows: [{
        id: employeeId,
        first_name: "Peter",
        middle_name: null,
        last_name: "Nagy",
        full_name: "peter nagy",
        position: "Backend Developer",
        level: "Junior",
        created,
      }],
    };
  });

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: {
          firstName: "Peter",
          lastName: "Nagy",
        },
        position: "Backend Developer",
        level: "Junior",
        equipment: "Laptop",
      }),
    });

    assert.equal(response.status, 201);

    assert.deepEqual(await response.json(), {
      id: employeeId,
      name: {
        firstName: "Peter",
        middleName: "",
        lastName: "Nagy",
      },
      fullName: "peter nagy",
      position: "Backend Developer",
      level: "Junior",
      equipment: "Laptop",
      created,
    });
  });
});

test("POST /api/employees rejects invalid data", async (t) => {
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Database should not be called");
  });

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: {
          firstName: "",
          lastName: "Nagy",
        },
        position: "Developer",
        level: "Junior",
      }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid employee data.",
    });
    assert.equal(query.mock.callCount(), 0);
  });
});

test("POST /api/employees rejects unknown equipment", async (t) => {
  const query = t.mock.method(pool, "query", async () => ({
    rows: [],
  }));

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: {
          firstName: "Peter",
          lastName: "Nagy",
        },
        position: "Developer",
        level: "Junior",
        equipment: "Unknown Device",
      }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Unknown equipment.",
    });
    assert.equal(query.mock.callCount(), 1);
  });
});

test("POST /api/employees allows no equipment", async (t) => {
  const query = t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /INSERT INTO employees/i);
    assert.equal(params[5], null);

    return {
      rows: [{
        id: employeeId,
        first_name: "Peter",
        middle_name: null,
        last_name: "Nagy",
        full_name: "peter nagy",
        position: "Developer",
        level: "Junior",
        created: "2026-10-20T14:00:00.000Z",
      }],
    };
  });

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: {
          firstName: "Peter",
          lastName: "Nagy",
        },
        position: "Developer",
        level: "Junior",
      }),
    });

    assert.equal(response.status, 201);
    assert.equal((await response.json()).equipment, "N/A");
    assert.equal(query.mock.callCount(), 1);
  });
});

test("PATCH /api/employees/:id updates level", async (t) => {
  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /UPDATE employees/i);
    assert.deepEqual(params, [
      employeeId,
      null, false, null, null, null, "Medior", false, null,
    ]);

    return {
      rows: [{
        id: employeeId,
        first_name: "Peter",
        middle_name: null,
        last_name: "Nagy",
        full_name: "peter nagy",
        position: "Developer",
        level: "Medior",
        equipment: "Laptop",
        created: "2026-10-20T14:00:00.000Z",
      }],
    };
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "Medior" }),
      }
    );

    assert.equal(response.status, 200);

    const employee = await response.json();
    assert.equal(employee.level, "Medior");
    assert.equal(employee.name.firstName, "Peter");
    assert.equal(employee.equipment, "Laptop");
  });
});

test("PATCH /api/employees/:id updates first name", async (t) => {
  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /UPDATE employees/i);
    assert.deepEqual(params, [
      employeeId,
      "Bela", false, null, null, null, null, false, null,
    ]);

    return {
      rows: [{
        id: employeeId,
        first_name: "Bela",
        middle_name: null,
        last_name: "Nagy",
        full_name: "bela nagy",
        position: "Developer",
        level: "Junior",
        equipment: "Laptop",
        created: "2026-10-20T14:00:00.000Z",
      }],
    };
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: { firstName: "Bela" },
        }),
      }
    );

    assert.equal(response.status, 200);

    const employee = await response.json();
    assert.equal(employee.name.firstName, "Bela");
    assert.equal(employee.fullName, "bela nagy");
  });
});

test("PATCH /api/employees/:id removes equipment", async (t) => {
  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /UPDATE employees/i);
    assert.deepEqual(params, [
      employeeId,
      null, false, null, null, null, null, true, null,
    ]);

    return {
      rows: [{
        id: employeeId,
        first_name: "Peter",
        middle_name: null,
        last_name: "Nagy",
        full_name: "peter nagy",
        position: "Developer",
        level: "Junior",
        equipment: "N/A",
        created: "2026-10-20T14:00:00.000Z",
      }],
    };
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipment: null }),
      }
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).equipment, "N/A");
  });
});

test("PATCH /api/employees/:id rejects invalid level", async (t) => {
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Database should not be called");
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "" }),
      }
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid employee data.",
    });
    assert.equal(query.mock.callCount(), 0);
  });
});

test("PATCH /api/employees/:id returns 404 when not found", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rows: [],
  }));

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/employees/${employeeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "Medior" }),
      }
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "Employee not found.",
    });
  });
});