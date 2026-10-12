# Motion Lab, explained

A 5½-minute video that explains Florence's X Article [*Opus 5.5 Motion Lab: Make Claude Animate Like a Studio*](https://x.com/flxrnc/status/2105311836190978392) (@flxrnc, September 30, 2026), section by section. It was made with this skill, after the article's ideas were added to it: a directed brief, the numbers, the render contract, and the animator's review loop. The video is evidence of the method, not just an explanation of it.

- **Format:** 1080x1350 (4:5), 60 fps, 4-subframe motion blur averaged in linear light, about 326 s.
- **Narration:** George (ElevenLabs), with burned-in captions that highlight each word as it is spoken.
- **Music:** a generated calm bed at 120 BPM; every scene cuts on a beat.
- **Engines:** HTML and `motion.js`, three.js r186 for the ceramic mark, and real clips of the repo's examples played as image sequences.

## How it was made

- [`brief.md`](brief.md) is the direction: goal, time, frame zones, a shot list for all 21 scenes, and the look, motion, sound, ban list and QA in numbers.
- [`log.md`](log.md) is the receipt: 62 review rounds and 107 notes pinned to frames, plus 203 `check()`s of the brief's numbers that all pass, and what the coordinator caught across the whole video.
- `scenes/sNN.js` holds one module per narration scene. [`kit.js`](kit.js) and [`design.css`](design.css) are the shared helpers and the one design system; [`index.html`](index.html) is the shell, with the chapter bar, captions and cuts.
- Florence is credited on screen throughout. The video summarizes and explains the article. It reproduces none of its prompts, code or showcase pieces.

## Render it

The narration takes are in `audio/`, so no ElevenLabs key is needed. Run these from the repository root:

```sh
bash skills/video/scripts/setup.sh --with three
cd motion-lab

# The two files too large to commit, rebuilt exactly:
uv run --script ../skills/video/scripts/bed.py --out music/loop.wav --bpm 120 --bars 32 --key D --mood calm --loop --first 0 --seed 7
ffmpeg -v error -y -stream_loop 5 -i music/loop.wav -t 325.92 -af "afade=t=out:st=321.92:d=4" music/bed.wav
for c in "explainer 9 15 960" "walkthrough 17.5 23.5 960" "loop 1.5 11.5 720"; do set -- $c
  uv run --script ../skills/video/scripts/clip.py ../docs/examples/$1.mp4 --out clips/$1 --fps 30 --width $4 --from $2 --to $3; done

uv run --script ../skills/video/scripts/timeline.py .        # narration.wav and words.js (with captions)
node ../skills/video/scripts/review.mjs audit index.html     # 203 checks of the brief's numbers
node ../skills/video/scripts/render.mjs index.html --out render/video.mp4
uv run --script ../skills/video/scripts/mux.py render/video.mp4 --out "out/Motion Lab, explained.mp4" \
  --narration audio/narration.wav --words words.js --sfx-dir sfx --music music/bed.wav --social
uv run --script ../skills/video/scripts/check_sync.py "out/Motion Lab, explained.mp4" --sfx render/video.sfx.json
```

The final render takes about an hour on an M1 Pro. A draft takes about 2 minutes: `render.mjs index.html --out qa/draft.mp4 --fps 30 --sub 1 --scale 0.5 --debug`.
