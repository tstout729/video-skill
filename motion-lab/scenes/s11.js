// s11 Easing and springs. Every number on screen is the one the motion runs on.
// Top card, Easing: three curves on one time axis (0–0.8 s), each drawn by the ball it moves.
//   enter: ease-out over 600 ms. exit: ease-in over 330 ms, 45% shorter (the brief's 40–50%).
//   move across: ease-in-out over 800 ms.
// Middle card, Springs (hero): on "ratio" three blocks launch on the same frame on kit.spring01 with
//   damping 1.0, 0.8 and 0.5; each traces its own curve, and the overshoot is measured from it.
// Bottom card: "Position can bounce" (a block on a ζ 0.5 spring, ✓), then "Opacity never does":
//   the same spring on opacity would reach 1.16, is clamped at 1.0 and is marked ✕.

const NS = "http://www.w3.org/2000/svg";

export default function build(root, k) {
  const { make, place, show, cueIn, spring01, plot, easeOut, easeIn, easeInOut, p01, clamp, check, box, overlap, sfx, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;
  const F = (t) => Math.round(t * FPS) / FPS;   // snap a launch to a frame

  // ---- cues ----
  const tEnter = cueIn(k.id, "entrances");
  const tExit = cueIn(k.id, "exits");
  const tExitGo = F(cueIn(k.id, "in"));          // "Exits ease in": the ball leaves on "in"
  const tShorter = cueIn(k.id, "forty to fifty");
  const tMove = cueIn(k.id, "shorter");
  const tSpring = cueIn(k.id, "damping ratio");
  const tLaunch = F(cueIn(k.id, "ratio"));
  const tFeel = [cueIn(k.id, "one has"), cueIn(k.id, "point eight"), cueIn(k.id, "point five")];
  const tPos = cueIn(k.id, "position");
  const tOpa = cueIn(k.id, "opacity");

  // ---- small builders ----
  const MONO = '"Geist Mono", ui-monospace, monospace';
  const txt = (parent, html, x, y, css = {}) =>
    place(make("div", "", html, parent, { fontSize: "30px", fontWeight: "620", whiteSpace: "nowrap", lineHeight: "1.2", ...css }), x, y);
  const mono = (parent, html, x, y, css = {}) => txt(parent, html, x, y, { fontFamily: MONO, fontSize: "28px", fontWeight: "500", ...css });
  const card = (x, y, w, h) => place(make("div", "card", "", root), x, y, w, h);
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v);
    parent.appendChild(e);
    return e;
  };
  const trace = (P, fn, xa, xb, n = 90) => {
    if (xb <= xa) return "";
    let d = "";
    for (let i = 0; i <= n; i++) {
      const x = xa + ((xb - xa) * i) / n;
      d += `${i ? "L" : "M"}${P.sx(x).toFixed(2)} ${P.sy(fn(x)).toFixed(2)}`;
    }
    return d;
  };
  // Icons: 2.5 px strokes, drawn, never glyphs.
  const icon = (parent, kind, color, size = 34) => {
    const s = svgEl("svg", { width: size, height: size, viewBox: "0 0 34 34" }, parent);
    Object.assign(s.style, { overflow: "visible", flex: "none" });
    svgEl("circle", { cx: 17, cy: 17, r: 15.5, fill: "none", stroke: color, "stroke-width": 2.5 }, s);
    svgEl("path", { d: kind === "check" ? "M10 17.5 L15 22.5 L24.5 12" : "M11.5 11.5 L22.5 22.5 M22.5 11.5 L11.5 22.5",
      fill: "none", stroke: color, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, s);
    return s;
  };

  const COLW = 312, colX = (i) => 28 + i * (COLW + 24);
  const lines = [];   // every text line, for the overlap and size checks

  // =========================== Easing ===========================
  const ENTER = 0.6, EXIT = 0.33, MOVE = 0.8;
  const SHORTER = 1 - EXIT / ENTER;                       // 0.45
  const E = card(24, 8, 1032, 392);
  lines.push(txt(E, "Easing", 28, 20, { fontSize: "32px", fontWeight: "680" }));
  const ease = [
    { role: "enter", curve: "ease-out", dur: ENTER, fn: easeOut, from: -40, to: 196, t0: tEnter, label: tEnter + 0.15 },
    { role: "exit", curve: "ease-in", dur: EXIT, fn: easeIn, from: 64, to: 344, t0: tExitGo, label: tExit },
    { role: "move across", curve: "ease-in-out", dur: MOVE, fn: easeInOut, from: 0, to: 280, t0: tMove, label: tMove + 0.15 },
  ].map((c, i) => {
    const x = colX(i);
    const P = plot(E, { x, y: 72, w: COLW, h: 124, x0: 0, x1: 0.8, y0: 0, y1: 1 });
    const path = svgEl("path", { class: "curve" }, P.svg);
    const pen = svgEl("circle", { r: 8, fill: C.accent }, P.svg);
    const track = place(make("div", "", "", E, { overflow: "hidden" }), x, 208, COLW, 40);
    make("div", "", "", track, { position: "absolute", left: "0px", right: "0px", top: "19px", height: "2px", background: C.line });
    const ball = make("div", "", "", track, { position: "absolute", left: "0px", top: "4px", width: "32px", height: "32px", borderRadius: "16px", background: C.ink });
    const l1 = txt(E, c.role, x, 262);
    const l2 = mono(E, c.curve, x, 302, { color: C.muted });
    const l3 = mono(E, `${Math.round(c.dur * 1000)} ms`, x, 340);
    lines.push(l1, l2, l3);
    return { ...c, P, path, pen, track, ball, l1, l2, l3 };
  });
  const ballX = (c, t) => c.from + (c.to - c.from) * c.fn(p01(t, c.t0, c.dur));
  // The comparison, on "forty to fifty": the entrance's curve as a ghost on the exit's axes, and the
  // part of the time axis the exit saves.
  const ex = ease[1];
  const ghost = svgEl("path", { class: "ghost", d: trace(ex.P, (x) => easeOut(clamp(x / ENTER)), 0, ENTER) }, ex.P.svg);
  const saved = svgEl("path", { d: `M${ex.P.sx(EXIT)} 133 H${ex.P.sx(ENTER)} M${ex.P.sx(EXIT)} 127 V139 M${ex.P.sx(ENTER)} 127 V139`,
    fill: "none", stroke: C.accent, "stroke-width": 3, "stroke-linecap": "round" }, ex.P.svg);
  const pct = make("span", "", ` · −${Math.round(SHORTER * 100)}%`, ex.l3, { color: C.accent, fontWeight: "650" });
  const range = make("span", "", " · 40–50% shorter", ex.l1, { color: C.accent });

  // =========================== Springs ===========================
  const SPRING_DUR = 0.7, TRAVEL = 220, BLOCK = 44;
  const S = card(24, 416, 1032, 328);
  lines.push(txt(S, "Springs <span style=\"color:var(--muted);font-weight:500\">· damping ratio ζ</span>", 28, 20, { fontSize: "32px", fontWeight: "680" }));
  const Z = [1.0, 0.8, 0.5], FEEL = ["no bounce", "premium", "playful"];
  const springs = Z.map((z, i) => {
    const x = colX(i);
    const s = (dt) => spring01(tLaunch + dt, tLaunch, { duration: SPRING_DUR, damping: z });   // the motion itself
    // Measure it: peak over 3 s at 1 ms, and the moment it stays within 0.5% of its mark.
    let peak = 0, settle = 0;
    for (let ms = 0; ms <= 3000; ms++) {
      const v = s(ms / 1000);
      peak = Math.max(peak, v);
      if (Math.abs(1 - v) > 0.005) settle = ms / 1000;
    }
    const over = Math.max(0, peak - 1);
    const P = plot(S, { x, y: 66, w: COLW, h: 110, x0: 0, x1: 1.4, y0: -0.08, y1: 1.3, axes: false });
    svgEl("path", { class: "axis", d: `M0 ${P.sy(0)} H${COLW}` }, P.svg);
    svgEl("path", { class: "ghost", d: `M0 ${P.sy(1)} H${COLW}` }, P.svg);
    const path = svgEl("path", { class: "curve" }, P.svg);
    const pen = svgEl("circle", { r: 7, fill: C.accent }, P.svg);
    const track = place(make("div", "", ""), x, 186, COLW, 48);
    S.appendChild(track);
    make("div", "", "", track, { position: "absolute", left: "0px", right: "0px", top: "23px", height: "2px", background: C.line });
    make("div", "", "", track, { position: "absolute", left: `${TRAVEL + BLOCK / 2 - 1}px`, top: "0px", width: "0px", height: "48px", borderLeft: `2.5px dashed ${C.faint}` });
    const block = make("div", "", "", track, { position: "absolute", left: "0px", top: "2px", width: `${BLOCK}px`, height: `${BLOCK}px`, borderRadius: "12px", background: C.accent });
    block.id = `s11-spring-${String(z * 10).padStart(2, "0")}`;   // #s11-spring-10, -08, -05
    const l1 = mono(S, `ζ ${z.toFixed(1)}`, x, 244, { fontSize: "32px", fontWeight: "600", color: C.accent });
    const feel = txt(S, FEEL[i], x + 108, 245);
    const l2 = mono(S, `overshoot ${over < 0.0005 ? "0" : (over * 100).toFixed(1)}%`, x, 284, { color: C.muted });
    lines.push(l1, feel, l2);
    return { z, s, peak, over, settle, P, path, pen, block, l1, feel, l2 };
  });

  // =========================== Position / opacity ===========================
  const O = card(24, 760, 1032, 224);
  const BOUNCY = { duration: SPRING_DUR, damping: 0.5 };
  const tPosGo = F(tPos + 0.35), tOpaGo = F(tOpa + 0.3), OK_AT = 0.75;   // ✓ once the block is within 3% of its mark
  const sB = (t, t0) => spring01(t, t0, BOUNCY);
  let peakB = 0, tPeakB = 0;
  for (let ms = 0; ms <= 2000; ms++) { const v = sB(ms / 1000, 0); if (v > peakB) { peakB = v; tPeakB = ms / 1000; } }
  // Left: position may bounce.
  const head = (html, x) => txt(O, `<span>${html}</span>`, x, 22, { fontSize: "32px", fontWeight: "680", display: "flex", alignItems: "center", gap: "14px" });
  const posHead = head("Position can bounce", 28);
  const posOk = icon(posHead, "check", C.green);
  const posTrack = place(make("div", "", ""), 28, 100, 230, 56);
  O.appendChild(posTrack);
  make("div", "", "", posTrack, { position: "absolute", left: "0px", right: "0px", top: "27px", height: "2px", background: C.line });
  make("div", "", "", posTrack, { position: "absolute", left: "143px", top: "0px", width: "0px", height: "56px", borderLeft: `2.5px dashed ${C.faint}` });
  const POS_TRAVEL = 120;
  const posBlock = make("div", "", "", posTrack, { position: "absolute", left: "0px", top: "6px", width: "44px", height: "44px", borderRadius: "12px", background: C.accent });
  const posP = plot(O, { x: 282, y: 78, w: 220, h: 96, x0: 0, x1: 1.2, y0: 0, y1: 1.3, axes: false });
  svgEl("path", { class: "axis", d: `M0 ${posP.sy(0)} H220` }, posP.svg);
  svgEl("path", { class: "ghost", d: `M0 ${posP.sy(1)} H220` }, posP.svg);
  const posPath = svgEl("path", { class: "curve" }, posP.svg);
  const posNote = mono(O, `peaks at ${peakB.toFixed(2)}`, 28, 180, { color: C.muted });
  // Right: opacity never does. The same spring would reach peakB; opacity stops at 1.0.
  const opaHead = head("Opacity never does", 548);
  const swatch = place(make("div", "", "", O, { borderRadius: "14px", background: C.accent }), 548, 86, 80, 80);
  const slot = place(make("div", "", "", O, { borderRadius: "14px", border: `2.5px dashed ${C.line}` }), 548, 86, 80, 80);
  const opaP = plot(O, { x: 652, y: 78, w: 220, h: 96, x0: 0, x1: 1.2, y0: 0, y1: 1.3, axes: false });
  svgEl("path", { class: "axis", d: `M0 ${opaP.sy(0)} H220` }, opaP.svg);
  svgEl("path", { class: "ghost", d: `M0 ${opaP.sy(1)} H220` }, opaP.svg);
  const lost = svgEl("path", { fill: "#fde8eb", stroke: "none" }, opaP.svg);       // the part opacity loses
  const wouldPath = svgEl("path", { fill: "none", stroke: C.red, "stroke-width": 3.5, "stroke-linecap": "round" }, opaP.svg);
  const opaPath = svgEl("path", { class: "curve" }, opaP.svg);
  const peakMark = svgEl("g", {}, opaP.svg);
  svgEl("path", { d: "M-8 -8 L8 8 M8 -8 L-8 8", stroke: C.red, "stroke-width": 3.5, "stroke-linecap": "round" }, peakMark);
  peakMark.setAttribute("transform", `translate(${opaP.sx(tPeakB).toFixed(2)} ${(opaP.sy(peakB) - 16).toFixed(2)})`);
  const opaNote = mono(O, `${peakB.toFixed(2)} → clamped 1.00`, 652, 180, { color: C.muted });
  lines.push(posHead, posNote, opaHead, opaNote);
  const opacityOf = (t) => Math.min(1, sB(t, tOpaGo));   // what the swatch is given

  sfx(tPosGo + OK_AT + 1 / FPS, "success");  // the ✓ lands as the block settles
  sfx(tOpaGo + tPeakB + 1 / FPS, "tap");    // the ✕ pins on the clamped peak

  // =========================== checks ===========================
  const offset = (el) => box(el).x - box(el.parentElement).x;   // a block's travel, as the viewer sees it
  check("s11 springs: ζ 1.0, 0.8, 0.5 launch on one frame", [tLaunch, tLaunch + 1 / FPS], (t) => {
    const xs = springs.map((s) => offset(s.block));
    return t < tLaunch + 0.5 / FPS ? xs.every((x) => Math.abs(x) < 0.01) || `at launch ${xs.map((x) => x.toFixed(2))}`
      : xs.every((x) => x > 0) || `next frame ${xs.map((x) => x.toFixed(2))}`;
  });
  for (const sp of springs) {
    if (sp.z < 1) {
      // Peak of an underdamped step: at π/ωd, 1 + exp(−ζπ/√(1−ζ²)). Measure the block there.
      const wd = (2 * Math.PI / SPRING_DUR) * Math.sqrt(1 - sp.z * sp.z), tp = Math.PI / wd;
      const want = Math.exp((-sp.z * Math.PI) / Math.sqrt(1 - sp.z * sp.z));
      check(`s11 spring ζ ${sp.z}: rendered overshoot ${(want * 100).toFixed(1)}% at its peak`, F(tLaunch + tp), (t) => {
        const got = offset(sp.block) / TRAVEL - 1, exact = sp.s(t - tLaunch) - 1;
        return (Math.abs(got - exact) < 0.5 / TRAVEL && Math.abs(exact - want) < 0.002) || `got ${(got * 100).toFixed(2)}% want ${(want * 100).toFixed(2)}%`;
      });
    } else {
      check("s11 spring ζ 1.0: never passes its mark", [tLaunch, tLaunch + 1.4], () => offset(sp.block) <= TRAVEL + 0.01 || `x ${offset(sp.block).toFixed(2)}`);
    }
    check(`s11 spring ζ ${sp.z.toFixed(1)}: settled on its mark from f${Math.ceil((tLaunch + sp.settle) * FPS)}`,
      [F(tLaunch + sp.settle) + 1 / FPS, cutOut - 1 / FPS], () => Math.abs(offset(sp.block) - TRAVEL) <= 0.005 * TRAVEL + 0.01 || `x ${offset(sp.block).toFixed(2)}`);
  }
  check("s11 springs: overshoot readouts 0%, 1.5%, 16.3%", tFeel[2] + 1, () =>
    springs.map((s) => s.l2.textContent).join(" | ") === "overshoot 0% | overshoot 1.5% | overshoot 16.3%" || springs.map((s) => s.l2.textContent).join(" | "));
  // The balls, timed from the rendered frames: on every frame of the move, the ball's progress is
  // exactly its curve at (t − t0) / duration, so the duration on screen is the duration in the label.
  for (const c of ease) {
    check(`s11 ${c.role}: the ball follows ${c.curve} over exactly ${Math.round(c.dur * 1000)} ms`, [c.t0, c.t0 + c.dur + 3 / FPS], (t) => {
      const got = (box(c.ball).x - box(c.track).x - c.from) / (c.to - c.from), want = c.fn(p01(t, c.t0, c.dur));
      return Math.abs(got - want) < 0.002 || `progress ${got.toFixed(4)} want ${want.toFixed(4)}`;
    });
  }
  check(`s11 exit is ${Math.round(SHORTER * 100)}% shorter than the entrance (40–50%)`, tShorter + 1, () =>
    (SHORTER >= 0.4 && SHORTER <= 0.5 && ease[1].l3.textContent === `${EXIT * 1000} ms · −${Math.round(SHORTER * 100)}%`) || `${SHORTER} "${ease[1].l3.textContent}"`);
  check("s11 the exit's curve ends at 55% of the entrance's on the shared axis", tShorter + 1, () => {
    const r = (ex.P.sx(EXIT) - ex.P.sx(0)) / (ex.P.sx(ENTER) - ex.P.sx(0));
    return Math.abs(r - EXIT / ENTER) < 1e-9 || `${r}`;
  });
  check("s11 opacity is clamped: never above 1, and 1.0 at the would-be peak", [tOpaGo, tOpaGo + 1.2], (t) => {
    const o = Number(getComputedStyle(swatch).opacity);
    if (o > 1) return `opacity ${o}`;
    if (Math.abs(t - (tOpaGo + tPeakB)) < 0.5 / FPS) return (o === 1 && sB(t, tOpaGo) > 1.1) || `at peak ${o}`;
    return Math.abs(o - opacityOf(t)) < 0.001 || `opacity ${o} want ${opacityOf(t)}`;
  });
  check("s11 text is 28 px or larger", cutOut - 2 / FPS, () => {
    const small = [...root.querySelectorAll("div, span")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 28);
    return !small.length || small.map((el) => `${el.textContent.slice(0, 16)} ${getComputedStyle(el).fontSize}`).join("; ");
  });
  check("s11 text lines and plots don't overlap; all inside the stage", cutOut - 2 / FPS, () => {
    const els = [...lines, ...ease.map((c) => c.P.svg), ...springs.map((s) => s.P.svg), posP.svg, opaP.svg, swatch];
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
    // Easing: the curve is drawn by the ball's own clock, so the pen and the ball move together.
    for (const c of ease) {
      const e = clamp(t - c.t0, 0, c.dur);
      c.path.setAttribute("d", t > c.t0 ? trace(c.P, (x) => c.fn(x / c.dur), 0, e) : "");
      c.pen.setAttribute("cx", c.P.sx(e).toFixed(2));
      c.pen.setAttribute("cy", c.P.sy(c.fn(e / c.dur)).toFixed(2));
      c.pen.style.opacity = t > c.t0 ? 1 : 0;
      c.ball.style.transform = `translateX(${ballX(c, t).toFixed(3)}px)`;
      [c.l1, c.l2, c.l3].forEach((el, j) => show(el, t, c.label + j * 0.06, Infinity, { dur: 0.5, dy: 12 }));
    }
    show(ex.ball, t, tExit, Infinity, { dur: 0.4, dy: 0 });   // the exit's ball arrives with its label, then leaves
    ex.ball.style.transform = `translateX(${ballX(ex, t).toFixed(3)}px)`;
    const g = easeOut(p01(t, tShorter, 0.5));
    ghost.style.opacity = g.toFixed(4);
    saved.style.opacity = g.toFixed(4);
    show(range, t, tShorter, Infinity, { dur: 0.5, dy: 0 });
    show(pct, t, tShorter + 0.15, Infinity, { dur: 0.5, dy: 0 });

    // Springs: the hero. Three blocks, one launch frame; each traces its own step response.
    for (const sp of springs) {
      const dt = clamp(t - tLaunch, 0, 1.4);
      sp.path.setAttribute("d", t > tLaunch ? trace(sp.P, sp.s, 0, dt, 120) : "");
      sp.pen.setAttribute("cx", sp.P.sx(dt).toFixed(2));
      sp.pen.setAttribute("cy", sp.P.sy(sp.s(dt)).toFixed(2));
      sp.pen.style.opacity = t > tLaunch ? 1 : 0;
      sp.block.style.transform = `translateX(${(TRAVEL * sp.s(t - tLaunch)).toFixed(2)}px)`;
      show(sp.l1, t, tSpring, Infinity, { dur: 0.5, dy: 12 });
    }
    springs.forEach((sp, i) => {
      show(sp.feel, t, tFeel[i], Infinity, { dur: 0.5, dy: 12 });
      show(sp.l2, t, tFeel[i] + 0.06, Infinity, { dur: 0.5, dy: 12 });
    });

    // Position can bounce.
    show(O, t, tPos, Infinity, { dur: 0.5, dy: 16 });
    for (const el of [posHead, posTrack, posP.svg]) show(el, t, tPos, Infinity, { dur: 0.5, dy: 12 });
    posBlock.style.transform = `translateX(${(POS_TRAVEL * sB(t, tPosGo)).toFixed(2)}px)`;
    posPath.setAttribute("d", t > tPosGo ? trace(posP, (x) => sB(x, 0), 0, clamp(t - tPosGo, 0, 1.2), 100) : "");
    show(posOk, t, tPosGo + OK_AT, Infinity, { dur: 0.35, dy: 0, scale: 0.6 });
    show(posNote, t, tPosGo + OK_AT, Infinity, { dur: 0.5, dy: 12 });

    // Opacity never does: the spring's overshoot is cut off at 1.0 and marked.
    for (const el of [opaHead, opaP.svg, slot]) show(el, t, tOpa, Infinity, { dur: 0.5, dy: 12 });
    swatch.style.opacity = opacityOf(t).toFixed(4);
    const de = clamp(t - tOpaGo, 0, 1.2);
    // Only the part above 1.0 is drawn in red, with its area tinted: what the clamp throws away.
    const above = [];
    for (let i = 0; i <= 100; i++) { const x = (de * i) / 100, v = sB(x, 0); if (v > 1) above.push([x, v]); }
    const segD = above.map(([x, v], i) => `${i ? "L" : "M"}${opaP.sx(x).toFixed(2)} ${opaP.sy(v).toFixed(2)}`).join("");
    wouldPath.setAttribute("d", t > tOpaGo && above.length > 1 ? segD : "");
    lost.setAttribute("d", t > tOpaGo && above.length > 1 ? `${segD}L${opaP.sx(above.at(-1)[0]).toFixed(2)} ${opaP.sy(1).toFixed(2)}L${opaP.sx(above[0][0]).toFixed(2)} ${opaP.sy(1).toFixed(2)}Z` : "");
    opaPath.setAttribute("d", t > tOpaGo ? trace(opaP, (x) => Math.min(1, sB(x, 0)), 0, de, 100) : "");
    peakMark.style.opacity = t >= tOpaGo + tPeakB ? 1 : 0;
    show(opaNote, t, tOpaGo + tPeakB + 0.1, Infinity, { dur: 0.5, dy: 12 });
  };
}
