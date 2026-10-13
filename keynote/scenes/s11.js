// s11 Checks · black · bars 27–29 (58.91–63.27): cut in, cut out (into the final boom on bar 29).
// Apple's stat style: one huge number (the one big-type exception, like "8x"), with caption-size text
// (.caption, 64 px) under it.
//   Bar 27:  the number appears on the downbeat (appear()) and counts up (ease-out) to this film's real
//            number of check()s, window.CHECKS.length, read inside seek once every shot is built; it lands
//            on bar 27 beat 3. Under it, the caption "checks" in gray.
//   Bar 28:  the number turns mint, a check mark draws, and the caption line "All pass." appears under
//            "checks" (appear()); the success sound plays one frame after the bar. Everything holds to the cut.
// All centered. The number's box is as wide as N's digits (tabular figures), centered, so nothing moves
// sideways as it counts. The whole shot pushes in 1.00 -> 1.05, ease-in-out. Nothing is invented.
export default async function build(root, k) {
  const { make, place, barT, appear, countTo, easeOut, easeInOut, p01, mix, sfx, check, box, overlap, C, STAGE } = k;
  const S = "s11", FPS = 60, EPS = 1e-6, LEAD = 2 / FPS;
  const { cutIn, cutOut } = k.win;
  const T = { count: barT(27), landed: barT(27, 3), hit: barT(28) };
  const N = () => (window.CHECKS || []).length;

  // ---- the push: 1.00 -> 1.05, ease-in-out across the shot ----
  const PUSH = 0.05;
  const scaleAt = (t) => 1 + PUSH * easeInOut(p01(t, cutIn, cutOut - cutIn));
  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });
  const COL = 920, X0 = 540 - COL / 2;                      // 920 px about the centre: inside the stage at 1.05

  // ---- the number, alone and huge ----
  const NUM_CSS = { fontSize: "340px", fontWeight: "700", letterSpacing: "-0.05em", lineHeight: "0.86", fontFeatureSettings: '"tnum" 1', whiteSpace: "nowrap" };
  const numBox = place(make("div", "", "", stage, { width: `${COL}px`, display: "flex", justifyContent: "center" }), X0, 0);
  numBox.id = "s11-count";
  const num = make("div", "", "0", numBox, { ...NUM_CSS, textAlign: "center", color: C.white });
  num.id = "s11-number";

  // ---- the captions: "checks" (gray), then on bar 28 "All pass." with a mint check ----
  const unit = place(make("div", "caption", '<span class="soft">checks</span>', stage, { width: `${COL}px` }), X0, 0);
  unit.id = "s11-unit";
  const row2 = place(make("div", "", "", stage, { display: "flex", alignItems: "center", gap: "18px", whiteSpace: "nowrap" }), 0, 0);
  row2.id = "s11-pass";
  const NS = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(NS, "svg");
  icon.setAttribute("width", "56"); icon.setAttribute("height", "56"); icon.setAttribute("viewBox", "0 0 56 56");
  icon.style.flex = "none"; icon.style.display = "block"; icon.style.overflow = "visible";
  row2.appendChild(icon);
  const tick = document.createElementNS(NS, "path");
  Object.entries({ d: "M7 30 L21 44 L49 13", fill: "none", stroke: C.mint, "stroke-width": 7.5, "stroke-linecap": "round", "stroke-linejoin": "round" })
    .forEach(([a, v]) => tick.setAttribute(a, v));
  icon.appendChild(tick);
  const pass = make("div", "caption", "All pass.", row2);
  pass.id = "s11-all-pass";

  // ---- measure once the fonts are in: digit widths, the stack, the centered places ----
  await document.fonts.ready;
  const probe = make("span", "", "", stage, { ...NUM_CSS, position: "absolute", visibility: "hidden", left: "0px", top: "0px" });
  const widths = [0, 1, 2, 3, 4, 5].map((n) => { probe.textContent = "0".repeat(n); return probe.getBoundingClientRect().width; });
  probe.remove();
  const digitsWidth = (len) => widths[Math.min(Math.max(len, 1), widths.length - 1)];
  const ROW2_W = row2.getBoundingClientRect().width;
  row2.style.left = `${Math.round(540 - ROW2_W / 2)}px`;
  const Y = {};
  {
    const hN = numBox.offsetHeight, hU = unit.offsetHeight, h2 = row2.offsetHeight, GAP1 = 34, GAP2 = 22;
    const top = Math.round(675 - (hN + GAP1 + hU + GAP2 + h2) / 2);
    Y.num = top; Y.unit = top + hN + GAP1; Y.pass = Y.unit + hU + GAP2;
    numBox.style.top = `${Y.num}px`;
    unit.style.top = `${Y.unit}px`;
    row2.style.top = `${Y.pass}px`;
  }
  const tickLen = tick.getTotalLength();
  tick.style.strokeDasharray = `${tickLen} ${tickLen}`;

  sfx(T.hit + 1 / FPS, "success");                          // one frame after the check and "All pass." start

  // ---------- checks ----------
  const op = (e) => (e.style.visibility === "hidden" ? 0 : Number(e.style.opacity || 1));
  const rgb = (h) => mix(h, h, 0).replace(/,/g, ", ");
  const f = (t) => `f${Math.round(t * FPS)}`;
  const SETTLED = T.hit - LEAD + 0.9;
  check(`${S} the number lands on window.CHECKS.length on bar 27 beat 3 (${f(T.landed)}) and holds it to the cut`, [T.landed, cutOut], () =>
    (N() > 0 && num.textContent === String(N())) || `shows ${num.textContent} of ${N()}`);
  check(`${S} the count rises from 0 on bar 27 and never passes the total`, [cutIn, T.landed], (t) =>
    (Number(num.textContent) <= N() && Number(num.textContent) >= 0) || `${num.textContent} of ${N()} at ${t.toFixed(3)}`);
  check(`${S} type sizes: the number is the one huge text (340 px); "checks" and "All pass." are 64 px caption lines, "checks" in gray`, cutIn, () => {
    const cs = (e) => getComputedStyle(e);
    if (cs(num).fontSize !== "340px") return `number ${cs(num).fontSize}`;
    if (cs(unit).fontSize !== "64px" || cs(pass).fontSize !== "64px") return `captions ${cs(unit).fontSize} / ${cs(pass).fontSize}`;
    return cs(unit.querySelector(".soft")).color === rgb(C.gray) || "checks is not gray";
  });
  check(`${S} on bar 28 (${f(T.hit)}): mint by ${f(T.hit - LEAD + 0.4)}, the check drawn by ${f(T.hit - LEAD + 0.5)}, "All pass." in and sharp by ${f(SETTLED)}`, [SETTLED, cutOut], () => {
    if (getComputedStyle(num).color !== rgb(C.mint)) return `number ${getComputedStyle(num).color}`;
    if (Number(tick.style.strokeDashoffset) > 0.01) return "check not drawn";
    return (op(row2) > 0.999 && row2.style.filter === "none") || "All pass. not settled";
  });
  check(`${S} nothing of bar 28 shows before it: white number, no check, no "All pass." until ${f(T.hit - LEAD)}`, [cutIn, Math.floor((T.hit - LEAD) * FPS - EPS) / FPS], () =>
    (getComputedStyle(num).color === rgb(C.white) && tick.style.opacity === "0" && op(row2) === 0) || "bar 28 shows early");
  check(`${S} the success sound plays one frame after bar 28`, cutIn, () =>
    (window.SFX || []).some((s) => s.kind === "success" && Math.abs(s.t - (T.hit + 1 / FPS)) < 1e-6) || "no success at bar 28 + 1 frame");
  check(`${S} number, "checks" and "All pass." are centered (±1 px), inside the stage through the push, and clear of each other`, [cutIn, cutOut], () => {
    const parts = [[num, "number"], [unit.firstElementChild, "checks"], [row2, "All pass."]];
    for (const [e, name] of parts) {
      if (op(e === num ? numBox : e === row2 ? row2 : unit) < 0.01) continue;
      const b = box(e);
      if (Math.abs(b.cx - 540) > 1) return `${name} centred at ${b.cx.toFixed(1)}`;
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${name} at x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
    }
    return (overlap(numBox, unit) === 0 && overlap(unit, row2) === 0 && overlap(numBox, row2) === 0) || "the lines touch";
  });
  check(`${S} the finished picture (mint count, check, "All pass.") holds ${(cutOut - SETTLED).toFixed(2)} s settled to the cut; the count holds ${(cutOut - T.landed).toFixed(2)} s`, [SETTLED, cutOut], () =>
    (num.textContent === String(N()) && op(row2) > 0.999 && op(numBox) > 0.999 && op(unit) > 0.999 && Number(tick.style.strokeDashoffset) < 0.01) || "still moving");
  check(`${S} the push is 1.00 -> 1.05, ease-in-out from the cut to the cut`, cutIn, () => {
    const a = scaleAt(cutIn), b = scaleAt(cutOut), mid = scaleAt((cutIn + cutOut) / 2);
    return (Math.abs(a - 1) < 1e-9 && Math.abs(b - 1.05) < 1e-9 && Math.abs(mid - 1.025) < 1e-9) || `push ${a} ${mid} ${b}`;
  });

  // ---------- seek ----------
  return (t) => {
    stage.style.transform = `scale(${scaleAt(t).toFixed(5)})`;
    const n = N();
    num.style.width = `${digitsWidth(String(n).length).toFixed(2)}px`;
    countTo(num, t, T.count, T.landed, 0, n);
    appear(numBox, t, T.count - LEAD);
    appear(unit, t, T.count - LEAD + 0.15);                 // the label follows its number by 150 ms
    // Bar 28: mint, the check draws, "All pass." appears.
    num.style.color = mix(C.white, C.mint, easeOut(p01(t, T.hit - LEAD, 0.4)));
    tick.style.strokeDashoffset = (tickLen * (1 - easeOut(p01(t, T.hit - LEAD, 0.5)))).toFixed(2);
    tick.style.opacity = t >= T.hit - LEAD - EPS ? "1" : "0";
    appear(row2, t, T.hit - LEAD);
  };
}
