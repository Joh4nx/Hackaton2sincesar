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
      // Fallback por si el endpoint falla, para no romper el front
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

      // Limpiar form (dejamos servicio seleccionado)
      setForm({
        accountId: "",
        serviceType: form.serviceType,
        reference: "",
        amount: "",
      });
      // también limpiamos selección de cuenta
      // pero mantenemos el cliente elegido para facilitar más pagos
      await loadPagos();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "error");
    }
  };

  // Cuentas filtradas por cliente seleccionado
  const cuentasCliente = cuentas.filter(
    (c) => c.clientId === selectedClientId
  );

  // Helper para mostrar label de cuenta
  const formatCuentaLabel = (c: Cuenta) => {
    const partes: string[] = [];
    if (c.alias) partes.push(c.alias);
    else partes.push(c.number);
    partes.push(c.currency);
    partes.push(`saldo aprox ${c.balance.toFixed(2)}`);
    return partes.join(" · ");
  };

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin: "0 0 6px" }}>Pagos de servicios</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Paga servicios de luz, agua, teléfono, gas y otros desde las cuentas de ahorro.
        </p>
      </div>

      <div className="grid" style={{ marginTop: 18 }}>
        {/* Columna izquierda: registrar pago */}
        <div className="col-4">
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Nuevo pago</h3>
            <form onSubmit={onSubmit} className="form-grid">
              {/* Selección de cliente */}
              <label>
                Cliente*
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedClientId(v);
                    // al cambiar de cliente limpiamos la cuenta seleccionada
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

              {/* Selección de cuenta del cliente */}
              <label>
                Cuenta*
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

              <label>
                Servicio
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

              <label>
                Referencia*
                <input
                  placeholder="Nº factura o código cliente"
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Monto*
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

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-accent" type="submit">
                  Pagar servicio
                </button>
              </div>
            </form>

            {err && (
              <div style={{ marginTop: 8, color: "#fecaca" }}>Error: {err}</div>
            )}
          </div>

          {/* Filtro por cuenta (opcional) */}
          <div className="card" style={{ padding: 16, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Filtrar por cuenta</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                style={{ flex: 1 }}
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
        </div>

        {/* Columna derecha: historial de pagos */}
        <div className="col-8">
          <div className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3 style={{ margin: 0 }}>Historial de pagos</h3>
              <button className="btn" onClick={loadPagos} disabled={loading}>
                {loading ? "Cargando…" : "Refrescar"}
              </button>
            </div>

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
                {pagos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--muted)" }}>
                      No hay pagos registrados.
                    </td>
                  </tr>
                )}
                {pagos.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>{p.accountId}</td>
                    <td>{p.serviceType}</td>
                    <td>{p.reference}</td>
                    <td>{p.amount.toFixed(2)}</td>
                    <td>{p.status}</td>
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
