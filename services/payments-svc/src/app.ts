// services/payments-svc/src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose from "mongoose";
import axios from "axios";

dotenv.config();

const {
  MONGO_URI,
  PORT = "4005",
  ACCOUNTS_URL = "http://localhost:4004",
} = process.env;

if (!MONGO_URI) {
  console.error("[payments-svc] Falta MONGO_URI");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("[payments-svc] DB conectado:", mongoose.connection.name);

// ==================================================
//                 MODELO PAGO (NUEVO)
// ==================================================
// Usamos otra colección: "service_payments"

const paymentSchema = new mongoose.Schema(
  {
    accountId: String,
    serviceType: String,
    reference: String,
    amount: Number,
    status: String,
    providerResponse: String,
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Tipado explícito para evitar "posiblemente undefined"
interface IPayment extends mongoose.Document {
  accountId: string;
  serviceType: string;
  reference: string;
  amount: number;
  status: string;
  providerResponse?: string;
}

// Modelo seguro (nunca undefined)
const PaymentModel =
  (mongoose.models.ServicePayment as mongoose.Model<IPayment>) ||
  mongoose.model<IPayment>("ServicePayment", paymentSchema, "service_payments");

// ==================================================
//                      APP
// ==================================================
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "payments" });
});

// Lista de servicios soportados
app.get("/services", (_req, res) => {
  res.json([
    { code: "LUZ", name: "Energía eléctrica" },
    { code: "AGUA", name: "Agua potable" },
    { code: "TELEFONO", name: "Telefonía" },
    { code: "GAS", name: "Gas domiciliario" },
    { code: "OTRO", name: "Otros servicios" },
  ]);
});

// Ejecutar pago
app.post("/payments", async (req, res) => {
  const { accountId, serviceType, reference, amount } = req.body;
  const val = Number(amount);

  console.log("[payments-svc] intento de pago:", {
    accountId,
    serviceType,
    reference,
    amount,
  });

  const allowedTypes = ["LUZ", "AGUA", "TELEFONO", "GAS", "OTRO"];

  // Validación básica
  if (!accountId || !serviceType || !reference || !val || val <= 0) {
    return res.status(400).json({ error: "Datos incompletos o inválidos" });
  }

  if (!allowedTypes.includes(serviceType)) {
    return res.status(400).json({ error: "Tipo de servicio inválido" });
  }

  try {
    // 1) Debitar desde accounts-svc
    try {
      const url = `${ACCOUNTS_URL}/accounts/${accountId}/withdraw`;
      console.log("[payments-svc] POST", url, "monto:", val);
      await axios.post(
        url,
        { amount: val, description: `Pago ${serviceType} ref ${reference}` },
        { timeout: 4000 }
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "error al debitar cuenta";
      console.error("[payments-svc] fallo al debitar cuenta:", msg);
      return res.status(400).json({ error: msg });
    }

    // 2) Simulación de proveedor externo
    const providerResponse = `Pago simulado a proveedor ${serviceType} OK`;

    // 3) Registrar pago en BD (colección "service_payments")
    const payDoc = await PaymentModel.create({
      accountId: String(accountId),
      serviceType,
      reference,
      amount: val,
      status: "CONFIRMADO",
      providerResponse,
    });

    console.log(
      "[payments-svc] pago registrado correctamente:",
      payDoc._id?.toString()
    );

    return res.status(201).json(payDoc);
  } catch (e: any) {
    console.error("[payments-svc] error inesperado en /payments:", e);
    return res.status(500).json({
      error: "No se pudo procesar el pago",
      detail: e.message,
    });
  }
});

// Listar pagos
app.get("/payments", async (req, res) => {
  try {
    const accountId = String(req.query.accountId || "").trim();
    const filter: any = {};
    if (accountId) {
      filter.accountId = accountId; // string simple
    }

    const docs = await PaymentModel.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (e: any) {
    console.error("[payments-svc] error en GET /payments:", e);
    res
      .status(500)
      .json({ error: "No se pudo listar pagos", detail: e.message });
  }
});

// Detalle de pago
app.get("/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PaymentModel.findById(id);
    if (!doc) return res.status(404).json({ error: "no encontrado" });
    res.json(doc);
  } catch (e: any) {
    console.error("[payments-svc] error en GET /payments/:id:", e);
    res
      .status(500)
      .json({ error: "No se pudo obtener el pago", detail: e.message });
  }
});

app.listen(Number(PORT), () =>
  console.log(`[payments-svc] on http://localhost:${PORT}`)
);
