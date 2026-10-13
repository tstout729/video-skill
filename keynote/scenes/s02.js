// s02 Every frame · bars 4–6 (8.73–13.09) · black · cut in on drop 1, cut out. v2.
// The film's one hard landing: "Every frame." (giant 220 px, two lines) slams in on the boom on bar 4
// with the keynote reveal (words 80 ms apart, from 2 frames before the beat) and the shot's one punch.
// A mono counter under it shows this film's real frame number, Math.round(t * 60), on every frame; it
// comes in as a secondary 150 ms after the slam (a gentle appear, 60% of the travel). Bar 5: "Made in
// code." as one Apple caption line (.caption, 64 px: "Made in" gray, "code." white) with appear(): only
// "Every frame." is set huge. The frame pushes in 1.00 → 1.05,
// ease-in-out across the shot. Everything is centred, laid out to stay inside the stage at 1.05.
// (A two-bar shot: "Made in code." on bar 5 leaves its finished picture 1.5 s before the cut; agreed
// with the coordinator, 2026-10-13.)
export default function build(root, k) {
  const { make, place, appear, words, stagger, punch, barT, easeInOut, p01, check, box, overlap, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, PUSH = 0.05;
  const SETTLE = 0.71;   // appear() is 99% of the way after 0.71 s of its 0.9 s
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;

  // ---- the plan ----
  const T_EVERY = barT(4);          // 8.727, the boom and the cut
  const T_COUNT = T_EVERY + 0.15;   // the counter, a secondary 150 ms after the slam
  const T_CODE = barT(5);           // 10.909
  const across = (t) => easeInOut(p01(t, cutIn, cutOut - cutIn));

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const center = (el, y) => place(el, Math.round(540 - el.offsetWidth / 2), y);
  // two lines at line-height 1.0 (the .giant class's 0.88 is set for one line; its boxes would cross)
  const every = make("div", "giant center", "", stage, { position: "absolute", lineHeight: "1" });
  const lines = [make("div", "", "", every), make("div", "", "", every)];
  const everyWords = [...words(lines[0], "Every"), ...words(lines[1], "frame.")];
  const counter = make("div", "mono", "", stage, { position: "absolute", fontSize: "52px", fontWeight: "500", letterSpacing: "0", lineHeight: "1", whiteSpace: "nowrap" });
  make("span", "", "f ", counter, { color: C.gray });
  const digits = make("span", "", "0000", counter, { color: C.white });
  const code = make("div", "caption", '<span class="soft">Made in</span> code.', stage, { position: "absolute" });
  // the finished block (giant, counter, caption) centred on the frame
  const GAP1 = 36, GAP2 = 72;
  const blockH = every.offsetHeight + GAP1 + counter.offsetHeight + GAP2 + code.offsetHeight;
  center(every, Math.round(675 - blockH / 2));
  center(counter, every.offsetTop + every.offsetHeight + GAP1);
  center(code, counter.offsetTop + counter.offsetHeight + GAP2);

  const fmt = (t) => String(Math.round(t * FPS)).padStart(4, "0");
  const COUNT_IN = { dur: 0.6, dy: 14, blur: 5 };
  const everySettled = onFrame(T_EVERY - LEAD + 0.08 * (everyWords.length - 1) + 0.6);
  const codeSettled = onFrame(T_CODE - LEAD + SETTLE);

  // ---- checks ----
  check(`s02 "Every frame." is already landing on the cut's first frame (f${Math.round(onFrame(cutIn) * FPS)}) with its punch peaking on bar 4, gone 6 frames later`, [onFrame(cutIn), T_EVERY + 7 / FPS], (t) => {
    const a = Number(everyWords[0].style.opacity), s = punch(t, T_EVERY);
    if (Math.abs(t - onFrame(cutIn)) < 1e-6) return (a > 0.25 && a < 0.6 && s > 1.03) || `first frame: opacity ${a}, punch ${s.toFixed(3)}`;
    return t < T_EVERY + 6 / FPS || s === 1 || `punch ${s.toFixed(3)} after 6 frames`;
  });
  check(`s02 "Every frame." settled by f${Math.round(everySettled * FPS)} and holds 1.4 s or more before "Made in code." starts`, everySettled, () => {
    const ok = everyWords.every((w) => Number(w.style.opacity) === 1 && (!w.style.filter || w.style.filter === "none"));
    return (ok && T_CODE - LEAD - everySettled >= 1.4) || `opacity ${everyWords.map((w) => w.style.opacity).join(" ")}, hold ${(T_CODE - LEAD - everySettled).toFixed(2)} s`;
  });
  check(`s02 the counter shows this film's frame number on every frame, in place by f${Math.round(onFrame(T_COUNT + 0.5) * FPS)}`, [onFrame(T_COUNT + 0.5), cutOut - 1 / FPS], (t) =>
    (digits.textContent === fmt(t) && Number(counter.style.opacity) > 0.99) || `shows ${digits.textContent} at frame ${fmt(t)}, opacity ${counter.style.opacity}`);
  check(`s02 "Made in code." appears from 2 frames before bar 5 (f${Math.round(T_CODE * FPS)}), hidden before, settled by f${Math.round(codeSettled * FPS)}, 1.4 s or more before the cut`, [onFrame(T_CODE - LEAD - 1 / FPS), codeSettled], (t) => {
    if (t < T_CODE - LEAD) return code.style.visibility === "hidden" || "visible early";
    if (t >= codeSettled - 1e-6) return (Number(code.style.opacity) >= 0.99 && cutOut - codeSettled >= 1.4) || `opacity ${code.style.opacity}, hold ${(cutOut - codeSettled).toFixed(2)}`;
    return true;
  });
  check("s02 \"Made in code.\" is one .caption line (64 px): \"Made in\" gray, \"code.\" white; only \"Every frame.\" is huge", cutIn, () => {
    const fs = parseFloat(getComputedStyle(code).fontSize), soft = code.querySelector(".soft");
    return (fs === 64 && code.offsetHeight < 80 && soft?.textContent === "Made in" && getComputedStyle(soft).color === "rgb(134, 134, 139)" && getComputedStyle(code).color === "rgb(245, 245, 247)" && parseFloat(getComputedStyle(every).fontSize) === 220) || `size ${fs}`;
  });
  check("s02 the frame pushes 1.00 → 1.05 ease-in-out, at rest on both cuts", [onFrame(cutIn), cutOut - 1 / FPS], (t) => {
    const s = 1 + PUSH * across(t);
    if (Math.abs(t - onFrame(cutIn)) < 1e-6) return s < 1.0001 || `push ${s}`;
    if (t > cutOut - 1.5 / FPS) return s > 1.0499 || `push ${s}`;
    return true;
  });
  check("s02 the type stays inside the stage through the push, and the three texts never overlap", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const out = [every, counter, code].map((el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 && r.y + r.h <= STAGE.y1 ? "" : `${el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
    if (overlap(every, counter) + overlap(counter, code) + overlap(every, code)) out.push("overlap");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${(1 + PUSH * across(t)).toFixed(5)})`;
    every.style.transform = `scale(${punch(t, T_EVERY).toFixed(4)})`;
    stagger(everyWords, t, T_EVERY - LEAD);
    appear(counter, t, T_COUNT - LEAD, Infinity, COUNT_IN);
    digits.textContent = fmt(t);
    appear(code, t, T_CODE - LEAD);
  };
}
