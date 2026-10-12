// s04 Experiment 1. Two stacked panes (1080 x 460 each) with the labels in the band between them.
// Top: hero3d "default", the generic AI look on purpose (navy space, halo ring, particles, spin),
// labelled "3 adjectives". As the narrator lists the defaults, each gets a red callout pinned to it,
// 250 ms after its word. Bottom: hero3d "directed", labelled "450 words". Hero move: on "direction"
// the bottom mark hops (touchdown f36, settled at HOP.settle) and the top pane dims to 40%.
import * as THREE from "/_vendor/three/build/three.module.js";
import { createHero, HOP } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, show, swap, style, cueIn, easeOut, p01, spring01, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, PW = 1080, PH = 460, BAND = 72, BOTTOM_Y = PH + BAND;

  const word = (phrase) => cueIn(k.id, phrase, 1, 0);     // the word's own start
  const tSame = [cueIn(k.id, "same model"), cueIn(k.id, "same earbuds"), cueIn(k.id, "same six second loop")];
  const tRunA = cueIn(k.id, "one run");
  const tRunB = cueIn(k.id, "other run");
  const PIN_LAG = 0.25;                                    // each callout 250 ms after its word
  const tPins = [word("navy space"), word("a glowing ring"), word("particles"), word("a spin")].map((t) => t + PIN_LAG);
  // The touchdown (the picture hit, f36) lands on "direction"; the jump itself rides "words of".
  const tHop = word("direction") - HOP.contact / FPS;
  const touchdown = tHop + HOP.contact / FPS;
  const settled = tHop + HOP.settle / FPS;

  // ---- the two panes ----
  const topWrap = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: `${PW}px`, height: `${PH}px`, overflow: "hidden" });
  const topCanvas = make("canvas", "", "", topWrap, { position: "absolute", left: "0px", top: "0px" });
  const top = createHero(topCanvas, { variant: "default", width: PW, height: PH, seed: 7 });
  const callouts = make("div", "", "", topWrap, { position: "absolute", inset: "0px" });

  const bottomCanvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: `${BOTTOM_Y}px` });
  const bottom = createHero(bottomCanvas, { variant: "directed", width: PW, height: PH, seed: 7, framing: { fill: 0.413 } });
  const hopState = { hop: tHop };

  // ---- the band between them ----
  const bandY = PH + (BAND - 54) / 2;
  const same = place(make("div", "", "", root, { fontSize: "30px", fontWeight: "560", whiteSpace: "nowrap", height: "54px", display: "flex", alignItems: "center" }), 40, bandY);
  const sameParts = ["same model", " · same subject", " · same 6-second loop"].map((txt, i) => {
    const s = make("span", "", "", same, { whiteSpace: "pre" });
    const [dot, rest] = i ? [" · ", txt.slice(3)] : ["", txt];
    if (dot) make("span", "", dot, s, { color: C.faint });
    make("span", "", rest, s);
    return s;
  });
  const chevron = (dir, color) => `<svg width="22" height="22" viewBox="0 0 22 22"><path d="${dir === "up" ? "M4 14 L11 7 L18 14" : "M4 8 L11 15 L18 8"}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const pill = (html, css) => make("div", "", html, root, {
    position: "absolute", top: `${bandY}px`, height: "54px", display: "flex", alignItems: "center", gap: "12px",
    padding: "0 24px 0 18px", borderRadius: "27px", fontSize: "30px", fontWeight: "620", whiteSpace: "nowrap", ...css,
  });
  const labelA = pill(`${chevron("up", "#e9e7f5")}<span>3 adjectives</span>`, { left: "40px", background: C.night, color: "#e9e7f5" });
  const labelB = pill(`<span>450 words</span>${chevron("down", C.ink)}`, { right: "40px", background: C.paper, color: C.ink, padding: "0 18px 0 24px", boxShadow: "0 1px 0 #d8d6d0 inset, 0 8px 24px rgba(28,28,26,0.08)" });

  // ---- callouts on the top pane: a target dot, a leader and a red chip ----
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", PW); svg.setAttribute("height", PH);
  Object.assign(svg.style, { position: "absolute", left: "0px", top: "0px", overflow: "visible" });
  callouts.appendChild(svg);
  const PINK = "#fde8eb";
  // [text, chip x, chip y, target x, target y, leader starts at the chip's ...]
  const PINS = [
    ["navy space", 40, 34, 232, 150],
    ["glowing ring", 40, 372, 362, 300],
    ["particles", 828, 34, 900, 200],
    ["spin", 828, 372, 548, 300],      // on the spin axis: the slab covers it at every angle
  ];
  const pins = PINS.map(([txt, cx, cy, tx, ty]) => {
    const chip = place(make("div", "chip red", txt, callouts, { fontSize: "30px", padding: "10px 22px" }), cx, cy);
    const line = document.createElementNS(svg.namespaceURI, "line");
    Object.entries({ x1: tx, y1: ty, stroke: PINK, "stroke-width": 2.5, "stroke-linecap": "round" }).forEach(([a, v]) => line.setAttribute(a, v));
    const dot = document.createElementNS(svg.namespaceURI, "circle");
    Object.entries({ cx: tx, cy: ty, r: 9, fill: C.red, stroke: PINK, "stroke-width": 2.5 }).forEach(([a, v]) => dot.setAttribute(a, v));
    svg.append(line, dot);
    return { chip, line, dot, tx, ty };
  });

  // An invisible box that follows the bottom mark: the speed graph samples it, checks use it.
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.dataset.track = "s04-mark";
  const v = new THREE.Vector3();

  sfx(touchdown + 1 / FPS, "tap");           // the landing, one frame after its picture

  // Leader endpoints need the chips' laid-out sizes: measure once fonts are ready.
  await document.fonts.ready;
  for (const p of pins) {
    const w = p.chip.offsetWidth, h = p.chip.offsetHeight, x = p.chip.offsetLeft, y = p.chip.offsetTop;
    // From the chip edge nearest the target.
    p.x2 = Math.max(x + 18, Math.min(x + w - 18, p.tx));
    p.y2 = p.ty < y ? y : y + h;
    if (p.tx > x + w) { p.x2 = x + w; p.y2 = y + h / 2; }
    if (p.tx < x) { p.x2 = x; p.y2 = y + h / 2; }
    p.len = Math.hypot(p.x2 - p.tx, p.y2 - p.ty);
  }

  // ---- checks ----
  const DIM = 0.6;                            // the top pane ends at 40% brightness
  const dimAt = (t) => easeOut(p01(t, tHop, 0.4));
  check("s04 callouts start 250 ms after their words", cutIn, () =>
    ["navy space", "a glowing ring", "particles", "a spin"].every((w, i) => Math.abs(tPins[i] - word(w) - 0.25) < 1e-9) || "lag");
  check("s04 mark settled by hop + f" + HOP.settle, settled, () => {
    const p = bottom.pose(settled, hopState);
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(2)}`;
  });
  check("s04 top pane at 40% once the hop starts", [tHop + 0.4, cutOut - 1 / FPS], () => {
    const m = /brightness\(([\d.]+)\)/.exec(callouts.style.filter);
    return (m && Math.abs(Number(m[1]) - 0.4) < 0.005) || `filter ${callouts.style.filter}`;
  });
  check("s04 top pane at full brightness before the hop", [cutIn, tHop - 1 / FPS], () => callouts.style.filter === "none" || callouts.style.filter);
  check("s04 callouts clear each other and stay in the top pane", [tPins[3] + 0.6, cutOut - 1 / FPS], () => {
    const chips = pins.map((p) => p.chip);
    for (let i = 0; i < chips.length; i++) {
      const b = box(chips[i]);
      if (b.x < 0 || b.x + b.w > PW || b.y < 128 || b.y + b.h > 128 + PH) return `chip ${i} outside the pane`;
      for (let j = i + 1; j < chips.length; j++) if (overlap(chips[i], chips[j]) > 0) return `chips ${i} and ${j} overlap`;
    }
    return true;
  });
  check("s04 band labels clear each other and stay in the band", [tRunB + 0.6, cutOut - 1 / FPS], () => {
    const a = box(labelA), b = box(labelB);
    return (overlap(labelA, labelB) === 0 && a.y >= 128 + PH && b.y + b.h <= 128 + BOTTOM_Y) || "labels";
  });
  check("s04 touchdown lands on “direction” and settles before the cut", cutOut - 1 / FPS, () =>
    (Math.abs(touchdown - word("direction")) < 1 / FPS && cutOut - settled >= 0.5) || `touchdown ${touchdown.toFixed(3)} settled ${settled.toFixed(3)} cut ${cutOut}`);
  check("s04 mark stays inside the bottom pane", [tHop, settled], () => {
    const b = box(tracker);
    return (b.y >= 128 + BOTTOM_Y && b.y + b.h <= 128 + BOTTOM_Y + PH) || `mark y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
  });

  return (t) => {
    const d = dimAt(t);
    top.render(t, { dim: (DIM * d) / 0.62 });   // hero3d darkens by 0.62 x dim
    callouts.style.filter = d > 0 ? `brightness(${(1 - DIM * d).toFixed(4)})` : "none";
    bottom.render(t, hopState);

    // Tracker: the bottom mark's on-screen box.
    const p = bottom.pose(t, hopState);
    v.set(p.x, p.y + 0.5 * p.sy, 0).project(bottom.camera);
    const x = (v.x * 0.5 + 0.5) * PW, y = BOTTOM_Y + (0.5 - v.y * 0.5) * PH;
    const hpx = 190 * p.sy, wpx = 180 * p.sxz;
    Object.assign(tracker.style, { left: `${(x - wpx / 2).toFixed(2)}px`, top: `${(y - hpx / 2).toFixed(2)}px`, width: `${wpx.toFixed(2)}px`, height: `${hpx.toFixed(2)}px` });

    // Band: "same model · same subject · same 6-second loop" builds on its three cues, then gives
    // way to the two labels, each on its "run".
    const out = swap(t, tRunA, { exit: 0.2, gap: 0.06, enter: 0.4 });
    sameParts.forEach((s, i) => show(s, t, tSame[i], Infinity, { dur: 0.4, dy: 0, dx: -12 }));
    style(same, out.out);
    same.style.visibility = out.out.opacity < 0.001 ? "hidden" : "visible";
    show(labelA, t, tRunA + 0.26, Infinity, { dur: 0.5, dy: -10 });
    labelA.style.opacity = (Number(labelA.style.opacity) * (1 - 0.5 * d)).toFixed(4);   // dims with its pane
    show(labelB, t, tRunB, Infinity, { dur: 0.5, dy: 10 });

    // Callouts: the dot pops (ζ 0.82), the leader draws from it, then the chip arrives.
    for (const [i, pn] of pins.entries()) {
      const t0 = tPins[i];
      const s = spring01(t, t0, { duration: 0.4, damping: 0.82 });
      pn.dot.setAttribute("r", (9 * s).toFixed(3));
      pn.dot.style.opacity = t > t0 ? "1" : "0";
      const q = easeOut(p01(t, t0 + 0.06, 0.3));
      pn.line.setAttribute("x2", (pn.tx + (pn.x2 - pn.tx) * q).toFixed(2));
      pn.line.setAttribute("y2", (pn.ty + (pn.y2 - pn.ty) * q).toFixed(2));
      pn.line.style.opacity = q > 0 ? "1" : "0";
      show(pn.chip, t, t0 + 0.12, Infinity, { dur: 0.4, dy: 0, scale: 0.94 });
    }
  };
}
