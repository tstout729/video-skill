# The video skill, in one minute

A 56-second film for LinkedIn that shows what the skill makes, using its real output. It was made with the skill.

- **Format:** 1080x1350 (4:5), 60 fps, 4-subframe motion blur averaged in linear light, 55.9 s.
- **Narration:** George (ElevenLabs), with burned-in captions that highlight each word as it is spoken.
- **Music:** a generated drive bed at 120 BPM. Cuts land on the beat.
- **Engines:** HTML and `motion.js`, `transitions.js` for the scene changes and the film finish, three.js r186 for the ceramic mark, and real clips of the repository's examples played as image sequences.

## What it shows

| Scene | Capability | Shown by |
| --- | --- | --- |
| 1 | Made in code | The 3D mark, and the frame number `seek(t)` is drawing |
| 2 | A brief in numbers | "premium" becomes ζ 0.82 · 450 ms, and a card moves on that spring |
| 3 | The range | The walkthrough, explainer and loop examples, and the 3D mark |
| 4 | Style packs | One story split across riso, pixel art and cut paper, frame for frame |
| 5 | Voice and timing | This scene's script, its real waveform, and each word's start time |
| 6 | The review | A contact sheet, an onion skin and a speed graph of this film, and its checks |
| 7 | Install | The install line and the repository |

## How it was made

- [`brief.md`](brief.md) is the direction: goal, time, frame zones, a shot list, and the look, motion, sound, ban list and QA in numbers.
- [`log.md`](log.md) and [`log/`](log/) are the review rounds, with notes tied to frame numbers.
- `scenes/sNN.js` holds one module per narration scene. [`kit.js`](kit.js) and [`design.css`](design.css) are the shared helpers and the design system; [`index.html`](index.html) is the shell, with the handoffs between scenes, the captions and the finish.
- [`SCENE-GUIDE.md`](SCENE-GUIDE.md) is the brief each scene builder worked from.

## Render it

The narration takes are in `audio/`, so no ElevenLabs key is needed. Run these from the repository root:

```sh
bash skills/video/scripts/setup.sh
# The film's 3D mark needs three.js r186, which the skill no longer installs.
npm install --silent --no-audit --no-fund --ignore-scripts --prefix "${VIDEO_SKILL_HOME:-$HOME/.cache/video-skill}" three@0.186.1
S=skills/video/scripts

# The music and the clips are too large to commit; these rebuild them exactly.
uv run --script $S/bed.py --out one-minute/music/bed.wav --bpm 120 --bars 28 --key D --mood drive --seed 11 --first 0 --beats one-minute/music/beats.js
for st in riso pixel cut-paper; do
  (cd skills/video/examples/styles/$st && node ../../../scripts/render.mjs index.html --out render/video.mp4 --fps 24 --sub 1)
  uv run --script $S/clip.py skills/video/examples/styles/$st/render/video.mp4 --out one-minute/clips/$st --fps 24 --width 900
done
uv run --script $S/clip.py docs/examples/explainer.mp4 --out one-minute/clips/explainer --fps 30 --width 960 --from 9 --to 15
uv run --script $S/clip.py docs/examples/walkthrough.mp4 --out one-minute/clips/walkthrough --fps 30 --width 1000 --from 17.5 --to 24.5
uv run --script $S/clip.py docs/examples/loop.mp4 --out one-minute/clips/loop --fps 30 --width 860 --from 1.5 --to 11.5

cd one-minute
uv run --script ../$S/timeline.py .                          # narration.wav and words.js (with captions)
node ../$S/review.mjs audit index.html                       # every check() of the brief's numbers
node ../$S/render.mjs index.html --out render/video.mp4
uv run --script ../$S/mux.py render/video.mp4 --out "out/The video skill, in one minute.mp4" \
  --narration audio/narration.wav --words words.js --sfx-dir sfx --music music/bed.wav --social
uv run --script ../$S/check_sync.py "out/The video skill, in one minute.mp4" --sfx render/video.sfx.json
```

A draft takes a minute or two: `node ../skills/video/scripts/render.mjs index.html --out qa/draft.mp4 --fps 30 --sub 1 --scale 0.5 --debug`.
