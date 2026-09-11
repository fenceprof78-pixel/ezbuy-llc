"use client";
import { useAuth } from "@/components/AuthProvider";
import { StatusBadge } from "@/components/ui";
import { useTheme } from "@/components/ThemeProvider";
import { Menu, Sun, Moon, LogOut } from "lucide-react";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, setUser } = useAuth();
  const { theme, toggle } = useTheme();
  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
    window.location.href = "/login";
  };
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-[#0F172A]/90 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 md:hidden dark:border-white/10 dark:text-slate-300"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="hidden text-sm font-medium text-slate-400 sm:block">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" strokeWidth={2} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={2} />}
        </button>
        {user && (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[image:var(--grad-brand)] text-sm font-bold text-white shadow-md shadow-blue-900/25">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                <StatusBadge status={user.role} />
              </div>
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 sm:hidden" strokeWidth={2} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
