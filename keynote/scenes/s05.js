// s05 3D · bars 10–12 (21.82–26.18 s) · the keynote studio · in on a cut, out on a cut.
// One caption line enters with the cut: "3D, lit and rendered with three.js" (Apple's feature caption:
// 64 px, the secondary part in Apple gray). The hero move is one gesture into the light: from the
// cut the mark, left of centre and turned away from the key (yaw +28°), turns slowly toward it
// (to −16°, sine ease-in-out) and, two thirds of the way round, hops to the centre (hero3d `hop`,
// travel shortened so the larger mark stays in frame: anticipation f0–4, lift-off f6, touchdown
// f36 with a squash), the turn coming to rest exactly at touchdown, on the frame of bar 10 beat 3,
// with a pop one frame later. The studio's specular sweep crosses the glaze during the turn, before
// the hop. The settled picture holds 2.25 s to the cut.
// The camera pushes in 1.00 → 1.05 (ease-in-out over the shot); the caption scales with it.
import { createHero, HOP, turnYaw } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, appear, barT, check, box, sfx, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, F = 1 / FPS, W = 1080, H = 1350, LEAD = 2 * F, ENTER = 0.9;
  const fr = (t) => Math.round(t * FPS);

  // ---- times ----
  const tCap = barT(10);                                  // 21.818, the cut
  const tTouch = Math.round(barT(10, 3) * FPS) / FPS;     // f1407, the frame of bar 10 beat 3
  const tHop = tTouch - HOP.contact / FPS;                // touchdown is hop + f36
  const settled = tHop + HOP.settle / FPS;
  const TURN = { at: barT(10), from: 28, to: -16, dur: tTouch - barT(10), ease: "inout" };
  const SWEEP = { at: barT(10, 0.5), dur: 0.75 };         // 22.091–22.841, before the hop
  const state = { hop: tHop, turn: TURN, sweep: SWEEP, drift: { from: cutIn, to: cutOut, scale: 1.05, ease: "inout" } };

  // ---- the studio; the mark turns left of centre, then hops onto the centre line ----
  const MARK_PX = 360, MARK_Y = 840;                      // the mark's height and resting centre
  const TRAVEL = 0.5;                                     // half the standard hop's sideways travel
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const hero = createHero(canvas, {
    variant: "keynote", width: W, height: H, seed: 7,
    framing: { fill: MARK_PX / H, aim: [0, 0.5], center: [0.5, MARK_Y / H], x0: -0.6, hopTravel: TRAVEL },
  });
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.id = "s05-mark";

  // ---- the caption ----
  const layer = make("div", "", "", root, {
    position: "absolute", left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, transformOrigin: `${W / 2}px ${MARK_Y}px`,
  });
  // 56 px (4.1% of the frame, inside Apple's 4–5%): at the caption's 64 px this 33-character line is
  // 960 px wide and leaves the stage at the end of the push.
  const cap = place(make("div", "caption center", `3D, <span class="soft">lit and rendered with three.js</span>`, layer, { fontSize: "56px" }), STAGE.x0, 196, STAGE.x1 - STAGE.x0);
  cap.id = "s05-caption";

  sfx(tTouch + F, "pop");                                 // the landing, one frame after its picture

  // ---- checks ----
  const op = (el) => (el.style.visibility === "hidden" ? 0 : Number(el.style.opacity || 1));
  const first = Math.ceil(cutIn * FPS - 1e-9) / FPS;     // the shot's first frame
  const still = (el) => op(el) > 0.999 && /translate\(0(\.00)?px, 0(\.00)?px\)/.test(el.style.transform);
  const hold = cutOut - settled;
  const ink = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  check(`s05 the caption enters with the cut: on screen from the first frame (f${fr(first)}), settled by f${fr(tCap - LEAD + ENTER) + 1} and held to the cut`, [first, cutOut - F], (t) =>
    (t < tCap - LEAD + ENTER ? op(cap) > 0.05 : still(cap)) || `opacity ${op(cap).toFixed(3)} at f${fr(t)}`);
  check(`s05 one turn into the light (+28° → −16°) from the cut, coming to rest exactly at touchdown (f${fr(tTouch)})`, [first, cutOut - F], (t) => {
    const p = hero.pose(t, state);
    if (t >= tTouch) return p.yaw === -16 || `yaw ${p.yaw.toFixed(3)} at f${fr(t)}`;
    return p.yaw === turnYaw(t, TURN) || `yaw ${p.yaw.toFixed(3)} off the turn`;
  });
  check("s05 the sweep crosses during the turn and is over before the hop starts", 0, () =>
    (SWEEP.at > TURN.at && SWEEP.at + SWEEP.dur < tHop) || `sweep ${SWEEP.at.toFixed(2)}–${(SWEEP.at + SWEEP.dur).toFixed(2)}, hop ${tHop.toFixed(2)}`);
  check(`s05 touchdown on bar 10 beat 3 (f${fr(tTouch)}): in the air one frame before, on the floor on it`, [tTouch - F, tTouch], (t) => {
    const p = hero.pose(t, state);
    return (t < tTouch - F / 2 ? p.y > 0 : p.y === 0) || `lift ${p.y.toFixed(4)} at f${fr(t)}`;
  });
  check(`s05 the mark is settled by hop + f${HOP.settle} (f${fr(settled)}) and holds ${hold.toFixed(2)} s to the cut (2 s or more)`, [settled, cutOut - F], (t) => {
    const p = hero.pose(t, state);
    return (hold >= 2 && Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15 && p.y === 0) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(2)} hold ${hold.toFixed(2)}`;
  });
  check("s05 the pop sounds one frame after touchdown", cutIn, () =>
    (window.SFX || []).some((s) => s.kind === "pop" && Math.abs(s.t - (tTouch + F)) < 1e-6) || "no pop at touchdown + 1 frame");
  check("s05 the mark lands on the centre line (±24 px)", [settled, cutOut - F], () => Math.abs(box(tracker).cx - W / 2) <= 24 || `cx ${box(tracker).cx.toFixed(0)}`);
  check("s05 the mark clears the caption through the turn and the hop", [first, cutOut - F], () => {
    const m = box(tracker), b = ink(cap);
    return !(b.x < m.x + m.w && m.x < b.x + b.w && b.y < m.y + m.h && m.y < b.y + b.h) || `the mark (top ${m.y.toFixed(0)}) overlaps the caption (bottom ${(b.y + b.h).toFixed(0)})`;
  });
  check("s05 the caption and the mark inside the stage through the push", [first, cutOut - F], () => {
    const bad = [[cap, ink(cap)], [tracker, box(tracker)]]
      .find(([, b]) => b.x < STAGE.x0 || b.x + b.w > STAGE.x1 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1);
    return !bad || `${bad[0].id} at x ${bad[1].x.toFixed(0)}–${(bad[1].x + bad[1].w).toFixed(0)} y ${bad[1].y.toFixed(0)}–${(bad[1].y + bad[1].h).toFixed(0)}`;
  });

  const px = (v) => `${v.toFixed(2)}px`;
  return (t) => {
    hero.render(t, state);
    const b = hero.box();
    Object.assign(tracker.style, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h) });
    layer.style.transform = `scale(${hero.drift(t, state).toFixed(5)})`;
    appear(cap, t, tCap - LEAD);
  };
}
