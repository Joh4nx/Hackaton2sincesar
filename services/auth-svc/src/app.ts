import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const {
  MONGO_URI,
  JWT_SECRET = "dev_secret_change_me",
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  GOOGLE_REDIRECT_URI = "",
  FRONTEND_URL = "http://localhost:5173",
} = process.env;

// ---- DB
await mongoose.connect(MONGO_URI!);
console.log("[auth-svc] DB conectado:", mongoose.connection.name);

// ---- Schema
const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true },
    password: String, // vacío si solo usa Google
    role: { type: String, enum: ["user", "admin"], default: "user" },
    googleId: { type: String, index: true },
    disabled: { type: Boolean, default: false }, // <— CLAVE
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

// ===== Helpers =====
type JwtPayload = { id: string; email: string; role: "user" | "admin" };

function issueToken(user: any) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role } as JwtPayload,
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/** Primer admin bootstrap si no existe ninguno habilitado */
async function ensureBootstrapAdmin(user: any) {
  const admins = await User.countDocuments({ role: "admin", disabled: { $ne: true } });
  if (admins === 0 && user.role !== "admin") {
    user.role = "admin";
    await user.save();
    console.log("[BOOTSTRAP] Promovido a admin:", user.email);
  }
  return user;
}

/** Castea ObjectId de forma segura */
function asObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

/** Impide dejar el sistema sin administradores habilitados */
async function assertNotLastEnabledAdmin(targetId: string, opts: { demoteToUser?: boolean; disable?: boolean }) {
  const oid = asObjectId(targetId);
  if (!oid) throw new Error("id inválido");

  const remaining = await User.countDocuments({
    role: "admin",
    disabled: { $ne: true },
    _id: { $ne: oid },
  });
  if ((opts.demoteToUser || opts.disable) && remaining === 0) {
    throw new Error("No puedes dejar el sistema sin administradores habilitados");
  }
}

// ===== Middlewares =====
async function verifyJwt(req: any, res: any, next: any) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "token requerido" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.jwt = payload; // guardamos payload crudo
    next();
  } catch {
    return res.status(401).json({ error: "token inválido" });
  }
}

/** Carga usuario de BD y valida que no esté deshabilitado; refresca rol */
async function loadActiveUser(req: any, res: any, next: any) {
  try {
    const id = req.jwt?.id;
    if (!id) return res.status(401).json({ error: "token inválido" });
    const user = await User.findById(id).select("_id email role disabled");
    if (!user) return res.status(401).json({ error: "no encontrado" });
    if (user.disabled === true) {
      return res.status(403).json({ error: "cuenta deshabilitada" });
    }
    // Sustituimos cualquier rol del JWT por el rol vivo de BD
    req.user = { id: user._id.toString(), email: user.email, role: user.role };
    next();
  } catch (e: any) {
    return res.status(500).json({ error: "auth check failed", detail: e?.message });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Requiere rol admin" });
}

// Salud
app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));

// ===============================
// Google One Tap (POST /google) — BLOQUEA deshabilitados
// ===============================
const oneTapClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "credential requerida" });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Falta GOOGLE_CLIENT_ID" });

    const ticket = await oneTapClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: "token inválido" });

    const sub = payload.sub!;
    const email = payload.email!;
    if (!email) return res.status(400).json({ error: "email no disponible" });

    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
    if (!user) user = await User.create({ email, googleId: sub, role: "user", password: "" });
    if (!user.googleId) {
      user.googleId = sub;
      await user.save();
    }

    // Bloquea si está deshabilitado
    if (user.disabled === true) {
      return res.status(403).json({ error: "cuenta deshabilitada" });
    }

    user = await ensureBootstrapAdmin(user);

    const token = issueToken(user);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (e: any) {
    console.error("[GOOGLE OneTap] error:", e?.message);
    res.status(401).json({ error: "no autorizado", detail: e?.message });
  }
});

// ======================================
// Google Code Flow — BLOQUEA deshabilitados
// ======================================
const oauthClient = new OAuth2Client({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI,
});

app.get("/google/login", (_req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.status(500).send("Faltan GOOGLE_* en el backend");
  }
  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
    include_granted_scopes: true,
  });
  return res.redirect(url);
});

app.get("/google/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    if (!code) return res.status(400).send("Missing code");

    const { tokens } = await oauthClient.getToken({ code });
    const idToken = tokens.id_token;
    if (!idToken) return res.status(401).send("Missing id_token");

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(401).send("Invalid token");

    const sub = payload.sub!;
    const email = payload.email!;
    if (!email) return res.status(400).send("Email not present");

    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });
    if (!user) user = await User.create({ email, googleId: sub, role: "user", password: "" });
    if (!user.googleId) {
      user.googleId = sub;
      await user.save();
    }

    // Bloquea si está deshabilitado
    if (user.disabled === true) {
      // En flujo de redirección conviene volver al FE con marcador
      const to = `${FRONTEND_URL}/login?disabled=1`;
      return res.redirect(to);
    }

    user = await ensureBootstrapAdmin(user);

    const token = issueToken(user);
    const redirectTo = `${FRONTEND_URL}/oauth/callback?token=${encodeURIComponent(token)}`;
    return res.redirect(redirectTo);
  } catch (e: any) {
    console.error("[GOOGLE CodeFlow] callback error:", e?.message);
    return res.status(500).send("Google login failed");
  }
});

// ===============================
// Registro / Login locales — BLOQUEA deshabilitados
// ===============================
app.post("/register", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email y password requeridos" });
  try {
    const hash = bcrypt.hashSync(password, 10);
    let user = await User.create({
      email,
      password: hash,
      role: role === "admin" ? "admin" : "user",
    });
    user = await ensureBootstrapAdmin(user);
    res.status(201).json({ id: user._id, email: user.email, role: user.role });
  } catch (e: any) {
    res.status(400).json({ error: "No se pudo registrar", detail: e.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await User.findOne({ email });
  if (!user || !user.password) return res.status(401).json({ error: "credenciales inválidas" });
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: "credenciales inválidas" });

  // BLOQUEA si deshabilitado
  if (user.disabled === true) {
    return res.status(403).json({ error: "cuenta deshabilitada" });
  }

  user = await ensureBootstrapAdmin(user);

  const token = issueToken(user);
  res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
});

// Perfil (usa verifyJwt + loadActiveUser ⇒ bloquea deshabilitados y refresca rol)
app.get("/me", verifyJwt, loadActiveUser, async (req: any, res) => {
  res.json({ user: req.user });
});

// ===============================
// Rutas ADMIN reales
// ===============================
app.get("/admin/users", verifyJwt, loadActiveUser, requireAdmin, async (_req, res) => {
  const docs = await User.find().sort({ createdAt: -1 }).select("_id email role googleId disabled createdAt");
  res.json(docs);
});

app.patch("/admin/users/:id/role", verifyJwt, loadActiveUser, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { role } = req.body as { role: "user" | "admin" };
  if (role !== "user" && role !== "admin") return res.status(400).json({ error: "rol inválido" });

  if (String(req.user.id) === String(id))
    return res.status(400).json({ error: "No puedes cambiar tu propio rol" });

  if (role === "user") {
    try {
      await assertNotLastEnabledAdmin(id, { demoteToUser: true });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  }

  const doc = await User.findByIdAndUpdate(id, { role }, { new: true })
    .select("_id email role googleId disabled createdAt");
  if (!doc) return res.status(404).json({ error: "no encontrado" });
  res.json(doc);
});

app.patch("/admin/users/:id/disable", verifyJwt, loadActiveUser, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { disabled } = req.body as { disabled: boolean };

  if (String(req.user.id) === String(id))
    return res.status(400).json({ error: "No puedes deshabilitar tu propia cuenta" });

  try {
    await assertNotLastEnabledAdmin(id, { disable: disabled === true });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  const doc = await User.findByIdAndUpdate(id, { disabled: !!disabled }, { new: true })
    .select("_id email role googleId disabled createdAt");
  if (!doc) return res.status(404).json({ error: "no encontrado" });
  res.json(doc);
});

// Interno para overview
app.get("/users", async (req, res) => {
  if (req.headers["x-internal"] !== "1") return res.status(403).json({ error: "forbidden" });
  const total = await User.countDocuments();
  const admins = await User.countDocuments({ role: "admin", disabled: { $ne: true } });
  res.json({ total, admins });
});

const port = 4001;
app.listen(port, () => console.log("Auth-service on http://localhost:" + port));
