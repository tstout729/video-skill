# Building shots for "Video Skill: the keynote film"

You are building shots for a 71-second, Apple-announcement-style launch film of the open-source video skill, for LinkedIn. It is cut to a cinematic 110 BPM score, not to a narrator: big type appears over real output of the skill, held long enough to read. It must look studio-grade on a phone: bold, precise, readable muted, never generic, never cluttered. Its energy comes from cutting on the bar and from slow, continuous camera motion; it never comes from bounce, glow, clutter or rushing.

## Read first
- `keynote/brief.md`: the direction. Your shots are under SHOTS. Follow FRAME, LOOK, MOTION, BAN and QA.
- `skills/video/animation-principles.md` and `skills/video/references/brief.md`: the numbers, the ban list and the render contract. `skills/video/references/transitions.md` for the handoffs.
- `keynote/kit.js`, `design.css`, `index.html`: the shell and the helpers. kit.js re-exports `skills/video/runtime/motion.js` (springs `{duration, damping}`, `swap`, `presence`, `style`, `sfx`, `rand`, `loopNoise`, `frames`, `check`, `box`, `overlap`), and adds `barT(bar, beat)`, `beatT(n)`, `SPB()`, `reveal()` (the keynote type reveal), `words()` + `stagger()`, `punch()`, `drift()`, `show()`, `clipWindow()`, `plot()`, `countTo()`, `typeOn()`.
- `one-minute/scenes/*.js` and `motion-lab/scenes/*.js`: finished, reviewed scenes in the same contract (one-minute's s03 plays clips in windows, s04 splits the style clips, s05 lights words from a take, s06 builds the review cards, s01 and s07 use the 3D mark). Borrow freely, but the look here is the keynote look in brief.md, not their warm one.
- `keynote/hero3d.js` (the 3D mark): `createHero(canvas, {variant, width, height, seed, framing})` returns `{render(t, state), setSize, pose}`; read its header. The hero builder is adding a "keynote" variant (black studio); until it exists, use "directed".

## Times (v2: 110 BPM)
Every time is `barT(bar, beat)`: bar 0 starts at t = 0, a bar is 2.182 s, a beat 0.545 s (32.73 frames at 60 fps). `k.win` carries your shot's window: `{start, end, cutIn, inEnd, outStart, cutOut, inKind, outKind, from, to}` in seconds (`from`/`to` in bars). During a dissolve both shots are on screen, so your shot must be a finished picture from `cutIn`, and hold steady from `outStart`. Text starts 2 frames before its beat.

| Shot | Bars | On screen (s) | In | Out |
| --- | --- | --- | --- | --- |
| s01 Introducing | 0–4 | 0–8.73 | first frame | cut |
| s02 Every frame | 4–6 | 8.73–13.09 | cut | cut |
| s03 Walkthroughs | 6–8 | 13.09–17.45 | cut | cut |
| s04 Diagrams | 8–10 | 17.45–21.82 | cut | cut |
| s05 3D | 10–12 | 21.82–26.18 | cut | cut |
| s06 Loops | 12–14 | 26.18–30.95 | cut | dissolve 30.15–30.95 |
| s07 Any style | 14–17 | 30.15–37.09 | dissolve | cut |
| s08 Any frame | 17–20 | 37.09–44.04 | cut | dissolve 43.24–44.04 |
| s09 Voice | 20–23 | 43.24–50.18 | dissolve | cut |
| s10 Review | 23–27 | 50.18–58.91 | cut | cut |
| s11 Checks | 27–29 | 58.91–63.27 | cut | cut |
| s13 Get it | 29–32.5 | 63.27–70.91 | cut | end of film |

s12 (the bento) is gone in v2.

## The shot contract
Write `keynote/scenes/sNN.js` for each of your shots:

```js
export default function build(root, k) {        // root: this shot's <section>, 1080x1350; k: kit.js + k.id + k.win
  const { make, place, reveal, barT, drift, C } = k;
  root.classList.add("light");                   // light shots only; dark (black) is the default
  const t0 = barT(6, 1);                         // bar 6, beat 1
  const word = place(make("div", "hero", "Walkthroughs.", root), 54, 150);
  return (t) => {                                 // global time; called whenever the shot is on screen
    reveal(word, t, t0 - 2 / 60);
  };                                              // may return a promise (frames() clips)
}
```

- **Never style the root's opacity, transform, filter, clip-path, z-index or visibility.** transitions.js owns them. Set only its background (via the `light` class or a background color) and its content. For the drift, wrap your content in one inner element and scale that.
- **Pure function of t.** No timers, clocks, CSS transitions or animations, and no state carried between frames. `rand(seed)` at build time, never `Math.random`.
- **Staging.** One message per shot. One hero move at a time. Every text holds at least 0.3 s per word plus 0.5 s once settled.
- **Frame.** Content inside x 54–1026, y 96–1255. Text 28 px or larger, contrast 4.5:1 or more (`C` in kit.js lists which colors pass on which background; the gradient passes on black only).
- **Clips.** `const play = frames(img, {dir: "clips/<name>", fps, count})` from `clips/<name>/clip.json`; `return play(t - offset)` inside seek (clamp to the clip's range; pick the stretch that shows the most). Never a `<video>` element. `kit.clipWindow(parent, x, y, w, h, light)` gives a rounded window with an `<img>`.
- **Sound.** `sfx(t, "tap"|"pop"|"success"|"whoosh"|"toggle"|"key")` only where brief.md → SOUND names it. The music carries the hits.
- **Tests.** Declare `check()`s for your key numbers: landings on their beats, things on their marks, text inside the frame, no overlaps between important texts. Name them with your shot id first ("s02 'Every frame.' settled by f…").

## Your loop
Run everything from the repository root of the worktree, `~/projects/video-skill-keynote`. The machine is shared and busy: prefix renders with `nice -n 10`, write logs to files, retry on timeouts, set `RENDER_WORKERS=3`, and never kill a process you didn't start.

1. Build, then render stills of your shots only: `node skills/video/scripts/render.mjs keynote/index.html --stills keynote/qa/<you> --at <times>`. Pick times at every beat where something lands, at `cutIn` and just before `cutOut`. `--debug` adds a frame/time overlay.
2. Contact sheet per shot: `node skills/video/scripts/review.mjs sheet keynote/index.html --out keynote/qa/<you>-sNN.png --from <cutIn> --to <cutOut> --frames 12`. Open every image with Read, and write notes against frames before you change code.
3. Speed-graph each hero move (`review.mjs graph keynote/index.html --select "<css>" --from … --to … --out keynote/qa/<you>-graph.png`). Run `review.mjs audit keynote/index.html --grep sNN` and `review.mjs lint keynote/index.html --query finish=0`; only findings in your time range are yours.
4. Draft your time range: `node skills/video/scripts/render.mjs keynote/index.html --out keynote/qa/<you>.mp4 --from <cutIn> --to <cutOut> --fps 30 --sub 1 --scale 0.5`, and check the motion with a sheet of the MP4 or an onion skin.
5. Repeat until you have no notes left: usually 2–3 rounds. Log every round in `keynote/log/<you>.md` (format: references/brief.md → Review log).

Edit only your own files and your log. If you need a change in kit.js, design.css, index.html or the assets, don't make it; say so in your report (the hero builder owns hero3d.js). Do not use git.

## Report
For each shot: the hero move and the frame it lands on, the beats used, the checks and their results, the paths of your contact sheets, and the number of review rounds. List any changes you need in shared files.
