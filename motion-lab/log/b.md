# Review log: agent b (s06–s10)

Windows (kit.sceneWindow, 120 BPM grid from t = 0): s06 82.00–97.50, s07 97.50–112.00, s08 112.00–126.00, s09 126.00–145.00, s10 145.00–156.00.

## s06 Programs, not video

Plan: "Programs, not video" (h1) mid-stage from the cut, rising out of the way 0.8 s before "Code" (85.40 s). The pipeline builds left to right on its cues: Code (`window.seek(t)` types on 1 frame a letter), Browser (87.72 s, a real walkthrough frame), and on "freezes" (88.04 s) 5 real frames of the walkthrough clip (frames 1, 37, 73, 109 and 145, evenly spaced through its 6 s) drop in 50 ms apart; Video tool on "video tool" (89.80 s). Hero move on "joins" (90.52 s): the 5 stills slide together on one spring (ζ 0.82) into a clip with an ink outline and a play bar, and the video tool plays the clip at 1x in step with the playhead. Benefits, one row per cue: "repeatable" (91.96 s, the same frame twice with "="), "cheap edits" (93.80 s; on "cheap" roughness 0.35 → 0.30 and the disc's highlight tightens), "self-checking" (95.48 s, a magnifier slides onto a frame and shows its email field at 2.4x). The pipeline steps back to 50% when the benefits begin.

### Round 1: stills at 82.0, 85.9, 88.4, 90.3, 90.75, 91.6, 92.9, 94.9, 96.9, 97.48
- f5849: the browser's three window dots crowd its name ("Browser ○○○"). Fix: removed the dots.
- f5849: the benefit proofs start at x 400, 120 px from the widest chip; the rows read as two columns. Fix: proofs at x 360.
- f5304: the stills disappear into the canvas, because the walkthrough's own background is the canvas color. Fix: a 2 px ring on each still and each proof frame (fades as the stills join).
- Result: fixed.

### Round 2: contact sheet f4920–f5849, speed graph of still 0 (f5424–f5508)
- f4920–f5089: the statement sits at the top with 70% of the stage empty (dashed slots only) for 3.4 s. Fix: the statement opens mid-stage (y 400) and rises to y 26 (0.8 s ease-in-out) just before "Code"; dashed slots removed. New check: it has risen before the code card arrives.
- Speed graph: the join ran 0.57 s (f5432–f5466), short for a move in an explainer. Fix: spring duration 0.9 → 1.2 s; now 0.73 s (f5432–f5476), soft start, soft stop, 1 px overshoot.
- f5440–f5460: the playhead appeared and playback started while the stills were still sliding (two moves at once). Fix: the playhead appears once the join has stopped (speed under 0.5% of its range, tJoin + 0.75 s), and the clip plays from then until the pipeline steps back.
- Result: fixed.

### Round 3: audit, draft (qa/b-s06.mp4, 30 fps, scale 0.5), join and lens strips, contact sheet
- Audit: 10 of 10 s06 checks pass (stills 50 ms apart and left to right; join on its marks from f80; no still moves before the join; playhead marks the clip time shown; statement risen before "Code"; code line fits its card; 0.30 replaces 0.35; last benefit holds ≥ 1.83 s; nothing overlaps; everything inside the stage).
- Join strip (draft frames 255–290): the stills close evenly; outline and playhead follow; the video tool starts playing after the move.
- Lens strip: glides in on an arc and settles on the field; off the frame it showed white paper. Fix: lens background in the canvas color.
- Holds (`review.mjs holds`): 2.1 s (statement), 2.1 s (code card), 1.7 s (last benefit). The 1.0–1.4 s stretches sit between the narrator's back-to-back cues (browser, freezes, video tool; repeatable, edits, cheap).
- Result: no notes left. 3 rounds.

## s07 The render contract

Plan: one card fills the stage from the cut, "Render contract" with "pasted under every motion prompt". Three numbered rules on their cues, each with a live demo; finished rules step back to 45%.
- 1 on "No clocks" (100.52 s): a clock (2.5 px ink) whose second hand ticks 30° twice a second; on "timers" (101.40 s) a red strike draws across it (0.35 s) and the hand stops.
- 2 on "Seeded" (102.44 s): two fields of the same 16 seeded dots. Left, `Math.random` (red): new random offsets (±9 px, radius ±20%) on every video frame, reseeded with `rand(Math.round(t * 60))`, so the render stays reproducible. `round`, not `floor`: the renderer's 4 subframes for frame n sit at (n − 0.3 … n)/60, so `floor` would blend two fields into each frame. Right, `rand(seed)` (green): holds still.
- 3 on "a loop" (104.28 s): 8 frames of a dot going round (50 ms apart), played into a 170 px preview at 0.16 s a frame from 105.34 s. Hero move on "because frame N" (107.84 s): a 9th frame slides in from the right (spring ζ 0.82); on "repeats" (108.84 s) it turns red and "frame N = frame 0" pins. The playback schedule puts the seam with N at 109.18 s and 110.62 s (on "causes a hitch"): at each, the dot holds at the top for two steps (N, then 0), the preview rings red and "hitch" lights. At 110.94 s, right after the second hitch, N leaves (ease-in, 0.3 s) and the 8-frame loop runs smoothly to the cut.

### Round 1: stills at 97.5, 100.9, 101.9, 103.4, 105.6, 108.2, 108.95, 109.3, 110.0, 110.7, 111.3, 111.98
- Planning fix before render: frame N on "frame N" left 0.8 s before "repeats", but a ζ 0.82 spring of 1.0 s needs 1.18 s to come within 0.5 px. Fix: it slides in on "because", and the settle check runs from its first play (109.18 s).
- f6537 (108.95) to f6558 (109.30): N red, cursor on N, preview ringed red, "hitch" lit; the stall reads in a still. f6678 (111.3): N gone, the loop runs on. No notes on the demos.
- Result: no changes.

### Round 2: contact sheet f5850–f6719, speed graph of frame N (f6462–f6552), audit
- Speed graph (qa/b-s07-graph.png): N moves f6471–f6509 (0.63 s), 121 px, soft start and stop.
- f5850–f6008: the card is empty for 2.6 s apart from its title and dividers. Fix: each rule's number sits faint in its row from the cut, so the opening reads as a numbered form waiting to fill; the number darkens with its rule.
- Audit: 13 of 13 s07 checks pass, including: the `Math.random` field changes on every frame and is on screen (568 frames); its 4 subframes agree, so each frame is one sharp field; the `rand(seed)` field never moves; the clock stops once struck; N shows frame 0's picture; the loop plays 0…7 with no repeat before N; at each seam the preview holds frame 0's picture for two steps; the second hitch lands within 0.15 s of "causes a hitch"; N is red before it first plays and on its mark; after removal N never plays.
- Result: fixed.

### Round 3: draft (qa/b-s07.mp4, 30 fps, scale 0.5), hitch strip, contact sheet
- Hitch strip (draft frames 338–361, every 2nd): 5, 6, 7 advance; then N and 0 both show the dot at the top in a red preview with "hitch" lit; then 1. The hitch reads in motion.
- Holds: 2.4 s on the opening card, then 1.1 s after the strike. From 102.44 s the `Math.random` field jitters on every frame by design, so freezedetect finds no holds after it (the reference warns about this); the stills confirm the holds (rule 2: 1.84 s; rule 3 states: 0.8–1.6 s between the narrator's cues).
- Result: no notes left. 3 rounds.

## s08 Ways in

Plan: two option cards side by side from the cut, "Claude app" (full, with a drawn chat-and-preview window, 2.5 px ink) and "Claude Code" (waiting at 45%). "no install" chip on "no install" (113.32 s). On "Claude Code" (116.20 s) focus moves: the app card steps back to 55%, the Claude Code card comes up to full. Its loop builds on the words: "render" (117.40 s), "look" (118.68 s), "fix" (119.72 s); each pill pops in (scale spring ζ 0.82) and lights accent as the arc before it draws (0.4 s ease-in-out), then fix → render closes the loop. On "Start" (121.72 s) both cards step back and an effort control arrives (low / medium / high). Hero move on "medium" (122.28 s): the accent pill springs onto medium (scale 0.7 → 1, ζ 0.82). On "raise" (123.48 s) a "raise" chip waits under "high"; on "after two" (124.28 s) two red ✕ marks appear 120 ms apart and "raise" lights 0.25 s after the second.

### Round 1: stills at 112.0, 114.5, 116.9, 118.0, 119.3, 120.6, 122.0, 122.9, 124.0, 124.9, 125.98
- Planning fix before render: with 28° gaps the arcs ended under the wide pills (the closing arrowhead hid under "render"). Fix: radius 130, gaps per pill (42° at the wide top pill, 24° at the side pills). New check: each arc ends clear of the pills.
- f6720, f6870: the loop's three pills already show in the waiting card, before their words. Fix: each pill pops in on its own cue.
- f7559: the composition sits high; 200 px empty at the bottom. Fix: moved down (see round 3).
- Result: fixed.

### Round 2: contact sheet f6720–f7559, speed graph of the pill (scale, f7326–f7404)
- Speed graph (qa/b-s08-graph.png): the pill moves f7337–f7365 (0.47 s), soft start, soft stop; feedback in an explainer is 300–500 ms.
- f6720–f7330: the lower half of the stage is empty for 9.7 s while the cards hold. Tried: the cards open centred and rise 170 px before "Start" (the s02/s03 pattern). Rejected before render: "itself" runs to 121.52 s, so the 0.8 s rise would start 0.15 s after the loop closes and move the loop while it is read.
- Result: changed to a static layout in round 3.

### Round 3: stills at 112.0, 120.9, 125.98
- Static layout: taller cards (500 px) at y 140, the effort label at y 668, the control at y 720, the misses and "raise" at y 852. The opening group sits mid-stage (36% of the stage below it waits for the effort rule); the final frame is balanced (top margin 140, bottom 76). ✕ marks enlarged from 56 to 64 px to read on a phone.
- Result: fixed.

### Round 4: audit, draft (qa/b-s08.mp4, 30 fps, scale 0.5), contact sheet
- Audit: 11 of 11 s08 checks pass (pill on medium from f47 after its cue; the loop lights only "render", then only "look", then only "fix"; arcs clear of the pills; "raise" lights only after both misses; misses 120 ms apart; last change holds ≥ 1.5 s; nothing overlaps; pills inside their card; everything inside the stage).
- Holds: 1.9 s after the loop closes; the rest are 0.8–1.2 s, split by the narrator's cues and by caption line changes (114.4 s, 115.7 s); the ✕ state holds 1.72 s to the cut.
- Result: no notes left. 4 rounds.

## s09 Anatomy of a directed prompt

Plan: a `brief.md` card with five empty ruled lines, centred on the stage from the cut. "1 line = 1 decision" pins on "one decision" (128.28 s). The brief writes itself on its cues, 1 frame a character, in mono, with this video's own numbers: GOAL "viewer knows every idea, in order" (130.52 s), TIME "325.92 s · 60 fps · 19,555 frames" (132.20 s), SHOTS "21 · one hero move each · cut on beat" (133.00 s), OUTPUT "1080×1350 · 60 fps · three.js r186" (133.80 s), QA "12-frame sheet · speed graph · audit" (134.84 s). On "Add" (136.04 s) the brief rises to the top and steps back to 50%, and the BAN card follows as the rise ends. Each default arrives on its word as a tiny live example: gradients (purple to blue), glow (a blue orb), particles (7 dots on loopNoise), everything fading in at once (three bars pulsing together, 1.4 s a cycle). After "once" they are struck 120 ms apart (141.81 s on), dim to 55% and their motion slows to a stop over 0.4 s. Hero move on "grow" (142.60 s): the card grows one row (spring ζ 0.82) and "turntable spin" (a tile turning about its vertical axis) rises in with a "new" tag, then is struck.

### Round 1: stills at 126.0, 128.9, 131.5, 135.6, 137.2, 138.3, 139.9, 141.0, 142.4, 143.0, 143.9, 144.98
- Planning fix before render: once struck, the pulsing bars could freeze at opacity 0 and the spinning tile edge-on, so the struck example would look empty. Fix: struck bars ease to full, the tile eases to face-on.
- f7560–f8180: the brief sits at the top with the lower half empty for 10.4 s. Fix: it opens centred (y 284) and rises to y 24 on "Add" (0.8 s ease-in-out), stepping back to 50%; the BAN card follows. New checks: the brief is fully written before it rises; it has risen before the ban card arrives.
- f8699: struck items fade to 40% and muted gray, so what was banned no longer reads. Fix: they dim to 55% and stay ink; the red strikes stay full.
- Result: fixed.

### Round 2: contact sheet f7560–f8699, speed graph of the new row (f8550–f8640)
- Sheet (qa/b-s09.png): one change per cell, in the narrator's order; the rise clears the lower half before the ban list.
- Speed graph: the new row moved 24 px in 0.58 s, short for a move in an explainer. Fix: grow spring 0.9 → 1.2 s and the row starts 40 px below; now 0.72 s (f8557–f8600), soft start, soft stop. The "pop" now fires when the spring first reaches its mark.
- Result: fixed.

### Round 3: audit, draft (qa/b-s09.mp4, 30 fps, scale 0.5), strike and grow strips
- Audit: my new check caught the BAN card arriving at +0.55 s while the brief was still 34 px above its mark (ease-in-out at 69%). Fix: the BAN card enters as the rise ends (+0.8 s, during "list"). Then 11 of 11 s09 checks pass (lines typed 1 frame a character before the next cue; lines fit the card; strikes 120 ms apart; struck examples hold still; new row on its mark from f76; card inside the stage as it grows; nothing overlaps; brief written before it rises and risen before the ban card; the grown list holds ≥ 2.2 s).
- Strike strip (draft frames 474–485): one strike at a time, left to right, 120 ms apart. Grow strip (498–530): the card opens downward and the row rises in under it, then its strike.
- Holds: 1.7 s, 1.9 s and 1.8 s while the brief opens and GOAL lands; 0.6–1.3 s between the back-to-back line and ban cues; the live examples never stop until struck, by design; 1.5 s on the grown list to the cut.
- Result: no notes left. 3 rounds.

## s10 One hero move

Plan: three labelled rows from the cut: "hero" (an accent card, 320×180), "secondary" (two white cards, 260×120) and "ambient" (6 faint dots drifting on loopNoise, period 8 s, 13 px per axis, so never more than 18.4 px from home). Hero move on "hero" (146.68 s): the hero card moves 400 px right on a spring (ζ 0.82, duration 1.2); both secondaries start exactly 150 ms later on the same spring and travel 240 px (0.6 × 400). A tape under each row draws with the move and stays as the measure of its travel. Labels on their words, left-aligned under the tapes so nothing shifts: "100%" on "travel" (149.00 s), "60%" on "sixty percent" (149.56 s), "· +150 ms" appended on "a moment" (151.20 s). On "later" (151.84 s) all three travel back with the same 150 ms offset, so the delay is seen twice. On "Ambient" (152.60 s, +0.3 s once the cards are home) the dots darken and each shows its 20 px envelope (5% of 400); "< 5%" on "five percent" (154.36 s), held 1.64 s to the cut.

### Round 1: stills at 145.0, 147.2, 148.2, 149.3, 150.0, 151.5, 152.1, 152.6, 153.6, 154.9, 155.98
- Planning fixes before render: centring "60%" and then appending "· +150 ms" would shift "60%" while it is read, so both percentage labels are left-aligned under their tapes; the envelopes waited for the return move to stop (+0.3 s after "Ambient").
- f8832 (147.2): the hero mid-move with the secondaries visibly behind; f9126 (152.1): on the way back the hero leads and the secondaries are still home. The lag reads in stills.
- f9359: cards small for a phone (280×160 and 220×110 on a 1080 stage). Fix: hero 320×180, secondaries 260×120, rows re-spaced; travel unchanged.
- Result: fixed.

### Round 2: speed graphs of the hero and a secondary (f8790–f8898), audit
- Hero (qa/b-s10-graph.png): moves f8802–f8845 (0.72 s), range 404.4 px (ζ 0.82 overshoot of 4.4 px, settling on 400), soft start and stop.
- Secondary (qa/b-s10-graph-secondary.png): moves f8811–f8854, exactly 9 frames (150 ms) after the hero; range 242.7 px (settles on 240).
- Audit: 10 of 10 s10 checks pass: hero travel exactly 400 px (±0.5, 213 frames); secondaries exactly 240 px and 0.600 of the hero's (204 frames); frame by frame through both starts, the hero leaves its mark first and the secondaries exactly 150 ms later (out and back); ambient dots stay under 20 px from home on every frame (660 frames), and each really drifts more than 4 px; tapes measure 400 and 240 px; nothing overlaps; everything inside the stage.
- Result: no changes.

### Round 3: contact sheet f8700–f9359, draft (qa/b-s10.mp4, 30 fps, scale 0.5)
- Sheet (qa/b-s10.png): one change per cell; the return (f9119) shows the hero leading home.
- Holds: 1.6 s on the labels, 1.6 s on the envelopes, 1.1 s on "< 5%" in the draft's last measured stretch (1.64 s to the cut by the cue times). The ambient drift never stops, by design, so freezedetect undercounts.
- Result: no notes left. 3 rounds.

## Summary
- All five scenes built; 55 checks declared (s06 10, s07 13, s08 11, s09 11, s10 10), all passing in the final `review.mjs audit` (qa/b/audit-final.log), which has no failures in any scene.
- Contact sheets: qa/b-s06.png … qa/b-s10.png. Speed graphs: qa/b-s06-graph.png … qa/b-s10-graph.png (+ qa/b-s10-graph-secondary.png). Drafts: qa/b-s06.mp4 … qa/b-s10.mp4.
