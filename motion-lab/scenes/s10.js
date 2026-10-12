// s10 One hero move. Three rows from the cut: "hero" (an accent card), "secondary" (two white cards)
// and "ambient" (6 faint dots drifting on loopNoise). Hero move: on "hero" the hero card moves 400 px
// right on a spring (ζ 0.82); the two secondaries follow 150 ms later on the same spring, travelling
// 240 px (60%). A tape under each row draws with the move and stays as the measure of its travel.
// Labels arrive on their words: "100%" on "travel", "60%" on "sixty percent", "· +150 ms" on "a
// moment". On "later" all three cards travel back, with the same offset, so the delay is seen twice.
// On "Ambient" the dots darken and each shows its 20 px envelope (5% of 400); "< 5%" on "five percent".

export default function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, p01, loopNoise, rand, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tHero = cueIn(k.id, "hero");
  const tTravel = cueIn(k.id, "travel");
  const tSixty = cueIn(k.id, "sixty percent");
  const tMoment = cueIn(k.id, "a moment");
  const tBack = cueIn(k.id, "later");
  const tAmbient = cueIn(k.id, "ambient");
  const tFive = cueIn(k.id, "five percent");

  // ---- the numbers ----
  const X0 = 80, HERO = 400, SECONDARY = 0.6 * HERO, LAG = 0.15, AMBIENT = 0.05 * HERO;   // 400, 240, 150 ms, 20 px
  const SPRING = { duration: 1.2, damping: 0.82 };
  // Out on "hero", back on "later"; each secondary starts LAG after the hero, both ways.
  const heroX = (t) => X0 + HERO * (spring01(t, tHero, SPRING) - spring01(t, tBack, SPRING));
  const secX = (t) => X0 + SECONDARY * (spring01(t, tHero + LAG, SPRING) - spring01(t, tBack + LAG, SPRING));
  let settle = 0;                                          // frames until within 0.5 px of the target
  for (let n = 1; n < 150; n++) if (Math.abs(1 - spring01(tHero + n / FPS, tHero, SPRING)) * HERO > 0.5) settle = n + 1;
  let touch = 0;                                           // the hero first reaches its mark
  for (let n = 1; n < 150; n++) if (spring01(tHero + n / FPS, tHero, SPRING) >= 1) { touch = n; break; }

  // ---- rows ----
  const rowLabel = (text, y) => place(make("div", "", text, root, { fontSize: "30px", fontWeight: "600", color: C.muted }), X0, y);
  const lblHero = rowLabel("hero", 52);
  const lblSec = rowLabel("secondary", 410);
  const lblAmb = rowLabel("ambient", 836);
  const bars = (card, color, widths, top = 30) => widths.forEach((w, i) => make("div", "", "", card, { position: "absolute", left: "30px", top: `${top + i * 34}px`, width: `${w}px`, height: "16px", borderRadius: "8px", background: color }));
  const hero = place(make("div", "card", "", root, { background: C.accent }), X0, 100, 320, 180);
  bars(hero, "rgba(255,255,255,0.9)", [170, 230, 120], 40);
  hero.dataset.track = "s10-hero";
  const secs = [456, 592].map((y) => {
    const c = place(make("div", "card", "", root), X0, y, 260, 120);
    bars(c, C.line, [140, 190], 34);
    return c;
  });
  secs[0].dataset.track = "s10-secondary";

  // Tapes: a 3 px ink line with end ticks, from the start to the card's left edge on the way out.
  const tape = (y, len) => {
    const el = make("div", "", "", root, { position: "absolute", left: `${X0}px`, top: `${y}px`, height: "18px" });
    const line = make("div", "", "", el, { position: "absolute", left: "0px", top: "7.5px", height: "3px", width: "100%", background: C.ink, borderRadius: "1.5px" });
    make("div", "", "", el, { position: "absolute", left: "-1.25px", top: "0px", width: "2.5px", height: "18px", background: C.ink });
    const end = make("div", "", "", el, { position: "absolute", right: "-1.25px", top: "0px", width: "2.5px", height: "18px", background: C.ink });
    return { el, line, end, len };
  };
  const tapeHero = tape(300, HERO), tapeSec = tape(732, SECONDARY);
  const labelStyle = { fontSize: "36px", fontWeight: "600", whiteSpace: "nowrap" };
  // Labels sit left-aligned under the tapes' start, so appending "· +150 ms" never shifts "60%".
  const pct100 = place(make("div", "mono", "100%", root, labelStyle), X0, 328);
  const pct60 = place(make("div", "mono", "", root, labelStyle), X0, 760);
  const p60 = make("span", "", "60%", pct60);
  const pLag = make("span", "", " · +150 ms", pct60, { color: C.ink });

  // Ambient: 6 dots, each drifting on its own loopNoise (13 px per axis, so never more than
  // 13·√2 = 18.4 px from home, under 20 px = 5% of the hero's travel).
  const AMP = 13, PERIOD = 8;
  const lay = rand("s10-ambient");
  const DOTS = Array.from({ length: 6 }, (_, i) => ({ x: 120 + i * 104, y: 912 + (lay() - 0.5) * 20, seed: 300 + i }));
  const dotPos = (d, t) => [d.x + AMP * loopNoise(t, PERIOD, d.seed), d.y + AMP * loopNoise(t, PERIOD, d.seed + 50)];
  const env = DOTS.map((d) => make("div", "", "", root, { position: "absolute", left: `${d.x - AMBIENT}px`, top: `${d.y - AMBIENT}px`, width: `${2 * AMBIENT}px`, height: `${2 * AMBIENT}px`, borderRadius: "50%", border: `2px dashed ${C.faint}`, boxSizing: "border-box" }));
  const dots = DOTS.map(() => make("div", "", "", root, { position: "absolute", width: "14px", height: "14px", borderRadius: "7px" }));
  const pct5 = place(make("div", "mono", "&lt; 5%", root, labelStyle), 740, 888);

  sfx(tHero + touch / FPS + 1 / FPS, "tap");               // the hero lands
  sfx(tBack + touch / FPS + 1 / FPS, "tap");               // and lands home

  // ---- checks ----
  const x = (el) => box(el).x;
  check("s10 hero travels exactly 400 px (100%)", [tHero + settle / FPS, tBack], () => {
    const d = x(hero) - X0;
    return Math.abs(d - HERO) < 0.5 || `hero travel ${d.toFixed(2)} px`;
  });
  check("s10 secondaries travel exactly 240 px (60% of the hero)", [tHero + LAG + settle / FPS, tBack], () => {
    const d = secs.map((c) => x(c) - X0), h = x(hero) - X0;
    return secs.every((c, i) => Math.abs(d[i] - SECONDARY) < 0.5 && Math.abs(d[i] / h - 0.6) < 0.002) || `secondary ${d.map((v) => v.toFixed(2))} hero ${h.toFixed(2)}`;
  });
  [[tHero, "out"], [tBack, "back"]].forEach(([t0, way]) => {
    // Frame by frame through the start: the hero leaves its mark first, the secondaries exactly 150 ms later.
    check(`s10 secondaries start 150 ms after the hero (${way})`, [t0 - 2 / FPS, t0 + LAG + 4 / FPS], (t) => {
      const from = way === "out" ? X0 : X0 + HERO, fromS = way === "out" ? X0 : X0 + SECONDARY;
      const hMoved = Math.abs(x(hero) - from) > 1e-3, sMoved = secs.map((c) => Math.abs(x(c) - fromS) > 1e-3);
      if (hMoved !== t > t0) return `hero ${hMoved ? "moved" : "still"} at ${(t - t0).toFixed(3)} s`;
      return sMoved.every((m) => m === t > t0 + LAG) || `secondary ${sMoved} at ${(t - t0).toFixed(3)} s`;
    });
  });
  check("s10 the 150 ms lag is the declared offset", cutIn, () => Math.abs(LAG - 0.15) < 1e-12 && SECONDARY / HERO === 0.6 || "numbers");
  check("s10 ambient dots stay under 5% of the hero's travel (20 px)", [cutIn, cutOut - 1 / FPS], (t) => {
    const worst = Math.max(...dots.map((el, i) => Math.hypot(box(el).cx - DOTS[i].x, box(el).cy - 128 - DOTS[i].y)));
    return worst < AMBIENT || `a dot drifts ${worst.toFixed(2)} px`;
  });
  // Every dot really drifts: each strays more than 4 px from home at some frame of the scene.
  const maxDrift = DOTS.map((d) => {
    let m = 0;
    for (let n = Math.ceil(cutIn * FPS); n < cutOut * FPS; n++) { const [px, py] = dotPos(d, n / FPS); m = Math.max(m, Math.hypot(px - d.x, py - d.y)); }
    return m;
  });
  check("s10 the ambient dots really drift (each > 4 px at some frame)", cutIn, () => maxDrift.every((m) => m > 4) || `drifts ${maxDrift.map((m) => m.toFixed(1))}`);
  check("s10 tapes measure the travel: 400 px and 240 px", [tHero + LAG + settle / FPS, cutOut - 1 / FPS], () => {
    const a = box(tapeHero.el).w, b = box(tapeSec.el).w;
    return (Math.abs(a - HERO) < 0.5 && Math.abs(b - SECONDARY) < 0.5) || `tapes ${a.toFixed(2)} / ${b.toFixed(2)}`;
  });
  check("s10 cards, tapes and labels never overlap", [cutIn, cutOut - 1 / FPS], () => {
    const els = [lblHero, hero, tapeHero.el, pct100, lblSec, ...secs, tapeSec.el, pct60, lblAmb, pct5];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s10 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [hero, ...secs, pct5, ...env].every((el) => { const b = box(el); return b.x >= 0 && b.x + b.w <= 1080 && b.y >= 128 && b.y + b.h <= 1120; }) || "outside");

  return (t) => {
    hero.style.left = `${heroX(t).toFixed(3)}px`;
    secs.forEach((c) => { c.style.left = `${secX(t).toFixed(3)}px`; });

    // Tapes follow the cards out, then stay as the measure of the travel.
    const outH = X0 + HERO * spring01(t, tHero, SPRING), outS = X0 + SECONDARY * spring01(t, tHero + LAG, SPRING);
    const wH = t >= tHero + settle / FPS ? HERO : Math.max(0, outH - X0), wS = t >= tHero + LAG + settle / FPS ? SECONDARY : Math.max(0, outS - X0);
    tapeHero.el.style.width = `${wH.toFixed(3)}px`;
    tapeSec.el.style.width = `${wS.toFixed(3)}px`;
    tapeHero.el.style.visibility = wH > 0.5 ? "visible" : "hidden";
    tapeSec.el.style.visibility = wS > 0.5 ? "visible" : "hidden";

    show(pct100, t, tTravel, Infinity, { dur: 0.45, dy: 10 });
    show(pct60, t, tSixty, Infinity, { dur: 0.45, dy: 10 });
    pLag.style.opacity = easeOut(p01(t, tMoment, 0.4)).toFixed(4);

    // Ambient: faint from the cut; on "Ambient" they darken and show their 20 px envelopes.
    const a = easeOut(p01(t, tAmbient + 0.3, 0.5));       // after the cards are home
    DOTS.forEach((d, i) => {
      const [px, py] = dotPos(d, t);
      Object.assign(dots[i].style, { left: `${(px - 7).toFixed(2)}px`, top: `${(py - 7).toFixed(2)}px`, background: a > 0.5 ? C.muted : C.faint });
      env[i].style.opacity = a.toFixed(4);
    });
    lblAmb.style.color = C.muted;
    show(pct5, t, tFive, Infinity, { dur: 0.45, dy: 10 });
  };
}
