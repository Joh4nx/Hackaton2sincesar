import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import NavBar from "./components/NavBar";
import RequireRole from "./components/RequireRole";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import OAuthCallback from "./pages/OAuthCallback";
import Clientes from "./pages/Clientes";
import Cuentas from "./pages/Cuentas";
import Pagos from "./pages/Pagos";

import "./app.css";

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/* Callback para Google Code Flow */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* Módulos banca */}
        <Route
          path="/clientes"
          element={
            <RequireRole role="user">
              <Clientes />
            </RequireRole>
          }
        />
        <Route
          path="/cuentas"
          element={
            <RequireRole role="user">
              <Cuentas />
            </RequireRole>
          }
        />
        <Route
          path="/pagos"
          element={
            <RequireRole role="user">
              <Pagos />
            </RequireRole>
          }
        />

        {/* Panel admin */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <Admin />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireRole role="admin">
              <AdminUsers />
            </RequireRole>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
