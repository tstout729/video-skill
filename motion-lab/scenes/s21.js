// s21 Close. The end card, and the last frame people see. It bookends s01: the same full-stage
// studio, a title top left, the ceramic mark in the middle, a mono line under it.
// Hero move: on "All of this" the mark drops in and lands in the centre (hero3d `land`: touchdown
// f27 with squash, settled at LAND.settle), with a tap one frame after touchdown. Then the card
// builds one line at a time, each on the words that say it:
//   "free video skill"   → "video skill · free and open source" (title, top left)
//   "made with it"       → "Made with the skill it explains" (its deck)
//   "Florence's article" → "Florence's article: x.com/flxrnc" (a white pill under the mark)
//   "the skill"          → the install line, mono, in a white pill
// The full card is complete 0.5 s after the last cue and holds about 5.2 s to the end of the video.
// All text on the studio is ink (≥ 9.7:1 on the backdrop); the accent appears only on white (5.9:1).
import * as THREE from "/_vendor/three/build/three.module.js";
import { createHero, LAND } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, show, cueIn, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tLand = cueIn(k.id, "All of this");
  const tTitle = cueIn(k.id, "free video skill");
  const tDeck = cueIn(k.id, "made with it");
  const tArticle = cueIn(k.id, "Florence's article");
  const tInstall = cueIn(k.id, "the skill");
  const touchdown = tLand + LAND.contact / FPS;
  const settled = tLand + LAND.settle / FPS;
  const ENTER = 0.5;
  const tFull = tInstall + ENTER;                 // every line fully in

  // ---- the studio fills the stage; the mark lands in its centre ----
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const MARK_Y = 470;                             // the mark's resting centre in stage pixels
  const hero = createHero(canvas, {
    variant: "directed", width: 1080, height: 992, seed: 7,
    framing: { fill: 0.2, aim: [0, 0.5], center: [0.5, MARK_Y / 992] },
  });
  const state = { land: tLand };

  // An invisible box that follows the mark on screen: the speed graph samples it, checks use it.
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.dataset.track = "s21-mark";
  const v = new THREE.Vector3();

  // ---- the card ----
  const title = place(make("div", "", "", root, { fontWeight: "700", letterSpacing: "-0.025em", lineHeight: "1.05", whiteSpace: "nowrap", color: C.ink }), 80, 64);
  title.innerHTML = `video skill <span style="font-weight:500">· free and open source</span>`;
  const deck = place(make("div", "body", "Made with the skill it explains", root, { fontSize: "36px", fontWeight: "500", color: C.ink }), 80, 0);
  const pill = (html, css = {}) => make("div", "", html, root, {
    position: "absolute", left: "0px", padding: "14px 30px 16px", borderRadius: "999px", background: C.paper,
    boxShadow: "var(--shadow)", whiteSpace: "nowrap", color: C.ink, ...css,
  });
  const article = pill(`Florence’s article: <span style="color:${C.accent};font-weight:620">x.com/flxrnc</span>`, { fontSize: "36px", fontWeight: "560" });
  const install = pill("/plugin marketplace add tstout729/video-skill", { fontFamily: "'Geist Mono', ui-monospace, monospace", fontSize: "32px", fontWeight: "560", padding: "16px 26px 18px" });
  const ARTICLE_Y = 680, INSTALL_Y = 784;

  sfx(touchdown + 1 / FPS, "tap");                // the landing, one frame after its picture

  // Fit the title to the 920 px measure (80 px margins), then lay out the rest from it.
  await document.fonts.ready;
  title.style.fontSize = "64px";
  const fit = Math.min(64, (64 * 920) / title.scrollWidth);
  title.style.fontSize = `${fit.toFixed(2)}px`;
  deck.style.top = `${(64 + title.offsetHeight + 14).toFixed(2)}px`;
  for (const [el, y] of [[article, ARTICLE_Y], [install, INSTALL_Y]]) {
    el.style.left = `${((1080 - el.offsetWidth) / 2).toFixed(2)}px`;
    el.style.top = `${y}px`;
  }

  // ---- checks ----
  check(`s21 mark settled by land + f${LAND.settle}`, settled, () => {
    const p = hero.pose(settled, state);
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.yaw) < 0.3 && p.y === 0) || `sy ${p.sy.toFixed(4)} yaw ${p.yaw.toFixed(2)}`;
  });
  check("s21 mark rests on the centre line (±8 px) to the end", [settled, cutOut - 1 / FPS], () => {
    const b = box(tracker);
    return Math.abs(b.cx - 540) < 8 || `cx ${b.cx.toFixed(1)}`;
  });
  check("s21 lines arrive in order, each after the last one has entered", cutIn, () =>
    (tTitle > settled && tDeck >= tTitle + ENTER && tArticle >= tDeck + ENTER && tInstall >= tArticle + ENTER) || "order");
  check("s21 the full card is complete and holds at least 4 s to the last frame", [tFull, cutOut - 1 / FPS], () => {
    if (cutOut - tFull < 4) return `hold only ${(cutOut - tFull).toFixed(2)} s`;
    const off = [title, deck, article, install].find((el) => Number(el.style.opacity) < 0.999 || el.style.visibility === "hidden");
    return !off || `${off.textContent.slice(0, 24)} at ${off.style.opacity}`;
  });
  check("s21 the full card holds still: no line moves after it has entered", [tFull, cutOut - 1 / FPS], () =>
    [title, deck, article, install].every((el) => ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(el).transform)) || "moving");
  check("s21 the mark clears every line, and the lines clear each other", [settled, cutOut - 1 / FPS], () => {
    const els = [title, deck, article, install, tracker];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (overlap(els[i], els[j]) > 0) return `${i} x ${j}`;
    return true;
  });
  check("s21 text stays inside the stage, with 80 px margins", [tFull, cutOut - 1 / FPS], () =>
    [title, deck, article, install].map((el) => { const b = box(el); return b.x >= 79.5 && b.x + b.w <= 1000.5 && b.y >= 128 && b.y + b.h <= 1120 ? "" : `${el.textContent.slice(0, 16)} x ${b.x.toFixed(1)}–${(b.x + b.w).toFixed(1)} y ${b.y.toFixed(1)}–${(b.y + b.h).toFixed(1)}`; }).filter(Boolean).join("; ") || true);

  return (t) => {
    hero.render(t, state);
    const p = hero.pose(t, state);
    v.set(p.x, p.y + 0.5 * p.sy, 0).project(hero.camera);
    const x = (v.x * 0.5 + 0.5) * 1080, y = (0.5 - v.y * 0.5) * 992;
    const hpx = 200 * p.sy, wpx = 190 * p.sxz;
    Object.assign(tracker.style, { left: `${(x - wpx / 2).toFixed(2)}px`, top: `${(y - hpx / 2).toFixed(2)}px`, width: `${wpx.toFixed(2)}px`, height: `${hpx.toFixed(2)}px`, visibility: p.visible ? "visible" : "hidden" });

    // Text: ease-out entrances only, no exits. Nothing moves once it is in.
    show(title, t, tTitle, Infinity, { dur: ENTER, dy: 14 });
    show(deck, t, tDeck, Infinity, { dur: ENTER, dy: 12 });
    show(article, t, tArticle, Infinity, { dur: ENTER, dy: 12 });
    show(install, t, tInstall, Infinity, { dur: ENTER, dy: 12 });
  };
}
