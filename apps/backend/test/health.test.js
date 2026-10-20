import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app.js";

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