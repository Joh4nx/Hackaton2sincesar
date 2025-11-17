import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API } from "../lib/api";
import { useAuth } from "../lib/auth";

type Emp = {
  _id?: string;
  email: string;
  nombreCompleto: string;
  area?: string;
  cargo?: string;
  remuneracion: number;
  activo?: boolean;
  fecha_ingreso: string;
  fecha_baja?: string;
};

export default function Employees(){
  const { user } = useAuth();
  const token = localStorage.getItem("token") || "";
  const headers = useMemo(()=> ({ Authorization: "Bearer "+token }), [token]);

  const [rows, setRows] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string| null>(null);
  const [editing, setEditing] = useState<Emp | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Formulario de alta
  const [form, setForm] = useState<Emp>({
    email: "",
    nombreCompleto: "",
    area: "",
    cargo: "",
    remuneracion: 0,
    fecha_ingreso: new Date().toISOString().slice(0,10)
  });

  const load = async ()=>{
    setLoading(true); setErr(null);
    try{
      const r = await axios.get<Emp[]>(API+"/api/hr/personal/employees", { headers });
      setRows(r.data);
    }catch(e:any){ setErr(e?.response?.data?.error || e?.message || "error"); }
    finally{ setLoading(false); }
  };

  const createEmp = async (e: React.FormEvent)=>{
    e.preventDefault(); setErr(null);
    try{
      const body = { ...form, remuneracion: Number(form.remuneracion), fecha_ingreso: form.fecha_ingreso };
      await axios.post<Emp>(API+"/api/hr/personal/employees", body, { headers });
      setForm({ email:"", nombreCompleto:"", area:"", cargo:"", remuneracion:0, fecha_ingreso:new Date().toISOString().slice(0,10) });
      await load();
    }catch(e:any){ setErr(e?.response?.data?.error || e?.message || "error"); }
  };

  // Edición puntual ya no se usa; usamos modal con PUT

  const deactivateEmp = async (id: string)=>{
    setErr(null);
    try{
      await axios.patch(API+`/api/hr/personal/employees/${id}/deactivate`, {}, { headers });
      await load();
    }catch(e:any){ setErr(e?.response?.data?.error || e?.message || "error"); }
  };

  const reactivateEmp = async (id: string)=>{
    setErr(null);
    try{
      await axios.patch(API+`/api/hr/personal/employees/${id}/reactivate`, {}, { headers });
      await load();
    }catch(e:any){ setErr(e?.response?.data?.error || e?.message || "error"); }
  };

  const deleteEmp = async (id: string)=>{
    if (!confirm("¿Eliminar definitivamente este empleado?")) return;
    setErr(null);
    try{
      await axios.delete(API+`/api/hr/personal/employees/${id}`, { headers });
      await load();
    }catch(e:any){ setErr(e?.response?.data?.error || e?.message || "error"); }
  };

  useEffect(()=>{ load(); /* eslint-disable-line */ }, []);

  if (!user || user.role !== "admin"){
    return <div className="container"><div className="card" style={{ padding:16 }}>Solo admin puede gestionar personal.</div></div>;
  }

  return (
    <div className="container">
      <div className="hero">
        <h2 style={{ margin:0 }}>Gestión de Personal</h2>
        <p style={{ margin:0, color:"var(--muted)" }}>Alta, edición y baja de funcionarios.</p>
      </div>

      <div className="grid" style={{ marginTop:18 }}>
        <div className="col-5">
          <div className="card" style={{ padding:16 }}>
            <h3 style={{ marginTop:0 }}>Dar de alta</h3>
            <form onSubmit={createEmp} style={{ display:"grid", gap:8 }}>
              <input placeholder="Email" value={form.email} onChange={e=>setForm({ ...form, email:e.target.value })} required />
              <input placeholder="Nombre Completo" value={form.nombreCompleto} onChange={e=>setForm({ ...form, nombreCompleto:e.target.value })} required />
              <input placeholder="Área" value={form.area} onChange={e=>setForm({ ...form, area:e.target.value })} />
              <input placeholder="Cargo" value={form.cargo} onChange={e=>setForm({ ...form, cargo:e.target.value })} />
              <input type="number" placeholder="Remuneración" value={form.remuneracion} onChange={e=>setForm({ ...form, remuneracion:Number(e.target.value) })} required />
              <input type="date" placeholder="Fecha de ingreso" value={form.fecha_ingreso} onChange={e=>setForm({ ...form, fecha_ingreso:e.target.value })} required />
              <button className="btn btn-accent" type="submit">Crear</button>
            </form>
            {err && <div style={{ color:"#fecaca", marginTop:8 }}>Error: {err}</div>}
          </div>

          {/* Panel 'Último agregado' removido según solicitud: todo se gestiona desde la tabla */}
        </div>

        <div className="col-7">
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0 }}>Empleados {loading && <small style={{ color:"var(--muted)" }}>(cargando…)</small>}</h3>
              <button className="btn" onClick={load} disabled={loading}>Refrescar</button>
            </div>

            <table className="table" style={{ marginTop:12 }}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Cargo</th>
                  <th>Remuneración</th>
                  <th>Estado</th>
                  <th style={{ width:280 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ color:"var(--muted)" }}>No hay empleados.</td></tr>
                )}
                {rows.map((r)=> (
                  <tr key={r._id} style={{ opacity: r.activo === false ? .6 : 1 }}>
                    <td>{r.email}</td>
                    <td>{r.nombreCompleto}</td>
                    <td>{r.area || "-"}</td>
                    <td>{r.cargo || "-"}</td>
                    <td>{typeof r.remuneracion === "number" ? r.remuneracion : 0}</td>
                    <td>{r.activo === false ? "Baja" : "Activo"}</td>
                    <td>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <button className="btn" onClick={()=>{ setEditing(r); setShowModal(true); }}>Modificar</button>
                        {r.activo !== false ? (
                          <button className="btn btn-danger" onClick={()=> deactivateEmp(r._id!)}>Dar de baja</button>
                        ) : (
                          <>
                            <span className="badge">Baja {r.fecha_baja ? new Date(r.fecha_baja).toLocaleDateString() : ""}</span>
                            <button className="btn" onClick={()=> reactivateEmp(r._id!)}>Rehabilitar</button>
                          </>
                        )}
                        <button className="btn btn-warning" onClick={()=> deleteEmp(r._id!)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal de edición completa */}
      <EditEmployeeModal
        emp={editing}
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />
    </div>
  );
}

// Modal simple de edición completa
function Modal({ open, onClose, children }:{ open:boolean; onClose:()=>void; children:React.ReactNode }){
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
      <div className="card" style={{ width:520, padding:16, background:"#0f172a", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <h3 style={{ margin:0 }}>Editar empleado</h3>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditEmployeeModal({ emp, open, onClose, onSaved }:{ emp: Emp | null; open:boolean; onClose:()=>void; onSaved:()=>void }){
  const [draft, setDraft] = useState<Emp | null>(emp);
  const token = localStorage.getItem("token") || "";
  const headers = useMemo(()=> ({ Authorization: "Bearer "+token }), [token]);
  useEffect(()=> setDraft(emp), [emp]);

  const save = async (e: React.FormEvent)=>{
    e.preventDefault();
    if (!draft?._id) return;
    const body:any = {
      email: draft.email,
      nombreCompleto: draft.nombreCompleto,
      area: draft.area,
      cargo: draft.cargo,
      remuneracion: Number(draft.remuneracion),
      fecha_ingreso: draft.fecha_ingreso,
    };
    await axios.put(API+`/api/hr/personal/employees/${draft._id}`, body, { headers });
    onSaved();
    onClose();
  };

  if (!draft) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={save} style={{ display:"grid", gap:8 }}>
        <input placeholder="Email" value={draft.email} onChange={e=> setDraft({ ...(draft as Emp), email:e.target.value })} required />
        <input placeholder="Nombre Completo" value={draft.nombreCompleto} onChange={e=> setDraft({ ...(draft as Emp), nombreCompleto:e.target.value })} required />
        <input placeholder="Área" value={draft.area || ""} onChange={e=> setDraft({ ...(draft as Emp), area:e.target.value })} />
        <input placeholder="Cargo" value={draft.cargo || ""} onChange={e=> setDraft({ ...(draft as Emp), cargo:e.target.value })} />
        <input type="number" placeholder="Remuneración" value={Number(draft.remuneracion)} onChange={e=> setDraft({ ...(draft as Emp), remuneracion:Number(e.target.value) })} required />
        <input type="date" placeholder="Fecha de ingreso" value={String(draft.fecha_ingreso).slice(0,10)} onChange={e=> setDraft({ ...(draft as Emp), fecha_ingreso:e.target.value })} required />
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-accent" type="submit">Guardar cambios</button>
        </div>
      </form>
    </Modal>
  );
}
