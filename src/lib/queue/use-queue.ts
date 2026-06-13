import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Token = Tables<"tokens">;
export type ClinicState = Tables<"clinic_state">;

export function useQueue() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [clinic, setClinic] = useState<ClinicState | null>(null);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase
        .from("tokens")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase.from("clinic_state").select("*").eq("id", 1).single(),
    ]);
    if (t) setTokens(t);
    if (c) setClinic(c);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("queue-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_state" }, () => refresh())
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const waiting = tokens.filter((t) => t.status === "waiting");
  const serving = tokens.find((t) => t.status === "serving") ?? null;
  const done = tokens.filter((t) => t.status === "done");
  const skipped = tokens.filter((t) => t.status === "skipped");

  return { tokens, clinic, waiting, serving, done, skipped, connected, refresh };
}

export async function addPatient(name: string, priority: "normal" | "emergency" = "normal") {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");

  // Duplicate guard: same name waiting today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { data: existing } = await supabase
    .from("tokens")
    .select("id")
    .ilike("patient_name", trimmed)
    .in("status", ["waiting", "serving"])
    .gte("created_at", today.toISOString());
  if (existing && existing.length > 0) {
    throw new Error("Patient already in queue today");
  }

  const { data, error } = await supabase
    .from("tokens")
    .insert({ patient_name: trimmed, priority, number: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function callNext() {
  const { data, error } = await supabase.rpc("call_next_token");
  if (error) throw error;
  return data;
}

export async function skipToken(id: string) {
  const { error } = await supabase.from("tokens").update({ status: "skipped" }).eq("id", id);
  if (error) throw error;
}

export async function restoreToken(id: string) {
  const { error } = await supabase.from("tokens").update({ status: "waiting" }).eq("id", id);
  if (error) throw error;
}

export async function setAverage(min: number) {
  const { error } = await supabase
    .from("clinic_state")
    .update({ avg_consultation_minutes: min, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export async function setBreak(on: boolean) {
  const { error } = await supabase
    .from("clinic_state")
    .update({ on_break: on, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export function estimateWait(position: number, avgMin: number) {
  return Math.max(0, position) * avgMin;
}