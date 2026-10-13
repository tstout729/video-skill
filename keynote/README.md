# Video Skill: the keynote film

A 55-second launch film for LinkedIn, in the style of a product keynote: big type that lands on the beat over real output of the skill, cut to an upbeat generated track. It was made with the skill.

- **Format:** 1080x1350 (4:5), 60 fps, 4-subframe motion blur averaged in linear light, 55.2 s.
- **Music:** `bed.py --mood anthem` at 124 BPM in E major, arranged in sections: an intro, a build that stops for one beat, a drop, a break, a second build and drop, and an end that rings out. Every shot changes on a bar line.
- **Voice:** one line, George (ElevenLabs), reused from `one-minute/`: the voice shot lights each word at its real time.
- **Engines:** HTML and `motion.js`, `transitions.js` for the handoffs and the film finish, three.js r186 for the ceramic mark in a black keynote studio, and real clips of the repository's examples played as image sequences.

## What it shows

| Shot | Bars | Shows |
| --- | --- | --- |
| s01 | 0–4 | The mark revealed by light: "Introducing Video Skill, for Claude Code" |
| s02 | 4–6 | "Every frame. Made in code." with this film's live frame number |
| s03–s06 | 6–11 | Walkthroughs, diagrams, 3D and loops, each a real clip |
| s07 | 11–13 | One story in riso, pixel art and cut paper, frame for frame |
| s08 | 13–15 | One window springing through 16:9, 1:1, 4:5 and 9:16 |
| s09 | 15–18 | The voice: George's line, each word lit at its real time over its waveform |
| s10–s11 | 18–23 | This film's own contact sheet, onion skin and speed graph, and its checks |
| s12 | 23–25 | Everything at once, in a grid of live tiles |
| s13 | 25–28.5 | Free and open source, and the install line |

## How it was made

- [`brief.md`](brief.md) is the direction, in numbers. [`log.md`](log.md) and [`log/`](log/) are the review rounds.
- `scenes/sNN.js` holds one module per shot. [`kit.js`](kit.js) times everything in bars and beats; [`design.css`](design.css) is the design system; [`index.html`](index.html) is the shell with the handoffs and the finish. [`hero3d.js`](hero3d.js) adds the keynote studio to the 3D mark.
- [`SCENE-GUIDE.md`](SCENE-GUIDE.md) is the brief each shot builder worked from.

## Render it

The voice take is in `audio/`, so no ElevenLabs key is needed. Run these from the repository root:

```sh
bash skills/video/scripts/setup.sh --with three
S=skills/video/scripts

# The music, the clips and the voice track are too large to commit; these rebuild them exactly.
uv run --script $S/bed.py --out keynote/music/bed.wav --bpm 124 --key E --mood anthem \
  --sections intro:3,build:1,drop:11,break:3,build:1,drop:6,end:3.5 --seed 11 --first 0 --beats keynote/music/beats.js
for st in riso pixel cut-paper; do
  (cd skills/video/examples/styles/$st && node ../../../scripts/render.mjs index.html --out render/video.mp4 --fps 24 --sub 1)
  uv run --script $S/clip.py skills/video/examples/styles/$st/render/video.mp4 --out keynote/clips/$st --fps 24 --width 900
done
uv run --script $S/clip.py docs/examples/explainer.mp4 --out keynote/clips/explainer --fps 30 --width 960 --from 9 --to 15
uv run --script $S/clip.py docs/examples/walkthrough.mp4 --out keynote/clips/walkthrough --fps 30 --width 1000 --from 17.5 --to 24.5
uv run --script $S/clip.py docs/examples/loop.mp4 --out keynote/clips/loop --fps 30 --width 860 --from 1.5 --to 11.5
# The voice line at bar 15 beat 1 (29.516 s), in silence for the length of the film.
ffmpeg -y -f lavfi -t 29.5161 -i anullsrc=r=48000:cl=mono -i keynote/audio/voice.mp3 -f lavfi -t 30 -i anullsrc=r=48000:cl=mono \
  -filter_complex "[1:a]aresample=48000,aformat=channel_layouts=mono[v];[0:a][v][2:a]concat=n=3:v=0:a=1,atrim=0:55.1613[a]" \
  -map "[a]" -c:a pcm_s16le keynote/audio/narration.wav

cd keynote
node ../$S/review.mjs audit index.html                       # every check() of the brief's numbers
node ../$S/render.mjs index.html --out render/video.mp4
uv run --script ../$S/mux.py render/video.mp4 --out "out/Video Skill, the keynote film.mp4" \
  --narration audio/narration.wav --words words.js --sfx-dir sfx --music music/bed.wav --music-db -6 --social
uv run --script ../$S/check_sync.py "out/Video Skill, the keynote film.mp4" --sfx render/video.sfx.json
```

A draft takes a minute or two: `node ../skills/video/scripts/render.mjs index.html --out qa/draft.mp4 --fps 30 --sub 1 --scale 0.5 --debug`.
