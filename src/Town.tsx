import { useEffect, useRef } from "react";
import { GOODS, type Good } from "./economy/pricing";
import type { World } from "./economy/sim";

export interface Spot { id: string; x: number; y: number; icon: string; label: string; kind: "node" | "mill" | "stall"; plate: string }
export const SPOTS: Spot[] = [
  { id: "cassava", x: 90, y: 90, icon: "🥔", label: "Cassava farm", kind: "node", plate: "#3f7d46" },
  { id: "palmNuts", x: 90, y: 230, icon: "🌴", label: "Palm grove", kind: "node", plate: "#3f7d46" },
  { id: "cotton", x: 90, y: 370, icon: "🧶", label: "Cotton field", kind: "node", plate: "#3f7d46" },
  { id: "mill", x: 400, y: 385, icon: "🔨", label: "Pounding mill", kind: "mill", plate: "#7a4a21" },
  { id: "m0", x: 290, y: 100, icon: "", label: "Mama Nkechi", kind: "stall", plate: "#1d2b64" },
  { id: "m1", x: 480, y: 175, icon: "", label: "Alhaji Musa", kind: "stall", plate: "#1d2b64" },
  { id: "m2", x: 660, y: 100, icon: "", label: "Baba Tunde", kind: "stall", plate: "#1d2b64" },
];
const ICON: Record<Good, string> = { cassava: "🥔", palmNuts: "🌴", cotton: "🧶", garri: "🍚", palmOil: "🛢️" };
type Look = { skin: string; cloth: string; dot: string; wrap?: string; cap?: string };
const PLAYER: Look = { skin: "#8d5524", cloth: "#2f6b3a", dot: "#e8c25a", cap: "#1d2b64" };
const OUTFIT: Look[] = [
  { skin: "#6f4018", cloth: "#1d2b64", dot: "#e8c25a", wrap: "#e8c25a" },
  { skin: "#a0673a", cloth: "#f3f1e8", dot: "#d9d5c2", cap: "#8b1e1e" },
  { skin: "#4a2c14", cloth: "#c2610c", dot: "#f4c26b", cap: "#2f6b3a" },
];
const TREES = [[40, 25], [705, 30], [735, 200], [570, 425], [240, 430], [620, 300], [200, 180]];
const W = 760, H = 460, REACH = 75, SPEED = 190;
const me = { x: 380, y: 270 };

interface Pop { text: string; x: number; y: number; t0: number }
const pops: Pop[] = [];
export const pop = (text: string) => { pops.push({ text, x: me.x, y: me.y - 55, t0: performance.now() }); };

function person(g: CanvasRenderingContext2D, x: number, y: number, t: number, l: Look, moving: boolean, face: number) {
  const sw = moving ? Math.sin(t / 90) : 0;
  const bob = moving ? Math.abs(Math.sin(t / 90)) * 3 : Math.sin(t / 420) * 1.2;
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(x, y + 24, 15, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2a2433"; g.fillRect(x - 8 + sw * 4, y + 8 - bob, 6, 16); g.fillRect(x + 2 - sw * 4, y + 8 - bob, 6, 16);
  g.fillStyle = l.cloth; g.beginPath(); g.moveTo(x - 13, y + 12 - bob); g.lineTo(x + 13, y + 12 - bob); g.lineTo(x + 9, y - 14 - bob); g.lineTo(x - 9, y - 14 - bob); g.closePath(); g.fill();
  g.fillStyle = l.dot;
  for (const [a, b] of [[-6, 6], [4, 2], [-3, -6], [7, 8], [-8, -1]]) { g.beginPath(); g.arc(x + a, y + b - bob, 1.8, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = l.skin; g.lineWidth = 4; g.lineCap = "round";
  g.beginPath(); g.moveTo(x - 9, y - 10 - bob); g.lineTo(x - 13 - sw * 3, y + 4 - bob); g.moveTo(x + 9, y - 10 - bob); g.lineTo(x + 13 + sw * 3, y + 4 - bob); g.stroke();
  g.fillStyle = l.skin; g.beginPath(); g.arc(x, y - 24 - bob, 10, 0, Math.PI * 2); g.fill();
  if (l.wrap) { g.fillStyle = l.wrap; g.beginPath(); g.ellipse(x, y - 34 - bob, 13, 7, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + 11, y - 38 - bob, 6, 4, 0.6, 0, Math.PI * 2); g.fill(); }
  if (l.cap) { g.fillStyle = l.cap; g.fillRect(x - 10, y - 36 - bob, 20, 8); }
  g.fillStyle = "#1a1210"; g.fillRect(x - 5 + face * 2, y - 26 - bob, 2.5, 3); g.fillRect(x + 3 + face * 2, y - 26 - bob, 2.5, 3);
}

interface Props { getWorld: () => World; onNear: (id: string | null) => void; onInteract: (id: string) => void }

export default function Town({ getWorld, onNear, onInteract }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onNear, onInteract });
  cb.current = { onNear, onInteract };

  useEffect(() => {
    const c = cv.current!, g = c.getContext("2d")!;
    let tgt: { x: number; y: number } | null = null, near: string | null = null, last = performance.now(), raf = 0, face = 1;
    const keys = new Set<string>();
    const MOVE = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === " ") { if (near) cb.current.onInteract(near); e.preventDefault(); return; }
      if (MOVE.includes(k)) { keys.add(k); tgt = null; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const click = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      tgt = { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };
    addEventListener("keydown", down); addEventListener("keyup", up); c.addEventListener("pointerdown", click);

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      let dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
      let dy = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
      if (!dx && !dy && tgt) {
        const ex = tgt.x - me.x, ey = tgt.y - me.y, d = Math.hypot(ex, ey);
        if (d < 4) tgt = null; else { dx = ex / d; dy = ey / d; }
      }
      const moving = !!(dx || dy);
      if (dx) face = dx > 0 ? 1 : -1;
      const n = Math.hypot(dx, dy) || 1;
      me.x = Math.min(W - 20, Math.max(20, me.x + (dx / n) * SPEED * dt));
      me.y = Math.min(H - 30, Math.max(45, me.y + (dy / n) * SPEED * dt));

      const hit = SPOTS.map((s) => ({ s, d: Math.hypot(s.x - me.x, s.y - me.y) })).filter((o) => o.d < REACH).sort((a, b) => a.d - b.d)[0];
      const id = hit ? hit.s.id : null;
      if (id !== near) { near = id; cb.current.onNear(id); }

      const w = getWorld();
      g.fillStyle = "#a9bd7a"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#c99f6b"; g.fillRect(0, 215, W, 55); g.fillRect(350, 0, 55, H);
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "34px serif"; g.fillStyle = "#000";
      for (const [x, y] of TREES) g.fillText("🌳", x, y);

      for (const s of SPOTS) {
        const m = s.kind === "stall" ? w.merchants[Number(s.id[1])] : null;
        if (m) {
          const dim = !m.open;
          for (let i = 0; i < 8; i++) { g.fillStyle = dim ? "#94a3b8" : i % 2 ? "#e8c25a" : "#1d2b64"; g.fillRect(s.x - 46 + i * 11.5, s.y - 56, 11.5, 14); }
          person(g, s.x, s.y - 4, t, OUTFIT[Number(s.id[1])], false, 1);
          g.fillStyle = dim ? "#8b95a5" : "#7a4a21"; g.fillRect(s.x - 46, s.y + 8, 92, 26);
          g.font = "16px serif"; g.fillStyle = "#000";
          [...GOODS].sort((a, b) => m.stock[b] - m.stock[a]).slice(0, 3).forEach((gd, i) => g.fillText(ICON[gd], s.x - 24 + i * 24, s.y + 20));
          g.font = "bold 12px sans-serif"; g.fillStyle = "#1b2240";
          g.fillText(s.label + (m.open ? ` · ${m.cash} coins` : " (CLOSED)"), s.x, s.y + 48);
        } else {
          g.fillStyle = s.plate; g.fillRect(s.x - 42, s.y - 34, 84, 68);
          g.font = s.kind === "mill" ? "34px serif" : "20px serif"; g.fillStyle = "#000";
          if (s.kind === "mill") g.fillText(s.icon, s.x, s.y + 2);
          else [-24, 0, 24].forEach((ox, i) => { g.fillText(s.icon, s.x + ox, s.y - 8 + (i % 2) * 14); g.fillText(s.icon, s.x + ox, s.y + 12 - (i % 2) * 8); });
          g.font = "bold 12px sans-serif"; g.fillStyle = "#1b2240"; g.fillText(s.label, s.x, s.y + 48);
        }
        if (s.id === near) { g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(s.x - 48, s.y - 58, 96, 94); }
      }
      person(g, me.x, me.y, t, PLAYER, moving, face);

      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i], age = (t - p.t0) / 1400;
        if (age > 1) { pops.splice(i, 1); continue; }
        g.globalAlpha = 1 - age * age; g.font = "bold 14px sans-serif"; g.lineWidth = 4; g.strokeStyle = "#1d2b64"; g.fillStyle = "#fff";
        g.strokeText(p.text, p.x, p.y - age * 34); g.fillText(p.text, p.x, p.y - age * 34); g.globalAlpha = 1;
      }
      g.font = "12px sans-serif"; g.fillStyle = "#1b2240"; g.fillText("Arrow keys or WASD, or click the map, to walk · E to interact", W / 2, H - 10);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener("keydown", down); removeEventListener("keyup", up); c.removeEventListener("pointerdown", click); };
  }, [getWorld]);

  return <canvas ref={cv} width={W} height={H} aria-label="Market town map. Walk to a stall, field or mill." className="w-full touch-none rounded-lg border-2 border-[#1d2b64]" />;
}