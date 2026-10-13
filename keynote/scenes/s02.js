// s02 Every frame · bars 4–6 · black · cut in on the drop, zoom-through out (11.21–12.01).
// The drop: "Every frame." (giant, two lines) slams in on bar 4 with the shot's one punch. On beat 1
// a mono counter under it starts showing this film's real frame number, Math.round(t * 60), on every
// frame it is on screen. Bar 5: "Made in code." with "code." in the gradient. Then it holds, ticking,
// into the zoom-through. Everything is centered; the content drifts 1.00 -> 1.04 about the frame's
// centre, and is laid out so it is still inside the stage at 1.04.
export default function build(root, k) {
  const { make, place, reveal, words, stagger, punch, drift, barT, check, box, overlap, C, STAGE } = k;
  const { cutIn, inEnd, outStart, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, DRIFT = 0.04;

  // ---- the plan ----
  const T_EVERY = barT(4);        // 7.742, the drop and the cut
  const T_COUNT = barT(4, 1);     // 8.226
  const T_CODE = barT(5);         // 9.677
  const SETTLE = 0.6;             // reveal()'s length

  // ---- layout (centered; y chosen so the block sits on the frame's centre) ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const center = (el, y) => { place(el, Math.round(540 - el.offsetWidth / 2), y); return el; };

  // Two lines at line-height 1.0 (the .giant class's 0.88 is set for one word): the lines' boxes
  // stay clear of each other, and the y's tail sits well above the f.
  const every = make("div", "giant center", "", stage, { position: "absolute", lineHeight: "1" });
  const everyLines = [make("div", "", "", every), make("div", "", "", every)];
  const everyWords = [...words(everyLines[0], "Every"), ...words(everyLines[1], "frame.")];
  center(every, 296);

  const counter = make("div", "mono", "", stage, { position: "absolute", fontSize: "60px", fontWeight: "500", letterSpacing: "0", lineHeight: "1", whiteSpace: "nowrap" });
  const fMark = make("span", "", "f ", counter, { color: C.mutedDark });
  const digits = make("span", "", "0000", counter, { color: C.white });
  center(counter, every.offsetTop + every.offsetHeight + 36);

  const code = make("div", "display", "", stage, { position: "absolute", whiteSpace: "nowrap" });
  const codeWords = words(code, "Made in code.");
  codeWords[2].classList.add("grad");
  center(code, counter.offsetTop + counter.offsetHeight + 84);

  const frameOf = (t) => Math.round(t * FPS);
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t
  const fmt = (t) => String(frameOf(t)).padStart(4, "0");

  // ---- checks ----
  const lastWord = (spans, t0) => onFrame(t0 - LEAD + 0.08 * (spans.length - 1) + SETTLE);
  check(`s02 "Every frame." starts 2 frames before bar 4 and is settled by f${Math.ceil(lastWord(everyWords, T_EVERY) * FPS)}`, lastWord(everyWords, T_EVERY), () =>
    everyWords.every((w) => Number(w.style.opacity) === 1 && (w.style.filter === "none" || !w.style.filter)) || everyWords.map((w) => w.style.opacity).join(" "));
  check(`s02 "Every frame." is already landing on the cut's first frame (f${frameOf(onFrame(cutIn))}) with its punch, gone by bar 4 + 6 frames`, [onFrame(cutIn), T_EVERY + 7 / FPS], (t) => {
    const a = Number(everyWords[0].style.opacity), s = punch(t, T_EVERY);
    if (Math.abs(t - onFrame(cutIn)) < 1e-6) return (a > 0.25 && a < 0.6 && s > 1.03) || `first frame: opacity ${a}, punch ${s.toFixed(3)}`;
    return t < T_EVERY + 6 / FPS || s === 1 || `punch ${s.toFixed(3)} after 6 frames`;
  });
  check(`s02 the counter shows this film's frame number on every frame from f${frameOf(T_COUNT)}`, [T_COUNT + 0.1, outStart], (t) =>
    digits.textContent === fmt(t) || `shows ${digits.textContent}, frame ${fmt(t)}`);
  check(`s02 "Made in code." lands on bar 5 (f${frameOf(T_CODE)}) and is settled by f${Math.ceil(lastWord(codeWords, T_CODE) * FPS)}`, lastWord(codeWords, T_CODE), () =>
    codeWords.every((w) => Number(w.style.opacity) === 1) || codeWords.map((w) => w.style.opacity).join(" "));
  check("s02 \"code.\" (only) carries the gradient", cutIn, () =>
    (stage.querySelectorAll(".grad").length === 1 && codeWords[2].classList.contains("grad")) || "gradient elsewhere");
  check("s02 the type stays inside the stage through the drift", [inEnd, outStart], () => {
    const out = [every, counter, code].map((el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 && r.y + r.h <= STAGE.y1 ? "" : `${el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
    return out.join("; ") || true;
  });
  check("s02 the three texts never overlap", [T_CODE + SETTLE, outStart], () =>
    (overlap(every, counter) + overlap(counter, code) + overlap(every, code) === 0) || "overlap");
  check("s02 \"Every frame.\" is giant (200–220 px) and holds still between its landing and the zoom-through (drift only)", [lastWord(everyWords, T_EVERY), outStart], () => {
    const fs = parseFloat(getComputedStyle(every).fontSize);
    return (fs >= 200 && fs <= 220 && everyWords.every((w) => /scale\(1(\.0+)?\)/.test(w.style.transform))) || `size ${fs}, ${everyWords[0].style.transform}`;
  });

  return (t) => {
    stage.style.transform = `scale(${drift(t, cutIn, cutOut, DRIFT).toFixed(5)})`;
    every.style.transform = `scale(${punch(t, T_EVERY).toFixed(4)})`;
    stagger(everyWords, t, T_EVERY - LEAD);
    // the counter: a secondary (60% of the reveal's scale and blur), live from beat 1
    reveal(counter, t, T_COUNT - LEAD, Infinity, { scale: 1.036, blur: 8 });
    digits.textContent = fmt(t);
    stagger(codeWords, t, T_CODE - LEAD);
  };
}
