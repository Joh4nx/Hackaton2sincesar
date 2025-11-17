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
const HR_PERSONAL_URL = process.env.HR_PERSONAL_URL || "http://localhost:4003";
const HR_VACATION_URL = process.env.HR_VACATION_URL || "http://localhost:4004";

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

// ======================
// HR: Personal (employees)
// ======================
// Protecciones: todas requieren JWT; mutaciones (POST/PATCH/DELETE) requieren admin
app.use(
  "/api/hr/personal",
  (req, res, next) => {
    // Primero siempre verificar que traiga token válido
    verifyToken(req as any, res as any, () => {
      // Si el JWT ya trae role y es admin, evitamos llamada externa
      if (["POST", "PATCH", "DELETE"].includes(req.method)) {
        const role = (req as any)?.user?.role;
        if (role === "admin") return next();
        // fallback a verificación con auth-svc por si el rol cambió en BD
        return adminGuard(req as any, res as any, next as any);
      }
      return next();
    });
  },
  createProxyMiddleware({
    target: HR_PERSONAL_URL,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/api\/hr\/personal/, ""),
    proxyTimeout: 10000,
    timeout: 10000,
  })
);

// ======================
// HR: Vacations
// ======================
app.use(
  "/api/hr/vacations",
  (req, res, next) => {
    verifyToken(req as any, res as any, next);
  },
  createProxyMiddleware({
    target: HR_VACATION_URL,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/api\/hr\/vacations/, ""),
    proxyTimeout: 10000,
    timeout: 10000,
  })
);

// Protegido /api/items/*
app.use((req, res, next) => {
  if (req.path.startsWith("/api/items")) return verifyToken(req, res, next);
  next();
});

// Inyecta identidad para item-svc (headers)
app.use((req: any, _res, next) => {
  if (req.path.startsWith("/api/items") && req.user) {
    req.headers["x-user-id"] = req.user.id;
    req.headers["x-user-role"] = req.user.role;
  }
  next();
});

app.use(
  "/api/items",
  createProxyMiddleware({
    target: ITEM_URL,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/api\/items/, "/items"),
  })
);

// ====================================================================
//       A PARTIR DE AQUÍ, middlewares/endpoint que sí usan JSON
// ====================================================================

app.use(express.json());

// Salud global (consulta auth e items)
app.get("/health/all", async (_req, res) => {
  const out: any = { gateway: { ok: true }, auth: { ok: false }, items: { ok: false } };
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
  res.status(500).json({ error: "Gateway error", detail: err?.message || String(err) });
});

// ====== Start ======
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log("Gateway on http://localhost:" + port));
