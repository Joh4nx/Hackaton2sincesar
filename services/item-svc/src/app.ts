// services/item-svc/src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) {
  console.error("[item-svc] Falta MONGO_URI en .env");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("[item-svc] DB conectado:", mongoose.connection.name);

// --- Modelo ---
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    createdBy: { type: String }, // opcional: id usuario creador
  },
  { timestamps: true }
);
const Item = mongoose.model("Item", itemSchema);

// --- Salud ---
app.get("/health", (_req, res) => res.json({ ok: true, service: "items" }));

// --- Autz (basada en headers que inyecta el gateway) ---
function requireAdmin(req: any, res: any, next: any) {
  const role = req.headers["x-user-role"];
  if (role === "admin") return next();
  return res.status(403).json({ error: "solo admin puede modificar items" });
}

// --- Alias raíz -> lista (evita 404 si el proxy entrega "/") ---
app.get("/", async (_req, res) => {
  const docs = await Item.find().sort({ createdAt: -1 }).lean();
  res.json(docs);
  // Alternativa si prefieres redirigir:
  // return res.redirect(301, "/items");
});

// --- Rutas canónicas ---
app.get("/items", async (_req, res) => {
  const docs = await Item.find().sort({ createdAt: -1 }).lean();
  res.json(docs);
});

app.get("/items/count", async (_req, res) => {
  const total = await Item.countDocuments();
  res.json({ total });
});

app.post("/items", requireAdmin, async (req: any, res) => {
  const { name, price } = req.body || {};
  if (!name || typeof price !== "number") {
    return res.status(400).json({ error: "name y price (number) son requeridos" });
  }
  const createdBy = (req.headers["x-user-id"] as string) || undefined;
  const doc = await Item.create({ name, price, createdBy });
  res.status(201).json(doc);
});

app.delete("/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const deleted = await Item.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: "no encontrado" });
  res.json({ ok: true });
});

const port = 4002;
app.listen(port, () => console.log("Item-service on http://localhost:" + port));
