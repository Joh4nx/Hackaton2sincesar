import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API } from "./api";

type User = { id: string; email: string; role: "user" | "admin" } | null;
type Ctx = {
  user: User;
  setUser: (u: User) => void;
  loading: boolean;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  setUser: () => {},
  loading: false,
});

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    axios
      .get(API + "/auth/me", { headers: { Authorization: "Bearer " + token } })
      .then((r) => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
