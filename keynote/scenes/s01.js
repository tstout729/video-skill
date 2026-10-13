// s01 Introducing · bars 0–4 (0–8.73 s) · the keynote studio · first frame to a cut on bar 4.
// f0 is the thumbnail: the mark at a three-quarter turn (yaw −38°), drawn only by its rim lights
// against black, the key at 8%. The title block sits on the black above the mark, centred, and each
// line enters with appear() (0.9 s, up 24 px from 8 px of blur), 2 frames before its beat:
//   bar 0 beat 2  "Introducing" (caption, Apple gray)
//   bar 1         the hero move: the key rises over 1.6 s and the mark turns to face us (−38° → −14°,
//                 critically damped over 2.0 s), one purposeful turn, then still
//   bar 2         "Video Skill" (headline 156 px); the title's specular sweep from bar 2 beat 0.5
//   bar 2 beat 2  "for Claude Code" (caption, the gradient)
//   bar 3 beat 3  the stop: the key snaps back to 8% over 3 frames; rims and type hold to the cut
// The camera pushes in 1.00 → 1.05 (ease-in-out over the shot); the type layer scales with it.
import { createHero, keyLevel, turnYaw, KEYNOTE } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, appear, barT, check, box, overlap, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, F = 1 / FPS, W = 1080, H = 1350, LEAD = 2 * F, ENTER = 0.9;
  const fr = (t) => Math.round(t * FPS);

  // ---- times (every one from the beat grid) ----
  const tIntro = barT(0, 2);   // 1.091
  const tReveal = barT(1);     // 2.182: the key rises, the mark turns
  const tName = barT(2);       // 4.364
  const tFor = barT(2, 2);     // 5.455
  const tStop = barT(3, 3);    // 8.182, the music's stop
  const RISE = 1.6, TURN = { at: tReveal, from: -38, to: -14, dur: 2.0 };
  const state = {
    reveal: { at: tReveal, dur: RISE },
    turn: TURN,
    sweep: { at: barT(2, 0.5), dur: 1.0 },
    dark: (fr(tStop) - 2) / FPS, // 3 frames on the frame grid: mostly off on the beat, off one frame after
    drift: { from: cutIn, to: cutOut, scale: 1.05, ease: "inout" },
  };

  // ---- the studio fills the frame; the mark sits below the title block ----
  const MARK_PX = 400;         // the mark's height at rest
  const MARK_Y = 852;          // its centre on screen
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const hero = createHero(canvas, {
    variant: "keynote", width: W, height: H, seed: 7,
    framing: { fill: MARK_PX / H, aim: [0, 0.5], center: [0.5, MARK_Y / H], x0: 0 },
  });

  // An invisible box on the mark's projected bounds: graph, cuts and the overlap checks read it.
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.id = "s01-mark";

  // ---- type: one layer that pushes in with the camera ----
  const layer = make("div", "", "", root, {
    position: "absolute", left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, transformOrigin: `${W / 2}px ${MARK_Y}px`,
  });
  const line = (cls, text, y, css = {}) => place(make("div", `${cls} center`, text, layer, css), STAGE.x0, y, STAGE.x1 - STAGE.x0);
  // Apple's feature captions: one small centred line (64 px); only the product name is huge.
  const intro = line("caption", `<span class="soft">Introducing</span>`, 166);
  const name = line("headline", "Video Skill", 256, { fontSize: "156px" });
  const tag = line("caption", `<span class="grad">for Claude Code</span>`, 436);
  intro.id = "s01-intro"; name.id = "s01-name"; tag.id = "s01-tag";
  const lines = [[intro, tIntro, "bar 0 beat 2"], [name, tName, "bar 2"], [tag, tFor, "bar 2 beat 2"]];

  // ---- checks ----
  const op = (el) => (el.style.visibility === "hidden" ? 0 : Number(el.style.opacity || 1));
  for (const [el, at, beat] of lines) {
    const label = `'${el.textContent}'`;
    check(`s01 ${label} hidden 3 frames before ${beat} (f${fr(at) - 3}), entering on it (f${fr(at)})`, [(fr(at) - 3) / FPS, fr(at) / FPS], (t) =>
      (fr(t) === fr(at) - 3 ? op(el) === 0 : fr(t) === fr(at) ? op(el) > 0.05 : true) || `opacity ${op(el).toFixed(3)} at f${fr(t)}`);
    check(`s01 ${label} settled by ${beat} + 0.9 s (f${fr(at - LEAD + ENTER)}) and held to the cut`, [(fr(at - LEAD + ENTER) + 1) / FPS, cutOut - F], () =>
      (op(el) > 0.999 && /translate\(0(\.00)?px, 0(\.00)?px\)/.test(el.style.transform)) || `opacity ${op(el).toFixed(3)} ${el.style.transform}`);
  }
  check("s01 f0 is the thumbnail: the mark at yaw −38°, key at 8%, no type yet", 0, () => {
    const p = hero.pose(0, state);
    if (Math.abs(p.yaw + 38) > 1e-6) return `yaw ${p.yaw}`;
    if (keyLevel(0, state) !== KEYNOTE.keyFloor) return `key ${keyLevel(0, state)}`;
    return lines.every(([el]) => op(el) === 0) || "type on screen at f0";
  });
  check(`s01 the turn starts on bar 1 and rests at exactly −14° by f${fr(TURN.at + TURN.dur)}, before 'Video Skill', still to the cut`, [tReveal, cutOut - F], (t) => {
    const p = hero.pose(t, state);
    if (TURN.at + TURN.dur > tName) return "the turn ends after 'Video Skill' starts";
    if (t >= TURN.at + TURN.dur) return p.yaw === -14 || `yaw ${p.yaw.toFixed(4)} at f${fr(t)}`;
    return (p.yaw <= -14 && p.yaw >= -38 && p.yaw === turnYaw(t, TURN)) || `yaw ${p.yaw.toFixed(3)} outside the turn`;
  });
  check(`s01 key at 100% from bar 1 + ${RISE} s to the stop`, [tReveal + RISE + F, state.dark], (t) => Math.abs(keyLevel(t, state) - 1) < 1e-9 || `key ${keyLevel(t, state).toFixed(3)}`);
  check(`s01 the stop: key back at 8% one frame after bar 3 beat 3 (f${fr(tStop) + 1}), and held to the cut`, [(fr(tStop) + 1) / FPS, cutOut - F], (t) =>
    Math.abs(keyLevel(t, state) - KEYNOTE.keyFloor) < 1e-9 || `key ${keyLevel(t, state).toFixed(3)}`);
  check("s01 the title's sweep runs after 'Video Skill' starts and ends before the stop", 0, () =>
    (state.sweep.at > tName && state.sweep.at + state.sweep.dur < tStop) || "sweep outside the title");
  check("s01 type sits on black: no line touches the mark", [cutIn, cutOut - F], () => {
    const hit = lines.find(([el]) => overlap(el.firstChild?.nodeType === 1 ? el.firstChild : el, tracker) > 0);
    return !hit || `'${hit[0].textContent}' overlaps the mark`;
  });
  check("s01 type and mark inside the stage (x 54–1026, y 96–1255) through the push", [cutIn, cutOut - F], () => {
    const ink = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const bad = [...lines.map(([el]) => [el, ink(el)]), [tracker, box(tracker)]]
      .find(([, b]) => b.x < STAGE.x0 || b.x + b.w > STAGE.x1 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1);
    return !bad || `${bad[0].id} at x ${bad[1].x.toFixed(0)}–${(bad[1].x + bad[1].w).toFixed(0)} y ${bad[1].y.toFixed(0)}–${(bad[1].y + bad[1].h).toFixed(0)}`;
  });

  const px = (v) => `${v.toFixed(2)}px`;
  return (t) => {
    hero.render(t, state);
    const b = hero.box();
    Object.assign(tracker.style, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h) });
    layer.style.transform = `scale(${hero.drift(t, state).toFixed(5)})`;
    for (const [el, at] of lines) appear(el, t, at - LEAD);
  };
}
