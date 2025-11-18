import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

type Cuenta = {
  _id: string;
  clientId: string;
  number: string;
  type: "AHORRO" | "CORRIENTE" | string;
  currency: "BOB" | "USD" | string;
  alias?: string;
  balance: number;
  status: "ACTIVA" | "BLOQUEADA" | "CERRADA" | string;
  createdAt?: string;
};

type Cliente = {
  _id: string;
  name: string;
  ci: string;
  email: string;
};

export default function Cuentas() {
  const token = localStorage.getItem("token") || "";
  const [rows, setRows] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [form, setForm] = useState({
    clientId: "",
    type: "AHORRO" as "AHORRO" | "CORRIENTE",
    currency: "BOB" as "BOB" | "USD",
    alias: "",
  });

  // === Helpers de carga ===
  const loadClientes = async () => {
    try {
      const r = await axios.get<Cliente[]>(API + "/api/clients", {
        headers: { Authorization: "Bearer " + token },
      });
      setClientes(r.data);
    } catch (e: any) {
      console.error("Error cargando clientes:", e?.message);
    }
  };

  const loadCuentas = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await axios.get<Cuenta[]>(API + "/api/accounts", {
        params: clientFilter ? { clientId: clientFilter } : {},
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
    loadClientes();
    loadCuentas();
    // eslint-disable-next-line
  }, []);

  const onCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr(null);

    if (!form.clientId) {
      setErr("Debes seleccionar un cliente");
      return;
    }

    try {
      await axios.post(API + "/api/accounts", form, {
        headers: { Authorization: "Bearer " + token },
      });
      setForm({ clientId: "", type: "AHORRO", currency: "BOB", alias: "" });
      await loadCuentas();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    }
  };

  const doDeposit = async (acc: Cuenta) => {
    const input = prompt("Monto a depositar:");
    if (!input) return;
    const amount = Number(input);
    if (!amount || amount <= 0) return alert("Monto inválido");
    try {
      await axios.post(
        API + `/api/accounts/${acc._id}/deposit`,
        { amount },
        { headers: { Authorization: "Bearer " + token } }
      );
      await loadCuentas();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "error");
    }
  };

  const doWithdraw = async (acc: Cuenta) => {
    const input = prompt("Monto a retirar:");
    if (!input) return;
    const amount = Number(input);
    if (!amount || amount <= 0) return alert("Monto inválido");
    try {
      await axios.post(
        API + `/api/accounts/${acc._id}/withdraw`,
        { amount },
        { headers: { Authorization: "Bearer " + token } }
      );
      await loadCuentas();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "error");
    }
  };

  const changeStatus = async (
    acc: Cuenta,
    status: "ACTIVA" | "BLOQUEADA" | "CERRADA"
  ) => {
    try {
      await axios.patch(
        API + `/api/accounts/${acc._id}`,
        { status },
        { headers: { Authorization: "Bearer " + token } }
      );
      await loadCuentas();
    } catch (e: any) {
      alert(
        e?.response?.data?.error ||
          e?.message ||
          "No se pudo cambiar estado"
      );
    }
  };

  const getClienteLabel = (clientId: string) => {
    const c = clientes.find((cl) => cl._id === clientId);
    if (!c) return clientId;
    return `${c.name} (${c.ci})`;
  };

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin: "0 0 6px" }}>Gestión de cuentas</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Apertura de cuentas, depósitos, retiros y cambio de estado.
        </p>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        {/* Columna izquierda: crear cuenta y filtro */}
        <div className="col-4">
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Nueva cuenta</h3>
            <form onSubmit={onCreate} className="form-grid">
              <label>
                Cliente*
                <select
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.ci})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tipo de cuenta
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "AHORRO" | "CORRIENTE",
                    })
                  }
                >
                  <option value="AHORRO">Ahorro</option>
                  <option value="CORRIENTE">Corriente</option>
                </select>
              </label>

              <label>
                Moneda
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      currency: e.target.value as "BOB" | "USD",
                    })
                  }
                >
                  <option value="BOB">BOB</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label>
                Alias (opcional)
                <input
                  value={form.alias}
                  onChange={(e) =>
                    setForm({ ...form, alias: e.target.value })
                  }
                  placeholder="Cuenta sueldo, ahorro viaje…"
                />
              </label>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-accent" type="submit">
                  Crear cuenta
                </button>
              </div>
            </form>

            {err && (
              <div style={{ marginTop: 8, color: "#fecaca" }}>
                Error: {err}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 16, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Filtrar por cliente</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.ci})
                  </option>
                ))}
              </select>
              <button className="btn" onClick={loadCuentas} disabled={loading}>
                {loading ? "Cargando…" : "Aplicar"}
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha: tabla de cuentas */}
        <div className="col-8">
          <div className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Listado de cuentas</h3>
              <button className="btn" onClick={loadCuentas} disabled={loading}>
                {loading ? "Cargando…" : "Refrescar"}
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Saldo</th>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th style={{ width: 260 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--muted)" }}>
                      No hay cuentas.
                    </td>
                  </tr>
                )}
                {rows.map((acc) => (
                  <tr key={acc._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{acc.number}</div>
                      {acc.alias && (
                        <div
                          style={{ fontSize: 12, color: "var(--muted)" }}
                        >
                          {acc.alias}
                        </div>
                      )}
                    </td>
                    <td>{getClienteLabel(acc.clientId)}</td>
                    <td>{acc.balance.toFixed(2)}</td>
                    <td>{acc.currency}</td>
                    <td>{acc.status}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="btn"
                          onClick={() => doDeposit(acc)}
                        >
                          Depositar
                        </button>
                        <button
                          className="btn btn-warning"
                          onClick={() => doWithdraw(acc)}
                        >
                          Retirar
                        </button>
                        <button
                          className="btn"
                          onClick={() => changeStatus(acc, "ACTIVA")}
                          disabled={acc.status === "ACTIVA"}
                        >
                          Activar
                        </button>
                        <button
                          className="btn"
                          onClick={() => changeStatus(acc, "BLOQUEADA")}
                          disabled={acc.status === "BLOQUEADA"}
                        >
                          Bloquear
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => changeStatus(acc, "CERRADA")}
                          disabled={acc.status === "CERRADA"}
                        >
                          Cerrar
                        </button>
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
