// s07 Any style · bars 14–17 (30.15–37.09) · black · dissolve in (30.15–30.95), cut out on bar 17. v2.
// One 700 px square screen floating in black with its reflection, facing us, plays "How a seed grows":
// three layers (riso, pixel, cut paper) on one shared timeline, frame for frame (story.js times; 24
// fps, 252 frames each). The frame pushes in 1.00 → 1.05 across the shot. One caption line (.caption,
// 64 px), "Any style." in white, "Riso, pixel or paper." in gray, lands with drop 2's boom on bar 14
// via appear(). Riso from the start. Bar 15: an edge moves in from the right to one third (0.6 s,
// ease-in-out) and the right two thirds become pixel art; bar 16: a second edge to two thirds (0.45 s,
// half the travel) and the right third becomes cut paper. No tags: the caption names the three styles
// left to right, in the order of the thirds. The square sits exactly where s06's square does, so the
// dissolve in lays one square over the other.
// The story: rain ends, the sprout pokes out and the sun rises in riso; the stem grows and the flower
// blooms in pixel; the bee flies in over the paper third and lands (35.80 s) in the three-way hold.
// (Agreed with the coordinator, 2026-10-13: each wipe starts on its bar; riso holds 1.47 s after the
// caption settles, pixel 1.58 s, and the three-way picture is on screen the full bar 16, settled 1.76 s.)
export default function build(root, k) {
  const { make, place, appear, barT, frames, easeInOut, p01, lerp, check, box, overlap, C, STAGE } = k;
  const { cutIn, inEnd, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, PUSH = 0.05;
  const SETTLE = 0.71;
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;

  // ---- the plan ----
  const T_HEAD = barT(14);   // 30.545, the boom
  const SQ = { s: 700, y: 350 };   // s06's square
  SQ.x = 540 - SQ.s / 2;
  const WIPE1 = { at: barT(15) - LEAD, dur: 0.6, from: SQ.s, to: SQ.s / 3 };          // 32.694 → 33.294
  const WIPE2 = { at: barT(16) - LEAD, dur: 0.45, from: SQ.s, to: (2 * SQ.s) / 3 };   // 34.876 → 35.326
  // Story time 3.55 at the dissolve's start, 10.50 at the cut out (story.js: rain off 4.4, sprout 4.1,
  // sun up 5.1, leaves 6.2–6.45, bloom 7.55, bee 8.3 → lands 9.2).
  const STORY = { fps: 24, count: 252, atCutIn: 3.55, bloom: 7.55, beeLand: 9.2 };
  STORY.t0 = cutIn - STORY.atCutIn;
  const settled = WIPE2.at + WIPE2.dur;
  const across = (t) => easeInOut(p01(t, cutIn, cutOut - cutIn));

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const head = make("div", "caption", 'Any style. <span class="soft">Riso, pixel or paper.</span>', stage, { position: "absolute" });
  place(head, Math.round(540 - head.offsetWidth / 2), SQ.y - 56 - head.offsetHeight);
  const stage3d = place(make("div", "stage3d", "", stage), SQ.x, SQ.y, SQ.s, SQ.s);
  const screen = place(make("div", "screen", "", stage3d), 0, 0, SQ.s, SQ.s);
  screen.id = "s07-screen";
  const layer = (name) => {
    const el = make("div", "", "", screen, { position: "absolute", inset: "0px" });
    el.dataset.layer = name;
    const img = make("img", "", "", el);
    return { el, img, play: frames(img, { dir: `clips/${name}`, fps: STORY.fps, count: STORY.count }) };
  };
  const riso = layer("riso"), pixel = layer("pixel"), paper = layer("cut-paper");
  const edge = (id) => {
    const el = make("div", "", "", screen, { position: "absolute", top: "0px", width: "3px", height: `${SQ.s}px`, background: C.black, zIndex: "2" });
    el.id = id;
    return el;
  };
  const edge1 = edge("s07-edge-pixel"), edge2 = edge("s07-edge-paper");

  const edgeX = (w, t) => lerp(w.from, w.to, easeInOut(p01(t, w.at, w.dur)));
  const frameAt = (img) => img.getAttribute("src")?.split("/").pop();
  const inside = (el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 - 0.5 && r.y + r.h <= STAGE.y1 + 0.5 ? "" : `${el.id || el.textContent} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; };
  const headSettled = onFrame(T_HEAD - LEAD + SETTLE);

  // ---- checks ----
  check(`s07 composed from the dissolve's first frame: the riso square, whole, and no caption yet`, onFrame(cutIn), () =>
    (!!riso.img.getAttribute("src") && pixel.el.style.visibility === "hidden" && paper.el.style.visibility === "hidden" && head.style.visibility === "hidden") || "not composed");
  check("s07 the caption is one .caption line (64 px), white then gray, within 924 px", cutIn, () => {
    const fs = parseFloat(getComputedStyle(head).fontSize), soft = head.querySelector(".soft");
    return (fs === 64 && head.offsetWidth <= 924 && head.offsetHeight < 80 && soft && getComputedStyle(soft).color === "rgb(134, 134, 139)") || `size ${fs}, width ${head.offsetWidth}`;
  });
  check(`s07 the caption appears from 2 frames before bar 14's boom (f${Math.round(T_HEAD * FPS)}), hidden before, settled by f${Math.round(headSettled * FPS)}`, [onFrame(cutIn), headSettled], (t) => {
    if (t < T_HEAD - LEAD) return head.style.visibility === "hidden" || "visible early";
    if (t >= headSettled - 1e-6) return (Number(head.style.opacity) >= 0.99 && Math.abs(new DOMMatrix(head.style.transform).f) < 0.25) || `opacity ${head.style.opacity}`;
    return true;
  });
  [[WIPE1, edge1, "pixel", SQ.s / 3, 15], [WIPE2, edge2, "paper", (2 * SQ.s) / 3, 16]].forEach(([w, el, name, x, bar]) => {
    check(`s07 the ${name} edge starts on bar ${bar} (f${Math.round(w.at * FPS)}) and lands at x ${x.toFixed(1)} of the square by f${Math.ceil((w.at + w.dur) * FPS)}, at rest after`, [onFrame(w.at - 1 / FPS), cutOut - 1 / FPS], (t) => {
      const e = parseFloat(el.style.left) + 1.5;
      if (t < w.at) return el.style.visibility === "hidden" || "visible before its bar";
      if (t >= w.at + w.dur - 1e-6) return Math.abs(e - x) < 0.01 || `edge at ${e.toFixed(2)}`;
      return true;
    });
  });
  check("s07 the three layers show the same story frame on every frame", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const n = [riso, pixel, paper].map((l) => frameAt(l.img));
    return (n[0] && n[0] === n[1] && n[1] === n[2]) || n.join(" ");
  });
  check("s07 the story stays inside its 252 frames; the flower blooms in pixel before the paper edge and the bee lands in the three-way hold", cutIn, () => {
    const a = (cutIn - STORY.t0) * STORY.fps, b = (cutOut - STORY.t0) * STORY.fps, bloom = STORY.t0 + STORY.bloom, bee = STORY.t0 + STORY.beeLand;
    return (a >= 0 && b < STORY.count && bloom > WIPE1.at + WIPE1.dur && bloom < WIPE2.at && bee > settled && bee < cutOut - 1) || `frames ${a.toFixed(1)}–${b.toFixed(1)}, bloom ${bloom.toFixed(2)}, bee ${bee.toFixed(2)}`;
  });
  check(`s07 each state holds 1.4 s or more settled: riso after the caption, pixel, and the three-way picture from f${Math.round(settled * FPS)} to the cut`, cutIn, () => {
    const holds = [WIPE1.at - headSettled, WIPE2.at - (WIPE1.at + WIPE1.dur), cutOut - settled];
    return holds.every((h) => h >= 1.4) && cutOut - barT(16) >= 2.18 - 1e-3 || `holds ${holds.map((h) => h.toFixed(2)).join(", ")} s`;
  });
  check("s07 caption and square stay inside the stage through the push, clear of each other", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const out = [head, screen].map(inside).filter(Boolean);
    if (overlap(head, screen)) out.push("text over the square");
    return out.join("; ") || true;
  });
  check("s07 the frame pushes 1.00 → 1.05 ease-in-out, at rest on the cut out", cutOut - 1 / FPS, (t) => Math.abs(across(t) - 1) < 1e-3 || `push ${across(t)}`);
  void inEnd;

  return (t) => {
    stage.style.transform = `scale(${(1 + PUSH * across(t)).toFixed(5)})`;
    appear(head, t, T_HEAD - LEAD);
    const clipT = t - STORY.t0;
    const e1 = edgeX(WIPE1, t), e2 = edgeX(WIPE2, t);
    const on1 = t >= WIPE1.at, on2 = t >= WIPE2.at;
    pixel.el.style.clipPath = `inset(0px 0px 0px ${e1.toFixed(2)}px)`;
    paper.el.style.clipPath = `inset(0px 0px 0px ${e2.toFixed(2)}px)`;
    pixel.el.style.visibility = on1 ? "visible" : "hidden";
    paper.el.style.visibility = on2 ? "visible" : "hidden";
    edge1.style.left = `${(e1 - 1.5).toFixed(2)}px`;
    edge2.style.left = `${(e2 - 1.5).toFixed(2)}px`;
    edge1.style.visibility = on1 ? "visible" : "hidden";
    edge2.style.visibility = on2 ? "visible" : "hidden";
    // the hidden layers follow the clip too, so all three are always on the same frame
    return Promise.all([riso.play(clipT), pixel.play(clipT), paper.play(clipT)]);
  };
}
