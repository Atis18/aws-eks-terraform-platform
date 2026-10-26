import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app.js";
import { pool } from "../src/db.js";

test("GET /api/health returns OK", async () => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const port = server.address().port;
    const response = await fetch(
      `http://127.0.0.1:${port}/api/health`
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

for (const available of [true, false]) {
  test(`GET /api/ready returns ${available ? 200 : 503} when database is ${available ? "available" : "unavailable"}`, async (t) => {
    t.mock.method(pool, "query", async (sql) => {
      assert.equal(sql, "SELECT 1");
      if (!available) throw new Error("Database unavailable");
      return { rows: [{ "?column?": 1 }] };
    });
    const server = app.listen(0, "127.0.0.1");
    try {
      await once(server, "listening");
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ready`);
      assert.equal(response.status, available ? 200 : 503);
      assert.deepEqual(await response.json(), { status: available ? "ready" : "unavailable" });
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
}