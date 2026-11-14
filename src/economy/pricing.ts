// ALL merchant pricing rules live in this file. Change a number, the economy changes.
export type Good = "cassava" | "palmNuts" | "cotton" | "garri" | "palmOil";
export const GOODS: Good[] = ["cassava", "palmNuts", "cotton", "garri", "palmOil"];
export const LABEL: Record<Good, string> = {
  cassava: "Cassava", palmNuts: "Palm nuts", cotton: "Cotton", garri: "Garri", palmOil: "Palm oil",
};

export const BASE: Record<Good, number> = { cassava: 10, palmNuts: 12, cotton: 15, garri: 30, palmOil: 45 };
export const TARGET_STOCK = 20;    // at this stock level the price equals BASE
export const STOCK_POWER = 0.8;    // how strongly scarcity or glut moves the price
export const DEMAND_STEP = 0.06;   // +6% per unit players recently bought
export const DEMAND_DECAY = 0.85;  // demand fades by this factor each tick
export const MIN_MULT = 0.4;       // price floor: 40% of BASE
export const MAX_MULT = 3;         // price cap: 300% of BASE
export const MIN_CASH = 25;        // a merchant below this closes
export const REOPEN_CASH = 120;    // a closed merchant reopens at this cash
export const CLOSED_RECOVERY = 30; // cash a closed shop earns per day from family and credit
export const RECIPES = { garri: { cassava: 2 }, palmOil: { palmNuts: 3 } } as const;

export interface Merchant {
  id: string; name: string; blurb: string;
  cash: number; spread: number; open: boolean;
  stock: Record<Good, number>; demand: Record<Good, number>;
}

// The merchant sells at `ask` and buys at `bid`. bid < ask always (spread), so
// buying and instantly reselling to the SAME merchant always loses money.
export function quote(m: Merchant, g: Good) {
  const stockMult = Math.pow(TARGET_STOCK / (m.stock[g] + 1), STOCK_POWER);
  const demandMult = 1 + DEMAND_STEP * m.demand[g];
  const raw = stockMult * demandMult;
  const mult = Math.min(MAX_MULT, Math.max(MIN_MULT, raw));
  const ask = Math.max(1, Math.round(BASE[g] * mult));
  const bid = Math.max(1, Math.floor(ask * (1 - m.spread)));
  const why =
    `${m.name} has ${m.stock[g]} ${LABEL[g]} (target ${TARGET_STOCK}), so stock changes the price by x${stockMult.toFixed(2)}. ` +
    `Recent demand ${m.demand[g].toFixed(1)} adds x${demandMult.toFixed(2)}.` +
    (mult !== raw ? ` Clamped to x${mult}.` : "") +
    ` Sells at ${ask}, buys at ${bid} (${Math.round(m.spread * 100)}% spread).`;
  return { ask, bid, why };
}
