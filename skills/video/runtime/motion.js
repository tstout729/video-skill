// motion.js: time-pure animation helpers for the video skill's HTML pages.
//
// Every value is a function of time alone. A page builds its tracks once at load,
// then window.seek(t) reads them. No CSS transitions, timers, or state between frames,
// so any frame can be rendered in any order (the renderer splits work across pages).

// ---------- springs ----------

// Normalized step response of a damped spring: 0 at t<=0, settles at 1.
// `duration` is the perceptual length (seconds); `bounce` 0..0.3 is overshoot
// (0 = critically damped). `v0` is initial velocity in units of the step per second.
// `damping` is the damping ratio ζ, an alternative to bounce (bounce = 1 − ζ); it wins if both
// are given. ζ 1 = no bounce (bounce 0), 0.85–0.7 premium (0.15–0.3), 0.6–0.4 playful (0.4–0.6).
// ζ above 1 is treated as 1.
export function springStep(t, { duration = 0.5, bounce = 0.08, damping, v0 = 0 } = {}) {
  if (t <= 0) return 0;
  const w0 = (2 * Math.PI) / duration;
  const zeta = damping ?? (1 - bounce);
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const a = zeta * w0;
    return 1 - Math.exp(-a * t) * (Math.cos(wd * t) + ((a - v0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + (w0 - v0) * t);
}

export const SPRING = {
  snappy: { duration: 0.42, bounce: 0.06 },
  smooth: { duration: 0.6, bounce: 0.04 },
  gentle: { duration: 0.9, bounce: 0.02 },
  pop: { duration: 0.38, bounce: 0.14 },
  camera: { duration: 1.1, bounce: 0.0 },
};

// A numeric track. Each .to() adds one spring from the previous target to the new one,
// so the value stays a closed-form sum even when targets change mid-flight.
// .set() jumps instantly; .drag() follows a function of time directly, then later
// springs start from where the drag let go (with its release velocity).
export function track(initial) {
  const events = []; // sorted by time
  let target = initial;
  const api = (t) => valueAt(t);
  api.to = (t, value, spring = SPRING.snappy) => {
    add({ kind: "spring", t, from: target, to: value, spring });
    target = value;
    return api;
  };
  api.set = (t, value) => {
    add({ kind: "set", t, value });
    target = value;
    return api;
  };
  api.drag = (t0, t1, fn) => {
    add({ kind: "drag", t: t0, t1, fn });
    target = fn(t1);
    return api;
  };
  api.target = () => target;
  const add = (e) => { events.push(e); events.sort((a, b) => a.t - b.t); };
  function valueAt(t) {
    let base = initial;
    let baseT = -Infinity;
    let releaseV = 0;
    // The latest set/drag before t resets the sum.
    let start = 0;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.t > t) break;
      if (e.kind === "set") { base = e.value; baseT = e.t; releaseV = 0; start = i + 1; }
      if (e.kind === "drag") {
        if (t <= e.t1) return e.fn(t);
        base = e.fn(e.t1); baseT = e.t1;
        const h = 1 / 240;
        releaseV = (e.fn(e.t1) - e.fn(e.t1 - h)) / h;
        start = i + 1;
      }
    }
    let v = base;
    let first = true;
    let from = base;
    for (let i = start; i < events.length; i++) {
      const e = events[i];
      if (e.t > t) break;
      if (e.kind !== "spring") continue;
      const delta = e.to - from;
      // Carry a drag's release velocity into the first spring after it.
      const v0 = first && baseT > -Infinity && delta !== 0 ? releaseV / delta : 0;
      v += delta * springStep(t - e.t, { ...e.spring, v0 });
      from = e.to;
      first = false;
    }
    return v;
  }
  return api;
}

// ---------- easing & math ----------

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
// Infinite bounds mean "never starts" (0), so presence(t, on, Infinity) stays visible.
export const progress = (t, t0, t1) => (Number.isFinite(t0) ? clamp((t - t0) / (t1 - t0)) : 0);
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// Mix two hex colors ("#rrggbb") by p in 0..1.
export function mix(a, b, p) {
  const pa = hex(a), pb = hex(b);
  const c = pa.map((x, i) => Math.round(lerp(x, pb[i], clamp(p))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ---------- seeded randomness & loops ----------

// rand(seed) returns a generator of numbers in [0, 1), the same sequence on every run
// (mulberry32). The seed is a number or a string. Never use Math.random(). Draw values while
// building, not inside seek(): frames render out of order, so a shared generator would give
// each frame different numbers. Inside seek(), make a fresh rand(seed) per call instead.
export function rand(seed) {
  let a = Number.isInteger(seed) ? seed >>> 0 : hashString(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s) { // FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

// A loop of N frames renders frames 0..N-1; frame N is frame 0 again. Drive everything that
// repeats by phase(), with a whole number of cycles per loop (period = LOOP / n), so the last
// frame flows into the first. phase(t, period) is the fraction of the cycle, in [0, 1);
// it is exactly 0 at every multiple of the period.
export function phase(t, period) {
  const p = (t / period) % 1;
  return p < 0 ? (p + 1) % 1 : Math.abs(p); // abs turns -0 into 0
}

// Smooth noise in [-1, 1] that repeats exactly every `period` seconds: gradient noise sampled
// along a circle, so each cycle returns to where it started. One octave makes about two slow
// swells per period; each extra octave adds detail at twice the rate and half the size. Most
// values fall within ±0.7. Use a different seed for each axis or element.
const NOISE_RADIUS = 0.45; // circle radius in noise cells: larger is busier
export function loopNoise(t, period, seed, octaves = 2) {
  const field = noiseField(seed);
  const a = 2 * Math.PI * phase(t, period);
  const c = Math.cos(a), s = Math.sin(a);
  let sum = 0, total = 0, amp = 1, r = NOISE_RADIUS;
  for (let o = 0; o < octaves; o++) {
    const [cx, cy] = field.center(o); // each octave reads its own patch of the field
    sum += amp * gradNoise(field.perm, cx + r * c, cy + r * s);
    total += amp;
    amp /= 2;
    r *= 2;
  }
  // 2D gradient noise peaks at ±√½. tanh widens the typical swing smoothly and stays inside ±1.
  return Math.tanh(1.75 * (sum / total / Math.SQRT1_2));
}

const fields = new Map();
function noiseField(seed) {
  if (fields.has(seed)) return fields.get(seed);
  const next = rand(seed);
  const perm = Uint8Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  // Centers are drawn in octave order, after the permutation, so each is the same on every run.
  const centers = [];
  const center = (o) => {
    while (centers.length <= o) centers.push([8 + next() * 200, 8 + next() * 200]);
    return centers[o];
  };
  const field = { perm, center };
  fields.set(seed, field);
  return field;
}
const S = Math.SQRT1_2;
const GRAD = [[1, 0], [-1, 0], [0, 1], [0, -1], [S, S], [-S, S], [S, -S], [-S, -S]];
const fade = (x) => x * x * x * (x * (x * 6 - 15) + 10);
function gradNoise(perm, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const dot = (i, j) => {
    const g = GRAD[perm[(perm[(xi + i) & 255] + yi + j) & 255] & 7];
    return g[0] * (xf - i) + g[1] * (yf - j);
  };
  const u = fade(xf);
  return lerp(lerp(dot(0, 0), dot(1, 0), u), lerp(dot(0, 1), dot(1, 1), u), fade(yf));
}

// ---------- content swaps ----------

// A swap inside a morphing container. The old content exits first (fade + blur + slight
// drop), the new one enters a beat later, so the two never overlap legibly.
// Returns {out, in}, each {opacity, blur, y} to apply with style().
export function swap(t, at, { exit = 0.14, gap = 0.04, enter = 0.22, dist = 8 } = {}) {
  const po = progress(t, at, at + exit);
  const pi = easeOut(progress(t, at + exit + gap, at + exit + gap + enter));
  return {
    out: { opacity: 1 - po, blur: 6 * po, y: -dist * po },
    in: { opacity: pi, blur: 6 * (1 - pi), y: dist * (1 - pi) },
  };
}

// Opacity/blur/y for an element that enters at `on` and exits at `off`.
export function presence(t, on, off = Infinity, { enter = 0.22, exit = 0.14, dist = 8 } = {}) {
  const pi = easeOut(progress(t, on, on + enter));
  const po = progress(t, off, off + exit);
  return { opacity: pi * (1 - po), blur: 6 * (1 - pi) + 6 * po, y: dist * (1 - pi) - dist * po };
}

// ---------- DOM ----------

const cache = new Map();
export const $ = (sel) => {
  if (!cache.has(sel)) cache.set(sel, document.querySelector(sel));
  return cache.get(sel);
};

// Apply a look ({opacity, blur, y, x, scale}) plus any raw CSS properties.
export function style(el, look = {}, css = {}) {
  if (typeof el === "string") {
    const sel = el;
    el = $(sel);
    // Remember selectors that match nothing, such as "title" for "#title"; render.mjs lists them.
    if (!el) (window.STYLE_MISSING ||= new Set()).add(sel);
  }
  if (!el) return;
  const { opacity, blur, x = 0, y = 0, scale = 1 } = look;
  if (opacity !== undefined) el.style.opacity = opacity.toFixed(4);
  if (blur !== undefined) el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
  if (look.x !== undefined || look.y !== undefined || look.scale !== undefined) {
    el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
  }
  for (const [k, v] of Object.entries(css)) el.style[k] = typeof v === "number" ? `${v.toFixed(2)}px` : v;
}

// ---------- narration cues & beats ----------

// window.WORDS = [{word, start, end}] in global seconds (written by timeline.py).
// cue("phrase") returns the start of the next occurrence after the previous cue,
// like the explainer's play_at. Throws if missing, so typos fail loudly.
// Each cue is recorded in window.CUE_TIMES as {phrase, t}, so review tools and the
// ?debug=1 overlay can show which cue is active at a time.
window.CUE_TIMES = window.CUE_TIMES || [];
let cueCursor = 0;
// Accents are stripped, so a cue matches however the transcript spells it ("huésped" == "huesped").
// Letters and digits of any script, without case or accents.
const norm = (w) => w.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export function cue(phrase, lead = 0.12) {
  const words = window.WORDS || [];
  const target = phrase.split(/[\s-]+/).map(norm).filter(Boolean);
  if (!target.length) throw new Error(`cue ${JSON.stringify(phrase)} has no letters or digits`);
  const tokens = [];
  words.forEach((w, i) => w.word.split(/-+/).forEach((p) => norm(p) && tokens.push([norm(p), i])));
  for (let k = 0; k + target.length <= tokens.length; k++) {
    const idx = tokens[k][1];
    if (idx < cueCursor) continue;
    if (target.every((w, j) => tokens[k + j][0] === w)) {
      cueCursor = idx + 1;
      const t = words[idx].start - lead;
      window.CUE_TIMES.push({ phrase, t });
      return t;
    }
  }
  throw new Error(`cue ${JSON.stringify(phrase)} not found after word ${cueCursor}`);
}
// End time of the narration scene with this id (window.SCENES from timeline.py).
export const sceneStart = (id) => window.SCENES[id].start;
export const sceneEnd = (id) => window.SCENES[id].end;

// window.BEATS = {bpm, first, beats:[...]} from beats.py. beat(n) is the nth beat time.
export function beat(n) {
  const b = window.BEATS;
  return b.first + (n * 60) / b.bpm;
}

// ---------- burned-in captions ----------

// Feeds autoplay muted, so a narrated feed video burns its captions in. window.CAPTIONS
// (timeline.py) holds the .srt's own lines, [{start, end, text, words: [{word, start, end}]}]
// in global seconds; never re-break them here. captions(el, t) shows the line on screen at t,
// with the same timing as the .srt: from its first word until 0.25 s after its last word, or
// the next line's start. Lines fade in over 120 ms and out over 80 ms, without bounce.
// Each word is a .caption-word with .caption-past, .caption-active (being spoken) or
// .caption-upcoming. `variant` "pill" puts the line on a dark rounded pill; "shadow" is plain
// text with a shadow, for footage. The default CSS has zero specificity, so any page rule wins:
// set --caption-size, --caption-color, --caption-accent, --caption-bg, or position el yourself
// (default: bottom center, higher on a 9:16 frame to stay clear of the app's buttons).
export function captions(el, t, { lines = window.CAPTIONS || [], variant = "pill", hold = 0.25,
  fadeIn = 0.12, fadeOut = 0.08, rise = 6 } = {}) {
  if (typeof el === "string") el = $(el);
  if (!el) return;
  captionCSS();
  let s = captionState.get(el);
  if (!s) {
    s = { line: document.createElement("div"), index: -1, words: [] };
    s.line.className = "caption-line";
    el.replaceChildren(s.line);
    captionState.set(el, s);
  }
  el.classList.add("captions");
  el.classList.toggle("captions-pill", variant === "pill");
  el.classList.toggle("captions-shadow", variant === "shadow");

  // The latest line that has started, if it is still showing.
  let i = -1;
  while (i + 1 < lines.length && lines[i + 1].start <= t) i++;
  const line = lines[i];
  const until = !line ? -Infinity : i + 1 < lines.length ? Math.min(line.end + hold, lines[i + 1].start) : line.end + hold;
  if (!line || t >= until) {
    s.line.style.opacity = "0";
    return;
  }
  if (s.index !== i || !s.fit) {
    s.index = i;
    s.words = line.words.map((w) => Object.assign(document.createElement("span"), { textContent: w.word }));
    s.line.replaceChildren(...s.words.flatMap((w, k) => (k ? [" ", w] : [w])));
    // text-wrap: balance leaves the box at full width; shrink it to the widest row so a pill hugs
    // the text. Layout offsets ignore transforms, so a scaled parent does not change the result.
    s.line.style.width = "";
    const left = Math.min(...s.words.map((w) => w.offsetLeft));
    const right = Math.max(...s.words.map((w) => w.offsetLeft + w.offsetWidth));
    Object.assign(s.line.style, { boxSizing: "content-box", width: `${right - left + 1}px` });
    s.fit = document.fonts.status === "loaded"; // measure again once a loading font arrives
  }
  let active = -1;
  while (active + 1 < line.words.length && line.words[active + 1].start <= t) active++;
  s.words.forEach((w, k) => {
    w.className = `caption-word caption-${k < active ? "past" : k === active ? "active" : "upcoming"}`;
  });
  const pin = fadeIn > 0 ? easeOut(progress(t, line.start, line.start + fadeIn)) : 1;
  const pout = fadeOut > 0 ? progress(t, until - fadeOut, until) : 0;
  s.line.style.opacity = (pin * (1 - pout)).toFixed(4);
  s.line.style.transform = `translateY(${(rise * (1 - pin)).toFixed(2)}px)`;
}
const captionState = new WeakMap();
let captionStyled = false;
function captionCSS() {
  if (captionStyled) return;
  captionStyled = true;
  const css = document.createElement("style");
  css.textContent = `
:where(.captions) { position: absolute; left: 6%; right: 6%; bottom: 7%; z-index: 100; text-align: center;
  pointer-events: none; font-size: var(--caption-size, 4.4vmin); font-weight: 600; line-height: 1.24;
  letter-spacing: -0.01em; color: var(--caption-color, #fff); }
@media (max-aspect-ratio: 3/4) { :where(.captions) { bottom: 22%; } }
:where(.captions .caption-line) { display: inline-block; max-width: 100%; text-wrap: balance; }
:where(.captions-pill .caption-line) { padding: 0.26em 0.62em 0.32em; border-radius: 0.5em;
  background: var(--caption-bg, rgba(22, 22, 24, 0.86)); }
:where(.captions-shadow .caption-line) { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 2px 14px rgba(0, 0, 0, 0.45); }
:where(.captions .caption-active) { color: var(--caption-accent, #ffd23f); }`;
  document.head.prepend(css); // first in <head>, so the page's own rules come later and win
}

// ---------- sound effects ----------

// Declare UI sounds while building tracks. The renderer saves window.SFX and mux.py
// lines each sound's measured peak up with its time.
window.SFX = window.SFX || [];
export function sfx(t, kind, gain = 1) {
  window.SFX.push({ t, kind, gain });
  return t;
}

// ---------- touch / cursor ----------

// A pointer that travels between targets and presses on taps. Positions are in stage
// pixels. Call .tap(t, x, y) in time order; the pointer arrives just before t.
export function pointer(x0, y0, { travel = 0.5 } = {}) {
  const x = track(x0), y = track(y0), press = track(0), show = track(0);
  const api = {
    x, y, press, show,
    // Without a spring, the pointer travels on an arc: the axis that moves farther gets a
    // slightly faster spring, so the path bows. The slower axis keeps SPRING.smooth's timing.
    moveTo(t, nx, ny, spring) {
      if (spring) { x.to(t, nx, spring); y.to(t, ny, spring); return api; }
      const fast = { duration: 0.45, bounce: 0.02 };
      const wide = Math.abs(nx - x.target()) >= Math.abs(ny - y.target());
      x.to(t, nx, wide ? fast : SPRING.smooth);
      y.to(t, ny, wide ? SPRING.smooth : fast);
      return api;
    },
    tap(t, nx, ny, sound = "tap") {
      api.moveTo(t - travel, nx, ny);
      press.to(t - 0.06, 1, { duration: 0.12, bounce: 0 }).to(t + 0.08, 0, SPRING.snappy);
      if (sound) sfx(t, sound);
      return api;
    },
    // Hold down from t0 to t1 while following path(t) => [x, y].
    drag(t0, t1, path, sound = "tap") {
      api.moveTo(t0 - travel, ...path(t0));
      press.to(t0 - 0.06, 1, { duration: 0.12, bounce: 0 }).to(t1, 0, SPRING.snappy);
      x.drag(t0, t1, (t) => path(t)[0]);
      y.drag(t0, t1, (t) => path(t)[1]);
      if (sound) sfx(t0, sound);
      return api;
    },
    appear(t) { show.to(t, 1, SPRING.snappy); return api; },
    hide(t) { show.to(t, 0, SPRING.snappy); return api; },
  };
  return api;
}

// ---------- image-sequence clips ----------

// Playwright's Chromium cannot decode H.264, and a <video> cannot seek to an exact frame, so
// a clip plays from the JPEG sequence that scripts/clip.py writes (000001.jpg..., clip.json).
// frames(img, {dir, fps, count}) returns show(t): it puts the frame for clip time t (clamped
// to the clip) into img and resolves once it is decoded. Return its promise from seek:
//   const clip = frames($("#clip"), { dir: "clip", ...(await (await fetch("clip/clip.json")).json()) });
//   window.seek = (t) => { ...; return clip(t - 4); };   // the clip starts at 4 s
export function frames(img, { dir, fps, count, ext = "jpg" }) {
  if (typeof img === "string") img = $(img);
  const base = dir.replace(/\/+$/, "");
  let shown = -1, ready = Promise.resolve();
  return (t) => {
    if (Number.isNaN(t)) throw new Error("frames: clip time is NaN");
    // Frame k covers [k/fps, (k+1)/fps). The epsilon keeps 0.29 * 100 = 28.999... on frame 29.
    const k = clamp(Math.floor(t * fps + 1e-6), 0, count - 1);
    if (k === shown) return ready;
    shown = k;
    img.src = `${base}/${String(k + 1).padStart(6, "0")}.${ext}`;
    ready = img.decode().catch((e) => {
      // A later frame replaced this one before it decoded; only a failure of the current frame counts.
      if (shown === k) throw new Error(`frames: cannot show ${img.src} (${e.message})`);
    });
    return ready;
  };
}

// ---------- preview & debug ----------

// URL parameters for previews (render.mjs --serve) and drafts; without them nothing here runs,
// and window.seek is left exactly as the page defines it.
//   ?t=12.5    seek to 12.5 s once the page has defined window.seek
//   ?debug=1   a small overlay with the frame number (at 60 fps), the time, the latest cue at or
//              before t and the narration scene, updated on every seek (render.mjs --debug)
// Both wrap window.seek when the page assigns it, so pages need no code for them. An async
// seek's promise is passed through for the caller to await.
const params = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
const previewAt = params.has("t") ? Number(params.get("t")) : NaN;
const debug = params.has("debug") && params.get("debug") !== "0";
if (debug || Number.isFinite(previewAt)) {
  const wrap = (fn) => (typeof fn !== "function" ? fn : function (t, ...rest) {
    const result = fn.call(this, t, ...rest);
    if (debug) drawDebug(t);
    return result;
  });
  // After the page's module finishes and its fonts load, so its own first seek comes before ours.
  const preview = () => Number.isFinite(previewAt) &&
    Promise.resolve().then(() => document.fonts.ready).then(() => window.seek(previewAt));
  let seek = wrap(window.seek);
  Object.defineProperty(window, "seek", {
    configurable: true, enumerable: true,
    get: () => seek,
    set(fn) { seek = wrap(fn); if (typeof fn === "function") preview(); },
  });
  if (typeof seek === "function") preview();
}

let hud = null;
function drawDebug(t) {
  if (!hud) {
    const el = (tag, css, parent) => parent.appendChild(Object.assign(document.createElement(tag), { style: css }));
    const box = el("div", "position:fixed;left:14px;top:14px;z-index:2147483647;pointer-events:none;" +
      "display:block;margin:0;padding:9px 14px 10px;border-radius:10px;background:rgba(10,10,12,0.88);" +
      "box-shadow:0 0 0 1px rgba(255,255,255,0.14);color:#fff;text-align:left;white-space:pre;" +
      "font:500 20px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
      "font-variant-numeric:tabular-nums;letter-spacing:0;opacity:1;filter:none;transform:none;",
      document.body || document.documentElement);
    box.id = "motion-debug";
    const row = () => el("span", "display:block", box);
    const part = (r, label, color = "#fff") => {
      const pair = el("span", "", r);
      el("span", "color:#9a9aa2", pair).textContent = label;
      return el("span", `color:${color}`, pair);
    };
    const top = row(), bottom = row();
    hud = { bottom, frame: part(top, "frame "), time: part(top, "  t "),
      scene: part(bottom, "scene "), cue: part(bottom, "  cue ", "#ffd23f"), cueAt: part(bottom, "", "#9a9aa2") };
  }
  hud.frame.textContent = String(Math.round(t * 60));
  hud.time.textContent = `${t.toFixed(3)} s`;

  // The narration scene that contains t, or the last one that has ended.
  let scene = "";
  for (const [id, sc] of Object.entries(window.SCENES || {})) {
    if (sc.start <= t) scene = t <= sc.end ? id : `after ${id}`;
  }
  let last = null;
  for (const c of window.CUE_TIMES || []) if (c.t <= t && (!last || c.t >= last.t)) last = c;
  const phrase = last && (last.phrase.length > 28 ? `${last.phrase.slice(0, 27)}…` : last.phrase);
  hud.scene.parentNode.style.display = scene ? "" : "none";
  hud.scene.textContent = scene;
  hud.cue.parentNode.style.display = hud.cueAt.parentNode.style.display = last ? "" : "none";
  hud.cue.previousSibling.textContent = scene ? "  cue " : "cue ";
  hud.cue.textContent = last ? `“${phrase}”` : "";
  hud.cueAt.textContent = last ? ` @ ${last.t.toFixed(2)}` : "";
  hud.bottom.style.display = scene || last ? "block" : "none";
}

// ---------- audit ----------

// Declare a check of the brief's numbers; `review.mjs audit` seeks each frame it names and runs
// it. `at` is a time, [t0, t1] (every frame between) or "all". `fn(t)` returns true (or nothing)
// to pass, false or a string explaining the failure.
//   check("caption band stays clear", "all", () => overlap("#title", "#captions") === 0);
//   check("card settled by f1167", 1167 / 60, () => Math.abs(box("#card").x - 640) < 1 || `x ${box("#card").x}`);
export function check(name, at, fn) {
  (window.CHECKS ||= []).push({ name, at, fn });
}

// The element's box as the viewer sees it (camera included), in page pixels.
export function box(el) {
  if (typeof el === "string") el = $(el);
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}

// Visible area (px²) that two elements share; 0 when either is hidden or they do not touch.
export function overlap(a, b) {
  const shown = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.01) return false;
    }
    return true;
  };
  const [ea, eb] = [a, b].map((e) => (typeof e === "string" ? $(e) : e));
  if (!ea || !eb || !shown(ea) || !shown(eb)) return 0;
  const [p, q] = [box(ea), box(eb)];
  const w = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
  const h = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
  return w > 0 && h > 0 ? w * h : 0;
}
