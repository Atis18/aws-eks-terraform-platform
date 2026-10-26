import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createPoolConfig } from "../src/db.js";

test("local PostgreSQL configuration does not enable TLS", () => {
  const config = createPoolConfig({ PGHOST: "localhost", PGPORT: "5433" });
  assert.equal(config.host, "localhost");
  assert.equal(config.port, 5433);
  assert.equal(config.ssl, false);
});

test("RDS TLS requires a CA certificate path", () => {
  assert.throws(() => createPoolConfig({ PGSSL: "true" }), /PGSSLROOTCERT/);
});

test("RDS TLS verifies certificates using the bundled regional CA", () => {
  const config = createPoolConfig({
    PGSSL: "true",
    PGSSLROOTCERT: fileURLToPath(new URL("../certs/eu-central-1-bundle.pem", import.meta.url)),
  });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.match(config.ssl.ca, /-----BEGIN CERTIFICATE-----/);
});

test("an unreadable CA certificate fails instead of downgrading TLS", () => {
  assert.throws(() => createPoolConfig({
    PGSSL: "true", PGSSLROOTCERT: "/nonexistent/rds-ca.pem",
  }), { code: "ENOENT" });
});
