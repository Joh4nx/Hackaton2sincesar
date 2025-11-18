import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { API } from "../lib/api";

export default function NavBar() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();

  const login = () => {
    window.location.href = `${API}/auth/google/login`;
  };
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    nav("/login");
  };

  return (
    <nav className="nav">
      <Link to="/" style={{ fontWeight: 700 }}>
        BancaMicro
      </Link>

      {user && (
        <>
          <Link to="/clientes">Clientes</Link>
          <Link to="/cuentas">Cuentas</Link>
          <Link to="/pagos">Pagos</Link>
          {user.role === "admin" && <Link to="/admin">Panel</Link>}
        </>
      )}

      <div className="grow">
        {!user ? (
          <button className="btn btn-accent" onClick={login}>
            Iniciar sesión
          </button>
        ) : (
          <>
            <span className="badge">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#16a34a",
                }}
              />
              {user.email} · {user.role}
            </span>
            <button className="btn" onClick={logout}>
              Salir
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
