// s11 Checks · black · bars 21–23 (40.65–44.92): cut in, a zoom-through into s12 from 44.12.
//   Bar 21:  a giant number reveals on the downbeat and counts up (ease-out) to this film's real
//            number of check()s, window.CHECKS.length, read inside seek once every shot is built; it
//            lands on bar 21 beat 3. "checks" sits beside it.
//   Bar 22:  the hit. The number turns mint with one punch, a check mark draws, "All pass." lands,
//            and the success sound plays one frame after.
//   Then it holds still to the zoom-through. Nothing else moves; nothing is invented.
export default async function build(root, k) {
  const { make, place, barT, reveal, punch, drift, countTo, easeOut, easeOutExpo, p01, mix, sfx, check, box, overlap, C, STAGE } = k;
  const S = "s11", FPS = 60, EPS = 1e-6, LEAD = 2 / FPS;
  const { cutIn, inEnd, outStart, cutOut } = k.win;
  const T = { count: barT(21), landed: barT(21, 3), hit: barT(22) };
  const N = () => (window.CHECKS || []).length;

  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });
  const X0 = 70;                                            // x 54 or more at the drift's 1.03

  // Row 1: the number and "checks". The number's box is as wide as N's digits, right-aligned, so
  // "checks" never moves while the digits count up.
  const row1 = place(make("div", "", "", stage, { display: "flex", alignItems: "baseline", gap: "34px", whiteSpace: "nowrap" }), X0, 0);
  row1.id = "s11-count";
  const NUM_CSS = { fontSize: "300px", fontWeight: "700", letterSpacing: "-0.05em", lineHeight: "0.86", fontFeatureSettings: '"tnum" 1', whiteSpace: "nowrap" };
  const numBox = make("div", "", "", row1);                  // the reveal
  const num = make("div", "", "0", numBox, { ...NUM_CSS, textAlign: "right", color: C.white, transformOrigin: "0% 85%" });   // the count, colour, punch
  num.id = "s11-number";
  const unit = make("div", "h1", "checks", row1, { color: C.mutedDark });
  unit.id = "s11-unit";
  // The width of n digits (tabular, so any n-digit number fits it exactly), measured at build time,
  // before any transform applies. The film's check count is set once every shot is built.
  const digitsWidth = (len) => widths[Math.min(Math.max(len, 1), widths.length - 1)];
  let widths = [];

  // Row 2: the check mark and "All pass."
  const row2 = place(make("div", "", "", stage, { display: "flex", alignItems: "center", gap: "30px", whiteSpace: "nowrap" }), X0, 0);
  row2.id = "s11-pass";
  const NS = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(NS, "svg");
  icon.setAttribute("width", "112"); icon.setAttribute("height", "112"); icon.setAttribute("viewBox", "0 0 112 112");   // the stroke starts in line with the "1" above it
  icon.style.flex = "none"; icon.style.display = "block"; icon.style.overflow = "visible";
  row2.appendChild(icon);
  const tick = document.createElementNS(NS, "path");
  Object.entries({ d: "M26 60 L53 87 L104 28", fill: "none", stroke: C.mint, "stroke-width": 15, "stroke-linecap": "round", "stroke-linejoin": "round" })
    .forEach(([a, v]) => tick.setAttribute(a, v));
  icon.appendChild(tick);
  const pass = make("div", "display", "", row2, { whiteSpace: "nowrap" });
  const passWords = ["All", "pass."].map((w, i) => {
    const el = make("span", "word", w, pass);
    if (i === 0) pass.appendChild(document.createTextNode(" "));
    return el;
  });

  // Vertical placement: the two rows centred on the stage, measured once the fonts are in.
  await document.fonts.ready;
  {
    const probe = make("span", "", "", stage, { ...NUM_CSS, position: "absolute", visibility: "hidden", left: "0px", top: "0px" });
    widths = [0, 1, 2, 3, 4, 5].map((n) => { probe.textContent = "0".repeat(n); return probe.getBoundingClientRect().width; });
    probe.remove();
    const h1 = row1.offsetHeight, h2 = row2.offsetHeight, GAP = 96;
    const top = Math.round((STAGE.y0 + STAGE.y1) / 2 - (h1 + GAP + h2) / 2);
    row1.style.top = `${top}px`;
    row2.style.top = `${top + h1 + GAP}px`;
  }
  const tickLen = tick.getTotalLength();
  tick.style.strokeDasharray = `${tickLen} ${tickLen}`;

  sfx(T.hit + 1 / FPS, "success");                          // one frame after "All pass." lands

  // ---------- checks ----------
  const op = (e) => (e.style.visibility === "hidden" ? 0 : Number(e.style.opacity || 1));
  const rgb = (h) => mix(h, h, 0).replace(/,/g, ", ");
  check(`${S} the number lands on window.CHECKS.length on bar 21 beat 3 (f${Math.round(T.landed * FPS)}) and holds it to the cut`, [T.landed, cutOut], () =>
    (N() > 0 && num.textContent === String(N())) || `shows ${num.textContent} of ${N()}`);
  check(`${S} the count rises from 0 on bar 21 and never passes the total`, [T.count, T.landed], () =>
    Number(num.textContent) <= N() || `${num.textContent} > ${N()}`);
  check(`${S} on bar 22 (f${Math.round(T.hit * FPS)}): the number is mint by f${Math.ceil((T.hit + 0.2) * FPS)}, the check drawn by f${Math.ceil((T.hit + 0.32) * FPS)}, "All pass." settled by f${Math.ceil((T.hit + 0.68) * FPS)}`, [T.hit + 0.68, cutOut], () => {
    if (getComputedStyle(num).color !== rgb(C.mint)) return `number ${getComputedStyle(num).color}`;
    if (Number(tick.style.strokeDashoffset) > 0.01) return "check not drawn";
    return passWords.every((w) => op(w) > 0.999) || "All pass. not settled";
  });
  check(`${S} nothing of bar 22 shows before it: white number, no check, no "All pass." until f${Math.round((T.hit - LEAD) * FPS)}`, [cutIn, Math.floor((T.hit - LEAD) * FPS - EPS) / FPS], () =>
    (getComputedStyle(num).color === rgb(C.white) && tick.style.opacity === "0" && passWords.every((w) => op(w) === 0)) || "bar 22 shows early");
  check(`${S} the success sound plays one frame after bar 22`, cutIn, () =>
    (window.SFX || []).some((s) => s.kind === "success" && Math.abs(s.t - (T.hit + 1 / FPS)) < 1e-6) || "no success at bar 22 + 1 frame");
  check(`${S} both rows sit inside the stage and clear of each other`, [inEnd, outStart], () => {
    for (const e of [row1, row2]) {
      const b = box(e);
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${e.id} at x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
    }
    return overlap(row1, row2) === 0 || "the rows touch";
  });
  check(`${S} holds still from the zoom-through (${outStart.toFixed(2)} s): count, colour and type settled`, [outStart, cutOut], () =>
    (num.textContent === String(N()) && passWords.every((w) => op(w) > 0.999) && /scale\(1(\.0+)?\)/.test(num.style.transform || "scale(1)")) || "still moving");

  // ---------- seek ----------
  return (t) => {
    stage.style.transform = `scale(${drift(t, cutIn, cutOut, 0.03).toFixed(5)})`;
    const n = N();
    num.style.width = `${digitsWidth(String(n).length).toFixed(2)}px`;
    countTo(num, t, T.count, T.landed, 0, n);
    reveal(numBox, t, T.count - LEAD);
    reveal(unit, t, T.count - LEAD + 0.08);
    // Bar 22: mint, one punch, the check draws (expo: most of it in the first frames), "All pass." lands.
    const g = easeOut(p01(t, T.hit - LEAD, 0.2));
    num.style.color = mix(C.white, C.mint, g);
    num.style.transform = `scale(${punch(t, T.hit).toFixed(4)})`;
    tick.style.strokeDashoffset = (tickLen * (1 - easeOutExpo(p01(t, T.hit - LEAD, 0.34)))).toFixed(2);
    tick.style.opacity = t >= T.hit - LEAD - EPS ? "1" : "0";
    passWords.forEach((w, i) => reveal(w, t, T.hit - LEAD + i * 0.08));
  };
}
