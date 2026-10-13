// s13 Get it · bars 29–32.5 (63.27–70.91 s) · the keynote studio · in on a cut (the final boom), to
// the end of the film. The hero move: the mark drops in from above the frame and lands in its pool
// of light (hero3d `land`: touchdown f27 with a squash, settled by LAND.settle), touchdown on the frame
// of bar 29 beat 1 with a pop one frame later. Then the card builds under it with appear() (0.9 s,
// up 24 px from 8 px of blur), each line 2 frames before its beat:
//   bar 29 beat 3   "Video Skill" (headline 148 px, the warm gradient); the end card's sweep from bar 30
//   bar 30 beat 2   "Free and open source. / Available now." (caption, the second line in Apple gray)
//   bar 31          the install pill, both commands (README.md → Install), then the repo 80 ms later
// The full card is on screen from bar 31 + 80 ms and holds, still, to the last frame.
// The camera pushes in 1.00 → 1.04 (ease-in-out over the shot); the card scales with it.
import { createHero, LAND } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, appear, barT, check, box, overlap, sfx, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, F = 1 / FPS, W = 1080, H = 1350, LEAD = 2 * F, ENTER = 0.9;
  const fr = (t) => Math.round(t * FPS);

  // ---- times ----
  const tTouch = Math.round(barT(29, 1) * FPS) / FPS;     // f3829, the frame nearest bar 29 beat 1
  const tLand = tTouch - LAND.contact / FPS;              // touchdown is land + f27
  const settled = tLand + LAND.settle / FPS;
  const tName = barT(29, 3);                              // 64.909
  const SWEEP = { at: barT(30), dur: 1.0 };               // 65.455–66.455
  const tSub = barT(30, 2);                               // 66.545
  const tInstall = barT(31);                              // 67.636
  const tRepo = tInstall + 0.08;
  const tFull = tRepo - LEAD + ENTER;                     // every line settled
  const state = { land: tLand, sweep: SWEEP, drift: { from: cutIn, to: cutOut, scale: 1.04, ease: "inout" } };

  // ---- the studio; the mark lands on the centre line, the card sits on the black under it ----
  const MARK_PX = 280, MARK_Y = 360;                      // the mark's height and resting centre
  const canvas = make("canvas", "", "", root, { position: "absolute", left: "0px", top: "0px" });
  const hero = createHero(canvas, {
    variant: "keynote", width: W, height: H, seed: 7,
    framing: { fill: MARK_PX / H, aim: [0, 0.5], center: [0.5, MARK_Y / H], landYaw: -14 },
  });
  const tracker = make("div", "", "", root, { position: "absolute", pointerEvents: "none" });
  tracker.id = "s13-mark";

  // ---- the card ----
  const layer = make("div", "", "", root, {
    position: "absolute", left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, transformOrigin: `${W / 2}px ${MARK_Y}px`,
  });
  const row = (cls, y, html = "", css = {}) => place(make("div", `${cls} center`, html, layer, css), STAGE.x0, y, STAGE.x1 - STAGE.x0);
  // The product name huge, in the film's warm colour (Apple sets the name in its colour at the end);
  // the feature line as Apple's caption, in two lines (one line at 64 px is 1,130 px wide).
  const name = row("headline", 628, `<span class="grad">Video Skill</span>`, { fontSize: "148px" });
  const sub = row("caption", 806, `Free and open source.<br><span class="soft">Available now.</span>`);
  const mono = { fontSize: "32px", fontWeight: "500", letterSpacing: "-0.01em", lineHeight: "1.2", whiteSpace: "nowrap" };
  const installRow = row("mono", 998);
  // Both commands: the plugin installs in two lines (README.md → Install).
  const install = make("span", "mono", "", installRow, {
    ...mono, display: "inline-block", color: C.white, padding: "16px 30px 18px", borderRadius: "var(--r-win)",
    background: "#0d0d0e", boxShadow: "inset 0 0 0 1px rgba(245, 245, 247, 0.16)", whiteSpace: "pre", textAlign: "left",
  });
  install.textContent = "/plugin marketplace add tstout729/video-skill\n/plugin install video-skill@video-skill";
  const repoRow = row("mono", 1142);
  const repo = make("span", "mono", "github.com/tstout729/video-skill", repoRow, { ...mono, display: "inline-block", color: C.gray });
  name.id = "s13-name"; sub.id = "s13-sub"; install.id = "s13-install"; repo.id = "s13-repo";
  const cues = [[name, tName, "bar 29 beat 3"], [sub, tSub, "bar 30 beat 2"], [install, tInstall, "bar 31"], [repo, tRepo, "bar 31 + 80 ms"]];
  const lines = cues.map(([el]) => el);

  sfx(tTouch + F, "pop");                                 // the landing, one frame after its picture

  // ---- checks ----
  const op = (el) => (el.style.visibility === "hidden" ? 0 : Number(el.style.opacity || 1));
  const ink = (el) => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  check("s13 the mark drops in from above the frame: hidden before the drop, above the top edge as it starts", [cutIn, tLand + F], (t) => {
    const b = box(tracker);
    return (t < tLand ? getComputedStyle(tracker).visibility === "hidden" : b.y + b.h <= 0) || `box bottom ${(b.y + b.h).toFixed(0)} at f${fr(t)}`;
  });
  check(`s13 touchdown on bar 29 beat 1 (f${fr(tTouch)}): in the air one frame before, on the floor on it`, [tTouch - F, tTouch], (t) => {
    const p = hero.pose(t, state);
    return (t < tTouch - F / 2 ? p.y > 0 : p.y === 0) || `lift ${p.y.toFixed(4)} at f${fr(t)}`;
  });
  check(`s13 the mark is settled by land + f${LAND.settle} (f${fr(settled)}), before 'Video Skill' starts, and still to the end`, [settled, cutOut - F], (t) => {
    const p = hero.pose(t, state);
    return (settled < tName - LEAD && Math.abs(p.sy - 1) < 0.003 && p.y === 0 && Math.abs(p.yaw + 14) < 0.3) || `sy ${p.sy.toFixed(4)} yaw ${p.yaw.toFixed(2)} at f${fr(t)}`;
  });
  check("s13 the pop sounds one frame after touchdown", cutIn, () =>
    (window.SFX || []).some((s) => s.kind === "pop" && Math.abs(s.t - (tTouch + F)) < 1e-6) || "no pop at touchdown + 1 frame");
  for (const [el, at, beat] of cues) {
    check(`s13 ${el.id} hidden 3 frames before ${beat} (f${fr(at) - 3}), entering on it (f${fr(at)})`, [(fr(at) - 3) / FPS, fr(at) / FPS], (t) =>
      (fr(t) === fr(at) - 3 ? op(el) === 0 : fr(t) === fr(at) ? op(el) > 0.05 : true) || `opacity ${op(el).toFixed(3)} at f${fr(t)}`);
  }
  check("s13 the sweep crosses the settled mark between 'Video Skill' and the subhead", 0, () =>
    (SWEEP.at > settled && SWEEP.at > tName && SWEEP.at + SWEEP.dur < tSub) || "sweep out of place");
  check(`s13 the full card is on screen from f${fr(tRepo)} (${(cutOut - tRepo).toFixed(2)} s before the end) and settled from f${fr(tFull) + 1} (${(cutOut - tFull).toFixed(2)} s)`, [(fr(tFull) + 1) / FPS, cutOut - F], () => {
    if (cutOut - tRepo < 3) return `on screen only ${(cutOut - tRepo).toFixed(2)} s`;
    const off = lines.find((el) => op(el) < 0.999 || !/translate\(0(\.00)?px, 0(\.00)?px\)/.test(el.style.transform));
    return !off || `${off.id} at ${op(off).toFixed(3)} ${off.style.transform}`;
  });
  check("s13 the mark and every line clear each other", [tLand, cutOut - F], () => {
    const els = [tracker, ...lines];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      if (overlap(els[i], els[j]) > 0) return `${els[i].id} x ${els[j].id}`;
    }
    return true;
  });
  check("s13 the card and the mark inside the stage from touchdown (the drop enters through the top edge)", [tTouch, cutOut - F], () => {
    const bad = [...[name, sub].map((el) => [el, ink(el)]), ...[install, repo, tracker].map((el) => [el, box(el)])]
      .filter(([el]) => op(el) > 0)
      .find(([, b]) => b.x < STAGE.x0 || b.x + b.w > STAGE.x1 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1);
    return !bad || `${bad[0].id} at x ${bad[1].x.toFixed(0)}–${(bad[1].x + bad[1].w).toFixed(0)} y ${bad[1].y.toFixed(0)}–${(bad[1].y + bad[1].h).toFixed(0)}`;
  });

  const px = (v) => `${v.toFixed(2)}px`;
  return (t) => {
    hero.render(t, state);
    const b = hero.box();
    Object.assign(tracker.style, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h), visibility: b.visible ? "visible" : "hidden" });
    layer.style.transform = `scale(${hero.drift(t, state).toFixed(5)})`;
    for (const [el, at] of cues) appear(el, t, at - LEAD);
  };
}
