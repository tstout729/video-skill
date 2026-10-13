// s12 Everything · black · bars 23–25 (44.12–48.39): a zoom-through brings it in, a cut takes it out.
// A bento grid of live tiles: everything the film has shown, playing at once.
//   4 columns × 4 rows, 24 px gaps, on the stage:
//     walkthrough (2×1) | the 3D mark (2×2)
//     explainer   (2×1) |
//     riso | pixel | cut paper | loop
//     waveform    (2×1) | 60 fps | N checks
// The whole grid is on screen from the zoom-through, every tile playing but dimmed to 28%. Each tile
// lands on an eighth note of bar 23 (its picture brightens and settles from 106%), the 3D mark on the
// downbeat; the two stat tiles land on bar 24 and its "and". Then everything plays and holds to the cut.
// The mark is a second createHero (keynote variant when hero3d.js has it), rendered inside seek; it
// hops once, touching down on bar 24 beat 2. The waveform is George's take (peaks.json) replayed at
// true speed. The stats are this film's own: its frame rate and its number of check()s.
import { createHero, HOP } from "../hero3d.js";
import * as HERO from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, barT, SPB, drift, frames, easeOutExpo, p01, clamp, check, box, overlap, C, STAGE, FPS: FILM_FPS } = k;
  const S = "s12", FPS = 60, EPS = 1e-6, LEAD = 2 / FPS;
  const { cutIn, inEnd, outStart, cutOut } = k.win;
  const EIGHTH = SPB() / 2;
  const land = (n) => barT(23) + n * EIGHTH;                 // the n-th eighth note of bar 23

  // ---------- the grid ----------
  const COLS = 4, ROWS = 4, GAP = 24, ROW_H = 250;
  const GW = 940, GX = 540 - GW / 2;                        // 940 wide stays inside x 54–1026 at the drift's 1.03
  const U = (GW - (COLS - 1) * GAP) / COLS;                 // 217
  const GH = ROWS * ROW_H + (ROWS - 1) * GAP;
  const GY = Math.round((STAGE.y0 + STAGE.y1) / 2 - GH / 2);
  const cell = (c, r, cw = 1, rh = 1) => ({ x: GX + c * (U + GAP), y: GY + r * (ROW_H + GAP), w: cw * U + (cw - 1) * GAP, h: rh * ROW_H + (rh - 1) * GAP });

  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });

  // ---------- clips: [name, cell, first clip frame at cutIn, crop {scale over cover, focus 0..1}] ----------
  const meta = async (name) => (await fetch(`clips/${name}/clip.json`)).json();
  const STYLE_F = 140;                                       // riso, pixel and paper share one timeline (stem to bloom)
  const CLIPS = [
    { id: "walkthrough", at: cell(0, 0, 2), from: 70, zoom: 1.47, focus: [0.645, 0.5], n: 1 },   // the invite dialog opens and the email types
    { id: "explainer", at: cell(0, 1, 2), from: 25, zoom: 1.45, focus: [0.62, 0.66], n: 2 },     // the network draws on; ends at frame 153, before the DNS box (cut by this crop) enters
    { id: "riso", at: cell(0, 2), from: STYLE_F, zoom: 1.4, focus: [0.6, 0.5], n: 3 },     // the scene only: title and step label fall outside
    { id: "pixel", at: cell(1, 2), from: STYLE_F, zoom: 1.4, focus: [0.6, 0.5], n: 4 },
    { id: "cut-paper", at: cell(2, 2), from: STYLE_F, zoom: 1.4, focus: [0.6, 0.5], n: 5 },
    { id: "loop", at: cell(3, 2), from: 115, zoom: 1.4, focus: [0.5, 0.5], n: 6 },               // spinner -> green -> check -> receipt
  ];
  const tiles = [];
  const tile = (id, r, n) => {
    const el = place(make("div", "tile", "", stage), r.x, r.y, r.w, r.h);
    el.id = `s12-${id}`;
    const content = make("div", "", "", el, { position: "absolute", inset: "0px", transformOrigin: "50% 50%" });
    const veil = make("div", "", "", el, { position: "absolute", inset: "0px", background: "#000", zIndex: "2", pointerEvents: "none" });
    const t = { id, el, content, veil, r, n, t: land(n) };
    tiles.push(t);
    return t;
  };
  for (const c of CLIPS) {
    const m = await meta(c.id);
    const t = tile(c.id, c.at, c.n);
    // Cover the tile, zoomed about a focus point, never past the clip's edges.
    const cover = Math.max(c.at.w / m.width, c.at.h / m.height) * c.zoom;
    const w = m.width * cover, h = m.height * cover;
    const ox = clamp(c.focus[0] * w - c.at.w / 2, 0, w - c.at.w), oy = clamp(c.focus[1] * h - c.at.h / 2, 0, h - c.at.h);
    // inset first: it resets left/top, so they must come after it.
    const img = make("img", "", "", t.content, { inset: "auto", position: "absolute", left: `${(-ox).toFixed(2)}px`, top: `${(-oy).toFixed(2)}px`, width: `${w.toFixed(2)}px`, height: `${h.toFixed(2)}px`, objectFit: "fill" });
    Object.assign(t, { img, play: frames(img, { dir: `clips/${c.id}`, fps: m.fps, count: m.count }), clip: { ...c, ...m, t0: cutIn - c.from / m.fps }, crop: { ox, oy, w, h } });
  }

  // ---------- the 3D mark ----------
  const markT = tile("mark", cell(2, 0, 2, 2), 0);
  const variant = HERO.KEYNOTE ? "keynote" : "directed";
  const canvas = make("canvas", "", "", markT.content);
  const hero = createHero(canvas, { variant, width: markT.r.w, height: markT.r.h, seed: 23,
    framing: { fill: 0.34, aim: [0, 0.62], center: [0.5, 0.58] } });
  const heroState = { hop: barT(24, 2) - HOP.contact / FPS };

  // ---------- the waveform: George's take, replayed at true speed from the zoom-through ----------
  const waveT = tile("wave", cell(0, 3, 2), 7);
  const PEAKS = await (await fetch("audio/peaks.json")).json();
  const NS = "http://www.w3.org/2000/svg";
  const WP = { x: 28, w: waveT.r.w - 56, h: 150, per: 6, barW: 3.2 };
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", WP.w); svg.setAttribute("height", WP.h);
  Object.assign(svg.style, { position: "absolute", left: `${WP.x}px`, top: `${(waveT.r.h - WP.h) / 2}px`, overflow: "visible" });
  waveT.content.appendChild(svg);
  const vmax = Math.max(...PEAKS.peaks), DUR = PEAKS.peaks.length / PEAKS.rate;
  const wbars = [];
  for (let j = 0; j * WP.per < PEAKS.peaks.length; j++) {
    const seg = PEAKS.peaks.slice(j * WP.per, j * WP.per + WP.per);
    const h = Math.max(WP.barW, (Math.max(...seg) / vmax) * WP.h);
    const tc = (j * WP.per + seg.length / 2) / PEAKS.rate;
    const r = document.createElementNS(NS, "rect");
    Object.entries({ x: ((tc / DUR) * WP.w - WP.barW / 2).toFixed(2), y: ((WP.h - h) / 2).toFixed(2), width: WP.barW, height: h.toFixed(2), rx: WP.barW / 2 }).forEach(([a, v]) => r.setAttribute(a, v));
    svg.appendChild(r);
    wbars.push({ r, tc });
  }
  const wph = make("div", "", "", waveT.content, { position: "absolute", left: `${WP.x - 1.5}px`, top: `${(waveT.r.h - WP.h) / 2 - 16}px`, width: "3px", height: `${WP.h + 32}px`, borderRadius: "2px", background: C.white });
  const T_TAKE = cutIn;                                     // the replay starts as the grid arrives

  // ---------- the stats: this film's own numbers ----------
  const stat = (id, c, n, value, unit, color) => {
    const t = tile(id, c, n);
    const num = make("div", "", value, t.content, { position: "absolute", left: "26px", fontWeight: "700", letterSpacing: "-0.045em", lineHeight: "1", whiteSpace: "nowrap", fontFeatureSettings: '"tnum" 1', color });
    const lab = make("div", "label", unit, t.content, { position: "absolute", left: "28px", whiteSpace: "nowrap" });
    Object.assign(t, { num, lab });
    return t;
  };
  const fpsT = stat("fps", cell(2, 3), 8, String(FILM_FPS), "fps", C.white);
  const chkT = stat("checks", cell(3, 3), 9, "0", "checks", C.mint);
  const N = () => (window.CHECKS || []).length;

  // Fit a stat's number to its tile (at most display size, 120 px) and stack it over its label.
  await document.fonts.ready;
  const fitStat = (t, text) => {
    t.num.textContent = text;
    t.num.style.fontSize = "120px";
    const room = t.r.w - 52, wNow = t.num.offsetWidth;   // layout width: no transform applies
    const size = Math.min(120, Math.floor((120 * room) / wNow));
    t.num.style.fontSize = `${size}px`;
    const nh = size, lh = 31, gap = 14, top = (t.r.h - nh - gap - lh) / 2;
    t.num.style.top = `${top.toFixed(1)}px`;
    t.lab.style.top = `${(top + nh + gap).toFixed(1)}px`;
    t.fitted = text;
  };
  fitStat(fpsT, String(FILM_FPS));

  // ---------- poses ----------
  // Pictures show dimmed before their tile lands; a stat's type is not there at all until its tile
  // lands, then it lands with the keynote reveal (dim type would fail contrast).
  const LAND_DUR = 0.5, DIM = 0.72, FROM = 1.06;
  const landed = (t, tl) => easeOutExpo(p01(t, tl.t - LEAD, LAND_DUR));
  const scaleAt = (t) => drift(t, cutIn, cutOut, 0.03);
  const clipFrame = (tl, t) => clamp(Math.floor((t - tl.clip.t0) * tl.clip.fps + 1e-6), 0, tl.clip.count - 1);

  // ---------- checks ----------
  const op = (e) => Number(e.style.opacity || 1);
  check(`${S} composed from the zoom-through: all ${tiles.length} tiles on screen with their pictures at cutIn (dimmed)`, cutIn, () => {
    const bad = tiles.filter((tl) => box(tl.el).w < 1 || (tl.img && !(tl.img.complete && tl.img.naturalWidth)));
    if (bad.length) return `empty: ${bad.map((b) => b.id)}`;
    return tiles.every((tl) => Math.abs(op(tl.veil) - DIM) < 1e-3) || "a tile is lit before it lands";
  });
  check(`${S} the tiles land on the eighth notes of bar 23 (the mark on the downbeat, f${Math.round(land(0) * FPS)}) and the stats on bar 24 and its "and"`, [cutIn, land(9) + LAND_DUR + 0.05], (t) => {
    for (const tl of tiles) {
      const v = op(tl.veil);
      if (t < tl.t - LEAD - EPS && Math.abs(v - DIM) > 1e-3) return `${tl.id} lit early at ${t.toFixed(3)}`;
      if (t >= tl.t - LEAD + LAND_DUR && v > 1e-3) return `${tl.id} not landed at ${t.toFixed(3)}`;
    }
    return true;
  });
  check(`${S} every tile has landed by bar 24 beat 1.6 and the whole grid holds, playing, to the cut`, [land(9) + LAND_DUR, cutOut - 1 / FPS], () =>
    tiles.every((tl) => op(tl.veil) < 1e-3 && /scale\(1(\.0+)?\)/.test(tl.content.style.transform)) || "a tile is still landing");
  check(`${S} the grid is on its marks: inside the stage, 24 px gaps, nothing overlaps`, [inEnd, cutOut - 1 / FPS], (t) => {
    const s = scaleAt(t);
    for (const tl of tiles) {
      const b = box(tl.el);
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${tl.id} at ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}`;
    }
    for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
      if (overlap(tiles[i].el, tiles[j].el) > 0) return `${tiles[i].id} × ${tiles[j].id}`;
    }
    const a = box(tiles.find((x) => x.id === "riso").el), b = box(tiles.find((x) => x.id === "pixel").el);
    return Math.abs(b.x - (a.x + a.w) - GAP * s) < 0.5 || `gap ${(b.x - a.x - a.w).toFixed(2)}`;
  });
  check(`${S} every clip plays real frames inside its range while on screen, and none is scaled past 1.5×`, [cutIn, cutOut], (t) => {
    for (const tl of tiles.filter((x) => x.clip)) {
      const f = (t - tl.clip.t0) * tl.clip.fps;
      if (f < 0 || f > tl.clip.count) return `${tl.id} at clip frame ${f.toFixed(1)}`;
      if (tl.clip.zoom > 1.5 || tl.crop.ox < -0.01 || tl.crop.oy < -0.01 || tl.crop.ox + tl.r.w > tl.crop.w + 0.01 || tl.crop.oy + tl.r.h > tl.crop.h + 0.01) return `${tl.id} crop`;
      const n = Number((tl.img.getAttribute("src") || "").match(/(\d+)\.jpg/)?.[1]) - 1;
      if (n !== clipFrame(tl, t)) return `${tl.id} shows ${n}, expected ${clipFrame(tl, t)}`;
    }
    return true;
  });
  check(`${S} each clip's picture sits on its crop (the tile shows the region it was framed for)`, inEnd, () => {
    for (const tl of tiles.filter((x) => x.clip)) {
      const ib = tl.img.getBoundingClientRect(), tb = tl.content.getBoundingClientRect(), k2 = tb.width / tl.r.w;
      if (Math.abs((tb.x - ib.x) / k2 - tl.crop.ox) > 0.6 || Math.abs((tb.y - ib.y) / k2 - tl.crop.oy) > 0.6) return `${tl.id} at ${((tb.x - ib.x) / k2).toFixed(1)},${((tb.y - ib.y) / k2).toFixed(1)}, crop ${tl.crop.ox.toFixed(1)},${tl.crop.oy.toFixed(1)}`;
    }
    return true;
  });
  check(`${S} the stats are this film's own: ${FILM_FPS} fps and window.CHECKS.length checks`, [land(8), cutOut], () =>
    (fpsT.num.textContent === String(FILM_FPS) && chkT.num.textContent === String(N()) && N() > 0) || `shows ${fpsT.num.textContent} / ${chkT.num.textContent} of ${N()}`);
  check(`${S} the stat numbers fit their tiles and stay at 28 px or more`, [land(9), cutOut - 1 / FPS], () => {
    for (const st of [fpsT, chkT]) {
      const nb = box(st.num), tb = box(st.el), lb = box(st.lab);
      if (nb.x + nb.w > tb.x + tb.w - 12 || lb.x + lb.w > tb.x + tb.w - 12) return `${st.id} overflows`;
      if (parseFloat(st.num.style.fontSize) < 28) return `${st.id} ${st.num.style.fontSize}`;
      if (overlap(st.num, st.lab) > 0) return `${st.id} number over label`;
    }
    return true;
  });
  check(`${S} the mark is the ${variant} hero; it hops once, touching down on bar 24 beat 2 (f${Math.round(barT(24, 2) * FPS)})`, cutIn, () => {
    const p = hero.pose(barT(24, 2), heroState), q = hero.pose(barT(24, 2) - 2 / FPS, heroState);
    return (p.y === 0 && q.y > 0) || `y ${q.y.toFixed(3)} -> ${p.y.toFixed(3)}`;
  });
  check(`${S} the waveform's playhead is at the true time of the take on every frame once its tile has landed (±0.5 px)`, [waveT.t - LEAD + LAND_DUR, cutOut], (t) => {
    const want = box(waveT.el).x + (WP.x + (clamp(t - T_TAKE, 0, DUR) / DUR) * WP.w) * scaleAt(t);
    const got = box(wph).cx;
    return Math.abs(got - want) < 0.5 || `x ${got.toFixed(2)} want ${want.toFixed(2)}`;
  });

  // ---------- seek ----------
  return (t) => {
    stage.style.transform = `scale(${scaleAt(t).toFixed(5)})`;
    const n = String(N());
    if (chkT.fitted !== n) fitStat(chkT, n);
    for (const tl of tiles) {
      const a = landed(t, tl);
      tl.veil.style.opacity = (DIM * (1 - a)).toFixed(4);
      tl.content.style.transform = `scale(${(FROM - (FROM - 1) * a).toFixed(4)})`;
      if (tl.num) { k.reveal(tl.num, t, tl.t - LEAD); k.reveal(tl.lab, t, tl.t - LEAD + 0.08); }
    }
    hero.render(t, heroState);
    const tau = clamp(t - T_TAKE, 0, DUR);
    for (const b of wbars) b.r.setAttribute("fill", b.tc <= tau ? C.white : "#5c5c60");
    wph.style.transform = `translateX(${((tau / DUR) * WP.w).toFixed(3)}px)`;
    return Promise.all(tiles.filter((tl) => tl.play).map((tl) => tl.play(t - tl.clip.t0)));
  };
}
