// common.js: what the style packs share. Stepped time ("on twos"), seeded hash noise, and shapes as
// point lists that every style can draw: riso fills them, cut paper cuts them, pixel art rasterises them.
//
// Every function here is pure. Nothing depends on the frame before, so frames render in any order.

// ---------- stepped time ----------

// Hand-made animation holds each drawing for `every` frames at `fps` ("on twos" = every 2 at 24 fps,
// 12 new drawings a second). stepOf(t) is the drawing's number, Math.round(t * fps / every): drawing n
// covers frames 2n-1 and 2n. The tiny nudge keeps 5/24 * 24 / 2 = 2.4999999 on the same side of the
// rounding on every run. For a seamless loop of `loop` seconds the number wraps, so the loop's last
// frame and frame 0 are one drawing (make the loop a whole number of drawings).
export function stepOf(t, { fps = 24, every = 2, loop } = {}) {
  const n = Math.round((t * fps) / every + 1e-6);
  if (!loop) return n;
  const L = Math.max(1, Math.round((loop * fps) / every));
  return ((n % L) + L) % L;
}

// The time of the drawing that shows at t. Read every track at this time, not at t, and all motion
// steps together with the boil.
export function stepTime(t, opts = {}) {
  const { fps = 24, every = 2 } = opts;   // opts.loop wraps it too: the last frame reads time 0
  return (stepOf(t, opts) * every) / fps;
}

// ---------- seeded hash noise ----------

// hash(...parts) is a number in [0, 1) that depends only on its parts (strings or numbers): the same
// parts give the same number on every run, in any order of calls. Use it for per-vertex and
// per-step jitter; use motion.js rand(seed) for long streams drawn at load.
export function hash(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ 0x1f, 0x01000193); // a separator, so ("ab", "c") differs from ("a", "bc")
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// The same, in [-1, 1).
export const signed = (...parts) => hash(...parts) * 2 - 1;

// ---------- shapes: closed point lists [[x, y], ...] ----------

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export function circle(cx, cy, r, n = Math.max(20, Math.round(r * 0.5))) {
  return ellipse(cx, cy, r, r, 0, n);
}
// rotate is in degrees, like CSS.
export function ellipse(cx, cy, rx, ry, rotate = 0, n = Math.max(20, Math.round(Math.max(rx, ry) * 0.5))) {
  const c = Math.cos(rotate * DEG), s = Math.sin(rotate * DEG);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
}
export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function roundRect(x, y, w, h, r, n = 5) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const P = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (i / n) * 90) * DEG;
      P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -90);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, 90);
  corner(x + r, y + r, 180);
  return P;
}
// A smooth curve through the points (Catmull-Rom), `samples` points per span. Open by default.
export function curve(points, { closed = false, samples = 8 } = {}) {
  const n = points.length;
  if (n < 3) return points.slice();
  const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const out = [];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < samples; k++) {
      const u = k / samples, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * u
        + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  if (!closed) out.push(points[n - 1].slice());
  return out;
}
// Points spaced `step` apart along the outline (or open path). The cut styles use this so edges have
// the same detail whatever the shape's size.
export function resample(points, step, closed = true) {
  const P = closed ? [...points, points[0]] : points;
  const out = [P[0].slice()];
  let carry = 0;
  for (let i = 1; i < P.length; i++) {
    const [ax, ay] = P[i - 1], [bx, by] = P[i];
    const len = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= len) {
      out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]);
      d += step;
    }
    carry = len - (d - step);
  }
  if (closed && out.length > 1) {
    const [fx, fy] = out[0], [lx, ly] = out[out.length - 1];
    if (Math.hypot(fx - lx, fy - ly) < step * 0.5) out.pop();
  } else if (!closed) {
    const last = points[points.length - 1];
    const [lx, ly] = out[out.length - 1];
    if (Math.hypot(last[0] - lx, last[1] - ly) > 1e-6) out.push(last.slice());
  }
  return out;
}
// Move, rotate (degrees) and scale (a number or [sx, sy]) points about `origin` ([x, y]; default: the
// points' own centre). Scaling happens first, then rotation, then the move.
export function transform(points, { x = 0, y = 0, rotate = 0, scale = 1, origin } = {}) {
  const [ox, oy] = origin ?? centroid(points);
  const [sx, sy] = Array.isArray(scale) ? scale : [scale, scale];
  const c = Math.cos(rotate * DEG), s = Math.sin(rotate * DEG);
  return points.map(([px, py]) => {
    const ax = (px - ox) * sx, ay = (py - oy) * sy;
    return [ox + x + ax * c - ay * s, oy + y + ax * s + ay * c];
  });
}
export function bounds(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, x0, y0, x1, y1 };
}
export function centroid(points) {
  let sx = 0, sy = 0;
  for (const [x, y] of points) { sx += x; sy += y; }
  return [sx / points.length, sy / points.length];
}
// A Path2D of the points, closed unless told otherwise.
export function toPath(points, closed = true) {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (closed) p.closePath();
  return p;
}

// ---------- canvas ----------

export function canvasOf(target, name) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el || el.tagName !== "CANVAS") throw new Error(`${name}: ${String(target)} is not a <canvas>`);
  return el;
}
export function scratch(w, h, readable = false) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { c, g: c.getContext("2d", readable ? { willReadFrequently: true } : undefined) };
}
export function rgbOf(color) {
  const s = String(color).trim();
  if (s[0] === "#") {
    const h = s.length === 4 ? [...s.slice(1)].map((d) => d + d).join("") : s.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const m = s.match(/[\d.]+/g);
  if (!m) throw new Error(`not a colour: ${color}`);
  return m.slice(0, 3).map(Number);
}
