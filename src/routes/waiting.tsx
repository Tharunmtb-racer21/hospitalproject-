import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity, ArrowLeft, Clock, Users, Wifi, WifiOff, Coffee, QrCode,
  CheckCircle2, TrendingUp,
} from "lucide-react";
import { useQueue, estimateWait } from "@/lib/queue/use-queue";

export const Route = createFileRoute("/waiting")({
  ssr: false,
  head: () => ({ meta: [{ title: "Waiting Room — Queue Cure '26" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : undefined }),
  component: WaitingRoom,
});

function WaitingRoom() {
  const { token: myTokenNumber } = Route.useSearch();
  const { waiting, serving, clinic, connected } = useQueue();
  const avgMin = clinic?.avg_consultation_minutes ?? 10;
  const [showQR, setShowQR] = useState(false);

  const me = useMemo(() => {
    if (!myTokenNumber) return null;
    const num = Number(myTokenNumber);
    return waiting.find((t) => t.number === num) ?? (serving?.number === num ? serving : null);
  }, [myTokenNumber, waiting, serving]);

  const myPosition = me && me.status === "waiting" ? waiting.findIndex((t) => t.id === me.id) : -1;
  const myWait = myPosition >= 0 ? estimateWait(myPosition, avgMin) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <div className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">Queue Cure '26</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQR((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:text-foreground">
            <QrCode className="h-3.5 w-3.5" /> Track on phone
          </button>
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${connected ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning-foreground"}`}>
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? "Live" : "Reconnecting"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-6">
        {clinic?.on_break && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            <Coffee className="h-4 w-4" />
            The doctor is taking a short break. The queue will resume shortly.
          </div>
        )}

        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 md:p-12" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full opacity-25 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
          <div className="relative text-center">
            <div className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Now serving</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={serving?.id ?? "empty"}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="mt-4 text-[7rem] font-bold leading-none tabular-nums tracking-tight md:text-[10rem]"
                style={{ backgroundImage: "var(--gradient-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
              >
                {serving ? `#${serving.number}` : "—"}
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 text-lg text-muted-foreground md:text-xl">{serving?.patient_name ?? "Awaiting first patient"}</div>
          </div>
        </div>

        {me ? <MyTokenCard token={me} position={myPosition} wait={myWait} /> : <KioskTrackPrompt />}

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <InfoTile label="In queue" value={waiting.length} Icon={Users} />
          <InfoTile label="Avg per visit" value={`${avgMin}m`} Icon={Clock} />
          <InfoTile label="Est. clear" value={`${waiting.length * avgMin}m`} Icon={Clock} />
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <header className="border-b border-border px-5 py-3 text-sm font-semibold">Up next</header>
          {waiting.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No tokens waiting.</div>
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {waiting.slice(0, 8).map((t, i) => (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-4 px-5 py-3 ${me?.id === t.id ? "bg-primary/5" : ""}`}
                  >
                    <div className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold tabular-nums ${t.priority === "emergency" ? "bg-destructive/15 text-destructive" : "bg-secondary text-secondary-foreground"}`}>
                      #{t.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{maskName(t.patient_name)}</div>
                      <div className="text-xs text-muted-foreground">~{i * avgMin} min</div>
                    </div>
                    {me?.id === t.id && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">YOU</span>}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4"
              onClick={() => setShowQR(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center"
              >
                <h3 className="text-lg font-semibold">Scan to track on your phone</h3>
                <p className="mt-1 text-sm text-muted-foreground">Enter your token number after scanning.</p>
                <div className="mx-auto mt-4 rounded-2xl bg-background p-4">
                  <QRCodeSVG value={typeof window !== "undefined" ? `${window.location.origin}/waiting` : "/waiting"} size={192} bgColor="transparent" fgColor="currentColor" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MyTokenCard({ token, position, wait }: { token: { number: number; status: string; patient_name: string }; position: number; wait: number }) {
  const isServing = token.status === "serving";
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border-2 border-primary/40 bg-card p-5" style={{ boxShadow: "var(--shadow-glow)" }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary">Your token</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">#{token.number}</div>
          <div className="text-sm text-muted-foreground">{token.patient_name}</div>
        </div>
        <div className="text-right">
          {isServing ? (
            <>
              <div className="text-xs text-success">It's your turn</div>
              <div className="text-2xl font-semibold text-success">Go in</div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">{position} ahead of you</div>
              <div className="text-2xl font-semibold tabular-nums">~{wait} min</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KioskTrackPrompt() {
  const [n, setN] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (n) window.location.search = `?token=${encodeURIComponent(n)}`; }}
      className="mt-6 flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex-1 text-sm">
        <div className="font-medium">Track your token</div>
        <div className="text-muted-foreground">Enter the number on your receipt.</div>
      </div>
      <input
        value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric" placeholder="e.g. 12"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 sm:w-32"
      />
      <button className="rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>Track</button>
    </form>
  );
}

function InfoTile({ label, value, Icon }: { label: string; value: number | string; Icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function maskName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.map((p, i) => (i === parts.length - 1 && parts.length > 1 ? p[0] + "." : p)).join(" ");
}