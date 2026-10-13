// s08 Any frame · bars 13–15 · light · cut in on bar 13 (25.16), dissolve out (28.63–29.43).
// The 16:9 window and its label are on screen from the cut; "Any frame." (display, ink) lands on bar 13
// beat 1, from rest, as in s03, s04, s06 and s07. One window springs (ζ 0.82, 0.5 s) through four frame
// sizes on half-bars: 16:9 (the cut), 1:1 (bar 13 beat 2), 4:5 (bar 14), 9:16 (bar 14 beat 2), each
// fitted to one 932 x 860 box around a fixed centre. The picture reframes inside: the checkout card
// from the loop (clips/loop, its one centered object on a flat ground) stays centered and is laid out
// as large as each frame allows, so it reads whole at every ratio; the window's ground is the clip's
// own (#eae9e4), so the frame extends the picture instead of letterboxing it. A mono label under
// the window swaps with each shape, 150 ms after the spring starts. Centered; the content drifts
// 1.00 -> 1.04 about the frame's centre and stays inside the stage at 1.04.
export default function build(root, k) {
  const { make, place, reveal, show, drift, barT, frames, clipWindow, spring01, check, box, overlap, C, STAGE } = k;
  const { cutIn, outStart, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, DRIFT = 0.04;
  const SPRING = { duration: 0.5, damping: 0.82 };
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t
  root.classList.add("light");

  // ---- the plan ----
  const T_WORD = barT(13, 1);     // 25.645, a beat after the cut
  const BOX = { w: 932, h: 860, cx: 540, cy: 720 };
  const fit = (rw, rh) => { const s = Math.min(BOX.w / rw, BOX.h / rh); return { w: Math.round(rw * s), h: Math.round(rh * s) }; };
  const SHAPES = [
    { at: -Infinity, ratio: "16:9", where: "YouTube", ...fit(16, 9), pic: 760 },        // 932 x 524
    { at: barT(13, 2) - LEAD, ratio: "1:1", where: "Feeds", ...fit(1, 1), pic: 940 },    // 860 x 860
    { at: barT(14) - LEAD, ratio: "4:5", where: "LinkedIn", ...fit(4, 5), pic: 860 },    // 688 x 860
    { at: barT(14, 2) - LEAD, ratio: "9:16", where: "Reels", ...fit(9, 16), pic: 730 },  // 484 x 860
  ];
  // The labels swap on each spring's first frame: the old one goes on that frame (before the window can
  // grow into its place), the new one comes in over 0.15 s from 6 px, under the new shape. Each is on
  // screen the whole half-bar (0.97 s), settled for 0.82 s: the most the half-bar cadence allows.
  const LABEL = { enter: 0.15 };
  // The loop's checkout card (clip frames 34–104 at 30 fps: the card formed, the pointer resting on
  // Pay). It is a still pose in the source, so the picture holds while the frame moves. The picture is
  // laid out again for each frame size, like a native render: `pic` is the clip's size in px, so the
  // card is as large as each frame allows (52–64% of its width) and always whole.
  const CLIP = { dir: "clips/loop", fps: 30, count: 300, from: 34, to: 104, ground: "rgb(234, 233, 228)" };
  CLIP.t0 = cutIn - CLIP.from / CLIP.fps;
  // the card's box in the clip's 860 px frame (measured against the flat ground), centered on 430
  const CARD = { x0: 174, y0: 207, x1: 686, y1: 661 };

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const word = make("div", "display", "Any frame.", stage, { position: "absolute", whiteSpace: "nowrap" });
  place(word, Math.round(540 - word.offsetWidth / 2), 132);
  const win = clipWindow(stage, 0, 0, SHAPES[0].w, SHAPES[0].h, true);
  win.el.style.background = CLIP.ground;
  Object.assign(win.img.style, { inset: "auto", objectFit: "fill" });
  const play = frames(win.img, CLIP);

  const labels = SHAPES.map((s) => {
    const el = make("div", "mono", "", stage, { position: "absolute", fontSize: "32px", fontWeight: "500", lineHeight: "1.1", whiteSpace: "nowrap", color: C.ink });
    make("span", "", s.ratio, el);
    // one step darker than C.muted: the label sits in the window's soft shadow (#DEDEE0–#EDEDEF),
    // where #6E6E73 measures 4.2:1 and #616166 4.6–5.0:1
    make("span", "", ` · ${s.where}`, el, { color: "#616166" });
    place(el, Math.round(540 - el.offsetWidth / 2), Math.round(BOX.cy + s.h / 2 + 36));
    return el;
  });

  // the window's size (and its picture's) at t: one spring per change, summed (each from the last
  // target to the next), so a change that starts mid-spring carries on smoothly
  const size = (t) => {
    let { w, h, pic } = SHAPES[0];
    for (let i = 1; i < SHAPES.length; i++) {
      const e = spring01(t, SHAPES[i].at, SPRING);
      w += (SHAPES[i].w - SHAPES[i - 1].w) * e;
      h += (SHAPES[i].h - SHAPES[i - 1].h) * e;
      pic += (SHAPES[i].pic - SHAPES[i - 1].pic) * e;
    }
    return { w, h, pic };
  };

  // ---- checks ----
  check(`s08 "Any frame." is hidden on the cut, starts 2 frames before bar 13 beat 1 (f${Math.round(T_WORD * FPS)}) and is settled by f${Math.ceil((T_WORD - LEAD + 0.6) * FPS)}`, [onFrame(cutIn), onFrame(T_WORD - LEAD + 0.6)], (t) => {
    if (t < T_WORD - LEAD) return word.style.visibility === "hidden" || "visible before its lead";
    if (t >= onFrame(T_WORD - LEAD + 0.6) - 1e-6) return Number(word.style.opacity) === 1 || `opacity ${word.style.opacity}`;
    return true;
  });
  check(`s08 the cut's first frame is composed: the 16:9 window, its picture and "16:9 · YouTube", still`, [onFrame(cutIn), SHAPES[1].at - 1 / FPS], () =>
    (!!win.img.getAttribute("src") && win.el.offsetWidth === SHAPES[0].w && Number(labels[0].style.opacity) === 1 && /translate\(0px, 0px\)/.test(labels[0].style.transform)) || `label ${labels[0].style.opacity}`);
  SHAPES.slice(1).forEach((s, j) => {
    const i = j + 1, done = onFrame(s.at + SPRING.duration), next = SHAPES[i + 1]?.at ?? outStart;
    const travel = Math.max(Math.abs(s.w - SHAPES[j].w), Math.abs(s.h - SHAPES[j].h));
    check(`s08 the window springs to ${s.ratio} on its half-bar (from f${Math.round(s.at * FPS)}): within 1% of its ${travel} px move by f${Math.round(done * FPS)}, exact (±0.5 px) from f${Math.round(onFrame(s.at + 0.7) * FPS)} to the next change`, [done, next - 1 / FPS], (t) => {
      const z = size(t), tol = t < s.at + 0.7 ? Math.max(1.5, 0.012 * travel) : 0.5;
      return (Math.abs(z.w - s.w) <= tol && Math.abs(z.h - s.h) <= tol) || `${z.w.toFixed(1)} x ${z.h.toFixed(1)} at f${Math.round(t * FPS)}`;
    });
    check(`s08 the "${s.ratio} · ${s.where}" label swaps in on its spring's first frame, settled from f${Math.round(onFrame(s.at + LABEL.enter) * FPS)} to the next swap, alone`, [onFrame(s.at + LABEL.enter), next - 1 / FPS], () =>
      (Number(labels[i].style.opacity) === 1 && labels.every((l, n) => n === i || l.style.visibility === "hidden")) || `labels ${labels.map((l) => l.style.opacity).join(" ")}`);
  });
  check("s08 the springs are ζ 0.82, 0.5 s, on half-bars, one at a time", cutIn, () =>
    SHAPES.slice(2).every((s, j) => Math.abs(s.at - SHAPES[j + 1].at - barT(0, 2)) < 1e-6) && SHAPES[3].at + SPRING.duration < outStart || "timing");
  check("s08 the card stays whole inside the window at every frame size", [onFrame(cutIn), cutOut - 1 / FPS], (t) => {
    const z = size(t), k2 = z.pic / 860;
    const half = { x: Math.max(430 - CARD.x0, CARD.x1 - 430) * k2, y: Math.max(430 - CARD.y0, CARD.y1 - 430) * k2 };
    return (half.x + 16 <= z.w / 2 && half.y + 16 <= z.h / 2) || `card ${(2 * half.x).toFixed(0)} x ${(2 * half.y).toFixed(0)} in ${z.w.toFixed(0)} x ${z.h.toFixed(0)}`;
  });
  check("s08 the clip plays the card pose and holds it, never past it", [onFrame(cutIn), cutOut - 1 / FPS], (t) => {
    const n = Number(win.img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
    return (n >= CLIP.from && n <= CLIP.to) || `clip frame ${n}`;
  });
  check("s08 word, window and labels stay inside the stage through the drift, clear of each other", [onFrame(cutIn), outStart], () => {
    const items = [word, win.el, ...labels.filter((l) => l.style.visibility !== "hidden")];
    const out = items.map((el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 && r.y + r.h <= STAGE.y1 ? "" : `${el.textContent || "window"} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
    if (overlap(word, win.el) || labels.some((l) => overlap(l, win.el))) out.push("text over the window");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${drift(t, cutIn, cutOut, DRIFT).toFixed(5)})`;
    reveal(word, t, T_WORD - LEAD);
    const z = size(t);
    Object.assign(win.el.style, { left: `${(BOX.cx - z.w / 2).toFixed(2)}px`, top: `${(BOX.cy - z.h / 2).toFixed(2)}px`, width: `${z.w.toFixed(2)}px`, height: `${z.h.toFixed(2)}px` });
    Object.assign(win.img.style, { left: `${((z.w - z.pic) / 2).toFixed(2)}px`, top: `${((z.h - z.pic) / 2).toFixed(2)}px`, width: `${z.pic.toFixed(2)}px`, height: `${z.pic.toFixed(2)}px` });
    // labels: the first is in the picture from the cut; each swaps in on its spring's first frame and
    // goes on the next one's
    labels.forEach((el, i) => {
      const on = i === 0 ? -1e9 : SHAPES[i].at, off = SHAPES[i + 1]?.at ?? Infinity;
      if (t >= off) { el.style.opacity = "0"; el.style.visibility = "hidden"; return; }
      show(el, t, on, Infinity, { dur: LABEL.enter, dy: 6 });
    });
    return play(Math.min(t - CLIP.t0, (CLIP.to + 0.5) / CLIP.fps));
  };
}
