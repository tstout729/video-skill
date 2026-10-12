// s01 Title. Frame 0 is the thumbnail: the title, its deck and the ceramic mark resting in the studio.
// Hero move: on "AI" the mark hops into the centre and lands with squash (touchdown f36 lands on
// "animate"), settling at ζ 0.8 by HOP.settle. On "code" the mono line types on under it, 1 frame
// per letter, and holds to the cut.
import * as THREE from "/_vendor/three/build/three.module.js";
import { createHero, HOP } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, cueIn, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tAI = cueIn(k.id, "AI");          // hop starts; touchdown f36 lands on "animate"
  const tCode = cueIn(k.id, "code");       // the mono line types on
  const touchdown = tAI + HOP.contact / FPS;
  const settled = tAI + HOP.settle / FPS;

  // ---- the studio fills the stage; the mark rests left of centre and hops into it ----
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  // Full bleed: the studio is the opening picture. (A faded edge was tried in round 1; the
  // cyclorama's falloff turned into grey smudges, so the panel keeps its clean straight edges.)
  const MARK_Y = 640;                      // the mark's resting centre in stage pixels
  const hero = createHero(canvas, {
    variant: "directed", width: 1080, height: 992, seed: 7,
    framing: { fill: 0.2, aim: [0, 0.5], center: [0.5, MARK_Y / 992], x0: -HOP.travel },
  });
  const state = { hop: tAI };

  // An invisible box that follows the mark on screen: the speed graph samples it, checks use it.
  const tracker = make("div", "", "", root, { position: "absolute", width: "190px", height: "200px", pointerEvents: "none" });
  tracker.dataset.track = "s01-mark";
  const v = new THREE.Vector3();
  const project = (t) => {
    const p = hero.pose(t, state);
    v.set(p.x, p.y + 0.5 * p.sy, 0).project(hero.camera);
    return { x: (v.x * 0.5 + 0.5) * 1080, y: (0.5 - v.y * 0.5) * 992, p };
  };

  // ---- type: the title and its deck are on screen from frame 0 ----
  const title = place(make("div", "display", "Motion Lab,<br>explained", root), 80, 60);
  const deck = place(make("div", "body", "How to make an AI animate like a studio", root, { color: "#4a4945" }), 80, 270);

  // The mono line: every character is laid out from the start (centred under the mark) and shown
  // one frame apart, so the line never shifts while it types.
  const CODE = [["seek(t)", C.ink], [" → ", C.muted], ["frame", C.ink]];
  const line = make("div", "mono", "", root, {
    position: "absolute", left: "0px", width: "1080px", top: "800px", textAlign: "center",
    fontSize: "46px", fontWeight: "500", letterSpacing: "-0.01em", whiteSpace: "pre",
  });
  const chars = [];
  for (const [text, color] of CODE) for (const ch of text) chars.push(make("span", "", "", line, { color, visibility: "hidden" }));
  chars.forEach((s, i) => { s.textContent = CODE.map((c) => c[0]).join("")[i]; });
  const caret = make("div", "", "", root, { position: "absolute", width: "4px", height: "48px", background: C.accent, borderRadius: "2px" });
  const typedAt = (i) => tCode + i / FPS;  // letters 1 frame apart
  const typedEnd = typedAt(chars.length);

  sfx(touchdown + 1 / FPS, "tap");        // the landing, one frame after its picture

  // ---- checks ----
  const markBox = () => tracker;
  check("s01 f0 is a finished picture: title, deck and mark on screen", 0, () => {
    const p = hero.pose(0, state);
    return (p.visible && getComputedStyle(title).visibility !== "hidden" && box(title).y >= 128) || "missing";
  });
  check("s01 mark settled by hop + f" + HOP.settle, settled, () => {
    const p = hero.pose(settled, state);
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15 && Math.abs(p.x) < 0.003) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(2)} x ${p.x.toFixed(4)}`;
  });
  check("s01 mark lands on the centre line (±8 px)", [settled, cutOut - 1 / FPS], () => {
    const b = box(tracker);
    return Math.abs(b.cx - 540) < 8 || `cx ${b.cx.toFixed(1)}`;
  });
  check("s01 code line fully typed 1 frame per letter", typedEnd + 1 / FPS, () =>
    chars.every((s) => s.style.visibility === "visible") || "not all letters shown");
  check("s01 mark clears the title, the deck and the code line", [cutIn, cutOut - 1 / FPS], () => {
    const a = overlap(markBox(), title), b = overlap(markBox(), deck), c = overlap(markBox(), line);
    return (a + b + c === 0) || `overlap title ${a | 0} deck ${b | 0} line ${c | 0}`;
  });
  check("s01 text stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [title, deck, line].every((el) => { const b = box(el); return b.y >= 128 && b.y + b.h <= 1120; }) || "text outside the stage");

  return (t) => {
    hero.render(t, state);
    const { x, y, p } = project(t);
    const hpx = 200 * p.sy, wpx = 190 * p.sxz;
    Object.assign(tracker.style, { left: `${(x - wpx / 2).toFixed(2)}px`, top: `${(y - hpx / 2).toFixed(2)}px`, width: `${wpx.toFixed(2)}px`, height: `${hpx.toFixed(2)}px` });

    let last = -1;
    chars.forEach((s, i) => {
      const on = t >= typedAt(i);
      s.style.visibility = on ? "visible" : "hidden";
      if (on) last = i;
    });
    const typing = t >= tCode && t < typedEnd + 0.35;
    caret.style.visibility = typing ? "visible" : "hidden";
    if (typing) {
      const s = chars[Math.max(0, last)];
      const lb = line.getBoundingClientRect(), sb = s.getBoundingClientRect();
      const left = last < 0 ? sb.left - lb.left : sb.right - lb.left;
      caret.style.left = `${(left + 4).toFixed(2)}px`;
      caret.style.top = `${(800 + 6).toFixed(2)}px`;
    }
  };
}
