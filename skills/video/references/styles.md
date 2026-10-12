# Style packs: riso, pixel art and cut paper

A style pack is an art direction in code: one module that draws every frame in a medium, plus the rules for how that medium looks and moves. Three packs live in `runtime/styles/`:

| Pack | Module | The medium |
| --- | --- | --- |
| Riso | `riso.js` | Three ink plates screened into halftone dots, overprinted and slightly off register, on paper |
| Pixel art | `pixel.js` | A small framebuffer in a limited palette, dithered, scaled up with hard pixels |
| Cut paper | `cut-paper.js` | Layered paper pieces with soft shadows, grain, a hand-placed tilt, and crayon lines that boil |

Use a pack for explainers and social shorts that should look made by hand. Never use one for a product walkthrough: a walkthrough shows the real screen, in the product's own colors and fonts.

Pick one pack per video and keep to its rules. The rules below are written as the LOOK and MOTION lines of a [directed brief](brief.md); copy them into the brief and add the pack's BAN list to yours.

## How the packs work

- Each pack draws into one `<canvas>` the size of the video (pixel art: a smaller canvas that CSS scales up). Make it with the pack's function, then call its `frame(t, draw)` inside `window.seek(t)`. Everything is a pure function of `t`: textures, cuts and registration are seeded, so any frame renders the same in any order.
- **Stepped time.** Pixel art and cut paper move "on twos": a new drawing every 2 frames at 24 fps, 12 drawings a second. The drawing number is `Math.round(t * fps / 2)` (`stepOf` in `common.js`). Read every track at the stepped time the pack hands you (`g.t`, `s.t`, or `pack.time(t)`), so motion, boil and blinking all change on the same frames. Riso moves on ones; only its print shimmer is on twos.
- **Render at 24 fps with one subframe:** set `fps: 24, sub: 1` in `window.VIDEO`, and `render.mjs index.html --out render/video.mp4` uses them (or pass `--fps 24 --sub 1`). Motion blur would blend two drawings on the frames where they change, and smear halftone dots and pixels. At 48, 60 or 72 fps each drawing also lasts a whole number of frames (4, 5 or 6). At 30 fps drawings alternate between 2 and 3 frames, and the timing judders.
- **Loops:** pass `loop: <seconds>` to the pack, and make the loop a whole number of drawings (an even number of frames). The drawing number then wraps, so the last frame and frame 0 are one drawing.
- **Shapes** are point lists `[[x, y], ...]` from `common.js`: `circle`, `ellipse`, `rect`, `roundRect`, `curve` (smooth through points), `transform` (move, rotate in degrees, scale). All three packs draw them. Riso also takes SVG path strings and `Path2D`.
- **Seeds and keys.** Each pack takes a `seed`. In cut paper, give every piece a `key`: its cut, tilt and grain come from it, so a piece looks the same on every frame and only its boil changes.
- **Start from the examples.** `examples/styles/` tells one 10.5-second story ("How a seed grows") in all three packs, from the same timeline in `story.js`. Copy the folder for your pack.

## Riso

**USE:** posters, playful explainers, editorial shorts, anything that should feel printed in a small studio.

**LOOK:** warm uncoated paper (`#f3eee3`) and three inks. The default trio is aqua `#5ec8e5`, fluorescent pink `#ff48b0` and yellow `#ffe800` (`INKS` has other common Riso inks). Every color is a plate tone or an overprint: aqua + yellow prints green, pink + yellow orange, aqua + pink violet, all three a warm near-black. White is paper. Screens at 15°, 75° and 45°, 9 px cells at 1080 wide. One bold grotesk for type, printed solid in one or two inks: Geist 800–900 at −2 px tracking, Geist Mono for numbers. Check that text keeps a 4.5:1 contrast with what it is printed on: fluorescent pink on a light sky does not; violet (aqua + pink) does.

**MOTION:** on ones at 24 fps, eased (springs at ζ 0.9–1.0, ease-in exits). Things never fade: they print in and out by tone, so dots grow from nothing to solid. Each plate sits 2–3 px off the first one (seeded); its registration wanders by up to a pixel and the ink texture changes on twos, cycling through three prints, so a held frame shimmers like a stack of real prints. The screen is fixed to the sheet: a moving shape moves through the dots.

**BAN:** black or white ink, pure RGB colors, smooth gradients (use a tone gradient: the screen turns it into dots), drop shadows, blur, glow, opacity fades, more than three inks.

```js
import { riso, INKS } from "/_skill/runtime/styles/riso.js";
import { circle } from "/_skill/runtime/styles/common.js";
const press = riso("#art", { seed: "my-video" });  // inks, paper, pitch, misregister, jitter, grain, fiber
window.seek = (t) => press.frame(t, (p) => {
  p.flood({ aqua: p.linear(0, 0, 0, 720, [[0, 0.6], [1, 0.12]]) });   // a screened sky, edge to edge
  p.fill(circle(820, 330, 92), { yellow: 1, pink: 0.42 });           // knockout fill: an orange sun
  p.stroke([[300, 400], [300, 440]], { aqua: 1 }, { width: 6 });    // a rain streak: lines overprint
  p.text("How a seed grows", 70, 142, { aqua: 1, pink: 1 }, { font: "900 82px Geist", tracking: -2.5 });
});
```

- `p.fill(shape, tones, { over, under })`: a knockout by default (listed plates take their tone, the rest go to paper). `over: true` overprints; `under: true` lifts ink (a radial tone that rises to 1 at its rim lifts the sky around a sun without a hard edge).
- `p.flood(tones)` fills whole plates edge to edge, ignoring registration: use it for backgrounds.
- `p.linear(...)` and `p.radial(...)` are tone gradients for any plate. `p.push({x, y, rotate, scale, clip})` / `p.pop()` or `p.with(tf, fn)` transform and clip. `p.plate(name)` is a plate's raw 2D context (draw in greys; white is solid ink).
- `press.color(tones)` gives the printed color as CSS, for HTML around the print. `press.stats` holds the cost of the last frame.

## Pixel art

**USE:** game-flavored explainers, retro social shorts, playful step-by-step how-tos, title cards.

**LOOK:** a framebuffer that divides the video exactly: 216x216 for 1080x1080 (5 screen pixels per art pixel) or 180x180 (6). One palette of 4–16 colors (`PALETTES.meadow`, `handheld`, `dusk`); the frame throws an error on any color outside it. Mixed colors are 4x4 Bayer dithers between two palette colors (`g.mix`, `g.gradient`, `g.glow`), never blends. A 1-pixel ink outline on everything that moves. Text in the built-in 5x7 font at a whole-number scale (2x for titles), with a 1-pixel shadow; never a system font.

**MOTION:** on twos (12 drawings a second at 24 fps), in whole pixels. Things blink, type and step; they never fade or slide by a fraction of a pixel. A label is deleted and retyped one letter per drawing behind a blinking block cursor. Ambient life repeats in 2–4 states every few drawings (a sun's rays alternating, a bee's two wing frames).

**BAN:** smooth gradients, alpha, antialiased shapes or `fillText` in the framebuffer, colors off the palette, mixed pixel sizes (never scale one sprite by 2 next to others at 1), rotation by anything but 90°, camera zooms (cut to a different framebuffer size instead), copying a real game's characters or logos.

```js
import { pixel, PALETTES } from "/_skill/runtime/styles/pixel.js";
const px = pixel("#art", { width: 216, height: 216, palette: PALETTES.meadow });  // CSS: #art { width: 1080px; height: 1080px }
window.seek = (t) => px.frame(t, (g) => {
  const s = myStory(g.t);                                            // read tracks at the stepped time
  g.gradient(0, 0, 216, 134, ["#3f78c2", "#74b4e8", "#b7e2f3"]);     // a dithered sky
  g.circle(164, 66, 17, g.mix("#f7d046", "#f08a2e", (x, y) => (x - 164 + y - 66) / 28 + 0.15));
  g.text("HOW A SEED GROWS", 12, 12, "#f6f4ea", { scale: 2, shadow: "#1b1b2f" });
});
```

- Primitives (art-pixel coordinates, rounded to whole pixels): `rect`, `circle` and `ellipse` (radius r spans 2r + 1 pixels; `{ring}` for an outline), `poly` (pixel centres inside), `line` and `path` (Bresenham, `{width}`), `pset`, `sprite(rows, map, x, y, {flip, anchor})`, `text(str, x, y, color, {scale, align, shadow, count, cursor})`, `gradient`, `glow`.
- A color is a palette hex, a palette index, `null` (draw nothing) or a paint: `g.mix(a, b, f)` with `f` a number or `(x, y) => 0..1`, or any `(x, y) => g.index(hex)`.
- `g.canvas(fn)` draws anything with a 2D context and snaps it into the palette with an ordered dither. Prefer the primitives.

## Cut paper

**USE:** warm explainers, kids' and education content, how-tos, social shorts with a handmade feel.

**LOOK:** construction paper in flat, slightly dusty colors (`PAPERS`: sky `#a9d6e9`, moss `#6b9b4a`, marigold `#f3a42c`, rose `#dc4f72`, navy `#25305b`, cream `#f2e6cc`…), never pure. A full-bleed base sheet, then layers: torn edges with a pale fringe for land and soil, scissor cuts (straight facets about 16 px long) for everything else. Soft shadows that fall down and to the right and grow with height: `z` 1 for a piece glued flat, 2–3 for a floating cloud or a falling seed. Paper grain on every piece and light along the cut edge that faces it. Every piece tilts by up to 0.6°, as if placed by hand. Crayon lines for veins and marks. Cut-out letters in Nunito Sans Bold, each letter tilted (up to 3° by default; the example's title uses 6°), a little different in size, with its own shadow.

**MOTION:** stop motion on twos (12 drawings a second at 24 fps). Lines boil: they re-wobble on every drawing, keyed on `Math.round(t * fps / 2)`, by about 1.4 px; cut edges shift by a quarter of that. Paper does not fade or grow from nothing: it slides in from off frame, slides up from behind another layer (the sun rising behind a hill, a stem growing out of the soil), or swings open on a hinge (leaves, petals). Moves ease out with a little overshoot (ζ 0.7) for things that land, and ease in for exits.

**BAN:** opacity fades, blur, glow, gradients on paper, pure white or black paper, shadows from more than one light, perfectly straight placement of everything, type set in a line with no tilt.

```js
import { cutPaper, PAPERS, stripes, dots } from "/_skill/runtime/styles/cut-paper.js";
import { circle } from "/_skill/runtime/styles/common.js";
const cp = cutPaper("#art", { seed: "my-video" });   // light, shadow, grain, boil, facet, tilt
window.seek = (t) => cp.frame(t, (s) => {
  const st = myStory(s.t);                           // read tracks at the stepped time
  s.sheet(PAPERS.sky);
  s.piece(circle(822, st.sunY, 94), PAPERS.marigold, { key: "sun", z: 1.2 });
  s.piece(hillPoints, PAPERS.moss, { key: "hill", edge: "torn" });
  s.strip(st.stem, 16, PAPERS.forest, { key: "stem", end: 11 });   // points along the stem
  s.line(st.vein, PAPERS.forest, { key: "vein", width: 4 });        // boils
  s.text("How a seed grows", 66, 142, PAPERS.navy, { size: 86, key: "title", tilt: 6 });
});
```

- `s.piece(shape, color, o)`: `key`, `z`, `edge` (`"cut"`, `"torn"`, `"clean"`), `facet`, `rough` and `fringe` for torn edges, a transform (`x`, `y`, `rotate`, `scale`, `origin`), `tilt` (overrides the seeded tilt), `pattern(ctx, box)` (`stripes`, `dots` or your own, drawn inside), `grain`, `light`.
- `s.strip(points, width, color, {end})` is a paper strip along a path; `s.line(points, color, {width, wobble})` a boiling crayon line; `s.group(transform, fn)` moves an assembly (a bee and its wings) as one, keeping shadows pointed the same way.

## Cost and checks

Measured on the examples at 1080x1080 on an M1 Pro laptop shared with other renders (`node tests/style_cost.mjs`, medians):

| Pack | `seek(t)` | `seek` + screenshot | A 10.5 s render, 252 frames, 3 workers |
| --- | --- | --- | --- |
| Riso | 47 ms (screen pass 32, plate readback 13) | 79 ms | 11 s |
| Pixel | 4 ms | 30 ms | 5 s |
| Cut paper | 11 ms (the GPU finishes the shadows during the screenshot) | 75 ms | 9 s |

Riso's print pass touches every pixel of every plate in JavaScript, so its cost grows with the frame's area: about twice as much at 1920x1080.

`bash tests/test_styles.sh` renders each example's frames twice, in opposite orders in separate browsers, and checks with `cmp` that they are byte-identical. It also checks that the stepped packs hold each drawing for two frames. `node tests/test_stepped.mjs` checks the stepped time itself.

## Adding a style

A new pack follows the same contract: one module in `runtime/styles/`, a `frame(t, draw)` that sets every pixel from `t`, randomness from `hash()` or `rand(seed)` drawn at load, static textures made once, and nothing carried between frames. Write its LOOK, MOTION, BAN and USE lines here, give it an example in `examples/styles/` that tells the same story from `story.js`, and add it to `tests/test_styles.sh`.
