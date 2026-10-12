// transitions.js: changes of scene, and an optional film finish, for the video skill's HTML pages.
//
//   transition(t, {at, kind, dur, ...}, outEl, inEl)   both scenes' looks for one change of scene
//   scenes([el, spec, el, spec, el])                   a whole film of scenes: film(t), film.cuts
//   finish(el, t, {grain, vignette, sweeps})           grain, vignette and light sweeps; off by default
//
// A scene root is one element that holds one shot: an absolutely positioned box that fills the
// stage, with its own background. Put the roots side by side in one container (#scenes), and keep
// captions and the finish layer outside it. transition() and scenes() own each root's opacity,
// transform, filter, clip-path, mask, z-index and visibility: animate the content inside a root,
// never the root itself.
//
// Like motion.js, every look is a pure function of t, so any frame renders on its own, in any
// order. The kinds draw on ideas from AbubakrChan/product-launch-motion (MIT, the zoom-through's
// numbers and the finish), haidrrrry/claude-remotion-skill (MIT, the whip) and cth9191/animate
// (MIT, the morph bridge). The code is this skill's own. See references/transitions.md.

import { clamp, lerp, rand, $ } from "./motion.js";

// ---------- kinds ----------

// Default durations follow animation-principles.md: a scene change in a teaser, loop or launch
// film takes 0.8–1.2 s. Explainers and training take the longer column (1.0–1.8 s); pass `dur`.
// `handoff` is how far through the transition the new scene takes over. review.mjs cuts compares
// the motion on each side of it, and of the start and the end.
export const KINDS = {
  cut: { dur: 0, handoff: 0 },
  dissolve: { dur: 0.8, handoff: 0.5 },
  push: { dur: 1.0, handoff: 0.5, dir: "left" },
  "zoom-through": { dur: 0.8, handoff: 0.5 },
  whip: { dur: 0.8, handoff: 0.5, dir: "left" },
  wipe: { dur: 0.9, handoff: 0.5, dir: "right" },
  "light-leak": { dur: 1.0, handoff: 0.5, dir: "right" },
  morph: { dur: 1.2, handoff: 0.475 },   // the middle of the shape's own change (MORPH_AT below)
};

// The direction the picture moves. A push "left" moves both scenes left, so the new one enters
// from the right; a wipe "right" moves its edge to the right.
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

function resolve(spec) {
  if (!spec || typeof spec !== "object") throw new Error("transition: the spec must be an object like {at: 4.2, kind: \"dissolve\"}");
  const kind = spec.kind ?? "cut";
  const k = KINDS[kind];
  if (!k) throw new Error(`transition: unknown kind ${JSON.stringify(kind)}; use ${Object.keys(KINDS).join(", ")}`);
  if (!Number.isFinite(spec.at)) throw new Error(`transition ${kind}: "at" must be a time in seconds, not ${JSON.stringify(spec.at)}`);
  const dur = kind === "cut" ? 0 : spec.dur ?? k.dur;
  if (kind !== "cut" && !(dur > 0)) throw new Error(`transition ${kind} at ${spec.at}: "dur" must be more than 0 (use kind "cut" for no overlap)`);
  const dir = spec.dir ?? k.dir;
  if (dir !== undefined && !DIRS[dir] && !(kind === "wipe" && Number.isFinite(dir))) {
    throw new Error(`transition ${kind} at ${spec.at}: dir must be ${Object.keys(DIRS).join(", ")}${kind === "wipe" ? " or an angle in degrees" : ""}, not ${JSON.stringify(dir)}`);
  }
  return { ...spec, kind, dur, dir, end: spec.at + dur, handoff: spec.at + dur * k.handoff, key: `${kind}@${spec.at}` };
}

// ---------- easing ----------

const easeIn = (p, k = 3) => p ** k;
const easeOut = (p, k = 3) => 1 - (1 - p) ** k;
const easeInOut = (p, k = 3) => (p < 0.5 ? 2 ** (k - 1) * p ** k : 1 - (2 - 2 * p) ** k / 2);
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---------- looks ----------

const element = (el, name) => {
  const e = typeof el === "string" ? $(el) : el;
  if (!e) throw new Error(`transition: ${name} ${JSON.stringify(el)} matches nothing on the page`);
  return e;
};

// Every property a transition owns is written on every frame, so nothing carries over.
function put(el, { hidden = false, opacity = 1, x = 0, y = 0, scale = 1, origin = "", blur = 0, filter = "",
  clip = "none", mask = "none", z = "" } = {}) {
  const s = el.style;
  s.visibility = hidden ? "hidden" : "visible";
  s.opacity = hidden ? "0" : opacity.toFixed(4);
  s.transform = x || y || scale !== 1 ? `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})` : "none";
  s.transformOrigin = origin;
  s.filter = filter || (blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none");
  s.clipPath = clip;
  s.maskImage = s.webkitMaskImage = mask;
  s.zIndex = z;
}
const HIDDEN = { hidden: true };

const origin = (o) => (Array.isArray(o) ? `${o[0]}px ${o[1]}px` : o ?? "");

const LOOKS = {
  // The new scene fades in over the old one, which stays opaque underneath, so the picture never
  // dips toward the stage color halfway (two fades at once would).
  dissolve(p, s, out, inn) {
    put(out, { z: 1 });
    put(inn, { z: 2, opacity: easeInOut(p, 2) });
  },

  // Both scenes travel one frame together, easing in and out like any move across the frame.
  push(p, s, out, inn) {
    const [dx, dy] = DIRS[s.dir], W = out.offsetWidth, H = out.offsetHeight;
    const e = easeInOut(p, 3);
    put(out, { z: 1, x: dx * W * e, y: dy * H * e });
    put(inn, { z: 2, x: -dx * W * (1 - e), y: -dy * H * (1 - e) });
  },

  // The old scene rushes past the camera (to 2.5x, blur 8, ease-in) while the new one arrives from
  // behind it (from 0.5x, blur 8, ease-out). The old one blurs from 20% of the way and fades from 40%
  // to 90%: fading later leaves a fast ghost that vanishes at the end, fading earlier reads as a
  // double exposure. The new one is nearly full size before the old one thins, so the stage never
  // shows around it. Scale moves in log space, as a zoom looks.
  "zoom-through"(p, s, out, inn) {
    const big = s.outScale ?? 2.5, small = s.inScale ?? 0.5, blur = s.blur ?? 8, o = origin(s.origin);
    const eo = easeIn(p, 3), ei = easeOut(p, 5);
    put(out, { z: 2, origin: o, scale: big ** eo, blur: blur * smooth(0.2, 0.9, p), opacity: 1 - smooth(0.4, 0.9, p) });
    put(inn, { z: 1, origin: o, scale: small ** (1 - ei), blur: blur * (1 - ei), opacity: easeOut(p, 3) });
  },

  // A camera whip: a hard pull to a peak speed at the handoff, then a long settle (quartic in and
  // out, so most of the travel happens in the middle third). The scenes sit side by side, so the
  // seam crosses the frame at the peak, hidden in streaks: a blur along the move, as wide as the
  // speed. The renderer's motion blur adds to it. There is no counter-move first: moving the old
  // scene back would show the stage at its trailing edge.
  whip(p, s, out, inn, fx) {
    const [dx, dy] = DIRS[s.dir], size = dx ? out.offsetWidth : out.offsetHeight;
    const o = easeInOut(p, 4);
    const perFrame = (Math.abs(easeInOut(clamp(p + 1e-3), 4) - easeInOut(clamp(p - 1e-3), 4)) / 2e-3) * size / s.dur / 60;
    const streak = Math.min(s.streak ?? 48, 0.25 * perFrame);   // px of blur per px/frame at 60 fps
    put(out, { z: 1, x: dx * size * o, y: dy * size * o, filter: fx.streak(0, streak, dx !== 0) });
    put(inn, { z: 2, x: -dx * size * (1 - o), y: -dy * size * (1 - o), filter: fx.streak(1, streak, dx !== 0) });
  },

  // The new scene is revealed behind a moving edge: "linear" (the default, along dir or an angle in
  // degrees), "iris" (a circle from `origin`, default the center), or a function (p, {width,
  // height}) => a CSS clip-path for any shape. `soft` is the edge's width in px; `band` adds a
  // solid band in that color leading a linear edge.
  wipe(p, s, out, inn, fx) {
    const W = inn.offsetWidth, H = inn.offsetHeight, soft = s.soft ?? 2, shape = s.shape ?? "linear";
    const e = easeInOut(p, 3);
    put(out, { z: 1 });
    if (typeof shape === "function") return put(inn, { z: 2, clip: shape(e, { width: W, height: H }) });
    if (shape === "iris") {
      const [cx, cy] = Array.isArray(s.origin) ? s.origin : [W / 2, H / 2];
      const R = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + soft;
      const r = R * e;
      return put(inn, { z: 2, mask: `radial-gradient(circle at ${cx}px ${cy}px, #000 ${(r - soft).toFixed(1)}px, transparent ${r.toFixed(1)}px)` });
    }
    if (shape !== "linear") throw new Error(`wipe: shape must be "linear", "iris" or a function, not ${JSON.stringify(shape)}`);
    // CSS gradient angles: 0deg points up, 90deg right. The gradient line spans the whole box.
    const deg = Number.isFinite(s.dir) ? s.dir : { up: 0, right: 90, down: 180, left: 270 }[s.dir];
    const a = (deg * Math.PI) / 180, L = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
    const band = s.band ? s.bandWidth ?? 0.06 * L : 0;
    const edge = lerp(-(band + soft), L + soft, e);
    put(inn, { z: 2, mask: `linear-gradient(${deg}deg, #000 ${(edge - soft).toFixed(1)}px, transparent ${edge.toFixed(1)}px)` });
    if (band) fx.band(`linear-gradient(${deg}deg, transparent ${edge.toFixed(1)}px, ${s.band} ${edge.toFixed(1)}px, ${s.band} ${(edge + band).toFixed(1)}px, transparent ${(edge + band).toFixed(1)}px)`);
  },

  // Warm light washes over the frame from one side, peaks, and recedes. The scenes swap underneath
  // the peak, so the change is never seen. Plain alpha only: see references/transitions.md.
  "light-leak"(p, s, out, inn, fx) {
    put(out, { z: 1 });
    put(inn, { z: 2, opacity: easeInOut(clamp((p - 0.36) / 0.28), 2) });
    fx.leak(p);
  },

  // A shape bridges the two scenes. The old scene shrinks into a window shaped like `from` (an
  // outline in it), the outline morphs into `to` (an outline in the new scene) on the bare stage,
  // and the new scene opens out of it. See morph() below.
  morph(p, s, out, inn, fx) { morph(p, s, out, inn, fx); },
};

// ---------- effects: layers a kind adds, created once per transition ----------

// Decorative layers carry data-fx, so review.mjs cuts leaves them out of the picture's motion. The
// morph's shape is the picture while it is on screen, so it carries data-morph instead.
const fxCache = new WeakMap();
let fxSerial = 0;
function effects(s, out, inn) {
  const stage = out.parentElement;
  const byKey = fxCache.get(stage) ?? fxCache.set(stage, new Map()).get(stage);
  if (byKey.has(s.key)) return byKey.get(s.key);
  const layers = [];
  const layer = (tag = "div", css = "") => {
    const ns = tag === "svg" ? "http://www.w3.org/2000/svg" : null;
    const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    el.setAttribute(s.kind === "morph" ? "data-morph" : "data-fx", s.kind);
    el.setAttribute("style", `position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3;display:none;${css}`);
    stage.appendChild(el);
    layers.push(el);
    return el;
  };
  const fx = { hide() { for (const el of layers) el.style.display = "none"; } };

  if (s.kind === "whip") {
    // One horizontal (or vertical) blur per scene, kept inside the scene's own box with its edge
    // pixels repeated, so each scene stays opaque to its edge and the stage never shows at the seam.
    const svg = layer("svg", "width:0;height:0;");
    svg.style.display = "block";
    const ids = [0, 1].map(() => `fx-streak-${++fxSerial}`);
    svg.innerHTML = ids.map((id) => `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur stdDeviation="0" edgeMode="duplicate"/></filter>`).join("");
    const blurs = [...svg.querySelectorAll("feGaussianBlur")];
    fx.streak = (i, sigma, horizontal) => {
      if (sigma < 0.3) return "";
      blurs[i].setAttribute("stdDeviation", horizontal ? `${sigma.toFixed(2)} 0` : `0 ${sigma.toFixed(2)}`);
      return `url(#${ids[i]})`;
    };
    fx.hide = () => {};   // the filters do nothing unless a scene uses them
  }

  if (s.kind === "wipe") {
    const band = layer();
    fx.band = (bg) => { band.style.display = "block"; band.style.background = bg; };
  }

  if (s.kind === "light-leak") {
    // Light that strikes the film near one edge: a hot core inside an amber bloom inside a red
    // fringe, entering along dir and receding. A seeded height, so each leak differs but every
    // render of it is the same. It covers about half the frame at its peak, never all of it.
    const root = layer("div", "overflow:hidden;");
    const r = rand(s.seed ?? s.key);
    const [dx, dy] = DIRS[s.dir];
    const across = lerp(-0.22, 0.22, r());
    const blobs = [
      // [size as a share of the frame's shorter side, length across the move, travel along it, colors]
      [1.15, 1.3, [-0.34, 0.22], "rgba(214,72,46,0.42) 0%, rgba(210,68,44,0.16) 55%, rgba(210,66,44,0) 100%"],
      [0.82, 1.45, [-0.26, 0.28], "rgba(255,170,92,0.58) 0%, rgba(246,132,70,0.24) 52%, rgba(240,116,60,0) 100%"],
      [0.46, 1.75, [-0.14, 0.26], "rgba(255,248,236,0.9) 0%, rgba(255,222,180,0.62) 34%, rgba(255,178,110,0.2) 66%, rgba(255,160,96,0) 100%"],
    ].map(([size, tall, travel, stops], i) => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;left:0;top:0;border-radius:50%;background:radial-gradient(closest-side, ${stops});`;
      root.appendChild(el);
      return { el, size, tall, travel, lag: i * 0.06 + r() * 0.04, across: across + lerp(-0.05, 0.05, r()) };
    });
    const haze = document.createElement("div");
    haze.style.cssText = "position:absolute;inset:0;background:rgb(255,190,140);";
    root.prepend(haze);
    fx.leak = (p) => {
      root.style.display = "block";   // before measuring: a hidden layer has no size
      const W = root.offsetWidth, H = root.offsetHeight, base = Math.min(W, H);
      const env = Math.sin(Math.PI * p) ** 2;   // peaks at the handoff
      haze.style.opacity = (0.1 * env).toFixed(4);
      for (const b of blobs) {
        const q = clamp((p - b.lag) / (1 - b.lag));
        const along = lerp(b.travel[0], b.travel[1], easeOut(q, 2));
        const w = b.size * base * (dx ? 1 : b.tall), h = b.size * base * (dx ? b.tall : 1);
        const cx = dx ? (dx > 0 ? along : 1 - along) * W : (0.5 + b.across) * W;
        const cy = dy ? (dy > 0 ? along : 1 - along) * H : (0.5 + b.across) * H;
        Object.assign(b.el.style, { width: `${w.toFixed(1)}px`, height: `${h.toFixed(1)}px`,
          transform: `translate(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px)`,
          opacity: (env * Math.sin(Math.PI * q) ** 0.6).toFixed(4) });
      }
    };
  }

  if (s.kind === "morph") {
    const svg = layer("svg", "overflow:visible;");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(path);
    fx.blob = (pts, color, alpha) => {
      svg.style.display = alpha > 0.002 ? "block" : "none";
      path.setAttribute("d", pathData(pts));
      path.setAttribute("fill", color);
      path.setAttribute("fill-opacity", alpha.toFixed(4));
    };
  }

  byKey.set(s.key, fx);
  return fx;
}

// ---------- morph ----------

// Outlines are resampled to 96 points, evenly along their length, turned the same way round, and
// lined up so point i of one is nearest point i of the other; then each point moves straight across.
const MORPH_POINTS = 96;
const MORPH_AT = [0.3, 0.65];   // shrink until 30% through, morph until 65%, then open the new scene

function morph(p, s, out, inn, fx) {
  if (!s.from || !s.to) throw new Error(`morph at ${s.at}: give both "from" (an outline in the old scene) and "to" (one in the new)`);
  const stage = out.parentElement.getBoundingClientRect();
  const A = outline(s.from, stage), B = alignTo(A, outline(s.to, stage));
  const cA = centroid(A), cB = centroid(B);
  const colorA = s.fromColor ?? colorOf(s.from) ?? "#1f1e1b", colorB = s.toColor ?? colorOf(s.to) ?? colorA;
  const [m0, m1] = MORPH_AT;
  if (p < m0) {
    // The old scene seen through a window shaped like A, closing from beyond the frame onto A.
    // The outline's own fill takes over just before it lands, so the morph starts from a solid shape.
    const u = easeInOut(p / m0, 3);
    put(out, { z: 1, clip: windowPath(out, A, cA, u, stage) });
    put(inn, HIDDEN);
    fx.blob(A, colorA, smooth(0.72, 1, u));
  } else if (p < m1) {
    const u = easeInOut((p - m0) / (m1 - m0), 3);
    put(out, HIDDEN);
    put(inn, HIDDEN);
    // The shape travels on a gentle arc, bowed by 12% of the distance, as anything that travels does.
    const dx = cB[0] - cA[0], dy = cB[1] - cA[1], bow = 0.12 * Math.sin(Math.PI * u);
    const c = [lerp(cA[0], cB[0], u) - dy * bow, lerp(cA[1], cB[1], u) + dx * bow];
    const pts = A.map((a, i) => [c[0] + lerp(a[0] - cA[0], B[i][0] - cB[0], u), c[1] + lerp(a[1] - cA[1], B[i][1] - cB[1], u)]);
    fx.blob(pts, mixColor(colorA, colorB, u), 1);
  } else {
    // The new scene opens out of a window shaped like B; B's fill fades as the window starts to grow.
    const u = easeInOut((p - m1) / (1 - m1), 3);
    put(out, HIDDEN);
    put(inn, { z: 1, clip: windowPath(inn, B, cB, 1 - u, stage) });
    fx.blob(B, colorB, 1 - smooth(0, 0.3, u));
  }
}

// The outline scaled about its center by k (1 at u = 1, large enough to cover the scene at u = 0),
// in log space, as a clip-path in the scene root's own pixels.
function windowPath(root, pts, c, u, stage) {
  const box = root.getBoundingClientRect();
  const ox = box.left - stage.left, oy = box.top - stage.top, W = root.offsetWidth, H = root.offsetHeight;
  const near = Math.max(4, Math.min(...pts.map(([x, y]) => Math.hypot(x - c[0], y - c[1]))));
  const far = Math.max(...[[ox, oy], [ox + W, oy], [ox, oy + H], [ox + W, oy + H]].map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
  const k = Math.exp(lerp(Math.log((far / near) * 1.06), 0, u));
  if (u <= 0) return "none";
  return `path("${pathData(pts.map(([x, y]) => [c[0] + (x - c[0]) * k - ox, c[1] + (y - c[1]) * k - oy]))}")`;
}

const pathData = (pts) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
const centroid = (pts) => pts.reduce((c, [x, y]) => [c[0] + x / pts.length, c[1] + y / pts.length], [0, 0]);

// A closed outline as MORPH_POINTS points in the stage's pixels. `src` is a list of [x, y] stage
// points, an SVG shape (path, circle, rect, ellipse, polygon), or any other element, which gives
// its border box with its corner radius.
function outline(src, stage = { left: 0, top: 0 }, n = MORPH_POINTS) {
  let pts;
  if (Array.isArray(src)) pts = src;
  else {
    const el = element(src, "morph outline");
    if (typeof SVGGeometryElement !== "undefined" && el instanceof SVGGeometryElement) {
      const L = el.getTotalLength(), m = 400, M = el.getScreenCTM();
      pts = Array.from({ length: m }, (_, i) => {
        const q = el.getPointAtLength((L * i) / m);
        return [M.a * q.x + M.c * q.y + M.e - stage.left, M.b * q.x + M.d * q.y + M.f - stage.top];
      });
    } else {
      const r = el.getBoundingClientRect(), radius = getComputedStyle(el).borderTopLeftRadius;
      // A percentage is of the box's own size ("50%" makes a circle of a square).
      const px = (parseFloat(radius) || 0) * (radius.endsWith("%") ? Math.min(r.width, r.height) / 100 : 1);
      const rad = Math.min(px, r.width / 2, r.height / 2);
      pts = roundRect(r.left - stage.left, r.top - stage.top, r.width, r.height, rad);
    }
  }
  return resample(pts, n);
}

function roundRect(x, y, w, h, r) {
  const pts = [], k = 24;
  const corners = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= k; i++) {
      const a = a0 + (i / k) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
}

// Evenly spaced along the closed outline, clockwise on screen, starting at the top.
function resample(pts, n) {
  if (pts.length < 3) throw new Error("morph: an outline needs at least 3 points");
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    area += x0 * y1 - x1 * y0;
  }
  if (area < 0) pts = [...pts].reverse();
  let top = 0;
  pts.forEach(([x, y], i) => { if (y < pts[top][1] - 1e-6 || (Math.abs(y - pts[top][1]) < 1e-6 && x < pts[top][0])) top = i; });
  pts = [...pts.slice(top), ...pts.slice(0, top)];
  const seg = pts.map((a, i) => Math.hypot(pts[(i + 1) % pts.length][0] - a[0], pts[(i + 1) % pts.length][1] - a[1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out = [];
  let i = 0, walked = 0;
  for (let j = 0; j < n; j++) {
    const want = (j / n) * total;
    while (walked + seg[i] < want && i < seg.length - 1) walked += seg[i++];
    const a = pts[i], b = pts[(i + 1) % pts.length], f = seg[i] ? (want - walked) / seg[i] : 0;
    out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
  }
  return out;
}

// B turned so its points pair with A's: the rotation with the least total distance, both centered.
function alignTo(A, B) {
  const ca = centroid(A), cb = centroid(B), n = A.length;
  let best = 0, bestD = Infinity;
  for (let s = 0; s < n; s++) {
    let d = 0;
    for (let i = 0; i < n && d < bestD; i++) {
      const b = B[(i + s) % n];
      d += (A[i][0] - ca[0] - b[0] + cb[0]) ** 2 + (A[i][1] - ca[1] - b[1] + cb[1]) ** 2;
    }
    if (d < bestD) { bestD = d; best = s; }
  }
  return B.map((_, i) => B[(i + best) % n]);
}

function colorOf(src) {
  if (Array.isArray(src)) return null;
  const el = element(src, "morph outline");
  const cs = getComputedStyle(el);
  const c = el instanceof SVGElement ? cs.fill : cs.backgroundColor;
  const v = rgba(c);
  return v && v[3] > 0 ? `rgb(${v[0]},${v[1]},${v[2]})` : null;
}
function rgba(c) {
  if (!c) return null;
  if (c[0] === "#") {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join("") : c.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  const m = c.match(/[\d.]+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]] : null;
}
function mixColor(a, b, u) {
  const x = rgba(a), y = rgba(b);
  if (!x || !y) return u < 0.5 ? a : b;
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(x[i], y[i], u))).join(",")})`;
}

// ---------- one transition, and a film of them ----------

// Every transition the page uses, for review.mjs cuts: {kind, at, dur, end, handoff, dir, out, in}.
function register(s, out, inn) {
  const list = (window.TRANSITIONS ||= []);
  if (list.some((x) => x.key === s.key)) return;
  const name = (el) => (el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(" ")[0]}` : el.tagName.toLowerCase());
  // A wipe's shape names it better than a direction when it is not linear.
  const shape = s.kind === "wipe" && s.shape && s.shape !== "linear" ? (typeof s.shape === "string" ? s.shape : "custom") : null;
  list.push({ key: s.key, kind: s.kind, at: s.at, dur: s.dur, end: s.end, handoff: s.handoff, dir: shape ?? s.dir ?? null,
    out: name(out), in: name(inn) });
  list.sort((a, b) => a.at - b.at);
}

// Sets both scenes' looks at time t. Before `at` only the old scene shows; from `at + dur` only the
// new one. Call it on every frame. Returns {p, kind}: how far through the transition t is.
export function transition(t, spec, outEl, inEl) {
  const s = resolve(spec);
  const out = element(outEl, "outEl"), inn = element(inEl, "inEl");
  register(s, out, inn);
  const fx = effects(s, out, inn);
  const p = s.dur > 0 ? clamp((t - s.at) / s.dur) : t >= s.at ? 1 : 0;
  fx.hide();
  if (p <= 0 || p >= 1) {
    put(p >= 1 ? inn : out);
    put(p >= 1 ? out : inn, HIDDEN);
  } else {
    LOOKS[s.kind](p, s, out, inn, fx);
  }
  return { p, kind: s.kind };
}

// A film: scenes([root, spec, root, spec, root, ...]), alternating scene roots (elements or
// selectors) and transition specs, in time order. Returns film(t), which shows only the scene (or
// the pair of scenes in a transition) on screen at t and hides the rest. film.cuts lists the hard
// cuts, for VIDEO.cuts; transitions overlap their scenes, so they are not hard cuts.
export function scenes(list) {
  if (!Array.isArray(list) || list.length % 2 === 0) {
    throw new Error("scenes: pass [root, spec, root, ...]: scene roots with one transition spec between each pair");
  }
  const roots = list.filter((_, i) => i % 2 === 0).map((el, i) => element(el, `scene ${i + 1}`));
  const specs = list.filter((_, i) => i % 2 === 1).map(resolve);
  specs.forEach((s, i) => {
    if (i && s.at < specs[i - 1].end - 1e-9) {
      throw new Error(`scenes: the ${s.kind} at ${s.at} s starts before the ${specs[i - 1].kind} at ${specs[i - 1].at} s ends (${specs[i - 1].end.toFixed(3)} s)`);
    }
    register(s, roots[i], roots[i + 1]);
  });
  const fx = specs.map((s, i) => effects(s, roots[i], roots[i + 1]));   // every layer exists from the first frame
  const film = (t) => {
    let active = -1, shown = 0;
    specs.forEach((s, i) => {
      if (s.dur > 0 && t >= s.at && t < s.end) active = i;
      if (t >= s.end) shown = i + 1;
    });
    fx.forEach((f, i) => i !== active && f.hide());
    roots.forEach((r, k) => {
      if (active >= 0 ? k !== active && k !== active + 1 : k !== shown) put(r, HIDDEN);
    });
    if (active >= 0) return transition(t, specs[active], roots[active], roots[active + 1]);
    put(roots[shown]);
    return { p: 1, kind: null };
  };
  film.cuts = specs.filter((s) => s.kind === "cut").map((s) => s.at);
  film.transitions = specs;
  return film;
}

// ---------- film finish ----------

// For launch films and social posts only. Never in a walkthrough, training or explainer: grain and
// a vignette lower the contrast of the text the viewer must read. Every layer is plain alpha over
// the picture; never use mix-blend-mode on an overlay (references/transitions.md).
//
//   finish("#finish", t, { grain: true, vignette: true, sweeps: { "title lands": 2.2, "end card": {at: 24, dur: 1} } })
//
// el is an empty layer the page adds above everything, captions included. Each treatment is off
// unless named; `true` picks the strength in FINISH, or pass a number.
//   grain     SVG noise, a new field about 12 times a second (`rate`), never every frame: fresh
//             noise on every frame makes the video about 10x larger and reads as sizzle.
//   vignette  corners darkened by this alpha (0.15), the center untouched.
//   sweeps    a soft band of light across the frame, once per named beat: {name: at | {at, dur}}.
// `fps` is the render's frame rate (default 60). Every subframe of frame n rounds to n, so the
// grain changes only between frames and never blends two fields into one frame.
// Open the page with ?finish=0 to turn the finish off, for example to check contrast.
export const FINISH = { grain: 0.05, vignette: 0.15, sweep: 0.12 };
const finishOff = typeof location !== "undefined" && new URLSearchParams(location.search).get("finish") === "0";

export function finish(el, t, { grain = false, vignette = false, sweeps = {}, rate = 12, fps = 60, seed = 1, grainSize = 0.55 } = {}) {
  if (typeof el === "string") el = $(el);
  if (!el) return;
  if (finishOff) { el.style.display = "none"; return; }
  if (Array.isArray(sweeps)) throw new Error('finish: name each sweep\'s beat, like sweeps: { "title lands": 2.2 }');
  const f = finishLayers(el);
  const g = grain === true ? FINISH.grain : Number(grain) || 0;
  const v = vignette === true ? FINISH.vignette : Number(vignette) || 0;

  f.grain.style.display = g > 0 ? "block" : "none";
  if (g > 0) {
    const hold = Math.max(1, Math.round(fps / rate));
    const field = Math.floor(Math.round(t * fps) / hold);
    f.turbulence.setAttribute("seed", String(seed + field));
    f.turbulence.setAttribute("baseFrequency", String(grainSize));
    // Noise above the middle darkens, below it lightens: grain with no overall shift in brightness.
    const k = (g / 0.12).toFixed(4), h = (g / 0.24).toFixed(4);
    f.dark.setAttribute("values", `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${k} 0 0 0 -${h}`);
    f.light.setAttribute("values", `0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -${k} 0 0 0 ${h}`);
  }

  f.vignette.style.display = v > 0 ? "block" : "none";
  if (v > 0) {
    f.vignette.style.background = `radial-gradient(ellipse farthest-corner at 50% 50%, rgba(14,11,9,0) 38%, ` +
      `rgba(14,11,9,${(v * 0.32).toFixed(4)}) 72%, rgba(14,11,9,${v.toFixed(4)}) 100%)`;
  }

  // The sweep for the beat at t, if any.
  let on = null;
  for (const [name, b] of Object.entries(sweeps)) {
    const at = typeof b === "number" ? b : b?.at, dur = (typeof b === "object" && b?.dur) || 0.9;
    if (!Number.isFinite(at)) throw new Error(`finish: sweep ${JSON.stringify(name)} needs a time`);
    if (t >= at && t < at + dur) on = { at, dur };
  }
  f.sweep.style.display = on ? "block" : "none";
  if (on) {
    const W = el.offsetWidth, q = (t - on.at) / on.dur;
    const x = lerp(-0.62, 1.22, easeInOut(q, 2)) * W;
    f.sweep.style.transform = `translateX(${x.toFixed(1)}px) skewX(-14deg)`;
    f.sweep.style.opacity = (smooth(0, 0.14 / on.dur, q) * (1 - smooth(1 - 0.2 / on.dur, 1, q))).toFixed(4);
  }
}

const finishState = new WeakMap();
function finishLayers(el) {
  if (finishState.has(el)) return finishState.get(el);
  el.setAttribute("data-fx", "finish");
  Object.assign(el.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%",
    pointerEvents: "none", overflow: "hidden", zIndex: el.style.zIndex || "1000" });
  const div = (css) => el.appendChild(Object.assign(document.createElement("div"), { style: `position:absolute;display:none;${css}` }));
  // The sweep keeps its gradient at 90deg and skews the element instead: an angled gradient on a
  // tall box puts its stops at different heights on each side and shows a hard diagonal seam.
  const sweep = div(`left:0;top:-25%;width:36%;height:150%;background:linear-gradient(90deg, rgba(255,255,255,0), ` +
    `rgba(255,255,255,${FINISH.sweep}) 50%, rgba(255,255,255,0));`);
  const vignette = div("inset:0;");
  const id = `fx-grain-${++fxSerial}`;
  const grain = div("inset:0;");
  // No will-change here: a separately composited grain layer rasterizes in GPU tiles that differ by a
  // few levels from run to run on Metal, so two renders of one frame would not match.
  grain.innerHTML = `<svg width="100%" height="100%" style="display:block"><filter id="${id}" x="0" y="0" width="100%" height="100%" ` +
    `color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="1" ` +
    `stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" result="dark" values=""/>` +
    `<feColorMatrix in="n" type="matrix" result="light" values=""/><feMerge><feMergeNode in="dark"/><feMergeNode in="light"/>` +
    `</feMerge></filter><rect width="100%" height="100%" filter="url(#${id})"/></svg>`;
  const [dark, light] = grain.querySelectorAll("feColorMatrix");
  const state = { sweep, vignette, grain, turbulence: grain.querySelector("feTurbulence"), dark, light };
  finishState.set(el, state);
  return state;
}
