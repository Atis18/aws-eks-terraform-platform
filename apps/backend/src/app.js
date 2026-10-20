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

app.post("/api/equipments", async (req, res) => {
  const { name, type, amount } = req.body ?? {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 150 ||
    typeof type !== "string" ||
    !type.trim() ||
    type.length > 100 ||
    !Number.isInteger(amount) ||
    amount < 0 ||
    amount > 2147483647
  ) {
    return res.status(400).json({
      error: "Invalid equipment data.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO equipments (name, type, amount)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, amount, created`,
      [name.trim(), type.trim(), amount]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create equipment:", error);
    return res.status(500).json({
      error: "Failed to create equipment.",
    });
  }
});

export default app;