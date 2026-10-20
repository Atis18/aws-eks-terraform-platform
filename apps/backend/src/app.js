import express from "express";
import { pool } from "./db.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/api/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.get("/api/equipments", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, type, amount, created
      FROM equipments
      ORDER BY created DESC, id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to load equipments:", error);
    res.status(500).json({
      error: "Failed to load equipments.",
    });
  }
});

export default app;