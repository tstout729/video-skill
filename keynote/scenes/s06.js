// s06 Loops · bar 10 · light · whip up in (19.05–19.65), cut out on bar 11 (21.29).
// The checkout loop in a square window, cropped in 1.2x so its one shape reads on a phone. The green
// check holds through the whip; "Loops." (hero 140 px, ink) lands on bar 10 beat 1; on beat 2 the
// check grows into the receipt ($48.00, Paid to Acme Coffee), the loop's last full morph, settled
// 0.3 s before the cut. Centered; the content drifts 1.00 -> 1.04 about the frame's centre and stays
// inside the stage at 1.04.
export default function build(root, k) {
  const { make, place, reveal, drift, barT, frames, clipWindow, check, box, overlap, sfx, STAGE } = k;
  const { cutIn, inEnd, outStart, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, DRIFT = 0.04;
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t
  root.classList.add("light");

  // ---- the plan ----
  const T_WORD = barT(10, 1);     // 19.839, after the whip ends (19.65)
  const T_MORPH = barT(10, 2);    // 20.323: the check starts to grow into the receipt
  // Clip frames (30 fps): the check holds f182–241, the receipt grows f242–262 and holds to f299.
  const CLIP = { dir: "clips/loop", fps: 30, count: 300, morph: 242, settled: 262, scale: 1.2 };
  CLIP.t0 = T_MORPH - CLIP.morph / CLIP.fps;

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const SQ = { s: 780, y: 362 };
  SQ.x = 540 - SQ.s / 2;
  const word = make("div", "hero", "Loops.", stage, { position: "absolute", fontSize: "140px" });
  place(word, Math.round(540 - word.offsetWidth / 2), 180);
  const win = clipWindow(stage, SQ.x, SQ.y, SQ.s, SQ.s, true);
  // the clip scaled about its centre: the window shows its middle 1/1.2 (clip px 72–788), so the
  // receipt fills 63% of it and the pointer (clip x 690–719, y 716–763) stays whole, clear of the corner
  const S = SQ.s * CLIP.scale, off = (SQ.s - S) / 2;
  Object.assign(win.img.style, { inset: "auto", left: `${off}px`, top: `${off}px`, width: `${S}px`, height: `${S}px`, objectFit: "fill" });
  const play = frames(win.img, CLIP);

  // ---- sound: the whip in (s05 -> s06), unless s05 already declared it ----
  const whipPeak = (cutIn + inEnd) / 2;
  if (!(window.SFX || []).some((s) => s.kind === "whoosh" && Math.abs(s.t - whipPeak) < 0.15)) sfx(whipPeak + 1 / FPS, "whoosh");

  // ---- checks ----
  check(`s06 "Loops." starts 2 frames before bar 10 beat 1 (f${Math.round(T_WORD * FPS)}), after the whip, settled by f${Math.ceil((T_WORD - LEAD + 0.6) * FPS)}`, [inEnd, onFrame(T_WORD - LEAD + 0.6)], (t) => {
    if (T_WORD - LEAD < inEnd) return "lands inside the whip";
    if (t < T_WORD - LEAD) return word.style.visibility === "hidden" || "visible early";
    if (t >= onFrame(T_WORD - LEAD + 0.6) - 1e-6) return Number(word.style.opacity) === 1 || `opacity ${word.style.opacity}`;
    return true;
  });
  check(`s06 the receipt morph starts on bar 10 beat 2 (f${Math.round(T_MORPH * FPS)}), one beat after the word, and settles before the cut`, [T_MORPH - 1 / FPS, T_MORPH + 1 / FPS], (t) => {
    const n = Number(win.img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
    const want = Math.floor((t - CLIP.t0) * CLIP.fps + 1e-6);
    const settled = CLIP.t0 + CLIP.settled / CLIP.fps;
    return (n === want && Math.abs(n - CLIP.morph) <= 1 && settled < cutOut - 0.25) || `clip frame ${n}, settled ${settled.toFixed(2)}`;
  });
  check("s06 the check holds still through the whip, and the clip never runs out", cutIn, () => {
    const a = (cutIn - CLIP.t0) * CLIP.fps, b = (cutOut - CLIP.t0) * CLIP.fps;
    return (a >= 182 && b <= CLIP.count - 1) || `frames ${a.toFixed(0)}–${b.toFixed(0)}`;
  });
  check("s06 the crop keeps the receipt (clip 203–655 x 215–651) and the pointer (to 719, 763) whole, 20 px clear of the edges", cutIn, () => {
    const v0 = 430 - 430 / CLIP.scale, v1 = 430 + 430 / CLIP.scale, m = 20 / (SQ.s / 860 * CLIP.scale);
    return (v0 + m <= 203 && v1 - m >= 763) || `visible ${v0.toFixed(0)}–${v1.toFixed(0)}`;
  });
  check("s06 word and window stay inside the stage through the drift, clear of each other", [inEnd, cutOut - 1 / FPS], () => {
    const out = [word, win.el].map((el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 && r.y + r.h <= STAGE.y1 ? "" : `${el.textContent || "window"} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
    if (overlap(word, win.el)) out.push("word over window");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${drift(t, cutIn, cutOut, DRIFT).toFixed(5)})`;
    reveal(word, t, T_WORD - LEAD);
    return play(t - CLIP.t0);
  };
}
