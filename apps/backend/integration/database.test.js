import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

// Explicit opt-in: never silently use the application's database configuration.
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL must point to a disposable PostgreSQL database.");

async function withDatabase(callback) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    const schema = `test_${randomUUID().replaceAll("-", "")}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}", public`);
    for (const migration of ["001_create_equipments.sql", "002_create_employees.sql"]) {
      await client.query(await readFile(new URL(`../db/migrations/${migration}`, import.meta.url), "utf8"));
    }
    await callback(client);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}

test("migrations support equipment CRUD and generated UUIDs", async () => {
  await withDatabase(async (db) => {
    const { rows: [equipment] } = await db.query(
      "INSERT INTO equipments (name, type, amount) VALUES ($1, $2, $3) RETURNING *",
      ["Laptop", "Computer", 2],
    );
    assert.match(equipment.id, /^[0-9a-f-]{36}$/);
    await db.query("UPDATE equipments SET amount = $1 WHERE id = $2", [3, equipment.id]);
    const { rows: [updated] } = await db.query("SELECT * FROM equipments WHERE id = $1", [equipment.id]);
    assert.equal(updated.amount, 3);
    assert.equal((await db.query("DELETE FROM equipments WHERE id = $1", [equipment.id])).rowCount, 1);
  });
});

test("PostgreSQL rejects negative equipment stock", async () => {
  await withDatabase(async (db) => {
    await assert.rejects(db.query(
      "INSERT INTO equipments (name, type, amount) VALUES ($1, $2, $3)",
      ["Laptop", "Computer", -1],
    ), { code: "23514" });
  });
});

test("employee full name is normalized and recomputed after updates", async () => {
  await withDatabase(async (db) => {
    const { rows: [employee] } = await db.query(
      "INSERT INTO employees (first_name, middle_name, last_name, position, level) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [" Anna ", " Maria ", " Kovacs ", "Developer", "Junior"],
    );
    assert.equal(employee.full_name, "anna maria kovacs");
    const { rows: [updated] } = await db.query(
      "UPDATE employees SET middle_name = NULL WHERE id = $1 RETURNING full_name", [employee.id],
    );
    assert.equal(updated.full_name, "anna kovacs");
  });
});

test("deleting equipment preserves employees and clears their assignment", async () => {
  await withDatabase(async (db) => {
    const { rows: [equipment] } = await db.query(
      "INSERT INTO equipments (name, type, amount) VALUES ('Laptop', 'Computer', 1) RETURNING id",
    );
    const { rows: [employee] } = await db.query(
      "INSERT INTO employees (first_name, last_name, position, level, equipment_id) VALUES ('Anna', 'Kovacs', 'Developer', 'Junior', $1) RETURNING id",
      [equipment.id],
    );
    await db.query("DELETE FROM equipments WHERE id = $1", [equipment.id]);
    const { rows } = await db.query("SELECT equipment_id FROM employees WHERE id = $1", [employee.id]);
    assert.deepEqual(rows, [{ equipment_id: null }]);
  });
});

test("PostgreSQL rejects references to missing equipment", async () => {
  await withDatabase(async (db) => {
    await assert.rejects(db.query(
      "INSERT INTO employees (first_name, last_name, position, level, equipment_id) VALUES ('Anna', 'Kovacs', 'Developer', 'Junior', $1)",
      [randomUUID()],
    ), { code: "23503" });
  });
});

test("PostgreSQL rejects whitespace-only required employee names", async () => {
  await withDatabase(async (db) => {
    await assert.rejects(db.query(
      "INSERT INTO employees (first_name, last_name, position, level) VALUES ('   ', 'Kovacs', 'Developer', 'Junior')",
    ), { code: "23514" });
  });
});
