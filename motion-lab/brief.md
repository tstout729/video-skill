# Motion Lab, explained

GOAL: A viewer finishes knowing every idea in Florence's article "Opus 5.5 Motion Lab", in its order, and sees each idea demonstrated on screen. Hearing it is not enough. The video itself is proof: it is made with the skill that now contains those ideas.
AUDIENCE: LinkedIn (mostly phones, often muted at first) and the repo README. Every point must read from the picture and the burned-in captions alone.
TIME: 325.92 s at 60 fps, 19,555 frames. Music bed at 120 BPM: a beat is 30 frames, a bar 120 frames. Scenes cut on the beat nearest the middle of each 0.8 s gap (kit.sceneWindow).
OUTPUT: HTML + motion.js + three.js r186 (`/_vendor/three/`), 1080x1350 (4:5), 60 fps, 4 subframes, shutter 0.4, linear-light blur. Not a loop. Frame 0 is a finished composition, because it is the thumbnail.
FRAME:
- Chapter bar, y 0–128: section number and name, plus nine progress ticks. It is in the shell and runs automatically.
- Stage, y 128–1120: each scene's content, in stage coordinates 1080x992.
- Caption band, y 1120–1350: burned-in captions only.
CREDIT: "From Florence's article · @flxrnc" stays in the chapter bar. The article is summarized and explained; nothing is copied from it. No prompts or code are reproduced, Florence's showcase pieces are not recreated, and Claude's mascot is never shown.

SHOTS: one scene module per narration scene (scenes/sNN.js). Times are in words.js. Each scene below gives its hero move and its numbers. Inside a scene, every element enters on its own cue (kit.cueIn).
  s01 Title. "Motion Lab, explained" set large (display, 92 px). On "AI": a small 3D ceramic play mark (hero3d directed) lands center with squash and settles at ζ 0.8. On "code": a mono line `seek(t) → frame` types on beneath it. Hold.
  s02 The one-prompt myth. A post card reading "one prompt ✨" (the only emoji in the video, and it is the joke), with a view count that counts up. On "weren't", a strike-through draws across "one prompt". On "five-minute brief" and "twelve hours", two timeline bars grow: a 5-minute sliver beside a 12-hour bar, to scale on one axis. On "the middle", the space between them opens to show three stacked frame notes (red chips), the last of them "f… peak lands 2 frames late".
  s03 Lab notebook and thesis. A notebook card lists "3 animations · every prompt · every follow-up". On "adjectives", the word "premium" sits in a box labeled "the model's default". On "number", the word breaks into letters 1 frame apart, and they rebuild as "ζ 0.82". Hold on the equation "adjective → number".
  s04 Experiment 1. Two stacked panes, top "3 adjectives" and bottom "450 words". The top runs hero3d variant "default": navy, halo ring, particles, spin. As the narrator lists "navy space · a glowing ring · particles · a spin", each default gets a red callout chip pinned to it, 250 ms apart from the cue. The bottom pane is the directed hero, hopping on "direction". The hero is the bottom pane's hop; the top dims to 40% when it starts.
  s05 Adjectives into numbers. Four rows, one per cue (premium / cool / modern / animation). Each starts as the adjective in faint serif-less gray, then the adjective slides left and shrinks while its numbers type on to the right, in mono: "satin ceramic · roughness 0.35 · brand color ×1", "key 2.4 · fill 0.6 · rim · no glow", "FOV 40° · 1 push-in", "120 BPM · 4f anticipation · ζ 0.8". One row active at a time; finished rows dim to 45%.
  s06 Programs, not video. A three-step pipeline built left to right on its cues: code (`window.seek(t)`), browser (a frame freezes: a film strip of 5 real frames from the clips, 50 ms stagger), video tool (the strip joins into a play bar). Then three benefit chips arrive in order, each with a tiny proof: repeatable (two identical frames with "=" between), cheap edits (one number changes, 0.35 → 0.30, and the frame updates), self-checking (a magnifier over a frame).
  s07 The render contract. A card titled "Render contract" fills with three rules on their cues, each with a live demo:
    - no clocks or timers: a clock icon struck through;
    - seeded randomness: two dot fields side by side, left with `Math.random` jittering every frame (labeled, red) and right with `rand(seed)` holding still (green);
    - frames 0 to N−1: a loop strip of 8 frames, then a 9th frame N that duplicates frame 0 slides in, turns red, the strip shows the hitch, and the frame is removed.
  s08 Ways in. Two cards, "Claude app · no install" and "Claude Code", the second with a small loop icon: render → look → fix. On "medium effort", a segmented control with medium selected. On "two misses", two small ✕ marks appear and "raise" lights.
  s09 Anatomy of a directed prompt. A brief card writes itself line by line on cues: GOAL / TIME / SHOTS / OUTPUT / QA, in mono, values as real numbers. Then a BAN list card: gradient, glow, particles, fade everything in at once. Each item is shown as a tiny live example that gets struck and dims, 120 ms apart. On "grow", one new item is added at the bottom.
  s10 One hero move. A hero card moves 400 px right on a spring at ζ 0.82. Two secondary cards follow, travelling 240 px (60%), 150 ms later. A background of 6 ambient dots drifts under 5% (loopNoise). Labels show "100%", "60% · +150 ms" and "< 5%".
  s11 Easing and springs. Left: three easing curves drawing on with an animated ball for each: ease-out labeled "enter", ease-in labeled "exit · 40–50% shorter" (visibly shorter), ease-in-out labeled "move across". Right, on "damping ratio": three springs side by side (ζ 1.0, 0.8, 0.5), each a block with its curve, all launched on the same frame. On "opacity never does", a fade that would overshoot is clamped and marked ✕.
  s12 Durations, stagger, beats, holds.
    - A duration ruler at 100 ms / 200–500 ms / 600–900 ms, with three blocks animating at those durations.
    - A list of 6 items staggering in at 60 ms.
    - A beat grid comparing two rows over 16 beats: "rounded frames" drifting (113 BPM at 24 fps, the drift grows and turns red) against "from time" staying on the line.
    - A text hold timer: a 2-word title with a countdown bar of 0.3 × 2 + 0.5 = 1.1 s.
  s13 Camera, parallax, accessibility. A three-layer parallax scene (foreground 1.0, mid 0.5, background 0.2) slides once, with the speeds labeled. Then two text samples: one at 2.8:1 struck and one at 4.5:1 checked. Then a "≤ 3 flashes / s" meter with 3 calm pulses.
  s14 Experiment 2. The directed 3D hero on a floor marked as a timeline with frame ticks and a moving playhead. The hop is cued so the principle labels light on their exact frames: anticipation (f0–f4), squash, stretch, arc (a dotted arc traces the path), follow-through. The labels are HTML chips above the floor, each lighting on its frame; the "late label shows first" idea is shown once with a ghost label lighting early.
  s15 The audit. A counter of checks runs to 71 over a strip of 480 frame ticks. Six ticks turn red as failures are found, then each turns green on "fixed". The final readout: "71 / 71 pass".
  s16 The review loop. Real images, not mock-ups, each staged one at a time:
    - the contact sheet (assets/sheet.png) assembles cell by cell;
    - the onion skin (assets/onion.png);
    - the speed graph (assets/graph.png), with its curve highlighted;
    - a red note chip pinned to a frame.
    Finish with the real catch from this project: the before and after frames (assets/wt-before-1123.jpg, wt-after-1123.jpg), labeled "f1123 · card opens as an empty gray box" (red), then "fixed" (green).
  s17 Feelings into numbers. Two rows: "make it pop" becomes "+8% · 6 frames · on the beat", with a card actually popping 8% over 6 frames on the beat; "it drags" becomes "each hold −1 beat", with a beat bar shortening. Then "receipts": a log card with "4 rounds · 23 notes", pinned with a check.
  s18 Engines. A chooser: three.js → 3D (the hero rotates in a small window), Remotion → a series (a stack of cards), plain HTML → a short loop (the real loop clip via frames()). HyperFrames and GSAP appear as smaller chips under "think in web pages", with Motion as "no renderer".
  s19 The last mile.
    - A phone with a muted icon shows the picture working in silence (the real walkthrough clip with burned-in captions).
    - A loudness meter settles at −14 LUFS, with the peak marked −1 dBTP.
    - A frame/sound alignment strip: a picture hit at frame n and a sound peak at n+1.
    - A GIF row: two loops side by side, one at "24 fps → 4 cs" drifting ahead (red, "4% fast") and one at 25 fps exact (green).
  s20 When things break, and the homework. Two frames (before and after the problem) with a "describe the difference" arrow between them. A fix chip moves into the "contract" card. Then the homework as a checklist ticking on cues: make one · 2 notes with frame numbers · post every prompt.
  s21 Close. The 3D hero lands center (hero3d `land`). Then, one after another: "video skill · free and open source", the install line `/plugin marketplace add tstout729/video-skill`, "Florence's article: x.com/flxrnc", and "Made with the skill it explains". Hold at least 4 s on the full card.

LOOK:
- Canvas #ECEBE7, ink #1C1C1A, one accent #2F55E0. Red #D7263D only for notes and failures, green #1F8A5B only for pass and fixed.
- Geist for text, Geist Mono for code and numbers. Type scale in design.css: body at least 28 px, key words at least 44 px.
- Cards are white, radius 28, soft shadow.
- Only s04's top pane uses the banned defaults, deliberately and labeled.
MOTION:
- Every number from skills/video/animation-principles.md. Springs at ζ 0.82 for objects and 1.0 for text.
- Entrances ease out over 400–600 ms; exits ease in and are 40% shorter (kit.show does both).
- Stagger list items 40–80 ms, letters 1 frame.
- One hero move per shot; secondaries travel 60% as far and start 150 ms later.
- Holds: at least 1.5 s plus 0.33 s per new word before the next change.
CAMERA:
- 3D: FOV 40° with a slow drift (in hero3d).
- 2D: no camera moves except one slow push of about 2% during long holds.
SOUND:
- George (`JBFqnCBsd6RMkjVDRZzb`).
- The calm bed at 120 BPM (bed.py), ducked under the voice.
- sfx() only on visible hits: a hero landing, a check turning green, a note pinning. Each lands one frame after its picture.
- Mix with `--social` (−14 LUFS), true peak −1 dBTP. check_sync.py passes.
BAN:
- The starter list in references/brief.md.
- Emoji, except the "one prompt ✨" joke in s02.
- Stock icons with mixed stroke widths. Draw icons with 2.5 px strokes in ink.
- Text that moves while it is read.
- Anything in the caption band.
QA:
- Every scene: a contact sheet (`review.mjs sheet index.html --from <cutIn> --to <cutOut> --frames 12`) and a speed graph of its hero move.
- `check()`s for each scene's settle frames.
- The holds pass per scene, and `review.mjs audit` passes.
- Log every round in log.md.

Render contract: references/brief.md → Render contract.
