import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Activity, MonitorSmartphone, Stethoscope, Sparkles, Clock, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queue Cure '26 — Real-time clinic queue management" },
      { name: "description", content: "Replace paper tokens with live, synchronized queue management for clinics. Patients see their place. Staff stays in flow." },
      { property: "og:title", content: "Queue Cure '26" },
      { property: "og:description", content: "Real-time clinic queue management." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Queue Cure <span className="text-muted-foreground">'26</span></span>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link to="/dashboard" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">Dashboard</Link>
          <Link to="/waiting" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">Waiting Room</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-20">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Built for modern clinics
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          The waiting room, <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>finally calm.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          Retire paper tokens. Patients see their place in line in real time, while your receptionist runs the day from a single dashboard.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link to="/dashboard" className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition hover:-translate-y-1" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Stethoscope className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Receptionist Dashboard</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add patients, call next token, manage breaks and analytics.</p>
            <div className="mt-6 text-sm font-medium text-primary">Open dashboard →</div>
          </Link>

          <Link to="/waiting" className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 transition hover:-translate-y-1" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <MonitorSmartphone className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Patient Waiting Room</h2>
            <p className="mt-2 text-sm text-muted-foreground">Live current token, tokens ahead, and estimated wait time.</p>
            <div className="mt-6 text-sm font-medium text-primary">Open waiting room →</div>
          </Link>
        </div>

        <div className="mt-16 grid gap-6 text-sm md:grid-cols-3">
          {[
            { Icon: Clock, t: "Live wait times", d: "Estimates recalc as the queue moves." },
            { Icon: Shield, t: "Race-safe call next", d: "Atomic server-side handoff between receptionists." },
            { Icon: Sparkles, t: "Emergency priority", d: "Bump urgent patients to the top of the queue." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-medium">{t}</div>
              <div className="text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
