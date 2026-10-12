// s09 Anatomy of a directed prompt. A brief card, `brief.md`, holds five empty ruled lines from the
// cut. On "one decision" the chip "1 line = 1 decision" pins to it. The brief writes itself line by
// line on its cues, 1 frame a character, in mono, with this video's own numbers: GOAL, TIME, SHOTS,
// OUTPUT, QA. On "ban list" a BAN card arrives and the brief steps back. Each banned default arrives
// on its word as a tiny live example (a purple-blue gradient, a glow, drifting particles, three bars
// fading in together); after "at once" they are struck and dimmed 120 ms apart, and their motion
// slows to a stop. Hero move: on "grow" the card grows one row (spring ζ 0.82) and a new item,
// "turntable spin", slides in at the bottom with a "new" tag, and is struck in turn.

export default function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, easeInOut, p01, phase, loopNoise, rand, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tDecision = cueIn(k.id, "one decision");
  const tLines = ["goal", "time", "shots", "output", "check"].map((w) => cueIn(k.id, w));
  const tAdd = cueIn(k.id, "add a ban");
  const tBan = cueIn(k.id, "ban list");
  const tItems = ["gradients", "glow", "particles", "everything fading"].map((w) => cueIn(k.id, w));
  const tOnce = cueIn(k.id, "once");
  const tGrow = cueIn(k.id, "grow");

  // ---- the brief ----
  // It opens centred on the stage; on "Add" it rises (ease-in-out, 0.8 s) and steps back to 50%,
  // and the ban card follows as the rise ends (during "list").
  const BY0 = 284, BY = 24, BH = 424, RISE = 0.8;
  const brief = place(make("div", "card", "", root), 80, BY0, 920, BH);
  make("div", "mono", "brief.md", brief, { position: "absolute", left: "40px", top: "30px", fontSize: "30px", fontWeight: "560", color: C.muted });
  const decision = place(make("div", "chip accent", "1 line = 1 decision", brief, { fontSize: "30px" }), 0, 22);
  decision.style.left = "auto"; decision.style.right = "40px";
  const LINES = [
    ["GOAL", "viewer knows every idea, in order"],
    ["TIME", "325.92 s · 60 fps · 19,555 frames"],
    ["SHOTS", "21 · one hero move each · cut on beat"],
    ["OUTPUT", "1080×1350 · 60 fps · three.js r186"],
    ["QA", "12-frame sheet · speed graph · audit"],
  ];
  const LY = (i) => 100 + i * 62;
  const rows = LINES.map(([key, val], i) => {
    make("div", "", "", brief, { position: "absolute", left: "40px", right: "40px", top: `${LY(i) + 46}px`, height: "2px", background: C.line });
    const row = make("div", "mono", "", brief, { position: "absolute", left: "40px", top: `${LY(i)}px`, fontSize: "28px", whiteSpace: "pre", lineHeight: "40px" });
    const chars = [];
    for (const ch of key.padEnd(7, " ")) chars.push(make("span", "", ch, row, { color: C.accent, fontWeight: "650", visibility: "hidden" }));
    for (const ch of val) chars.push(make("span", "", ch, row, { color: C.ink, fontWeight: "450", visibility: "hidden" }));
    return { row, chars };
  });
  const typedAt = (i, j) => tLines[i] + j / FPS;           // 1 frame a character

  // ---- the ban list ----
  const NY = 476, ROW = 68, HEAD = 92, NH4 = HEAD + 4 * ROW + 16, NH5 = NH4 + ROW;
  const ban = place(make("div", "card", "", root, { overflow: "hidden" }), 80, NY, 920, NH4);
  make("div", "mono", "BAN", ban, { position: "absolute", left: "40px", top: "30px", fontSize: "30px", fontWeight: "650", color: C.red, letterSpacing: "0.04em" });
  const EX_W = 76, EX_H = 48;
  const item = (i, text) => {
    const y = HEAD + i * ROW;
    const g = make("div", "", "", ban, { position: "absolute", left: "0px", top: `${y}px`, width: "920px", height: `${ROW}px` });
    const ex = make("div", "", "", g, { position: "absolute", left: "40px", top: "6px", width: `${EX_W}px`, height: `${EX_H}px`, borderRadius: "12px", background: "#f6f5f2", boxShadow: "0 0 0 2px #d8d6d0", overflow: "hidden" });
    const label = make("div", "", text, g, { position: "absolute", left: "144px", top: "6px", height: `${EX_H}px`, display: "flex", alignItems: "center", fontSize: "32px", fontWeight: "520", whiteSpace: "nowrap" });
    const strike = make("div", "", "", g, { position: "absolute", left: "28px", top: "28px", height: "5px", borderRadius: "3px", background: C.red, transformOrigin: "left center", transform: "scaleX(0)" });
    return { g, ex, label, strike };
  };
  const items = [item(0, "gradients"), item(1, "glow"), item(2, "particles"), item(3, "everything fading in at once"), item(4, "turntable spin")];
  // 1 gradient: the default purple-to-blue.
  items[0].ex.style.background = "linear-gradient(135deg, #7b3ff2, #2f7bf5)";
  // 2 glow: a soft blue orb.
  make("div", "", "", items[1].ex, { position: "absolute", left: `${EX_W / 2 - 8}px`, top: `${EX_H / 2 - 8}px`, width: "16px", height: "16px", borderRadius: "8px", background: "#9db8ff", boxShadow: "0 0 14px 7px rgba(110, 150, 255, 0.85)" });
  // 3 particles: 7 dots drifting on loopNoise.
  const pr = rand("s09-particles");
  const parts = Array.from({ length: 7 }, (_, i) => ({ el: make("div", "", "", items[2].ex, { position: "absolute", width: "5px", height: "5px", borderRadius: "3px", background: "#7a8cff" }), x: 8 + pr() * (EX_W - 16), y: 6 + pr() * (EX_H - 12), seed: 40 + i }));
  // 4 everything at once: three bars that fade in together, over and over.
  const bars = [0, 1, 2].map((i) => make("div", "", "", items[3].ex, { position: "absolute", left: "12px", top: `${9 + i * 12}px`, width: `${[52, 38, 46][i]}px`, height: "6px", borderRadius: "3px", background: C.ink }));
  // 5 turntable spin: a rounded tile turning about its vertical axis.
  const tile = make("div", "", "", items[4].ex, { position: "absolute", left: `${EX_W / 2 - 15}px`, top: `${EX_H / 2 - 15}px`, width: "30px", height: "30px", borderRadius: "8px", background: C.ink });
  const newTag = make("div", "chip accent", "new", items[4].g, { position: "absolute", left: "430px", top: "6px", fontSize: "28px", padding: "6px 18px" });

  const STRIKE = 0.25, STAGGER = 0.12, STOP = 0.4;
  const tStrike0 = tOnce + 0.25;
  const strikeAt = (i) => (i < 4 ? tStrike0 + i * STAGGER : tGrow + 0.95);
  // Local time for each example: runs with t until struck, then slows to a stop over STOP seconds.
  const local = (t, i) => {
    const s = strikeAt(i), u = t - s;
    if (u <= 0) return t;
    if (u < STOP) return s + u - (u * u) / (2 * STOP);
    return s + STOP / 2;
  };
  const GROW = { duration: 1.2, damping: 0.82 };
  let growSettle = tGrow;
  for (let n = 1; n < 150; n++) if (Math.abs(1 - spring01(tGrow + n / FPS, tGrow, GROW)) * ROW > 0.5) growSettle = tGrow + (n + 1) / FPS;
  items[4].g.dataset.track = "s09-new-item";

  sfx(tStrike0 + STRIKE + 1 / FPS, "tap");                 // the first strike lands
  let growTouch = tGrow;                                    // the new row first reaches its mark
  for (let n = 1; n < 150; n++) if (spring01(tGrow + n / FPS, tGrow, GROW) >= 1) { growTouch = tGrow + n / FPS; break; }
  sfx(growTouch + 1 / FPS, "pop");                         // the new item pins

  // ---- checks ----
  check("s09 each brief line is fully typed 1 frame a character before the next cue", tLines[4] + 1.2, () =>
    rows.every((r) => r.chars.every((c) => c.style.visibility === "visible")) || "a line is not fully typed");
  check("s09 lines fit the brief card", tLines[4] + 1.2, () => {
    const c = box(brief);
    return rows.every((r) => { const b = box(r.chars.at(-1)); return b.x + b.w <= c.x + c.w - 32; }) || "a line runs past the card";
  });
  check("s09 typing never overruns the next line's cue", cutIn, () =>
    rows.every((r, i) => i === 4 || typedAt(i, r.chars.length) <= tLines[i + 1]) || "a line types into the next cue");
  check("s09 the four bans strike 120 ms apart", tStrike0, () =>
    [1, 2, 3].every((i) => Math.abs(strikeAt(i) - strikeAt(i - 1) - 0.12) < 1e-9) || "stagger");
  check("s09 struck examples hold still", [strikeAt(3) + STOP, cutOut - 1 / FPS], (t) => {
    const a = parts.map((p) => partPos(p, local(t, 2))), b = parts.map((p) => partPos(p, local(t - 1 / FPS, 2)));
    return a.every((v, i) => v[0] === b[i][0] && v[1] === b[i][1]) || "particles still drift";
  });
  check("s09 the new row settles (±0.5 px) by f" + Math.round((growSettle - tGrow) * FPS) + " after “grow”", [growSettle, cutOut - 1 / FPS], () => {
    const y = box(items[4].g).y - (128 + NY + HEAD + 4 * ROW);
    return Math.abs(y) < 0.5 || `new row off by ${y.toFixed(2)} px`;
  });
  check("s09 the ban card stays inside the stage as it grows", [tGrow, cutOut - 1 / FPS], () => { const b = box(ban); return b.y + b.h <= 1120 || `bottom ${(b.y + b.h).toFixed(1)}`; });
  check("s09 rows, cards and chips never overlap", [cutIn, cutOut - 1 / FPS], () => {
    const els = [brief, ban, ...items.map((it) => it.label), newTag];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      if ((els[i] === ban && j >= 2) || (els[j] === ban && i >= 2)) continue;   // rows live inside the ban card
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s09 the brief has risen before the ban card arrives", tAdd + RISE, () => Math.abs(box(brief).y - 128 - BY) < 1 || `brief at ${(box(brief).y - 128).toFixed(1)}`);
  check("s09 the brief is fully written before it rises", tAdd, () => typedAt(4, rows[4].chars.length) <= tAdd || "QA still typing");
  check("s09 the grown list holds ≥ 2.2 s before the cut", cutOut - 1 / FPS, () => cutOut - tGrow >= 2.2 || `hold ${(cutOut - tGrow).toFixed(2)} s`);

  function partPos(p, tt) {
    return [p.x + 6 * loopNoise(tt, 6, p.seed), p.y + 5 * loopNoise(tt, 6, p.seed + 100)];
  }

  let measured = false;
  return (t) => {
    if (!measured) {
      // Strikes run from the example's left edge to the end of the label.
      items.forEach((it) => { it.strike.style.width = `${it.label.offsetLeft + it.label.offsetWidth + 12 - 28}px`; });
      measured = true;
    }
    // The brief: on screen from the cut; lines type on their cues; it steps back for the ban list.
    show(decision, t, tDecision, Infinity, { dur: 0.45, dx: 16, dy: 0 });
    rows.forEach((r, i) => r.chars.forEach((c, j) => { c.style.visibility = t >= typedAt(i, j) ? "visible" : "hidden"; }));
    const rise = easeInOut(p01(t, tAdd, RISE));
    brief.style.top = `${(BY0 + (BY - BY0) * rise).toFixed(2)}px`;
    brief.style.opacity = (1 - 0.5 * rise).toFixed(4);

    // The ban card follows the rise; it grows one row on "grow".
    show(ban, t, tAdd + RISE, Infinity, { dur: 0.55, dy: 18 });
    const gs = spring01(t, tGrow, GROW);
    ban.style.height = `${(NH4 + (NH5 - NH4) * gs).toFixed(2)}px`;

    items.forEach((it, i) => {
      const t0 = i < 4 ? tItems[i] : tGrow;
      if (i < 4) show(it.g, t, t0, Infinity, { dur: 0.45, dx: -14, dy: 0 });
      else {
        // The new row rides in with the card's growth: from 40 px below, on the same spring.
        it.g.style.transform = `translateY(${(40 * (1 - gs)).toFixed(2)}px)`;
        it.g.style.opacity = easeOut(p01(t, tGrow + 0.1, 0.4)).toFixed(4);
        it.g.style.visibility = t > tGrow + 0.1 ? "visible" : "hidden";
      }
      const s = strikeAt(i);
      it.strike.style.transform = `scaleX(${easeOut(p01(t, s, STRIKE)).toFixed(4)})`;
      // Struck items dim to 55% but stay ink, so what was banned still reads.
      const d = easeOut(p01(t, s + 0.1, 0.4));
      it.ex.style.opacity = (1 - 0.45 * d).toFixed(4);
      it.label.style.opacity = (1 - 0.45 * d).toFixed(4);
    });

    // The live examples, each on its own clock (they stop once struck).
    parts.forEach((p) => { const [x, y] = partPos(p, local(t, 2)); p.el.style.left = `${(x - 2.5).toFixed(2)}px`; p.el.style.top = `${(y - 2.5).toFixed(2)}px`; });
    // Once struck, the bars settle fully shown and the tile settles face-on, so neither freezes invisible.
    const pulse = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase(local(t, 3) - tItems[3], 1.4));   // all three together
    const fade = pulse + (1 - pulse) * easeOut(p01(t, strikeAt(3), STOP));
    bars.forEach((b) => { b.style.opacity = fade.toFixed(4); });
    const spin = (tt) => 360 * phase(tt, 2.4);
    const s4 = strikeAt(4), a4 = spin(s4), face = Math.ceil(a4 / 180) * 180;
    const deg = t < s4 ? spin(t) : a4 + (face - a4) * easeOut(p01(t, s4, STOP));
    tile.style.transform = `perspective(200px) rotateY(${deg.toFixed(2)}deg)`;
    newTag.style.opacity = easeOut(p01(t, tGrow + 0.3, 0.35)).toFixed(4);
  };
}
