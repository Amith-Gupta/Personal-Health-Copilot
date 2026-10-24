"use client";
import { useEffect, useRef } from "react";
import { api, localDay } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import { useToast } from "./ui";

const WINDOW_MIN = 30; // remind for a dose up to 30 minutes after its time

/** While the app is open, reminds the caregiver of every family member's doses at the right
 *  time: an in-app toast, plus a system notification when the browser allows it. The phone
 *  calendar export covers the times the app is closed. */
export function useDoseReminders(profiles: Profile[] | null) {
  const { t } = useI18n();
  const toast = useToast();
  const names = useRef<Record<string, string>>({});
  const text = useRef(t.care.reminderToast);
  names.current = Object.fromEntries((profiles || []).map((p) => [p.id, p.name]));
  text.current = t.care.reminderToast;
  const count = profiles?.length || 0;

  useEffect(() => {
    if (!count) return;
    let stopped = false;
    const seenKey = "copilot_reminded";
    const seen = (): Set<string> => {
      try { return new Set(JSON.parse(sessionStorage.getItem(seenKey) || "[]")); } catch { return new Set(); }
    };
    const remember = (s: Set<string>) => {
      try { sessionStorage.setItem(seenKey, JSON.stringify(Array.from(s).slice(-200))); } catch { /* private mode */ }
    };

    async function check() {
      let data;
      try { data = await api.familyToday(); } catch { return; }
      if (stopped || data.persisted === false) return;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const done = seen();
      for (const d of data.doses) {
        const [h, m] = d.time.split(":").map(Number);
        const at = h * 60 + m;
        const snoozeEnd = d.state === "snoozed" && d.snooze_until ? new Date(d.snooze_until) : null;
        const open = d.state === "pending" || (!!snoozeEnd && snoozeEnd <= now);
        const late = snoozeEnd ? (now.getTime() - snoozeEnd.getTime()) / 60000 > WINDOW_MIN : mins - at > WINDOW_MIN;
        const key = `${localDay()}:${d.item_id}:${d.time}:${d.snooze_until || ""}`;
        if (!open || mins < at || late || done.has(key)) continue;
        done.add(key);
        const msg = text.current(`${d.name}${d.dose ? " " + d.dose : ""}`, names.current[d.patient_id || ""] || "");
        toast(msg);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification("Health Copilot", { body: msg, tag: key }); } catch { /* some browsers need a service worker */ }
        }
      }
      remember(done);
    }

    check();
    const id = setInterval(check, 60_000);
    const onFocus = () => { check(); };
    window.addEventListener("focus", onFocus);
    return () => { stopped = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [count, toast]);
}
