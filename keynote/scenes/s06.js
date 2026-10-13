// s06 Loops · bars 12–14 (26.18–30.95) · black · cut in, dissolve out (30.15–30.95). v2.
// The checkout loop on a square screen floating in black with its reflection, gently tilted (−9°
// easing to −3° across the shot); the frame pushes in 1.00 → 1.05. One full morph, then hold: the
// green check holds at the cut, grows into the receipt from the eighth note after the downbeat (clip
// f242 at bar 12 + ½ beat, the music's eighth-note pulse), and is settled with its $48.00 and Done by
// clip f284 (27.86 s). Bar 12 beat 1: one caption line (.caption, 64 px), "Seamless loops," in white,
// "on the beat" in gray. The finished picture then holds 2.3 s, to the dissolve. As the dissolve
// starts the caption leaves (appear()'s 0.54 s exit), so it is gone as s07's caption arrives in the
// same place on bar 14, and the two lines never lie over each other; the square holds still through
// the dissolve. The square (700 px) sits exactly where s07's square does, so the
// dissolve lays one square over the other.
export default function build(root, k) {
  const { make, place, appear, barT, frames, easeInOut, p01, lerp, check, box, overlap, STAGE } = k;
  const { cutIn, outStart, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, PUSH = 0.05;
  const SETTLE = 0.71;   // appear() is 99% of the way after 0.71 s of its 0.9 s
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;

  // ---- the plan ----
  const T_HEAD = barT(12, 1);       // 26.727
  const T_MORPH = barT(12, 0.5);    // 26.455
  const HANDOFF = barT(14);         // 30.545, the middle of the dissolve
  const TURN = { from: -9, to: -3 };
  // Clip frames (30 fps): the check holds f185–241, grows into the receipt f242–276, its contents
  // settle by f284; the receipt then holds to f299 (measured frame to frame).
  const CLIP = { dir: "clips/loop", fps: 30, count: 300, hold: 185, morph: 242, settled: 284, scale: 1.2 };
  CLIP.t0 = T_MORPH - CLIP.morph / CLIP.fps;
  const across = (t) => easeInOut(p01(t, cutIn, cutOut - cutIn));

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const SQ = { s: 700, y: 350 };   // s07's square
  const head = make("div", "caption", 'Seamless loops, <span class="soft">on the beat</span>', stage, { position: "absolute" });
  place(head, Math.round(540 - head.offsetWidth / 2), SQ.y - 56 - head.offsetHeight);
  const stage3d = place(make("div", "stage3d", "", stage), 540 - SQ.s / 2, SQ.y, SQ.s, SQ.s);
  const screen = place(make("div", "screen", "", stage3d), 0, 0, SQ.s, SQ.s);
  screen.id = "s06-screen";
  // the clip scaled 1.2x about its centre: the screen shows clip px 72–788, so the receipt fills 63% of
  // it (441 px) and the pointer (clip x 690–719, y 716–763) stays whole
  const S = SQ.s * CLIP.scale, off = (SQ.s - S) / 2;
  const img = make("img", "", "", screen, { inset: "auto", objectFit: "fill", left: `${off}px`, top: `${off}px`, width: `${S}px`, height: `${S}px` });
  const play = frames(img, CLIP);

  const angle = (t) => lerp(TURN.from, TURN.to, across(t));
  const settledAt = (t0) => onFrame(t0 - LEAD + SETTLE);
  const shown = () => Number(img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
  const finished = Math.max(settledAt(T_HEAD), CLIP.t0 + CLIP.settled / CLIP.fps);
  const inside = (el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 - 0.5 && r.y + r.h <= STAGE.y1 + 0.5 ? "" : `${el.id || el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; };

  // ---- checks ----
  [[head, T_HEAD, "bar 12 beat 1"]].forEach(([el, t0, beat]) => {
    check(`s06 the caption "${el.textContent}" appears from 2 frames before ${beat} (f${Math.round(t0 * FPS)}), hidden before, settled by f${Math.round(settledAt(t0) * FPS)}`, [onFrame(t0 - LEAD - 1 / FPS), settledAt(t0)], (t) => {
      if (t < t0 - LEAD) return el.style.visibility === "hidden" || "visible early";
      if (t >= settledAt(t0) - 1e-6) return (Number(el.style.opacity) >= 0.99 && Math.abs(new DOMMatrix(el.style.transform).f) < 0.25) || `opacity ${el.style.opacity}, ${el.style.transform}`;
      return true;
    });
  });
  check(`s06 the morph starts on the eighth note after bar 12 (f${Math.round(T_MORPH * FPS)}, clip f${CLIP.morph}): the check holds still before it`, [onFrame(cutIn), onFrame(T_MORPH) + 1 / FPS], (t) => {
    const n = shown(), want = Math.floor((t - CLIP.t0) * CLIP.fps + 1e-6);
    return (n === want && (t < T_MORPH - 1e-6 ? n >= CLIP.hold && n < CLIP.morph : n >= CLIP.morph)) || `clip frame ${n} at f${Math.round(t * FPS)}`;
  });
  check(`s06 the finished picture (receipt and caption) is settled by f${Math.round(finished * FPS)} and holds 2 s or more, to the dissolve's start (f${Math.round(outStart * FPS)})`, [onFrame(finished), outStart], () => {
    const n = shown();
    return (outStart - finished >= 2 && n >= CLIP.settled && Number(head.style.opacity) >= 0.99) || `hold ${(outStart - finished).toFixed(2)} s, clip frame ${n}`;
  });
  check(`s06 the caption leaves with the dissolve, gone (under 2%) by bar 14 + 0.15 s, when s07's caption is half in, and the receipt holds still to the end`, [onFrame(outStart), cutOut - 1 / FPS], (t) => {
    const n = shown();
    if (n < CLIP.settled) return `clip frame ${n}`;
    return t < HANDOFF + 0.15 || Number(head.style.opacity) < 0.02 || `caption opacity ${head.style.opacity} at f${Math.round(t * FPS)}`;
  });
  check("s06 the clip never runs past its last frame, and the crop keeps the receipt (clip 203–655 x 215–651) and the pointer (to 719, 763) whole", cutIn, () => {
    const v0 = 430 - 430 / CLIP.scale, v1 = 430 + 430 / CLIP.scale;
    return ((cutIn - CLIP.t0) * CLIP.fps >= 0 && v0 + 20 <= 203 && v1 - 20 >= 763) || `visible ${v0.toFixed(0)}–${v1.toFixed(0)}`;
  });
  check("s06 composed on the cut: the green check on the screen at −9°, push 1.00, no text yet", onFrame(cutIn), (t) =>
    (!!img.getAttribute("src") && Math.abs(angle(t) - TURN.from) < 0.01 && head.style.visibility === "hidden") || `angle ${angle(t).toFixed(2)}`);
  check("s06 the screen turns −9° → −3° and the frame pushes 1.00 → 1.05, ease-in-out, at rest at the end of the dissolve", cutOut - 1 / FPS, (t) =>
    (Math.abs(angle(t) - TURN.to) < 0.02 && Math.abs(across(t) - 1) < 1e-3) || `angle ${angle(t).toFixed(3)}`);
  check("s06 the caption is one .caption line (64 px), white then gray, within 924 px", cutIn, () => {
    const fs = parseFloat(getComputedStyle(head).fontSize), soft = head.querySelector(".soft");
    return (fs === 64 && head.offsetWidth <= 924 && head.offsetHeight < 80 && soft && getComputedStyle(soft).color === "rgb(134, 134, 139)") || `size ${fs}, width ${head.offsetWidth}`;
  });
  check("s06 caption and screen stay inside the stage through the push, clear of each other", [onFrame(cutIn), outStart], () => {
    const out = [head, screen].map(inside).filter(Boolean);
    if (overlap(head, screen)) out.push("overlap");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${(1 + PUSH * across(t)).toFixed(5)})`;
    screen.style.transform = `rotateY(${angle(t).toFixed(3)}deg)`;
    appear(head, t, T_HEAD - LEAD, outStart);
    return play(t - CLIP.t0);   // frames() holds the last frame (f299, the settled receipt) after it
  };
}
