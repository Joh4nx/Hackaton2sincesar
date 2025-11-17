import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
import { VacationRequest } from "./models/VacationRequest";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) {
  console.error("[hr-vacation-svc] Falta MONGO_URI en variables de entorno");
  process.exit(1);
}
await mongoose.connect(MONGO_URI);
console.log("[hr-vacation-svc] DB conectado:", mongoose.connection.name);

// Modelo ligero para leer empleados creados por hr-personal-svc
const Employee = mongoose.model(
  "Employee",
  new mongoose.Schema(
    {
      email: String,
      nombreCompleto: String,
      fecha_ingreso: Date,
      activo: Boolean,
    },
    { collection: "employees" }
  )
);

// Salud
app.get("/health", (_req, res) => res.json({ ok: true, service: "hr-vacation" }));

// Helpers
function yearsDiff(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365);
}

async function getEligibility(employeeId: string) {
  const emp = await Employee.findById(employeeId).lean() as any;
  if (!emp) return { eligible: false, daysAvailable: 0, since: null };
  if (emp.activo === false) return { eligible: false, daysAvailable: 0, since: emp.fecha_ingreso };
  const ingreso = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : null;
  if (!ingreso || isNaN(ingreso.getTime())) return { eligible: false, daysAvailable: 0, since: null };
  const now = new Date();
  const diff = yearsDiff(ingreso, now);
  const eligible = diff >= 1;
  // 15 días por año de gestión; para MVP simple devolvemos 15 si es elegible
  const daysAvailable = eligible ? 15 : 0;
  return { eligible, daysAvailable, since: ingreso };
}

// Elegibilidad
app.get("/eligibility/:employeeId", async (req, res) => {
  const e = await getEligibility(req.params.employeeId);
  res.json(e);
});

// Listado de solicitudes
app.get("/requests", async (req, res) => {
  const { employeeId, periodo, estado } = req.query as any;
  const filter: any = {};
  if (employeeId) filter.employeeId = employeeId;
  if (periodo) filter.periodo = Number(periodo);
  if (estado) filter.estado = estado;
  const rows = await VacationRequest.find(filter).sort({ createdAt: -1 }).lean();
  res.json(rows);
});

// Crear solicitud
app.post("/requests", async (req, res) => {
  try {
    const { employeeId, periodo, dias } = req.body || {};
    if (!employeeId || !periodo || !dias) return res.status(400).json({ error: "employeeId, periodo, dias requeridos" });
    const e = await getEligibility(employeeId);
    if (!e.eligible) return res.status(400).json({ error: "no elegible (antigüedad < 1 año o inactivo)" });
    if (dias < 1 || dias > 15) return res.status(400).json({ error: "dias debe ser 1..15" });

    // Total ya aprobado en ese periodo
    const approved = await VacationRequest.aggregate([
      { $match: { employeeId: new mongoose.Types.ObjectId(employeeId), periodo: Number(periodo), estado: "aprobado" } },
      { $group: { _id: null, total: { $sum: "$dias" } } }
    ]);
    const spent = approved?.[0]?.total || 0;
    if (spent + dias > 15) {
      return res.status(400).json({ error: "supera cupo anual de 15 días" });
    }

    const doc = await VacationRequest.create({ employeeId, periodo: Number(periodo), dias, estado: "solicitado" });
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo crear solicitud" });
  }
});

// Aprobar
app.patch("/requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const vr = await VacationRequest.findById(id);
    if (!vr) return res.status(404).json({ error: "no encontrado" });

    const e = await getEligibility(String(vr.employeeId));
    if (!e.eligible) return res.status(400).json({ error: "no elegible" });

    const approved = await VacationRequest.aggregate([
      { $match: { employeeId: vr.employeeId, periodo: vr.periodo, estado: "aprobado" } },
      { $group: { _id: null, total: { $sum: "$dias" } } }
    ]);
    const spent = approved?.[0]?.total || 0;
    if (spent + vr.dias > 15) return res.status(400).json({ error: "supera cupo anual" });

    vr.estado = "aprobado";
    await vr.save();
    res.json(vr);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo aprobar" });
  }
});

// Rechazar
app.patch("/requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const vr = await VacationRequest.findById(id);
    if (!vr) return res.status(404).json({ error: "no encontrado" });
    vr.estado = "rechazado";
    await vr.save();
    res.json(vr);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "no se pudo rechazar" });
  }
});

const port = Number(process.env.PORT || 4004);
app.listen(port, () => console.log("HR-Vacation service on http://localhost:" + port));
