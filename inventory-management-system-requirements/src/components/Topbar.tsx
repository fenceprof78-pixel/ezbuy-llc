"use client";

import { useAuth } from "@/components/AuthProvider";
import { StatusBadge } from "@/components/ui";

export default function Topbar() {
  const { user, setUser } = useAuth();

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
      <div className="text-sm font-medium text-slate-400">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <StatusBadge status={user.role} />
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
