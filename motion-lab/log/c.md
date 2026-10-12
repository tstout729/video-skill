# Review log: agent c (s11–s13)

Windows (kit.sceneWindow, 120 BPM grid from t = 0): s11 156.00–176.00, s12 176.00–194.00, s13 194.00–210.50.

## s11 Easing and springs

Plan: three white cards, stacked.
- **Easing** (on screen from the cut, empty axes): each curve is drawn by the pen at its own clock, and a ball runs the same curve on a track. "enter": ease-out, 600 ms, on "Entrances". "exit": ease-in, 330 ms, so 45% shorter. Its ball fades in on "Exits" and leaves the clipped track on "in". "move across": ease-in-out, 800 ms, on "shorter". On "forty to fifty", the entrance's curve appears as a ghost on the exit's axes, with the saved span bracketed and "−45%" beside it.
- **Springs**, the hero move: on "ratio" (f9946) three blocks launch on the same frame on `kit.spring01` with damping 1.0, 0.8 and 0.5, travelling 220 px over a 0.7 s spring. Each block traces its own step response. The overshoot labels are measured from the springs at build time (1 ms steps over 3 s), not typed in.
- **Position / opacity** (enters on "Position"): a ζ 0.5 block peaks at 1.16, then a ✓. On "Opacity", the same spring drives a swatch's opacity: the curve stops at 1.0, the lost part is drawn in red with a tinted area, and a ✕ marks the would-be peak.

### Round 1: stills at 156.0, 158.5, 161.2, 162.4, 164.7, 166.0, 167.6, 170.6, 173.4, 175.98; sheet qa/c-s11.png
- f9360 (cut): composed. The Easing and Springs cards are visible with empty axes, and the enter ball waits off-track.
- f10341 (172.35): the bottom card arrived 0.25 s before "Position" with nothing in it. Fix: the card enters on its cue.
- f10450 (174.17): the would-be overshoot was a dotted red line hidden under the blue curve, and the ✕ sat on the curve. Fix: draw only the part above 1.0, in solid red over a tinted area, and put the ✕ 16 px above the peak.
- The ✓ for "Position can bounce" came at +1.0 s, well after the block had visibly settled. Fix: ✓ at +0.75 s, when the block is within 3% of its mark. The ✕ and ✓ icons are drawn in SVG with 2.5 px strokes.
- Result: fixed.

### Round 2: stills at 160.9, 174.5, 175.98 (crops of the bottom card)
- f10470 (174.5): the opacity curve is clamped and the red part shows correctly.
- f10559 (175.98): the ✕ touched the baseline of "Opacity never does". Fix: moved both plots and notes 8 px down and took 8 px from the Easing and Springs cards.
- Result: fixed. The final still is clean, and every number on screen is measured from the motion.

### Round 3: draft qa/c-s11.mp4 (30 fps, scale 0.4), speed graph qa/c-s11-graph.png, holds, audit
- Graph of `#s11-spring-08` (165.60–167.20): moves f9946–f9974 with a soft start and stop, peak 13.9 px/frame at f9954, about 3 px over its mark at f9980, then settled. That is the ζ 0.8 shape.
- Stage-only holds (freezedetect): 2.3, 2.6, 1.8, 2.1, 2.9 and 2.1 s. The 0.8 s and 1.2 s stretches sit between cues the narrator speaks close together ("forty to fifty" → "shorter", "Position" → "Opacity").
- Audit: 16 of 16 s11 checks pass at 60 fps, at `--every 6` and at `--fps 30`. A failure another builder reported came from an earlier version of the file, whose entrance and exit checks tested "moving one frame before the end" against unsnapped cue times. Those checks were replaced with exact-curve checks.
- Result: no notes left.

## s12 Durations, stagger, beats, holds

Plan: four white cards, stacked. All four headers and their empty scaffolding are on screen from the cut. Each demo then starts on its cue and runs on its real number.
- **Durations:** one ruler from 0 to 1000 ms, with bands at 100–200, 200–500 and 600–900. A block grows across the ruler (ease-in-out) to its duration in exactly that long, and a stopwatch counts real elapsed ms. Feedback, 100 ms, on "tenth"; UI move, 350 ms, on "and"; hero reveal, 750 ms, on "six". The blocks end on f+6, f+21 and f+45.
- **Stagger:** on "list items", six rows enter 60 ms apart (400 ms ease-out each). Beside them, each row's entrance bar and its start offset, +0 to +300 ms. "40–80 ms" appears on "forty to eighty" and "60 ms apart" on "apart".
- **Beat grid**, the scene's hero idea: 24 × 60 ÷ 113 = 12.74 frames a beat. Row 1 rounds that to 13 and adds it up beat after beat. Row 2 is `round(n × 60/113 × 24)`. Both are computed in the scene, not typed. Dashed lines mark each true beat. On "Compute", beats 1–16 appear 140 ms apart, and row 1's error shows as a red bar and a number under each marker: 0 1 1 1 1 2 2 2 2 3 3 3 3 4 4 4. "on the line" (green) appears on "never", and "+4 frames · 167 ms" (red) on "drift".
- **Holds:** "Two words" enters on "text". Once it has arrived, a bar drains for 0.3 × 2 + 0.5 = 1.1 s (66 frames), then "held 1.10 s" with a ✓. The formula follows on "plus".

### Round 1: stills at 176.0, 177.6, 180.9, 182.75, 184.9, 187.0, 188.0, 189.3, 191.2, 191.9, 193.98; sheet qa/c-s12.png; audit
- f10560 (cut): composed: the Durations card with its ruler, the beat grid with its rails and true-beat lines, and two empty card shells.
- f11639 (193.98): every number reads: the drift 0→4 in red, "on the line" in green, "held 1.10 s".
- Audit: 3 failures.
  - "full early" at f10746 and f10845: an ease-out bar is legitimately within 0.05 px of full one frame before its end. Fix: drop that test. The every-frame curve test and the exact end-frame test already pin the duration.
  - Stagger at f10960: one gap measured 73.5 ms, because row 0's opacity was 0.99996, written as 1.0000, and could not be inverted. Fix: read starts only from rows that are mid-entrance (opacity 0.001–0.99), and compare the neighbours each frame can read. The gaps measure 60.0 ± 0.1 ms.
  - Overlap: the tick-label boxes for "0" and "100" overlapped by 8 px. Fix: 64 px label boxes. Then "Holds" touched the title's box by 0.4 px. Fix: the title moves down 4 px.
- Result: fixed. 11 of 11 s12 checks pass.

### Round 2: speed graphs, draft qa/c-s12.mp4 (30 fps, scale 0.5), holds
- Graph of `#s12-hero-bar` (179.9–181.1): HARD START. A cubic ease-out starts at full speed. Fix: the blocks travel across the ruler, so they use ease-in-out, the brief's curve for moves across. After the fix: soft start and soft stop, 0.55 s.
- Graph of `#s12-item-0`: the start is flagged, but this is kit.show's standard entrance (24 px ease-out while opacity rises from 0), so the row is nearly transparent in its fastest frames. Kept, to stay consistent with every other scene.
- Stage-only holds: 2.9, 1.8, 2.8 and 1.6 s. The beat markers are 3 px wide at half scale, too small to break freezedetect while they reveal, so the stills confirm them instead.
- Result: no notes left.

## s13 Camera, parallax, accessibility

Plan: three white cards, stacked. As in s11 and s12, the card shells and headers are on screen from the cut, so the chapter reads as a cheat sheet filling in. Every demo element enters on its own cue.
- **Parallax**, the hero move: a three-layer landscape in a 620×324 window. On "parallax" (f11834) the camera pans once, 400 px over 1.8 s on an ease-in-out sine, the gentlest curve. The layers translate by speed × camera: foreground 1.0, midground 0.5, background 0.2, so 400, 200 and 80 px. One accent shape per layer (fence post, tree, sun) is tracked, with a dashed ghost at its start. A "camera" track below shows the same curve as a moving dot, and its label ("ease-in-out · 1.8 s") appears on "gentlest". The speed labels appear on "foreground", "middle" and "background".
- **Contrast:** two samples on white. The ratios are computed in the scene with the WCAG 2 formula (relative luminance, then (L1 + 0.05) / (L2 + 0.05)). #9d9a96 measures 2.8014:1 and shows "2.80 : 1"; it enters on "Keep" and is struck, with a ✕, on "contrast". #777772 measures 4.5005:1 and shows "4.50 : 1"; it enters on "four" and gets its ✓ on "one". The colors were chosen by a search over warm grays, taking the first ratio at or above each target.
- **Flashes:** on "never", a lamp pulses three times, 0.6 s apart, on smooth raised-cosine bumps from 20% to 100%. A gauge from 0 to 5 per second, with the zone above 3 in red, holds the most peaks seen in any one second, and ends at "2 / s" with a ✓.

### Round 1: stills at 194.0, 195.9, 198.1, 199.5, 202.9, 205.3, 206.9, 208.3, 210.48; sheet qa/c-s13.png; audit
- f11640 (cut): composed: the landscape in its window and the flash gauge, with an empty Contrast shell between them.
- f12629 (210.48): after the 200 px pan, the gray tree from x 650 ended at x 450, right under the midground ghost at 430, so the ghost looked like it belonged to the wrong tree. Fix: trees respaced to 170, 430, 740 and 920, so the nearest one ends 58 px clear of the ghost.
- f12269–f12359: the 2.80 sample sits unstruck for 0.6 s, then the strike draws; the passing sample comes in on "four". The order matches the narration.
- Audit: 9 of 9 s13 checks pass on the first run, and 125 of 125 across the page.
- Result: one fix.

### Round 2: still at 199.2, speed graph qa/c-s13-graph.png, draft qa/c-s13.mp4 (30 fps, scale 0.5), holds
- f11952 (199.2): every ghost now sits clear, and the travel reads at a glance: post 400 px, tree 200 px, sun 80 px.
- Graph of `#s13-fg-post` (197.0–199.5): one move, f11846–f11930, with a soft start and stop, peak 5.8 px/frame at f11888, which is the sine's midpoint. No hard corners.
- Stage-only holds: 3.3, 2.1, 1.6 and 1.8 s. The contrast section runs at the narrator's pace (1.4, 0.9 and 1.0 s between cues), and the last hold, from the flash ✓ at 209.28 to the cut, is 1.2 s.
- Audit after the fix: 9 of 9 s13 checks pass.
- Result: no notes left.
