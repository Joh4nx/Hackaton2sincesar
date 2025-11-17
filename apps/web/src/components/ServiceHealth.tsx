import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";

type H = { ok: boolean; error?: string; detail?: any };
type All = { gateway: H; auth: H; items: H };

function Pill({ ok }: { ok: boolean }) {
  const bg = ok ? "#e6ffed" : "#ffebeb";
  const fg = ok ? "#137333" : "#a50e0e";
  const txt = ok ? "OK" : "DOWN";
  return (
    <span style={{ padding: "2px 8px", borderRadius: 999, background: bg, color: fg, fontWeight: 600 }}>
      {txt}
    </span>
  );
}

export default function ServiceHealth() {
  const [data, setData] = useState<All | null>(null);
  const [loading, setLoading] = useState(false);
  const [ts, setTs] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get<All>(API + "/health/all");
      setData(r.data);
      setTs(Date.now());
    } catch (e: any) {
      setData({ gateway: { ok: false, error: "gateway" }, auth: { ok: false }, items: { ok: false } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, margin: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Salud de servicios</h3>
        <button onClick={load} disabled={loading}>{loading ? "Chequeando..." : "Refrescar"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Gateway</strong> <Pill ok={!!data?.gateway.ok} />
          </div>
          <small>{data?.gateway.error ? data.gateway.error : "—"}</small>
        </div>
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Auth</strong> <Pill ok={!!data?.auth.ok} />
          </div>
          <small>{data?.auth.error ? data.auth.error : "—"}</small>
        </div>
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Items</strong> <Pill ok={!!data?.items.ok} />
          </div>
          <small>{data?.items.error ? data.items.error : "—"}</small>
        </div>
      </div>
      <div style={{ marginTop: 8, color: "#666" }}>
        <small>Última verificación: {ts ? new Date(ts).toLocaleTimeString() : "—"}</small>
      </div>
    </div>
  );
}
