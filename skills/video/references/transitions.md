# Transitions and the film finish

`runtime/transitions.js` changes one scene into the next, and adds an optional film finish: grain, a vignette and light sweeps. `review.mjs cuts` checks that motion carries across every cut and transition. `mux.py --lut` grades the finished picture.

A cut is still the default handoff between shots ([directed brief](brief.md)). A transition is a deliberate choice; write it into the brief's shot list. One kind repeated at every change reads as a slideshow, however good the shots are.

```js
import { scenes, transition, finish } from "/_skill/runtime/transitions.js";
```

The [transitions example](../examples/transitions/) shows every kind once, labeled, with the finish on.

## Scenes and roots

A scene root is one element that holds one shot. It is an absolutely positioned box that fills the stage, with its own background. Put all the roots side by side in one container, and keep captions and the finish layer outside it:

```html
<div id="scenes" style="position:absolute; inset:0; overflow:hidden; background:#161513">
  <section class="scene" id="s1">...</section>
  <section class="scene" id="s2">...</section>
  <section class="scene" id="s3">...</section>
</div>
<div id="captions"></div>
<div id="finish"></div>
```

`scenes()` plays a whole film. Pass the roots with one transition spec between each pair, in time order:

```js
const film = scenes([
  "#s1", { at: 4.2, kind: "cut" },
  "#s2", { at: 9.0, kind: "push", dir: "up" },
  "#s3",
]);
window.seek = (t) => {
  drawContent(t);   // the content inside each root first: a morph measures its outlines on the frame
  film(t);          // then which scenes show, and how
  captions("#captions", t);
};
window.VIDEO = { width: 1920, height: 1080, duration: 14, cuts: film.cuts };
```

At each moment `film(t)` shows one scene, or the two scenes in a transition, and hides the rest. It throws when a transition starts before the one before it ends.

`transition(t, spec, outEl, inEl)` sets both scenes' looks for one change. Before `at` only the old scene shows; from `at + dur` only the new one. Call it on every frame. Use it alone for a two-scene piece; `scenes()` calls it for each pair.

The transitions own each root's opacity, transform, filter, clip-path, mask, z-index and visibility. Animate the content inside a root, never the root itself. Everything is a pure function of t, like `motion.js`.

## The kinds

A spec is `{ at, kind, dur, dir, ... }`. `at` is when the transition starts, in seconds. `dur` defaults to the kind's own length.

| Kind | Default | What happens | Use it for |
| --- | --- | --- | --- |
| `cut` | 0 s | Nothing in between. Listed in `film.cuts`. | The default handoff |
| `dissolve` | 0.8 s | The new scene fades in over the old one, which stays opaque underneath, so the picture never dips toward the stage color. | Time passing; two unrelated shots |
| `push` | 1.0 s | Both scenes travel one frame together, on a cubic ease-in-out. `dir`: `left` (default), `right`, `up`, `down`, the way the picture moves. | The next step in a sequence |
| `zoom-through` | 0.8 s | The old scene rushes past the camera to 2.5× with blur 8 (cubic ease-in) and fades from 40% to 90% of the way. The new one arrives from 0.5× with blur 8, nearly full size before the old one thins (quintic ease-out). `origin` zooms through a point, `[x, y]` in stage pixels. `outScale`, `inScale` and `blur` change the numbers. | Going into a detail |
| `whip` | 0.8 s | A camera whip: a hard pull to a peak speed at the handoff, then a long settle (quartic in and out). The scenes sit side by side, so the seam crosses the frame at the peak, hidden in streaks: a blur along the move as wide as the speed (`streak`, at most 48 px). `dir` as for push. | Energy between two beats |
| `wipe` | 0.9 s | A moving edge reveals the new scene. `shape`: `"linear"` (along `dir`, or an angle in degrees), `"iris"` (a circle from `origin`, default the center), or a function `(p, {width, height}) => clip-path`. `soft` is the edge's width in px (default 2). `band: "#hex"` leads a linear edge with a solid band. | A reveal with an edge |
| `light-leak` | 1.0 s | Warm light strikes the film near one edge, peaks at the handoff and recedes; the scenes swap underneath the peak. `dir` is the way the light travels; `seed` changes its shape. | Warmth, at most once per film |
| `morph` | 1.2 s | A shape bridges the scenes. The old scene closes into a window shaped like `from`, the outline morphs into `to` on the bare stage, and the new scene opens out of it. | One object becoming the next |

### Durations

The defaults are the teaser and launch-film column of [animation principles](../animation-principles.md): a scene change takes 0.8–1.2 s. Explainers and training take the longer column, 1.0–1.8 s, because the viewer is learning the screen. Pass `dur` there:

| Kind | Teaser, loop, launch | Explainer, training |
| --- | --- | --- |
| dissolve, zoom-through, whip | 0.8 s | 1.0–1.2 s |
| wipe | 0.9 s | 1.1–1.4 s |
| push, light leak | 1.0 s | 1.2–1.5 s |
| morph | 1.2 s | 1.5–1.8 s |

A whip keeps its speed at any length: most of its travel happens in the middle third.

### Morph

`from` and `to` are each an outline: an SVG shape (`path`, `circle`, `rect`, `ellipse`, `polygon`), any other element (its border box with its corner radius, so `border-radius: 50%` is a circle), or a list of `[x, y]` points in stage pixels. Both outlines are resampled to 96 points, evenly along their length. They are turned the same way round and lined up, so point i of one is the nearest point i of the other. The shape travels on a gentle arc. Its fill moves from the first outline's color to the second's; `fromColor` and `toColor` override them.

The phases take 30%, 35% and 35% of `dur`. The bare stage between them is the scenes container's background, so give it one that contrasts with both shapes.

- **Measure on the frame.** The morph reads both outlines on every frame. Set the content of your scenes for frame t before you call `film(t)`. Otherwise the outline comes from the frame rendered before, and frames differ by render order.
- **Use simple shapes.** Circles, rounded rectangles and simple icons work best. A window scaled from a deeply concave outline does not cover the frame cleanly.

## Overlap and the narration

A cut puts one scene right after the other. A transition overlaps them: for `dur` seconds both scenes are on screen. Laid end to end, three scenes of 4 s make 12 s; with two 0.8 s dissolves between them they make 10.4 s. Every transition shortens the picture by its own length.

In a narrated video the voice fixes when each scene starts (`timeline.py`), so the picture must not shrink. The transition takes its time from the silence between scenes instead:

- Start it after the outgoing narration ends, and finish it before the next scene's narration starts: `{ at: sceneEnd("s02") + 0.1, kind: "dissolve" }` must end by `sceneStart("s03")`.
- `timeline.py` leaves 0.7 s between scenes by default, which is too short for any transition here. Widen it in `narration.json` to the transition's length plus about 0.3 s: `"timeline": {"gap": 1.1}` for 0.8 s transitions.
- If you plan scene lengths by hand (the narration's length plus a hold), add each transition's length to the scene it leaves. Otherwise the picture runs ahead of the voice by the sum of the transitions: after three 0.8 s dissolves, 2.4 s ahead.
- A transition must never cover the words that name what the new scene shows. Cue the new scene's first move after the transition ends.

## Cuts and VIDEO.cuts

List hard cuts in `VIDEO.cuts`, and only hard cuts. `film.cuts` lists the `cut` specs, so pass it through. On a hard cut, `render.mjs` keeps motion blur from blending the last frame of one shot into the first of the next. A transition is not a hard cut. Its frames should blend, because the picture moves through them, so it is never listed.

## The film finish

The finish is for launch films and social posts only. It is banned in walkthroughs, training and explainers: grain and a vignette lower the contrast of the text that the viewer must read, and a training video should look like the product, not like film. It is off by default. Each treatment is off unless you name it.

The page adds an empty layer above everything, captions included, and calls `finish()` at the end of `seek`:

```js
finish("#finish", t, { grain: true, vignette: true, sweeps: { "title lands": 2.2, "end card": { at: 24, dur: 1 } } });
```

- **Grain.** SVG noise, in dark and light specks with no overall change in brightness. `true` is 0.05; pass a number for another strength, and `grainSize` (0.55) for the noise frequency: lower is coarser. A new field appears about 12 times a second (`rate`), never every frame. Fresh noise on every frame defeats the encoder's frame-to-frame compression and reads as sizzle. Measure the cost: the transitions example (29.5 s at 1080p60, `render.mjs`'s CRF 15) is 4.9 MB with no grain, 197 MB with grain 12 times a second, and 733 MB with grain on every frame, 3.7× more again. Grain is expensive at any rate, so deliver through `export.py`, whose bitrate cap brings the same film to 59.5 MB for YouTube and 44.7 MB for LinkedIn with the grain intact. The field is keyed on `Math.round(t * fps)`, the frame, with `fps` 60 by default: every subframe of a frame rounds to that frame, so motion blur never blends two fields into one frame. Pass `fps` when you render at another rate.
- **Vignette.** The corners are darkened by this alpha; `true` is 0.15. The center is untouched.
- **Light sweeps.** A soft band of light (12% white at its peak) crosses the frame once for each named beat. Name the beats in the brief, such as "the title lands" or "the end card". A sweep on a timer is a screensaver; a sweep on a beat is punctuation.
- **Plain alpha only.** Every layer is drawn over the picture with plain alpha. Never use `mix-blend-mode` on an overlay. An overlay layer has no picture behind it to blend with, so a multiply vignette paints its own near-white color: product-launch-motion's first grade turned a whole film white that way. Never put `will-change` on the finish layer either: on Metal, a separately composited grain layer renders a few levels differently from run to run.
- **Contrast.** The finish lowers measured contrast. Check text contrast with the finish off: render stills with `render.mjs index.html --stills qa/plain --query finish=0`, lint with `review.mjs lint index.html --query finish=0`, or open the page with `?finish=0` (with `render.mjs --serve`).

### A LUT at the mix step

`mux.py --lut grade.cube` grades the whole picture through a 3D LUT (`.cube`, `.3dl`, `.dat`, `.m3d` or `.csp`) with ffmpeg's `lut3d`, in 16-bit RGB with tetrahedral interpolation, and re-encodes the video at the renderer's quality (`-tune film` keeps grain from smearing). Without `--lut` the picture is copied untouched. `mux.py` stops with an explanation when ffmpeg has no `lut3d`; check with `ffmpeg -hide_banner -filters | grep lut3d`.

Use a LUT for launch films and social posts only, like the rest of the finish. Keep it subtle, and check text contrast after it.

## The cut check

`node <skill>/scripts/review.mjs cuts index.html --out qa/cuts.png` measures the motion on each side of every hard cut in `VIDEO.cuts`, and of the start, the handoff and the end of every transition from `transitions.js` (`window.TRANSITIONS`).

- **What it measures.** It reads the box of every visible element on 4 frames before and 4 frames after each point (at 60 fps). It fits them to one translation and one zoom, weighted by visible area and opacity. Layers marked `data-fx` (the finish, a light leak) are left out.
- **When it warns.** It warns when the speed changes more than 3× across the point, or when the direction or the zoom reverses while both sides clearly move. Still counts as 0.1% of the frame's width per frame. Still next to slow passes; still next to fast does not, because a shot that starts at full speed on its first frame jolts.
- **The strip.** It renders a strip of frames across each edit, with every frame's own motion: an arrow and px per frame, and a ring for a zoom. A red line marks a hard cut. It also prints one line per edit.
- **Notes.** It notes a `cut` spec that is missing from `VIDEO.cuts`, and a `VIDEO.cuts` time that falls inside a transition.

Fix a warning in one of these ways:
- Match the speed and direction on each side.
- Let the old shot settle before the cut.
- Start the new shot's first move after the cut, from rest.

The check found a real flaw in the example's first draft. The zoom-through's old scene was still a faint ghost zooming at full speed in its last frames, then vanished: a 12× speed jump at the transition's end. Fading it out by 90% of the way fixed it.

The check sees DOM elements only. For a three.js or canvas scene, pin an invisible element to the object's projected position, as for `review.mjs graph`.

## Credits

The transitions build on ideas, not code, from three MIT-licensed projects:
- [AbubakrChan/product-launch-motion](https://github.com/AbubakrChan/product-launch-motion): the zoom-through's numbers, transitions that overlap their scenes, and the grade (grain re-seeded at 12 Hz, a 0.15 vignette, sweeps on story beats, and no blend modes on overlays);
- [haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill): the whip pan that hides its cut mid-move;
- [cth9191/animate](https://github.com/cth9191/animate): the morph bridge of shrink, morph and grow, with outlines resampled to 96 points.

The cut check follows the idea of the seam check in [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) (Apache-2.0): velocity measured on each side of a cut, with a warning above a 3× ratio. The code here is this skill's own.
