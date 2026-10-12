// riso.js: a risograph print, drawn fresh for every frame of a seek(t) page.
//
// A frame is a sheet of paper run through three ink plates. You draw shapes with plate tones (how
// much of each ink goes there, 0..1). The print pass screens each plate into halftone dots at its
// own angle (15°, 75° and 45° by default), multiplies the inks over the paper, and prints each
// plate a few pixels off register. There is no black ink and no white ink: darks are two or three
// inks overprinted, and white is the paper showing through.
//
//   import { riso, INKS } from "/_skill/runtime/styles/riso.js";
//   const press = riso("#art", { seed: "poster" });   // aqua, fluorescent pink and yellow
//   window.seek = (t) => press.frame(t, (p) => {
//     p.flood({ aqua: p.linear(0, 0, 0, 700, [[0, 0.5], [1, 0.1]]) });  // a screened sky
//     p.fill(circle(800, 320, 90), { pink: 0.5, yellow: 1 });            // pink over yellow prints orange
//     p.text("Grow", 80, 160, { pink: 1 }, { font: "900 120px Geist" });
//   });
//
// Fills knock out what is under them on every plate (a shape with { pink: 1 } leaves paper on the
// other plates); pass { over: true } to overprint instead. Lines overprint by default.
// The screen is fixed to the sheet, as on a printed flipbook: a moving shape moves through the dots.
// Registration and ink texture change on twos (stepOf), cycling through `variants` prints, so the
// picture shimmers like a stack of real prints without crawling.
//
// Cost: the print pass touches every pixel of every plate in JavaScript, about 40-90 ms a frame at
// 1080x1080 on a laptop. press.stats has the breakdown. Render with --sub 1: motion blur would
// smear the dots.
//
// The overprint model, the 15/75/45° screen angles and the idea of a per-plate dot law come from
// cth9191/animate's riso kit (MIT, Copyright (c) 2026 cth9191); this is a separate implementation.

import { stepOf, hash, signed, toPath, canvasOf, scratch, rgbOf } from "./common.js";
import { rand } from "../motion.js";

// Approximate on-screen values commonly published for Riso inks.
export const INKS = {
  aqua: "#5ec8e5", fluorescentPink: "#ff48b0", yellow: "#ffe800", teal: "#00838a", blue: "#0078bf",
  mediumBlue: "#3255a4", federalBlue: "#3d5588", brightRed: "#f15060", orange: "#ff6c2f",
  green: "#00a95c", sunflower: "#ffb511", mint: "#82d8d5", coral: "#ff8e91", purple: "#765ba7",
  burgundy: "#914e72", flatGold: "#bb8b41", black: "#000000",
};

const DEFAULT_INKS = [
  { name: "aqua", color: INKS.aqua, angle: 15 },
  { name: "pink", color: INKS.fluorescentPink, angle: 75 },
  { name: "yellow", color: INKS.yellow, angle: 45 },
];
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const SOLID = 250; // plate values at or above this print solid, with no screen: crisp type and fills
const MARGIN = 32; // ink-texture margin, so each print variant can read it at its own offset

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const gray = (v) => { const u = Math.round(clamp01(v) * 255); return `rgb(${u},${u},${u})`; };

// Dot radius (in cells) that covers `a` of a cell: a circle clipped to the square once it passes
// the cell's edge, so tones above 79% join into a solid with star-shaped holes, as real dots do.
function dotRadii() {
  const area = (r) => (r <= 0.5 ? Math.PI * r * r
    : Math.PI * r * r - 4 * (r * r * Math.acos(0.5 / r) - 0.5 * Math.sqrt(r * r - 0.25)));
  return Float32Array.from({ length: 256 }, (_, d) => {
    const want = d / 255;
    let lo = 0, hi = Math.SQRT1_2;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (area(mid) < want) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  });
}

// Smooth value noise in [0, 1] on a w x h grid, with features about `cell` pixels across.
function valueNoise(next, w, h, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const grid = Float32Array.from({ length: gw * gh }, next);
  const out = new Float32Array(w * h);
  const s = (u) => u * u * (3 - 2 * u);
  for (let y = 0; y < h; y++) {
    const gy = y / cell, j = Math.floor(gy), fy = s(gy - j);
    for (let x = 0; x < w; x++) {
      const gx = x / cell, i = Math.floor(gx), fx = s(gx - i), k = j * gw + i;
      const a = grid[k] + (grid[k + 1] - grid[k]) * fx;
      const b = grid[k + gw] + (grid[k + gw + 1] - grid[k + gw]) * fx;
      out[y * w + x] = a + (b - a) * fy;
    }
  }
  return out;
}

export function riso(target, options = {}) {
  const canvas = canvasOf(target, "riso");
  const W = (canvas.width = options.width ?? canvas.width);
  const H = (canvas.height = options.height ?? canvas.height);
  const {
    inks = DEFAULT_INKS,
    paper = "#f3eee3",   // a warm uncoated stock
    pitch = 9,           // halftone cell size in pixels (an ink can set its own)
    misregister = 3,     // how far (px) each plate sits off the first ("key") plate
    jitter = 1,          // extra registration wander per print variant (px)
    variants = 3,        // distinct prints the shimmer cycles through
    fps = 24, every = 2, // the shimmer changes on twos
    loop,                // seconds, for a seamless loop: the prints cycle with it
    seed = "riso",
    grain = 1,           // ink mottle, grain and dropouts (0 = flat ink)
    fiber = 1,           // paper fibres and specks (0 = flat paper)
  } = options;
  if (!inks.length || inks.length > 4) throw new Error("riso: use one to four inks");

  const display = canvas.getContext("2d");
  const image = display.createImageData(W, H);
  const paperRGB = rgbOf(paper);
  const RAD = dotRadii();

  // ---- the plates: one grey canvas per ink; the value is how much ink (255 = solid) ----
  const plates = inks.map((ink, k) => {
    const name = ink.name;
    const rgb = rgbOf(ink.color);
    const angle = ink.angle ?? [15, 75, 45, 0][k];
    const ptch = ink.pitch ?? pitch;
    // Registration: the key plate (the first) is true; each other plate sits off it in its own
    // seeded direction, and wanders by up to `jitter` px from print to print.
    const off = Array.from({ length: variants }, (_, v) => {
      if (k === 0) return [0, 0];
      const a = hash(seed, "reg", k) * TAU, m = misregister * (0.6 + 0.4 * hash(seed, "reg-size", k));
      return [Math.round(Math.cos(a) * m + signed(seed, "jit", k, v, "x") * jitter),
        Math.round(Math.sin(a) * m + signed(seed, "jit", k, v, "y") * jitter)];
    });
    const texOff = Array.from({ length: variants }, (_, v) =>
      [Math.floor(hash(seed, "tex", k, v, "x") * 2 * MARGIN), Math.floor(hash(seed, "tex", k, v, "y") * 2 * MARGIN)]);
    const { c, g } = scratch(W, H, true);
    return {
      name, rgb, angle, pitch: ptch, off, texOff, c, g,
      cos: Math.cos(angle * DEG), sin: Math.sin(angle * DEG),
      // absorbance per channel: paper * (1 - coverage * absorb) prints the ink at full coverage
      absorb: rgb.map((v, i) => Math.max(0, 1 - v / Math.max(1, paperRGB[i]))),
    };
  });
  const names = new Set(plates.map((p) => p.name));

  // ---- the paper and the ink texture: static, seeded, made once ----
  const paperPix = makePaper();
  const MW = W + 2 * MARGIN, MH = H + 2 * MARGIN;
  const texture = plates.map((_, k) => makeInkTexture(k));

  function makePaper() {
    const { g } = scratch(W, H, true);
    const next = rand(`${seed}:paper`);
    const area = (W * H) / (1080 * 1080);
    g.fillStyle = paper;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90 * area * fiber; i++) { // mottle: soft, about one level either way
      const x = next() * W, y = next() * H, r = 60 + next() * 140;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, next() < 0.5 ? "rgba(255,255,255,0.03)" : "rgba(120,100,70,0.025)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.lineCap = "round";
    for (let i = 0; i < 260 * area * fiber; i++) { // fibres: short curly hairs, a shade darker
      let x = next() * W, y = next() * H, a = next() * TAU;
      const L = 8 + next() * 18, bend = (next() - 0.5) * 0.7;
      g.strokeStyle = `rgba(150,135,110,${(0.1 + next() * 0.14).toFixed(3)})`;
      g.lineWidth = 0.6 + next() * 0.6;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 6; j++) { a += bend; x += (Math.cos(a) * L) / 6; y += (Math.sin(a) * L) / 6; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 300 * area * fiber; i++) { // specks
      g.fillStyle = `rgba(110,95,80,${(0.12 + next() * 0.2).toFixed(3)})`;
      const s = 0.7 + next();
      g.fillRect(next() * W, next() * H, s, s);
    }
    const d = g.getImageData(0, 0, W, H).data;
    const out = new Float32Array(W * H * 3);
    for (let i = 0, j = 0, q = 0; i < W * H; i++, j += 3, q += 4) {
      const tooth = (next() - 0.5) * 3 * fiber; // the paper's tooth, a level or two
      out[j] = d[q] + tooth; out[j + 1] = d[q + 1] + tooth; out[j + 2] = d[q + 2] + tooth;
    }
    return out;
  }

  // How much of the ink takes, 0..255: a stencil press starves big solids unevenly, leaves a fine
  // grain, and drops a few specks of ink entirely.
  function makeInkTexture(k) {
    const next = rand(`${seed}:ink:${k}`);
    const big = valueNoise(next, MW, MH, 60), mid = valueNoise(next, MW, MH, 13);
    const out = new Uint8Array(MW * MH);
    for (let i = 0; i < MW * MH; i++) {
      const m = 1 - grain * (0.13 * big[i] + 0.07 * mid[i] + 0.07 * next());
      out[i] = Math.round(clamp01(m) * 255);
    }
    for (let n = Math.round(MW * MH * 0.0009 * grain), i = 0; i < n; i++) { // dropouts, 1-2 px
      const x = Math.floor(next() * (MW - 2)), y = Math.floor(next() * (MH - 2)), s = next() < 0.3 ? 2 : 1;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) out[(y + dy) * MW + x + dx] = 40;
    }
    return out;
  }

  // ---- drawing on the plates ----
  function pathOf(shape, closed = true) {
    if (shape instanceof Path2D) return shape;
    if (typeof shape === "string") return new Path2D(shape); // SVG path data
    if (Array.isArray(shape)) return toPath(shape, closed);
    throw new Error("riso: a shape is a point list [[x, y], ...], an SVG path string or a Path2D");
  }
  function check(tones) {
    for (const k of Object.keys(tones)) if (!names.has(k)) throw new Error(`riso: no ink called "${k}" (inks: ${[...names].join(", ")})`);
  }
  function paintOf(g, tone) {
    if (typeof tone === "number") return gray(tone);
    if (tone && (tone.kind === "linear" || tone.kind === "radial")) {
      const gr = tone.kind === "linear" ? g.createLinearGradient(...tone.at) : g.createRadialGradient(...tone.at);
      for (const [pos, v] of tone.stops) gr.addColorStop(pos, gray(v));
      return gr;
    }
    throw new Error("riso: a tone is a number 0..1 or p.linear(...) / p.radial(...)");
  }
  let depth = 0;
  let current = { t: 0, step: 0 };

  const api = {
    width: W, height: H,
    get t() { return current.t; },
    get step() { return current.step; },
    // A knockout fill: listed plates take their tone, the rest go back to paper. { over: true }
    // raises only the listed plates where they are lighter (an overprint). { under: true } lowers
    // only the listed plates where they are heavier: a radial tone that rises to 1 at its rim lifts
    // ink out of a sky without a hard edge.
    fill(shape, tones = {}, { over = false, under = false, rule = "nonzero" } = {}) {
      check(tones);
      const path = pathOf(shape);
      for (const pl of plates) {
        const tone = tones[pl.name];
        if ((over || under) && tone == null) continue;
        pl.g.globalCompositeOperation = over ? "lighten" : under ? "darken" : "source-over";
        pl.g.fillStyle = paintOf(pl.g, tone ?? 0);
        pl.g.fill(path, rule);
        pl.g.globalCompositeOperation = "source-over";
      }
    },
    // Fill whole plates, edge to edge, ignoring transforms and registration (backgrounds, skies).
    flood(tones = {}, { over = false } = {}) {
      check(tones);
      for (const pl of plates) {
        const tone = tones[pl.name];
        if (over && tone == null) continue;
        const g = pl.g;
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = over ? "lighten" : "source-over";
        g.fillStyle = paintOf(g, tone ?? 0);
        g.fillRect(0, 0, W, H);
        g.restore();
      }
    },
    // A line along points (open unless closed: true), an SVG path or a Path2D. Overprints by default.
    stroke(shape, tones = {}, { width = 4, cap = "round", join = "round", closed = false, over = true, dash } = {}) {
      check(tones);
      const path = pathOf(shape, closed);
      for (const pl of plates) {
        const tone = tones[pl.name];
        if (over && tone == null) continue;
        const g = pl.g;
        g.globalCompositeOperation = over ? "lighten" : "source-over";
        g.strokeStyle = paintOf(g, tone ?? 0);
        Object.assign(g, { lineWidth: width, lineCap: cap, lineJoin: join });
        g.setLineDash(dash ?? []);
        g.stroke(path);
        g.setLineDash([]);
        g.globalCompositeOperation = "source-over";
      }
    },
    // Printed type: solid ink, so registration shows as coloured fringes. Knocks out by default.
    text(str, x, y, tones = {}, { font = "900 80px Geist", align = "left", baseline = "alphabetic", tracking = 0, over = false } = {}) {
      check(tones);
      for (const pl of plates) {
        const tone = tones[pl.name];
        if (over && tone == null) continue;
        const g = pl.g;
        Object.assign(g, { font, textAlign: align, textBaseline: baseline, letterSpacing: `${tracking}px` });
        g.globalCompositeOperation = over ? "lighten" : "source-over";
        g.fillStyle = paintOf(g, tone ?? 0);
        g.fillText(str, x, y);
        g.globalCompositeOperation = "source-over";
        g.letterSpacing = "0px";
      }
    },
    measure(str, { font = "900 80px Geist", tracking = 0 } = {}) {
      const g = plates[0].g;
      g.save();
      Object.assign(g, { font, letterSpacing: `${tracking}px` });
      const w = g.measureText(str).width;
      g.restore();
      return w;
    },
    // Tone gradients, for a plate in tones: { aqua: p.linear(0, 0, 0, 700, [[0, 0.6], [1, 0]]) }.
    // The screen turns them into dots that grow and shrink.
    linear: (x0, y0, x1, y1, stops) => ({ kind: "linear", at: [x0, y0, x1, y1], stops }),
    radial: (x, y, r0, r1, stops) => ({ kind: "radial", at: [x, y, r0, x, y, r1], stops }),
    // Move, rotate (degrees), scale and clip everything drawn until the matching pop().
    push({ x = 0, y = 0, rotate = 0, scale = 1, origin = [0, 0], clip } = {}) {
      const [sx, sy] = Array.isArray(scale) ? scale : [scale, scale];
      for (const pl of plates) {
        const g = pl.g;
        g.save();
        g.translate(x + origin[0], y + origin[1]);
        g.rotate(rotate * DEG);
        g.scale(sx, sy);
        g.translate(-origin[0], -origin[1]);
        if (clip) g.clip(pathOf(clip));
      }
      depth++;
    },
    pop() {
      if (!depth) return;
      for (const pl of plates) pl.g.restore();
      depth--;
    },
    with(tf, fn) { api.push(tf); try { fn(); } finally { api.pop(); } },
    // The raw 2D context of one plate, for anything else. Draw in greys: white is solid ink.
    plate(name) {
      const pl = plates.find((p) => p.name === name);
      if (!pl) throw new Error(`riso: no ink called "${name}"`);
      return pl.g;
    },
  };

  // ---- the print pass ----
  const n = plates.length;
  const U = new Float64Array(n), V = new Float64Array(n), DU = new Float64Array(n), DV = new Float64Array(n);
  const PX = new Float64Array(n), AR = new Float64Array(n), AG = new Float64Array(n), AB = new Float64Array(n);
  const TI = new Int32Array(n);
  plates.forEach((pl, k) => {
    DU[k] = pl.cos / pl.pitch; DV[k] = -pl.sin / pl.pitch; PX[k] = pl.pitch;
    [AR[k], AG[k], AB[k]] = pl.absorb;
  });

  function print(variant) {
    const dens = plates.map((pl) => pl.g.getImageData(0, 0, W, H).data);
    const t1 = performance.now();
    const out = image.data;
    for (let y = 0; y < H; y++) {
      for (let k = 0; k < n; k++) {
        const pl = plates[k], [ox, oy] = pl.off[variant], [tx, ty] = pl.texOff[variant];
        // Screen coordinates (in cells) of pixel (0, y) on this plate: the screen moves with the
        // plate's registration, as it would on the drum.
        U[k] = (-ox * pl.cos + (y - oy) * pl.sin) / pl.pitch;
        V[k] = (ox * pl.sin + (y - oy) * pl.cos) / pl.pitch;
        TI[k] = (y + ty) * MW + tx;
      }
      for (let x = 0, i = y * W; x < W; x++, i++) {
        const p3 = i * 3, p4 = i * 4;
        let r = paperPix[p3], g = paperPix[p3 + 1], b = paperPix[p3 + 2];
        for (let k = 0; k < n; k++) {
          const d = dens[k][p4];
          if (d === 0) continue;
          let cov = 1;
          if (d < SOLID) {
            const u = U[k] + x * DU[k], v = V[k] + x * DV[k];
            const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
            cov = (RAD[d] - Math.sqrt(fu * fu + fv * fv)) * PX[k] + 0.5; // antialiased dot edge
            if (cov <= 0) continue;
            if (cov > 1) cov = 1;
          }
          cov *= texture[k][TI[k] + x] * (1 / 255);
          r *= 1 - cov * AR[k]; g *= 1 - cov * AG[k]; b *= 1 - cov * AB[k];
        }
        out[p4] = r; out[p4 + 1] = g; out[p4 + 2] = b; out[p4 + 3] = 255;
      }
    }
    const t2 = performance.now();
    display.putImageData(image, 0, 0);
    return [t1, t2];
  }

  const stats = { frames: 0, last: null, totalMs: 0 };
  return {
    width: W, height: H, plates: plates.map((p) => p.name), stats,
    // Draw and print one frame. draw(p) receives the plates API above; p.t is t, p.step the print.
    frame(t, draw) {
      const t0 = performance.now();
      const step = stepOf(t, { fps, every, loop });
      const variant = ((step % variants) + variants) % variants;
      current = { t, step };
      for (const pl of plates) {
        const g = pl.g;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        g.fillStyle = "#000";
        g.fillRect(0, 0, W, H);
        g.setTransform(1, 0, 0, 1, pl.off[variant][0], pl.off[variant][1]);
      }
      try { draw(api); } finally { while (depth) api.pop(); }
      const tDraw = performance.now();
      const [tRead, tScreen] = print(variant);
      const tEnd = performance.now();
      stats.frames++;
      stats.last = { draw: tDraw - t0, read: tRead - tDraw, screen: tScreen - tRead, put: tEnd - tScreen, total: tEnd - t0 };
      stats.totalMs += tEnd - t0;
    },
    // The printed colour of a set of tones, as CSS: for HTML around the print.
    color(tones = {}) {
      check(tones);
      const c = paperRGB.slice();
      for (const pl of plates) {
        const v = clamp01(tones[pl.name] ?? 0);
        for (let i = 0; i < 3; i++) c[i] *= 1 - v * pl.absorb[i];
      }
      return `rgb(${c.map(Math.round).join(",")})`;
    },
  };
}
