// apps/gateway/src/index.ts
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createProxyMiddleware } from "http-proxy-middleware";
import axios from "axios";

dotenv.config();

const app = express();

// ====== Config ======
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const AUTH_URL = process.env.AUTH_URL || "http://localhost:4001";
const ITEM_URL = process.env.ITEM_URL || "http://localhost:4002";
const CLIENTS_URL = process.env.CLIENTS_URL || "http://localhost:4003";
const ACCOUNTS_URL = process.env.ACCOUNTS_URL || "http://localhost:4004";
const PAYMENTS_URL = process.env.PAYMENTS_URL || "http://localhost:4005";

app.set("trust proxy", true);
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(morgan("dev"));

// ====== Tipos ======
type JwtUser = { id: string; email: string; role: "user" | "admin" };
declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

// ====== Salud simple ======
app.get("/health", (_req, res) => res.json({ ok: true, service: "gateway" }));

// ====== Middlewares de auth ======
function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/** Chequea el rol actual en BD (vía auth-svc /me) */
async function adminGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  if (!header) return res.status(401).json({ error: "Token requerido" });

  try {
    const r = await axios.get(`${AUTH_URL}/me`, {
      headers: { Authorization: header },
      timeout: 4000,
    });
    const role = r.data?.user?.role;
    if (role !== "admin") {
      return res.status(403).json({ error: "Requiere rol admin" });
    }
    req.user = r.data.user;
    next();
  } catch (e: any) {
    const code = e?.response?.status || 500;
    res.status(code).json({ error: "Auth check failed", detail: e?.message });
  }
}

// ====================================================================
//                     PROXIES (antes de express.json())
// ====================================================================

// /auth/* -> auth-svc /*
app.use(
  "/auth",
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
    pathRewrite: { "^/auth": "" },
  })
);

// /auth-admin/* -> auth-svc /* (protegido)
app.use(
  "/auth-admin",
  adminGuard,
  createProxyMiddleware({
    target: AUTH_URL,
    changeOrigin: true,
    pathRewrite: { "^/auth-admin": "" },
  })
);

// Protegido /api/* que requiera autenticación
app.use((req, res, next) => {
  const p = req.path;
  if (
    p.startsWith("/api/items") ||
    p.startsWith("/api/clients") ||
    p.startsWith("/api/accounts") ||
    p.startsWith("/api/payments")
  ) {
    return verifyToken(req, res, next);
  }
  next();
});

// Inyecta identidad para servicios internos (headers)
app.use((req: any, _res, next) => {
  const p = req.path;
  if (
    req.user &&
    (p.startsWith("/api/items") ||
      p.startsWith("/api/clients") ||
      p.startsWith("/api/accounts") ||
      p.startsWith("/api/payments"))
  ) {
    req.headers["x-user-id"] = req.user.id;
    req.headers["x-user-role"] = req.user.role;
  }
  next();
});

// Items
app.use(
  "/api/items",
  createProxyMiddleware({
    target: ITEM_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      // path ya viene recortado ("/" o "/:id")
      if (path === "/") return "/items";
      return "/items" + path;
    },
  })
);

// Clients
app.use(
  "/api/clients",
  createProxyMiddleware({
    target: CLIENTS_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === "/") return "/clients";
      return "/clients" + path;
    },
  })
);

// Accounts
app.use(
  "/api/accounts",
  createProxyMiddleware({
    target: ACCOUNTS_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      if (path === "/") return "/accounts";
      return "/accounts" + path;
    },
  })
);

// Payments
app.use(
  "/api/payments",
  createProxyMiddleware({
    target: PAYMENTS_URL,
    changeOrigin: true,
    pathRewrite: (path) => {
      // path ya viene recortado por Express: "/", "/services", "/:id", etc.
      if (path === "/") {
        // /api/payments       → /payments
        return "/payments";
      }
      if (path.startsWith("/services")) {
        // /api/payments/services → /services
        // /api/payments/services?x=1 → /services?x=1 (http-proxy mantiene query)
        return path; // deja "/services" tal cual
      }
      // /api/payments/:id → /payments/:id
      return "/payments" + path;
    },
  })
);


// ====================================================================
//       A PARTIR DE AQUÍ, middlewares/endpoint que sí usan JSON
// ====================================================================

app.use(express.json());

// Salud global (consulta auth, items, banca)
app.get("/health/all", async (_req, res) => {
  const out: any = {
    gateway: { ok: true },
    auth: { ok: false },
    items: { ok: false },
    clients: { ok: false },
    accounts: { ok: false },
    payments: { ok: false },
  };

  try {
    const r1 = await axios.get(`${AUTH_URL}/health`, { timeout: 3000 });
    out.auth = { ok: r1.status === 200, detail: r1.data };
  } catch (e: any) {
    out.auth = { ok: false, error: e?.message };
  }

  try {
    const r2 = await axios.get(`${ITEM_URL}/health`, { timeout: 3000 });
    out.items = { ok: r2.status === 200, detail: r2.data };
  } catch (e: any) {
    out.items = { ok: false, error: e?.message };
  }

  try {
    const r3 = await axios.get(`${CLIENTS_URL}/health`, { timeout: 3000 });
    out.clients = { ok: r3.status === 200, detail: r3.data };
  } catch (e: any) {
    out.clients = { ok: false, error: e?.message };
  }

  try {
    const r4 = await axios.get(`${ACCOUNTS_URL}/health`, { timeout: 3000 });
    out.accounts = { ok: r4.status === 200, detail: r4.data };
  } catch (e: any) {
    out.accounts = { ok: false, error: e?.message };
  }

  try {
    const r5 = await axios.get(`${PAYMENTS_URL}/health`, { timeout: 3000 });
    out.payments = { ok: r5.status === 200, detail: r5.data };
  } catch (e: any) {
    out.payments = { ok: false, error: e?.message };
  }

  res.json(out);
});

// Overview admin (tolerante a fallos)
app.get("/admin/overview", adminGuard, async (_req, res) => {
  let users = { total: 0, admins: 0 };
  let itemsObj: { total: number } = { total: 0 };

  try {
    const rUsers = await axios.get(`${AUTH_URL}/users`, {
      headers: { "x-internal": "1" },
      timeout: 3000,
    });
    if (typeof rUsers.data?.total === "number") users.total = rUsers.data.total;
    if (typeof rUsers.data?.admins === "number") users.admins = rUsers.data.admins;
  } catch {}

  try {
    const rCount = await axios.get(`${ITEM_URL}/items/count`, { timeout: 3000 });
    const maybe = rCount.data?.total ?? rCount.data;
    if (typeof maybe === "number") itemsObj.total = maybe;
  } catch {
    try {
      const rList = await axios.get(`${ITEM_URL}/items`, { timeout: 3000 });
      if (Array.isArray(rList.data)) itemsObj.total = rList.data.length;
    } catch {}
  }

  res.json({ users, items: itemsObj });
});

// ====== 404 y manejador de errores ======
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Gateway ERROR]", err);
  res
    .status(500)
    .json({ error: "Gateway error", detail: err?.message || String(err) });
});

// ====== Start ======
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log("Gateway on http://localhost:" + port));
