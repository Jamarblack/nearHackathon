import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { GOODS, LABEL, quote, type Good } from "./economy/pricing";
import {
  DAILY_GATHER_CAP, botTrade, buy, craft, dayTick,
  gather, newWorld, record, sell, type World,
} from "./economy/sim";
import Town, { SPOTS, pop } from "./Town";
import { settle, useTxs } from "./chain";
import Intro from "./Intro";

const COLORS: Record<Good, string> = {
  cassava: "#b7791f", palmNuts: "#c2410c", cotton: "#64748b", garri: "#2f6b3a", palmOil: "#7c3aed",
};
const TICKS = 84, MS = 714, GOAL = 300; // 84 ticks x 714 ms = about 60 s = 7 game days
const btn = "rounded bg-[#1d2b64] px-3 py-1.5 text-white focus-visible:outline-2 disabled:opacity-40";

const KEY = "oja-save-v1";
const load = (): World | null => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return s && s.player && Array.isArray(s.merchants) && s.merchants.length === 3 && Array.isArray(s.history) && s.history.length ? (s as World) : null;
  } catch { return null; }
};
const save = (w: World) => { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage unavailable */ } };

function Chart({ h }: { h: Record<Good, number>[] }) {
  const all = h.flatMap((p) => GOODS.map((g) => p[g]));
  const lo = Math.min(...all), hi = Math.max(...all);
  const X = (i: number) => (i / Math.max(1, h.length - 1)) * 600;
  const Y = (v: number) => 150 - ((v - lo) / Math.max(1, hi - lo)) * 140;
  return (
    <svg viewBox="0 0 600 160" className="h-40 w-full" role="img" aria-label="Average sell price of each good over time">
      {GOODS.map((g) => (
        <polyline key={g} fill="none" stroke={COLORS[g]} strokeWidth="2" points={h.map((p, i) => `${X(i)},${Y(p[g])}`).join(" ")} />
      ))}
    </svg>
  );
}

export default function App() {
    const [initial] = useState(() => load() ?? newWorld());
  const [resumed] = useState(() => load() !== null);
  const W = useRef(initial);
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [msg, setMsg] = useState("Walk to a field, the mill or a stall. Press E (or tap Interact) when you are close.");
  const [why, setWhy] = useState("");
  const [near, setNear] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const tick = useRef(0);
  const [started, setStarted] = useState(false);
  const w = W.current;
  const getWorld = useCallback(() => W.current, []);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      for (let i = 0; i < 3; i++) botTrade(w);
      tick.current += 1;
      if (tick.current % 12 === 0) dayTick(w); else record(w);
      if (tick.current >= TICKS) { tick.current = 0; setRunning(false); setMsg("Fast-forward finished: 7 days simulated."); }
      save(w);
      bump();
    }, MS);
    return () => clearInterval(id);
  }, [running, w]);

    const act = (err: string | null, ok: string) => { if (!err) pop(ok); setMsg(err ?? ok); save(W.current); bump(); };
  const doGather = (g: Good) => {
    if ((ready[g] ?? 0) > Date.now()) return setMsg("Still recovering. Wait a few seconds.");
    const n = gather(w, g);
    if (typeof n === "string") return setMsg(n);
    setReady({ ...ready, [g]: Date.now() + 10000 });
    act(null, `Gathered ${n} ${LABEL[g]}.`);
  };
  const interact = (id: string) => {
    const s = SPOTS.find((x) => x.id === id);
    if (s?.kind === "node") doGather(id as Good);
    else setMsg(s?.kind === "mill" ? "Choose what to make below." : `Trading with ${s?.label}. Use the prices below.`);
  };
  const reset = () => { setRunning(false); tick.current = 0; W.current = newWorld(); save(W.current); setReady({}); setMsg("New game started."); bump(); };

  const txs = useTxs();
  const trade = (kind: "buy" | "sell", i: number, g: Good, price: number) => {
    const err = kind === "buy" ? buy(w, i, g) : sell(w, i, g);
    const verb = kind === "buy" ? "Bought" : "Sold";
    if (!err) settle(kind, i, price, g, `${verb} 1 ${LABEL[g]} for ${price} coins`);
    act(err, `${verb} 1 ${LABEL[g]} for ${price}.`);
  };

  const spot = SPOTS.find((s) => s.id === near);
  const mi = spot?.kind === "stall" ? Number(spot.id[1]) : -1;
  const left = spot?.kind === "node" ? Math.max(0, Math.ceil(((ready[spot.id] ?? 0) - now) / 1000)) : 0;

   const carried = GOODS.reduce((s, g) => s + w.player.inv[g], 0);
  const hint =
    w.player.coins >= GOAL ? "You did it: 300 coins! Try the fast-forward below to watch the whole market move."
    : carried === 0 ? "Step 1: walk to a field (potatoes, palms or cotton) and press E to pick up goods."
    : spot?.kind !== "stall" ? "Step 2: carry your goods to a stall. Walk up to a merchant to see what they pay."
    : "Step 3: press a Sell price to sell. Sell where the number is highest. Goal: 300 coins.";

      if (!started) return <Intro resume={resumed} onStart={() => setStarted(true)} />;

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <header className="adire px-5 py-5 text-white">
        <h1 className="text-4xl font-bold tracking-tight">Oja</h1>
        <p className="mt-1 max-w-prose text-sm text-slate-100">
          A market town where merchants set the prices from what they hold and what people buy. Earn {GOAL} coins to open your own stall.
        </p>
        <p className="mt-2 text-lg font-semibold tabular-nums">
          Day {w.day} · {w.player.coins}/{GOAL} coins · gathered today {w.gathered}/{DAILY_GATHER_CAP}
          {w.player.coins >= GOAL && " · Goal reached: you can afford a stall!"}
        </p>
      </header>
      <p aria-live="polite" className="bg-[#e8c25a] px-5 py-2 text-sm font-medium text-[#1b2240]">{msg}</p>
       <p className="border-b bg-white px-5 py-2 text-sm font-semibold text-[#1d2b64]"> {hint}</p>

      <div className="space-y-3 p-4">
        <Town getWorld={getWorld} onNear={setNear} onInteract={interact} />

        <div className="grid gap-3 md:grid-cols-3">
          <section className="rounded-lg bg-white p-3 md:col-span-2">
            <h2 className="font-bold">{spot ? spot.label : "Walk somewhere"}</h2>
            {!spot && <p className="mt-1 text-sm">Fields give raw goods. The mill turns them into garri and palm oil. Stalls buy and sell.</p>}
            {spot && spot.kind !== "mill" && (
              <button className={`${btn} mt-2 md:hidden`} onClick={() => interact(spot.id)}>Interact</button>
            )}
            {spot?.kind === "node" && (
              <button className={`${btn} mt-2`} disabled={left > 0} onClick={() => doGather(spot.id as Good)}>
                Gather {LABEL[spot.id as Good]}{left > 0 ? ` (${left}s)` : ""}
              </button>
            )}
            {spot?.kind === "mill" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button className={btn} onClick={() => act(craft(w, "garri"), "Made 1 garri.")}>2 cassava → garri</button>
                <button className={btn} onClick={() => act(craft(w, "palmOil"), "Made 1 palm oil.")}>3 palm nuts → palm oil</button>
              </div>
            )}
            {mi >= 0 && (() => {
              const m = w.merchants[mi];
              return (
                <div>
                  <p className="text-sm text-slate-600">{m.blurb} {m.open ? `Cash ${m.cash}.` : "Closed: out of cash."}</p>
                  <table className="mt-1 w-full text-sm">
                    <thead><tr className="text-left text-slate-500"><th>Good</th><th>Stock</th><th>Buy (price)</th><th>Sell (price)</th></tr></thead>
                    <tbody>
                      {GOODS.map((g) => {
                        const q = quote(m, g);
                        return (
                          <tr key={g} title={q.why} onMouseEnter={() => setWhy(q.why)}>
                            <td>{LABEL[g]}</td><td className="tabular-nums">{m.stock[g]}</td>
                            <td><button className={btn} disabled={!m.open || m.stock[g] < 1} onFocus={() => setWhy(q.why)}
                              onClick={() => trade("buy", mi, g, q.ask)}>{q.ask}</button></td>
                            <td><button className={btn} disabled={!m.open || w.player.inv[g] < 1} onFocus={() => setWhy(q.why)}
                              onClick={() => trade("sell", mi, g, q.bid)}>{q.bid}</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
          <section className="rounded-lg bg-white p-3">
            <h2 className="font-bold">Your goods</h2>
            <ul className="mt-1 text-sm tabular-nums">{GOODS.map((g) => <li key={g}>{LABEL[g]}: {w.player.inv[g]}</li>)}</ul>
            <button className={`${btn} mt-3`} onClick={() => { dayTick(w); act(null, `Day ${w.day} begins. Merchants restocked.`); }}>Sleep (next day)</button>
          </section>
        </div>

        <p className="min-h-12 rounded border-l-4 border-[#2f6b3a] bg-white p-2 text-sm">
          <strong>Why this price:</strong> {why || "Hover or tab to a price at a stall."}
        </p>

        <section className="rounded-lg bg-white p-3">
          <h2 className="font-bold">On NEAR testnet</h2>
          <p className="text-sm text-slate-600">Each trade you make at a stall also moves testnet NEAR between wallets (1 coin = 0.001 NEAR). The town simulation and bot traders stay off-chain.</p>
          <ul className="mt-1 space-y-1 text-sm">
            {txs.length === 0 && <li className="text-slate-500">Trade at a stall to see transactions here.</li>}
            {txs.map((t) => (
              <li key={t.id}>
                {t.status === "pending" ? "⏳" : t.status === "done" ? "✅" : "⚠️"} {t.label}{" "}
                {t.hash && <a className="underline" target="_blank" rel="noreferrer" href={`https://testnet.nearblocks.io/txns/${t.hash}`}>view</a>}
                {t.error && <span className="text-red-700"> ({t.error})</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg bg-white p-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold">Fast-forward</h2>
            <button className={btn} disabled={running} onClick={() => { setRunning(true); setMsg("Bot traders are moving goods between merchants..."); }}>
              Simulate one week (60 s)
            </button>
            <button className={btn} onClick={reset}>New game</button>
            {running && <span className="text-sm tabular-nums">tick {tick.current}/{TICKS}</span>}
          </div>
          <Chart h={w.history} />
          <p className="flex flex-wrap gap-3 text-sm">
            {GOODS.map((g) => <span key={g} style={{ color: COLORS[g] }}>■ {LABEL[g]}</span>)}
            <span className="text-slate-500">Average sell price over time</span>
          </p>
        </section>
      </div>
    </div>
  );
}
