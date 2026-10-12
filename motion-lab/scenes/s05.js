// s05 Adjectives into numbers. A ledger headed "adjective → number" (echoing s03's equation) is on
// screen from the cut, with four ruled rows. Each row, on its cue: the adjective enters large in
// muted gray in the number column; on the phrase that names its numbers it slides left and shrinks
// to 44 px (text spring, ζ 1.0), and its numbers type on behind it in mono once it has cleared the
// column. One row is active at a time; finished rows dim to 45% as the next adjective enters.

export default async function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, p01, check, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, CPS = 30;
  const X_ADJ = 80, X_NUM = 310, BIG = 92, SMALL = 44, NUM_TOP = 22, ROW0 = 190, PITCH = 190, NUM_PX = 36, NUM_LH = 48;
  const SLIDE = { duration: 0.9, damping: 1 };   // text: no bounce

  const ROWS = [
    { adj: "premium", at: "premium", slide: "satin", lines: ["satin ceramic · roughness 0.35", "brand color ×1"] },
    { adj: "cool", at: "cool", slide: "studio", lines: ["key 2.4 · fill 0.6 · rim", "no glow"] },
    { adj: "modern", at: "modern", slide: "lens", lines: ["FOV 40° · 1 push-in"] },
    { adj: "animation", at: "animation", slide: "tempo", lines: ["120 BPM · 4f anticipation", "ζ 0.8"] },
  ];

  // ---- the ledger: header and rules, on screen from the cut ----
  const headCss = { fontSize: "30px", fontWeight: "600", height: "40px", lineHeight: "40px" };
  const hAdj = place(make("div", "", "adjective", root, { ...headCss, color: C.muted }), X_ADJ, 72);
  const arrow = place(make("div", "", `<svg width="44" height="24" viewBox="0 0 44 24"><path d="M2 12 H40 M31 4 L40 12 L31 20" fill="none" stroke="${C.muted}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`, root), X_NUM - 66, 80);
  const hNum = place(make("div", "", "number", root, { ...headCss, color: C.accent }), X_NUM, 72);
  place(make("div", "", "", root, { background: C.line }), X_ADJ, 132, 920, 2);
  ROWS.forEach((_, i) => place(make("div", "", "", root, { background: C.line }), X_ADJ, ROW0 + i * PITCH + 150, 920, 2));

  // ---- rows ----
  const rows = ROWS.map((r, i) => {
    const top = ROW0 + i * PITCH;
    const group = place(make("div", "", "", root), 0, top, 1080, 150);
    const outer = place(make("div", "", "", group), X_NUM, 0);
    const word = make("div", "", r.adj, outer, {
      position: "relative", fontSize: `${BIG}px`, fontWeight: "620", letterSpacing: "-0.03em", lineHeight: "1",
      whiteSpace: "nowrap", color: C.muted, transformOrigin: "0 0",
    });
    word.dataset.track = `s05-adj-${i}`;
    const num = place(make("div", "mono", "", group, { fontSize: `${NUM_PX}px`, lineHeight: `${NUM_LH}px`, fontWeight: "500", whiteSpace: "pre" }), X_NUM, NUM_TOP);
    const chars = [];
    r.lines.forEach((line, li) => {
      if (li) make("br", "", "", num);
      for (const ch of line) chars.push(make("span", "", "", num, { color: ch === "·" ? C.muted : C.ink, visibility: "hidden" }));
      chars.slice(chars.length - line.length).forEach((s, j) => { s.textContent = line[j]; });
    });
    const caret = make("div", "", "", group, { position: "absolute", width: "3px", height: "38px", borderRadius: "2px", background: C.accent, visibility: "hidden" });
    return { ...r, top, group, outer, word, num, chars, caret, tAdj: cueIn(k.id, r.at), tSlide: cueIn(k.id, r.slide) };
  });

  // ---- measure (fonts loaded): baselines, word widths, caret stops ----
  await document.fonts.ready;
  const baseline = (el) => {
    const m = make("span", "", "", el, { display: "inline-block", width: "0px", height: "0px", verticalAlign: "baseline" });
    const b = m.offsetTop;
    m.remove();
    return b;
  };
  const probe = make("div", "mono", "x", root, { position: "absolute", fontSize: `${NUM_PX}px`, lineHeight: `${NUM_LH}px`, fontWeight: "500" });
  const bNum = baseline(probe);
  probe.remove();
  const S = SMALL / BIG, TX = X_ADJ - X_NUM;
  for (const r of rows) {
    r.W = r.word.offsetWidth;
    r.TY = NUM_TOP + bNum - S * baseline(r.word);            // the small word sits on the numbers' baseline
    r.stops = r.chars.map((s) => ({ x: s.offsetLeft + s.offsetWidth, y: s.offsetTop }));
    const p = (t) => spring01(t, r.tSlide, SLIDE);
    // Typing starts once the word's right edge has cleared the number column (16 px of air).
    let tt = r.tSlide;
    while (X_NUM + TX * p(tt) + r.W * (1 + (S - 1) * p(tt)) > X_NUM - 16) tt += 1 / FPS;
    r.tType = tt;
    r.tTyped = tt + (r.chars.length - 1) / CPS;
    r.p = p;
  }
  const settledAt = (r) => r.tSlide + 1.4;
  const dimAt = (i) => (i + 1 < rows.length ? rows[i + 1].tAdj : Infinity);

  // ---- checks ----
  rows.forEach((r, i) => {
    check(`s05 “${r.adj}” on its mark (x 80, 44 px) by slide + 1.4 s`, settledAt(r), () => {
      const b = box(r.word);
      return (Math.abs(b.x - X_ADJ) < 0.5 && Math.abs(b.h - SMALL) < 0.5) || `x ${b.x.toFixed(2)} h ${b.h.toFixed(2)}`;
    });
    check(`s05 “${r.adj}” numbers fully typed before the next change`, Math.min(dimAt(i), cutOut - 1 / FPS), () =>
      r.chars.every((s) => s.style.visibility === "visible") || `${r.chars.filter((s) => s.style.visibility === "visible").length}/${r.chars.length} typed`);
    check(`s05 “${r.adj}” typed letters never touch the moving word`, [r.tSlide, settledAt(r)], () => {
      const hit = r.chars.findIndex((s) => overlap(s, r.word) > 0);
      return hit < 0 || `letter ${hit} overlaps the word`;
    });
  });
  check("s05 one row active at a time; finished rows at 45%", [rows[1].tAdj + 0.4, cutOut - 1 / FPS], (t) => {
    // Rows still active (no later row yet) are at 100%; rows whose 0.4 s fade has finished are at 45%.
    for (const [i, r] of rows.entries()) {
      const want = t < dimAt(i) ? 1 : t >= dimAt(i) + 0.4 ? 0.45 : null;
      if (want !== null && Math.abs(Number(r.group.style.opacity || 1) - want) > 0.001) return `row ${i} at ${r.group.style.opacity}, want ${want}`;
    }
    return rows.filter((r, i) => t < dimAt(i) && t >= r.tAdj).length <= 1 || "two rows active";
  });
  check("s05 last row holds ≥ 1.5 s before the cut", cutOut - 1 / FPS, () => cutOut - rows[3].tTyped >= 1.5 || `hold ${(cutOut - rows[3].tTyped).toFixed(2)} s`);
  check("s05 rows clear each other and the header", [cutIn, cutOut - 1 / FPS], () => {
    const els = [hAdj, hNum, arrow, ...rows.flatMap((r) => [r.word, r.num])];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const same = rows.find((r) => [r.word, r.num].includes(els[i]) && [r.word, r.num].includes(els[j]));
      if (same) continue;                                   // a word and its own numbers: checked letter by letter above
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s05 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    rows.every((r) => [r.word, r.num].every((el) => { const b = box(el); return b.x >= 40 && b.x + b.w <= 1040 && b.y >= 128 && b.y + b.h <= 1120; })) || "outside");

  return (t) => {
    rows.forEach((r, i) => {
      show(r.outer, t, r.tAdj, Infinity, { dur: 0.5, dy: 18 });
      const p = r.p(t);
      r.word.style.transform = p > 0 ? `translate(${(TX * p).toFixed(2)}px, ${(r.TY * p).toFixed(2)}px) scale(${(1 + (S - 1) * p).toFixed(4)})` : "none";
      let last = -1;
      r.chars.forEach((s, j) => {
        const on = t >= r.tType + j / CPS;
        s.style.visibility = on ? "visible" : "hidden";
        if (on) last = j;
      });
      const typing = t >= r.tType && t < r.tTyped + 0.3;
      r.caret.style.visibility = typing ? "visible" : "hidden";
      if (typing) {
        const st = last < 0 ? { x: 0, y: r.stops[0].y } : r.stops[last];
        r.caret.style.left = `${(X_NUM + st.x + 3).toFixed(2)}px`;
        r.caret.style.top = `${(NUM_TOP + st.y + 5).toFixed(2)}px`;
      }
      r.group.style.opacity = (1 - 0.55 * easeOut(p01(t, dimAt(i), 0.4))).toFixed(4);
    });
  };
}
