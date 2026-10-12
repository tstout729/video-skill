# The video skill, in one minute

GOAL: In one minute, a LinkedIn viewer sees what the free video skill can make and how it works, shown by real output, not described. The film itself is the proof: every frame is made in code with the skill, and every clip in it is real output of the skill's own examples.
AUDIENCE: LinkedIn feeds, mostly phones, often muted at first. Every point must read from the picture and the burned-in captions alone. Frame 0 is the thumbnail, so it is a finished composition.
TIME: 55.92 s at 60 fps, 3,355 frames. Music bed at 120 BPM (a beat is 30 frames). Narration: George, 7 scenes, 113 words, 1.1 s gaps between scenes. Cuts land on the beat nearest the middle of a gap; a transition starts in the gap and ends before the next scene's first word.
OUTPUT: HTML + motion.js + transitions.js + three.js r186 (`/_vendor/three/`), 1080x1350 (4:5), 60 fps, 4 subframes, shutter 0.4, linear-light blur. Not a loop. Mixed at −14 LUFS for social.
FRAME:
- Chrome, y 68–110: "VIDEO SKILL" on the left, "0N / 07 · NAME" on the right, in Geist Mono 28 px. kit.chrome() draws it inside each scene.
- Stage, y 140–1100: the scene's content.
- Caption band, y 1110–1255: burned-in captions only. Nothing else may enter it. The bottom 95 px stay empty (feed buttons and the progress bar).
- Sides: 54 px margins (5%).

SHOTS: one scene module per narration scene (scenes/sNN.js). Every element enters on its own cue (kit.cueIn). Times below are from words.js.
  s01 Hook · canvas #ECEBE7 · 0.00–5.00, cut. Frame 0: the 3D ceramic play mark (hero3d, directed) already sits on its studio floor, large, in the lower two thirds. Above it, "Made in code." in display type (160 px). On "frame" (1.08): a mono counter under the title, `seek(t) → f 0065`, shows the real frame number on every frame. On "Claude" (3.88): the mark hops (hero3d hop: anticipation f0–f4, apex f21, touchdown f36, settled f65). The hop is the scene's one hero move. Hold to the cut.
  s02 The brief · ink #161513 · 5.00–13.93, push up into s03. On "brief" (6.74): a small mono label "brief.md". On "numbers" (7.30): the word "premium" set huge (180 px, faint). On "adjectives" (8.50): a strike draws through it. On "Premium" (9.78): "premium" shrinks and lifts to a label, and its numbers type on in saffron mono: "ζ 0.82 · 450 ms". On "spring" (10.98): a white card travels 520 px on exactly that spring (kit.spring01, damping 0.82, duration 0.45), and its speed curve draws beneath it. On "barely bounces" (12.08): the overshoot is marked on the curve with its measured size, +1.1% (5.8 px on the 520 px move). One move at a time.
  s03 The range · four sub-shots, each with one word set huge (140 px) above a real clip in a rounded window. 13.03–22.50, cut.
    - "Walkthroughs" on sand #E6DDCC: the walkthrough clip (Acme's invite card: the pointer, the typed email), on "walkthroughs" (15.52).
    - "Diagrams" on ink: the explainer clip (Manim, DNS), on "diagrams" (16.56).
    - "3D" on canvas: the ceramic mark live (hero3d), a slow push-in and one hop, on "3D" (18.88).
    - "Loops" on pine #265746: the loop clip (one shape morphing through checkout states), on "loops" (20.32).
    Sub-shots change on beats with three different transitions.js kinds, 0.6–0.8 s each (whip, zoom-through, push). Each sub-shot is on screen at least 1.8 s, settled.
  s04 Style packs · ink · 22.50–29.75, wipe into s05. One square window, 900 px, plays "How a seed grows". The three style clips share one timeline (story.js), so they line up frame for frame. From the cut: riso. On "printed" (25.74): the "Riso" tag lights. On "pixelated" (26.46): a vertical edge wipes from the right to one third, and the right two thirds become pixel art. On "cut from paper" (27.58): a second edge wipes to two thirds, and the right third becomes cut paper. Hold the three-media picture with three tags (Riso · Pixel · Cut paper) for at least 1.5 s.
  s05 Voice and timing · pine · 28.85–35.53, zoom-through into s06. Three rows build on their cues: "writes the script" (30.12): the line of narration types on in mono; "records the voice" (31.32): the real waveform of this scene's narration draws on; "times every move to the words" (32.68): a playhead runs along the waveform at the true time, and each word lights with its start time in mono (e.g. "move · 32.48 s") as the narrator says it. All of it from words.js and audio peaks, never invented.
  s06 The review · canvas · 34.73–47.07, light leak into s07. On "reviews" (36.34): a frame of this film drops in as a card. On "Contact sheets" (39.54): a real contact sheet of this film assembles cell by cell. On "Onion skins" (40.90): a real onion skin. On "Speed graphs" (42.26): a real speed graph, its curve highlighted. Each new card arrives as the last one steps back (60% travel, 150 ms later). On "test" (43.78): a counter runs to this film's real number of check()s and turns green: "N checks · all pass".
  s07 End card · canvas, the hero studio · 46.07–55.92. The mark drops in and lands (hero3d land: touchdown f27, settled f63). Then, one at a time: "video skill" (h1); "Free and open source · MIT" on "free" (47.36); the install line `/plugin marketplace add tstout729/video-skill` on "Install" (49.28); `github.com/tstout729/video-skill` on "line". Hold the full card at least 4 s.

LOOK:
- Color-blocked scenes: canvas #ECEBE7, ink #161513, sand #E6DDCC, pine #265746. One accent per scene: saffron #E8A33D on dark scenes, clay #B4472E on light ones. Green #1F7A4F (light) or #7FD1A8 (dark) only for pass.
- Geist 700 for display type, tracking −0.045em. Geist Mono for code, numbers and chrome. Body 36 px; nothing under 28 px; contrast at least 4.5:1, measured with the finish off.
- Clip windows: radius 28, a 1.5 px hairline at 12% of the text color, a soft shadow on light scenes only.
- Film finish (launch film): grain 0.035 at 12 fields a second, vignette 0.12, and one light sweep, on the end card ("free").
MOTION:
- Numbers from skills/video/animation-principles.md. Springs at ζ 0.82 for objects and 1.0 for text.
- Entrances ease out over 400–600 ms; exits ease in, 40–50% shorter.
- Stagger 60 ms. One hero move per shot; secondaries travel 60% as far and start 150 ms later.
- Holds: at least 1.5 s plus 0.33 s per new word on a settled state before the next change. The montage's sub-shots are 1.8 s or longer.
CAMERA: 3D: FOV 40°, drift under 2% (hero3d). 2D: no camera moves.
SOUND:
- George (`JBFqnCBsd6RMkjVDRZzb`). The drive bed at 120 BPM in D (bed.py, seed 11), ducked under the voice.
- sfx() only on visible hits, at most 3 per scene: a landing, a check turning green, a card dropping.
- `mux.py --social` (−14 LUFS), true peak −1 dBTP, sounds 1 frame after their picture. check_sync.py passes, with little energy under 60 Hz.
BAN:
- The starter list in references/brief.md: gradients on UI chrome, glows, particles, lens flares, bouncy easing (ζ under 0.7), everything fading in at once, dead time, template looks.
- Emoji. Stock icons. Text that moves while it is read.
- Invented numbers: every figure on screen is measured from this film or its files.
- Anything in the caption band, or under 28 px.
QA:
- Per scene: a contact sheet, a speed graph of the hero move, check()s for settle frames, marks and overlaps.
- `review.mjs audit`, `lint --query finish=0`, `cuts` and `holds` all pass.
- Log every round in log.md, notes tied to frame numbers.

Render contract: references/brief.md → Render contract.
