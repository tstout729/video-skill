# Building scenes for "Motion Lab, explained"

You are building scenes for a 5.5-minute explainer of Florence's article "Opus 5.5 Motion Lab". It is made entirely with the open-source video skill, and it goes on LinkedIn, so it must be studio-grade: calm, precise, readable on a phone, and never generic.

## Read first
- `motion-lab/brief.md`: the direction. Your scenes are listed under SHOTS. Follow LOOK, MOTION, BAN and QA.
- Florence's article (https://x.com/flxrnc/status/2105311836190978392), as summarized for the build. Every fact on screen must match it.
- `skills/video/animation-principles.md` and `skills/video/references/brief.md`: the numbers, the ban list and the render contract.
- `motion-lab/kit.js`, `design.css`, `index.html`: the shell and the helpers you build with.
- `skills/video/runtime/motion.js`, re-exported by kit.js: springs (`{duration, damping}`), `swap`, `presence`, `style`, `sfx`, `rand`, `loopNoise`, `phase`, `frames`, `check`, `box`, `overlap`.
- `motion-lab/hero3d.js`, for the 3D hero:
  - `createHero(canvas, {variant: "default" | "directed", width, height, seed, framing})` returns `{render(t, state), setSize, pose}`.
  - `state = {hop, land, push, dim}`, where `hop`/`land` are the start times of those moves.
  - Hop: anticipation f0–f4, leaves the floor f6, apex f21, touchdown f36, squash f38–f40, settled f65.
  - Land: touchdown f27, settled f63.
  - Read its header comment. Create heroes once at build time and call `render()` inside your seek, every frame your scene is on.

## The scene contract
Write `motion-lab/scenes/sNN.js` for each of your scenes:

```js
export default function build(root, k) {     // root: this scene's <section> (1080x992 stage); k: everything in kit.js + k.id + k.win
  const { make, show, cueIn, spring01, place } = k;
  const t0 = cueIn(k.id, "premium");          // cue times searched only inside this scene
  const title = place(make("div", "h1", "…", root), 80, 120);
  return (t) => {                              // global time; called only while this scene is on screen
    show(title, t, t0);
  };                                           // may return a promise (frames() clips)
}
```

- **Window.** `k.win = {start, end, cutIn, cutOut}`. The shell shows your scene from `cutIn` to `cutOut` and hard-cuts on the beat. Be fully composed at `cutIn` (the first frame of your scene is a finished picture), and hold steady near `cutOut`. Don't animate out across the cut unless you mean to.
- **Pure function of t.** No timers, clocks, CSS transitions or animations, and no state carried between frames. Use `rand(seed)` at build time, never `Math.random`.
- **Staging.** One element per cue (`cueIn(k.id, "words")`, with `nth` for repeats). One hero move at a time. Holds of at least 1.5 s plus 0.33 s per word.
- **Style.** Use design.css classes (`h1`, `h2`, `body`, `small`, `label`, `mono`, `card`, `chip red|green|accent`) and kit helpers (`show`, `place`, `typeOn`, `countTo`, `note`, `plot`). Keep text 28 px or larger. Stay inside the stage. The shell clips at y 992, and the caption band below belongs to captions only.
- **Sound.** `sfx(t, "tap"|"pop"|"success"|"whoosh"|"toggle"|"key")` only on visible hits, sparingly. At most 3 per scene.
- **Tests.** Declare `check()`s for your scene's key numbers: settle frames, things on their marks, and no overlaps between important elements.
- **Assets** in `motion-lab/`:
  - `assets/sheet.png`, `onion.png`, `graph.png`: real review-tool outputs of the 3D hop.
  - `assets/wt-before-1123.jpg`, `wt-after-1123.jpg`: a real catch of an empty gray box mid-morph, and its fix.
  - `clips/explainer`, `clips/walkthrough`, `clips/loop`: image sequences with `clip.json`, used with `frames()`.

## Your loop
1. Build, then render stills of your scenes only. Run from `motion-lab/`:
   `node ../skills/video/scripts/render.mjs index.html --stills qa/<you> --at <times>`
   Pick times at every cue and at the cuts. Use `--debug` while iterating.
2. Make a contact sheet per scene with `node ../skills/video/scripts/review.mjs sheet index.html --out qa/<you>-sNN.png --from <cutIn> --to <cutOut> --frames 12`. Open every image with Read, and write notes against frames before you change code.
3. Speed-graph each hero move with `review.mjs graph index.html --select "<css>" --from … --to …`, and run `review.mjs audit index.html`. Other scenes' checks may also run; only yours must pass.
4. Make a draft of your time range with `node ../skills/video/scripts/render.mjs index.html --out qa/<you>.mp4 --from <first cutIn> --to <last cutOut> --fps 30 --sub 1 --scale 0.5 --debug`, and check its motion.
5. Repeat until you have no notes left: usually 3–4 rounds. Log every round in `motion-lab/log/<you>.md` (format: references/brief.md → Review log).

The machine is shared and busy. Prefix renders with `nice -n 10`, write logs to files, retry on timeouts, and never kill a process you didn't start. Edit only your own scene files and your log. If you need a change in kit.js, design.css, index.html or hero3d.js, don't make it; describe it in your report. Do not use git.

## Report
For each scene:
- the hero move and its settle frame;
- the cues used;
- the checks and their results;
- the paths of your contact sheets;
- the number of review rounds.

Also list any changes you need in shared files.
