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
import Employees from "./pages/Employees";
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

        {/* Panel admin */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <Admin />
            </RequireRole>
          }
        />
        {/* Gestión de Personal */}
        <Route
          path="/hr/employees"
          element={
            <RequireRole role="admin">
              <Employees />
            </RequireRole>
          }
        />
        {/* Gestión de usuarios dentro del espacio admin (sin estar en el navbar) */}
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
