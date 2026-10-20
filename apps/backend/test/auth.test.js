import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";

import { requireAuth } from "../src/auth.js";
import { createApp } from "../src/app.js";

async function withServer(verifyToken, callback) {
  const app = express();

  app.get("/protected", requireAuth(verifyToken), (req, res) => {
    res.json({ uid: req.user.uid });
  });

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
}

test("Auth rejects missing token", async () => {
  await withServer(
    async () => {
      throw new Error("Verifier should not be called");
    },
    async (url) => {
      const response = await fetch(`${url}/protected`);

      assert.equal(response.status, 401);
    }
  );
});

test("Auth rejects invalid token", async () => {
  await withServer(
    async () => {
      throw new Error("Invalid token");
    },
    async (url) => {
      const response = await fetch(`${url}/protected`, {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      assert.equal(response.status, 401);
    }
  );
});

test("Auth accepts valid token and exposes user UID", async () => {
  await withServer(
    async (token) => {
      assert.equal(token, "valid-test-token");
      return { uid: "firebase-user-123" };
    },
    async (url) => {
      const response = await fetch(`${url}/protected`, {
        headers: {
          Authorization: "Bearer valid-test-token",
        },
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        uid: "firebase-user-123",
      });
    }
  );
});

test("CRUD endpoints require authentication", async () => {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const url = `http://127.0.0.1:${server.address().port}`;

    for (const path of ["/api/employees", "/api/equipments"]) {
      const response = await fetch(`${url}${path}`);

      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: "Unauthorized.",
      });
    }

    const healthResponse = await fetch(`${url}/api/health`);

    assert.equal(healthResponse.status, 200);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});