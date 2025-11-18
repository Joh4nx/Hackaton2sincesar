import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

type Servicio = {
  code: string;
  name: string;
};

type Pago = {
  _id: string;
  accountId: string;
  serviceType: string;
  reference: string;
  amount: number;
  status: "PENDIENTE" | "CONFIRMADO" | "RECHAZADO" | string;
  createdAt?: string;
};

type Cliente = {
  _id: string;
  name: string;
  ci: string;
  email: string;
};

type Cuenta = {
  _id: string;
  clientId: string;
  number: string;
  type: string;
  currency: string;
  alias?: string;
  balance: number;
  status: string;
};

export default function Pagos() {
  const token = localStorage.getItem("token") || "";

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [accountFilter, setAccountFilter] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  const [form, setForm] = useState({
    accountId: "",
    serviceType: "LUZ",
    reference: "",
    amount: "",
  });

  // ====== Cargar catálogo de servicios ======
  const loadServicios = async () => {
    try {
      const r = await axios.get<Servicio[]>(API + "/api/payments/services", {
        headers: { Authorization: "Bearer " + token },
      });
      setServicios(r.data);
    } catch {
      setServicios([
        { code: "LUZ", name: "Energía eléctrica" },
        { code: "AGUA", name: "Agua potable" },
        { code: "TELEFONO", name: "Telefonía" },
        { code: "GAS", name: "Gas domiciliario" },
        { code: "OTRO", name: "Otros servicios" },
      ]);
    }
  };

  // ====== Cargar clientes ======
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

  // ====== Cargar cuentas ======
  const loadCuentas = async () => {
    try {
      const r = await axios.get<Cuenta[]>(API + "/api/accounts", {
        headers: { Authorization: "Bearer " + token },
      });
      setCuentas(r.data);
    } catch (e: any) {
      console.error("Error cargando cuentas:", e?.message);
    }
  };

  // ====== Cargar pagos ======
  const loadPagos = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await axios.get<Pago[]>(API + "/api/payments", {
        params: accountFilter ? { accountId: accountFilter } : {},
        headers: { Authorization: "Bearer " + token },
      });
      setPagos(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServicios();
    loadClientes();
    loadCuentas();
    loadPagos();
    // eslint-disable-next-line
  }, []);

  // ====== Helpers UI ======
  const cuentasCliente = cuentas.filter(
    (c) => c.clientId === selectedClientId
  );

  const formatCuentaLabel = (c: Cuenta) => {
    const partes: string[] = [];
    if (c.alias) partes.push(c.alias);
    else partes.push(c.number);
    partes.push(c.currency);
    partes.push(`saldo aprox ${c.balance.toFixed(2)}`);
    return partes.join(" · ");
  };

  const getCuentaById = (id: string) =>
    cuentas.find((c) => c._id === id) || null;

  const getServicioName = (code: string) =>
    servicios.find((s) => s.code === code)?.name || code;

  const getClientLabel = (clientId: string) => {
    const c = clientes.find((cl) => cl._id === clientId);
    if (!c) return clientId;
    return `${c.name} (${c.ci})`;
  };

  const getStatusStyle = (status: string) => {
    if (status === "CONFIRMADO") {
      return {
        background: "rgba(34,197,94,0.10)",
        color: "rgb(74,222,128)",
        border: "1px solid rgba(34,197,94,0.5)",
      };
    }
    if (status === "PENDIENTE") {
      return {
        background: "rgba(234,179,8,0.10)",
        color: "rgb(250,204,21)",
        border: "1px solid rgba(234,179,8,0.5)",
      };
    }
    return {
      background: "rgba(248,113,113,0.10)",
      color: "rgb(248,113,113)",
      border: "1px solid rgba(248,113,113,0.5)",
    };
  };

  const currentCuenta = form.accountId ? getCuentaById(form.accountId) : null;

  // ====== Enviar nuevo pago ======
  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr(null);

    if (!selectedClientId) {
      setErr("Debes seleccionar un cliente");
      return;
    }
    if (!form.accountId) {
      setErr("Debes seleccionar una cuenta");
      return;
    }

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setErr("Monto inválido");
      return;
    }

    try {
      await axios.post(
        API + "/api/payments",
        {
          accountId: form.accountId,
          serviceType: form.serviceType,
          reference: form.reference,
          amount,
        },
        { headers: { Authorization: "Bearer " + token } }
      );

      setForm({
        accountId: "",
        serviceType: form.serviceType,
        reference: "",
        amount: "",
      });
      await loadPagos();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    }
  };

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin: "0 0 6px" }}>Pagos de servicios</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Paga servicios de luz, agua, teléfono, gas y otros desde las cuentas de ahorro.
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
        {/* TARJETA ARRIBA: Nuevo pago */}
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
          }}
        >
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
                Pago de servicios
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                Nuevo pago
              </h3>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--muted)",
                }}
              >
                Selecciona el cliente, la cuenta de débito y el servicio que deseas pagar.
              </p>
            </div>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                background: "rgba(59,130,246,0.12)",
                color: "rgb(96,165,250)",
                border: "1px solid rgba(59,130,246,0.45)",
              }}
            >
              {getServicioName(form.serviceType)}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {/* Cliente */}
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
                value={selectedClientId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedClientId(v);
                  setForm((f) => ({ ...f, accountId: "" }));
                }}
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

            {/* Cuenta */}
            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>
                Cuenta de débito<span style={{ color: "#f97373" }}>*</span>
              </span>
              <select
                value={form.accountId}
                onChange={(e) =>
                  setForm({ ...form, accountId: e.target.value })
                }
                required
                disabled={!selectedClientId || cuentasCliente.length === 0}
              >
                <option value="">
                  {selectedClientId
                    ? cuentasCliente.length === 0
                      ? "Este cliente no tiene cuentas"
                      : "Seleccione una cuenta"
                    : "Seleccione primero un cliente"}
                </option>
                {cuentasCliente.map((c) => (
                  <option key={c._id} value={c._id}>
                    {formatCuentaLabel(c)}
                  </option>
                ))}
              </select>
            </label>

            {/* Servicio */}
            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>Servicio</span>
              <select
                value={form.serviceType}
                onChange={(e) =>
                  setForm({ ...form, serviceType: e.target.value })
                }
              >
                {servicios.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Referencia */}
            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>
                Referencia<span style={{ color: "#f97373" }}>*</span>
              </span>
              <input
                placeholder="Nº factura o código cliente"
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                required
              />
            </label>

            {/* Monto */}
            <label
              style={{
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span>
                Monto<span style={{ color: "#f97373" }}>*</span>
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                required
              />
            </label>

            {/* Resumen del pago */}
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
                marginTop: 4,
              }}
            >
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                <div>
                  <strong>Cliente:</strong>{" "}
                  {selectedClientId
                    ? getClientLabel(selectedClientId)
                    : "Sin seleccionar"}
                </div>
                <div>
                  <strong>Cuenta:</strong>{" "}
                  {currentCuenta ? formatCuentaLabel(currentCuenta) : "—"}
                </div>
                <div>
                  <strong>Servicio:</strong> {getServicioName(form.serviceType)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "rgba(148,163,184,0.8)",
                  }}
                >
                  Importe a debitar
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {form.amount ? Number(form.amount).toFixed(2) : "0.00"}{" "}
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(148,163,184,0.9)",
                    }}
                  >
                    {currentCuenta?.currency || "BOB"}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <button className="btn btn-accent" type="submit">
                Pagar servicio
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

        {/* TARJETA ABAJO: Historial de pagos */}
        <div className="card" style={{ padding: 18, borderRadius: 16 }}>
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
              <h3 style={{ margin: 0 }}>Historial de pagos</h3>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {pagos.length} pago(s) registrados
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="">Todas las cuentas</option>
                {cuentas.map((c) => (
                  <option key={c._id} value={c._id}>
                    {formatCuentaLabel(c)}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={loadPagos} disabled={loading}>
                {loading ? "Cargando…" : "Aplicar"}
              </button>
            </div>
          </div>

          {pagos.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              No hay pagos registrados.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cuenta</th>
                  <th>Servicio</th>
                  <th>Referencia</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => {
                  const acc = getCuentaById(p.accountId);
                  return (
                    <tr key={p._id}>
                      <td>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        {acc
                          ? `${acc.number} · ${acc.currency}`
                          : p.accountId}
                      </td>
                      <td>{getServicioName(p.serviceType)}</td>
                      <td>{p.reference}</td>
                      <td>{p.amount.toFixed(2)}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            ...getStatusStyle(p.status),
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
