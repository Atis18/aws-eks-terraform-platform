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