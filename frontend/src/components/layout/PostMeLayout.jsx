import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Send, Users, Mic, Building2, LogOut, Menu, X, Moon, Sun } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Brand from "./Brand";

// Post Me panel shell: sidebar navigation + page outlet.
// "Clients" is only shown to the platform super-admin (role "admin");
// each client's own admin (role "institute_admin") sees just their tools.
export default function PostMeLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/facebook", label: "Auto Posting", icon: Send },
    { to: "/admin/cross-posting", label: "Cross-Posting", icon: Users },
    { to: "/admin/voice-studio", label: "Voice Studio", icon: Mic },
    ...(user?.role === "admin" ? [{ to: "/admin/clients", label: "Clients", icon: Building2 }] : []),
  ];

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-brand-600 text-white shadow-soft"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link to="/admin" className="mb-6 px-2" onClick={() => setOpen(false)}>
        <Brand />
      </Link>
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
      <div className="mt-auto space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="truncate px-3 text-xs text-slate-500" title={user?.email}>{user?.name} · {user?.email}</p>
        <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button type="button" onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900">{sidebar}</aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <Brand textClass="text-base" />
          <button type="button" className="btn-ghost !p-2" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
