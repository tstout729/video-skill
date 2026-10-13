// s01 Introducing · bars 0–4 (0–7.74 s) · the keynote studio · first frame to a smash cut on bar 4.
// f0 is the thumbnail: the mark at a three-quarter turn (yaw −38°), drawn only by its rim lights
// against black, the key at 8%. The title block sits on the black above the mark, centred:
//   bar 0 beat 2  "Introducing" (h2, muted) at y 170
//   bar 1         the hero move: the key rises over 1.2 s and the mark turns to −14° over 1.6 s
//                 (ζ 1.0), one purposeful turn, then still
//   bar 2         "Video Skill" (hero 168 px); the specular sweep on bar 2 beat 0.5 (the title's sweep)
//   bar 2 beat 2  "for Claude Code" (h2, the gradient)
//   bar 3 beat 3  the stop: the key snaps back to 8% over 3 frames; rims and type hold to the cut
// The 3D camera drifts (a 1.8% dolly over the shot); the type layer scales with it about the mark.
import { createHero, keyLevel, KEYNOTE } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, reveal, words, stagger, barT, check, box, overlap, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, F = 1 / FPS, W = 1080, H = 1350;
  const fr = (t) => Math.round(t * FPS);

  // ---- times (every one from the beat grid) ----
  const tIntro = barT(0, 2);   // 0.968
  const tReveal = barT(1);     // 1.935: key rises, the mark turns
  const tName = barT(2);       // 3.871
  const tSweep = barT(2, 0.5); // 4.113
  const tFor = barT(2, 2);     // 4.839
  const tStop = barT(3, 3);    // 7.258
  const state = {
    reveal: tReveal,
    turn: { at: tReveal, from: -38, to: -14 },
    sweep: tSweep,
    dark: (fr(tStop) - 2) / FPS, // 3 frames on the frame grid: mostly off on the beat, off one frame after
    drift: { from: cutIn, to: cutOut, amount: 0.018 },
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

  // ---- type: one layer that drifts with the camera ----
  const layer = make("div", "", "", root, {
    position: "absolute", left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, transformOrigin: `${W / 2}px ${MARK_Y}px`,
  });
  const line = (cls, text, y, css = {}) => {
    const el = place(make("div", `${cls} center`, "", layer, css), STAGE.x0, y, STAGE.x1 - STAGE.x0);
    return { el, words: words(el, text) };
  };
  const intro = line("h2", "Introducing", 170, { color: C.mutedDark });
  const name = line("hero", "Video Skill", 252);
  const tag = line("h2", "for Claude Code", 424);
  intro.el.id = "s01-intro"; name.el.id = "s01-name"; tag.el.id = "s01-tag";
  // One gradient across the phrase, not one per word: each word shows its slice of it.
  const x0 = tag.words[0].offsetLeft;
  const span = tag.words.at(-1).offsetLeft + tag.words.at(-1).offsetWidth - x0;
  for (const w of tag.words) {
    w.classList.add("grad");
    Object.assign(w.style, { backgroundSize: `${span}px 100%`, backgroundPosition: `${-(w.offsetLeft - x0)}px 0` });
  }
  const lines = [intro, name, tag];
  const allWords = lines.flatMap((l) => l.words);

  // ---- checks ----
  const op = (el) => (el.style.visibility === "hidden" ? 0 : Number(el.style.opacity || 1));
  const lands = (label, l, beat, at) => {
    check(`s01 ${label} hidden 3 frames before ${beat} (f${fr(at) - 3})`, (fr(at) - 3) / FPS, () => op(l.words[0]) === 0 || `opacity ${op(l.words[0])}`);
    check(`s01 ${label} lands on ${beat} (f${fr(at)}): first word at 25%+ on the beat`, fr(at) / FPS, () => op(l.words[0]) >= 0.25 || `opacity ${op(l.words[0]).toFixed(3)}`);
  };
  check("s01 f0 is the thumbnail: the mark at yaw −38°, key at 8%, no type yet", 0, () => {
    const p = hero.pose(0, state);
    if (Math.abs(p.yaw + 38) > 1e-6) return `yaw ${p.yaw}`;
    if (keyLevel(0, state) !== KEYNOTE.keyFloor) return `key ${keyLevel(0, state)}`;
    return allWords.every((w) => op(w) === 0) || "type on screen at f0";
  });
  lands("'Introducing'", intro, "bar 0 beat 2", tIntro);
  lands("'Video Skill'", name, "bar 2", tName);
  lands("'for Claude Code'", tag, "bar 2 beat 2", tFor);
  check("s01 the turn starts on bar 1 and rests at exactly −14° 1.6 s later, still to the cut", [tReveal, cutOut - F], (t) => {
    const p = hero.pose(t, state);
    if (t >= tReveal + KEYNOTE.turn) return p.yaw === -14 || `yaw ${p.yaw.toFixed(4)} at f${fr(t)}`;
    return (p.yaw <= -14 && p.yaw >= -38) || `yaw ${p.yaw.toFixed(3)} outside the turn`;
  });
  check("s01 key at 100% from bar 1 + 1.2 s to the stop", [tReveal + KEYNOTE.rise + F, state.dark], (t) => Math.abs(keyLevel(t, state) - 1) < 1e-9 || `key ${keyLevel(t, state).toFixed(3)}`);
  check(`s01 the stop: key back at 8% one frame after bar 3 beat 3 (f${fr(tStop) + 1}), and held to the cut`, [(fr(tStop) + 1) / FPS, cutOut - F], (t) =>
    Math.abs(keyLevel(t, state) - KEYNOTE.keyFloor) < 1e-9 || `key ${keyLevel(t, state).toFixed(3)}`);
  check("s01 every word fully in and held from 0.6 s after 'for Claude Code' to the cut", [tFor + 0.16 + 0.6, cutOut - F], () =>
    allWords.every((w) => op(w) > 0.999) || "a word is not fully in");
  check("s01 type sits on black: no word touches the mark", [cutIn, cutOut - F], () => {
    const hit = allWords.find((w) => overlap(w, tracker) > 0);
    return !hit || `'${hit.textContent}' overlaps the mark`;
  });
  check("s01 type and mark inside the stage (x 54–1026, y 96–1255)", [cutIn, cutOut - F], () => {
    const bad = [...allWords, tracker].map((el) => [el, box(el)]).find(([, b]) => b.x < STAGE.x0 || b.x + b.w > STAGE.x1 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1);
    return !bad || `${bad[0].id || bad[0].textContent} at x ${bad[1].x.toFixed(0)}–${(bad[1].x + bad[1].w).toFixed(0)} y ${bad[1].y.toFixed(0)}–${(bad[1].y + bad[1].h).toFixed(0)}`;
  });

  const px = (v) => `${v.toFixed(2)}px`;
  return (t) => {
    hero.render(t, state);
    const b = hero.box();
    Object.assign(tracker.style, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h) });
    layer.style.transform = `scale(${hero.drift(t, state).toFixed(5)})`;
    stagger(intro.words, t, tIntro - 2 * F);
    stagger(name.words, t, tName - 2 * F);
    stagger(tag.words, t, tFor - 2 * F);
  };
}
