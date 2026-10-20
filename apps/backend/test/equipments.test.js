import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import app from "../src/app.js";
import { pool } from "../src/db.js";

test("GET /api/equipments returns equipment list", async (t) => {
  const equipment = {
    id: "66227f26-85d0-478d-bc4e-86cf09949250",
    name: "Laptop",
    type: "Computer",
    amount: 3,
    created: "2026-10-20T11:24:20.176Z",
  };

  // Mock the database query so the test needs no running PostgreSQL.
  t.mock.method(pool, "query", async (sql) => {
    assert.match(sql, /FROM\s+equipments/i);
    return { rows: [equipment] };
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/equipments`
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [equipment]);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

test("POST /api/equipments creates equipment", async (t) => {
  const equipment = {
    id: "test-uuid",
    name: "Monitor",
    type: "Display",
    amount: 2,
    created: "2026-10-20T12:00:00.000Z",
  };

  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /INSERT INTO equipments/i);
    assert.deepEqual(params, ["Monitor", "Display", 2]);

    return { rows: [equipment] };
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/equipments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Monitor",
          type: "Display",
          amount: 2,
        }),
      }
    );

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), equipment);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("POST /api/equipments rejects negative amount", async (t) => {
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Database should not be called");
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/equipments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Monitor",
          type: "Display",
          amount: -5,
        }),
      }
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid equipment data.",
    });

    assert.equal(query.mock.callCount(), 0);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
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
      server.close((error) => error ? reject(error) : resolve());
    });
  }
};

const equipmentId = "66227f26-85d0-478d-bc4e-86cf09949250";

test("GET /api/equipments/:id returns equipment", async (t) => {
  const equipment = {
    id: equipmentId,
    name: "Laptop",
    type: "Computer",
    amount: 3,
  };

  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /WHERE id = \$1/i);
    assert.deepEqual(params, [equipmentId]);
    return { rows: [equipment] };
  });

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/equipments/${equipmentId}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), equipment);
  });
});

test("GET /api/equipments/:id rejects invalid UUID", async (t) => {
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Database should not be called");
  });

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/equipments/invalid-id`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid equipment ID.",
    });
    assert.equal(query.mock.callCount(), 0);
  });
});

test("GET /api/equipments/:id returns 404 when not found", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rows: [],
  }));

  await withServer(async (url) => {
    const response = await fetch(`${url}/api/equipments/${equipmentId}`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "Equipment not found.",
    });
  });
});

test("PATCH /api/equipments/:id updates equipment", async (t) => {
  const updatedEquipment = {
    id: equipmentId,
    name: "Laptop",
    type: "Computer",
    amount: 5,
  };

  t.mock.method(pool, "query", async (sql, params) => {
    assert.match(sql, /UPDATE equipments/i);
    assert.deepEqual(params, [equipmentId, null, null, 5]);

    return { rows: [updatedEquipment] };
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/equipments/${equipmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 5 }),
      }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), updatedEquipment);
  });
});

test("PATCH /api/equipments/:id rejects negative amount", async (t) => {
  const query = t.mock.method(pool, "query", async () => {
    throw new Error("Database should not be called");
  });

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/equipments/${equipmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: -10 }),
      }
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid equipment data.",
    });

    assert.equal(query.mock.callCount(), 0);
  });
});

test("PATCH /api/equipments/:id returns 404 when not found", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rows: [],
  }));

  await withServer(async (url) => {
    const response = await fetch(
      `${url}/api/equipments/${equipmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 5 }),
      }
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "Equipment not found.",
    });
  });
});