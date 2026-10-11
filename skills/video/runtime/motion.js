// motion.js: time-pure animation helpers for the video skill's HTML pages.
//
// Every value is a function of time alone. A page builds its tracks once at load,
// then window.seek(t) reads them. No CSS transitions, timers, or state between frames,
// so any frame can be rendered in any order (the renderer splits work across pages).

// ---------- springs ----------

// Normalized step response of a damped spring: 0 at t<=0, settles at 1.
// `duration` is the perceptual length (seconds); `bounce` 0..0.3 is overshoot
// (0 = critically damped). `v0` is initial velocity in units of the step per second.
export function springStep(t, { duration = 0.5, bounce = 0.08, v0 = 0 } = {}) {
  if (t <= 0) return 0;
  const w0 = (2 * Math.PI) / duration;
  const zeta = 1 - bounce;
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
      return words[idx].start - lead;
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
