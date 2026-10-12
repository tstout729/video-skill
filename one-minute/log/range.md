# Review log: s03 The range and s04 Style packs

Builder: range. Files: `scenes/s03.js`, `scenes/s04.js`. QA files: `qa/range*`.

## Plan

### s03 (13.03–22.50)

The plan uses four sub-roots inside the scene root and runs them with `transitions.js` `scenes()`, which calls `transition()` for each pair. Each sub-shot owns the frame from one handoff to the next.

| Sub-shot | On screen | Owns the frame | Its word | Change in |
| --- | --- | --- | --- | --- |
| Walkthroughs · sand | 13.03–16.60 | 13.48–16.30 (2.82 s) | "walkthroughs" 15.52 (the roll ends on it) | the push up from s02 |
| Diagrams · ink | 16.00–18.80 | 16.30–18.40 (2.10 s) | 16.56 (handoff −0.26, end +0.04) | whip left, beat 32 (16.00), 0.6 s |
| 3D · canvas | 18.00–20.55 | 18.40–20.25 (1.85 s) | 18.88 (handoff −0.48, end −0.08) | zoom-through into the window, beat 36 (18.00), 0.8 s |
| Loops · pine | 19.95–22.50 | 20.25–22.50 (2.25 s) | 20.32 (handoff −0.07, end +0.23) | push left at 19.95, 0.6 s |

- **The push off the beat.** The push starts at 19.95, 3 frames before beat 40, because "loops" (20.32) forces it to end by 20.57. A start on beat 40 ends 0.28 s after the word.
- **No sub-shot can hold 1.8 s settled between changes.** "3D" (18.88) and "loops" (20.32) are 1.44 s apart, so the rule is applied from handoff to handoff. The best possible settled 3D stretch was 1.59 s.

### s04 (22.50–29.75)

- The story clip's time 0 is at 19.45 s.
- The sun rises at 24.55, in full riso.
- The pixel wipe runs 26.34–27.14, and the bloom follows at 27.00.
- The cut-paper wipe runs 27.43–27.93.
- The bee lands at 28.65 and the wipe out starts at 28.85.

## Round 1: first build, stills

- **Checked.** 27 stills (`qa/range-r1/`) at every cue, the cuts and the transitions.
- **Walkthrough crop.** f828–f960 (13.80–16.00): at 1.3x, the walkthrough window cut the training steps into fragments ("ite", "embers") at its left edge. The steps panel ends at clip x 300, and a 1.3x crop can start no further right than x 252.
  - Fix: 1.12x, focused on (474, 287), so the steps and the invite card are both whole.
- **Window position.** f885–f1349: the windows ended at y 980, leaving 130 px above the caption band but only 102 px under the chrome.
  - Fix: the word and the window moved down 25 px (word at 221, window 405–1005).
- **3D mark.** f1152 (19.20): the mark was about 230 px tall, and at its apex it came within 20 px of the window's top edge.
  - Fix: tried fill 0.38 (see round 2).
- **s04 tags.** f1350–f1784: the tags were 28 px chips under the square. They were small on a phone and sat right on top of the caption pill.
  - Fix: the tags became column heads over each third, 36 px Geist 650, dim #8a857c (5.0:1) lighting to saffron. The square moved to y 198–1098.
- **Result.** The first draft plays and both scenes read. The notes above were carried into round 2.

## Round 2: stills and contact sheets

- **Checked.**
  - stills (`qa/range-r2/`, `qa/range-r3/`)
  - `qa/range-s03.png` and `qa/range-s04.png`
  - `audit --grep s03` and `audit --grep s04`
- **Hop apex clipped.** f1151 (19.19): at fill 0.38, the window's top edge cut off the top of the mark at the hop's apex.
  - Fix: the framing now aims where the push-in ends (aim [−0.55, 0.55]), so the push is a pure dolly that closes 16% of the distance. Fill is 0.34 and the centre is at 0.657. The apex now clears the window top by 32 px, and the resting mark sits 67 px above the bottom edge. The check "the mark stays inside its window" passes on all 70 frames.
- **Double exposure.** f906–f912 (15.10–15.20): "One skill" faded out over "Walkthroughs" fading in, so both words showed at once.
  - Fix: a masked roll (round 3 refined it).
- **"Walkthroughs" arrived late.** f931: the check "Walkthroughs fully in" failed. The swap ended 0.14 s after its word.
  - Fix: retimed so the roll ends on the word.
- **Result.** s04 passes 9 of 9 checks, and s03 passes everything except the roll timing.

## Round 3: speed graphs, lint, cuts, draft MP4

- **Checked.**
  - graphs: `qa/range-graph-s03-hop.png`, `qa/range-graph-s04-pixel.png`, `qa/range-graph-s04-paper.png`
  - `lint --query finish=0` and `cuts` (`qa/range-cuts.png`)
  - the draft `qa/range.mp4`, with its sheets `qa/range-mp4-roll.png` and `qa/range-mp4-mid.png`
- **Loop check off the beat.** f1297 (21.62): the loop was still spinning on "beat". The beat plan's 7.0 s is when the ring starts to close; the green arrives later. Measured on the clip: frame 173 (5.767 s) is the first green frame, and frame 175 is solid.
  - Fix: the clip starts at 21.50 − 173/30, so the first green frame lands on f1290, beat 43, under "beat" (21.44).
  - Fix: the success sound plays 1 frame after the solid frame.
  - Fix: a check reads the shown clip frame on f1288–f1296.
- **Roll collision.** Draft f62–f66 (15.10–15.23): the two words moved on different curves (ease-in out, ease-out in) and nearly collided.
  - Fix: the words now sit on one strip, one line (166 px) apart, which moves up once, ease-in-out over 0.45 s, and ends on "walkthroughs" (15.52).
  - Verified at 15.12–15.52 (`qa/range-r4/`): the "g" descender is whole when the word settles.
- **Graphs.**
  - Hop: anticipation f1131–f1135, a clean parabola, touchdown f1166, soft start and soft stop, and the squash settles by f1195.
  - Pixel edge: moves f1587–f1622, peak 36.7 px/frame.
  - Paper edge: moves f1649–f1672, peak 28.7 px/frame.
  - Both edges ease in and out with no corners.
- **Cuts.**
  - The push up, the zoom-through, the push and the 22.50 cut are fine.
  - The whip's end (f996) warns: "↓ 9.3, zoom −1.7% → still". The cause is the caption line changing at 16.56 inside the check's 4-frame window. My sub-roots move less than 1.3 px/frame there, horizontally (whip offset 1.3 px at f992, 0.005 px at f995). It is not in my files.
- **Lint.** No findings.
- **Result.** All fixed, apart from the caption-driven cut warning.

## Round 4: verification

- **Checked.**
  - `audit --grep s03`: 16 of 16 pass. `audit --grep s04`: 11 of 11 pass. s04 gained two checks: one that the story is lively in the window, and one that the wipe out first reaches the square at 29.10.
  - `lint --query finish=0`: no findings.
  - `cuts`: as in round 3.
  - final sheets `qa/range-s03.png` and `qa/range-s04.png`
  - onion skins `qa/range-onion-hop.png` and `qa/range-onion-pixel.png`
  - `holds` on a finish-free draft (`qa/range-clean.mp4`)
- **Holds.** Holds in s03 measure 0.7, 1.5, 0.6 and 1.0 s; s04 has none, because the real clips never stop.
  - In both scenes, the frame around the clip holds still (the word, the window and the tags). Only the clip moves inside it, so I checked holds on stills.
  - s04's composition holds unchanged from f1682 (28.03) to the cut out at 29.75 (1.72 s). It is whole until 29.10, when the wipe out reaches the square.
- **Result.** No notes left.

## Notes for shared files (not changed)

- **`kit.clipWindow` hairline.** The window draws its 1.5 px hairline as an inset `box-shadow` on the window itself. The `<img>` covers it, so the brief's hairline never shows on clip windows. My scenes add a rim layer above the picture instead.
- **The whip-end cut warning at 16.60.** It comes from the caption line change at 16.56. A way to exclude `#cap` from `review.mjs cuts` (for example `data-fx`) would clear it.
