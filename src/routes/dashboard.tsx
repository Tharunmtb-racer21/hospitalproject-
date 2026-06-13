import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import {
  Activity, UserPlus, SkipForward, PhoneCall, Coffee, Clock, AlertTriangle,
  Users, CheckCircle2, ArrowLeft, Wifi, WifiOff, RotateCcw,
} from "lucide-react";
import {
  useQueue, addPatient, callNext, skipToken, restoreToken, setAverage, setBreak,
} from "@/lib/queue/use-queue";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Receptionist Dashboard — Queue Cure '26" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { tokens, clinic, waiting, serving, done, skipped, connected } = useQueue();
  const [name, setName] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const avgMin = clinic?.avg_consultation_minutes ?? 10;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const t = await addPatient(name, emergency ? "emergency" : "normal");
      toast.success(`Token #${t.number} issued to ${t.patient_name}`);
      setName(""); setEmergency(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add patient");
    } finally { setSubmitting(false); }
  };

  const handleCallNext = async () => {
    if (clinic?.on_break) return toast.error("Doctor is on break");
    try {
      const next = await callNext();
      if (!next) toast.message("Queue is empty");
      else toast.success(`Now calling #${next.number} — ${next.patient_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not call next");
    }
  };

  const handleSkip = async () => {
    if (!serving) return;
    try { await skipToken(serving.id); toast.message(`Skipped #${serving.number}`); }
    catch { toast.error("Skip failed"); }
  };

  const stats = useMemo(() => ({
    waiting: waiting.length,
    done: done.length,
    skipped: skipped.length,
    avgWait: waiting.length * avgMin,
  }), [waiting, done, skipped, avgMin]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Toaster position="top-right" richColors />
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Reception</div>
              <div className="text-xs text-muted-foreground">Queue Cure '26</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionPill connected={connected} />
            <BreakToggle on={clinic?.on_break ?? false} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT */}
        <div className="space-y-6">
          <CurrentCard serving={serving} onBreak={clinic?.on_break ?? false} onCallNext={handleCallNext} onSkip={handleSkip} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Waiting" value={stats.waiting} Icon={Users} />
            <Stat label="Served today" value={stats.done} Icon={CheckCircle2} tone="success" />
            <Stat label="Skipped" value={stats.skipped} Icon={SkipForward} tone="warning" />
            <Stat label="Est. clear" value={`${stats.avgWait}m`} Icon={Clock} />
          </div>

          <Section title="Waiting queue" subtitle={`${waiting.length} patient${waiting.length === 1 ? "" : "s"} in line`}>
            {waiting.length === 0 ? (
              <Empty text="No one waiting. Add a patient to get started." />
            ) : (
              <ul className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {waiting.map((t, i) => (
                    <motion.li
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <div className={`grid h-11 w-11 place-items-center rounded-xl text-sm font-bold tabular-nums ${t.priority === "emergency" ? "bg-destructive/15 text-destructive" : "bg-secondary text-secondary-foreground"}`}>
                        #{t.number}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.patient_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.priority === "emergency" && <span className="mr-2 inline-flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />Emergency</span>}
                          ~{i * avgMin} min wait
                        </div>
                      </div>
                      <button
                        onClick={() => skipToken(t.id).then(() => toast.message(`Skipped #${t.number}`))}
                        className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        Skip
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Section>

          {skipped.length > 0 && (
            <Section title="Skipped" subtitle="Restore a patient to the queue">
              <ul className="divide-y divide-border">
                {skipped.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-sm font-bold tabular-nums">#{t.number}</div>
                    <div className="flex-1 truncate">{t.patient_name}</div>
                    <button onClick={() => restoreToken(t.id).then(() => toast.success("Restored"))} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-primary hover:bg-primary/10">
                      <RotateCcw className="h-3 w-3" /> Restore
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <Section title="Add patient">
            <form onSubmit={handleAdd} className="space-y-3 p-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="Patient full name"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                maxLength={80}
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
                <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} className="h-4 w-4 accent-destructive" />
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Emergency priority
              </label>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                <UserPlus className="h-4 w-4" />
                Issue token
              </button>
            </form>
          </Section>

          <Section title="Settings">
            <div className="space-y-4 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average consultation</span>
                  <span className="font-medium tabular-nums">{avgMin} min</span>
                </div>
                <input
                  type="range" min={2} max={45} step={1}
                  value={avgMin}
                  onChange={(e) => setAverage(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </Section>

          <Section title="Today's activity">
            <div className="p-4">
              <Sparkline tokens={tokens} />
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${connected ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning-foreground"}`}>
      {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {connected ? "Live" : "Reconnecting"}
    </div>
  );
}

function BreakToggle({ on }: { on: boolean }) {
  return (
    <button
      onClick={() => setBreak(!on).then(() => toast.message(on ? "Break ended" : "Doctor is on break"))}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? "border-warning/40 bg-warning/15 text-warning-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
    >
      <Coffee className="h-3.5 w-3.5" />
      {on ? "On break" : "Break mode"}
    </button>
  );
}

function CurrentCard({ serving, onBreak, onCallNext, onSkip }: { serving: ReturnType<typeof useQueue>["serving"]; onBreak: boolean; onCallNext: () => void; onSkip: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
      <div className="relative">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Now serving</div>
        <div className="mt-3 flex items-baseline gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={serving?.id ?? "empty"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-6xl font-bold tabular-nums tracking-tight md:text-7xl"
              style={{ backgroundImage: "var(--gradient-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              {serving ? `#${serving.number}` : "—"}
            </motion.div>
          </AnimatePresence>
          <div className="text-lg text-muted-foreground">{serving?.patient_name ?? (onBreak ? "Doctor on break" : "No one called yet")}</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={onCallNext}
            disabled={onBreak}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            <PhoneCall className="h-4 w-4" />
            Call next
          </button>
          <button
            onClick={onSkip}
            disabled={!serving}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
            Skip current
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
      <header className="flex items-end justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, Icon, tone }: { label: string; value: number | string; Icon: typeof Users; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning-foreground" : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function Sparkline({ tokens }: { tokens: ReturnType<typeof useQueue>["tokens"] }) {
  // Hourly served distribution
  const buckets = new Array(12).fill(0) as number[];
  const now = new Date();
  tokens.forEach((t) => {
    if (t.status !== "done" || !t.completed_at) return;
    const h = new Date(t.completed_at).getHours();
    const start = now.getHours() - 11;
    const idx = h - start;
    if (idx >= 0 && idx < 12) buckets[idx]++;
  });
  const max = Math.max(1, ...buckets);
  return (
    <div className="flex h-24 items-end gap-1.5">
      {buckets.map((v, i) => (
        <div key={i} className="flex-1 rounded-md transition-all" style={{
          height: `${(v / max) * 100}%`,
          minHeight: 4,
          background: v > 0 ? "var(--gradient-primary)" : "var(--color-muted)",
        }} />
      ))}
    </div>
  );
}