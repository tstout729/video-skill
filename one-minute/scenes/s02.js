// s02 The brief · ink · 5.00–13.93, a push up takes it out from 13.03.
// An adjective becomes numbers. From the cut: an empty brief, a hairline and a big saffron caret
// blinking once a second where the first word will go. "brief" types the file name. "numbers":
// "premium" types on at the caret, huge and faint. "adjectives": a strike draws
// through it. "Premium": it shrinks and lifts to a label (text spring, ζ 1.0) while its numbers type
// on in saffron mono, written from the spring constants below. "becomes": a white card and an empty
// plot arrive. Hero move, "spring": the card travels 520 px on exactly kit.spring01 (ζ 0.82, 450 ms)
// and the same function draws under it as it goes. "barely bounces": the curve's peak is ringed and
// labelled with the overshoot measured from that function. Everything holds still from 13.03.

export default async function build(root, k) {
  const { make, place, show, cueIn, chrome, spring01, easeOut, easeInOut, p01, clamp, check, sfx, box, overlap, C } = k;
  const { cutIn, outStart, cutOut } = k.win;
  const FPS = 60;
  const EPS = 1e-6;
  root.style.background = C.ink;
  root.classList.add("dark");
  chrome(root, 2, "THE BRIEF", true);

  const FAINT = "#8a857c";   // "premium": faint against the white card and numbers, still 5.0:1 on ink
  const HAIR = "rgba(236, 235, 231, 0.14)";

  // ---- the spring: the card moves on it, the curve plots it, the numbers name it ----
  const SPR = { duration: 0.45, damping: 0.82 };
  const TRAVEL = 520;
  const s = (dt) => spring01(dt, 0, SPR);            // progress dt seconds after launch
  // Measure it at 0.1 ms over 2 s: the peak, when it first reaches its mark, and when it stays
  // within 0.5 px of it on a 520 px move.
  let peak = 0, tPeak = 0, tCross = null, tSettle = 0;
  for (let i = 0; i <= 20000; i++) {
    const dt = i / 10000, v = s(dt);
    if (v > peak) { peak = v; tPeak = dt; }
    if (tCross === null && v >= 1) tCross = dt;
    if (Math.abs(1 - v) * TRAVEL > 0.5) tSettle = dt;
  }
  const over = peak - 1;
  const pct = (o) => `+${(o * 100).toFixed(1)}%`;
  const OVER_TXT = pct(over);
  const NUM_TXT = `ζ ${SPR.damping} · ${Math.round(SPR.duration * 1000)} ms`;

  // ---- cues ----
  const tBrief = cueIn(k.id, "brief");
  const tPrem = cueIn(k.id, "numbers");
  const tStrike = cueIn(k.id, "adjectives");
  const tShrink = cueIn(k.id, "premium");
  const tRig = cueIn(k.id, "becomes");
  const tMove = cueIn(k.id, "spring");
  const tMark = cueIn(k.id, "barely bounces");

  const X0 = 54;

  // ---- the empty brief (on screen from the cut): a hairline, and a caret where the first word goes ----
  const FILE = "brief.md", FILE_CPS = 30, FILE_Y = 156;
  const file = place(make("div", "mono", "", root, { fontSize: "28px", lineHeight: "36px", fontWeight: "500", color: C.mutedDark, whiteSpace: "pre", letterSpacing: "0.02em" }), X0, FILE_Y);
  const fileChars = [...FILE].map((ch) => make("span", "", ch, file, { visibility: "hidden" }));
  place(make("div", "", "", root, { background: HAIR }), X0, 214, 972, 2);

  // ---- "premium": huge and faint, then a label ----
  const BIG = 180, SMALL = 44, BIG_Y = 470, SMALL_Y = 246, S = SMALL / BIG, DY = SMALL_Y - BIG_Y;
  const wordWrap = place(make("div", "", "", root), X0, BIG_Y);
  const word = make("div", "", "", wordWrap, {
    position: "relative", fontSize: `${BIG}px`, fontWeight: "700", letterSpacing: "-0.045em", lineHeight: "0.9",
    whiteSpace: "nowrap", color: FAINT, transformOrigin: "0 0",
  });
  word.id = "s02-word";
  const PREM_CPS = 20;                                   // the word types on, 3 frames a letter
  const premChars = [..."premium"].map((ch) => make("span", "", ch, word, { visibility: "hidden" }));
  const caret = place(make("div", "", "", root, { width: "9px", borderRadius: "4px", background: C.saffron }), X0, BIG_Y);
  caret.id = "s02-caret";
  const strike = make("div", "", "", word, { position: "absolute", height: "10px", borderRadius: "5px", background: C.canvas, transformOrigin: "0 50%", transform: "scaleX(0)" });
  const STRIKE = 0.45;                                   // a pen stroke: ease-in-out
  const SHRINK = { duration: 0.5, damping: 1 };          // text: no bounce
  const shrinkP = (t) => spring01(t, tShrink, SHRINK);

  // ---- the numbers, typed from SPR ----
  const NUM_PX = 76, NUM_Y = 318;
  const num = place(make("div", "mono", "", root, { fontSize: `${NUM_PX}px`, lineHeight: "1", fontWeight: "500", whiteSpace: "pre", letterSpacing: "-0.01em" }), X0, NUM_Y);
  const numChars = [...NUM_TXT].map((ch) => make("span", "", ch, num, { color: ch === "·" ? C.mutedDark : C.saffron, visibility: "hidden" }));
  const numCaret = place(make("div", "", "", root, { width: "4px", height: "62px", borderRadius: "2px", background: C.saffron, visibility: "hidden" }), X0, NUM_Y + 8);

  // ---- the rig: a white card above its plot ----
  const CARD = 176, CARD_Y = 452;
  const cardWrap = place(make("div", "", "", root), X0, CARD_Y, CARD, CARD);
  const card = make("div", "", "", cardWrap, { position: "absolute", left: "0px", top: "0px", width: `${CARD}px`, height: `${CARD}px`, borderRadius: "28px", background: C.paper });
  card.id = "s02-card";

  // The plot: time 0–0.8 s across, the card's progress up; 1.0 is the card's mark, 520 px.
  const PX = 54, PY = 768, PW = 972, PH = 268, T_SPAN = 0.8;
  const NS = "http://www.w3.org/2000/svg";
  const plotWrap = place(make("div", "", "", root), PX, PY, PW, PH);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", PW);
  svg.setAttribute("height", PH);
  Object.assign(svg.style, { position: "absolute", left: "0px", top: "0px", overflow: "visible" });
  plotWrap.appendChild(svg);
  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v);
    parent.appendChild(e);
    return e;
  };
  const sx = (dt) => (dt / T_SPAN) * PW, sy = (v) => PH * (1 - v);
  const txt = (str, x, y, anchor, color, size = 28, parent = svg) => {
    const e = el("text", { x, y, "text-anchor": anchor, fill: color }, parent);
    e.textContent = str;
    Object.assign(e.style, { font: `500 ${size}px "Geist Mono"`, fontFeatureSettings: '"zero" 1' });
    return e;
  };
  el("path", { d: `M0 ${PH} H${PW}`, stroke: C.mutedDark, "stroke-opacity": 0.4, "stroke-width": 2, fill: "none" });
  el("path", { d: `M0 0 H${PW}`, stroke: C.mutedDark, "stroke-opacity": 0.7, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round", fill: "none" });
  const tMarkLabel = txt(`${TRAVEL} px`, 0, -18, "start", C.mutedDark);
  const t0Label = txt("0", 0, PH + 42, "start", C.mutedDark);
  const t1Label = txt(`${T_SPAN} s`, PW, PH + 42, "end", C.mutedDark);
  const curve = el("path", { d: `M0 ${PH}`, fill: "none", stroke: C.saffron, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const pen = el("circle", { cx: 0, cy: PH, r: 9, fill: C.saffron });

  // ---- the overshoot mark: a ring on the measured peak, and its size ----
  const RING_R = 15, ringC = 2 * Math.PI * RING_R;
  const peakX = sx(tPeak), peakY = sy(peak);
  const ring = el("circle", { cx: peakX, cy: peakY, r: RING_R, fill: "none", stroke: C.canvas, "stroke-width": 3,
    "stroke-dasharray": `${ringC} ${ringC}`, "stroke-dashoffset": ringC, transform: `rotate(-90 ${peakX} ${peakY})` });
  const markG = el("g", {});
  el("path", { d: `M${peakX} ${peakY - RING_R - 6} V${peakY - 44}`, stroke: C.canvas, "stroke-width": 2, "stroke-linecap": "round" }, markG);
  const markLabel = txt(OVER_TXT, peakX, peakY - 56, "middle", C.saffron, 36, markG);
  markLabel.style.fontWeight = "600";

  // ---- measure (fonts loaded): the strike's height, the typing stops, when the numbers' line is clear ----
  await document.fonts.ready;
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `700 ${BIG}px Geist`;
  const xh = ctx.measureText("x").actualBoundingBoxAscent;
  const desc = ctx.measureText("premium").actualBoundingBoxDescent;
  const probe = make("span", "", "", word, { display: "inline-block", width: "0px", height: "0px", verticalAlign: "baseline" });
  const base = probe.offsetTop;
  probe.remove();
  const W_BIG = word.offsetWidth;
  const cap = ctx.measureText("H").actualBoundingBoxAscent;
  Object.assign(caret.style, { top: `${(BIG_Y + base - cap - 4).toFixed(2)}px`, height: `${(cap + desc + 8).toFixed(2)}px` });
  Object.assign(strike.style, { left: "-10px", width: `${W_BIG + 4}px`, top: `${(base - xh / 2 - 5).toFixed(2)}px` });
  const glyphBottom = (p) => BIG_Y + DY * p + (1 + (S - 1) * p) * (base + desc);   // on the page
  // The numbers start typing on the first frame the word's descenders clear their line by 10 px.
  let tType = tShrink;
  while (glyphBottom(shrinkP(tType)) > NUM_Y - 10) tType += 1 / FPS;
  tType = Math.ceil(tType * FPS - EPS) / FPS;
  const typedAt = (j) => tType + j / FPS;                 // one letter a frame
  const tTyped = typedAt(numChars.length - 1);
  const stopsOf = (chars) => chars.map((c) => c.offsetLeft + c.offsetWidth);
  const premStops = stopsOf(premChars), numStops = stopsOf(numChars);
  const premTyped = tPrem + (premChars.length - 1) / PREM_CPS;
  // Before the word, the caret blinks: 0.55 s on, 0.45 s off, 80 ms fades, never below 15% (1 Hz).
  const blink = (t) => {
    const ph = (((t - cutIn) % 1) + 1) % 1;
    const up = clamp(ph / 0.08), down = clamp((ph - 0.55) / 0.08);
    return 0.15 + 0.85 * (ph < 0.55 ? (t - cutIn < 0.08 ? 1 : up) : 1 - down);
  };

  const RIG_IN = 0.4, PLOT_LAG = 0.15, MARK_IN = 0.4, LABEL_LAG = 0.15;
  const tSettleF = Math.ceil((tMove + tSettle) * FPS - EPS);   // first frame within 0.5 px, to stay
  const markDone = tMark + LABEL_LAG + 0.45;

  sfx(tStrike + STRIKE + 1 / FPS, "tap");            // the strike reaches the end of the word
  sfx(tMove + tCross + 1 / FPS, "pop");              // the card reaches its mark

  // ---- checks ----
  const solo = (a, b) => [Math.max(a, cutIn), Math.min(b, outStart - 1 / FPS)];
  check(`s02 card moves on kit.spring01 (ζ ${SPR.damping}, ${SPR.duration * 1000} ms): within 0.5 px of it on every frame`, solo(tMove - 2 / FPS, tMove + 1.5), (t) => {
    const want = X0 + TRAVEL * s(t - tMove), got = box(card).x;
    return Math.abs(got - want) < 0.5 || `x ${got.toFixed(2)}, the spring says ${want.toFixed(2)}`;
  });
  check(`s02 card travels ${TRAVEL} px and stays within 0.5 px of its mark from f${tSettleF} (+${tSettleF - Math.round(tMove * FPS)} f)`, solo(tSettleF / FPS, outStart), () => {
    const x = box(card).x - X0;
    return Math.abs(x - TRAVEL) <= 0.5 || `travel ${x.toFixed(2)} px`;
  });
  check(`s02 card overshoots ${OVER_TXT} (${(over * TRAVEL).toFixed(1)} px) on its peak frame`, Math.round((tMove + tPeak) * FPS) / FPS, (t) => {
    const got = (box(card).x - X0) / TRAVEL - 1, exact = s(t - tMove) - 1;
    return (Math.abs(got - exact) < 0.5 / TRAVEL && Math.abs(exact - over) < 0.0005) || `got ${(got * 100).toFixed(2)}%, peak ${(over * 100).toFixed(2)}%`;
  });
  check("s02 the curve is the card's motion: the pen and the card agree on every frame it draws", solo(tMove, tMove + T_SPAN), () => {
    const pv = 1 - Number(pen.getAttribute("cy")) / PH, cv = (box(card).x - X0) / TRAVEL;
    return Math.abs(pv - cv) * TRAVEL < 0.5 || `pen ${(pv * TRAVEL).toFixed(2)} px, card ${(cv * TRAVEL).toFixed(2)} px`;
  });
  check("s02 the overshoot label is measured from the drawn curve, and the ring sits on its peak", solo(markDone, outStart), () => {
    const ys = [...curve.getAttribute("d").matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const top = ys.reduce((a, b) => (b[1] < a[1] ? b : a));
    const drawnOver = 1 - top[1] / PH - 1;
    if (markLabel.textContent !== pct(drawnOver)) return `label ${markLabel.textContent}, curve peaks at ${pct(drawnOver)}`;
    // The top is flat to 0.01 px over ±5 ms, so judge the ring by height: it sits at the curve's
    // highest point, on the sample of the curve under its centre.
    const rx = Number(ring.getAttribute("cx")), ry = Number(ring.getAttribute("cy"));
    const under = ys.reduce((a, b) => (Math.abs(b[0] - rx) < Math.abs(a[0] - rx) ? b : a));
    return (Math.abs(ry - top[1]) < 0.05 && Math.abs(under[1] - top[1]) < 0.05 && Math.abs(under[0] - rx) < 2.1) || `ring at ${rx.toFixed(1)}, ${ry.toFixed(2)}; peak ${top[1].toFixed(2)}, curve under it ${under[1].toFixed(2)}`;
  });
  check(`s02 the numbers read “${NUM_TXT}”, the card's own spring, fully typed by f${Math.round(tTyped * FPS)}`, tTyped, () =>
    (num.textContent === NUM_TXT && numChars.every((c) => c.style.visibility === "visible")) || `${numChars.filter((c) => c.style.visibility === "visible").length}/${numChars.length} typed`);
  check("s02 typed numbers never touch the shrinking word", [tShrink, tShrink + 1.2], () => {
    const hit = numChars.findIndex((c) => overlap(c, word) > 0);
    return hit < 0 || `letter ${hit} overlaps the word`;
  });
  check("s02 one move at a time: strike, shrink, typing, rig, travel and mark never overlap", cutIn, () => {
    const seq = [["strike", tStrike, tStrike + STRIKE], ["shrink", tShrink, tShrink + 0.4], ["typing", tType, tTyped + 1 / FPS],
      ["rig", tRig, tRig + PLOT_LAG + RIG_IN], ["travel", tMove, tMove + T_SPAN], ["mark", tMark, markDone]];
    for (let i = 1; i < seq.length; i++) {
      // The typing may start while the word finishes settling (the shrink is "done" at 0.4 s, ~90%).
      if (seq[i][1] < seq[i - 1][2] - EPS && seq[i][0] !== "typing") return `${seq[i][0]} starts before ${seq[i - 1][0]} ends`;
    }
    return true;
  });
  const texts = () => [file, word, num, tMarkLabel, t0Label, t1Label, markLabel];
  check("s02 texts never overlap each other or the card", solo(tPrem, outStart), (t) => {
    // The numbers' line counts once its first letter is on (letter by letter is checked above).
    const els = [...texts(), card].filter((e) => e !== num || t >= tType - EPS);
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${els[i].textContent || els[i].id} × ${els[j].textContent || els[j].id}: ${o | 0} px²`;
    }
    return true;
  });
  check("s02 everything stays on the stage (x 54–1026, y 140–1100): nothing in the caption band", solo(cutIn, outStart), () => {
    for (const e of [...texts(), card, caret, ring]) {
      const b = box(e);
      if (b.w === 0 || getComputedStyle(e).visibility === "hidden") continue;
      if (b.x < 53.5 || b.x + b.w > 1026.5 || b.y < 140 || b.y + b.h > 1100) return `${e.textContent || e.id || e.tagName} at ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}`;
    }
    return true;
  });
  check("s02 holds still from the push: every move has settled by f" + Math.round(outStart * FPS), [outStart, cutOut], (t) => {
    const cardRest = Math.abs(1 - s(t - tMove)) * TRAVEL, wordRest = (1 - shrinkP(t)) * BIG;
    return (t >= markDone && t >= tTyped && cardRest < 0.05 && wordRest < 0.05) || `card ${cardRest.toFixed(3)} px, word ${wordRest.toFixed(3)} px from rest`;
  });

  // ---- seek ----
  return (t) => {
    // The file name types on.
    fileChars.forEach((c, j) => { c.style.visibility = t >= tBrief + j / FILE_CPS - EPS ? "visible" : "hidden"; });

    // "premium" types on at the blinking caret; the caret leaves 0.35 s after the last letter.
    let nPrem = -1;
    premChars.forEach((c, j) => {
      const on = t >= tPrem + j / PREM_CPS - EPS;
      c.style.visibility = on ? "visible" : "hidden";
      if (on) nPrem = j;
    });
    const caretOn = t < premTyped + 0.35;
    caret.style.visibility = caretOn ? "visible" : "hidden";
    caret.style.opacity = (t < tPrem ? blink(t) : 1).toFixed(4);
    caret.style.transform = `translateX(${(nPrem < 0 ? 0 : premStops[nPrem] + 14).toFixed(2)}px)`;

    // "premium" struck, then shrinks and lifts to a label.
    strike.style.transform = `scaleX(${easeInOut(p01(t, tStrike, STRIKE)).toFixed(4)})`;
    const p = shrinkP(t);
    word.style.transform = p > 0 ? `translate(0px, ${(DY * p).toFixed(2)}px) scale(${(1 + (S - 1) * p).toFixed(4)})` : "none";

    // The numbers, one letter a frame.
    let nNum = -1;
    numChars.forEach((c, j) => {
      const on = t >= typedAt(j) - EPS;
      c.style.visibility = on ? "visible" : "hidden";
      if (on) nNum = j;
    });
    const typing = t >= tType - EPS && t < tTyped + 3 / FPS;
    numCaret.style.visibility = typing ? "visible" : "hidden";
    numCaret.style.transform = `translateX(${(nNum < 0 ? 0 : numStops[nNum] + 4).toFixed(2)}px)`;

    // The rig arrives; the plot follows 150 ms later, 60% of the travel.
    show(cardWrap, t, tRig, Infinity, { dur: RIG_IN, dy: 18 });
    show(plotWrap, t, tRig + PLOT_LAG, Infinity, { dur: RIG_IN, dy: 11 });

    // Hero: the card on the spring, and the same function drawn up to now.
    const dt = t - tMove;
    card.style.transform = `translateX(${(TRAVEL * s(dt)).toFixed(3)}px)`;
    const tau = clamp(dt, 0, T_SPAN);
    let d = `M0 ${PH}`;
    if (tau > 0) {
      const n = Math.max(2, Math.ceil((480 * tau) / T_SPAN));
      for (let i = 1; i <= n; i++) {
        const x = (tau * i) / n;
        d += ` L${sx(x).toFixed(2)} ${sy(s(x)).toFixed(2)}`;
      }
    }
    curve.setAttribute("d", d);
    curve.style.opacity = tau > 0 ? "1" : "0";
    pen.setAttribute("cx", sx(tau).toFixed(2));
    pen.setAttribute("cy", sy(s(tau)).toFixed(3));

    // The mark: the ring draws round the peak, then its size rises in above it.
    ring.setAttribute("stroke-dashoffset", (ringC * (1 - easeOut(p01(t, tMark, MARK_IN)))).toFixed(2));
    ring.style.opacity = t >= tMark ? "1" : "0";
    const m = easeOut(p01(t, tMark + LABEL_LAG, 0.45));
    markG.style.opacity = m.toFixed(4);
    markG.setAttribute("transform", `translate(0 ${(10 * (1 - m)).toFixed(2)})`);
  };
}
