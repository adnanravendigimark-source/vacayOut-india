"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { QuotaInfo } from "./quota-view";

/**
 * The visitor's free-question quota as the browser knows it: loaded from
 * GET /api/chat, then updated after every answer. Shared by every chat surface.
 */
let state: QuotaInfo | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

export function setQuota(next: QuotaInfo | null) {
  state = next;
  notify();
}

export function getQuota() {
  return state;
}

export function loadQuota(force = false): Promise<void> {
  if (loading && !force) return loading;
  loading = fetch("/api/chat", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<QuotaInfo>) : null))
    .then((q) => {
      if (q && typeof q.signedIn === "boolean") setQuota(q);
    })
    .catch(() => {});
  return loading;
}

export function useQuota(): QuotaInfo | null {
  useEffect(() => {
    void loadQuota();
    // Signing in (or out) changes the rules: reload.
    const reload = () => void loadQuota(true);
    window.addEventListener("vacayout:signed-in", reload);
    return () => window.removeEventListener("vacayout:signed-in", reload);
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => null,
  );
}
