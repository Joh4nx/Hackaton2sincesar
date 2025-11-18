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

  const getEstadoChipStyle = (status: string) => {
    if (status === "ACTIVA") {
      return {
        background: "rgba(34,197,94,0.12)",
        color: "rgb(74,222,128)",
        border: "1px solid rgba(34,197,94,0.45)",
      };
    }
    if (status === "BLOQUEADA") {
      return {
        background: "rgba(234,179,8,0.12)",
        color: "rgb(250,204,21)",
        border: "1px solid rgba(234,179,8,0.45)",
      };
    }
    return {
      background: "rgba(248,113,113,0.12)",
      color: "rgb(248,113,113)",
      border: "1px solid rgba(248,113,113,0.45)",
    };
  };

  const getTipoLabel = (type: string) =>
    type === "CORRIENTE" ? "Cuenta corriente" : "Caja de ahorro";

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin: "0 0 6px" }}>Gestión de cuentas</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Apertura de cuentas, depósitos, retiros y cambio de estado.
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
        {/* TARJETA ARRIBA: Apertura de cuenta */}
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
          }}
        >
          {/* Encabezado */}
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
                Apertura de cuenta
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                Nueva cuenta
              </h3>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                Selecciona el cliente, el tipo de cuenta y la moneda. El número
                de cuenta se generará automáticamente.
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
                  form.type === "CORRIENTE"
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(45,212,191,0.12)",
                color:
                  form.type === "CORRIENTE"
                    ? "rgb(96,165,250)"
                    : "rgb(45,212,191)",
                border:
                  form.type === "CORRIENTE"
                    ? "1px solid rgba(59,130,246,0.45)"
                    : "1px solid rgba(45,212,191,0.45)",
              }}
            >
              {getTipoLabel(form.type)}
            </div>
          </div>

          {/* FORMULARIO grande */}
          <form
            onSubmit={onCreate}
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
                Cliente<span style={{ color: "#f97373" }}>*</span>
              </span>
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

            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>Tipo de cuenta</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as "AHORRO" | "CORRIENTE",
                  })
                }
              >
                <option value="AHORRO">Caja de ahorro</option>
                <option value="CORRIENTE">Cuenta corriente</option>
              </select>
            </label>

            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>Moneda</span>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    currency: e.target.value as "BOB" | "USD",
                  })
                }
              >
                <option value="BOB">Bolivianos (BOB)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </label>

            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                gridColumn: "1 / -1",
              }}
            >
              <span>Alias (opcional)</span>
              <input
                value={form.alias}
                onChange={(e) =>
                  setForm({ ...form, alias: e.target.value })
                }
                placeholder="Cuenta sueldo, ahorro viaje…"
              />
            </label>

            {/* Resumen de apertura */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.45)",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                <div>
                  <strong>Tipo:</strong> {getTipoLabel(form.type)}
                </div>
                <div>
                  <strong>Moneda:</strong> {form.currency}
                </div>
                <div>
                  <strong>Cliente:</strong>{" "}
                  {form.clientId
                    ? getClienteLabel(form.clientId)
                    : "Sin seleccionar"}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textAlign: "right",
                }}
              >
                El número de cuenta será asignado automáticamente
                <br />
                al confirmar la apertura.
              </div>
            </div>

            {/* Botones */}
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
                Crear cuenta
              </button>
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
              Error: {err}
            </div>
          )}
        </div>

        {/* TARJETA ABAJO: listado tipo TARJETAS DE BANCO */}
        <div className="card" style={{ padding: 18, borderRadius: 16 }}>
          {/* Header listado + filtro */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Cuentas bancarias</h3>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {rows.length} cuenta(s) encontradas
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
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

          {/* Grid de tarjetas */}
          {rows.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              No hay cuentas registradas.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {rows.map((acc) => (
                <div
                  key={acc._id}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    background:
                      "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(59,130,246,0.14), transparent 55%), rgba(15,23,42,0.96)",
                    border: "1px solid rgba(148,163,184,0.35)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    boxShadow:
                      "0 18px 40px rgba(15,23,42,0.65), 0 0 0 1px rgba(15,23,42,0.9)",
                  }}
                >
                  {/* Header tarjeta: número + estado */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 6,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          color: "rgba(148,163,184,0.85)",
                        }}
                      >
                        {getTipoLabel(acc.type)}
                      </div>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 15,
                          marginTop: 4,
                        }}
                      >
                        {acc.number}
                      </div>
                      {acc.alias && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(148,163,184,0.9)",
                            marginTop: 2,
                          }}
                        >
                          {acc.alias}
                        </div>
                      )}
                    </div>

                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        ...getEstadoChipStyle(acc.status),
                      }}
                    >
                      {acc.status}
                    </span>
                  </div>

                  {/* Cliente + saldo */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      marginTop: 4,
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(148,163,184,0.95)",
                      }}
                    >
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        Titular
                      </div>
                      <div style={{ fontSize: 13 }}>
                        {getClienteLabel(acc.clientId)}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          color: "rgba(148,163,184,0.8)",
                        }}
                      >
                        Saldo disponible
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {acc.balance.toFixed(2)}{" "}
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(148,163,184,0.9)",
                          }}
                        >
                          {acc.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                      borderTop: "1px solid rgba(30,64,175,0.6)",
                      paddingTop: 8,
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
