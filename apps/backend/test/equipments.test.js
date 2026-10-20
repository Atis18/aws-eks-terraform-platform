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