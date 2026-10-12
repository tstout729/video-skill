// pixel.js: pixel art for seek(t) pages.
//
// Each frame is drawn into a small framebuffer of palette indices (180x180 for a 1080x1080 video,
// so one art pixel is 6x6 screen pixels) with whole-pixel primitives, then shown on a canvas that
// the browser scales up with no smoothing (image-rendering: pixelated). Every colour comes from a
// limited palette; a colour in between is a 4x4 Bayer dither of two palette colours, never a blend.
// Motion is on twos: read your tracks at px.time(t), which changes 12 times a second at 24 fps.
//
//   import { pixel, PALETTES } from "/_skill/runtime/styles/pixel.js";
//   const px = pixel("#art", { width: 180, height: 180, palette: PALETTES.meadow });
//   window.seek = (t) => px.frame(t, (g) => {
//     g.gradient(0, 0, 180, 120, ["#2e3f73", "#3f78c2", "#74b4e8"]);    // a dithered sky
//     g.circle(140, 40, 12, g.mix("#f7d046", "#f08a2e", (x, y) => (y - 34) / 18));
//     g.text("HELLO", 8, 8, "#f6f4ea", { scale: 2, shadow: "#1b1b2f" });
//   });
//
// The page sizes the canvas with CSS (width: 1080px; height: 1080px); pick a framebuffer that
// divides the video size exactly, so every art pixel is the same whole number of screen pixels.
// Render with --sub 1: motion blur would blend two drawings on the frames where they change.
//
// The 5x7 font (FONT) is ported from cth9191/animate's pixel kit, MIT License,
// Copyright (c) 2026 cth9191 (see NOTICE in this folder). The rest is a separate implementation.

import { stepOf, stepTime, canvasOf, rgbOf } from "./common.js";

// Palettes, darkest first. Use one per piece; the frame rejects colours that are not in it.
export const PALETTES = {
  // 16 colours for daylight scenes: sky, grass, soil, sun and flowers, plus ink and cream.
  meadow: [
    "#1b1b2f", "#2e3f73", "#3f78c2", "#74b4e8", "#b7e2f3", "#f6f4ea", "#c3c9d6", "#2f6d3c",
    "#4f9e45", "#93cf4f", "#5a3524", "#8a5a37", "#f7d046", "#f08a2e", "#e2486b", "#f7a6c0",
  ],
  // Four greens, like an early handheld.
  handheld: ["#10261a", "#2f5d3a", "#84a94a", "#d0dd8e"],
  // Eight colours for night scenes and title cards.
  dusk: ["#120e1c", "#2a1f3d", "#4b3a6b", "#7d5ba6", "#e0678f", "#f4a259", "#f9dc8a", "#fdf6e3"],
};

// 4x4 Bayer thresholds in (0, 1): a pixel takes the second colour where the mix beats its threshold.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

// 5x7 glyphs, one number per row, bit 16 = the left column. Upper case, digits and common marks;
// lower case draws as upper case. Each glyph advances 6 pixels.
export const FONT = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  ".": [0, 0, 0, 0, 0, 12, 12], ",": [0, 0, 0, 0, 12, 4, 8], "!": [4, 4, 4, 4, 4, 0, 4], "?": [14, 17, 1, 2, 4, 0, 4],
  ":": [0, 12, 12, 0, 12, 12, 0], "-": [0, 0, 0, 31, 0, 0, 0], "+": [0, 4, 4, 31, 4, 4, 0], "/": [1, 1, 2, 4, 8, 16, 16],
  "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0], ">": [8, 4, 2, 1, 2, 4, 8], "<": [2, 4, 8, 16, 8, 4, 2],
  "*": [0, 4, 21, 14, 21, 4, 0], "=": [0, 0, 31, 0, 31, 0, 0], "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8],
  "#": [10, 10, 31, 10, 31, 10, 10], "%": [24, 25, 2, 4, 8, 19, 3], _: [0, 0, 0, 0, 0, 0, 31], $: [4, 15, 20, 14, 5, 30, 4],
};

export function pixel(target, options = {}) {
  const canvas = canvasOf(target, "pixel");
  // loop: seconds, for a seamless loop (the drawing count wraps, so the last frame pairs with frame 0)
  const { width = 180, height = 180, palette = PALETTES.meadow, fps = 24, every = 2, loop, background = 0 } = options;
  canvas.width = width;
  canvas.height = height;
  canvas.style.imageRendering = "pixelated";
  const W = width, H = height;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(W, H);
  const out32 = new Uint32Array(image.data.buffer);
  const buf = new Uint8Array(W * H);

  // Palette lookups: hex -> index, and index -> a packed RGBA word for the framebuffer.
  const index = new Map();
  const rgba = new Uint32Array(palette.length);
  const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  palette.forEach((hex, i) => {
    const [r, g, b] = rgbOf(hex);
    index.set(hex.toLowerCase(), i);
    rgba[i] = little ? ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
  });
  if (palette.length > 255) throw new Error("pixel: a palette has at most 255 colours");

  // A colour argument is a palette hex, a palette index, null (draw nothing), or a paint from
  // g.mix(): a function of (x, y) that returns a palette index.
  function paintOf(c) {
    if (c == null) return null;
    if (typeof c === "function") return c;
    if (typeof c === "number") {
      if (!(c >= 0 && c < palette.length)) throw new Error(`pixel: no palette index ${c}`);
      return c;
    }
    const i = index.get(String(c).toLowerCase());
    if (i === undefined) throw new Error(`pixel: ${c} is not in the palette (${palette.join(" ")})`);
    return i;
  }
  const set = (x, y, p) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const v = typeof p === "number" ? p : p(x, y);
    if (v >= 0) buf[y * W + x] = v;
  };
  function span(x0, x1, y, p) { // pixels [x0, x1) on row y
    if (y < 0 || y >= H) return;
    x0 = Math.max(0, x0); x1 = Math.min(W, x1);
    if (x1 <= x0) return;
    if (typeof p === "number") buf.fill(p, y * W + x0, y * W + x1);
    else for (let x = x0; x < x1; x++) { const v = p(x, y); if (v >= 0) buf[y * W + x] = v; }
  }

  let current = { t: 0, step: 0, time: 0 };
  const g = {
    width: W, height: H,
    get t() { return current.time; },      // the stepped time: read tracks here
    get step() { return current.step; },
    get raw() { return current.t; },       // the unstepped time
    bayer,
    // The palette index of a colour, for paint functions: (x, y) => index.
    index: (c) => paintOf(c),
    // A dither of two palette colours: cB where f beats the Bayer threshold, else cA. f is a
    // number 0..1 or a function (x, y) => 0..1, so one call shades a whole shape.
    mix(cA, cB, f) {
      const a = paintOf(cA), b = paintOf(cB);
      const pick = (p, x, y) => (p === null ? -1 : typeof p === "number" ? p : p(x, y)); // null: leave the pixel
      if (typeof f === "number") return (x, y) => pick(f > bayer(x, y) ? b : a, x, y);
      return (x, y) => pick(f(x, y) > bayer(x, y) ? b : a, x, y);
    },
    clear(c = background) { buf.fill(paintOf(c) ?? 0); },
    pset(x, y, c) { const p = paintOf(c); if (p !== null) set(Math.round(x), Math.round(y), p); },
    get(x, y) { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= W || y >= H ? -1 : buf[y * W + x]; },
    rect(x, y, w, h, c) {
      const p = paintOf(c);
      if (p === null) return;
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      for (let j = y; j < y + h; j++) span(x, x + w, j, p);
    },
    // A filled ellipse around a whole pixel: radius r spans 2r + 1 pixels. { ring: n } draws only
    // the outer n pixels.
    ellipse(cx, cy, rx, ry, c, { ring = 0 } = {}) {
      const p = paintOf(c);
      if (p === null) return;
      cx = Math.round(cx); cy = Math.round(cy); rx = Math.max(0, Math.round(rx)); ry = Math.max(0, Math.round(ry));
      const A = rx + 0.5, B = ry + 0.5;
      const half = (a, b, j) => Math.floor(a * Math.sqrt(Math.max(0, 1 - (j / b) ** 2)) + 1e-9);
      for (let j = -ry; j <= ry; j++) {
        const hw = half(A, B, j);
        const inner = ring && A - ring > 0 && Math.abs(j) < B - ring ? half(A - ring, B - ring, j) : -1;
        if (inner < 0) span(cx - hw, cx + hw + 1, cy + j, p);
        else { span(cx - hw, cx - inner, cy + j, p); span(cx + inner + 1, cx + hw + 1, cy + j, p); }
      }
    },
    circle(cx, cy, r, c, o) { g.ellipse(cx, cy, r, r, c, o); },
    // A filled polygon: every pixel whose centre is inside (even-odd). Points may be fractional.
    poly(points, c) {
      const p = paintOf(c);
      if (p === null || points.length < 3) return;
      let y0 = Infinity, y1 = -Infinity;
      for (const [, y] of points) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const n = points.length;
      for (let j = Math.max(0, Math.floor(y0)); j <= Math.min(H - 1, Math.ceil(y1)); j++) {
        const yc = j + 0.5, xs = [];
        for (let k = 0; k < n; k++) {
          const [ax, ay] = points[k], [bx, by] = points[(k + 1) % n];
          if ((ay <= yc) !== (by <= yc)) xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) span(Math.ceil(xs[k] - 0.5), Math.ceil(xs[k + 1] - 0.5), j, p);
      }
    },
    // A Bresenham line between whole pixels, `width` pixels thick (a square brush).
    line(x0, y0, x1, y1, c, { width: w = 1 } = {}) {
      const p = paintOf(c);
      if (p === null) return;
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      const o = Math.floor((w - 1) / 2);
      let e = dx + dy;
      for (let guard = 0; guard < 4096; guard++) {
        for (let j = 0; j < w; j++) span(x0 - o, x0 - o + w, y0 - o + j, p);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    },
    // A polyline through points, for stems and paths.
    path(points, c, opts) {
      for (let i = 1; i < points.length; i++) g.line(...points[i - 1], ...points[i], c, opts);
    },
    // A dithered gradient through palette colours, top to bottom ({ dir: "h" }: left to right).
    // `ease` reshapes the 0..1 position.
    gradient(x, y, w, h, colors, { dir = "v", ease = (u) => u } = {}) {
      const ps = colors.map(paintOf), last = ps.length - 1;
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      const L = dir === "h" ? w : h;
      for (let j = y; j < y + h; j++) {
        for (let i = x; i < x + w; i++) {
          const k = dir === "h" ? i - x : j - y;
          const u = Math.max(0, Math.min(1, ease(L > 1 ? k / (L - 1) : 0))) * last;
          const a = Math.min(last, Math.floor(u)), f = u - a;
          const p = f > bayer(i, j) && a < last ? ps[a + 1] : ps[a];
          set(i, j, p);
        }
      }
    },
    // A dithered halo: density `amount` at radius r0, thinning to nothing at r1.
    glow(cx, cy, r0, r1, c, amount = 0.5) {
      const p = paintOf(c);
      if (p === null) return;
      cx = Math.round(cx); cy = Math.round(cy);
      const R = Math.ceil(r1);
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const d = Math.hypot(i, j);
        if (d < r0 || d > r1) continue;
        if (amount * (1 - (d - r0) / (r1 - r0)) > bayer(cx + i, cy + j)) set(cx + i, cy + j, p);
      }
    },
    // Text in the 5x7 font, top-left at (x, y). scale is a whole number. count shows only the
    // first count glyphs (typing); cursor draws a block after them that blinks on the step.
    text(str, x, y, c, { scale = 1, align = "left", shadow, count, cursor } = {}) {
      const s = String(str).toUpperCase(), sc = Math.max(1, Math.round(scale));
      const shown = Math.max(0, Math.min(s.length, Math.floor(count ?? s.length)));
      const tw = g.textWidth(s, sc);
      const x0 = Math.round(x - (align === "center" ? Math.floor(tw / 2) : align === "right" ? tw : 0)), y0 = Math.round(y);
      const draw = (ox, oy, col) => {
        const p = paintOf(col);
        for (let k = 0; k < shown; k++) {
          const rows = FONT[s[k]] ?? FONT["?"];
          for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) {
            if (rows[r] & (16 >> b)) for (let j = 0; j < sc; j++) span(ox + (k * 6 + b) * sc, ox + (k * 6 + b + 1) * sc, oy + r * sc + j, p);
          }
        }
      };
      if (shadow) draw(x0 + sc, y0 + sc, shadow);
      draw(x0, y0, c);
      if (cursor && shown < s.length && current.step % 4 < 2) g.rect(x0 + shown * 6 * sc, y0, 5 * sc, 7 * sc, cursor === true ? c : cursor);
      return tw;
    },
    textWidth: (str, scale = 1) => Math.max(0, String(str).length * 6 * scale - scale),
    // A sprite from rows of characters: map { X: "#hex" }; "." and " " are clear. anchor "tl"
    // (top-left), "c" (centre) or "bc" (bottom centre, to stand it on a floor).
    sprite(rows, map, x, y, { flip = false, scale = 1, anchor = "tl" } = {}) {
      const sc = Math.max(1, Math.round(scale)), w = rows[0].length, h = rows.length;
      let x0 = Math.round(x), y0 = Math.round(y);
      if (anchor === "c") { x0 -= Math.floor((w * sc) / 2); y0 -= Math.floor((h * sc) / 2); }
      if (anchor === "bc") { x0 -= Math.floor((w * sc) / 2); y0 -= h * sc; }
      const paints = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, paintOf(v)]));
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ch = rows[j][flip ? w - 1 - i : i];
        const p = paints[ch];
        if (p == null) continue;
        for (let dy = 0; dy < sc; dy++) span(x0 + i * sc, x0 + (i + 1) * sc, y0 + j * sc + dy, p);
      }
      return [w * sc, h * sc];
    },
    // Draw anything with a 2D context on a framebuffer-sized canvas, then snap it into the palette
    // with an ordered dither (`spread` is how far the dither reaches, in RGB levels). Pixels under
    // half alpha are left alone. For things the primitives cannot draw; prefer the primitives.
    canvas(fn, { spread = 40 } = {}) {
      scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
      scratchCtx.clearRect(0, 0, W, H);
      fn(scratchCtx);
      const d = scratchCtx.getImageData(0, 0, W, H).data;
      for (let i = 0; i < W * H; i++) {
        if (d[i * 4 + 3] < 128) continue;
        const o = (bayer(i % W, (i / W) | 0) - 0.5) * spread;
        buf[i] = nearest(d[i * 4] + o, d[i * 4 + 1] + o, d[i * 4 + 2] + o);
      }
    },
  };

  const pal = palette.map(rgbOf);
  function nearest(r, gg, b) {
    let best = 0, bd = Infinity;
    pal.forEach(([pr, pg, pb], i) => {
      const e = (r - pr) ** 2 * 0.3 + (gg - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
      if (e < bd) { bd = e; best = i; }
    });
    return best;
  }
  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = W; scratchCanvas.height = H;
  const scratchCtx = scratchCanvas.getContext("2d", { willReadFrequently: true });

  const stats = { frames: 0, last: 0, totalMs: 0 };
  return {
    width: W, height: H, palette, stats,
    time: (t) => stepTime(t, { fps, every, loop }),
    step: (t) => stepOf(t, { fps, every, loop }),
    // Draw one frame. draw(g) gets the primitives above; g.t is the stepped time.
    frame(t, draw) {
      const t0 = performance.now();
      current = { t, step: stepOf(t, { fps, every, loop }), time: stepTime(t, { fps, every, loop }) };
      buf.fill(paintOf(background) ?? 0);
      draw(g);
      for (let i = 0; i < W * H; i++) out32[i] = rgba[buf[i]];
      ctx.putImageData(image, 0, 0);
      const ms = performance.now() - t0;
      stats.frames++; stats.last = ms; stats.totalMs += ms;
    },
  };
}
