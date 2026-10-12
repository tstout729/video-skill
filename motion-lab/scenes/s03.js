// s03 Lab notebook and thesis. A notebook card lists "3 animations · every prompt · every follow-up"
// (the last two on their cues). On "adjectives" the word "premium" sits in a dashed box labelled
// "the model's default", and the notebook steps back. Hero move: on "number" the word breaks into
// letters 1 frame apart and they rebuild as "ζ 0.82" (text springs at ζ 1.0); the box turns solid
// accent and its label becomes "your decision". On "you take" the equation "adjective → number"
// arrives and holds to the cut.

export default function build(root, k) {
  const { make, place, show, cueIn, swap, style, spring01, easeIn, easeOut, easeInOut, p01, rand, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tPrompt = cueIn(k.id, "every prompt");
  const tFollow = cueIn(k.id, "every follow up");
  const tIdea = cueIn(k.id, "main idea");
  const tAdj = cueIn(k.id, "adjectives");
  const tBreak = cueIn(k.id, "number");
  const tEq = cueIn(k.id, "you take");

  // ---- the notebook (on screen from the cut) ----
  // It opens in the middle of the stage, then rises and steps back on "main idea" (ease-in-out,
  // 0.8 s), making room for the thesis before "adjectives" brings it in.
  const BOOK_Y0 = 300, BOOK_Y1 = 40, RISE = 0.8;
  const book = place(make("div", "card", "", root), 80, BOOK_Y0, 920, 356);
  // Binding: six ring holes down the left edge, 2.5 px ink strokes.
  const rings = Array.from({ length: 6 }, (_, i) => `<circle cx="22" cy="${34 + i * 58}" r="9" fill="none" stroke="${C.ink}" stroke-width="2.5"/>`).join("");
  make("div", "", `<svg width="44" height="356" viewBox="0 0 44 356">${rings}</svg>`, book, { position: "absolute", left: "18px", top: "0px" });
  make("div", "", "", book, { position: "absolute", left: "70px", top: "0px", width: "2px", height: "356px", background: C.line });
  make("div", "h2", "Lab notebook", book, { position: "absolute", left: "104px", top: "36px" });
  const ITEMS = ["3 animations", "every prompt", "every follow-up"];
  const rows = ITEMS.map((txt, i) => {
    const y = 128 + i * 72;
    make("div", "", "", book, { position: "absolute", left: "104px", right: "48px", top: `${y + 60}px`, height: "2px", background: C.line });
    const row = make("div", "", "", book, { position: "absolute", left: "104px", top: `${y + 6}px`, display: "flex", alignItems: "baseline", gap: "22px" });
    make("span", "mono", `0${i + 1}`, row, { fontSize: "28px", color: C.muted });
    make("span", "", txt, row, { fontSize: "36px", fontWeight: "560" });
    return row;
  });
  const rowAt = [cutIn - 1, tPrompt, tFollow];   // the first row is part of the opening picture

  // ---- the thesis: one adjective in a box ----
  const BX = 80, BY = 520, BW = 600, BH = 196;
  const label = place(make("div", "", "", root, { fontSize: "30px", fontWeight: "560", height: "40px", width: "600px" }), BX, BY - 56);
  const labelOld = make("div", "", "the model’s default", label, { position: "absolute", left: "0px", top: "0px", color: C.muted });
  const labelNew = make("div", "", "your decision", label, { position: "absolute", left: "0px", top: "0px", color: C.accent });
  // overflow hidden: the old letters fall out through the bottom edge, the new ones drop in from the top.
  const frame = place(make("div", "", "", root, { borderRadius: "28px", background: C.paper, overflow: "hidden" }), BX, BY, BW, BH);
  const dashed = make("div", "", "", frame, { position: "absolute", inset: "0px", borderRadius: "28px", border: `2.5px dashed ${C.faint}` });
  const solid = make("div", "", "", frame, { position: "absolute", inset: "0px", borderRadius: "28px", border: `3px solid ${C.accent}`, opacity: "0" });
  const layer = (cls, css) => make("div", cls, "", frame, { position: "absolute", inset: "0px", display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "pre", ...css });
  const oldWord = layer("", { fontSize: "96px", fontWeight: "700", letterSpacing: "-0.03em", color: C.ink });
  const newWord = layer("mono", { fontSize: "96px", fontWeight: "600", letterSpacing: "-0.02em", color: C.accent });
  const spans = (parent, text) => [...text].map((ch) => make("span", "", ch, parent, { display: "inline-block", willChange: "transform" }));
  const olds = spans(oldWord, "premium");
  const news = spans(newWord, "ζ 0.82");
  news[0].dataset.track = "s03-zeta";

  // Seeded scatter: each old letter falls and turns away; each new one drops into place from above.
  const r = rand("s03-letters");
  const outs = olds.map(() => ({ dx: (r() - 0.5) * 80, dy: 70 + r() * 40, rot: (r() - 0.5) * 60 }));
  const ins = news.map(() => ({ dx: (r() - 0.5) * 30, dy: -(56 + r() * 30) }));
  const OUT = 0.3, IN_LAG = 0.28;          // the rebuild starts as the last old letters leave
  const outAt = (i) => tBreak + i / FPS;
  const inAt = (i) => tBreak + IN_LAG + i / FPS;
  const settledAt = inAt(news.length - 1) + 0.8;

  // ---- the equation, held to the cut ----
  const eq = place(make("div", "h1", "", root, { whiteSpace: "nowrap" }), BX, BY + BH + 74);
  eq.innerHTML = `<span style="color:${C.muted}">adjective</span> <span style="color:${C.muted}">→</span> <span style="color:${C.accent}">number</span>`;

  sfx(inAt(news.length - 1) + 0.25 + 1 / FPS, "pop");   // ζ 0.82 lands

  // ---- checks ----
  check("s03 premium is gone by its last letter + 0.3 s", outAt(olds.length - 1) + OUT + 1 / FPS, () =>
    olds.every((s) => Number(s.style.opacity) < 0.01) || "a letter of premium is still visible");
  check("s03 ζ 0.82 rebuilt and settled", [settledAt, cutOut - 1 / FPS], () => {
    const bad = news.find((s) => Number(s.style.opacity) < 0.999 || Math.abs(new DOMMatrix(getComputedStyle(s).transform === "none" ? undefined : getComputedStyle(s).transform).f) > 0.5);
    return !bad || "a letter of ζ 0.82 is not on its mark";
  });
  check("s03 notebook has risen before the box arrives", tAdj, () => Math.abs(box(book).y - 128 - BOOK_Y1) < 0.5 || `book at ${(box(book).y - 128).toFixed(1)}`);
  check("s03 letters break 1 frame apart", tBreak, () => Math.abs(outAt(1) - outAt(0) - 1 / FPS) < 1e-9 || "stagger");
  check("s03 equation holds ≥ 2.2 s before the cut", cutOut - 1 / FPS, () => cutOut - tEq >= 2.2 || `hold ${(cutOut - tEq).toFixed(2)} s`);
  check("s03 box, label, equation and notebook never overlap", [cutIn, cutOut - 1 / FPS], () => {
    const els = [book, label, frame, eq];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s03 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [book, label, frame, eq].every((el) => { const b = box(el); return b.y >= 128 && b.y + b.h <= 1120 && b.x + b.w <= 1080; }) || "outside");

  return (t) => {
    rows.forEach((row, i) => show(row, t, rowAt[i], Infinity, { dur: 0.5, dx: -18, dy: 0 }));
    const rise = easeInOut(p01(t, tIdea, RISE));
    book.style.top = `${(BOOK_Y0 + (BOOK_Y1 - BOOK_Y0) * rise).toFixed(2)}px`;
    book.style.opacity = (1 - 0.55 * rise).toFixed(4);   // steps back for the thesis

    // The box arrives on "adjectives"; its label follows 150 ms later.
    show(frame, t, tAdj, Infinity, { dur: 0.55, dy: 0, scale: 0.96 });
    const lab = swap(t, tBreak + 0.15);
    show(label, t, tAdj + 0.15, Infinity, { dur: 0.5, dy: 10 });
    style(labelOld, lab.out);
    style(labelNew, lab.in);
    const edge = easeOut(p01(t, tBreak + 0.15, 0.4));
    dashed.style.opacity = (1 - edge).toFixed(4);
    solid.style.opacity = edge.toFixed(4);

    // The break: each letter of "premium" drops and turns away (ease-in, 0.3 s), 1 frame apart.
    olds.forEach((s, i) => {
      const p = easeIn(p01(t, outAt(i), OUT));
      const o = outs[i];
      s.style.opacity = (1 - p).toFixed(4);
      s.style.transform = p > 0 ? `translate(${(o.dx * p).toFixed(2)}px, ${(o.dy * p).toFixed(2)}px) rotate(${(o.rot * p).toFixed(2)}deg)` : "none";
    });
    // The rebuild: each character of "ζ 0.82" rises into place on a text spring (ζ 1.0), 1 frame apart.
    news.forEach((s, i) => {
      const a = easeOut(p01(t, inAt(i), 0.35));
      const m = 1 - spring01(t, inAt(i), { duration: 0.55, damping: 1 });
      const o = ins[i];
      s.style.opacity = a.toFixed(4);
      s.style.transform = m > 0.0005 ? `translate(${(o.dx * m).toFixed(2)}px, ${(o.dy * m).toFixed(2)}px)` : "none";
    });

    show(eq, t, tEq, Infinity, { dur: 0.55, dy: 16 });
  };
}
