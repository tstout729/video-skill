# When things break

The failures that come up in almost every project, each with the fix. When a fix doesn't hold:
1. Render the frames just before and after the problem: `review.mjs sheet page.html --from t0 --to t1 --frames 6`.
2. Describe the difference out loud.
3. Then change the code.

Every fix that works goes into the project's brief (BAN or the render contract) and `log.md`, so it never happens twice.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Shapes jitter or change between renders | Unseeded randomness, or randomness drawn inside `seek` | `rand(seed)` at load; never `Math.random` |
| A loop hitches at the seam | Frame N rendered (it repeats frame 0), or motion not on whole cycles | Render frames 0..N−1 (`render.mjs` does); drive everything from `phase()` with whole-number cycles; `loopNoise` for drift |
| Two renders of one frame differ | A clock, timer, CSS animation or state carried between frames | Set everything from `t` in `seek(t)` |
| Everything appears at once | No staging; one cue for several elements | One `cue()` per element; stagger 40–80 ms; one hero per shot |
| It looks generated | Defaults: gradient, glow, particles, spin, fade-and-slide-up on everything, everything centered | Name each default in BAN and render again |
| Motion looks robotic | Linear easing, or even spacing in the onion skin | Ease out on entrances and in on exits; springs at ζ 0.8 |
| A move starts or stops abruptly | A hard start or stop flagged by `review.mjs graph` | A spring, or a longer ease at that end |
| An empty or muddy gray shape mid-morph | A dark-to-light color change while the content is hidden | Keep the old color and label until the shape has mostly grown, then switch in about 0.15 s with the new content arriving |
| Text blurs during a zoom | `will-change` on a scaled element, or a full 360° shutter | Remove `will-change`; keep `--shutter 0.4` |
| Something leaves the frame | The arc or camera framing was not checked | A contact sheet with `--from`/`--to` around the move; keep motion inside the safe area |
| Text is too small on a phone | Desktop-sized type | At 1080 px wide: body at 28 px or more, key words at 44 px or more; exaggerate key poses 10–30% |
| Chrome looks like white plastic | Nothing for the chrome to reflect | An environment (`RoomEnvironment`), a horizon line or a bright card in reflection; roughness of 0.1 or less |
| 3D letters are absurdly thick | `TextGeometry` given `height` in r186 | Use `depth` |
| Bevels fuse letters together | Bevel size too large for the letter spacing | A smaller `bevelSize`, more letter spacing, or a larger font |
| A glint washes out a letter | A highlight too wide or too bright | Narrow the highlight, lower its strength, and check frame by frame |
| The page never loads in the renderer | A script error or a missing file | `render.mjs` prints the errors and failed URLs; fix the first one |
| A sound lands early or late | The sound placed on the picture's frame, or codec padding | `mux.py` places it a frame after (`--sfx-lag 1`); `check_sync.py` measures it |
| Hits disappear on phones | Energy below about 100 Hz | A calm bed, or a bed weighted above 100 Hz; `check_sync.py` reports the low share |
| The final sound is squashed | A limiter hitting the last hit | Leave headroom: mix to −14 LUFS with a true peak of −1 dBTP, and check with `check_sync.py` |
| A GIF loop runs about 4% fast | 24 fps cannot be stored exactly in GIF timing | `export.py --gif` at 25 fps (or 20 or 50) |
| A GIF flickers | A palette per frame | `export.py --gif` uses one palette for the whole clip |
| An iPhone shows washed-out or wrong colors | Full-range video | `render.mjs` and `export.py` write standard range; re-export older files |
| A held text label moves while it is read | An ambient drift on the text | Keep drift on backgrounds only, under 2% |
