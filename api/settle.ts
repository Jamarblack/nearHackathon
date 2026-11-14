// Settles a player's trade on NEAR TESTNET. Runs as a Vercel function, and under `pnpm dev` via vite.config.ts.
// 1 game coin = 0.001 testnet NEAR. Buying moves NEAR player -> merchant. Selling moves it merchant -> player.
import { Near } from "near-kit";

const GOODS = ["cassava", "palmNuts", "cotton", "garri", "palmOil"];
const COIN = 0.001;
interface Req { method?: string; body?: unknown }
interface Res { status: (n: number) => Res; json: (o: unknown) => void }
interface Acct { id: string; key: string }
interface Keys { player: Acct; merchants: Acct[] }

let near: Near | null = null;
let keys: Keys | null = null;
const hits: number[] = [];

function init(): { near: Near; keys: Keys } {
  if (!near || !keys) {
    const raw = process.env.NEAR_KEYS;
    if (!raw) throw new Error("NEAR_KEYS is not set. Run: pnpm setup:near");
    keys = JSON.parse(raw) as Keys;
    const keyStore: Record<string, string> = {};
    for (const a of [keys.player, ...keys.merchants]) keyStore[a.id] = a.key;
    near = new Near({ network: "testnet", keyStore });
  }
  return { near, keys };
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const now = Date.now();
  while (hits.length && now - hits[0] > 60_000) hits.shift();
  if (hits.length >= 120) return res.status(429).json({ error: "Too many trades per minute." });
  hits.push(now);

  let b: { kind?: string; merchant?: number; coins?: number; good?: string } = {};
  try { b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body as typeof b) ?? {}; } catch { /* handled below */ }
  const m = Number(b.merchant), coins = Number(b.coins);
  if (!["buy", "sell"].includes(String(b.kind)) || !Number.isInteger(m) || m < 0 || m > 2 ||
      !Number.isInteger(coins) || coins < 1 || coins > 500 || !GOODS.includes(String(b.good))) {
    return res.status(400).json({ error: "Invalid trade." });
  }
  try {
    const { near: n, keys: k } = init();
    const merchant = k.merchants[m].id;
    const [from, to] = b.kind === "buy" ? [k.player.id, merchant] : [merchant, k.player.id];
    const amount = `${(coins * COIN).toFixed(3)} NEAR` as `${number} NEAR`;
    const out = (await n.transaction(from).transfer(to, amount).send()) as unknown as
      { transaction?: { hash?: string }; transaction_outcome?: { id?: string } };
    res.status(200).json({ hash: out?.transaction?.hash ?? out?.transaction_outcome?.id ?? null, from, to });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
