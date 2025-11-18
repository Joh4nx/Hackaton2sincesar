// services/clients-svc/src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose, { Types } from "mongoose";

dotenv.config();

const {
  MONGO_URI,
  PORT = "4003",
} = process.env;

if (!MONGO_URI) {
  console.error("[clients-svc] Falta MONGO_URI");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("[clients-svc] DB conectado:", mongoose.connection.name);

// ====== Modelo Cliente ======
const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ci: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    status: { type: String, enum: ["ACTIVO", "INACTIVO"], default: "ACTIVO" },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);

// ====== App ======
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Salud
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "clients" });
});

// Listar clientes
app.get("/clients", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter: any = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { ci: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }
  const docs = await Client.find(filter).sort({ createdAt: -1 });
  res.json(docs);
});

// Crear cliente
app.post("/clients", async (req, res) => {
  try {
    const { name, ci, email, phone, address } = req.body;
    if (!name || !ci || !email) {
      return res.status(400).json({ error: "name, ci y email son requeridos" });
    }
    const doc = await Client.create({ name, ci, email, phone, address });
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ error: "No se pudo crear el cliente", detail: e.message });
  }
});

// Obtener cliente
app.get("/clients/:id", async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "id inválido" });
  }
  const doc = await Client.findById(id);
  if (!doc) return res.status(404).json({ error: "no encontrado" });
  res.json(doc);
});

// Actualizar cliente
app.put("/clients/:id", async (req, res) => {
  const { id } = req.params;
  const { name, ci, email, phone, address, status } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const doc = await Client.findByIdAndUpdate(
      id,
      { name, ci, email, phone, address, status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ error: "no encontrado" });
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ error: "No se pudo actualizar", detail: e.message });
  }
});

// Baja lógica
app.delete("/clients/:id", async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  const doc = await Client.findByIdAndUpdate(
    id,
    { status: "INACTIVO" },
    { new: true }
  );
  if (!doc) return res.status(404).json({ error: "no encontrado" });
  res.json(doc);
});

app.listen(Number(PORT), () =>
  console.log(`[clients-svc] on http://localhost:${PORT}`)
);
