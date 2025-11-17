import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "./api";

type User = { id: string; email: string; role: "user"|"admin" } | null;
type Ctx = { user: User; setUser: (u: User)=>void };
const AuthCtx = createContext<Ctx>({ user: null, setUser: ()=>{} });
export const useAuth = ()=> useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.get(API + "/auth/me", { headers: { Authorization: "Bearer " + token } })
      .then(r => setUser(r.data.user))
      .catch(() => localStorage.removeItem("token"));
  }, []);
  return <AuthCtx.Provider value={{ user, setUser }}>{children}</AuthCtx.Provider>;
}
