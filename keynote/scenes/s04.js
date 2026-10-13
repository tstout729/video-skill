// s04 Diagrams · bar 8 · black · whip in (15.18–15.78), cut out on bar 9 (17.42).
// The Manim explainer (DNS) in a wide window as wide as s03's, so the whip carries one frame across:
// the browser slides aside as the whip lands, the server appears, and the network draws itself on
// under "Diagrams.", which lands on bar 8 beat 1, once the whip has settled. One bar. Centered; the
// content drifts 1.00 -> 1.04 about the frame's centre and stays inside the stage at 1.04.
export default function build(root, k) {
  const { make, place, reveal, drift, barT, frames, clipWindow, check, box, overlap, STAGE } = k;
  const { cutIn, inEnd, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, DRIFT = 0.04;
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t

  // ---- the plan ----
  const T_WORD = barT(8, 1);      // 15.968, after the whip ends (15.78)
  // Clip time: frame 57 (the browser halfway aside) as the whip ends; the server appears at f63,
  // the nodes at f72–93 and the edges draw f90–117, so the network is drawing at the cut out (f106).
  const CLIP = { dir: "clips/explainer", fps: 30, count: 180, aside: 57 };
  // A wide window (932 x 420) cropped 1.09x (1.12x of a full fit) to the diagram's band: the window
  // shows clip x 23–879 and y 150–535 (the diagram spans x 32–870, y 220–463, measured), so the
  // network is 12% larger, centered, with no dead ground above it, and the step label is left out.
  const WIN = { x: 74, y: 560, w: 932, h: 420 };
  const CROP = { scale: 1.09, x0: 23.5 };
  CROP.y0 = (220 + 463) / 2 - WIN.h / CROP.scale / 2;
  CLIP.t0 = inEnd - CLIP.aside / CLIP.fps;

  // ---- layout: the word and the window centered on the frame ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const word = make("div", "hero", "Diagrams.", stage, { position: "absolute", fontSize: "140px" });
  place(word, Math.round(540 - word.offsetWidth / 2), 370);
  const win = clipWindow(stage, WIN.x, WIN.y, WIN.w, WIN.h, false);
  Object.assign(win.img.style, { inset: "auto", left: `${(-CROP.x0 * CROP.scale).toFixed(2)}px`, top: `${(-CROP.y0 * CROP.scale).toFixed(2)}px`,
    width: `${(960 * CROP.scale).toFixed(2)}px`, height: `${(540 * CROP.scale).toFixed(2)}px`, objectFit: "fill" });
  const play = frames(win.img, CLIP);

  // ---- checks ----
  check(`s04 "Diagrams." starts 2 frames before bar 8 beat 1 (f${Math.round(T_WORD * FPS)}), after the whip, settled by f${Math.ceil((T_WORD - LEAD + 0.6) * FPS)}`, [inEnd, onFrame(T_WORD - LEAD + 0.6)], (t) => {
    if (T_WORD - LEAD < inEnd) return "lands inside the whip";
    if (t < T_WORD - LEAD) return word.style.visibility === "hidden" || "visible early";
    if (t >= onFrame(T_WORD - LEAD + 0.6) - 1e-6) return Number(word.style.opacity) === 1 || `opacity ${word.style.opacity}`;
    return true;
  });
  check("s04 the word holds 0.8 s or more settled before the cut", cutIn, () => (cutOut - (T_WORD - LEAD + 0.6) >= 0.8) || "short hold");
  check("s04 the clip shows the diagram moving and never runs out", cutIn, () => {
    const a = (cutIn - CLIP.t0) * CLIP.fps, b = (cutOut - CLIP.t0) * CLIP.fps;
    return (a >= 0 && b <= CLIP.count - 1 && a <= 48 && b >= 100) || `frames ${a.toFixed(0)}–${b.toFixed(0)}`;
  });
  check("s04 the crop stays inside the clip and keeps the whole diagram (x 32–870, y 220–463)", cutIn, () => {
    const x1 = CROP.x0 + WIN.w / CROP.scale, y1 = CROP.y0 + WIN.h / CROP.scale;   // clip px
    return (CROP.x0 >= 0 && CROP.y0 >= 0 && x1 <= 960 + 0.01 && y1 <= 540 + 0.01 && CROP.x0 <= 32 && x1 >= 870 && CROP.y0 <= 220 && y1 >= 463) || `x ${CROP.x0}–${x1.toFixed(1)}, y ${CROP.y0}–${y1.toFixed(1)}`;
  });
  check("s04 the window is composed at the whip: a clip frame is showing from the first frame", onFrame(cutIn), () =>
    !!win.img.getAttribute("src") || "no picture at cutIn");
  check("s04 word and window stay inside the stage through the drift, clear of each other", [inEnd, cutOut - 1 / FPS], () => {
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
