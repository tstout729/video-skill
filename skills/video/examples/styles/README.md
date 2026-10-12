# Style examples: one story, three media

"How a seed grows" told three times, by the riso, pixel-art and cut-paper style packs ([Style packs](../../references/styles.md)). Each version is 1080x1080, 10.5 seconds at 24 fps, with no voice and a few synthesized UI sounds.

A seed drops into the soil. A cloud waters it, and a sprout pokes out. The sun rises and the stem grows two leaves. A bud opens into a flower, and a bee lands on it. A label at the bottom names each step: 1 Plant, 2 Water, 3 Sun, 4 Bloom.

All three pages read the same times and positions from `story.js`, so frame 89 shows the same moment in each, and the renders can be compared side by side. Each page draws that moment in its own medium:

| | Riso | Pixel | Cut paper |
| --- | --- | --- | --- |
| Timing | on ones; the print shimmers on twos | on twos, whole pixels | on twos, lines boil |
| The label changes | the old word's ink shrinks away in dots, the new one prints in | the old word is deleted and the new one typed | the old tag slides off the bottom, the new one slides up |
| The soil soaks | its screen tones grow heavier | a darker dither creeps up | darker scraps appear one by one |
| The sun | orange from pink screened over yellow, with a yellow halo that lifts the sky's ink | a dithered disc with blinking rays | a paper disc and cut rays that rise from behind the hill |

## Render them

From the repository root, after `bash skills/video/scripts/setup.sh`:

```sh
cd skills/video/examples/styles/riso      # or pixel, or cut-paper
node ../../../scripts/render.mjs index.html --stills qa/stills       # the page's key frames, to check
node ../../../scripts/render.mjs index.html --out render/video.mp4 --fps 24 --sub 1
uv run --script ../../../scripts/mux.py render/video.mp4 --out "out/How a seed grows.mp4" --sfx-dir sfx
node ../../../scripts/review.mjs sheet render/video.mp4 --out qa/sheet.png --frames 12
```

Always render at 24 fps with `--sub 1`: motion blur would blend two drawings where they change. Each render takes 5–15 seconds.

To check that every frame is a pure function of time, and that the stepped styles hold each drawing for two frames:

```sh
bash tests/test_styles.sh
```

## Make your own

- Copy the folder of the pack you want, and `story.js` beside it; change the import of `story.js` to `./story.js`.
- Keep the pack's rules from the reference: its palette, its type, how things enter and leave, and its BAN list.
- Give every cut-paper piece a `key`, and read every track at the stepped time (`g.t`, `s.t`).
