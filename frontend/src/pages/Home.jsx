import { Link } from "react-router-dom";
import { Send, Image, Film, MonitorPlay, CalendarClock, Mic, Users } from "lucide-react";
import Brand from "../components/layout/Brand";
import { useSeo } from "../lib/useSeo";

// Public landing page for Post Me.
export default function Home() {
  useSeo();
  const features = [
    { icon: CalendarClock, title: "Scheduled auto-posting", text: "Set it once — posts go out every day at the times you choose." },
    { icon: Image, title: "Branded post images", text: "Your content becomes clean, watermarked cards automatically." },
    { icon: Film, title: "Reels & Shorts", text: "Narrated 9:16 slideshows rendered on the server and published for you." },
    { icon: MonitorPlay, title: "Long YouTube videos", text: "Whole quizzes and topics become full-length videos with thumbnails." },
    { icon: Send, title: "Facebook, Instagram, Telegram", text: "Publish to every channel from one schedule." },
    { icon: Mic, title: "Your own voice", text: "Clone your voice, or pick from free and premium narrators." },
    { icon: Users, title: "Multiple profiles", text: "Run separate pages and brands, each with its own schedule." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="container-page flex items-center justify-between py-5">
        <Brand />
        <Link to="/login" className="btn-primary">Log in</Link>
      </header>

      <section className="container-page py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Your social media, <span className="text-brand-600">on autopilot.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Post Me turns your content into images, reels and videos and publishes them to
          Facebook, Instagram, YouTube and Telegram — on schedule, every day.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login" className="btn-primary">Get started</Link>
          <a href="#features" className="btn-outline">See features</a>
        </div>
      </section>

      <section id="features" className="container-page grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <Icon className="mb-3 h-6 w-6 text-brand-600" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} Post Me
      </footer>
    </div>
  );
}
