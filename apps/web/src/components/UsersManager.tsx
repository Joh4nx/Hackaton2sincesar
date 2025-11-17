import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

type User = { _id: string; email: string; role: "user" | "admin"; googleId?: string; createdAt?: string };

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const token = localStorage.getItem("token") || "";

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await axios.get<User[]>(API + "/auth-admin/admin/users", {
        headers: { Authorization: "Bearer " + token },
      });
      setUsers(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const changeRole = async (id: string, role: "user" | "admin") => {
    try {
      await axios.patch(
        API + `/auth-admin/admin/users/${id}`,
        { role },
        { headers: { Authorization: "Bearer " + token } }
      );
      setUsers(u => u.map(x => (x._id === id ? { ...x, role } : x)));
    } catch (e: any) {
      alert("No se pudo cambiar el rol");
    }
  };

  const removeUser = async (id: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    try {
      await axios.delete(API + `/auth-admin/admin/users/${id}`, {
        headers: { Authorization: "Bearer " + token },
      });
      setUsers(u => u.filter(x => x._id !== id));
    } catch (e: any) {
      alert("No se pudo eliminar");
    }
  };

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Gestionar usuarios</h3>
        <button onClick={load} disabled={loading}>{loading ? "Cargando…" : "Refrescar"}</button>
      </div>

      {err && <div style={{ color: "#a50e0e", marginBottom: 8 }}>Error: {err}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Rol</th>
            <th style={{ padding: 8 }}>Google</th>
            <th style={{ padding: 8, width: 120 }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id} style={{ borderBottom: "1px solid #f5f5f5" }}>
              <td style={{ padding: 8 }}>{u.email}</td>
              <td style={{ padding: 8 }}>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u._id, e.target.value as "user" | "admin")}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={{ padding: 8 }}>{u.googleId ? "Sí" : "No"}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => removeUser(u._id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && !loading && (
            <tr>
              <td colSpan={4} style={{ padding: 8, color: "#666" }}>
                No hay usuarios (además del admin seed) aún.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
