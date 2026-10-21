import { readFileSync } from "node:fs";
import pg from "pg";

const { Pool } = pg;

export const createPoolConfig = (env = process.env) => {
  const config = {
    host: env.PGHOST,
    port: Number(env.PGPORT ?? 5432),
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: false,
  };

  if (env.PGSSL === "true") {
    if (!env.PGSSLROOTCERT) {
      throw new Error("PGSSLROOTCERT is required when PGSSL=true.");
    }

    config.ssl = {
      ca: readFileSync(env.PGSSLROOTCERT, "utf8"),
      rejectUnauthorized: true,
    };
  }

  return config;
};

export const pool = new Pool(createPoolConfig());