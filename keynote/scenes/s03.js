// s03 Walkthroughs · bars 6–8 (13.09–17.45) · black · cut in, cut out. v2: the Apple-announcement look.
// The walkthrough clip plays on a 16:9 screen floating in black (.stage3d + .screen), with its reflection
// below. The screen turns from −16° to −5° across the shot (ease-in-out), and the whole frame pushes in
// 1.00 → 1.05 (ease-in-out), so both start and end at rest on the cuts. Bar 6 beat 1: one Apple-style
// caption (.caption, 64 px), "App walkthroughs," in white over "clicked step by step" in gray: two
// lines, because the one line measures 1148 px and the push leaves 924. The screen is as large as the
// −16° turn allows inside the frame (880 px: its near edge reaches x 1016 at push 1.05).
// The clip: the "Invite to Acme" modal is open at the cut
// (clip f57), the clip's own camera moves in, the pointer clicks the email field on bar 7 (clip f122),
// and "jordan@example.com" is typed out by 16.67 s (clip f164).
export default function build(root, k) {
  const { make, place, appear, barT, frames, easeInOut, p01, lerp, check, box, overlap, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, PUSH = 0.05;
  const SETTLE = 0.71;   // appear() is 99% of the way (0.24 px from its mark) after 0.71 s of its 0.9 s
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t

  // ---- the plan ----
  const T_HEAD = barT(6, 1);   // 13.636
  const TURN = { from: -16, to: -5 };
  const CLIP = { dir: "clips/walkthrough", fps: 30, count: 210, click: 122, typed: 164 };
  CLIP.t0 = barT(7) - CLIP.click / CLIP.fps;   // the click on the email field lands on bar 7 (15.273)
  const across = (t) => easeInOut(p01(t, cutIn, cutOut - cutIn));   // 0 → 1 across the shot, at rest at both ends

  // ---- layout (at push 1.00; everything stays inside the stage at 1.05) ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  // the screen sits at the same place in s03 and s04; the caption's last line ends 60 px above it
  const SCR = { w: 880, h: 495, y: 520 };
  const head = make("div", "caption", 'App walkthroughs,<br><span class="soft">clicked step by step</span>', stage, { position: "absolute" });
  place(head, Math.round(540 - head.offsetWidth / 2), SCR.y - 60 - head.offsetHeight);
  const stage3d = place(make("div", "stage3d", "", stage), 540 - SCR.w / 2, SCR.y, SCR.w, SCR.h);
  const screen = place(make("div", "screen", "", stage3d), 0, 0, SCR.w, SCR.h);
  screen.id = "s03-screen";
  const img = make("img", "", "", screen);
  const play = frames(img, CLIP);

  const angle = (t) => lerp(TURN.from, TURN.to, across(t));
  const settledAt = (t0) => onFrame(t0 - LEAD + SETTLE);
  const inside = (el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 - 0.5 && r.y + r.h <= STAGE.y1 + 0.5 ? "" : `${el.id || el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; };

  // ---- checks ----
  [[head, T_HEAD, "bar 6 beat 1"]].forEach(([el, t0, beat]) => {
    check(`s03 the caption "${el.textContent}" appears from 2 frames before ${beat} (f${Math.round(t0 * FPS)}), hidden before, settled by f${Math.round(settledAt(t0) * FPS)}`, [onFrame(t0 - LEAD - 1 / FPS), settledAt(t0)], (t) => {
      if (t < t0 - LEAD) return el.style.visibility === "hidden" || "visible early";
      if (t >= settledAt(t0) - 1e-6) return (Number(el.style.opacity) >= 0.99 && Math.abs(new DOMMatrix(el.style.transform).f) < 0.25) || `opacity ${el.style.opacity}, ${el.style.transform}`;
      return true;
    });
  });
  check(`s03 the finished picture (caption and screen) is settled 2 s or more before the cut (from f${Math.round(settledAt(T_HEAD) * FPS)})`, cutIn, () =>
    cutOut - settledAt(T_HEAD) >= 2 || `${(cutOut - settledAt(T_HEAD)).toFixed(2)} s`);
  check("s03 the caption is .caption type (64 px), two lines, white then gray, each line within 924 px", cutIn, () => {
    const fs = parseFloat(getComputedStyle(head).fontSize), soft = head.querySelector(".soft");
    return (fs === 64 && head.offsetWidth <= 924 && soft && getComputedStyle(soft).color === "rgb(134, 134, 139)" && head.offsetHeight > 140) || `size ${fs}, width ${head.offsetWidth}, height ${head.offsetHeight}`;
  });
  check(`s03 the pointer clicks the email field on bar 7 (f${Math.round(barT(7) * FPS)}): clip frame ${CLIP.click}`, onFrame(barT(7)), () => {
    const n = Number(img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
    return Math.abs(n - CLIP.click) <= 1 || `clip frame ${n}`;
  });
  check("s03 the clip stays inside its 210 frames, and the email is typed out 0.7 s or more before the cut", cutIn, () => {
    const a = (cutIn - CLIP.t0) * CLIP.fps, b = (cutOut - CLIP.t0) * CLIP.fps, typed = CLIP.t0 + CLIP.typed / CLIP.fps;
    return (a >= 0 && b <= CLIP.count - 1 && cutOut - typed >= 0.7) || `frames ${a.toFixed(0)}–${b.toFixed(0)}, typed ${typed.toFixed(2)}`;
  });
  check("s03 composed on the cut: the screen shows a clip frame at −16°, the frame at push 1.00, no text yet", onFrame(cutIn), (t) =>
    (!!img.getAttribute("src") && Math.abs(angle(t) - TURN.from) < 0.01 && Math.abs(across(t)) < 1e-3 && head.style.visibility === "hidden") || `angle ${angle(t).toFixed(2)}`);
  check("s03 the screen turns −16° → −5° and the frame pushes 1.00 → 1.05, ease-in-out, both at rest on the cut out", cutOut - 1 / FPS, (t) =>
    (Math.abs(angle(t) - TURN.to) < 0.02 && Math.abs(across(t) - 1) < 1e-3) || `angle ${angle(t).toFixed(3)}, push ${across(t).toFixed(4)}`);
  check("s03 caption and screen stay inside the stage through the push, clear of each other", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const out = [head, screen].map(inside).filter(Boolean);
    if (overlap(head, screen)) out.push("overlap");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${(1 + PUSH * across(t)).toFixed(5)})`;
    screen.style.transform = `rotateY(${angle(t).toFixed(3)}deg)`;
    appear(head, t, T_HEAD - LEAD);
    return play(t - CLIP.t0);
  };
}
