import express from "express";
import { pool } from "./db.js";

const uuidPattern =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

app.get("/api/equipments/:id", async (req, res) => {
  const { id } = req.params;

  if (!uuidPattern.test(id)) {
    return res.status(400).json({
      error: "Invalid equipment ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, type, amount, created
       FROM equipments
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Equipment not found.",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to load equipment:", error);

    return res.status(500).json({
      error: "Failed to load equipment.",
    });
  }
});

app.patch("/api/equipments/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!uuidPattern.test(id)) {
    return res.status(400).json({
      error: "Invalid equipment ID.",
    });
  }

  const allowedFields = ["name", "type", "amount"];

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length === 0 ||
    Object.keys(data).some((key) => !allowedFields.includes(key))
  ) {
    return res.status(400).json({
      error: "Invalid equipment data.",
    });
  }

  const { name, type, amount } = data;

  if (
    (name !== undefined &&
      (typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 150)) ||
    (type !== undefined &&
      (typeof type !== "string" ||
        !type.trim() ||
        type.trim().length > 100)) ||
    (amount !== undefined &&
      (!Number.isInteger(amount) ||
        amount < 0 ||
        amount > 2147483647))
  ) {
    return res.status(400).json({
      error: "Invalid equipment data.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE equipments
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           amount = COALESCE($4, amount)
       WHERE id = $1
       RETURNING id, name, type, amount, created`,
      [
        id,
        name?.trim() ?? null,
        type?.trim() ?? null,
        amount ?? null,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Equipment not found.",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update equipment:", error);

    return res.status(500).json({
      error: "Failed to update equipment.",
    });
  }
});

app.delete("/api/equipments/:id", async (req, res) => {
  const { id } = req.params;

  if (!uuidPattern.test(id)) {
    return res.status(400).json({
      error: "Invalid equipment ID.",
    });
  }

  try {
    const result = await pool.query(
      "DELETE FROM equipments WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Equipment not found.",
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete equipment:", error);

    return res.status(500).json({
      error: "Failed to delete equipment.",
    });
  }
});

app.get("/api/employees", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.full_name,
        e.position,
        e.level,
        COALESCE(eq.name, 'N/A') AS equipment,
        e.created
      FROM employees e
      LEFT JOIN equipments eq ON eq.id = e.equipment_id
      ORDER BY e.created DESC, e.id DESC
    `);

    const employees = result.rows.map((row) => ({
      id: row.id,
      name: {
        firstName: row.first_name,
        middleName: row.middle_name ?? "",
        lastName: row.last_name,
      },
      fullName: row.full_name,
      position: row.position,
      level: row.level,
      equipment: row.equipment,
      created: row.created,
    }));

    return res.json(employees);
  } catch (error) {
    console.error("Failed to load employees:", error);

    return res.status(500).json({
      error: "Failed to load employees.",
    });
  }
});

app.get("/api/employees/:id", async (req, res) => {
  const { id } = req.params;

  if (!uuidPattern.test(id)) {
    return res.status(400).json({
      error: "Invalid employee ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         e.id,
         e.first_name,
         e.middle_name,
         e.last_name,
         e.full_name,
         e.position,
         e.level,
         COALESCE(eq.name, 'N/A') AS equipment,
         e.created
       FROM employees e
       LEFT JOIN equipments eq ON eq.id = e.equipment_id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Employee not found.",
      });
    }

    const row = result.rows[0];

    return res.json({
      id: row.id,
      name: {
        firstName: row.first_name,
        middleName: row.middle_name ?? "",
        lastName: row.last_name,
      },
      fullName: row.full_name,
      position: row.position,
      level: row.level,
      equipment: row.equipment,
      created: row.created,
    });
  } catch (error) {
    console.error("Failed to load employee:", error);

    return res.status(500).json({
      error: "Failed to load employee.",
    });
  }
});

app.post("/api/employees", async (req, res) => {
  const { name, position, level, equipment } = req.body ?? {};

  const validText = (value, maxLength) =>
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength;

  if (
    !name ||
    typeof name !== "object" ||
    Array.isArray(name) ||
    !validText(name.firstName, 100) ||
    !validText(name.lastName, 100) ||
    (name.middleName != null &&
      (typeof name.middleName !== "string" ||
        name.middleName.trim().length > 100)) ||
    !validText(position, 100) ||
    !validText(level, 100) ||
    (equipment != null &&
      (typeof equipment !== "string" ||
        equipment.trim().length > 150))
  ) {
    return res.status(400).json({
      error: "Invalid employee data.",
    });
  }

  const equipmentName = equipment?.trim() ?? "";
  let equipmentId = null;

  try {
    if (equipmentName && equipmentName !== "N/A") {
      const matches = await pool.query(
        "SELECT id FROM equipments WHERE name = $1 LIMIT 2",
        [equipmentName]
      );

      if (matches.rows.length === 0) {
        return res.status(400).json({
          error: "Unknown equipment.",
        });
      }

      if (matches.rows.length > 1) {
        return res.status(409).json({
          error: "Equipment name is ambiguous.",
        });
      }

      equipmentId = matches.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO employees (
         first_name,
         middle_name,
         last_name,
         position,
         level,
         equipment_id
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         first_name,
         middle_name,
         last_name,
         full_name,
         position,
         level,
         created`,
      [
        name.firstName.trim(),
        name.middleName?.trim() || null,
        name.lastName.trim(),
        position.trim(),
        level.trim(),
        equipmentId,
      ]
    );

    const row = result.rows[0];

    return res.status(201).json({
      id: row.id,
      name: {
        firstName: row.first_name,
        middleName: row.middle_name ?? "",
        lastName: row.last_name,
      },
      fullName: row.full_name,
      position: row.position,
      level: row.level,
      equipment: equipmentId ? equipmentName : "N/A",
      created: row.created,
    });
  } catch (error) {
    console.error("Failed to create employee:", error);

    return res.status(500).json({
      error: "Failed to create employee.",
    });
  }
});

export default app;