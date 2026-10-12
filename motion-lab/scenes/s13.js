// s13 Camera, parallax, accessibility. Three cards; every number is measured from what is drawn.
// Parallax (the hero): a three-layer landscape in a window. On "parallax" the camera pans once, 1.8 s
//   on an ease-in-out sine (the gentlest curve). Foreground, midground and background move at 1.0, 0.5
//   and 0.2 of the camera: 400, 200 and 80 px. One accent shape per layer is tracked, with a dashed
//   ghost where it started; the speeds are labeled on "foreground", "middle" and "background".
// Contrast: two samples on white, ratios computed with the WCAG 2 formula from the colors on screen:
//   #9d9a96 is 2.80:1 (struck on "contrast"), #777772 is 4.50:1 (checked on "one").
// Flashes: a lamp pulses three times, 0.6 s apart, on smooth bumps; a gauge measures the most peaks in
//   any one second (2) against the limit of 3.

const NS = "http://www.w3.org/2000/svg";

// WCAG 2 relative luminance and contrast ratio.
const channel = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const cssRGB = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);

export default function build(root, k) {
  const { make, place, show, cueIn, easeOut, p01, clamp, check, box, overlap, sfx, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;
  const F = (t) => Math.round(t * FPS) / FPS;

  // ---- cues ----
  const tGentle = cueIn(k.id, "gentlest");
  const tPan = F(cueIn(k.id, "parallax"));
  const tLayer = { fg: cueIn(k.id, "foreground"), mid: cueIn(k.id, "middle"), bg: cueIn(k.id, "background") };
  const tKeep = cueIn(k.id, "keep");
  const tStrike = cueIn(k.id, "contrast");
  const tFour = cueIn(k.id, "four");
  const tOne = cueIn(k.id, "one");
  const tNever = F(cueIn(k.id, "never"));

  // ---- small builders ----
  const MONO = '"Geist Mono", ui-monospace, monospace';
  const txt = (parent, html, x, y, css = {}) =>
    place(make("div", "", html, parent, { fontSize: "30px", fontWeight: "620", whiteSpace: "nowrap", lineHeight: "1.2", ...css }), x, y);
  const mono = (parent, html, x, y, css = {}) => txt(parent, html, x, y, { fontFamily: MONO, fontSize: "28px", fontWeight: "500", ...css });
  const head = (parent, html) => txt(parent, html, 28, 18, { fontSize: "32px", fontWeight: "680" });
  const card = (x, y, w, h) => place(make("div", "card", "", root), x, y, w, h);
  const rect = (parent, x, y, w, h, css = {}) => place(make("div", "", "", parent, css), x, y, w, h);
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v);
    parent.appendChild(e);
    return e;
  };
  const icon = (parent, kind, color, x, y) => {   // drawn, 2.5 px strokes
    const s = svgEl("svg", { width: 34, height: 34, viewBox: "0 0 34 34" }, parent);
    Object.assign(s.style, { position: "absolute", left: `${x}px`, top: `${y}px`, overflow: "visible" });
    svgEl("circle", { cx: 17, cy: 17, r: 15.5, fill: "none", stroke: color, "stroke-width": 2.5 }, s);
    svgEl("path", { d: kind === "check" ? "M10 17.5 L15 22.5 L24.5 12" : "M11.5 11.5 L22.5 22.5 M22.5 11.5 L11.5 22.5",
      fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
    return s;
  };
  const lines = [];

  // =========================== Parallax ===========================
  const P = card(24, 8, 1032, 462);
  lines.push(head(P, "Parallax <span style=\"color:var(--muted);font-weight:500\">· one camera pan</span>"));
  const VW = 620, VH = 324, CAM = 400, PAN = 1.8;
  const cam = (t) => { const p = p01(t, tPan, PAN); return 0.5 - 0.5 * Math.cos(Math.PI * p); };   // ease-in-out sine
  const view = rect(P, 28, 66, VW, VH, { background: "#f6f5f2", borderRadius: "18px", overflow: "hidden" });
  const layer = (w) => make("div", "", "", view, { position: "absolute", left: "0px", top: "0px", width: `${w}px`, height: `${VH}px` });
  const blob = (parent, x, y, w, h, bg, r = "50%") => rect(parent, x, y, w, h, { background: bg, borderRadius: r });
  // background, 0.2
  const bgL = layer(VW + 160);
  blob(bgL, -60, 168, 540, 320, "#e7e4dd"); blob(bgL, 360, 186, 520, 300, "#e7e4dd");
  const sun = blob(bgL, 380, 34, 92, 92, C.accentSoft);
  // midground, 0.5
  const midL = layer(VW + 280);
  blob(midL, -140, 236, 440, 230, "#d3d0c8"); blob(midL, 150, 214, 540, 260, "#d3d0c8"); blob(midL, 600, 228, 480, 250, "#d3d0c8");
  const trees = [170, 430, 740, 920].map((x) => {   // spaced so no tree ends under the tracked one's ghost
    rect(midL, x - 4, 196, 8, 40, { background: "#8f8c86", borderRadius: "4px" });
    return blob(midL, x - 26, 150, 52, 52, x === 430 ? C.accent : "#a8a6a0");
  });
  const tree = trees[1];
  // foreground, 1.0
  const fgL = layer(VW + 520);
  rect(fgL, 0, 276, VW + 520, 48, { background: "#3b3a36" });
  rect(fgL, 0, 240, VW + 520, 6, { background: C.ink, borderRadius: "3px" });
  const posts = [];
  for (let x = 40; x < VW + 500; x += 116) posts.push(rect(fgL, x, 216, 16, 72, { background: x === 504 ? C.accent : C.ink, borderRadius: "6px" }));
  const post = posts.find((p) => p.style.left === "504px");
  post.id = "s13-fg-post";
  // Ghosts: where each tracked shape started (a static overlay).
  const ghosts = make("div", "", "", view, { position: "absolute", inset: "0px" });
  const ghost = (el) => rect(ghosts, parseFloat(el.style.left), parseFloat(el.style.top), parseFloat(el.style.width), parseFloat(el.style.height),
    { border: `2.5px dashed ${C.muted}`, borderRadius: el.style.borderRadius, boxSizing: "border-box" });
  ghost(sun); ghost(tree); ghost(post);

  const LAYERS = [
    { key: "fg", name: "foreground", speed: 1.0, el: fgL, mark: post, y: 292 },
    { key: "mid", name: "midground", speed: 0.5, el: midL, mark: tree, y: 206 },
    { key: "bg", name: "background", speed: 0.2, el: bgL, mark: sun, y: 110 },
  ].map((L) => {
    const name = txt(P, L.name, 680, L.y);
    const val = mono(P, `<span style="color:var(--accent);font-weight:650">${L.speed.toFixed(1)} ×</span> · ${Math.round(L.speed * CAM)} px`, 680, L.y + 38);
    lines.push(name, val);
    return { ...L, nameEl: name, val, x0: parseFloat(L.mark.style.left) };
  });
  // The camera: its curve, as a dot on a track.
  const camRow = make("div", "", "", P, { position: "absolute", inset: "0px" });
  const camName = txt(camRow, "camera", 28, 404);
  rect(camRow, 170, 421, 340, 2, { background: C.line });
  const camDot = rect(camRow, 170 - 10, 412, 20, 20, { background: C.ink, borderRadius: "10px" });
  const camCurve = mono(camRow, `ease-in-out · ${PAN.toFixed(1)} s`, 540, 405, { color: C.muted });
  lines.push(camName, camCurve);

  // =========================== Contrast ===========================
  const CT = card(24, 482, 1032, 262);
  lines.push(head(CT, "Contrast <span style=\"color:var(--muted);font-weight:500\">· WCAG, on white</span>"));
  const BG = "#ffffff";
  const SAMPLES = [
    { fg: "#9d9a96", want: 2.8, pass: false, x: 28 },
    { fg: "#777772", want: 4.5, pass: true, x: 530 },
  ].map((s) => {
    const ratio = contrast(hexRGB(s.fg), hexRGB(BG));   // computed, not typed
    const panel = rect(CT, s.x, 66, 474, 180, { background: BG, border: `2px solid ${C.canvas}`, borderRadius: "18px" });
    const sample = txt(panel, "", 24, 14, { fontSize: "44px", fontWeight: "600", color: s.fg });
    const word = make("span", "", "Body text", sample, { position: "relative", display: "inline-block" });
    const strike = s.pass ? null : make("div", "", "", word, { position: "absolute", left: "-6px", right: "-6px", top: "54%", height: "5px",
      marginTop: "-2px", borderRadius: "3px", background: C.red, transformOrigin: "left center", transform: "scaleX(0)" });
    const value = mono(panel, `${ratio.toFixed(2)} : 1`, 24, 80, { fontSize: "40px", fontWeight: "600", color: C.ink });
    const hex = mono(panel, `${s.fg} on ${BG}`, 24, 132, { color: C.muted });
    const mark = icon(panel, s.pass ? "check" : "x", s.pass ? C.green : C.red, 412, 22);
    lines.push(sample, value, hex);
    return { ...s, ratio, panel, sample, word, strike, value, hex, mark };
  });
  const [failS, passS] = SAMPLES;

  // =========================== Flashes ===========================
  const FL = card(24, 756, 1032, 228);
  lines.push(head(FL, "Flashes <span style=\"color:var(--muted);font-weight:500\">· at most 3 a second</span>"));
  const PULSE = 0.6, LIMIT = 3, DIM = 0.2;
  const pulses = [0, 1, 2].map((i) => tNever + i * PULSE);
  const peaks = pulses.map((p) => p + PULSE / 2);
  const lampLevel = (t) => {   // smooth raised-cosine bumps; never a hard on/off
    let v = 0;
    for (const p of pulses) { const u = (t - p) / PULSE; if (u > 0 && u < 1) v = Math.max(v, 0.5 - 0.5 * Math.cos(2 * Math.PI * u)); }
    return DIM + (1 - DIM) * v;
  };
  // The most peaks inside any one-second window, among those that have happened by t.
  const mostPerSecond = (t) => {
    const seen = peaks.filter((p) => p <= t + 1e-9);
    let most = 0;
    for (const a of seen) most = Math.max(most, seen.filter((b) => b >= a && b < a + 1).length);
    return most;
  };
  const lamp = rect(FL, 28, 78, 112, 112, { background: C.accent, borderRadius: "56px" });
  const GX = 200, GU = 96;                       // gauge: 0–5 flashes a second, 96 px each
  const gauge = rect(FL, GX, 104, 5 * GU, 18, { background: "#f1f0ec", borderRadius: "9px", overflow: "hidden" });
  rect(gauge, LIMIT * GU, 0, 2 * GU, 18, { background: "#fde8eb" });
  const gFill = make("div", "", "", gauge, { position: "absolute", left: "0px", top: "0px", width: `${5 * GU}px`, height: "18px", background: C.accent, borderRadius: "9px", transformOrigin: "left center" });
  rect(FL, GX + LIMIT * GU - 1, 94, 3, 38, { background: C.red, borderRadius: "2px" });
  for (let i = 0; i <= 5; i++) lines.push(mono(FL, String(i), GX + i * GU - 20, 140, { width: "40px", textAlign: "center", color: i > LIMIT ? C.red : C.muted }));
  const reading = mono(FL, "", 760, 96, { fontSize: "32px", fontWeight: "600" });
  const flashOk = icon(FL, "check", C.green, 930, 96);
  lines.push(reading);
  const tFlashOk = pulses.at(-1) + PULSE;

  sfx(tOne + 1 / FPS, "success");                // contrast check turns green
  sfx(tFlashOk + 1 / FPS, "success");            // flash check turns green

  // =========================== checks ===========================
  const shift = (L) => box(L.mark).x - box(view).x - L.x0;
  check("s13 parallax: layers move at 1.0 / 0.5 / 0.2 of the camera on every frame of the pan", [tPan, tPan + PAN + 2 / FPS], (t) => {
    const fg = -shift(LAYERS[0]), want = CAM * cam(t);
    if (Math.abs(fg - want) > 0.02) return `foreground ${fg.toFixed(2)} want ${want.toFixed(2)}`;
    for (const L of LAYERS.slice(1)) {
      const d = -shift(L);
      if (Math.abs(d - L.speed * want) > 0.02) return `${L.name} ${d.toFixed(2)} want ${(L.speed * want).toFixed(2)}`;
    }
    return true;
  });
  check("s13 parallax: travels 400 / 200 / 80 px, as labeled", tPan + PAN + 0.1, () =>
    LAYERS.every((L) => Math.abs(-shift(L) - L.speed * CAM) < 0.02 && L.val.textContent === `${L.speed.toFixed(1)} × · ${L.speed * CAM} px`) ||
    LAYERS.map((L) => `${(-shift(L)).toFixed(2)} "${L.val.textContent}"`).join("; "));
  check("s13 parallax: the camera curve starts and ends at rest (ease-in-out)", tPan, () => {
    const v0 = (cam(tPan + 1 / FPS) - cam(tPan)) * CAM, v1 = (cam(tPan + PAN) - cam(tPan + PAN - 1 / FPS)) * CAM, vm = (cam(tPan + PAN / 2 + 0.5 / FPS) - cam(tPan + PAN / 2 - 0.5 / FPS)) * CAM;
    return (v0 < 0.15 * vm && v1 < 0.15 * vm) || `first ${v0.toFixed(2)} last ${v1.toFixed(2)} mid ${vm.toFixed(2)} px/frame`;
  });
  for (const s of SAMPLES) {
    check(`s13 contrast: the ${s.pass ? "passing" : "failing"} sample measures ${s.want.toFixed(2)}:1 on screen (WCAG)`, s.pass ? tOne + 0.5 : tStrike + 0.5, () => {
      let op = 1;
      for (let n = s.sample; n && n !== document.body; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
      if (op < 0.9999) return `sample at opacity ${op.toFixed(4)}`;
      const r = contrast(cssRGB(getComputedStyle(s.word).color), cssRGB(getComputedStyle(s.panel).backgroundColor));
      if (Math.abs(r - s.want) >= 0.005) return `measured ${r.toFixed(4)}:1`;
      if (s.pass !== (r >= 4.5)) return `${r.toFixed(4)}:1 is on the wrong side of 4.5`;
      return s.value.textContent === `${r.toFixed(2)} : 1` || `shows "${s.value.textContent}" for ${r.toFixed(4)}`;
    });
  }
  check("s13 contrast: the strike covers all of the failing sample", tStrike + 0.6, () => {
    const a = box(failS.strike), w = box(failS.word);
    return (a.x <= w.x && a.x + a.w >= w.x + w.w) || `strike ${a.x.toFixed(0)}–${(a.x + a.w).toFixed(0)}, word ${w.x.toFixed(0)}–${(w.x + w.w).toFixed(0)}`;
  });
  // Measured from the rendered lamp: seek every frame of the pulses, find the brightness peaks, and count
  // the most in any 60-frame window. Restores the frame being audited before it returns.
  check("s13 flashes: the lamp peaks at most 3 times in any second (measured: 2), and the gauge reads it", tFlashOk + 0.3, (t) => {
    const f0 = Math.round((tNever - 0.1) * FPS), f1 = Math.round((tFlashOk + 0.1) * FPS), op = [];
    for (let f = f0; f <= f1; f++) { window.seek(f / FPS); op.push(Number(getComputedStyle(lamp).opacity)); }
    window.seek(t);
    const pk = [];
    for (let i = 1; i < op.length - 1; i++) if (op[i] > 0.9 && op[i] >= op[i - 1] && op[i] > op[i + 1]) pk.push(f0 + i);
    let most = 0;
    for (const a of pk) most = Math.max(most, pk.filter((b) => b >= a && b < a + FPS).length);
    if (pk.length !== 3) return `${pk.length} peaks`;
    if (most > LIMIT) return `${most} in one second`;
    const fillW = box(gFill).w;
    if (Math.abs(fillW - most * GU) > 0.5) return `gauge at ${(fillW / GU).toFixed(2)}`;
    return reading.textContent === `${most} / s` || `reads "${reading.textContent}", measured ${most}`;
  });
  check("s13 text is 28 px or larger", cutOut - 2 / FPS, () => {
    const small = [...root.querySelectorAll("div, span")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 28);
    return !small.length || small.map((el) => `${el.textContent.slice(0, 16)} ${getComputedStyle(el).fontSize}`).join("; ");
  });
  check("s13 text lines don't overlap each other or the window; all inside the stage", cutOut - 2 / FPS, () => {
    const els = [...lines, view, lamp, gauge, failS.mark, passS.mark, flashOk];
    for (let i = 0; i < els.length; i++) {
      const b = box(els[i]);
      if (b.x < 0 || b.x + b.w > 1080 || b.y < 128 || b.y + b.h > 1120) return `${els[i].textContent?.slice(0, 20)} outside`;
      for (let j = i + 1; j < els.length; j++) {
        const o = overlap(els[i], els[j]);
        if (o > 0) return `${(els[i].textContent || els[i].tagName).slice(0, 18)} x ${(els[j].textContent || els[j].tagName).slice(0, 18)}: ${o | 0} px²`;
      }
    }
    return true;
  });

  // =========================== seek ===========================
  return (t) => {
    // Parallax: one pan of the camera; each layer moves at its speed times the camera's travel.
    const c = cam(t) * CAM;
    for (const L of LAYERS) {
      L.el.style.transform = `translateX(${(-L.speed * c).toFixed(3)}px)`;
      show(L.nameEl, t, tLayer[L.key], Infinity, { dur: 0.5, dy: 12 });
      show(L.val, t, tLayer[L.key] + 0.08, Infinity, { dur: 0.5, dy: 12 });
    }
    show(ghosts, t, tPan, Infinity, { dur: 0.4, dy: 0 });
    show(camRow, t, tGentle, Infinity, { dur: 0.5, dy: 12 });
    camDot.style.transform = `translateX(${(cam(t) * 340).toFixed(2)}px)`;

    // Contrast: the failing sample, struck; then the passing one, checked.
    show(failS.panel, t, tKeep, Infinity, { dur: 0.5, dy: 12 });
    failS.strike.style.transform = `scaleX(${easeOut(p01(t, tStrike, 0.4)).toFixed(4)})`;
    show(failS.mark, t, tStrike + 0.3, Infinity, { dur: 0.3, dy: 0, scale: 0.6 });
    show(passS.panel, t, tFour, Infinity, { dur: 0.5, dy: 12 });
    show(passS.mark, t, tOne, Infinity, { dur: 0.3, dy: 0, scale: 0.6 });

    // Flashes: three smooth pulses; the gauge holds the most peaks seen in any one second.
    lamp.style.opacity = lampLevel(t).toFixed(4);
    const most = mostPerSecond(t);
    const lastStep = peaks.filter((p) => p <= t).at(-1) ?? -Infinity;
    const prev = mostPerSecond(lastStep - 1e-6);
    const g = prev + (most - prev) * easeOut(p01(t, lastStep, 0.25));
    gFill.style.transform = `scaleX(${(g / 5).toFixed(5)})`;
    reading.textContent = `${most} / s`;
    show(reading, t, tNever, Infinity, { dur: 0.3, dy: 0 });
    show(flashOk, t, tFlashOk, Infinity, { dur: 0.3, dy: 0, scale: 0.6 });
  };
}
