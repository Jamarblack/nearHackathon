import {
  CLOSED_RECOVERY, DEMAND_DECAY, GOODS, MIN_CASH, RECIPES, REOPEN_CASH, quote,
  type Good, type Merchant,
} from "./pricing";

export interface Player { coins: number; inv: Record<Good, number> }
export interface World {
  day: number; gathered: number; merchants: Merchant[]; player: Player;
  history: Record<Good, number>[];
}
export const DAILY_GATHER_CAP = 30;
export const RAW: Good[] = ["cassava", "palmNuts", "cotton"];

let seed = 7; // seeded RNG so every run of fast-forward is reproducible for judges
export const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
export const empty = (): Record<Good, number> => ({ cassava: 0, palmNuts: 0, cotton: 0, garri: 0, palmOil: 0 });
const st = (o: Partial<Record<Good, number>>) => ({ ...empty(), ...o });

export function newWorld(): World {
  seed = 7;
  const w: World = {
    day: 1, gathered: 0, history: [],
    player: { coins: 60, inv: empty() },
    merchants: [
      { id: "nkechi", name: "Mama Nkechi", blurb: "Food seller. Fair prices.", cash: 400, spread: 0.2, open: true,
        stock: st({ cassava: 30, garri: 10, palmOil: 5, palmNuts: 8, cotton: 4 }), demand: empty() },
      { id: "musa", name: "Alhaji Musa", blurb: "Cloth trader. Hard bargainer.", cash: 300, spread: 0.3, open: true,
        stock: st({ cotton: 28, cassava: 6, garri: 4, palmNuts: 10, palmOil: 6 }), demand: empty() },
      { id: "tunde", name: "Baba Tunde", blurb: "Oil dealer. Generous, low on cash.", cash: 120, spread: 0.12, open: true,
        stock: st({ palmNuts: 24, palmOil: 14, cassava: 10, cotton: 8, garri: 3 }), demand: empty() },
    ],
  };
  record(w);
  return w;
}

export function record(w: World) {
  const open = w.merchants.filter((m) => m.open);
  const src = open.length ? open : w.merchants;
  const p = empty();
  for (const g of GOODS) p[g] = Math.round(src.reduce((s, m) => s + quote(m, g).ask, 0) / src.length);
  w.history.push(p);
}

export function gather(w: World, g: Good): number | string {
  if (w.gathered >= DAILY_GATHER_CAP) return "Daily gather limit reached. Sleep to start a new day.";
  const n = Math.min(1 + Math.floor(rnd() * 3), DAILY_GATHER_CAP - w.gathered);
  w.player.inv[g] += n; w.gathered += n;
  return n;
}

export function craft(w: World, out: "garri" | "palmOil"): string | null {
  const [inp, qty] = Object.entries(RECIPES[out])[0] as [Good, number];
  if (w.player.inv[inp] < qty) return `Need ${qty} of the raw good first.`;
  w.player.inv[inp] -= qty; w.player.inv[out] += 1;
  return null;
}

export function buy(w: World, mi: number, g: Good): string | null {
  const m = w.merchants[mi], q = quote(m, g);
  if (!m.open) return `${m.name} is closed.`;
  if (m.stock[g] < 1) return "Out of stock.";
  if (w.player.coins < q.ask) return "Not enough coins.";
  w.player.coins -= q.ask; m.cash += q.ask; m.stock[g] -= 1; m.demand[g] += 1; w.player.inv[g] += 1;
  return null;
}

export function sell(w: World, mi: number, g: Good): string | null {
  const m = w.merchants[mi], q = quote(m, g);
  if (!m.open) return `${m.name} is closed.`;
  if (w.player.inv[g] < 1) return "You have none to sell.";
  if (m.cash < q.bid) return `${m.name} cannot afford that.`;
  w.player.inv[g] -= 1; w.player.coins += q.bid; m.cash -= q.bid; m.stock[g] += 1;
  if (m.cash < MIN_CASH) m.open = false; // out of cash: shop closes
  return null;
}

// A bot trader: buys where a good is cheapest, sells where it pays most.
export function botTrade(w: World) {
  const g = pick(GOODS);
  const open = w.merchants.map((m, i) => ({ m, i })).filter((x) => x.m.open);
  const a = open.filter((x) => x.m.stock[g] > 0).sort((p, q) => quote(p.m, g).ask - quote(q.m, g).ask)[0];
  const b = open.filter((x) => x.i !== a?.i).sort((p, q) => quote(q.m, g).bid - quote(p.m, g).bid)[0];
  if (!a || !b || quote(b.m, g).bid <= quote(a.m, g).ask) return;
  const bot = { ...w, player: { coins: 999, inv: empty() } };
  if (!buy(bot, a.i, g)) sell(bot, b.i, g);
}

// End of a day: town customers buy, farmers deliver, closed shops slowly recover.
export function dayTick(w: World) {
  w.day += 1; w.gathered = 0;
  for (const m of w.merchants) {
    for (const g of GOODS) m.demand[g] *= DEMAND_DECAY;
    if (!m.open) {
      m.cash += CLOSED_RECOVERY;
      if (m.cash >= REOPEN_CASH) m.open = true;
      continue;
    }
    for (let i = 0; i < 3; i++) { // town customers
      const g = pick(GOODS);
      if (m.stock[g] > 0) { m.cash += quote(m, g).ask; m.stock[g] -= 1; }
    }
    const g = pick(RAW); // farmers deliver raw goods and get paid
    const units = Math.min(4, Math.floor((m.cash * 0.5) / quote(m, g).bid));
    if (units > 0) { m.cash -= units * quote(m, g).bid; m.stock[g] += units; }
    if (m.cash < MIN_CASH) m.open = false;
  }
  record(w);
}
