import { useSyncExternalStore } from "react";

export interface Tx { id: number; label: string; status: "pending" | "done" | "failed"; hash?: string; error?: string }
let txs: Tx[] = [];
let seq = 0;
let queue: Promise<unknown> = Promise.resolve();
const subs = new Set<() => void>();
const emit = () => { txs = [...txs]; subs.forEach((f) => f()); };
export const useTxs = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => txs);

// Fire and forget: the game never waits for the chain. Trades go out one at a time so a key never reuses a nonce.
export function settle(kind: "buy" | "sell", merchant: number, coins: number, good: string, label: string) {
  const tx: Tx = { id: ++seq, label, status: "pending" };
  txs = [tx, ...txs].slice(0, 8); emit();
  queue = queue.then(async () => {
    try {
      const r = await fetch("/api/settle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, merchant, coins, good }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      Object.assign(tx, { status: "done", hash: j.hash });
    } catch (e) { Object.assign(tx, { status: "failed", error: e instanceof Error ? e.message : "failed" }); }
    emit();
  });
}
