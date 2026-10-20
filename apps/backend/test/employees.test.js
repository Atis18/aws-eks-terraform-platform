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