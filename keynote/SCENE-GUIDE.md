# Building shots for "Video Skill: the keynote film"

You are building shots for a 55-second, Apple-keynote-style launch film of the open-source video skill, for LinkedIn. It is cut to an upbeat 124 BPM track, not to a narrator: big type lands on the beat over real output of the skill. It must look studio-grade on a phone: bold, precise, readable muted, never generic, never cluttered. Energy comes from cutting on the beat and from type that lands hard and settles; it never comes from bounce, glow or clutter.

## Read first
- `keynote/brief.md`: the direction. Your shots are under SHOTS. Follow FRAME, LOOK, MOTION, BAN and QA.
- `skills/video/animation-principles.md` and `skills/video/references/brief.md`: the numbers, the ban list and the render contract. `skills/video/references/transitions.md` for the handoffs.
- `keynote/kit.js`, `design.css`, `index.html`: the shell and the helpers. kit.js re-exports `skills/video/runtime/motion.js` (springs `{duration, damping}`, `swap`, `presence`, `style`, `sfx`, `rand`, `loopNoise`, `frames`, `check`, `box`, `overlap`), and adds `barT(bar, beat)`, `beatT(n)`, `SPB()`, `reveal()` (the keynote type reveal), `words()` + `stagger()`, `punch()`, `drift()`, `show()`, `clipWindow()`, `plot()`, `countTo()`, `typeOn()`.
- `one-minute/scenes/*.js` and `motion-lab/scenes/*.js`: finished, reviewed scenes in the same contract (one-minute's s03 plays clips in windows, s04 splits the style clips, s05 lights words from a take, s06 builds the review cards, s01 and s07 use the 3D mark). Borrow freely, but the look here is the keynote look in brief.md, not their warm one.
- `keynote/hero3d.js` (the 3D mark): `createHero(canvas, {variant, width, height, seed, framing})` returns `{render(t, state), setSize, pose}`; read its header. The hero builder is adding a "keynote" variant (black studio); until it exists, use "directed".

## Times
Every time is `barT(bar, beat)`: bar 0 starts at t = 0, a bar is 1.935 s, a beat 0.484 s (29.03 frames at 60 fps). `k.win` carries your shot's window: `{start, end, cutIn, inEnd, outStart, cutOut, inKind, outKind, from, to}` in seconds (`from`/`to` in bars). During a transition both shots are on screen, so your shot must be a finished picture from `cutIn`, and hold steady from `outStart`. Things that land "on the beat" start 2 frames early (`reveal()` lands most of its move in its first 4 frames).

| Shot | Bars | On screen (s) | In | Out |
| --- | --- | --- | --- | --- |
| s01 Introducing | 0–4 | 0–7.74 | first frame | cut |
| s02 Every frame | 4–6 | 7.74–12.01 | cut | zoom-through 11.21–12.01 |
| s03 Walkthroughs | 6–8 | 11.21–15.78 | zoom-through | whip left 15.18–15.78 |
| s04 Diagrams | 8–9 | 15.18–17.42 | whip | cut |
| s05 3D | 9–10 | 17.42–19.65 | cut | whip up 19.05–19.65 |
| s06 Loops | 10–11 | 19.05–21.29 | whip | cut |
| s07 Any style | 11–13 | 21.29–25.16 | cut | cut |
| s08 Any frame | 13–15 | 25.16–29.43 | cut | dissolve 28.63–29.43 |
| s09 Voice | 15–18 | 28.63–34.84 | dissolve | cut |
| s10 Review | 18–21 | 34.84–40.65 | cut | cut |
| s11 Checks | 21–23 | 40.65–44.92 | cut | zoom-through 44.12–44.92 |
| s12 Everything | 23–25 | 44.12–48.39 | zoom-through | cut |
| s13 Get it | 25–28.5 | 48.39–55.16 | cut | end of film |

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
