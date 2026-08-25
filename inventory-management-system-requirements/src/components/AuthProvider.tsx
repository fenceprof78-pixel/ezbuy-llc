"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type AuthCtxType = {
  user: SessionUser | null;
  loading: boolean;
  setUser: (u: SessionUser | null) => void;
};

const AuthCtx = createContext<AuthCtxType>({ user: null, loading: true, setUser: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    const onLoginPage = pathname === "/login";
    if (!user && !onLoginPage) {
      window.location.href = "/login";
    }
    if (user && onLoginPage) {
      window.location.href = "/dashboard";
    }
  }, [user, loading, pathname]);

  return <AuthCtx.Provider value={{ user, loading, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
