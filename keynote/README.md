# Video Skill: the keynote film

A 71-second launch film for LinkedIn, in the style of an Apple product announcement: one small caption per shot over real output of the skill, on screens floating in black, cut to a composed score. It was made with the skill.

- **Format:** 1080x1350 (4:5), 60 fps, 4-subframe motion blur averaged in linear light, 70.9 s.
- **Music:** a score composed with ElevenLabs Music from a plan of whole bars at 110 BPM, then cut to the picture on bar lines. The style was measured from Apple's 2025–26 product films: a sub-bass-led electronic beat, one breath before each drop, a hard landing. Every shot changes on a bar line.
- **Voice:** one line, George (ElevenLabs), reused from `one-minute/`: the voice shot lights each word at its real time.
- **Engines:** HTML and `motion.js`, `transitions.js` for the handoffs and the film finish, three.js r186 for the ceramic mark in a black studio, and real clips of the repository's examples played as image sequences.

## What it shows

| Shot | Bars | Shows |
| --- | --- | --- |
| s01 | 0–4 | The mark revealed by light: "Introducing Video Skill, for Claude Code" |
| s02 | 4–6 | "Every frame. Made in code." with this film's live frame number |
| s03–s06 | 6–14 | App walkthroughs, diagrams, 3D and loops, each a real clip on a floating screen |
| s07 | 14–17 | One story in riso, pixel art and cut paper, frame for frame |
| s08 | 17–20 | One screen springing through 16:9, 4:5 and 9:16 |
| s09 | 20–23 | The voice: George's line, each word lit at its real time over its waveform |
| s10–s11 | 23–29 | This film's own contact sheet, onion skin and speed graph, and its checks |
| s13 | 29–32.5 | Free and open source, and the install lines |

## How it was made

- [`brief.md`](brief.md) is the direction, in numbers. [`log.md`](log.md) and [`log/`](log/) are the review rounds, including the two versions Trevor sent back and why.
- `scenes/sNN.js` holds one module per shot. [`kit.js`](kit.js) times everything in bars and beats; [`design.css`](design.css) is the design system; [`index.html`](index.html) is the shell with the handoffs and the finish. [`hero3d.js`](hero3d.js) adds the black studio to the 3D mark.
- [`SCENE-GUIDE.md`](SCENE-GUIDE.md) is the brief each shot builder worked from.
- [`music/compose.py`](music/compose.py) is the plan sent to ElevenLabs Music; [`music/edit.py`](music/edit.py) cuts the take to the picture.

## Render it

The voice take is in `audio/`. The score is not in the repository: compose your own take with an ElevenLabs key (`ELEVENLABS_API_KEY`, about 1,065 credits a take), and check where its sections landed before you edit it (log.md, round 5). Run these from the repository root:

```sh
bash skills/video/scripts/setup.sh --with three
S=skills/video/scripts

# The score: a take from the plan, then the edit to the picture (adjust EDIT in edit.py to your take).
uv run --script keynote/music/compose.py --out keynote/music/take.mp3 --seed 1
uv run --script keynote/music/edit.py keynote/music/take.mp3 --out keynote/music/score.wav

# The clips and the voice track are too large to commit; these rebuild them exactly.
for st in riso pixel cut-paper; do
  (cd skills/video/examples/styles/$st && node ../../../scripts/render.mjs index.html --out render/video.mp4 --fps 24 --sub 1)
  uv run --script $S/clip.py skills/video/examples/styles/$st/render/video.mp4 --out keynote/clips/$st --fps 24 --width 900
done
uv run --script $S/clip.py docs/examples/explainer.mp4 --out keynote/clips/explainer-hd --fps 30 --width 1920 --from 16 --to 30
uv run --script $S/clip.py docs/examples/walkthrough.mp4 --out keynote/clips/walkthrough --fps 30 --width 1000 --from 17.5 --to 24.5
uv run --script $S/clip.py docs/examples/loop.mp4 --out keynote/clips/loop --fps 30 --width 860 --from 1.5 --to 11.5
# The voice line at bar 20 beat 1 (44.182 s), in silence for the length of the film.
ffmpeg -y -f lavfi -t 44.1818 -i anullsrc=r=48000:cl=mono -i keynote/audio/voice.mp3 -f lavfi -t 30 -i anullsrc=r=48000:cl=mono \
  -filter_complex "[1:a]aresample=48000,aformat=channel_layouts=mono[v];[0:a][v][2:a]concat=n=3:v=0:a=1,atrim=0:70.9091[a]" \
  -map "[a]" -c:a pcm_s16le keynote/audio/narration.wav

cd keynote
node ../$S/review.mjs audit index.html                       # every check() of the brief's numbers
node ../$S/render.mjs index.html --out render/video.mp4
uv run --script ../$S/mux.py render/video.mp4 --out "out/Video Skill, the keynote film.mp4" \
  --narration audio/narration.wav --words words.js --sfx-dir sfx --music music/score.wav --music-db -6 --social
uv run --script ../$S/check_sync.py "out/Video Skill, the keynote film.mp4" --sfx render/video.sfx.json
```

A draft takes a minute or two: `node ../skills/video/scripts/render.mjs index.html --out qa/draft.mp4 --fps 30 --sub 1 --scale 0.5 --debug`.
