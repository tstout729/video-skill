// Shared helpers for every scene of "Motion Lab, explained". Scenes import only from here,
// so the look and the motion vocabulary stay one system. Everything is a pure function of t.
export * from "/_skill/runtime/motion.js";
import { springStep, clamp, lerp } from "/_skill/runtime/motion.js";

export const W = 1080, STAGE_H = 992;
export const C = {
  canvas: "#ecebe7", paper: "#ffffff", ink: "#1c1c1a", muted: "#6b6a66", faint: "#a8a6a0",
  line: "#d8d6d0", accent: "#2f55e0", accentSoft: "#e3e9fc", red: "#d7263d", green: "#1f8a5b", night: "#12131f",
};

// ---------- timing ----------

const norm = (w) => w.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const beatT = (n) => (window.BEATS?.first ?? 0) + (n * 60) / (window.BEATS?.bpm ?? 120);
export const nearestBeat = (t) => beatT(Math.round((t - (window.BEATS?.first ?? 0)) * (window.BEATS?.bpm ?? 120) / 60));

// A scene's window: when its narration starts and ends, and the cuts into and out of it
// (on the beat nearest the middle of each gap, so cuts land on the music).
export function sceneWindow(id) {
  const ids = Object.keys(window.SCENES);
  const i = ids.indexOf(id);
  const s = window.SCENES[id];
  const prev = i > 0 ? window.SCENES[ids[i - 1]] : null;
  const next = i < ids.length - 1 ? window.SCENES[ids[i + 1]] : null;
  const cutIn = prev ? clamp(nearestBeat((prev.end + s.start) / 2), prev.end, s.start) : 0;
  const cutOut = next ? clamp(nearestBeat((s.end + next.start) / 2), s.end, next.start) : window.NARRATION.duration;
  return { id, start: s.start, end: s.end, cutIn, cutOut };
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
