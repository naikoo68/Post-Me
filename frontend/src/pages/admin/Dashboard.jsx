import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Users, Mic, Building2, MonitorPlay, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { facebookService, youtubeService, settingsService } from "../../services";

// Post Me overview: connection status for this client + quick links.
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [yt, setYt] = useState(null);
  const [site, setSite] = useState(null);

  useEffect(() => {
    facebookService.stats().then(setStats).catch(() => setStats(null));
    youtubeService.status().then(setYt).catch(() => setYt(null));
    settingsService.get().then(setSite).catch(() => setSite(null));
  }, []);

  const connections = [
    { name: "Facebook Page", ok: !!site?.fbEnabled },
    { name: "Instagram", ok: !!site?.igEnabled },
    { name: "Telegram", ok: !!site?.tgEnabled },
    { name: "YouTube", ok: !!yt?.connected },
  ];

  const cards = [
    { to: "/admin/facebook", icon: Send, title: "Auto Posting", text: "Connect pages, build schedules and let Post Me publish images, reels and videos." },
    { to: "/admin/cross-posting", icon: Users, title: "Cross-Posting", text: "Run extra profiles with their own pages, tokens and schedules." },
    { to: "/admin/voice-studio", icon: Mic, title: "Voice Studio", text: "Clone your own voice to narrate reels and long videos." },
    ...(user?.role === "admin"
      ? [{ to: "/admin/clients", icon: Building2, title: "Clients", text: "Create client accounts, give each one an admin login and a domain." }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome, {user?.name || "there"} 👋</h1>
        <p className="text-sm text-slate-500">Your social media, on autopilot.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {connections.map((c) => (
          <div key={c.name} className="card flex items-center justify-between p-4">
            <span className="text-sm font-medium">{c.name}</span>
            {c.ok
              ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-4 w-4" /> On</span>
              : <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle className="h-4 w-4" /> Off</span>}
          </div>
        ))}
      </div>

      <div className="card flex items-center gap-4 p-5">
        <MonitorPlay className="h-8 w-8 text-brand-600" />
        <div>
          <p className="text-3xl font-extrabold">{stats?.lifetime ?? 0}</p>
          <p className="text-sm text-slate-500">posts published so far{stats?.recent?.[0]?.postedAt ? ` · last: ${new Date(stats.recent[0].postedAt).toLocaleString()}` : ""}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="card card-hover block p-5">
            <Icon className="mb-3 h-6 w-6 text-brand-600" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
