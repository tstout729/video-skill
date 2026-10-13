// s03 Walkthroughs · bars 6–8 · light · zoom-through in (11.21–12.01), whip left out (15.18–15.78).
// The walkthrough clip plays in a 16:9 window from the zoom-through: the "Invite to Acme" modal opens,
// the clip's own camera moves in, the pointer clicks the email field on bar 7 and types
// "jordan@example.com", complete 0.24 s before the whip. Bar 6 beat 1: "Walkthroughs." (hero 140 px,
// ink) lands over the window. Bar 7: one short line under it. Centered; the content drifts
// 1.00 -> 1.04 about the frame's centre and is laid out to stay inside the stage at 1.04.
export default function build(root, k) {
  const { make, place, reveal, drift, barT, frames, clipWindow, check, box, overlap, sfx, C, STAGE } = k;
  const { cutIn, inEnd, outStart, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, DRIFT = 0.04;
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t
  root.classList.add("light");

  // ---- the plan ----
  const T_WORD = barT(6, 1);      // 12.097
  const T_LINE = barT(7);         // 13.548
  // Clip time: the pointer clicks the email field on clip frame 122 (30 fps), on bar 7 with the line;
  // the modal is opening (f52) at the cut in, and the email is typed out by f164 (14.95 s).
  const CLIP = { dir: "clips/walkthrough", fps: 30, count: 210, click: 122, typed: 164 };
  CLIP.t0 = T_LINE - CLIP.click / CLIP.fps;

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const WIN = { x: 74, y: 452, w: 932, h: 524 };   // 16:9; 969 px wide at the end of the drift
  const word = make("div", "hero", "Walkthroughs.", stage, { position: "absolute", fontSize: "140px" });
  place(word, Math.round(540 - word.offsetWidth / 2), 262);
  const win = clipWindow(stage, WIN.x, WIN.y, WIN.w, WIN.h, true);
  const play = frames(win.img, CLIP);
  // Secondary gray, one step darker than C.muted: the line sits in the window's soft shadow, where the
  // ground measures #DEDEE0–#EDEDEF and #6E6E73 falls to 4.2:1; #616166 holds 4.6–5.0:1 there.
  const line = make("div", "small", "Real screens, clicked step by step.", stage, { position: "absolute", whiteSpace: "nowrap", color: "#616166" });
  place(line, Math.round(540 - line.offsetWidth / 2), WIN.y + WIN.h + 40);

  // ---- sound: the whip out, one frame after its peak (the handoff) ----
  const whipPeak = (outStart + cutOut) / 2;
  sfx(whipPeak + 1 / FPS, "whoosh");

  // ---- checks ----
  check(`s03 "Walkthroughs." starts 2 frames before bar 6 beat 1 (f${Math.round(T_WORD * FPS)}) and is settled by f${Math.ceil((T_WORD - LEAD + 0.6) * FPS)}`, [T_WORD - LEAD - 1 / FPS, onFrame(T_WORD - LEAD + 0.6)], (t) => {
    if (t < T_WORD - LEAD) return word.style.visibility === "hidden" || "visible early";
    if (t >= onFrame(T_WORD - LEAD + 0.6) - 1e-6) return Number(word.style.opacity) === 1 || `opacity ${word.style.opacity}`;
    return true;
  });
  check(`s03 the line lands on bar 7 (f${Math.round(T_LINE * FPS)}) with the click on the email field`, T_LINE, () => {
    const n = Number(win.img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
    return (Math.abs(n - CLIP.click) <= 1 && line.style.visibility !== "hidden") || `clip frame ${n}`;
  });
  check("s03 the window is composed at the zoom-through: a clip frame is showing from the first frame", onFrame(cutIn), () =>
    (!!win.img.getAttribute("src") && win.el.offsetWidth === WIN.w) || "no picture at cutIn");
  check("s03 the email is typed out before the whip, and the clip never runs out", cutIn, () => {
    const typed = CLIP.t0 + CLIP.typed / CLIP.fps, a = (cutIn - CLIP.t0) * CLIP.fps, b = (cutOut - CLIP.t0) * CLIP.fps;
    return (typed <= outStart - 0.2 && a >= 0 && b <= CLIP.count - 1) || `typed ${typed.toFixed(2)}, frames ${a.toFixed(0)}–${b.toFixed(0)}`;
  });
  check("s03 word, window and line stay inside the stage through the drift, clear of each other", [inEnd, outStart], () => {
    const out = [word, win.el, line].map((el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 && r.y + r.h <= STAGE.y1 ? "" : `${el.textContent || "window"} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
    if (overlap(word, win.el) || overlap(line, win.el) || overlap(word, line)) out.push("overlap");
    return out.join("; ") || true;
  });
  check("s03 the word fits the 16:9 window's width and the line is 28 px or more", cutIn, () =>
    (word.offsetWidth <= WIN.w && parseFloat(getComputedStyle(line).fontSize) >= 28) || `word ${word.offsetWidth} px`);

  return (t) => {
    stage.style.transform = `scale(${drift(t, cutIn, cutOut, DRIFT).toFixed(5)})`;
    reveal(word, t, T_WORD - LEAD);
    // a secondary: 60% of the reveal's scale and blur
    reveal(line, t, T_LINE - LEAD, Infinity, { scale: 1.036, blur: 8 });
    return play(t - CLIP.t0);
  };
}
