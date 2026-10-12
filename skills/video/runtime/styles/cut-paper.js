// cut-paper.js: cut-paper collage for seek(t) pages.
//
// Every shape is a piece of coloured paper laid on the ones below it: scissor-cut (or torn) edges,
// a soft drop shadow that grows with the piece's height above the table, paper grain, a little light
// along the cut edge, and a slight hand-placed tilt. Drawn lines (veins, stems, marks) are crayon,
// and they boil: they re-wobble on every new drawing, Math.round(t * fps / 2), on twos.
//
//   import { cutPaper, PAPERS } from "/_skill/runtime/styles/cut-paper.js";
//   import { circle } from "/_skill/runtime/styles/common.js";
//   const cp = cutPaper("#art", { seed: "story" });
//   window.seek = (t) => cp.frame(t, (s) => {
//     s.sheet(PAPERS.sky);                                         // the base sheet, full bleed
//     s.piece(circle(800, 320, 90), PAPERS.marigold, { key: "sun", z: 1 });
//     s.line([[540, 780], [540, 600]], PAPERS.forest, { key: "stem", width: 6 });
//     s.text("Grow", 80, 160, PAPERS.navy, { size: 96, key: "title" });
//   });
//
// Pieces stack in the order you draw them. `z` is how far a piece sits above what is under it, in
// sheets: 1 for a piece glued flat, 2-4 for one lifted (a falling leaf). Read tracks at s.t, the
// stepped time, so motion steps with the boil. Give every piece a `key`: its cut, tilt and grain are
// seeded from it, so it looks the same on every frame. Render with --fps 24 --sub 1.
//
// The cut-paper conventions (drop shadows, grain, torn edges, motion on twos) follow
// cth9191/animate's cut-paper kit (MIT, Copyright (c) 2026 cth9191); this is a separate implementation.

import { stepOf, stepTime, hash, signed, resample, transform, bounds, centroid, toPath, canvasOf, scratch } from "./common.js";
import { rand } from "../motion.js";

// Construction-paper colours. Warm, slightly dusty, never pure.
export const PAPERS = {
  white: "#fbf6ea", cream: "#f2e6cc", kraft: "#c99d6b", bark: "#7b5136", soil: "#5e3b28",
  tomato: "#e4553a", marigold: "#f3a42c", butter: "#f5d567", blush: "#f4a6b8", rose: "#dc4f72",
  sage: "#a7c49a", moss: "#6b9b4a", leaf: "#8cbf4f", forest: "#2f6a45",
  sky: "#a9d6e9", cobalt: "#3b66b2", navy: "#25305b", plum: "#5d3b60", charcoal: "#3a3633",
};

const DEG = Math.PI / 180;
const TILE = 256;

export function cutPaper(target, options = {}) {
  const canvas = canvasOf(target, "cutPaper");
  const W = (canvas.width = options.width ?? canvas.width);
  const H = (canvas.height = options.height ?? canvas.height);
  const {
    seed = "paper",
    fps = 24, every = 2,
    loop,                // seconds, for a seamless loop: the boil wraps with it
    light = [-0.45, -1], // towards the light: up and a little left, so shadows fall down-right
    shadow = 1,          // shadow strength (0 = none)
    grain = 1,           // paper grain (0 = flat colour)
    boil = 1,            // how much lines (and, a third as much, edges) re-wobble each drawing
    facet = 16,          // length of each straight scissor cut along a curve, in px
    tilt = 0.6,          // the largest hand-placed tilt of a piece, in degrees
  } = options;
  const ctx = canvas.getContext("2d");
  const L = Math.hypot(light[0], light[1]) || 1;
  const away = [-light[0] / L, -light[1] / L]; // the direction shadows fall

  // ---- paper grain: one tile, seeded, made once; each piece reads it at its own offset ----
  const tile = (() => {
    const { c, g } = scratch(TILE, TILE, true);
    const next = rand(`${seed}:grain`);
    const img = g.createImageData(TILE, TILE);
    for (let i = 0; i < TILE * TILE; i++) { // the tooth: tiny light and dark specks
      const v = next(), a = next();
      const light = v < 0.5;
      img.data.set(light ? [255, 252, 240, Math.round(a * 22)] : [60, 40, 20, Math.round(a * 20)], i * 4);
    }
    g.putImageData(img, 0, 0);
    g.lineCap = "round";
    for (let i = 0; i < 70; i++) { // fibres, wrapped so the tile repeats without a seam
      let x = next() * TILE, y = next() * TILE, a = next() * Math.PI * 2;
      const len = 6 + next() * 16, bend = (next() - 0.5) * 0.8, lightFibre = next() < 0.6;
      g.strokeStyle = lightFibre ? `rgba(255,250,235,${(0.18 + next() * 0.2).toFixed(3)})` : `rgba(70,45,25,${(0.08 + next() * 0.1).toFixed(3)})`;
      g.lineWidth = 0.6 + next() * 0.7;
      for (const [ox, oy] of [[0, 0], [-TILE, 0], [0, -TILE], [-TILE, -TILE]]) {
        let px = x + ox, py = y + oy, pa = a;
        g.beginPath();
        g.moveTo(px, py);
        for (let j = 0; j < 5; j++) { pa += bend; px += (Math.cos(pa) * len) / 5; py += (Math.sin(pa) * len) / 5; g.lineTo(px, py); }
        g.stroke();
      }
    }
    for (let i = 0; i < 120; i++) { // flecks of something darker in the pulp
      g.fillStyle = `rgba(70,45,25,${(0.1 + next() * 0.18).toFixed(3)})`;
      const s = 0.6 + next() * 1.1;
      g.fillRect(next() * TILE, next() * TILE, s, s);
    }
    return ctx.createPattern(c, "repeat");
  })();

  // ---- edges ----
  // A smooth seeded wobble along an outline: one value every `span` points, eased between.
  const along = (i, span, ...k) => {
    const j = Math.floor(i / span), f = i / span - j, s = f * f * (3 - 2 * f);
    return signed(...k, j) * (1 - s) + signed(...k, j + 1) * s;
  };
  const area2 = (P) => P.reduce((a, [x, y], i) => { const [nx, ny] = P[(i + 1) % P.length]; return a + x * ny - nx * y; }, 0);
  // Push each point along its outward normal by d(i).
  function offset(P, d) {
    const n = P.length, out = area2(P) > 0 ? 1 : -1; // y points down, so a positive area runs clockwise
    return P.map((p, i) => {
      const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
      let nx = (b[1] - a[1]) * out, ny = (a[0] - b[0]) * out;
      const l = Math.hypot(nx, ny) || 1;
      const k = d(i) / l;
      return [p[0] + nx * k, p[1] + ny * k];
    });
  }
  // Scissors: straight cuts about `facet` long, each a little off the drawn line; on every new
  // drawing the cuts shift a fraction of a pixel, as a re-cut piece would.
  function scissor(P, key, f) {
    const Q = resample(P, f, true);
    return offset(Q, (i) => 0.9 * signed(seed, key, "cut", i) + boil * 0.35 * signed(seed, key, "boil", i, current.step));
  }
  // A tear: a ragged edge every 4 px, with the paper's pale core showing as a fringe outside it.
  function tear(P, key, rough, withFringe = true) {
    const Q = resample(P, 4, true);
    const edge = (i) => rough * (1.7 * along(i, 7, seed, key, "tear") + 0.6 * signed(seed, key, "fray", i))
      + boil * 0.3 * signed(seed, key, "boil", i, current.step);
    const inner = offset(Q, edge);
    const fringe = withFringe ? offset(Q, (i) => edge(i) + rough * (1.2 + 1.1 * Math.abs(along(i, 5, seed, key, "core")))) : null;
    return { inner, fringe };
  }

  // ---- transforms: groups move whole assemblies; points are transformed before cutting, so cuts
  // and shadows stay the same size and the light keeps its direction ----
  let matrix = [1, 0, 0, 1, 0, 0];
  const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  function matrixOf({ x = 0, y = 0, rotate = 0, scale = 1, origin = [0, 0] } = {}) {
    const [sx, sy] = Array.isArray(scale) ? scale : [scale, scale];
    const c = Math.cos(rotate * DEG), s = Math.sin(rotate * DEG);
    const [ox, oy] = origin;
    // translate(x + origin) . rotate . scale . translate(-origin)
    const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
    return [a, b, cc, d, x + ox - (a * ox + cc * oy), y + oy - (b * ox + d * oy)];
  }
  // A piece's own transform turns and scales it about its centre unless it names an origin.
  const place = (P, o) => {
    const own = o && (o.x || o.y || o.rotate || (o.scale ?? 1) !== 1);
    const m = own ? mul(matrix, matrixOf({ ...o, origin: o.origin ?? centroid(P) })) : matrix;
    return P.map((p) => apply(m, p));
  };
  const angleOf = (m) => Math.atan2(m[1], m[0]) / DEG;
  const scaleOf = (m) => Math.hypot(m[0], m[1]);

  // ---- light and shadow ----
  function lift(z) {
    if (!(z > 0) || !(shadow > 0)) return null;
    const d = 1.5 + 2.6 * z;
    return {
      color: `rgba(45,28,14,${Math.min(0.5, (0.18 + 0.035 * z) * shadow).toFixed(3)})`,
      blur: 3 + 4.5 * z, dx: away[0] * d, dy: away[1] * d,
    };
  }
  function withShadow(z, fn) {
    const sh = lift(z);
    ctx.save();
    if (sh) Object.assign(ctx, { shadowColor: sh.color, shadowBlur: sh.blur, shadowOffsetX: sh.dx, shadowOffsetY: sh.dy });
    fn();
    ctx.restore();
  }
  function grainIn(key, amount = 1, box = { x0: 0, y0: 0, x1: W, y1: H }) {
    if (!(grain * amount > 0)) return;
    tile.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(hash(seed, key, "gx") * TILE), Math.floor(hash(seed, key, "gy") * TILE)]));
    ctx.globalAlpha = Math.min(1, grain * amount);
    ctx.fillStyle = tile;
    ctx.fillRect(box.x0 - 2, box.y0 - 2, box.x1 - box.x0 + 4, box.y1 - box.y0 + 4);
    ctx.globalAlpha = 1;
  }
  // Light catches the cut edge that faces it, and the far edge falls into its own shade.
  function edgeLight(path, strength = 1) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.translate(away[0] * 1.3, away[1] * 1.3);
    ctx.strokeStyle = `rgba(255,251,240,${(0.32 * strength).toFixed(3)})`;
    ctx.lineWidth = 2.6;
    ctx.stroke(path);
    ctx.translate(-away[0] * 2.6, -away[1] * 2.6);
    ctx.strokeStyle = `rgba(40,25,10,${(0.13 * strength).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke(path);
    ctx.restore();
  }

  let current = { t: 0, step: 0, time: 0 };
  let count = 0;
  const { c: textCanvas, g: tg } = scratch(W, H);

  const s = {
    width: W, height: H,
    get t() { return current.time; },  // the stepped time: read tracks here
    get step() { return current.step; },
    get raw() { return current.t; },
    // The base sheet: a full-bleed colour with grain and no shadow.
    sheet(color, { key = "sheet" } = {}) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, H);
      grainIn(key, 0.9);
    },
    // A paper piece. shape: closed points [[x, y], ...]. o: key, z (height, default 1), edge
    // "cut" | "torn" | "clean", facet, rough and fringe (torn: false hides the pale torn core),
    // x, y, rotate, scale, origin (a transform),
    // tilt (override the hand-placed tilt, degrees), pattern(ctx, box) (drawn inside), grain.
    piece(shape, color, o = {}) {
      const key = o.key ?? `${color}#${count++}`;
      let P = place(shape, o);
      // hand-placed: a seeded tilt, and a hair of movement on each new drawing
      const tl = (o.tilt ?? tilt * signed(seed, key, "tilt")) + boil * 0.12 * signed(seed, key, "wob", current.step);
      if (tl) P = transform(P, { rotate: tl, origin: centroid(P) });
      const edge = o.edge ?? "cut";
      let Q, fringe = null;
      if (edge === "torn") ({ inner: Q, fringe } = tear(P, key, o.rough ?? 1, o.fringe ?? true));
      else if (edge === "cut") Q = scissor(P, key, o.facet ?? facet);
      else Q = P;
      const path = toPath(Q);
      if (fringe) {
        const fp = toPath(fringe);
        withShadow(o.z ?? 1, () => { ctx.fillStyle = mixWhite(color, 0.72); ctx.fill(fp); });
        ctx.fillStyle = color;
        ctx.fill(path);
      } else {
        withShadow(o.z ?? 1, () => { ctx.fillStyle = color; ctx.fill(path); });
      }
      ctx.save();
      ctx.clip(path);
      const box = bounds(Q);
      if (o.pattern) { ctx.save(); o.pattern(ctx, box); ctx.restore(); }
      grainIn(key, o.grain ?? 1, box);
      if (edge !== "torn") edgeLight(path, o.light ?? 1);
      ctx.restore();
      return Q;
    },
    // A paper strip along a path (stems, ribbons): `width` at the start, `end` at the finish.
    strip(points, width, color, o = {}) {
      const P = resample(points, Math.max(4, width / 2), false);
      const n = P.length, w0 = width, w1 = o.end ?? width;
      const left = [], right = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
        let nx = a[1] - b[1], ny = b[0] - a[0];
        const l = Math.hypot(nx, ny) || 1, hw = (w0 + (w1 - w0) * (i / Math.max(1, n - 1))) / 2;
        nx /= l; ny /= l;
        left.push([p[0] + nx * hw, p[1] + ny * hw]);
        right.push([p[0] - nx * hw, p[1] - ny * hw]);
      });
      return s.piece([...left, ...right.reverse()], color, { facet: Math.max(8, width), ...o });
    },
    // A crayon line along points. It boils: every new drawing (on twos) re-wobbles it.
    line(points, color, { key, width = 5, wobble = 1.4, closed = false, alpha = 1 } = {}) {
      key ??= `line:${color}#${count++}`;
      const P = place(points);
      const pass = (k, w, a, shift) => {
        const Q = resample(P, 7, closed);
        const n = Q.length;
        const W2 = Q.map((p, i) => {
          const pa = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], pb = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
          let nx = pa[1] - pb[1], ny = pb[0] - pa[0];
          const l = Math.hypot(nx, ny) || 1;
          const d = wobble * boil * along(i, 4, seed, key, k, current.step) + shift;
          return [p[0] + (nx / l) * d, p[1] + (ny / l) * d];
        });
        ctx.save();
        Object.assign(ctx, { strokeStyle: color, lineWidth: w, lineCap: "round", lineJoin: "round", globalAlpha: a * alpha });
        ctx.stroke(toPath(W2, closed));
        ctx.restore();
      };
      pass("a", width, 0.92, 0);
      pass("b", width * 0.5, 0.55, width * 0.18); // a second, lighter pass that does not quite agree
    },
    // Cut-out letters: each letter its own piece, tilted by hand, with its own shadow and grain.
    // o: size, font (family), weight, key, align, tracking (em), tilt (degrees), z.
    text(str, x, y, color, o = {}) {
      const { size = 64, font = "Nunito Sans", weight = 700, align = "left", tracking = 0.02, z = 1 } = o;
      const key = o.key ?? `text:${str}`;
      const sc = scaleOf(matrix);
      const fsize = size * sc;
      const css = `${weight} ${fsize}px "${font}", sans-serif`;
      tg.font = css;
      const widths = [...str].map((_, i) => tg.measureText(str.slice(0, i)).width + i * tracking * fsize);
      const total = tg.measureText(str).width + (str.length - 1) * tracking * fsize;
      const [ax, ay] = apply(matrix, [x, y]);
      const rot = angleOf(matrix) * DEG;
      const x0 = align === "center" ? -total / 2 : align === "right" ? -total : 0;
      const maxTilt = o.tilt ?? 3;
      const pad = fsize * 0.6;
      const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      tg.save();
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.clearRect(0, 0, W, H);
      tg.textBaseline = "alphabetic";
      [...str].forEach((ch, i) => {
        if (ch === " ") return;
        const cw = tg.measureText(ch).width;
        const tiltI = (maxTilt * signed(seed, key, "tilt", i) + boil * 0.5 * signed(seed, key, "wob", i, current.step)) * DEG;
        const dy = fsize * 0.05 * signed(seed, key, "dy", i);
        const grow = 1 + 0.05 * signed(seed, key, "size", i);  // cut by hand: no two letters the same size
        // centre of this letter, in page space
        const lx = x0 + widths[i] + cw / 2, ly = -fsize * 0.36 + dy;
        const cx = ax + lx * Math.cos(rot) - ly * Math.sin(rot), cy = ay + lx * Math.sin(rot) + ly * Math.cos(rot);
        const draw = (fill, dx, dy2) => {
          tg.save();
          tg.translate(cx + dx, cy + dy2);
          tg.rotate(rot + tiltI);
          tg.scale(grow, grow);
          tg.fillStyle = fill;
          tg.fillText(ch, -cw / 2, fsize * 0.36);
          tg.restore();
        };
        tg.globalCompositeOperation = "source-over";
        draw(mixWhite(color, 0.5), 0, 0);             // the lit edge...
        tg.globalCompositeOperation = "source-atop";
        draw(color, away[0] * 2, away[1] * 2);        // ...left showing where the letter faces the light
        box.x0 = Math.min(box.x0, cx - cw / 2 - pad); box.x1 = Math.max(box.x1, cx + cw / 2 + pad);
        box.y0 = Math.min(box.y0, cy - fsize); box.y1 = Math.max(box.y1, cy + fsize);
      });
      if (box.x1 < box.x0) { tg.restore(); return 0; }
      // grain on the letters only
      tg.globalCompositeOperation = "source-atop";
      tile.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(hash(seed, key, "gx") * TILE), 0]));
      tg.globalAlpha = Math.min(1, grain);
      tg.fillStyle = tile;
      tg.fillRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      tg.restore();
      const bx = Math.max(0, Math.floor(box.x0)), by = Math.max(0, Math.floor(box.y0));
      const bw = Math.min(W, Math.ceil(box.x1)) - bx, bh = Math.min(H, Math.ceil(box.y1)) - by;
      if (bw > 0 && bh > 0) withShadow(z, () => ctx.drawImage(textCanvas, bx, by, bw, bh, bx, by, bw, bh));
      return total / sc;
    },
    measure(str, { size = 64, font = "Nunito Sans", weight = 700, tracking = 0.02 } = {}) {
      tg.font = `${weight} ${size}px "${font}", sans-serif`;
      return tg.measureText(str).width + (str.length - 1) * tracking * size;
    },
    // Move, rotate (degrees) and scale everything drawn inside fn, as one assembly.
    group(tf, fn) {
      const saved = matrix;
      matrix = mul(matrix, matrixOf(tf));
      try { fn(); } finally { matrix = saved; }
    },
    // The raw 2D context, for anything else (draw it as paper: flat colour, then s.grain(key)).
    ctx,
    grain: (key) => grainIn(key),
  };

  const stats = { frames: 0, last: 0, totalMs: 0 };
  return {
    width: W, height: H, stats,
    time: (t) => stepTime(t, { fps, every, loop }),
    step: (t) => stepOf(t, { fps, every, loop }),
    frame(t, draw) {
      const t0 = performance.now();
      current = { t, step: stepOf(t, { fps, every, loop }), time: stepTime(t, { fps, every, loop }) };
      count = 0;
      matrix = [1, 0, 0, 1, 0, 0];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      draw(s);
      const ms = performance.now() - t0;
      stats.frames++; stats.last = ms; stats.totalMs += ms;
    },
  };
}

// Patterns to print on a piece: piece(shape, color, { pattern: stripes("#fff6", 8, 24, 30) }).
export const stripes = (color, width, gap, angle = 0) => (ctx, box) => {
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, R = Math.hypot(box.w, box.h) / 2 + gap;
  ctx.translate(cx, cy);
  ctx.rotate(angle * DEG);
  ctx.fillStyle = color;
  for (let x = -R; x < R; x += gap) ctx.fillRect(x, -R, width, 2 * R);
};
export const dots = (color, r, gap) => (ctx, box) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let y = box.y0, row = 0; y < box.y1 + gap; y += gap, row++) {
    for (let x = box.x0 + (row % 2) * (gap / 2); x < box.x1 + gap; x += gap) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
  }
  ctx.fill();
};

function mixWhite(hex, p) {
  const n = parseInt(hex.slice(1, 7), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * p));
  return `rgb(${c.join(",")})`;
}
