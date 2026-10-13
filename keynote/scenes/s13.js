// s13 Get it · bars 25–28.5 (48.39–55.16 s) · the keynote studio · in on a cut, to the end of the film.
// The end card. The hero move: the mark drops in from above the frame and lands in its pool of light
// (hero3d `land`: touchdown f27 with a squash, settled by LAND.settle), touchdown on the frame of
// bar 25 beat 1 with a pop one frame later. Then the card builds under it, one line per beat:
//   bar 25 beat 2   "Video Skill" (hero); the end card's specular sweep at bar 25 beat 2.5
//   bar 26          "Free and open source."
//   bar 26 beat 2   /plugin marketplace add tstout729/video-skill (mono, in a hairline pill),
//                   then github.com/tstout729/video-skill 80 ms later
// The full card is in by 51.76 s and holds 3.4 s, still, to the last frame.
import { createHero, LAND } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, reveal, words, stagger, barT, check, box, overlap, sfx, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, F = 1 / FPS, W = 1080, H = 1350;
  const fr = (t) => Math.round(t * FPS);

  // ---- times ----
  const tTouch = Math.round(barT(25, 1) * FPS) / FPS;     // f2932, the frame nearest bar 25 beat 1
  const tLand = tTouch - LAND.contact / FPS;              // touchdown is land + f27
  const settled = tLand + LAND.settle / FPS;
  const tName = barT(25, 2);                              // 49.355
  const tFree = barT(26);                                 // 50.323
  const tInstall = barT(26, 2);                           // 51.290
  const tRepo = tInstall + 0.08;
  const tFull = cutOut - 3.4;                             // the full card holds 3.4 s
  const state = { land: tLand, sweep: barT(25, 2.5), drift: { from: cutIn, to: cutOut, amount: 0.015 } };

  // ---- the studio; the mark lands on the centre line, the card sits on the black under it ----
  const MARK_PX = 320, MARK_Y = 424;                      // the mark's height and resting centre
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
  const row = (cls, y, css = {}) => place(make("div", `${cls} center`, "", layer, css), STAGE.x0, y, STAGE.x1 - STAGE.x0);
  const nameRow = row("hero", 742);
  const name = words(nameRow, "Video Skill");
  const freeRow = row("h2", 930);
  const free = words(freeRow, "Free and open source.");
  const mono = { fontSize: "32px", fontWeight: "500", letterSpacing: "-0.01em", lineHeight: "1.2", whiteSpace: "nowrap" };
  const installRow = row("mono", 1040);
  // Both commands: the plugin installs in two lines (README.md → Install).
  const install = make("span", "mono", "", installRow, {
    ...mono, display: "inline-block", color: C.white, padding: "16px 30px 18px", borderRadius: "var(--r-win)",
    background: "#0d0d0e", boxShadow: "inset 0 0 0 1px rgba(245, 245, 247, 0.16)", whiteSpace: "pre", textAlign: "left",
  });
  install.textContent = "/plugin marketplace add tstout729/video-skill\n/plugin install video-skill@video-skill";
  const repoRow = row("mono", 1178);
  const repo = make("span", "mono", "github.com/tstout729/video-skill", repoRow, { ...mono, display: "inline-block", color: C.mutedDark });
  nameRow.id = "s13-name"; freeRow.id = "s13-free"; install.id = "s13-install"; repo.id = "s13-repo";
  const lines = [...name, ...free, install, repo];

  sfx(tTouch + F, "pop");                                 // the landing, one frame after its picture

  // ---- checks ----
  const op = (el) => (el.style.visibility === "hidden" ? 0 : Number(el.style.opacity || 1));
  const lands = (label, el, beat, at) => {
    check(`s13 ${label} hidden 3 frames before ${beat} (f${fr(at) - 3})`, (fr(at) - 3) / FPS, () => op(el) === 0 || `opacity ${op(el)}`);
    check(`s13 ${label} lands on ${beat} (f${fr(at)}): 25%+ on the beat`, fr(at) / FPS, () => op(el) >= 0.25 || `opacity ${op(el).toFixed(3)}`);
  };
  check("s13 the mark drops in from above the frame: hidden before the drop, above the top edge as it starts", [cutIn, tLand + F], (t) => {
    const b = box(tracker);
    return (t < tLand ? getComputedStyle(tracker).visibility === "hidden" : b.y + b.h <= 0) || `box bottom ${(b.y + b.h).toFixed(0)} at f${fr(t)}`;
  });
  check(`s13 touchdown on bar 25 beat 1 (f${fr(tTouch)}): in the air one frame before, on the floor on it`, [tTouch - F, tTouch], (t) => {
    const p = hero.pose(t, state);
    return (t < tTouch - F / 2 ? p.y > 0 : p.y === 0) || `lift ${p.y.toFixed(4)} at f${fr(t)}`;
  });
  check(`s13 the mark is still to within 1 px when 'Video Skill' lands, and settled by land + f${LAND.settle} (${settled.toFixed(2)} s), before bar 26`, [tName - 2 * F, cutOut - F], (t) => {
    const p = hero.pose(t, state);
    return (Math.abs(p.sy - 1) * MARK_PX < 1 && p.y === 0 && Math.abs(p.yaw + 14) < 0.6 && settled < tFree) || `sy ${p.sy.toFixed(4)} yaw ${p.yaw.toFixed(2)} at f${fr(t)}`;
  });
  check("s13 the pop sounds one frame after touchdown", cutIn, () =>
    (window.SFX || []).some((s) => s.kind === "pop" && Math.abs(s.t - (tTouch + F)) < 1e-6) || "no pop at touchdown + 1 frame");
  lands("'Video Skill'", name[0], "bar 25 beat 2", tName);
  lands("'Free and open source.'", free[0], "bar 26", tFree);
  lands("the install line", install, "bar 26 beat 2", tInstall);
  check("s13 the repo line follows the install line by 80 ms", cutIn, () => Math.abs(tRepo - tInstall - 0.08) < 1e-9);
  check(`s13 the full card is in (99%) by ${tFull.toFixed(2)} s and holds 3.4 s to the last frame`, [tFull, cutOut - F], () => {
    const off = lines.find((el) => op(el) < 0.99);
    return !off || `'${off.textContent}' at ${op(off).toFixed(3)}`;
  });
  check("s13 the card holds still once in: no line moves after it settles", [tRepo + 0.6, cutOut - F], () =>
    lines.every((el) => /scale\(1(\.0+)?\)/.test(el.style.transform) && /translate\(0(\.00)?px, 0(\.00)?px\)/.test(el.style.transform)) || "a line is still moving");
  check("s13 the mark and every line clear each other", [settled, cutOut - F], () => {
    const els = [tracker, ...lines];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      if (overlap(els[i], els[j]) > 0) return `${els[i].id || els[i].textContent} x ${els[j].id || els[j].textContent}`;
    }
    return true;
  });
  check("s13 the card and the mark inside the stage from touchdown (the drop enters through the top edge)", [tTouch, cutOut - F], () => {
    const bad = [...lines, tracker].filter((el) => op(el) > 0 && getComputedStyle(el).visibility !== "hidden").map((el) => [el, box(el)])
      .find(([, b]) => b.x < STAGE.x0 || b.x + b.w > STAGE.x1 || b.y + b.h > STAGE.y1 || (b.y < STAGE.y0 && b.y + b.h > 0));
    return !bad || `${bad[0].id || bad[0].textContent} at x ${bad[1].x.toFixed(0)}–${(bad[1].x + bad[1].w).toFixed(0)} y ${bad[1].y.toFixed(0)}–${(bad[1].y + bad[1].h).toFixed(0)}`;
  });

  const px = (v) => `${v.toFixed(2)}px`;
  return (t) => {
    hero.render(t, state);
    const b = hero.box();
    Object.assign(tracker.style, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h), visibility: b.visible ? "visible" : "hidden" });
    layer.style.transform = `scale(${hero.drift(t, state).toFixed(5)})`;
    stagger(name, t, tName - 2 * F);
    stagger(free, t, tFree - 2 * F);
    reveal(install, t, tInstall - 2 * F);
    reveal(repo, t, tRepo - 2 * F);
  };
}
