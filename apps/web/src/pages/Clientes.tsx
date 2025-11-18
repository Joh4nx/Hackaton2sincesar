import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

type Cliente = {
  _id: string;
  name: string;
  ci: string;
  email: string;
  phone?: string;
  address?: string;
  status: "ACTIVO" | "INACTIVO";
  createdAt?: string;
};

export default function Clientes() {
  const token = localStorage.getItem("token") || "";
  const [rows, setRows] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    ci: "",
    email: "",
    phone: "",
    address: "",
    status: "ACTIVO" as "ACTIVO" | "INACTIVO",
  });

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await axios.get<Cliente[]>(API + "/api/clients", {
        params: q ? { q } : {},
        headers: { Authorization: "Bearer " + token },
      });
      setRows(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr(null);
    try {
      if (editingId) {
        await axios.put(API + "/api/clients/" + editingId, form, {
          headers: { Authorization: "Bearer " + token },
        });
      } else {
        await axios.post(API + "/api/clients", form, {
          headers: { Authorization: "Bearer " + token },
        });
      }
      setForm({
        name: "",
        ci: "",
        email: "",
        phone: "",
        address: "",
        status: "ACTIVO",
      });
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    }
  };

  const onEdit = (c: Cliente) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      ci: c.ci,
      email: c.email,
      phone: c.phone || "",
      address: c.address || "",
      status: c.status,
    });
  };

  const onBaja = async (id: string) => {
    if (!confirm("¿Dar de baja al cliente?")) return;
    try {
      await axios.delete(API + "/api/clients/" + id, {
        headers: { Authorization: "Bearer " + token },
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "error");
    }
  };

  return (
    <div className="container">
      {/* HEADER PRINCIPAL */}
      <div className="hero">
        <h2 style={{ margin: "0 0 6px" }}>Gestión de clientes</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Alta, modificación y baja lógica de clientes bancarios.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: 18,
        }}
      >
        {/* TARJETA GRANDE ARRIBA: NUEVO / EDITAR CLIENTE */}
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
          }}
        >
          {/* Encabezado del formulario */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--muted)",
                  marginBottom: 4,
                }}
              >
                Alta de cliente
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                {editingId ? "Editar cliente" : "Nuevo cliente"}
              </h3>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                Completa los datos de identificación del cliente. Los campos
                con <span style={{ color: "#f97373" }}>*</span> son
                obligatorios.
              </p>
            </div>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                background:
                  editingId === null
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(234,179,8,0.12)",
                color:
                  editingId === null ? "rgb(74,222,128)" : "rgb(250,204,21)",
                border:
                  editingId === null
                    ? "1px solid rgba(34,197,94,0.45)"
                    : "1px solid rgba(234,179,8,0.45)",
              }}
            >
              {editingId ? "Modo edición" : "Modo alta"}
            </div>
          </div>

          {/* FORMULARIO: MÁS GRANDE, EN LA PARTE SUPERIOR */}
          <form
            onSubmit={onSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>
                Nombre<span style={{ color: "#f97373" }}>*</span>
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </label>

            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>
                CI<span style={{ color: "#f97373" }}>*</span>
              </span>
              <input
                value={form.ci}
                onChange={(e) => setForm({ ...form, ci: e.target.value })}
                placeholder="Documento de identidad"
                required
              />
            </label>

            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>
                Email<span style={{ color: "#f97373" }}>*</span>
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="correo@cliente.com"
                required
              />
            </label>

            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>Teléfono</span>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="+591 7XX XX XXX"
              />
            </label>

            {/* Dirección a lo ancho */}
            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                gridColumn: "1 / -1",
              }}
            >
              <span>Dirección</span>
              <input
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="Calle, número, zona"
              />
            </label>

            {/* Estado + tag tipo banco */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.45)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 14,
                  flex: 1,
                }}
              >
                <span>Estado del cliente</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as "ACTIVO" | "INACTIVO",
                    })
                  }
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </label>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  minWidth: 130,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Perfil riesgo
                </span>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    background:
                      form.status === "ACTIVO"
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(148,163,184,0.16)",
                    color:
                      form.status === "ACTIVO"
                        ? "rgb(74,222,128)"
                        : "rgb(148,163,184)",
                    border:
                      form.status === "ACTIVO"
                        ? "1px solid rgba(34,197,94,0.45)"
                        : "1px solid rgba(148,163,184,0.45)",
                  }}
                >
                  {form.status === "ACTIVO" ? "Operativo" : "Inhabilitado"}
                </span>
              </div>
            </div>

            {/* Botones abajo a la derecha */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 4,
              }}
            >
              <button className="btn btn-accent" type="submit">
                {editingId ? "Guardar cambios" : "Crear cliente"}
              </button>
              {editingId && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      ci: "",
                      email: "",
                      phone: "",
                      address: "",
                      status: "ACTIVO",
                    });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {err && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 13,
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.45)",
                color: "#fecaca",
              }}
            >
              {err}
            </div>
          )}
        </div>

        {/* TARJETA ABAJO: LISTADO DE CLIENTES */}
        <div className="card" style={{ padding: 18, borderRadius: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Listado de clientes</h3>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                }}
              >
                {rows.length} registro(s) encontrados
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Buscar por nombre, CI o email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn" onClick={load} disabled={loading}>
                {loading ? "Cargando…" : "Buscar"}
              </button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CI</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th style={{ width: 190 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No hay clientes.
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.ci}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        background:
                          c.status === "ACTIVO"
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(148,163,184,0.16)",
                        color:
                          c.status === "ACTIVO"
                            ? "rgb(74,222,128)"
                            : "rgb(148,163,184)",
                        border:
                          c.status === "ACTIVO"
                            ? "1px solid rgba(34,197,94,0.45)"
                            : "1px solid rgba(148,163,184,0.45)",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn" onClick={() => onEdit(c)}>
                        Editar
                      </button>
                      {c.status === "ACTIVO" && (
                        <button
                          className="btn btn-warning"
                          onClick={() => onBaja(c._id)}
                        >
                          Baja
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
