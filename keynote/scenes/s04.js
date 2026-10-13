// s04 Diagrams · bars 8–10 (17.45–21.82) · black · cut in, cut out. v2: the mirror of s03.
// The Manim explainer at full resolution (clips/explainer-hd: source 16–30 s, 1920×1080) on a 16:9
// screen the size of s03's, turned +16° easing to +5° across the shot, with its reflection; the frame
// pushes in 1.00 → 1.05. The crop drops only the empty margins (clip x 40–1780, y 29–1007), so the
// diagram (browser, DNS card with its table, network, server) fills the screen. The stretch is the
// DNS answer: at the cut (clip f161) the question has been asked (the blue arrow from the browser to
// the DNS card, the example.com row lit); the yellow arrow draws back (f166–178), "203.0.113.10" flies
// into the browser and is boxed on bar 8 beat 3 (f210), settled by f218. Bar 8 beat 1: one caption
// line (.caption, 64 px), "Diagrams" in white, "that explain an idea" in gray. Both
// arrows then hold, the whole round trip on screen, until the cut. The clip holds its last still frame
// (f262) before its next step begins (f264).
export default function build(root, k) {
  const { make, place, appear, barT, frames, easeInOut, p01, lerp, check, box, overlap, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, PUSH = 0.05;
  const SETTLE = 0.71;   // appear() is 99% of the way (0.24 px from its mark) after 0.71 s of its 0.9 s
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;

  // ---- the plan ----
  const T_HEAD = barT(8, 1);   // 18.000
  const T_BOXED = barT(8, 3);  // 19.091
  const TURN = { from: 16, to: 5 };
  const CLIP = { dir: "clips/explainer-hd", fps: 30, count: 420, arrow: 166, boxed: 210, settled: 218, last: 262 };
  CLIP.t0 = T_BOXED - CLIP.boxed / CLIP.fps;   // the IP is boxed in the browser on bar 8 beat 3
  const SRC = { w: 1920, h: 1080 };
  const across = (t) => easeInOut(p01(t, cutIn, cutOut - cutIn));

  // ---- layout: s03's, mirrored ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const SCR = { w: 880, h: 495, y: 520 };   // s03's screen, in the same place
  const head = make("div", "caption", 'Diagrams <span class="soft">that explain an idea</span>', stage, { position: "absolute" });
  place(head, Math.round(540 - head.offsetWidth / 2), SCR.y - 60 - head.offsetHeight);
  const stage3d = place(make("div", "stage3d", "", stage), 540 - SCR.w / 2, SCR.y, SCR.w, SCR.h);
  const screen = place(make("div", "screen", "", stage3d), 0, 0, SCR.w, SCR.h);
  screen.id = "s04-screen";
  // the crop: clip x 40–1780 (1740 px) at the screen's width, centred on the diagram (y 29–1007)
  const CROP = { x0: 40, w: 1740 };
  CROP.s = SCR.w / CROP.w;
  CROP.h = SCR.h / CROP.s;
  CROP.y0 = 518 - CROP.h / 2;
  const img = make("img", "", "", screen, { inset: "auto", objectFit: "fill", left: `${(-CROP.x0 * CROP.s).toFixed(2)}px`, top: `${(-CROP.y0 * CROP.s).toFixed(2)}px`,
    width: `${(SRC.w * CROP.s).toFixed(2)}px`, height: `${(SRC.h * CROP.s).toFixed(2)}px` });
  const play = frames(img, CLIP);
  const clipTime = (t) => Math.min(t - CLIP.t0, (CLIP.last + 0.5) / CLIP.fps);

  const angle = (t) => lerp(TURN.from, TURN.to, across(t));
  const settledAt = (t0) => onFrame(t0 - LEAD + SETTLE);
  const shown = () => Number(img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
  const inside = (el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 - 0.5 && r.y + r.h <= STAGE.y1 + 0.5 ? "" : `${el.id || el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; };

  // ---- checks ----
  [[head, T_HEAD, "bar 8 beat 1"]].forEach(([el, t0, beat]) => {
    check(`s04 the caption "${el.textContent}" appears from 2 frames before ${beat} (f${Math.round(t0 * FPS)}), hidden before, settled by f${Math.round(settledAt(t0) * FPS)}`, [onFrame(t0 - LEAD - 1 / FPS), settledAt(t0)], (t) => {
      if (t < t0 - LEAD) return el.style.visibility === "hidden" || "visible early";
      if (t >= settledAt(t0) - 1e-6) return (Number(el.style.opacity) >= 0.99 && Math.abs(new DOMMatrix(el.style.transform).f) < 0.25) || `opacity ${el.style.opacity}, ${el.style.transform}`;
      return true;
    });
  });
  check(`s04 the finished picture (both arrows, the boxed IP, the caption) is settled 2 s or more before the cut`, cutIn, () => {
    const done = Math.max(settledAt(T_HEAD), CLIP.t0 + CLIP.settled / CLIP.fps);
    return cutOut - done >= 2 || `${(cutOut - done).toFixed(2)} s`;
  });
  check(`s04 the IP is boxed in the browser on bar 8 beat 3 (f${Math.round(T_BOXED * FPS)}): clip frame ${CLIP.boxed}`, onFrame(T_BOXED), () => Math.abs(shown() - CLIP.boxed) <= 1 || `clip frame ${shown()}`);
  check("s04 the caption is one .caption line (64 px), white then gray, within 924 px", cutIn, () => {
    const fs = parseFloat(getComputedStyle(head).fontSize), soft = head.querySelector(".soft");
    return (fs === 64 && head.offsetWidth <= 924 && head.offsetHeight < 80 && soft && getComputedStyle(soft).color === "rgb(134, 134, 139)") || `size ${fs}, width ${head.offsetWidth}, height ${head.offsetHeight}`;
  });
  check("s04 the clip plays f161→f262, its still answer, and never shows its next step (f264+)", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const n = shown();
    return (n >= 160 && n <= CLIP.last) || `clip frame ${n}`;
  });
  check("s04 the crop stays inside the clip and keeps the whole diagram (clip x 65–1740, y 65–926)", cutIn, () => {
    const x1 = CROP.x0 + CROP.w, y1 = CROP.y0 + CROP.h;
    return (CROP.x0 >= 0 && CROP.y0 >= 0 && x1 <= SRC.w && y1 <= SRC.h && CROP.x0 <= 65 && x1 >= 1740 && CROP.y0 <= 65 && y1 >= 926) || `x ${CROP.x0}–${x1}, y ${CROP.y0.toFixed(1)}–${y1.toFixed(1)}`;
  });
  check("s04 composed on the cut: the screen shows the diagram at +16°, push 1.00, no text yet", onFrame(cutIn), (t) =>
    (!!img.getAttribute("src") && Math.abs(angle(t) - TURN.from) < 0.01 && head.style.visibility === "hidden") || `angle ${angle(t).toFixed(2)}`);
  check("s04 the screen turns +16° → +5° and the frame pushes 1.00 → 1.05, ease-in-out, both at rest on the cut out", cutOut - 1 / FPS, (t) =>
    (Math.abs(angle(t) - TURN.to) < 0.02 && Math.abs(across(t) - 1) < 1e-3) || `angle ${angle(t).toFixed(3)}`);
  check("s04 caption and screen stay inside the stage through the push, clear of each other", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const out = [head, screen].map(inside).filter(Boolean);
    if (overlap(head, screen)) out.push("overlap");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${(1 + PUSH * across(t)).toFixed(5)})`;
    screen.style.transform = `rotateY(${angle(t).toFixed(3)}deg)`;
    appear(head, t, T_HEAD - LEAD);
    return play(clipTime(t));
  };
}
