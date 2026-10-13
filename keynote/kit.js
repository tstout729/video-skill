// Shared helpers for every scene of "Video Skill: the keynote film". Scenes import only from here,
// so the look and the motion vocabulary stay one system. Everything is a pure function of t.
// The film is cut to the music, not to a narrator: every time is a bar or a beat (brief.md → TIME).
export * from "/_skill/runtime/motion.js";
import { springStep, clamp, lerp } from "/_skill/runtime/motion.js";

export const W = 1080, H = 1350;
// Frame zones (brief.md → FRAME). Content stays inside STAGE; the bottom 95 px stay empty for the
// feed's buttons and progress bar.
export const STAGE = { x0: 54, x1: 1026, y0: 96, y1: 1255 };
export const C = {
  black: "#000000",        // the keynote stage
  studio: "#0b0b0c",       // the 3D studio's floor color, so cuts to and from it match
  white: "#f5f5f7",        // text on black (19.8:1), and the light scenes' background
  ink: "#1d1d1f",          // text on white (15.9:1)
  muted: "#6e6e73",        // secondary text on white (4.7:1)
  mutedDark: "#a1a1a6",    // secondary text on black (8.2:1)
  dim: "#48484a",          // words not yet spoken, on black (decorative: never the only copy of a text)
  saffron: "#f2b544", orange: "#ee7a3a", clay: "#e2553a",   // the one gradient, on display type only
  mint: "#7fd1a8",         // pass, on black (11.9:1)
  green: "#1a6b45",        // pass, on white (6.1:1)
  line: "rgba(245, 245, 247, 0.12)",
};

// ---------- the beat grid ----------
// music/beats.js (bed.py) sets window.BEATS; the fallback is the same grid.
const B = () => window.BEATS ?? { bpm: 124, first: 0 };
export const BPM = () => B().bpm;
export const SPB = () => 60 / B().bpm;                           // seconds per beat (0.4839 at 124)
export const beatT = (n) => B().first + (n * 60) / B().bpm;      // computed from n, never summed
export const barT = (bar, beat = 0) => beatT(4 * bar + beat);    // bar 0 starts at t = 0
export const FPS = 60;
export const frameOf = (t) => Math.round(t * FPS);

// ---------- the shots ----------
// One scene module per shot (scenes/sNN.js). `from` and `to` are bars. `out` is the handoff into the
// next shot. A transition is centered on the bar line: the new shot takes over on the downbeat.
export const SHOTS = [
  { id: "s01", name: "Introducing",  from: 0,  to: 4,  out: { kind: "cut" } },
  { id: "s02", name: "Every frame",  from: 4,  to: 6,  out: { kind: "zoom-through", dur: 0.8 } },
  { id: "s03", name: "Walkthroughs", from: 6,  to: 8,  out: { kind: "whip", dir: "left", dur: 0.6 } },
  { id: "s04", name: "Diagrams",     from: 8,  to: 9,  out: { kind: "cut" } },
  { id: "s05", name: "3D",           from: 9,  to: 10, out: { kind: "whip", dir: "up", dur: 0.6 } },
  { id: "s06", name: "Loops",        from: 10, to: 11, out: { kind: "cut" } },
  { id: "s07", name: "Any style",    from: 11, to: 13, out: { kind: "cut" } },
  { id: "s08", name: "Any frame",    from: 13, to: 15, out: { kind: "dissolve", dur: 0.8 } },
  { id: "s09", name: "Voice",        from: 15, to: 18, out: { kind: "cut" } },
  { id: "s10", name: "Review",       from: 18, to: 21, out: { kind: "cut" } },
  { id: "s11", name: "Checks",       from: 21, to: 23, out: { kind: "zoom-through", dur: 0.8 } },
  { id: "s12", name: "Everything",   from: 23, to: 25, out: { kind: "cut" } },
  { id: "s13", name: "Get it",       from: 25, to: 28.5, out: null },
];
export const DURATION = () => barT(28.5);   // 55.16 s at 124 BPM; the music rings out under the end card
const HANDOFF_AT = { cut: 0, dissolve: 0.5, push: 0.5, "zoom-through": 0.5, whip: 0.5, wipe: 0.5, "light-leak": 0.5, morph: 0.475 };

// The handoffs between shots, in order, with absolute times.
export function handoffs() {
  return SHOTS.slice(0, -1).map((s) => {
    const dur = s.out.dur ?? 0;
    const at = barT(s.to) - dur * (HANDOFF_AT[s.out.kind] ?? 0.5);
    return { ...s.out, dur, at: +at.toFixed(4) };
  });
}

// A shot's window, in seconds:
//   start, end    its bars (the downbeat it takes over on, and the downbeat the next one does);
//   cutIn         the first moment it is on screen (the start of the handoff into it, or 0);
//   inEnd         when that handoff is over and the shot is alone on screen;
//   outStart      when the handoff out of it starts (it is alone on screen until then);
//   cutOut        the last moment it is on screen (the end of that handoff, or the film's end);
//   inKind, outKind  the handoffs' kinds.
// Be fully composed at cutIn: during a transition the shot is already on screen.
export function shotWindow(id) {
  const i = SHOTS.findIndex((s) => s.id === id), hs = handoffs();
  const s = SHOTS[i];
  const hin = i > 0 ? hs[i - 1] : null, hout = i < SHOTS.length - 1 ? hs[i] : null;
  return {
    id, name: s.name, from: s.from, to: s.to, start: barT(s.from), end: hout ? barT(s.to) : DURATION(),
    cutIn: hin ? hin.at : 0, inEnd: hin ? hin.at + hin.dur : 0,
    outStart: hout ? hout.at : DURATION(), cutOut: hout ? hout.at + hout.dur : DURATION(),
    inKind: hin?.kind ?? null, outKind: hout?.kind ?? null,
  };
}

// ---------- easing and springs ----------

export const p01 = (t, t0, dur) => clamp((t - t0) / dur, 0, 1);
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);          // entrances
export const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));   // type reveals: fast, then a long settle
export const easeIn = (p) => p * p * p;                          // exits
export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);  // moves across
// 0 -> 1 on a spring starting at t0. damping is the damping ratio (1 no bounce, 0.8 premium).
export const spring01 = (t, t0, { duration = 0.6, damping = 0.82 } = {}) =>
  t <= t0 ? 0 : springStep(t - t0, { duration, bounce: 1 - damping });

// A slow push that keeps a hold alive: scale 1 -> 1 + amount, linear over [t0, t1] (the camera's
// steady drift; linear is allowed for a steady process). Keep amount at 0.02–0.05.
export const drift = (t, t0, t1, amount = 0.03) => 1 + amount * clamp((t - t0) / (t1 - t0), 0, 1);

// A hit on the beat: a quick scale of `amount` that peaks `at` and is gone 6 frames later. It rises
// over 2 frames, so the peak lands on the beat. Use it on the shot's hero once, never on every beat.
export function punch(t, at, amount = 0.04) {
  const up = 2 / FPS, down = 6 / FPS;
  if (t < at - up || t > at + down) return 1;
  const p = t < at ? (t - (at - up)) / up : 1 - (t - at) / down;
  return 1 + amount * easeOut(clamp(p, 0, 1));
}

// ---------- DOM ----------

export function make(tag, cls = "", html = "", parent = null, css = {}) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  Object.assign(el.style, css);
  if (parent) parent.appendChild(el);
  return el;
}

const px = (v) => `${v.toFixed(2)}px`;

// Place an element at absolute stage coordinates.
export function place(el, x, y, w = null, h = null) {
  Object.assign(el.style, { position: "absolute", left: `${x}px`, top: `${y}px` },
    w !== null ? { width: `${w}px` } : {}, h !== null ? { height: `${h}px` } : {});
  return el;
}

// The standard entrance: ease-out over `dur`, from a small offset (dy, dx), scale and/or blur.
// The standard exit: ease-in, 40% shorter than the entrance. Opacity never bounces.
// Use t1 = Infinity for no exit. Returns the visible amount 0..1. It is 0 on its start frame.
export function show(el, t, t0, t1 = Infinity, { dur = 0.5, dy = 18, dx = 0, scale = 1, blur = 0, ease = easeOut } = {}) {
  const a = ease(p01(t, t0, dur));
  const b = Number.isFinite(t1) ? easeIn(p01(t, t1, dur * 0.6)) : 0;
  const v = a * (1 - b);
  el.style.opacity = v.toFixed(4);
  const off = 1 - a + b;
  el.style.transform = `translate(${px(dx * off)}, ${px(dy * off)}) scale(${(scale + (1 - scale) * (1 - off)).toFixed(4)})`;
  if (blur) el.style.filter = off > 0.005 ? `blur(${(blur * off).toFixed(2)}px)` : "none";
  el.style.visibility = v < 0.001 ? "hidden" : "visible";
  return v;
}

// The keynote type reveal: in from 14 px of blur and 6% larger, settling with an expo ease-out over
// 0.6 s (the first 40% of the move happens in the first 4 frames: it lands on the beat, then settles).
// Exit: blur out in 0.24 s. Use for display type.
export const reveal = (el, t, t0, t1 = Infinity, o = {}) =>
  show(el, t, t0, t1, { dur: 0.6, dy: 0, scale: 1.06, blur: 14, ease: easeOutExpo, ...o });

// Split `text` into word spans inside `parent` (keeps the parent's type styles). Returns the spans.
// Reveal them with stagger(): words 80 ms apart, each with reveal().
export function words(parent, text) {
  parent.textContent = "";
  return text.split(/(\s+)/).filter((s) => s.length).map((w) =>
    /^\s+$/.test(w) ? (parent.appendChild(document.createTextNode(w)), null) : make("span", "word", w, parent))
    .filter(Boolean);
}
export function stagger(spans, t, t0, t1 = Infinity, { gap = 0.08, ...o } = {}) {
  spans.forEach((s, i) => { s.style.display = "inline-block"; reveal(s, t, t0 + i * gap, t1, o); });
}

// Type text on by time: `cps` characters a second from t0, with a caret while typing.
export function typeOn(el, text, t, t0, cps = 28, caret = true) {
  const n = clamp(Math.floor((t - t0) * cps), 0, text.length);
  const typing = t >= t0 && n < text.length;
  el.textContent = text.slice(0, n) + (caret && typing ? "▍" : "");
  return n / text.length;
}

// Count a number from `from` to `to` between t0 and t1 (ease-out), formatted by fmt.
export function countTo(el, t, t0, t1, from, to, fmt = (v) => Math.round(v).toString()) {
  el.textContent = fmt(lerp(from, to, easeOut(p01(t, t0, t1 - t0))));
}

// A rounded window that holds a clip or a picture: radius 36 and a 1 px hairline.
// Returns { el, img } where img is an <img> sized to fill it (for frames()).
export function clipWindow(parent, x, y, w, h, light = false) {
  const el = place(make("div", `clipwin${light ? " light" : ""}`, "", parent), x, y, w, h);
  const img = make("img", "", "", el);
  return { el, img };
}

// ---------- plots ----------

// An SVG plot at (x, y) of size w x h. curve(fn) draws fn over [x0, x1] into [y0, y1] and returns
// a setter for how much of it is drawn (0..1). Lines draw on with stroke-dash, never all at once.
export function plot(parent, { x, y, w, h, x0 = 0, x1 = 1, y0 = 0, y1 = 1, axes = true }) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "plot");
  svg.setAttribute("width", w); svg.setAttribute("height", h);
  Object.assign(svg.style, { left: `${x}px`, top: `${y}px` });
  parent.appendChild(svg);
  const sx = (v) => ((v - x0) / (x1 - x0)) * w;
  const sy = (v) => h - ((v - y0) / (y1 - y0)) * h;
  if (axes) {
    const ax = document.createElementNS(svg.namespaceURI, "path");
    ax.setAttribute("class", "axis"); ax.setAttribute("d", `M0 0 V${h} H${w}`);
    svg.appendChild(ax);
  }
  return {
    svg, sx, sy,
    curve(fn, { cls = "curve", samples = 240, color = null, width = null } = {}) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      let d = "";
      for (let i = 0; i <= samples; i++) {
        const xv = x0 + ((x1 - x0) * i) / samples;
        d += `${i ? "L" : "M"}${sx(xv).toFixed(2)} ${sy(fn(xv)).toFixed(2)}`;
      }
      path.setAttribute("d", d);
      path.setAttribute("class", cls);
      if (color) path.style.stroke = color;
      if (width) path.style.strokeWidth = width;
      svg.appendChild(path);
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len} ${len}`;
      return (p) => { path.style.strokeDashoffset = (len * (1 - clamp(p, 0, 1))).toFixed(2); path.style.opacity = p > 0 ? 1 : 0; };
    },
  };
}
