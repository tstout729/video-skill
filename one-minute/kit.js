// Shared helpers for every scene of "The video skill, in one minute". Scenes import only from here,
// so the look and the motion vocabulary stay one system. Everything is a pure function of t.
// Adapted from motion-lab/kit.js; sceneWindow() here knows the film's transitions.
export * from "/_skill/runtime/motion.js";
import { springStep, clamp, lerp } from "/_skill/runtime/motion.js";

export const W = 1080, H = 1350;
// Frame zones (brief.md → FRAME). Content stays inside STAGE; the caption band is for captions only.
export const STAGE = { x0: 54, x1: 1026, y0: 140, y1: 1100 };
export const C = {
  canvas: "#ecebe7", paper: "#ffffff", ink: "#161513", sand: "#e6ddcc", pine: "#265746",
  muted: "#5c5953",        // secondary text on canvas, sand and paper (5.8:1 on canvas)
  mutedDark: "#c9c4ba",    // secondary text on ink and pine (10.5:1 on ink, 4.8:1 on pine)
  saffron: "#e8a33d",      // the accent on ink (8.5:1); on pine use mint
  clay: "#9e3d27",         // the accent on light scenes (5.6:1 on canvas, 4.9:1 on sand)
  green: "#1a6b45", mint: "#7fd1a8", red: "#c63b2f", line: "#d6d2ca",   // pass: green on light (5.4:1), mint on ink and pine
};
// Each scene's background and whether its text is light.
export const SCENE_BG = { canvas: [C.canvas, false], ink: [C.ink, true], sand: [C.sand, false], pine: [C.pine, true] };

// ---------- timing ----------

const norm = (w) => w.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const beatT = (n) => (window.BEATS?.first ?? 0) + (n * 60) / (window.BEATS?.bpm ?? 120);
export const nearestBeat = (t) => beatT(Math.round((t - (window.BEATS?.first ?? 0)) * (window.BEATS?.bpm ?? 120) / 60));

// The handoffs between scenes, in order: s01→s02, s02→s03, ... (brief.md → SHOTS).
// dur 0 is a hard cut. Defaults from references/transitions.md, teaser column.
export const HANDOFFS = [
  { kind: "cut" },
  { kind: "push", dir: "up", dur: 0.9 },
  { kind: "cut" },
  { kind: "wipe", shape: "linear", dir: "left", dur: 0.9 },
  { kind: "zoom-through", dur: 0.8 },
  { kind: "light-leak", dir: "right", dur: 1.0 },
];

// When each handoff starts. A cut lands on the beat nearest the middle of the gap. A transition
// starts in the silence after the outgoing narration and ends before the next scene's first word.
export function handoffs() {
  const ids = Object.keys(window.SCENES);
  return ids.slice(1).map((id, i) => {
    const prev = window.SCENES[ids[i]], next = window.SCENES[id];
    const spec = { ...HANDOFFS[i], dur: HANDOFFS[i].dur ?? 0 };
    const lo = prev.end + 0.05, hi = Math.max(lo, next.start - spec.dur - 0.05);
    const target = spec.dur ? lo : (prev.end + next.start) / 2;
    return { ...spec, at: +clamp(nearestBeat(target), lo, hi).toFixed(3) };
  });
}

// A scene's window:
//   start, end    its narration;
//   cutIn         the first moment it is on screen (the start of the handoff into it, or 0);
//   inEnd         when that handoff is over and the scene is alone on screen;
//   outStart      when the handoff out of it starts (it is alone on screen until then);
//   cutOut        the last moment it is on screen (the end of that handoff, or the film's end);
//   inKind, outKind  the handoffs' kinds.
// Be fully composed at cutIn: during a transition the scene is already on screen.
export function sceneWindow(id) {
  const ids = Object.keys(window.SCENES);
  const i = ids.indexOf(id), hs = handoffs();
  const s = window.SCENES[id];
  const hin = i > 0 ? hs[i - 1] : null, hout = i < ids.length - 1 ? hs[i] : null;
  return {
    id, start: s.start, end: s.end,
    cutIn: hin ? hin.at : 0, inEnd: hin ? hin.at + hin.dur : 0,
    outStart: hout ? hout.at : window.NARRATION.duration, cutOut: hout ? hout.at + hout.dur : window.NARRATION.duration,
    inKind: hin?.kind ?? null, outKind: hout?.kind ?? null,
  };
}

// Time just before the narrator says `phrase` inside scene `id` (the nth time, from 1).
// Searches only that scene's words, so scenes never disturb each other's cues. Throws if missing.
export function cueIn(id, phrase, nth = 1, lead = 0.12) {
  const { start, end } = window.SCENES[id];
  const words = window.WORDS.filter((w) => w.start >= start - 0.01 && w.start <= end + 0.01);
  const target = phrase.split(/[\s-]+/).map(norm).filter(Boolean);
  const tokens = [];
  words.forEach((w, i) => w.word.split(/-+/).forEach((p) => norm(p) && tokens.push([norm(p), i])));
  let seen = 0;
  for (let k = 0; k + target.length <= tokens.length; k++) {
    if (target.every((w, j) => tokens[k + j][0] === w) && ++seen === nth) {
      const t = words[tokens[k][1]].start - lead;
      (window.CUE_TIMES ||= []).push({ phrase, t });
      return t;
    }
  }
  throw new Error(`cue ${JSON.stringify(phrase)} (#${nth}) not found in ${id}`);
}

// ---------- easing and springs ----------

export const p01 = (t, t0, dur) => clamp((t - t0) / dur, 0, 1);
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);       // entrances
export const easeIn = (p) => p * p * p;                       // exits
export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);  // moves across
// 0 -> 1 on a spring starting at t0. damping is the damping ratio (1 no bounce, 0.8 premium).
export const spring01 = (t, t0, { duration = 0.6, damping = 0.82 } = {}) =>
  t <= t0 ? 0 : springStep(t - t0, { duration, bounce: 1 - damping });

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

// The standard entrance: ease-out over `dur`, from a small offset (dy, dx) and/or scale.
// The standard exit: ease-in, 40% shorter than the entrance. Opacity never bounces.
// Use t1 = Infinity for no exit. Returns the visible amount 0..1. It is 0 on its start frame, so a
// sound for a show() entrance belongs about 2 frames after t0.
export function show(el, t, t0, t1 = Infinity, { dur = 0.5, dy = 18, dx = 0, scale = 1, blur = 0 } = {}) {
  const a = easeOut(p01(t, t0, dur));
  const b = Number.isFinite(t1) ? easeIn(p01(t, t1, dur * 0.6)) : 0;
  const v = a * (1 - b);
  el.style.opacity = v.toFixed(4);
  const off = 1 - a + b;
  el.style.transform = `translate(${px(dx * off)}, ${px(dy * off)}) scale(${(scale + (1 - scale) * (1 - off)).toFixed(4)})`;
  if (blur) el.style.filter = off > 0.01 ? `blur(${(blur * off).toFixed(2)}px)` : "none";
  el.style.visibility = v < 0.001 ? "hidden" : "visible";
  return v;
}

// Place an element at absolute stage coordinates.
export function place(el, x, y, w = null, h = null) {
  Object.assign(el.style, { position: "absolute", left: `${x}px`, top: `${y}px` },
    w !== null ? { width: `${w}px` } : {}, h !== null ? { height: `${h}px` } : {});
  return el;
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

// A frame note: "f312 · lands 2 frames late". tone: "red" (note), "green" (fixed), "accent".
export function note(parent, frame, text, tone = "red") {
  return make("div", `chip ${tone}`, `<span class="mono">f${frame}</span><span>${text}</span>`, parent);
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
  const api = {
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
    text(str, xv, yv, anchor = "start") {
      const el = document.createElementNS(svg.namespaceURI, "text");
      el.textContent = str; el.setAttribute("x", sx(xv)); el.setAttribute("y", sy(yv)); el.setAttribute("text-anchor", anchor);
      svg.appendChild(el);
      return el;
    },
  };
  return api;
}

// ---------- chrome ----------

// The chrome every scene carries at y 68–110: "VIDEO SKILL" on the left, "0N / 07 · NAME" on the
// right, in Geist Mono 28 px. dark: the scene's background is dark (ink, pine).
export function chrome(root, n, name, dark = false) {
  const el = make("div", `chrome${dark ? " dark" : ""}`, "", root);
  make("span", "", "VIDEO SKILL", el);
  make("span", "", `0${n} / 07 · ${name}`, el);
  return el;
}

// A rounded window that holds a clip or a picture: radius 28 and a 1.5 px hairline.
// Returns { el, img } where img is an <img> sized to fill it (for frames()).
export function clipWindow(parent, x, y, w, h, dark = false) {
  const el = place(make("div", `clipwin${dark ? " dark" : ""}`, "", parent), x, y, w, h);
  const img = make("img", "", "", el);
  return { el, img };
}
