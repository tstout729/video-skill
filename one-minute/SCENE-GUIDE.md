# Building scenes for "The video skill, in one minute"

You are building scenes for a 56-second LinkedIn showcase of the open-source video skill. Each scene demonstrates one capability with real output of the skill, and the whole film is made with the skill. It is the post a stranger decides to watch or scroll past, so it must look studio-grade on a phone: bold, precise, readable muted, never generic, never cluttered.

## Read first
- `one-minute/brief.md`: the direction. Your scenes are under SHOTS. Follow FRAME, LOOK, MOTION, BAN and QA.
- `skills/video/animation-principles.md` and `skills/video/references/brief.md`: the numbers, the ban list and the render contract. `skills/video/references/transitions.md` if your scene uses transitions inside it.
- `one-minute/kit.js`, `design.css`, `index.html`: the shell and the helpers. kit.js re-exports `skills/video/runtime/motion.js` (springs `{duration, damping}`, `swap`, `presence`, `style`, `sfx`, `rand`, `loopNoise`, `frames`, `check`, `box`, `overlap`).
- `motion-lab/scenes/*.js`: 21 finished, reviewed scenes in the same contract. Borrow freely: s01 and s21 use the 3D hero, s16 builds the review images, s05 types numbers on.
- `one-minute/hero3d.js` (the 3D mark):
  - `createHero(canvas, {variant: "directed", width, height, seed, framing})` returns `{render(t, state), setSize, pose}`.
  - `state = {hop, land, push, yaw}`: start times in the same clock as the `t` you pass.
  - Hop: anticipation f0–f4, leaves the floor f6, apex f21, touchdown f36, squash f38–f40, settled f65. Land: touchdown f27, settled f63.
  - Read its header. Create heroes once at build time, and call `render()` inside your seek on every frame your scene is on screen.

## Times
Narration times are in `words.js`. The windows (seconds):

| Scene | On screen | Narration | In | Out |
| --- | --- | --- | --- | --- |
| s01 Hook | 0–5.00 | 0.60–4.68 | first frame | cut |
| s02 The brief | 5.00–13.93 | 5.78–12.98 | cut | push up, 13.03–13.93 |
| s03 The range | 13.03–22.50 | 14.08–22.00 | push up | cut |
| s04 Style packs | 22.50–29.75 | 23.10–28.70 | cut | wipe, 28.85–29.75 |
| s05 Voice | 28.85–35.53 | 29.80–34.68 | wipe | zoom-through, 34.73–35.53 |
| s06 Review | 34.73–47.07 | 35.78–46.02 | zoom-through | light leak, 46.07–47.07 |
| s07 End card | 46.07–55.92 | 47.12–51.92 | light leak | end of film |

`k.win` carries them: `{start, end, cutIn, inEnd, outStart, cutOut, inKind, outKind}`. During a transition both scenes are on screen, so your scene must be a finished picture from `cutIn`, and hold steady from `outStart`.

## The scene contract
Write `one-minute/scenes/sNN.js` for each of your scenes:

```js
export default function build(root, k) {        // root: this scene's <section>, 1080x1350; k: kit.js + k.id + k.win
  const { make, place, show, cueIn, chrome, C } = k;
  root.style.background = C.ink; root.classList.add("dark");   // light scenes: leave the class off
  chrome(root, 2, "THE BRIEF", true);
  const t0 = cueIn(k.id, "numbers");             // cue times are searched only inside this scene
  const word = place(make("div", "hero-word", "premium", root), 54, 420);
  return (t) => {                                 // global time; called whenever the scene is on screen
    show(word, t, t0);
  };                                              // may return a promise (frames() clips)
}
```

- **Never style the root's opacity, transform, filter, clip-path, z-index or visibility.** transitions.js owns them. Set only its background and the `dark` class.
- **Pure function of t.** No timers, clocks, CSS transitions or animations, and no state carried between frames. `rand(seed)` at build time, never `Math.random`.
- **Staging.** One element per cue. One hero move at a time. Holds of at least 1.5 s plus 0.33 s per new word on a settled state.
- **Frame.** Chrome at y 68–110 (`kit.chrome(root, n, NAME, dark)`). Content inside x 54–1026, y 140–1100. The caption band (y 1110–1255) and everything below it stay empty. Text 28 px or larger, contrast 4.5:1 or more (the palette in kit.js `C` lists which colors pass on which background).
- **Clips.** `const play = frames(img, {dir: "clips/<name>", fps, count})` from `clips/<name>/clip.json`; `return play(t - offset)` inside seek. Never a `<video>` element. `kit.clipWindow(parent, x, y, w, h, dark)` gives a rounded window with an `<img>`.
- **Sound.** `sfx(t, "tap"|"pop"|"success"|"whoosh"|"toggle"|"key")` only on visible hits. At most 3 per scene.
- **Tests.** Declare `check()`s for your key numbers: settle frames, things on their marks, nothing over the caption band, no overlaps between important texts. Name them with your scene id first ("s02 card settles by f…").

## Your loop
Run everything from `one-minute/`. The machine is shared and busy: prefix renders with `nice -n 10`, write logs to files, retry on timeouts, and never kill a process you didn't start.

1. Build, then render stills of your scenes only: `node ../skills/video/scripts/render.mjs index.html --stills qa/<you> --at <times>`. Pick times at every cue, at `cutIn` and just before `cutOut`. `--debug` adds a frame/time/cue overlay while iterating.
2. Contact sheet per scene: `node ../skills/video/scripts/review.mjs sheet index.html --out qa/<you>-sNN.png --from <cutIn> --to <cutOut> --frames 12`. Open every image with Read, and write notes against frames before you change code.
3. Speed-graph each hero move (`review.mjs graph index.html --select "<css>" --from … --to … --out qa/<you>-graph.png`). Run `review.mjs audit index.html --grep sNN` and `review.mjs lint index.html --query finish=0`; only findings in your time range are yours.
4. Draft your time range: `node ../skills/video/scripts/render.mjs index.html --out qa/<you>.mp4 --from <cutIn> --to <cutOut> --fps 30 --sub 1 --scale 0.5 --debug`, and check the motion with a sheet of the MP4 or an onion skin.
5. Repeat until you have no notes left: usually 3–4 rounds. Log every round in `one-minute/log/<you>.md` (format: references/brief.md → Review log).

Edit only your own scene files and your log. If you need a change in kit.js, design.css, index.html, hero3d.js or the assets, don't make it; say so in your report. Do not use git.

## Report
For each scene: the hero move and its settle frame, the cues used, the checks and their results, the paths of your contact sheets, and the number of review rounds. List any changes you need in shared files.
