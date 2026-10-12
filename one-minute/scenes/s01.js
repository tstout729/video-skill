// s01 Hook · canvas, the hero studio · 0–5.00 s, cut into s02.
// Frame 0 is the LinkedIn thumbnail: "Made in code." set large (160 px) over the studio, and the
// ceramic mark resting on its floor in the lower third. The studio fills the whole frame, so the
// scene has no seam between the 3D render and the page.
// On "frame": a mono counter under the title, `seek(t) → f 0065`, shows the real frame number,
// Math.round(t * 60), on every frame. On "Claude": the mark hops (hero3d hop, the scene's one hero
// move), a tap one frame after touchdown, settled by hop + HOP.settle and held to the cut.
import * as THREE from "/_vendor/three/build/three.module.js";
import { createHero, HOP } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, show, cueIn, check, sfx, box, overlap, chrome, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, W = 1080, H = 1350;
  root.style.background = C.canvas;

  const tFrame = cueIn(k.id, "frame");     // the counter enters
  const tHop = cueIn(k.id, "Claude");      // the hop starts; touchdown at hop + f36
  const touchdown = tHop + HOP.contact / FPS;
  const settled = tHop + HOP.settle / FPS;

  // ---- the studio fills the frame; the mark rests left of centre and hops to the right ----
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const MARK_PX = 310;                     // the mark's height in px at rest
  const MARK_Y = 918;                      // its resting centre
  const START_X = 468;                     // its resting centre x before the hop
  const hero = createHero(canvas, {
    variant: "directed", width: W, height: H, seed: 7,
    framing: { fill: MARK_PX / H, aim: [0, 0.5], center: [0.5, MARK_Y / H], x0: (START_X - W / 2) / MARK_PX },
  });
  const state = { hop: tHop };

  // An invisible box that follows the mark on screen: the speed graph samples it, checks use it.
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.id = "s01-mark";
  const v = new THREE.Vector3();
  const toPx = (x, y) => { v.set(x, y, 0).project(hero.camera); return [(v.x * 0.5 + 0.5) * W, (0.5 - v.y * 0.5) * H]; };
  const markBox = (t) => {
    const p = hero.pose(t, state);
    const [bx, by] = toPx(p.x, p.y), [, ty] = toPx(p.x, p.y + p.sy);
    const h = by - ty, w = (h / p.sy) * p.sxz * 1.04;     // 1.04: the slab's depth seen at a 20° turn
    return { x: bx - w / 2, y: ty, w, h };
  };

  // The studio wall is darker than the canvas at the top: the chrome takes the deeper muted tone
  // there (#4a4945, 5.7:1 on the wall's #CFCFCF; the kit's #5c5953 measures 4.5:1).
  chrome(root, 1, "MADE IN CODE").style.color = "#4a4945";

  // ---- type: the title is on screen from frame 0 ----
  const title = place(make("div", "", "Made in<br>code.", root, {
    fontSize: "160px", fontWeight: "700", letterSpacing: "-0.045em", lineHeight: "0.9", color: C.ink, whiteSpace: "nowrap",
  }), STAGE.x0, 168);
  title.id = "s01-title";

  // The counter: every character laid out from the start, so the line never shifts as it counts.
  const counter = place(make("div", "mono", "", root, {
    fontSize: "38px", fontWeight: "500", letterSpacing: "-0.01em", whiteSpace: "pre", lineHeight: "1",
  }), STAGE.x0, 468);
  counter.id = "s01-counter";
  make("span", "", "seek(t)", counter, { color: C.ink });
  make("span", "", " → ", counter, { color: C.muted });
  make("span", "", "f ", counter, { color: C.muted });
  const num = make("span", "", "0000", counter, { color: C.clay, fontWeight: "600" });
  const frameText = (t) => String(Math.round(t * FPS)).padStart(4, "0");

  sfx(touchdown + 1 / FPS, "tap");         // the landing, one frame after its picture

  // ---- checks ----
  const visible = (el) => el.style.visibility !== "hidden" && Number(el.style.opacity || 1) > 0.999;
  check("s01 f0 is the thumbnail: title and mark on screen, counter not yet", 0, () => {
    const p = hero.pose(0, state), b = box(title);
    return (p.visible && b.y >= STAGE.y0 && getComputedStyle(counter).visibility === "hidden") || "f0 incomplete";
  });
  check("s01 counter reads the real frame number, Math.round(t * 60), on every frame", [tFrame, cutOut - 1 / FPS], (t) =>
    num.textContent === frameText(t) || `shows ${num.textContent} at f${Math.round(t * FPS)}`);
  check(`s01 counter fully in by "frame" + 0.5 s and held to the cut`, [tFrame + 0.5, cutOut - 1 / FPS], () =>
    visible(counter) || `opacity ${counter.style.opacity}`);
  check(`s01 mark settled by hop + f${HOP.settle} (${settled.toFixed(3)} s), before the cut`, [settled, cutOut - 1 / FPS], (t) => {
    const p = hero.pose(t, state);
    if (settled >= cutOut) return `settles after the cut`;
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15 && p.y === 0) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(2)}`;
  });
  check("s01 the mark clears the title and the counter through the hop", [cutIn, cutOut - 1 / FPS], () => {
    const a = overlap(tracker, title), b = overlap(tracker, counter);
    return (a + b === 0) || `overlap title ${a | 0} counter ${b | 0}`;
  });
  check("s01 the mark stays inside the stage (x 54–1026, y 140–1100)", [cutIn, cutOut - 1 / FPS], () => {
    const b = box(tracker);
    return (b.x >= STAGE.x0 && b.x + b.w <= STAGE.x1 && b.y >= STAGE.y0 && b.y + b.h <= STAGE.y1) ||
      `x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
  });
  check("s01 text stays inside the stage, clear of the caption band", [cutIn, cutOut - 1 / FPS], () =>
    [title, counter].every((el) => { const b = box(el); return b.x >= STAGE.x0 - 8 && b.x + b.w <= STAGE.x1 && b.y >= STAGE.y0 && b.y + b.h <= STAGE.y1; }) || "text outside the stage");

  return (t) => {
    hero.render(t, state);
    const m = markBox(t);
    Object.assign(tracker.style, { left: `${m.x.toFixed(2)}px`, top: `${m.y.toFixed(2)}px`, width: `${m.w.toFixed(2)}px`, height: `${m.h.toFixed(2)}px` });
    num.textContent = frameText(t);
    show(counter, t, tFrame, Infinity, { dur: 0.45, dy: 12 });
  };
}
