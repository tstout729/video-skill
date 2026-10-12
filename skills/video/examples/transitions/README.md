# Transitions example

A silent 29.5-second reel, 1920x1080, that shows each of the eight kinds in `runtime/transitions.js` once, labeled, with the film finish on: grain, a vignette and two light sweeps.

| Time | Kind | The scene it brings in |
| --- | --- | --- |
| 2.6 s | cut | 01 Cut. The one hard cut, listed in `VIDEO.cuts` through `film.cuts` |
| 5.0 s | dissolve, 0.8 s | 02 Dissolve. Its layout is mirrored, so no title dissolves over another |
| 8.2 s | push up, 1.0 s | 03 Push |
| 11.6 s | zoom-through, 0.8 s | 04 Zoom-through, through the center of the tunnel |
| 14.8 s | whip left, 0.8 s | 05 Whip |
| 18.0 s | light leak, 1.0 s | 06 Light leak, dark to dark, where light reads as light |
| 21.4 s | wipe (iris), 0.9 s | 07 Wipe, opening from where the clay disc sits |
| 24.7 s | morph, 1.2 s | 08 The end card. The clay disc becomes the icon |

Each labeled scene holds about 2.4 s alone. Each motif has a slow 2% push; the text stays still. Three soft whooshes sit on the moves that have speed; the dissolve, the leak and the cut stay silent.

## Render it

Run these from this folder. No API key is needed.

```sh
bash ../../scripts/setup.sh                                      # once
node ../../scripts/render.mjs index.html --out render/video.mp4
uv run --script ../../scripts/mux.py render/video.mp4 --out out/Transitions.mp4 --sfx-dir sfx --social
node ../../scripts/review.mjs cuts index.html --out qa/cuts.png
```

The last command checks the motion across every edit. It should report that all 8 edits keep their motion across.

To grade the picture, add `--lut grade.cube` to `mux.py`. To check text contrast without the finish, preview with `node ../../scripts/render.mjs index.html --serve` and open the printed address with `?finish=0&t=6.8`.

## What to copy from it

- **Scene roots.** Each scene is one `<section>` in `#scenes` with its own background. `scenes([...])` shows the right ones on each frame; the page never styles a root itself.
- **Content first, then the film.** `seek` sets each motif's push before it calls `film(t)`, because the morph measures the disc and the icon on the frame.
- **Layouts that suit the transition.** The two scenes that a dissolve or a leak brings in are mirrored, so their text lands where the scene before had its picture.
- **A stage that contrasts.** The scenes container is ink, so the morph's bare stage and the zoom-through's edges read as dark, not as a gap.
- **Contrast on every frame.** Each scene's muted text color keeps 4.5:1 or more on its background.

## The finish and file size

Grain makes a video larger, because the encoder cannot reuse noise from one frame to the next. These are the sizes of this reel at 60 fps with one subframe, with `render.mjs`'s encoder settings (CRF 15):

| Grain | Size |
| --- | --- |
| none | 4.9 MB |
| a new field 12 times a second (the default) | 197 MB |
| a new field every frame | 733 MB |

The full render with four subframes is 196 MB. `export.py` caps the bitrate for each platform: 59.5 MB for YouTube and 44.7 MB for LinkedIn, and the grain survives as fine grain. Grain on every frame would cost 3.7 times as much again, and it reads as sizzle.

## Review

- `qa/cuts.png` (`review.mjs cuts`): all 8 edits keep their motion across. The first draft's zoom-through failed it: its old scene was still a faint ghost zooming at full speed in its last frames, a 12× speed jump at the end. It now fades out by 90% of the way.
- The whip's speed graph (`review.mjs graph index.html --select "#s5" --from 14.84 --to 15.7 --prop x`) has a soft start, a peak of 150 px per frame at the handoff, and a soft stop.
- Two earlier drafts are worth remembering. The whip's counter-move showed the stage at the old scene's trailing edge, so it was removed. The morph read its outline before the motif's slow push was set for the frame, so frames differed with render order; `seek` now sets the content first.
