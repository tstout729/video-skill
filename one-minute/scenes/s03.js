// s03 The range · 13.03–22.50: a push up brings it in, a cut takes it out.
// Four sub-shots, one per kind of video the skill makes. Each is a sub-root inside this scene's root
// with its own background, chrome ("03 / 07 · ONE SKILL"), one word set huge (140 px) and one
// rounded window under it. The sub-roots change with transitions.js (never the scene root):
//   Walkthroughs · sand   the walkthrough clip (Acme's invite card; the email typed). From the push
//                         it carries "One skill"; "Walkthroughs" rolls in and is still by its word.
//   Diagrams     · ink    the Manim explainer (DNS): its network draws on after the whip lands.
//   3D           · canvas the ceramic mark, live from hero3d: the camera push-in continues the
//                         zoom-through and settles; the hero move, one hop, lands on "objects".
//   Loops        · pine   the checkout loop, placed so its check turns green on beat 43, on "beat".
// Changes: whip (beat 32, 16.00 s, 0.6 s), zoom-through into the window (beat 36, 18.00 s, 0.8 s),
// push (19.95 s, 0.6 s: 3 frames before beat 40, so it ends within 0.25 s of "loops").
// Each sub-shot owns the frame from one handoff to the next for 1.8 s or more, and its handoff
// comes at most 0.5 s before its word; each change is over at most 0.25 s after the word.
import * as THREE from "/_vendor/three/build/three.module.js";
import { scenes } from "/_skill/runtime/transitions.js";
import { createHero, HOP } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, show, cueIn, chrome, clipWindow, frames, beatT, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;
  // Shows only at the zoom-through's thin margins, under the fading ink diagram.
  root.style.background = C.ink;

  // ---- the plan ----
  const word = (phrase) => cueIn(k.id, phrase, 1, 0);           // the word's own start
  const W = { walk: word("walkthroughs"), diagram: word("diagrams"), three: word("3D"), objects: word("objects"), loop: word("loops"), beat: word("beat") };
  const T2 = { kind: "whip", at: beatT(32), dur: 0.6, dir: "left" };
  const WIN = { x: 54, y: 405, w: 972, h: 600 };
  const T3 = { kind: "zoom-through", at: beatT(36), dur: 0.8, origin: [WIN.x + WIN.w / 2, WIN.y + WIN.h / 2] };
  const T4 = { kind: "push", at: beatT(40) - 3 / FPS, dur: 0.6, dir: "left" };
  const ROLL_DUR = 0.45;                                           // one move across the frame: ease-in-out
  const tSwap = cueIn(k.id, "walkthroughs", 1, ROLL_DUR);          // the roll ends on the word itself
  const tPush = T3.at;                                             // the 3D camera push-in (hero3d, 0.9 s)
  const tHop = W.three - 0.04;                                     // anticipation f0–f4 leads "3D"
  const touchdown = tHop + HOP.contact / FPS;
  const settled = tHop + HOP.settle / FPS;

  // Clip offsets: global time of each clip's first frame.
  const CLIP = {
    // frame 70 (the invite card zooming in) at the push; the typed email is complete before the whip.
    // 1.12x keeps the training steps and the card whole (1.3x cut the steps into fragments).
    walk: { dir: "clips/walkthrough", fps: 30, count: 210, w: 1000, h: 562, scale: 1.12, focus: [474, 287], t0: cutIn - 69 / 30 },
    // the browser has moved aside as the whip starts; the network draws on after it lands
    diagram: { dir: "clips/explainer", fps: 30, count: 180, w: 960, h: 540, scale: 1.112, focus: [450, 270], t0: 13.5 },
    // the checkout loop: its ring closes on its beat 13 (loop 7.0 s = clip 5.5 s) and turns green
    // about 0.25 s later (measured: clip frame 173, 5.767 s, is the first green one, 175 is solid).
    // That frame lands on this film's beat 43, 21.50 s, under "beat"; before it the spinner turns.
    loop: { dir: "clips/loop", fps: 30, count: 300, w: 860, h: 860, scale: 1.3, focus: [430, 430], t0: beatT(43) - 173 / 30, solid: 175 / 30 },
  };

  // ---- the sub-roots ----
  const sub = (id, bg, dark) => {
    const el = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px",
      overflow: "hidden", background: bg, color: dark ? C.canvas : C.ink });
    el.id = `s03-${id}`;
    chrome(el, 3, "ONE SKILL", dark);
    return el;
  };
  const WORD_Y = 221;
  const bigWord = (parent, text) => place(make("div", "", text, parent, {
    fontSize: "140px", fontWeight: "700", letterSpacing: "-0.045em", lineHeight: "0.9", whiteSpace: "nowrap" }), WIN.x, WORD_Y);
  // A window with a clip scaled about its focus point. design.css draws the hairline above the picture.
  const clipIn = (parent, dark, c) => {
    const { el, img } = clipWindow(parent, WIN.x, WIN.y, WIN.w, WIN.h, dark);
    const sw = c.w * c.scale, sh = c.h * c.scale;
    const ox = Math.min(Math.max(c.focus[0] * c.scale - WIN.w / 2, 0), sw - WIN.w);
    const oy = Math.min(Math.max(c.focus[1] * c.scale - WIN.h / 2, 0), sh - WIN.h);
    Object.assign(img.style, { inset: "auto", left: `${(-ox).toFixed(2)}px`, top: `${(-oy).toFixed(2)}px`,
      width: `${sw.toFixed(2)}px`, height: `${sh.toFixed(2)}px`, objectFit: "fill" });
    return { el, img, play: frames(img, { dir: c.dir, fps: c.fps, count: c.count }), c, crop: { ox, oy, sw, sh } };
  };

  const walk = sub("walk", C.sand, false);
  // The two words sit one line apart on a strip, masked by a box that holds one line with its
  // descenders, so the swap is a roll: the strip moves up one line, "One skill" out, "Walkthroughs" in.
  const ROLL = { top: WORD_Y - 16, h: 166 };
  const rollBox = place(make("div", "", "", walk, { overflow: "hidden" }), 0, ROLL.top, 1080, ROLL.h);
  const strip = place(make("div", "", "", rollBox), 0, 0, 1080, 2 * ROLL.h);
  const oneSkill = bigWord(strip, "One skill");
  const walkWord = bigWord(strip, "Walkthroughs");
  oneSkill.style.top = `${WORD_Y - ROLL.top}px`;
  walkWord.style.top = `${WORD_Y - ROLL.top + ROLL.h}px`;
  const walkWin = clipIn(walk, false, CLIP.walk);

  const diagram = sub("diagram", C.ink, true);
  const diagramWord = bigWord(diagram, "Diagrams");
  const diagramWin = clipIn(diagram, true, CLIP.diagram);

  const three = sub("3d", C.canvas, false);
  const threeWord = bigWord(three, "3D");
  const threeWin = place(make("div", "clipwin", "", three), WIN.x, WIN.y, WIN.w, WIN.h);
  const canvas = make("canvas", "", "", threeWin, { position: "absolute", left: "0px", top: "0px" });
  // The mark rests half a hop left of centre and hops to half a hop right of it. The aim is already
  // where the push-in takes it (the hop's midpoint, the mark's middle), so the push is a pure dolly
  // that closes 16% of the distance; the frame leaves room for the hop's apex after it.
  const hero = createHero(canvas, { variant: "directed", width: WIN.w, height: WIN.h, seed: 7,
    framing: { fill: 0.34, aim: [-HOP.travel / 2, 0.55], center: [0.5, 0.657], x0: -HOP.travel } });
  const heroState = { hop: tHop, push: tPush };
  // An invisible box that follows the mark on screen: the speed graph samples it, checks use it.
  const tracker = make("div", "", "", three, { position: "absolute", pointerEvents: "none" });
  tracker.dataset.track = "s03-mark";
  const v = new THREE.Vector3();
  const markBox = (t) => {
    const p = hero.pose(t, heroState);
    v.set(p.x, p.y + 0.5 * p.sy, 0).project(hero.camera);
    // the slab's on-screen size from two projected corners at the current camera distance
    const a = new THREE.Vector3(p.x - 0.5 * p.sxz, p.y, 0).project(hero.camera);
    const b = new THREE.Vector3(p.x + 0.5 * p.sxz, p.y + p.sy, 0).project(hero.camera);
    const w = Math.abs(b.x - a.x) * 0.5 * WIN.w, h = Math.abs(b.y - a.y) * 0.5 * WIN.h;
    return { x: WIN.x + (v.x * 0.5 + 0.5) * WIN.w, y: WIN.y + (0.5 - v.y * 0.5) * WIN.h, w, h, p };
  };

  const loop = sub("loop", C.pine, true);
  const loopWord = bigWord(loop, "Loops");
  const loopWin = clipIn(loop, true, CLIP.loop);

  const film = scenes([walk, T2, diagram, T3, three, T4, loop]);
  const end = (s) => s.at + s.dur, handoff = (s) => s.at + s.dur / 2;

  // ---- sounds: the hop's touchdown and the loop's check, one frame after their pictures ----
  sfx(touchdown + 1 / FPS, "tap");
  sfx(CLIP.loop.t0 + CLIP.loop.solid + 1 / FPS, "success", 0.8);

  // ---- checks ----
  const own = [
    ["Walkthroughs", (cutIn + k.win.inEnd) / 2, handoff(T2), W.walk, tSwap + ROLL_DUR],
    ["Diagrams", handoff(T2), handoff(T3), W.diagram, end(T2)],
    ["3D", handoff(T3), handoff(T4), W.three, end(T3)],
    ["Loops", handoff(T4), cutOut, W.loop, end(T4)],
  ];
  check("s03 sub-shots change by whip, zoom-through and push, 0.6–0.8 s each, inside the scene", cutIn, () => {
    const kinds = [T2, T3, T4].map((s) => s.kind);
    if (new Set(kinds).size !== 3) return `kinds ${kinds}`;
    const bad = [T2, T3, T4].find((s) => s.dur < 0.6 - 1e-9 || s.dur > 0.8 + 1e-9 || s.at < k.win.inEnd || end(s) > cutOut);
    return !bad || `${bad.kind} ${bad.at}+${bad.dur}`;
  });
  check("s03 each sub-shot owns the frame 1.8 s or more (handoff to handoff)", cutIn, () =>
    own.map(([n, a, b]) => (b - a >= 1.8 ? "" : `${n} ${(b - a).toFixed(2)} s`)).filter(Boolean).join("; ") || true);
  check("s03 each word is spoken on its sub-shot: it arrives ≤ 0.5 s before the word, done ≤ 0.25 s after", cutIn, () =>
    own.map(([n, a, b, w, done]) => {
      const arrive = n === "Walkthroughs" ? tSwap : a;
      return w - arrive <= 0.5 + 1e-9 && done - w <= 0.25 + 1e-9 && w < b ? "" : `${n}: arrives ${(arrive - w).toFixed(2)}, done ${(done - w).toFixed(2)}`;
    }).filter(Boolean).join("; ") || true);
  check("s03 whip and zoom-through start on beats; the push 3 frames before beat 40", cutIn, () =>
    (Math.abs(T2.at - beatT(32)) < 1e-6 && Math.abs(T3.at - beatT(36)) < 1e-6 && Math.abs(T4.at - (beatT(40) - 0.05)) < 1e-6) || "off the grid");
  check(`s03 mark settled by hop + f${HOP.settle}, before the push out starts`, settled, () => {
    const p = hero.pose(settled, heroState);
    if (settled > T4.at) return `settles ${((settled - T4.at) * FPS).toFixed(1)} f after the push out starts`;
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15 && p.y === 0) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(2)}`;
  });
  check("s03 the mark stays inside its window through the hop", [end(T3), T4.at], (t) => {
    const b = box(tracker), r = { x0: WIN.x, y0: WIN.y, x1: WIN.x + WIN.w, y1: WIN.y + WIN.h };
    return (b.x >= r.x0 + 12 && b.x + b.w <= r.x1 - 12 && b.y >= r.y0 + 12 && b.y + b.h <= r.y1 - 12) ||
      `mark ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}x${b.h.toFixed(0)} at ${t.toFixed(3)}`;
  });
  check("s03 the loop's check turns green on beat 43 (21.50 s), under \"beat\"", [beatT(43) - 2 / FPS, beatT(43) + 6 / FPS], (t) => {
    // clip frame 173 is the first green one; the frame shown at t must agree with the beat
    const k0 = Math.floor((t - CLIP.loop.t0) * 30 + 1e-6), n = Number(loopWin.img.getAttribute("src").match(/(\d+)\.jpg/)[1]) - 1;
    if (n !== k0) return `shows clip frame ${n}, expected ${k0}`;
    return ((t < beatT(43) - 1e-6 ? n < 173 : n >= 173) && Math.abs(beatT(43) - W.beat) < 0.1) || `clip frame ${n} at ${t.toFixed(3)}`;
  });
  check("s03 no clip is scaled past 1.3x, and every crop stays inside its clip", cutIn, () =>
    [walkWin, diagramWin, loopWin].every((w) => w.c.scale <= 1.3 && w.crop.ox >= 0 && w.crop.oy >= 0 && w.crop.ox + WIN.w <= w.crop.sw + 0.01 && w.crop.oy + WIN.h <= w.crop.sh + 0.01) || "crop");
  check("s03 clip frames stay inside each clip while on screen", cutIn, () => {
    const spans = [[walkWin, cutIn, end(T2)], [diagramWin, T2.at, end(T3)], [loopWin, T4.at, cutOut]];
    return spans.map(([w, a, b]) => {
      const fa = (a - w.c.t0) * w.c.fps, fb = (b - w.c.t0) * w.c.fps;
      return fa >= 0 && fb <= w.c.count ? "" : `${w.c.dir} ${fa.toFixed(0)}–${fb.toFixed(0)}`;
    }).filter(Boolean).join("; ") || true;
  });
  // Layout, on the frames where each sub-shot is alone and settled.
  const tRolled = tSwap + ROLL_DUR;
  const settledSpans = [[k.win.inEnd, tSwap, walk, [oneSkill, walkWin.el]], [tRolled, T2.at, walk, [walkWord, walkWin.el]], [end(T2), T3.at, diagram, [diagramWord, diagramWin.el]],
    [end(T3), T4.at, three, [threeWord, threeWin]], [end(T4), cutOut - 1 / FPS, loop, [loopWord, loopWin.el]]];
  settledSpans.forEach(([a, b, el, items], i) => {
    check(`s03 sub-shot ${["1a", "1b", 2, 3, 4][i]}: word and window inside the stage, clear of the chrome, the caption band and each other`, [a, b], () => {
      const out = items.map((it) => { const r = box(it); return r.x >= 54 - 0.5 && r.x + r.w <= 1026.5 && r.y >= 140 && r.y + r.h <= 1100 ? "" : `${it.textContent || "window"} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
      if (overlap(items[0], items[1]) > 0) out.push("word over window");
      const ch = el.querySelector(".chrome");
      if (items.some((it) => overlap(it, ch) > 0)) out.push("over the chrome");
      return out.join("; ") || true;
    });
  });
  check("s03 \"Walkthroughs\" is fully in by its word and holds still to the whip", [tRolled + 1 / FPS, T2.at], () =>
    (Math.abs(box(walkWord).y - WORD_Y) < 0.01 && oneSkill.style.visibility === "hidden") || `y ${box(walkWord).y}`);
  check("s03 the roll's box holds the whole line, descenders included, clear of the window", tRolled + 0.1, () => {
    const b = box(rollBox);
    return (b.y + b.h <= WIN.y - 8 && b.y >= 140 && walkWord.scrollWidth <= 972) || `box ${b.y}–${b.y + b.h}, word ${walkWord.scrollWidth} px`;
  });

  return (t) => {
    film(t);
    const on = (a, b) => t >= a - 1e-6 && t <= b + 1e-6;
    const pending = [];

    // Walkthroughs: "One skill" from the push, then it rolls up and "Walkthroughs" rolls in.
    if (on(cutIn, end(T2))) {
      // a roll inside the masked line: no fade, and the words stay one line apart
      const e = k.easeInOut(k.p01(t, tSwap, ROLL_DUR));
      strip.style.transform = `translateY(${(-ROLL.h * e).toFixed(2)}px)`;
      oneSkill.style.visibility = e < 1 ? "visible" : "hidden";
      walkWord.style.visibility = e > 0 ? "visible" : "hidden";
      pending.push(walkWin.play(t - CLIP.walk.t0));
    }
    if (on(T2.at, end(T3))) pending.push(diagramWin.play(t - CLIP.diagram.t0));
    if (on(T3.at, end(T4))) {
      hero.render(t, heroState);
      const m = markBox(t);
      Object.assign(tracker.style, { left: `${(m.x - m.w / 2).toFixed(2)}px`, top: `${(m.y - m.h / 2).toFixed(2)}px`,
        width: `${m.w.toFixed(2)}px`, height: `${m.h.toFixed(2)}px` });
    }
    if (on(T4.at, cutOut)) pending.push(loopWin.play(t - CLIP.loop.t0));
    return Promise.all(pending);
  };
}
