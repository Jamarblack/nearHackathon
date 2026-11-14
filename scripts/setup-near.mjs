// One-time setup: makes 5 testnet accounts (treasury, player, 3 merchants), saves their keys to .env, funds them.
// Run `pnpm setup:near`, fund the printed treasury id at the faucet, then run it again.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { Near, generateKey } from "near-kit";

const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58hex(s) { // implicit account id = lowercase hex of the 32-byte ed25519 public key
  let n = 0n;
  for (const c of s) n = n * 58n + BigInt(ALPHA.indexOf(c));
  const lead = [...s].findIndex((c) => c !== "1");
  const hex = "00".repeat(lead < 0 ? s.length : lead) + n.toString(16).padStart(64 - 2 * Math.max(lead, 0), "0");
  if (hex.length !== 64) throw new Error("unexpected key length");
  return hex;
}
const mk = () => { const k = generateKey(); return { id: b58hex(k.publicKey.toString().replace("ed25519:", "")), key: k.secretKey }; };

const ENV = ".env";
const env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const found = env.match(/^NEAR_KEYS=(.*)$/m);
let cfg = found ? JSON.parse(found[1]) : null;
if (!cfg) {
  cfg = { treasury: mk(), player: mk(), merchants: [mk(), mk(), mk()] };
  writeFileSync(ENV, `${env}${env && !env.endsWith("\n") ? "\n" : ""}NEAR_KEYS=${JSON.stringify(cfg)}\n`);
  console.log("Created testnet keys in .env (this file is git-ignored; never commit it).");
}
const accts = [cfg.player, ...cfg.merchants];
const near = new Near({ network: "testnet", keyStore: Object.fromEntries([cfg.treasury, ...accts].map((a) => [a.id, a.key])) });

if (!(await near.accountExists(cfg.treasury.id))) {
  console.log(`\nTreasury account (not funded yet):\n  ${cfg.treasury.id}\n`);
  console.log("1) Open https://docs.near.org/getting-started/faucet");
  console.log("2) Paste that id, request tokens (do it 2 or 3 times if the amount is small)");
  console.log("3) Run: pnpm setup:near   again");
  process.exit(0);
}
const plan = [[cfg.player, "0.2"], ...cfg.merchants.map((m) => [m, "0.3"])];
for (const [a, amt] of plan) {
  if (await near.accountExists(a.id)) { console.log("already exists:", a.id); continue; }
  try { await near.transaction(cfg.treasury.id).transfer(a.id, `${amt} NEAR`).send(); console.log(`funded ${amt} NEAR:`, a.id); }
  catch (e) { console.log("could not fund", a.id, "-", e instanceof Error ? e.message : e, "\nRequest more faucet tokens for the treasury and run again."); process.exit(1); }
}
console.log("\nDone. For Vercel, set the env var NEAR_KEYS to this value (no treasury key):\n");
console.log(JSON.stringify({ player: cfg.player, merchants: cfg.merchants }));
console.log("\nFor local dev nothing else is needed: pnpm dev reads .env.");
