// s08 Any frame · bars 17–20 (37.09–44.04) · black · cut in on bar 17, dissolve out (43.24–44.04). v2.
// One screen floating in black springs (ζ 0.82, 0.6 s) through three frame sizes, one per bar:
// 16:9 · YouTube from the cut, 4:5 · LinkedIn on bar 18, 9:16 · Reels on bar 19 (agreed with the
// coordinator, 2026-10-13: four shapes need 8.0 s and the shot has 6.55 s, so 1:1 · Feeds is dropped).
// Each shape fits one 924 × 720 box around a fixed centre. The picture reframes inside: the checkout
// card from the loop (clip f34–104, a still pose with the pointer resting on Pay, then held) is laid
// out again for each frame size, as large as it allows and always whole; the screen's ground is the
// clip's own (#eae9e4), so the frame extends the picture instead of letterboxing it. A mono label
// under the screen names each shape; it swaps on the spring's first frame and the new one comes in
// 150 ms later. One caption (.caption, 64 px) enters with the cut on bar 17: "Any frame," in white over
// "from YouTube to Reels" in gray, two lines (one line measures 980 px; the push leaves 924). The frame
// pushes in 1.00 → 1.05 across the shot. No floor reflection here: the labels sit under the screen.
export default function build(root, k) {
  const { make, place, appear, show, barT, frames, spring01, easeInOut, p01, check, box, overlap, C, STAGE } = k;
  const { cutIn, outStart, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, PUSH = 0.05;
  const SETTLE = 0.71;
  const SPRING = { duration: 0.6, damping: 0.82 };
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;

  // ---- the plan ----
  const T_HEAD = barT(17);   // 37.091, the cut
  const BOX = { w: 924, h: 720, cx: 540, cy: 713 };
  const fit = (rw, rh) => { const s = Math.min(BOX.w / rw, BOX.h / rh); return { w: Math.round(rw * s), h: Math.round(rh * s) }; };
  const SHAPES = [
    { at: -Infinity, ratio: "16:9", where: "YouTube", ...fit(16, 9), pic: 800 },         // 924 × 520
    { at: barT(18) - LEAD, ratio: "4:5", where: "LinkedIn", ...fit(4, 5), pic: 820 },    // 576 × 720
    { at: barT(19) - LEAD, ratio: "9:16", where: "Reels", ...fit(9, 16), pic: 590 },     // 405 × 720
  ];
  const LABEL = { lag: 0.15, dur: 0.5, dy: 12, blur: 4 };
  const CLIP = { dir: "clips/loop", fps: 30, count: 300, from: 34, to: 104, ground: "rgb(234, 233, 228)" };
  CLIP.t0 = cutIn - CLIP.from / CLIP.fps;
  const CARD = { x0: 174, y0: 207, x1: 686, y1: 661 };   // the card in the clip's 860 px frame (measured)
  const across = (t) => easeInOut(p01(t, cutIn, cutOut - cutIn));

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const head = make("div", "caption", 'Any frame,<br><span class="soft">from YouTube to Reels</span>', stage, { position: "absolute" });
  place(head, Math.round(540 - head.offsetWidth / 2), BOX.cy - BOX.h / 2 - 56 - head.offsetHeight);
  const screen = make("div", "screen", "", stage, { background: CLIP.ground });
  screen.style.setProperty("-webkit-box-reflect", "initial");   // no reflection: the labels sit where it would
  screen.id = "s08-screen";
  const img = make("img", "", "", screen, { inset: "auto", objectFit: "fill" });
  const play = frames(img, CLIP);
  const labels = SHAPES.map((s) => {
    const el = make("div", "mono", "", stage, { position: "absolute", fontSize: "32px", fontWeight: "500", lineHeight: "1.15", whiteSpace: "nowrap", color: C.white });
    make("span", "", s.ratio, el);
    make("span", "", ` · ${s.where}`, el, { color: C.gray });
    place(el, Math.round(540 - el.offsetWidth / 2), Math.round(BOX.cy + s.h / 2 + 28));
    return el;
  });

  // the screen's size (and its picture's) at t: one spring per change, summed (each from the last
  // target to the next), so a change that starts mid-spring would carry on smoothly
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
  const headSettled = onFrame(T_HEAD - LEAD + SETTLE);
  const inside = (el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 - 0.5 && r.y + r.h <= STAGE.y1 + 0.5 ? "" : `${el.id || el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; };

  // ---- checks ----
  check(`s08 the caption appears with the cut (from 2 frames before bar 17, f${Math.round(T_HEAD * FPS)}) and is settled by f${Math.round(headSettled * FPS)}`, [onFrame(cutIn), headSettled], (t) => {
    if (t >= headSettled - 1e-6) return (Number(head.style.opacity) >= 0.99 && Math.abs(new DOMMatrix(head.style.transform).f) < 0.25) || `opacity ${head.style.opacity}`;
    if (Math.abs(t - onFrame(cutIn)) < 1e-6) return Number(head.style.opacity) < 0.2 || `opacity ${head.style.opacity} on the cut`;
    return true;
  });
  check("s08 the caption is .caption type (64 px), two lines, white then gray, each within 924 px", cutIn, () => {
    const fs = parseFloat(getComputedStyle(head).fontSize), soft = head.querySelector(".soft");
    return (fs === 64 && head.offsetWidth <= 924 && head.offsetHeight > 140 && soft && getComputedStyle(soft).color === "rgb(134, 134, 139)") || `size ${fs}, width ${head.offsetWidth}`;
  });
  check(`s08 composed on the cut: the 16:9 screen with its picture and "16:9 · YouTube", still`, [onFrame(cutIn), SHAPES[1].at - 1 / FPS], () =>
    (!!img.getAttribute("src") && Math.abs(screen.offsetWidth - SHAPES[0].w) < 0.5 && Number(labels[0].style.opacity) === 1 && labels.slice(1).every((l) => l.style.visibility === "hidden")) || `label ${labels[0].style.opacity}`);
  SHAPES.slice(1).forEach((s, j) => {
    const i = j + 1, prev = SHAPES[j], next = SHAPES[i + 1]?.at ?? cutOut;
    const travel = Math.max(Math.abs(s.w - prev.w), Math.abs(s.h - prev.h));
    check(`s08 the screen springs to ${s.ratio} from bar ${17 + i} (f${Math.round(s.at * FPS)}): within 1.2% of its ${travel} px move by f${Math.round(onFrame(s.at + SPRING.duration) * FPS)}, exact (±0.5 px) from f${Math.round(onFrame(s.at + 0.85) * FPS)} to the next change`, [onFrame(s.at + SPRING.duration), next - 1 / FPS], (t) => {
      const z = size(t), tol = t < s.at + 0.85 ? Math.max(1.5, 0.012 * travel) : 0.5;
      return (Math.abs(z.w - s.w) <= tol && Math.abs(z.h - s.h) <= tol) || `${z.w.toFixed(1)} × ${z.h.toFixed(1)} at f${Math.round(t * FPS)}`;
    });
    check(`s08 "${s.ratio} · ${s.where}" swaps in on the spring (the old label gone on its first frame), settled by f${Math.round(onFrame(s.at + LABEL.lag + SETTLE * LABEL.dur / 0.9) * FPS)}, alone to the next swap`, [onFrame(s.at), next - 1 / FPS], (t) => {
      if (labels[j].style.visibility !== "hidden") return `"${prev.ratio}" still showing at f${Math.round(t * FPS)}`;
      if (t < s.at + LABEL.lag + 0.4) return true;
      return (Number(labels[i].style.opacity) >= 0.99 && labels.every((l, n) => n === i || l.style.visibility === "hidden")) || `opacity ${labels[i].style.opacity}`;
    });
  });
  check("s08 each shape holds 1.4 s or more settled with its label; the last 2 s or more to the end of the dissolve", cutIn, () => {
    const done = (s) => s.at + SPRING.duration;
    const holds = [SHAPES[1].at - headSettled, SHAPES[2].at - done(SHAPES[1]), cutOut - done(SHAPES[2])];
    return (holds[0] >= 1.4 && holds[1] >= 1.4 && holds[2] >= 2) || `holds ${holds.map((h) => h.toFixed(2)).join(", ")} s`;
  });
  check("s08 the card stays whole inside the screen, 16 px clear, at every frame size and through each spring", [onFrame(cutIn), cutOut - 1 / FPS], (t) => {
    const z = size(t), s = z.pic / 860;
    const half = { x: Math.max(430 - CARD.x0, CARD.x1 - 430) * s, y: Math.max(430 - CARD.y0, CARD.y1 - 430) * s };
    return (half.x + 16 <= z.w / 2 && half.y + 16 <= z.h / 2) || `card ${(2 * half.x).toFixed(0)} × ${(2 * half.y).toFixed(0)} in ${z.w.toFixed(0)} × ${z.h.toFixed(0)}`;
  });
  check("s08 the screen has no floor reflection (its labels sit under it)", cutIn, () =>
    /^(none)?$/.test(getComputedStyle(screen).getPropertyValue("-webkit-box-reflect")) || getComputedStyle(screen).getPropertyValue("-webkit-box-reflect"));
  check("s08 the clip plays the card pose and holds it, never past it", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const n = Number(img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
    return (n >= CLIP.from && n <= CLIP.to) || `clip frame ${n}`;
  });
  check("s08 caption, screen and labels stay inside the stage through the push, clear of each other", [onFrame(cutIn), outStart], () => {
    const items = [head, screen, ...labels.filter((l) => l.style.visibility !== "hidden")];
    const out = items.map(inside).filter(Boolean);
    if (overlap(head, screen) || labels.some((l) => overlap(l, screen) || overlap(l, head))) out.push("text over the screen");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${(1 + PUSH * across(t)).toFixed(5)})`;
    appear(head, t, T_HEAD - LEAD);
    const z = size(t);
    Object.assign(screen.style, { left: `${(BOX.cx - z.w / 2).toFixed(2)}px`, top: `${(BOX.cy - z.h / 2).toFixed(2)}px`, width: `${z.w.toFixed(2)}px`, height: `${z.h.toFixed(2)}px` });
    Object.assign(img.style, { left: `${((z.w - z.pic) / 2).toFixed(2)}px`, top: `${((z.h - z.pic) / 2).toFixed(2)}px`, width: `${z.pic.toFixed(2)}px`, height: `${z.pic.toFixed(2)}px` });
    // labels: the first is in the picture from the cut; each next one swaps in on its spring (the old
    // one gone on the spring's first frame, before the screen can reach it), the new one 150 ms later
    labels.forEach((el, i) => {
      const off = SHAPES[i + 1]?.at ?? Infinity;
      if (t >= off) { el.style.opacity = "0"; el.style.visibility = "hidden"; return; }
      if (i === 0) { el.style.opacity = "1"; el.style.transform = "none"; el.style.visibility = "visible"; return; }
      show(el, t, SHAPES[i].at + LABEL.lag, Infinity, { dur: LABEL.dur, dy: LABEL.dy, blur: LABEL.blur });
    });
    return play(Math.min(t - CLIP.t0, (CLIP.to + 0.5) / CLIP.fps));
  };
}
