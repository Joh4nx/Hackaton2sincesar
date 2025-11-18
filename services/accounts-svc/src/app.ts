import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose, { Types } from "mongoose";

dotenv.config();

const { MONGO_URI, PORT = "4004" } = process.env;

if (!MONGO_URI) {
  console.error("[accounts-svc] Falta MONGO_URI");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("[accounts-svc] DB conectado:", mongoose.connection.name);

// ====== Modelos ======
const accountSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true },
    number: { type: String, required: true, unique: true },
    type: { type: String, enum: ["AHORRO", "CORRIENTE"], default: "AHORRO" },
    currency: { type: String, enum: ["BOB", "USD"], default: "BOB" },
    alias: { type: String },
    balance: { type: Number, default: 0 },
    // 👇 ahora soporta tres estados
    status: {
      type: String,
      enum: ["ACTIVA", "BLOQUEADA", "CERRADA"],
      default: "ACTIVA",
    },
  },
  { timestamps: true }
);

const movementSchema = new mongoose.Schema(
  {
    accountId: { type: Types.ObjectId, ref: "Account", required: true },
    type: {
      type: String,
      enum: ["DEPOSITO", "RETIRO", "PAGO_SERVICIO"],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

const Account = mongoose.model("Account", accountSchema);
const Movement = mongoose.model("Movement", movementSchema);

// ====== App ======
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "accounts" });
});

// Listar cuentas
app.get("/accounts", async (req, res) => {
  const clientId = String(req.query.clientId || "").trim();
  const filter: any = {};
  if (clientId) filter.clientId = clientId;
  const docs = await Account.find(filter).sort({ createdAt: -1 });
  res.json(docs);
});

// Crear cuenta
app.post("/accounts", async (req, res) => {
  try {
    const { clientId, type, currency, alias } = req.body;
    if (!clientId)
      return res.status(400).json({ error: "clientId requerido" });

    // Número de cuenta sencillo (para demo)
    const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
    const number = String(randomNum);

    const doc = await Account.create({
      clientId,
      type: type || "AHORRO",
      currency: currency || "BOB",
      alias,
      number,
      balance: 0,
      status: "ACTIVA",
    });
    res.status(201).json(doc);
  } catch (e: any) {
    res
      .status(400)
      .json({ error: "No se pudo crear la cuenta", detail: e.message });
  }
});

// Obtener cuenta
app.get("/accounts/:id", async (req, res) => {
  const doc = await Account.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "no encontrado" });
  res.json(doc);
});

// Actualizar alias / estado
app.patch("/accounts/:id", async (req, res) => {
  const { alias, status } = req.body;
  const update: any = {};

  // Solo actualizamos lo que venga explícito
  if (alias !== undefined) update.alias = alias;
  if (status !== undefined) update.status = status;

  try {
    const doc = await Account.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: "no encontrado" });
    res.json(doc);
  } catch (e: any) {
    res
      .status(400)
      .json({ error: "No se pudo actualizar", detail: e.message });
  }
});

// Depositar
app.post("/accounts/:id/deposit", async (req, res) => {
  const { amount, description } = req.body;
  const val = Number(amount);
  if (!val || val <= 0)
    return res.status(400).json({ error: "monto inválido" });

  const acc = await Account.findById(req.params.id);
  if (!acc) return res.status(404).json({ error: "cuenta no encontrada" });
  if (acc.status !== "ACTIVA")
    return res.status(400).json({ error: "cuenta no activa" });

  acc.balance += val;
  await acc.save();

  await Movement.create({
    accountId: acc._id,
    type: "DEPOSITO",
    amount: val,
    description: description || "Depósito",
  });

  res.json(acc);
});

// Retiro
app.post("/accounts/:id/withdraw", async (req, res) => {
  const { amount, description } = req.body;
  const val = Number(amount);
  if (!val || val <= 0)
    return res.status(400).json({ error: "monto inválido" });

  const acc = await Account.findById(req.params.id);
  if (!acc) return res.status(404).json({ error: "cuenta no encontrada" });
  if (acc.status !== "ACTIVA")
    return res.status(400).json({ error: "cuenta no activa" });

  if (acc.balance < val) {
    return res.status(400).json({ error: "fondos insuficientes" });
  }

  acc.balance -= val;
  await acc.save();

  await Movement.create({
    accountId: acc._id,
    type: "RETIRO",
    amount: val,
    description: description || "Retiro",
  });

  res.json(acc);
});

// Movimientos
app.get("/accounts/:id/movements", async (req, res) => {
  const docs = await Movement.find({ accountId: req.params.id }).sort({
    createdAt: -1,
  });
  res.json(docs);
});

app.listen(Number(PORT), () =>
  console.log(`[accounts-svc] on http://localhost:${PORT}`)
);
