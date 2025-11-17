import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
import { Employee } from "./models/Employee";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) {
  console.error("[hr-personal-svc] Falta MONGO_URI en variables de entorno");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("[hr-personal-svc] DB conectado:", mongoose.connection.name);

// Salud
app.get("/health", (_req, res) => res.json({ ok: true, service: "hr-personal" }));

// Helpers
function pickEditable(body: any) {
  const out: any = {};
  if (typeof body.area === "string") out.area = body.area;
  if (typeof body.cargo === "string") out.cargo = body.cargo;
  if (typeof body.remuneracion === "number") out.remuneracion = body.remuneracion;
  return out;
}

// Alta de empleado
app.post("/employees", async (req, res) => {
  try {
    const { email, nombreCompleto, area, cargo, remuneracion, fecha_ingreso } = req.body || {};
    const emailStr = typeof email === "string" ? email.trim() : "";
    const nombreStr = typeof nombreCompleto === "string" ? nombreCompleto.trim() : "";
    const areaStr = typeof area === "string" ? area.trim() : "";
    const cargoStr = typeof cargo === "string" ? cargo.trim() : "";
    const remNum = typeof remuneracion === "number" ? remuneracion : Number(remuneracion);
    const fecha = fecha_ingreso ? new Date(fecha_ingreso) : null;

    if (!emailStr || !nombreStr || Number.isNaN(remNum) || remNum < 0 || !fecha || isNaN(fecha.getTime())) {
      return res.status(400).json({
        error: "Campos requeridos",
        detail: {
          email: !emailStr ? "requerido" : undefined,
          nombreCompleto: !nombreStr ? "requerido" : undefined,
          remuneracion: (Number.isNaN(remNum) || remNum < 0) ? "número >= 0 requerido" : undefined,
          fecha_ingreso: !fecha || isNaN(fecha.getTime()) ? "fecha válida requerida (YYYY-MM-DD)" : undefined,
        },
      });
    }

    const exists = await Employee.findOne({ email: emailStr });
    if (exists) return res.status(400).json({ error: "email ya registrado" });

    const doc = await Employee.create({
      email: emailStr,
      nombreCompleto: nombreStr,
      area: areaStr,
      cargo: cargoStr,
      remuneracion: remNum,
      activo: true,
      fecha_ingreso: fecha,
    });
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo crear" });
  }
});

// Modificar área/cargo/remuneración
app.patch("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updates = pickEditable(body);
    if (typeof body.remuneracion !== "undefined") {
      const rem = typeof body.remuneracion === "number" ? body.remuneracion : Number(body.remuneracion);
      if (!Number.isNaN(rem)) updates.remuneracion = rem;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "nada para actualizar" });

    const doc = await Employee.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ error: "no encontrado" });
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo actualizar" });
  }
});

// Edición completa
app.put("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, nombreCompleto, area, cargo, remuneracion, fecha_ingreso } = req.body || {};
    const emailStr = typeof email === "string" ? email.trim() : undefined;
    const nombreStr = typeof nombreCompleto === "string" ? nombreCompleto.trim() : undefined;
    const areaStr = typeof area === "string" ? area.trim() : undefined;
    const cargoStr = typeof cargo === "string" ? cargo.trim() : undefined;
    const remNum = typeof remuneracion === "number" ? remuneracion : (typeof remuneracion !== "undefined" ? Number(remuneracion) : undefined);
    const fecha = typeof fecha_ingreso !== "undefined" ? new Date(fecha_ingreso) : undefined;

    const set: any = {};
    if (typeof emailStr !== "undefined") set.email = emailStr;
    if (typeof nombreStr !== "undefined") set.nombreCompleto = nombreStr;
    if (typeof areaStr !== "undefined") set.area = areaStr;
    if (typeof cargoStr !== "undefined") set.cargo = cargoStr;
    if (typeof remNum !== "undefined") {
      if (Number.isNaN(remNum) || remNum < 0) return res.status(400).json({ error: "remuneracion inválida" });
      set.remuneracion = remNum;
    }
    if (typeof fecha !== "undefined") {
      if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return res.status(400).json({ error: "fecha_ingreso inválida" });
      set.fecha_ingreso = fecha;
    }

    if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para actualizar" });

    if (typeof set.email === "string") {
      const dup = await Employee.findOne({ email: set.email, _id: { $ne: id } });
      if (dup) return res.status(400).json({ error: "email ya registrado" });
    }

    const updated = await Employee.findByIdAndUpdate(id, set, { new: true });
    if (!updated) return res.status(404).json({ error: "no encontrado" });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo actualizar" });
  }
});

// Dar de baja
app.patch("/employees/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Employee.findById(id);
    if (!doc) return res.status(404).json({ error: "no encontrado" });
    if (doc.activo === false) return res.status(400).json({ error: "ya está dado de baja" });

    doc.activo = false;
    doc.fecha_baja = new Date();
    await doc.save();
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo dar de baja" });
  }
});

// Rehabilitar (reingreso)
app.patch("/employees/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Employee.findById(id);
    if (!doc) return res.status(404).json({ error: "no encontrado" });
    if (doc.activo === true) return res.status(400).json({ error: "ya está activo" });

    doc.activo = true;
    doc.fecha_baja = undefined as any;
    await doc.save();
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo rehabilitar" });
  }
});

// Eliminación definitiva
app.delete("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Employee.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "no encontrado" });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo eliminar" });
  }
});

// Listar / Detalle
app.get("/employees", async (req, res) => {
  const { activo, area, q } = req.query as any;
  const filter: any = {};
  if (typeof activo !== "undefined") filter.activo = String(activo) === "true";
  if (area) filter.area = area;
  if (q) {
    filter.$or = [
      { email: { $regex: String(q), $options: "i" } },
      { nombreCompleto: { $regex: String(q), $options: "i" } },
    ];
  }
  const rows = await Employee.find(filter).sort({ createdAt: -1 }).lean();
  res.json(rows);
});

app.get("/employees/:id", async (req, res) => {
  const doc = await Employee.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "no encontrado" });
  res.json(doc);
});

const port = Number(process.env.PORT || 4003);
app.listen(port, () => console.log("HR-Personal service on http://localhost:" + port));
