import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";
import { useAuth } from "../lib/auth";

type U = { _id: string; email: string; role: "user"|"admin"; googleId?: string; disabled?: boolean };

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<U[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const token = localStorage.getItem("token") || "";

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await axios.get<U[]>(API + "/auth-admin/admin/users", {
        headers: { Authorization: "Bearer " + token },
      });
      setRows(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    } finally {
      setLoading(false);
    }
  };

  const setRole = async (id: string, role: "user"|"admin") => {
    setActing(id); setErr(null);
    try{
      await axios.patch<U>(API + `/auth-admin/admin/users/${id}/role`, { role }, {
        headers: { Authorization: "Bearer " + token },
      });
      await load();
    } catch(e:any){
      setErr(e?.response?.data?.error || e?.message || "error");
    } finally{ setActing(null); }
  };

  const toggleDisabled = async (id: string, disabled: boolean) => {
    setActing(id); setErr(null);
    try{
      await axios.patch<U>(API + `/auth-admin/admin/users/${id}/disable`, { disabled }, {
        headers: { Authorization: "Bearer " + token },
      });
      await load();
    } catch(e:any){
      setErr(e?.response?.data?.error || e?.message || "error");
    } finally{ setActing(null); }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin:"0 0 6px" }}>Gestionar usuarios</h2>
        <p style={{ margin:0, color:"var(--muted)" }}>
          Administra roles y estado de las cuentas.
        </p>
      </div>

      <div className="card" style={{ padding:16, marginTop:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Cargando…" : "Refrescar"}</button>
          {err && <div style={{ color:"#fecaca", fontWeight:600 }}>Error: {err}</div>}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th>Google</th>
              <th>Estado</th>
              <th style={{ width:320 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ color:"var(--muted)" }}>No hay usuarios.</td></tr>
            )}
            {rows.map((u) => {
              const isMe = user?.email === u.email;
              return (
                <tr key={u._id} style={{ opacity: u.disabled ? .6 : 1 }}>
                  <td>{u.email}</td>
                  <td style={{ fontWeight:600 }}>{u.role}</td>
                  <td>{u.googleId ? "sí" : "no"}</td>
                  <td>{u.disabled ? "Deshabilitado" : "Activo"}</td>
                  <td>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {u.role === "user" ? (
                        <button
                          className="btn btn-accent"
                          onClick={() => setRole(u._id, "admin")}
                          disabled={!!acting || isMe}
                          title={isMe ? "No puedes cambiar tu propio rol" : ""}
                        >
                          Hacer admin
                        </button>
                      ) : (
                        <button
                          className="btn btn-warning"
                          onClick={() => setRole(u._id, "user")}
                          disabled={!!acting || isMe}
                          title={isMe ? "No puedes cambiar tu propio rol" : ""}
                        >
                          Quitar admin
                        </button>
                      )}

                      {!u.disabled ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => toggleDisabled(u._id, true)}
                          disabled={!!acting || isMe}
                          title={isMe ? "No puedes deshabilitar tu propia cuenta" : ""}
                        >
                          Deshabilitar
                        </button>
                      ) : (
                        <button
                          className="btn"
                          onClick={() => toggleDisabled(u._id, false)}
                          disabled={!!acting}
                        >
                          Rehabilitar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {acting && (
          <div style={{ marginTop:12, color:"var(--muted)" }}>
            Aplicando cambios…
          </div>
        )}
      </div>
    </div>
  );
}
