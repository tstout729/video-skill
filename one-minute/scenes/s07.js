// s07 End card · canvas, the hero studio · 46.07–55.92 (in through the light leak, to the end).
// It bookends s01: the same full-frame studio, the title top left, the ceramic mark in the middle.
// The studio is drawn from cutIn, because the light leak shows the scene from its first frame.
// Hero move: the mark drops in and lands on the centre line (hero3d `land`: touchdown f27 with
// squash, settled by LAND.settle), timed so touchdown comes just after the leak has handed over;
// a tap one frame after touchdown. Then the card builds one line at a time:
//   the landing (+150 ms)  → "video skill" (h1)
//   "free"                 → "Free and open source · MIT"
//   "Install"              → /plugin marketplace add tstout729/video-skill (white pill, mono)
//   "line"                 → github.com/tstout729/video-skill (white pill, mono, the accent)
// The full card is complete 0.5 s after "line" and holds, still, to the last frame.
import * as THREE from "/_vendor/three/build/three.module.js";
import { createHero, LAND } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, show, cueIn, check, sfx, box, overlap, chrome, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, W = 1080, H = 1350;
  root.style.background = C.canvas;

  // The leak shows this scene from 36% of its 1.0 s and fully from 64%; touchdown follows that.
  const tLand = cutIn + 0.69 - LAND.contact / FPS;
  const touchdown = tLand + LAND.contact / FPS;
  const settled = tLand + LAND.settle / FPS;
  const tTitle = touchdown + 0.15;
  const tFree = cueIn(k.id, "free");
  const tInstall = cueIn(k.id, "Install");
  const tLine = cueIn(k.id, "line");
  const ENTER = 0.5;
  const tFull = tLine + ENTER;              // every line fully in

  // ---- the studio fills the frame; the mark lands on the centre line ----
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const MARK_PX = 320, MARK_Y = 600;        // the mark's height and resting centre, in px
  const hero = createHero(canvas, {
    variant: "directed", width: W, height: H, seed: 7,
    framing: { fill: MARK_PX / H, aim: [0, 0.5], center: [0.5, MARK_Y / H] },
  });
  const state = { land: tLand };

  // An invisible box that follows the mark on screen: the speed graph samples it, checks use it.
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.id = "s07-mark";
  const v = new THREE.Vector3();
  const toPx = (x, y) => { v.set(x, y, 0).project(hero.camera); return [(v.x * 0.5 + 0.5) * W, (0.5 - v.y * 0.5) * H]; };

  // The studio wall is darker than the canvas at the top: the chrome takes the deeper muted tone
  // there (#4a4945, 5.7:1 on the wall's #CFCFCF; the kit's #5c5953 measures 4.5:1).
  chrome(root, 7, "GET IT").style.color = "#4a4945";

  // ---- the card ----
  const title = place(make("div", "h1", "video skill", root, { color: C.ink, whiteSpace: "nowrap" }), STAGE.x0, 166);
  const deck = place(make("div", "", "Free and open source · MIT", root, {
    fontSize: "40px", fontWeight: "500", letterSpacing: "-0.01em", lineHeight: "1.2", color: C.ink, whiteSpace: "nowrap",
  }), STAGE.x0, 270);
  const pill = (text, color) => make("div", "mono", text, root, {
    position: "absolute", left: `${STAGE.x0}px`, padding: "16px 28px 18px", borderRadius: "999px", background: C.paper,
    boxShadow: "var(--shadow)", whiteSpace: "nowrap", color, fontSize: "34px", fontWeight: "500", letterSpacing: "-0.01em", lineHeight: "1.2",
  });
  const install = pill("/plugin marketplace add tstout729/video-skill", C.ink);
  const repo = pill("github.com/tstout729/video-skill", C.clay);
  install.style.top = "868px";
  repo.style.top = "968px";
  const lines = [title, deck, install, repo];
  title.id = "s07-title"; deck.id = "s07-deck"; install.id = "s07-install"; repo.id = "s07-repo";

  sfx(touchdown + 1 / FPS, "tap");          // the landing, one frame after its picture

  // ---- checks ----
  const opaque = (el) => el.style.visibility !== "hidden" && Number(el.style.opacity) > 0.999;
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.canvas.width = 1; probe.canvas.height = 1;
  const firstFrame = Math.ceil(cutIn * FPS - 1e-9) / FPS;   // the first rendered frame at or after cutIn
  check("s07 the studio is drawn from cutIn, when the light leak first shows the scene", firstFrame, () => {
    probe.drawImage(canvas, 540, 1000, 1, 1, 0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return (r > 200 && g > 200 && b > 200) || `floor pixel rgb(${r}, ${g}, ${b})`;
  });
  check(`s07 mark settled by land + f${LAND.settle} (${settled.toFixed(3)} s)`, settled, () => {
    const p = hero.pose(settled, state);
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.yaw) < 0.3 && p.y === 0) || `sy ${p.sy.toFixed(4)} yaw ${p.yaw.toFixed(2)}`;
  });
  check("s07 touchdown after the leak has handed over (scene fully shown at cutIn + 0.64 s)", cutIn, () =>
    touchdown >= cutIn + 0.64 || `touchdown ${touchdown.toFixed(3)}`);
  check("s07 the mark rests on the centre line (±8 px) to the last frame", [settled, cutOut - 1 / FPS], () => {
    const b = box(tracker);
    return Math.abs(b.cx - W / 2) < 8 || `cx ${b.cx.toFixed(1)}`;
  });
  check("s07 lines arrive one at a time, in order, each after the last has mostly entered", cutIn, () =>
    (tTitle > touchdown && tFree >= tTitle + 0.3 && tInstall >= tFree + ENTER && tLine >= tInstall + ENTER) ||
    `title ${tTitle.toFixed(2)} free ${tFree.toFixed(2)} install ${tInstall.toFixed(2)} line ${tLine.toFixed(2)}`);
  check(`s07 the full card is complete by ${tFull.toFixed(2)} s and holds at least 4 s to the last frame`, [tFull, cutOut - 1 / FPS], () => {
    if (cutOut - tFull < 4) return `hold only ${(cutOut - tFull).toFixed(2)} s`;
    const off = lines.find((el) => !opaque(el));
    return !off || `${off.id} at ${off.style.opacity}`;
  });
  check("s07 the full card holds still: no line moves once it is in", [tFull, cutOut - 1 / FPS], () =>
    lines.every((el) => ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(el).transform)) || "a line is moving");
  check("s07 the mark clears every line, and the lines clear each other", [settled, cutOut - 1 / FPS], () => {
    const els = [...lines, tracker];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (overlap(els[i], els[j]) > 0) return `${els[i].id} x ${els[j].id}`;
    return true;
  });
  check("s07 text and mark stay inside the stage, clear of the caption band", [tFull, cutOut - 1 / FPS], () =>
    [...lines, tracker].map((el) => { const b = box(el); return b.x >= STAGE.x0 - 4 && b.x + b.w <= STAGE.x1 && b.y >= STAGE.y0 && b.y + b.h <= STAGE.y1 ? "" : `${el.id} x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`; }).filter(Boolean).join("; ") || true);

  return (t) => {
    hero.render(t, state);
    const p = hero.pose(t, state);
    const [bx, by] = toPx(p.x, p.y), [, ty] = toPx(p.x, p.y + p.sy);
    const h = by - ty, w = (h / p.sy) * p.sxz * 1.04;
    Object.assign(tracker.style, { left: `${(bx - w / 2).toFixed(2)}px`, top: `${ty.toFixed(2)}px`, width: `${w.toFixed(2)}px`, height: `${h.toFixed(2)}px`, visibility: p.visible ? "visible" : "hidden" });

    // Text: ease-out entrances only, no exits. Nothing moves once it is in.
    show(title, t, tTitle, Infinity, { dur: ENTER, dy: 16 });
    show(deck, t, tFree, Infinity, { dur: ENTER, dy: 12 });
    show(install, t, tInstall, Infinity, { dur: ENTER, dy: 12 });
    show(repo, t, tLine, Infinity, { dur: ENTER, dy: 12 });
  };
}
