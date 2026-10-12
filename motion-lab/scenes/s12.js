// s12 Durations, stagger, beats, holds. Four cards, each demo running on its real number.
// Durations: one ruler in ms. A block grows (ease-in-out) to its duration on the ruler in exactly that long, and its
//   stopwatch counts the real elapsed time: feedback 100 ms (on "tenth"), UI move 350 ms (on "and"),
//   hero reveal 750 ms (on "six"), each inside its band (100–200, 200–500, 600–900).
// Stagger: on "list items" six rows enter 60 ms apart (400 ms ease-out each); beside them the entrance
//   bars and their start offsets, +0 … +300 ms.
// Beat grid (the scene's hero): 113 BPM at 24 fps is 12.74 frames a beat. Row 1 rounds that to 13 and
//   adds it up; row 2 rounds each beat from time, round(n × 60/113 × 24). Beats 1–16 reveal on
//   "Compute"; row 1 drifts, its error in frames grows and turns red: +4 frames (167 ms) by beat 16.
// Holds: "Two words" enters on "text" and a countdown bar drains for 0.3 × 2 + 0.5 = 1.1 s.

const NS = "http://www.w3.org/2000/svg";

export default function build(root, k) {
  const { make, place, show, cueIn, easeInOut, p01, clamp, check, box, overlap, sfx, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;
  const F = (t) => Math.round(t * FPS) / FPS;   // snap a launch to a frame

  // ---- cues ----
  const tFeedback = F(cueIn(k.id, "tenth"));
  const tUI = F(cueIn(k.id, "and"));
  const tHeroGo = F(cueIn(k.id, "six"));
  const tList = cueIn(k.id, "list items");
  const tRange = cueIn(k.id, "forty to eighty");
  const tApart = cueIn(k.id, "apart");
  const tBeats = cueIn(k.id, "compute");
  const tNever = cueIn(k.id, "never");
  const tDrift = cueIn(k.id, "drift");
  const tText = cueIn(k.id, "text");
  const tPlus = cueIn(k.id, "plus");

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
  const checkIcon = (parent) => {   // drawn, 2.5 px strokes
    const s = svgEl("svg", { width: 34, height: 34, viewBox: "0 0 34 34" }, parent);
    Object.assign(s.style, { overflow: "visible", flex: "none" });
    svgEl("circle", { cx: 17, cy: 17, r: 15.5, fill: "none", stroke: C.green, "stroke-width": 2.5 }, s);
    svgEl("path", { d: "M10 17.5 L15 22.5 L24.5 12", fill: "none", stroke: C.green, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
    return s;
  };
  const lines = [];   // every text line, for the overlap and size checks
  const BAND = "#f1f0ec";

  // =========================== Durations ===========================
  const D = card(24, 8, 1032, 256);
  lines.push(head(D, "Durations <span style=\"color:var(--muted);font-weight:500\">· ms</span>"));
  const RX = 260, K = 0.72;                       // the ruler: 0–1000 ms over 720 px
  const rx = (ms) => RX + ms * K;
  const DUR = [
    { name: "feedback", d: 100, band: [100, 200], t0: tFeedback },
    { name: "UI move", d: 350, band: [200, 500], t0: tUI },
    { name: "hero reveal", d: 750, band: [600, 900], t0: tHeroGo },
  ].map((r, i) => {
    const y = 66 + i * 44;
    const nameEl = txt(D, r.name, 28, y);
    const band = rect(D, rx(r.band[0]), y + 1, (r.band[1] - r.band[0]) * K, 34, { background: BAND, borderRadius: "8px" });
    const bar = rect(D, RX, y + 4, r.d * K, 28, { background: C.accent, borderRadius: "8px", transformOrigin: "left center" });
    const out = mono(D, "", rx(r.d) + 14, y + 1, { fontWeight: "600" });
    lines.push(nameEl, out);
    return { ...r, y, nameEl, band, bar, out };
  });
  DUR[2].bar.id = "s12-hero-bar";
  rect(D, RX, 202, 720, 2, { background: C.faint });
  const TICKS = [0, 100, 200, 500, 600, 900, 1000];
  for (const ms of TICKS) {
    rect(D, rx(ms) - 1, 196, 2, 12, { background: C.faint });
    lines.push(mono(D, String(ms), rx(ms) - 32, 212, { width: "64px", textAlign: "center", color: C.muted }));
  }

  // =========================== Stagger ===========================
  const SG = card(24, 274, 1032, 248);
  const STAGGER = 0.06, ENTER = 0.4, GX = 330, GK = 0.4;   // gantt: 0.4 px per ms
  rect(SG, GX - 1, 14, 2, 222, { background: C.line });
  const LINE_W = [178, 132, 204, 118, 166, 146];
  const items = LINE_W.map((w, i) => {
    const y = 20 + i * 36, start = tList + i * STAGGER;
    const row = rect(SG, 28, y, 260, 28, { background: BAND, borderRadius: "8px" });
    make("div", "", "", row, { position: "absolute", left: "10px", top: "7px", width: "14px", height: "14px", borderRadius: "7px", background: C.accent });
    make("div", "", "", row, { position: "absolute", left: "36px", top: "9px", width: `${w}px`, height: "10px", borderRadius: "5px", background: C.line });
    const bar = rect(SG, GX + i * STAGGER * 1000 * GK, y + 8, ENTER * 1000 * GK, 12, { background: C.accent, borderRadius: "6px", transformOrigin: "left center" });
    const lab = mono(SG, `+${Math.round(i * STAGGER * 1000)} ms`, GX + i * STAGGER * 1000 * GK + ENTER * 1000 * GK + 12, y - 3);
    lines.push(lab);
    return { row, bar, lab, start };
  });
  items[0].row.id = "s12-item-0";
  lines.push(txt(SG, "Stagger", 800, 18, { fontSize: "32px", fontWeight: "680" }));
  lines.push(txt(SG, "list items", 800, 60, { color: C.muted, fontWeight: "500" }));
  const range = mono(SG, "40–80 ms", 800, 126, { fontSize: "30px", color: C.muted });
  const apart = mono(SG, "60 ms apart", 800, 170, { fontSize: "30px", color: C.accent, fontWeight: "600" });
  lines.push(range, apart);

  // =========================== Beat grid ===========================
  // The numbers, computed: frames per beat, rounded and added up, against each beat rounded from time.
  const BPM = 113, FPS24 = 24, N = 16;
  const FPB = (FPS24 * 60) / BPM;                  // 12.743…
  const STEP = Math.round(FPB);                    // 13
  const beats = [];
  for (let n = 1, acc = 0; n <= N; n++) {
    acc += STEP;                                    // rounded once, then accumulated
    const fromTime = Math.round(((n * 60) / BPM) * FPS24);
    beats.push({ n, acc, fromTime, exact: n * FPB, err: acc - fromTime });
  }
  const last = beats.at(-1);
  const B = card(24, 532, 1032, 268);
  lines.push(head(B, "Beat grid <span style=\"color:var(--muted);font-weight:500\">· 113 BPM at 24 fps</span>"));
  lines.push(mono(B, `24 × 60 ÷ 113 = ${FPB.toFixed(2)} f`, 604, 22, { color: C.muted, width: "400px", textAlign: "right" }));
  const X0 = 28, PX = 976 / 212;                   // frames 0–212 across the card
  const xf = (f) => X0 + f * PX;
  const ROW1 = 104, ROW2 = 218, MH = 32;
  const lab1 = txt(B, `rounded: ${FPB.toFixed(2)} → ${STEP}, added up`, 28, 62);
  const lab2 = txt(B, `from time: round(n × ${FPB.toFixed(2)})`, 28, 176);
  const late = mono(B, `+${last.err} frames · ${Math.round((last.err / FPS24) * 1000)} ms`, 604, 63, { color: C.red, fontWeight: "600", width: "400px", textAlign: "right" });
  const onLine = mono(B, "on the line", 704, 177, { color: C.green, fontWeight: "600", width: "300px", textAlign: "right" });
  lines.push(lab1, lab2, late, onLine);
  for (const y of [ROW1, ROW2]) {
    rect(B, X0, y + MH / 2 - 1, 976, 2, { background: C.line });
    rect(B, xf(0) - 3, y, 6, MH, { background: C.ink, borderRadius: "3px" });          // beat 0
  }
  // The true beat, n × 12.74 frames: a short dashed line through both rows.
  for (const b of beats) for (const y of [ROW1, ROW2]) rect(B, xf(b.exact) - 1, y - 6, 0, MH + 12, { borderLeft: `2px dashed ${C.faint}` });
  const marks = beats.map((b) => {
    const errBar = rect(B, xf(b.fromTime), ROW1 + MH / 2 - 3, (b.acc - b.fromTime) * PX, 6, { background: C.red, borderRadius: "3px" });
    const m1 = rect(B, xf(b.acc) - 3, ROW1, 6, MH, { background: b.err > 0 ? C.red : C.ink, borderRadius: "3px" });
    const m2 = rect(B, xf(b.fromTime) - 3, ROW2, 6, MH, { background: C.ink, borderRadius: "3px" });
    const num = mono(B, String(b.err), xf(b.acc) - 20, ROW1 + MH + 4, { width: "40px", textAlign: "center", color: b.err > 0 ? C.red : C.muted, fontWeight: "600" });
    lines.push(num);
    return { ...b, errBar, m1, m2, num, at: tBeats + (b.n - 1) * 0.14 };
  });

  // =========================== Holds ===========================
  const TITLE = "Two words";
  const WORDS = TITLE.split(/\s+/).length;
  const HOLD = 0.3 * WORDS + 0.5;                  // 1.1 s for two words
  const H = card(24, 810, 1032, 172);
  lines.push(head(H, "Holds"));
  const title = place(make("div", "h1", TITLE, H, { whiteSpace: "nowrap" }), 28, 60);
  const track = rect(H, 28, 142, 360, 12, { background: C.line, borderRadius: "6px", overflow: "hidden" });
  const fill = make("div", "", "", track, { position: "absolute", inset: "0px", background: C.accent, borderRadius: "6px", transformOrigin: "left center" });
  const readWrap = txt(H, "", 404, 126, { display: "flex", alignItems: "center", gap: "12px" });
  const readout = make("span", "", "", readWrap, { fontFamily: MONO, fontSize: "30px", fontWeight: "600" });
  const ok = checkIcon(readWrap);
  const f1 = mono(H, `0.3 s × ${WORDS} words`, 680, 58, { fontSize: "30px" });
  const f2 = mono(H, `+ 0.5 s = ${HOLD.toFixed(1)} s`, 680, 102, { fontSize: "30px", fontWeight: "600" });
  lines.push(title, readWrap, f1, f2);
  const tTitle = tText, tCount = F(tText + 0.5);   // the hold counts from when the title has arrived

  sfx(tDrift + 1 / FPS, "pop");                    // the red drift readout pins
  sfx(tCount + HOLD + 1 / FPS, "success");         // the hold's check turns green

  // =========================== checks ===========================
  check("s12 durations: each block reaches its length on its exact frame (100 / 350 / 750 ms)", [tFeedback, tHeroGo + 0.8], (t) => {
    for (const r of DUR) {
      const w = box(r.bar).w, full = r.d * K, end = r.t0 + r.d / 1000;
      if (t >= end - 1e-6 && Math.abs(w - full) > 0.05) return `${r.name} ${w.toFixed(2)} at end`;
      if (t > r.t0 && t < end - 1e-6 && r.out.textContent === `${r.d} ms`) return `${r.name} readout done early`;
      if (t >= r.t0 && Math.abs(w - full * easeInOut(p01(t, r.t0, r.d / 1000))) > 0.05) return `${r.name} off its curve`;
      if (t >= end - 1e-6 && r.out.textContent !== `${r.d} ms`) return `${r.name} readout "${r.out.textContent}"`;
    }
    return true;
  });
  check("s12 durations: each lands inside its band", tHeroGo + 1, () =>
    DUR.every((r) => { const b = box(r.bar), a = box(r.band); return b.x + b.w >= a.x - 0.5 && b.x + b.w <= a.x + a.w + 0.5; }) || "outside");
  // Opacity is written to 4 decimals, so a row's start can be read back from it to well under 1 ms
  // while the row is mid-entrance (opacity 0.001–0.99). Every frame compares the neighbours it can read.
  check("s12 stagger: rows start 60 ms apart, measured from their rendered opacity", [tList + 0.07, tList + 0.5], (t) => {
    const starts = items.map((it) => {
      const v = Number(getComputedStyle(it.row).opacity);
      return v > 0.001 && v < 0.99 ? t - ENTER * (1 - Math.cbrt(1 - v)) : null;   // invert the ease-out entrance
    });
    const gaps = [];
    starts.forEach((s, i) => { if (i && s !== null && starts[i - 1] !== null) gaps.push((s - starts[i - 1]) * 1000); });
    if (!gaps.length) return "no two neighbouring rows mid-entrance";
    return gaps.every((g) => Math.abs(g - 60) < 1) || `gaps ${gaps.map((g) => g.toFixed(2)).join(", ")} ms`;
  });
  check("s12 stagger: offsets read +0 … +300 ms", tApart, () =>
    items.map((it) => it.lab.textContent).join(" ") === "+0 ms +60 ms +120 ms +180 ms +240 ms +300 ms" || items.map((it) => it.lab.textContent).join(" "));
  check(`s12 beat grid: ${FPB.toFixed(4)} f/beat, rounded ${STEP}, drift 0→${last.err} frames over ${N} beats`, cutOut - 2 / FPS, () => {
    if (Math.abs(FPB - 12.7434) > 1e-4 || STEP !== 13) return `fpb ${FPB} step ${STEP}`;
    const errs = beats.map((b) => b.err).join("");
    if (errs !== "0111122223333444") return `errors ${errs}`;
    const shown = marks.map((m) => m.num.textContent).join("");
    return shown === errs || `shown ${shown}`;
  });
  check("s12 beat grid: markers sit on their frames (row 1 at 13n, row 2 at round(n × 12.74))", cutOut - 2 / FPS, () => {
    const o = box(B).x;
    for (const m of marks) {
      const a = box(m.m1).cx - o - X0, b = box(m.m2).cx - o - X0;
      if (Math.abs(a - m.acc * PX) > 0.05 || Math.abs(b - m.fromTime * PX) > 0.05) return `beat ${m.n}: ${(a / PX).toFixed(2)} / ${(b / PX).toFixed(2)} frames`;
      if (Math.abs(m.fromTime - m.exact) > 0.5) return `beat ${m.n} from time is ${(m.fromTime - m.exact).toFixed(2)} f off`;
    }
    return true;
  });
  check("s12 beat grid: drift readout is +4 frames · 167 ms", tDrift + 1, () => late.textContent === "+4 frames · 167 ms" || late.textContent);
  check(`s12 hold: the bar drains over exactly ${HOLD.toFixed(1)} s for ${WORDS} words`, [tCount - 2 / FPS, tCount + HOLD + 2 / FPS], (t) => {
    if (Math.abs(HOLD - 1.1) > 1e-9 || WORDS !== 2) return `${WORDS} words, ${HOLD} s`;
    const r = box(fill).w / box(track).w, want = 1 - p01(t, tCount, HOLD);
    if (Math.abs(r - want) > 0.002) return `bar ${r.toFixed(4)} want ${want.toFixed(4)}`;
    if (t < tCount + HOLD - 1e-6 && r <= 0) return "empty early";
    return true;
  });
  check("s12 the title holds still while it is read", [tTitle + 0.5, cutOut - 2 / FPS], () => {
    const b = box(title), o = box(H);
    return (Math.abs(b.x - o.x - 28) < 0.01 && Math.abs(b.y - o.y - 60) < 0.01) || `title at ${(b.x - o.x).toFixed(2)}, ${(b.y - o.y).toFixed(2)}`;
  });
  check("s12 text is 28 px or larger", cutOut - 2 / FPS, () => {
    const small = [...root.querySelectorAll("div, span")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 28);
    return !small.length || small.map((el) => `${el.textContent.slice(0, 16)} ${getComputedStyle(el).fontSize}`).join("; ");
  });
  check("s12 text lines don't overlap each other or the marks; all inside the stage", cutOut - 2 / FPS, () => {
    const els = [...lines, ...DUR.map((r) => r.bar), ...items.map((it) => it.bar), ...items.map((it) => it.row), track];
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
    // Durations: each block grows to its length in exactly its duration; the stopwatch is real time.
    for (const r of DUR) {
      r.bar.style.transform = `scaleX(${easeInOut(p01(t, r.t0, r.d / 1000)).toFixed(5)})`;   // a move across the ruler: ease-in-out
      r.bar.style.visibility = t > r.t0 ? "visible" : "hidden";
      r.out.textContent = `${Math.round(clamp(t - r.t0, 0, r.d / 1000) * 1000)} ms`;
      show(r.out, t, r.t0, Infinity, { dur: 0.15, dy: 0 });
    }

    // Stagger: the rows, their entrance bars (linear progress) and offsets, 60 ms apart.
    for (const it of items) {
      show(it.row, t, it.start, Infinity, { dur: ENTER, dx: -24, dy: 0 });
      it.bar.style.transform = `scaleX(${p01(t, it.start, ENTER).toFixed(4)})`;
      it.bar.style.visibility = t > it.start ? "visible" : "hidden";
      show(it.lab, t, it.start, Infinity, { dur: ENTER, dy: 0 });
    }
    show(range, t, tRange, Infinity, { dur: 0.5, dy: 12 });
    show(apart, t, tApart, Infinity, { dur: 0.5, dy: 12 });

    // Beat grid: beats 1–16 appear 140 ms apart; row 1's error grows and turns red.
    for (const m of marks) {
      for (const el of [m.m1, m.m2]) show(el, t, m.at, Infinity, { dur: 0.3, dy: 0, scale: 0.6 });
      show(m.errBar, t, m.at + 0.1, Infinity, { dur: 0.3, dy: 0 });
      show(m.num, t, m.at + 0.1, Infinity, { dur: 0.3, dy: 0 });
    }
    show(onLine, t, tNever, Infinity, { dur: 0.5, dy: 0, dx: 16 });
    show(late, t, tDrift, Infinity, { dur: 0.5, dy: 0, dx: 16 });

    // Holds: the title arrives, then the bar drains for exactly HOLD seconds.
    show(title, t, tTitle, Infinity, { dur: 0.5, dy: 12 });
    show(track, t, tTitle, Infinity, { dur: 0.5, dy: 0 });
    show(readWrap, t, tTitle, Infinity, { dur: 0.5, dy: 0 });
    const left = HOLD - clamp(t - tCount, 0, HOLD);
    fill.style.transform = `scaleX(${(left / HOLD).toFixed(5)})`;
    const done = t >= tCount + HOLD - 1e-6;
    readout.textContent = done ? `held ${HOLD.toFixed(2)} s` : `${left.toFixed(2)} s`;
    readout.style.color = done ? C.green : C.ink;
    show(ok, t, tCount + HOLD, Infinity, { dur: 0.3, dy: 0, scale: 0.6 });
    show(f1, t, tPlus, Infinity, { dur: 0.5, dy: 12 });
    show(f2, t, tPlus + 0.08, Infinity, { dur: 0.5, dy: 12 });
  };
}
