// s05 3D · bar 9 (17.42–19.35 s, on screen to 19.65) · the keynote studio · in on a cut, out on a whip up.
// "3D." (giant) lands with the cut on bar 9, on the black above the mark. The hero move: the mark
// hops left to right under it (hero3d `hop`: anticipation f0–4, lift-off f6, touchdown f36 with a
// squash, settled by HOP.settle), timed so touchdown falls on the frame of bar 9 beat 2, with a pop one
// frame later and the 3D shot's specular sweep on the same beat. It holds still into the whip.
import { createHero, HOP } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, words, stagger, barT, check, box, overlap, sfx, C, STAGE } = k;
  const { cutIn, cutOut, outStart } = k.win;
  const FPS = 60, F = 1 / FPS, W = 1080, H = 1350;
  const fr = (t) => Math.round(t * FPS);

  // ---- times ----
  const tWord = barT(9);                                  // 17.419, the cut
  const tTouch = Math.round(barT(9, 2) * FPS) / FPS;      // f1103, the frame nearest bar 9 beat 2
  const tHop = tTouch - HOP.contact / FPS;                // touchdown is hop + f36
  const settled = tHop + HOP.settle / FPS;
  const state = { hop: tHop, sweep: barT(9, 2), drift: { from: cutIn, to: cutOut, amount: 0.015 } };

  // ---- the studio; the mark hops in from the left and lands under the word ----
  const MARK_PX = 300, MARK_Y = 870;                      // the mark's height and resting centre
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const hero = createHero(canvas, {
    variant: "keynote", width: W, height: H, seed: 7,
    framing: { fill: MARK_PX / H, aim: [0, 0.5], center: [0.5, MARK_Y / H], x0: -1.05, yaw: -24 },
  });
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.id = "s05-mark";

  // ---- type ----
  const layer = make("div", "", "", root, {
    position: "absolute", left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, transformOrigin: `${W / 2}px ${MARK_Y}px`,
  });
  const word = place(make("div", "giant center", "", layer), STAGE.x0, 196, STAGE.x1 - STAGE.x0);
  word.id = "s05-word";
  const spans = words(word, "3D.");

  sfx(tTouch + F, "pop");                                 // the landing, one frame after its picture

  // ---- checks ----
  const op = (el) => (el.style.visibility === "hidden" ? 0 : Number(el.style.opacity || 1));
  const first = Math.ceil(cutIn * FPS - 1e-9) / FPS;     // the shot's first frame
  check(`s05 '3D.' lands with the cut: 30%+ on the shot's first frame (f${fr(first)})`, first, () => op(spans[0]) >= 0.3 || `opacity ${op(spans[0]).toFixed(3)}`);
  check(`s05 '3D.' 99% in by the hop's lift-off and held to the whip`, [tHop + HOP.liftoff / FPS, cutOut - F], () => op(spans[0]) >= 0.99 || `opacity ${op(spans[0])}`);
  check(`s05 the hop waits for '3D.': it starts ${(tHop - tWord).toFixed(2)} s after the cut (0.3 s or more)`, cutIn, () => tHop - tWord >= 0.3 || `only ${(tHop - tWord).toFixed(3)} s`);
  check(`s05 touchdown on bar 9 beat 2 (f${fr(tTouch)}): in the air one frame before, on the floor on it`, [tTouch - F, tTouch], (t) => {
    const p = hero.pose(t, state);
    return (t < tTouch - F / 2 ? p.y > 0 : p.y === 0) || `lift ${p.y.toFixed(4)} at f${fr(t)}`;
  });
  check(`s05 the mark is settled by hop + f${HOP.settle} (${settled.toFixed(2)} s), before the whip at ${outStart.toFixed(2)}`, [Math.min(settled, outStart), cutOut - F], (t) => {
    const p = hero.pose(t, state);
    return (settled <= outStart + 2 * F && Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15 && p.y === 0) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(2)} (settles ${settled.toFixed(3)})`;
  });
  check("s05 the pop sounds one frame after touchdown", cutIn, () =>
    (window.SFX || []).some((s) => s.kind === "pop" && Math.abs(s.t - (tTouch + F)) < 1e-6) || "no pop at touchdown + 1 frame");
  check("s05 the mark clears '3D.' through the hop", [cutIn, cutOut - F], () => overlap(tracker, spans[0]) === 0 || "the mark overlaps '3D.'");
  check("s05 '3D.' and the mark inside the stage", [first, outStart], () => {
    const bad = [spans[0], tracker].map((el) => [el, box(el)]).find(([, b]) => b.x < STAGE.x0 || b.x + b.w > STAGE.x1 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1);
    return !bad || `${bad[0].id || bad[0].textContent} at x ${bad[1].x.toFixed(0)}–${(bad[1].x + bad[1].w).toFixed(0)} y ${bad[1].y.toFixed(0)}–${(bad[1].y + bad[1].h).toFixed(0)}`;
  });

  const px = (v) => `${v.toFixed(2)}px`;
  return (t) => {
    hero.render(t, state);
    const b = hero.box();
    Object.assign(tracker.style, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h) });
    layer.style.transform = `scale(${hero.drift(t, state).toFixed(5)})`;
    stagger(spans, t, tWord - 2 * F);
  };
}
