// s08 Ways in. Two option cards side by side from the cut: "Claude app" (full) and "Claude Code"
// (waiting at 45%). On "no install" a chip pins to the app card. On "Claude Code" the focus moves to
// the second card, and its loop builds on the narrator's words: render, look, fix, each node lighting
// as its arc draws, then the loop closes. Below, on "Start", an effort control (low / medium / high);
// hero move: on "medium" the accent pill springs onto medium (ζ 0.82). On "raise" a "raise" chip
// waits under high; on "after two" two red ✕ marks appear 120 ms apart and "raise" lights.

export default function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, easeInOut, p01, mix, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tNoInstall = cueIn(k.id, "no install");
  const tCC = cueIn(k.id, "claude code");
  const tRender = cueIn(k.id, "renders");
  const tLook = cueIn(k.id, "looks");
  const tFix = cueIn(k.id, "fixes");
  const tStart = cueIn(k.id, "start at");
  const tMedium = cueIn(k.id, "medium");
  const tRaise = cueIn(k.id, "raise");
  const tMiss = cueIn(k.id, "after two");

  // ---- the two cards ----
  // A static layout: the cards sit high enough that the effort rule fits below them without a move
  // (a rise before "Start" was tried; "itself" runs to 121.52 s, so the pause is too short).
  const CY = 140, CH = 500;
  const cardA = place(make("div", "card", "", root), 80, CY, 430, CH);
  const cardB = place(make("div", "card", "", root), 550, CY, 450, CH);
  make("div", "h2", "Claude app", cardA, { position: "absolute", left: "36px", top: "34px" });
  make("div", "h2", "Claude Code", cardB, { position: "absolute", left: "36px", top: "34px" });
  const noInstall = place(make("div", "chip accent", "no install", cardA, { fontSize: "30px" }), 36, 108);

  // The app: a chat on the left, the preview panel on the right with the piece playing in it.
  const icon = make("div", "", "", cardA, { position: "absolute", left: "36px", top: "236px" });
  icon.innerHTML = `<svg width="358" height="214" viewBox="0 0 358 214" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1.25" y="1.25" width="355.5" height="211.5" rx="20"/>
    <line x1="140" y1="1.25" x2="140" y2="212.75"/>
    <rect x="22" y="30" width="96" height="30" rx="15"/><rect x="22" y="76" width="70" height="30" rx="15"/><rect x="22" y="122" width="96" height="30" rx="15"/>
    <path d="M232 76 L276 106 L232 136 Z"/></svg>`;

  // The loop: three nodes on a circle with arcs between them, drawn on as each node lights.
  // Radius 130; each arc leaves its pill where the circle clears it (+6 px): 42° for the wide top
  // pill, 24° for the side pills, whose edge the circle crosses steeply.
  const LC = [225, 316], LR = 130;
  const NODES = [["render", -90, tRender, 42], ["look", 30, tLook, 24], ["fix", 150, tFix, 24]];
  const at = (deg, r = LR) => [LC[0] + r * Math.cos((deg * Math.PI) / 180), LC[1] + r * Math.sin((deg * Math.PI) / 180)];
  const svgNS = "http://www.w3.org/2000/svg";
  const loopSvg = document.createElementNS(svgNS, "svg");
  loopSvg.setAttribute("width", 450); loopSvg.setAttribute("height", CH);
  Object.assign(loopSvg.style, { position: "absolute", left: "0px", top: "0px", overflow: "visible" });
  cardB.appendChild(loopSvg);
  // Arc from node i to node i+1, clear of both pills, with an arrowhead at its end.
  const arcs = NODES.map(([, a0, , g0], i) => {
    const a1 = NODES[(i + 1) % 3][1] + (i === 2 ? 360 : 0), g1 = NODES[(i + 1) % 3][3];
    const s = a0 + g0, e = a1 - g1;
    const [x0, y0] = at(s), [x1, y1] = at(e);
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M${x0.toFixed(2)} ${y0.toFixed(2)} A${LR} ${LR} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`);
    Object.entries({ fill: "none", stroke: C.ink, "stroke-width": 2.5, "stroke-linecap": "round" }).forEach(([k2, v]) => path.setAttribute(k2, v));
    const head = document.createElementNS(svgNS, "path");
    const tx = -Math.sin((e * Math.PI) / 180), ty = Math.cos((e * Math.PI) / 180);      // tangent at the end
    const nx = -ty, ny = tx;
    head.setAttribute("d", `M${(x1 - 11 * tx + 7 * nx).toFixed(2)} ${(y1 - 11 * ty + 7 * ny).toFixed(2)} L${x1.toFixed(2)} ${y1.toFixed(2)} L${(x1 - 11 * tx - 7 * nx).toFixed(2)} ${(y1 - 11 * ty - 7 * ny).toFixed(2)}`);
    Object.entries({ fill: "none", stroke: C.ink, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }).forEach(([k2, v]) => head.setAttribute(k2, v));
    loopSvg.append(path, head);
    return { path, head, len: 0 };
  });
  const pills = NODES.map(([name, deg]) => {
    const [x, y] = at(deg);
    const p = make("div", "", name, cardB, { position: "absolute", left: `${(x - 72).toFixed(2)}px`, top: `${(y - 29).toFixed(2)}px`, width: "144px", height: "58px", borderRadius: "29px",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "620", background: C.paper, boxShadow: `0 0 0 2.5px ${C.ink}` });
    return p;
  });
  const tClose = tFix + 0.55;                              // fix → render closes the loop
  const arcAt = [tLook - 0.25, tFix - 0.25, tClose];      // each arc draws just before the next node lights

  // ---- effort ----
  const EY = 720;
  const effortLabel = place(make("div", "", "Effort", root, { fontSize: "30px", fontWeight: "560", color: C.muted }), 80, EY - 52);
  const SEG_W = 920 / 3, SEG_H = 96;
  const control = place(make("div", "", "", root, { background: C.paper, borderRadius: `${SEG_H / 2}px`, boxShadow: "0 1px 0 #d8d6d0 inset, 0 18px 50px rgba(28,28,26,0.10), 0 2px 6px rgba(28,28,26,0.06)" }), 80, EY, 920, SEG_H);
  const sel = make("div", "", "", control, { position: "absolute", left: `${SEG_W + 8}px`, top: "8px", width: `${SEG_W - 16}px`, height: `${SEG_H - 16}px`, borderRadius: `${(SEG_H - 16) / 2}px`, background: C.accent });
  sel.dataset.track = "s08-pill";
  const segs = ["low", "medium", "high"].map((txt, i) => make("div", "", txt, control, { position: "absolute", left: `${i * SEG_W}px`, top: "0px", width: `${SEG_W}px`, height: `${SEG_H}px`,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", fontWeight: "620", color: C.muted }));
  const PILL = { duration: 0.7, damping: 0.82 };

  // Under the control: two misses under "medium", then "raise" under "high".
  const RY = EY + SEG_H + 40;
  const miss = (cx) => {
    const m = make("div", "", `<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#fde8eb"/><path d="M22 22 L42 42 M42 22 L22 42" stroke="${C.red}" stroke-width="3" stroke-linecap="round"/></svg>`, root, { position: "absolute", left: `${cx - 32}px`, top: `${RY - 4}px`, width: "64px", height: "64px" });
    return m;
  };
  const MID = 80 + 1.5 * SEG_W, HIGH = 80 + 2.5 * SEG_W;
  const misses = [miss(MID - 40), miss(MID + 40)];
  const arrow = make("div", "", `<svg width="64" height="24" viewBox="0 0 64 24"><path d="M3 12 H58 M51 5 L58 12 L51 19" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`, root,
    { position: "absolute", left: `${(MID + HIGH) / 2 - 32}px`, top: `${RY + 16}px` });
  const raise = make("div", "", `<svg width="22" height="24" viewBox="0 0 22 24"><path d="M11 21 V4 M4 11 L11 4 L18 11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>raise</span>`, root, {
    position: "absolute", top: `${RY}px`, height: "56px", display: "flex", alignItems: "center", gap: "10px", padding: "0 26px 0 20px", borderRadius: "28px", fontSize: "32px", fontWeight: "620" });
  const tMiss2 = tMiss + 0.12, tLit = tMiss2 + 0.25;

  sfx(tMedium + 0.12 + 1 / FPS, "toggle");                 // the pill lands on medium
  sfx(tLit + 1 / FPS, "pop");                              // raise lights

  // ---- checks ----
  // The pill's settle: within 0.5% of its size (ζ 0.82 scale spring).
  let pillSettle = tMedium;
  for (let n = 1; n < 120; n++) if (Math.abs(1 - spring01(tMedium + n / FPS, tMedium, PILL)) * 0.3 * 288 > 0.5) pillSettle = tMedium + (n + 1) / FPS;
  check("s08 the pill settles on medium by f" + Math.round((pillSettle - tMedium) * FPS) + " after the cue", [pillSettle, cutOut - 1 / FPS], () => {
    const p = box(sel), m = box(segs[1]);
    return (Math.abs(p.cx - m.cx) < 0.5 && Math.abs(p.w - (SEG_W - 16)) < 0.5) || `pill cx ${p.cx.toFixed(2)} w ${p.w.toFixed(2)}`;
  });
  const litNow = () => pills.map((p) => p.style.background === "rgb(47, 85, 224)");
  [[tLook - 0.05, 0], [tFix - 0.05, 1], [tStart - 0.05, 2]].forEach(([at0, i]) =>
    check(`s08 the loop lights in order: only “${NODES[i][0]}” at ${at0.toFixed(2)} s`, at0, () => litNow().every((v, j) => v === (j === i)) || `lit ${litNow()}`));
  check("s08 each arc ends clear of the pills", tStart, () => {
    const ends = arcs.map((a) => { const L = a.path.getTotalLength(); return [a.path.getPointAtLength(0), a.path.getPointAtLength(L)]; }).flat();
    const c = box(cardB);
    const hit = ends.find((pt) => pills.some((p) => { const b = box(p); const x = pt.x + c.x, y = pt.y + c.y; return x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4; }));
    return !hit || `arc end at ${hit.x.toFixed(0)}, ${hit.y.toFixed(0)} under a pill`;
  });
  check("s08 raise lights only after both misses", [tMiss - 0.2, cutOut - 1 / FPS], (t) => {
    const on = raise.style.color === "rgb(255, 255, 255)" || raise.style.color === "#ffffff";
    const both = Number(misses[1].style.opacity) > 0.5;
    return !on || both || "raise lit before the second miss";
  });
  check("s08 the misses are 120 ms apart", tMiss, () => Math.abs(tMiss2 - tMiss - 0.12) < 1e-9 || "stagger");
  check("s08 the last change holds ≥ 1.5 s before the cut", cutOut - 1 / FPS, () => cutOut - tMiss >= 1.5 || `hold ${(cutOut - tMiss).toFixed(2)} s`);
  check("s08 cards, control and marks never overlap", [cutIn, cutOut - 1 / FPS], () => {
    const els = [cardA, cardB, effortLabel, control, ...misses, arrow, raise];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s08 the loop's pills stay inside their card", [tFix, cutOut - 1 / FPS], () => {
    const c = box(cardB);
    return pills.every((p) => { const b = box(p); return b.x >= c.x + 16 && b.x + b.w <= c.x + c.w - 16 && b.y + b.h <= c.y + c.h - 16; }) || "a pill leaves the card";
  });
  check("s08 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [cardA, cardB, control, raise].every((el) => { const b = box(el); return b.x >= 0 && b.x + b.w <= 1080 && b.y >= 128 && b.y + b.h <= 1120; }) || "outside");

  let measured = false;
  return (t) => {
    if (!measured) { arcs.forEach((a) => { a.len = a.path.getTotalLength(); a.path.style.strokeDasharray = `${a.len} ${a.len}`; }); measured = true; }

    // Focus: the app card first; Claude Code from its cue; both step back for the effort rule.
    const toCC = easeOut(p01(t, tCC, 0.5)), toEffort = easeOut(p01(t, tStart, 0.5));
    cardA.style.opacity = (1 - 0.45 * toCC).toFixed(4);
    cardB.style.opacity = (0.45 + 0.55 * toCC - 0.45 * toEffort).toFixed(4);
    show(noInstall, t, tNoInstall, Infinity, { dur: 0.45, dx: -16, dy: 0 });

    // The loop: each arc draws (ease-in-out, 0.4 s) and the next node lights; the current node is accent.
    arcs.forEach((a, i) => {
      const p = easeInOut(p01(t, arcAt[i], 0.4));
      a.path.style.strokeDashoffset = (a.len * (1 - p)).toFixed(2);
      a.path.style.opacity = p > 0 ? "1" : "0";
      a.head.style.opacity = easeOut(p01(t, arcAt[i] + 0.3, 0.15)).toFixed(4);
    });
    pills.forEach((p, i) => {
      const t0 = NODES[i][2], next = i < 2 ? NODES[i + 1][2] : Infinity;
      const on = easeOut(p01(t, t0, 0.2)) * (1 - easeOut(p01(t, next, 0.2)));
      p.style.background = on > 0.5 ? C.accent : C.paper;
      p.style.color = on > 0.5 ? "#ffffff" : C.ink;
      p.style.boxShadow = `0 0 0 2.5px ${on > 0.5 ? C.accent : C.ink}`;
      // Each pill pops in on its word (scale spring ζ 0.82; opacity eases, never bounces).
      p.style.transform = `scale(${(0.8 + 0.2 * spring01(t, t0, { duration: 0.5, damping: 0.82 })).toFixed(4)})`;
      p.style.opacity = easeOut(p01(t, t0, 0.25)).toFixed(4);
      p.style.visibility = t > t0 ? "visible" : "hidden";
    });

    // Effort: the control on "Start"; the pill pops onto medium on its cue (scale spring ζ 0.82).
    show(effortLabel, t, tStart, Infinity, { dur: 0.45, dy: 10 });
    show(control, t, tStart + 0.06, Infinity, { dur: 0.5, dy: 14 });
    const s = spring01(t, tMedium, PILL);
    sel.style.transform = `scale(${(0.7 + 0.3 * s).toFixed(4)})`;
    sel.style.opacity = easeOut(p01(t, tMedium, 0.25)).toFixed(4);
    segs[1].style.color = mix(C.muted, "#ffffff", easeOut(p01(t, tMedium + 0.05, 0.25)));

    // Raise, then the two misses, then raise lights.
    show(raise, t, tRaise, Infinity, { dur: 0.45, dy: 10 });
    const lit = easeOut(p01(t, tLit, 0.3));
    raise.style.left = `${HIGH - raise.offsetWidth / 2}px`;
    raise.style.background = mix("#ffffff", C.accent, lit);
    raise.style.color = lit > 0.5 ? "#ffffff" : C.muted;
    raise.style.boxShadow = lit > 0.5 ? "none" : `0 0 0 2px ${C.line}`;
    show(misses[0], t, tMiss, Infinity, { dur: 0.35, dy: 0, scale: 0.8 });
    show(misses[1], t, tMiss2, Infinity, { dur: 0.35, dy: 0, scale: 0.8 });
    show(arrow, t, tMiss2 + 0.1, Infinity, { dur: 0.35, dx: -10, dy: 0 });
  };
}
