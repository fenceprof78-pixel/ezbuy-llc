"use client";
import { useAuth } from "@/components/AuthProvider";
import { StatusBadge } from "@/components/ui";
import { useTheme } from "@/components/ThemeProvider";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, setUser } = useAuth();
  const { theme, toggle } = useTheme();
  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
    window.location.href = "/login";
  };
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-violet-100 bg-white/90 px-4 backdrop-blur dark:border-white/10 dark:bg-[#150F2E]/90 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 text-slate-600 md:hidden dark:border-white/10 dark:text-slate-300"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
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
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-100 text-base text-slate-600 transition hover:bg-violet-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {user && (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[image:var(--grad-brand)] text-sm font-bold text-white shadow-md shadow-violet-500/25">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                <StatusBadge status={user.role} />
              </div>
            </div>
            <button
              onClick={logout}
              className="rounded-xl border border-violet-100 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <span className="hidden sm:inline">Log out</span>
              <span className="sm:hidden">⏻</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
