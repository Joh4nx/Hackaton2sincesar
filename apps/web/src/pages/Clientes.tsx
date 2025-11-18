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
        await axios.put(
          API + "/api/clients/" + editingId,
          form,
          { headers: { Authorization: "Bearer " + token } }
        );
      } else {
        await axios.post(
          API + "/api/clients",
          form,
          { headers: { Authorization: "Bearer " + token } }
        );
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
      <div className="hero">
        <h2 style={{ margin: "0 0 6px" }}>Gestión de clientes</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Alta, modificación y baja lógica de clientes bancarios.
        </p>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        <div className="col-4">
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>
              {editingId ? "Editar cliente" : "Nuevo cliente"}
            </h3>
            <form onSubmit={onSubmit} className="form-grid">
              <label>
                Nombre*
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                CI*
                <input
                  value={form.ci}
                  onChange={(e) => setForm({ ...form, ci: e.target.value })}
                  required
                />
              </label>
              <label>
                Email*
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Teléfono
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Dirección
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>
              <label>
                Estado
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

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-accent" type="submit">
                  {editingId ? "Guardar cambios" : "Crear"}
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
              <div style={{ marginTop: 8, color: "#fecaca" }}>Error: {err}</div>
            )}
          </div>
        </div>

        <div className="col-8">
          <div className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Listado</h3>
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
                    <td>{c.status}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn"
                          onClick={() => onEdit(c)}
                        >
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
    </div>
  );
}
