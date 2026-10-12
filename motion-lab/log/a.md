# Review log: agent a (s01–s05)

Windows (kit.sceneWindow, 120 BPM grid from t = 0): s01 0.00–13.00, s02 13.00–31.00, s03 31.00–46.00, s04 46.00–64.50, s05 64.50–82.00.

## s01 Title

Plan: the full-stage directed studio, title "Motion Lab, / explained" (display 92 px) and a muted deck on screen from frame 0, with the mark resting left of centre, so the thumbnail has the hero in it. On "AI" (5.32 s) the mark hops into the centre (x0 = −HOP.travel, so it lands on x 0): touchdown f36 = 5.92 s, exactly on "animate"; settled at hop + f65. On "code" (10.80 s) `seek(t) → frame` types on under it, 1 frame per letter, laid out in advance so the line never shifts.

### Round 1: stills at 0, 5.67, 5.95, 6.50, 11.00, 12.95
- f0: the canvas edge makes a hard seam with the chapter bar (y 128) and the caption band (y 1120). Tried: a CSS mask fading the studio into #ECEBE7 on all four sides.
- f0 (masked): the cyclorama's falloff turned into grey smudges behind the title and at the lower right. Worse than the seam. Fix: reverted to full bleed; the clean straight edges read as one deliberate photographic panel.
- f357 (5.95 s): squash at touchdown lands on "animate". Kept.
- Result: composition kept full bleed.

### Round 2: contact sheet f0–f779, speed graph f312–f408, audit
- Sheet (qa/a-s01.png): one idea per cell; title holds 5.3 s while the narrator reads it; the hop is the only move; the code line holds 1.9 s to the cut.
- Speed graph (qa/a-s01-graph.png): moves f320–f358, 0.63 s; anticipation dip of 10 px at f320–f324, parabolic arc, soft start and soft stop; settled to < 1.5 px/frame by f358 and on the centre line (+233 px).
- f0: the chapter name "01 The one-prompt myth" is not on screen until 0.05 s (shell: show(name, t, t0 + 0.05)). Reported to the coordinator; not in my files.
- Audit: 6 of 6 s01 checks pass (every 6th frame).
- Draft at --scale 0.5 failed: 540x675 has an odd height for libx264. Re-rendered at --scale 0.4.
- Draft (qa/a-s01.mp4, 30 fps, scale 0.4): a 5x5 tile of f316–f364 shows anticipation, arc and the landing squash on "animate". `review.mjs holds` cannot see holds here: the 3D camera drift (under 1% of the frame) never stops, as the reference warns. Stills confirm the holds: title 5.3 s, landed mark 4.9 s, code line 1.9 s.
- Result: s01 finished in 2 rounds.

## s02 The one-prompt myth

Plan: the post card on screen from the cut (views count up 13.2–17.4 s); strike on "weren't" (17.72 s, 0.45 s ease-out); axis on "One music video"; the 5-minute sliver on "five-minute brief" (20.16 s) and the 12-hour bar on "twelve hours" (21.44 s, 1.0 s ease-out), both on one 900 px axis (5 min = 6.25 px). Hero move: on "the middle" (24.41 s) row 2 drops 262 px on a spring at ζ 0.82 and three red frame notes pin in on "notes", "fixes" and "this peak".

### Round 1: stills at 13.0, 18.3, 21.0, 22.8, 25.0, 30.95
- f1857: the "12 h" tick label hangs past the axis end and the right margin (x 1045). Fix: right-align it on the tick; tick labels in Geist, not mono (the mono space was too wide).
- f1857: the dimmed card at 45% turns the red strike pink. Fix: dim to 50%.
- Result: fixed.

### Round 2: contact sheet f780–f1859, speed graph of row 2 (f1452–f1548), audit
- f780–f1270: the card sits at the top with two thirds of the stage empty for 8 s. Fix: the card opens near the middle (y 300) and rises to y 40 on "One music video" (0.8 s ease-in-out, stepping back to 50%); the axis follows 0.55 s later, once the card has cleared it. New check: the rising card never touches the timeline.
- Speed graph: the opening ran 0.58 s, short for a layout change in an explainer (0.9–1.5 s). Fix: spring duration 0.9 → 1.2 s; now 0.73 s of travel with a 4 px overshoot, soft start and stop.
- Result: fixed.

### Round 3: contact sheet, rise strip (18.7–19.9 s), graph, audit, draft
- Rise strip: the card clears the axis before the header arrives; one move at a time.
- Audit: 6 of 6 s02 checks pass (scale ratio 5/720, strike covers "one prompt", opening settled by +1.6 s, notes clear each other and both bars, the rising card never touches the timeline, everything inside the stage).
- Draft holds (qa/a-s02.mp4): 3.7 s, 1.7 s, 1.5 s, 2.2 s and 2.5 s holds; the short ones sit between the narrator's back-to-back cues (axis, sliver, bar).
- Result: no notes left. 3 rounds.

## s03 Lab notebook and thesis

Plan: the notebook card (title, binding drawn in 2.5 px strokes, ruled rows) on screen from the cut with row 01 "3 animations"; rows 02 and 03 on "every prompt" and "every follow-up". On "adjectives" (38.16 s) the box with "premium", labelled "the model's default". Hero move on "number" (42.84 s): the 7 letters fall out 1 frame apart (ease-in, 0.3 s) and "ζ 0.82" drops in 1 frame apart on text springs (ζ 1.0); the border turns solid accent and the label swaps to "your decision". On "you take" (43.56 s) the equation "adjective → number", held 2.44 s to the cut.

### Round 1: stills at 31.0, 35.6, 39.0, 42.90–43.15, 45.95
- f2583–f2589: the falling letters of "premium" and the arriving "ζ 0.82" overlap legibly for about 0.2 s ("ζ 0. 82" over "remium"). Fix: the box clips its contents, the old letters fall further (70–110 px) out through the bottom edge, the new ones drop in from above, and the rebuild starts 0.28 s after the break instead of 0.2 s.
- Result: fixed.

### Round 2: break strip (42.95–43.70 s), contact sheet f1860–f2759, speed graph of "ζ", audit
- Break strip: the old word leaves through the bottom edge as the new one lands; never two legible words at once.
- Speed graph (qa/a-s03-graph.png): "ζ" moves f2587–f2615 (0.47 s), soft start and stop, no overshoot (text at ζ 1.0).
- f1860–f2269: the notebook sits at the top with 60% of the stage empty for 7 s. Fix: it opens in the middle (y 300) and rises to y 40 on "main idea" (0.8 s ease-in-out, stepping back to 45%), 1.3 s before the box arrives. New check: it has risen before the box arrives.
- Result: fixed.

### Round 3: stills at 31.0, 37.2, 39.0, audit, draft
- Audit: 7 of 7 s03 checks pass.
- Result: no notes left. 3 rounds.

## Shared-file workaround (removed)
- 18:20: elements of other scenes drew over s04 (s11's easing labels at 60.6 s), because show() sets visibility:visible on children of hidden sections. I added a per-scene `opacity: 0` rule to s01–s04 and reported it. The shell now sets opacity on `.scene`, so the workaround was removed from all four files at 20:11.

## s04 Experiment 1

Plan: two canvases, 1080 x 460 each, with a 72 px band between them (460 + 72 + 460 = 992). Top: hero3d "default" (navy space, halo ring, 150 particles, turntable spin, flare). Bottom: hero3d "directed", fill 0.413 (the mark keeps its 190 px height in the shorter pane). Band: "same model · same subject · same 6-second loop" builds on its three "same" cues, then swaps out on "One run" for the two labels: "3 adjectives" (dark pill, chevron up to its pane) on "One run" and "450 words" (white pill, chevron down) on "other run". Callouts: each default gets a red dot (spring ζ 0.82), a leader drawn from it and a red chip, 250 ms after its word ("navy space" 56.41, "a glowing ring" 57.65, "particles" 59.21, "a spin" 59.93). Hero move: the bottom hop; the top pane dims to 40% over 0.4 s as it starts.

### Round 1: stills at 46.0, 50.8, 60.6, 62.5, 63.6, 64.45
- f3636 and f3867: another scene's labels drawn over the top pane (shell leak, above). Reported; fixed in the shell.
- Result: s04's own layout read correctly.

### Round 2: contact sheet f2760–f3869, speed graph of the mark, audit
- Speed graph (qa/a-s04-graph.png): f3795–f3833, 0.63 s, soft start and stop. But the hop started 0.2 s before "direction", so the mark only reached rest at f3859 (64.32 s), 0.18 s before the cut. Fix: touchdown (f36, the picture hit) now lands on "direction" (63.44 s), as in s01; the jump rides "words of". Settled at 63.92 s, 0.58 s before the cut.
- f3466–f3768: the "spin" pin pointed at (668, 262), empty navy for most of the turn. Fix: moved onto the spin axis (548, 300), which the slab covers at every angle.
- New check: touchdown on "direction" and settled ≥ 0.5 s before the cut.

### Round 3: stills at 46.0–64.45, graph, audit, draft (qa/a-s04.mp4, 30 fps, scale 0.5)
- Hop tile f3760–f3808: the top dims during the anticipation (f3770–f3774), then the jump arcs and the squash lands on the "direction" cue.
- Audit: 8 of 8 s04 checks pass (callouts 250 ms after their words, settled by hop + f65, top at 40% after the hop and at 100% before it, callouts clear each other inside the top pane, band labels clear each other inside the band, touchdown on "direction", mark inside the bottom pane).
- Holds can't be measured by freezedetect here: the default pane spins and its particles drift on every frame, which is the point. The layout holds from 61.28 s to the cut, and the callouts hold 1.6–3.8 s.
- Result: no notes left. 3 rounds.

## s05 Adjectives into numbers

Plan: a ledger headed "adjective → number" (echoes s03's equation) with four ruled rows is on screen from the cut. Each row on its cue ("premium" 65.00, "cool" 70.84, "modern" 74.28, "animation" 77.64): the adjective enters at 92 px in muted gray, in the number column. On the phrase that names its numbers ("satin" 67.16, "studio" 71.96, "lens" 75.56, "tempo" 78.76) it slides left and shrinks to 44 px on a text spring (ζ 1.0, 0.9 s), landing on the numbers' baseline. The numbers type on in Geist Mono at 30 characters a second, starting once the word has cleared the column. As the next adjective enters, the previous row dims to 45% over 0.4 s.

### Round 1: stills at 64.5, 66.5, 67.35, 67.6, 69.5, 73.6, 76.8, 81.95
- f4170–f4917: the numbers are the subject, but at 32 px mono they read small beside the 44 px adjectives (about 11 pt on a phone). Fix: 36 px with a 48 px line height, number column moved to x 310. The two longest lines now wrap at a separator ("key 2.4 · fill 0.6 · rim" / "no glow", "120 BPM · 4f anticipation" / "ζ 0.8"), and every row still fits its 150 px rule.
- f4917: "ζ" renders in a fallback face, thinner than Geist Mono (the bundled fonts are Latin subsets). Reported; not in my files.
- The adjectives use muted (#6B6A66, 4.5:1 on the canvas) rather than faint (#A8A6A0, 2.0:1), so they keep the contrast rule. Finished rows dim to 45% as the brief asks, which drops them below 4.5:1; they have already been read, and the active row is always at full contrast.

### Round 2: contact sheet f3870–f4919, speed graph of "premium", audit
- Speed graph (qa/a-s05-graph.png): f4030–f4070, 0.67 s, soft start and soft stop, no overshoot; y holds steady while the word shrinks onto the baseline.
- Audit: the "one row active" check failed on 17 frames inside the 0.4 s fades. My check was wrong, not the scene: it expected exactly 1.0 during a fade. Fix: skip the fade frames, and also assert that no two rows are active at once.
- Audit after the fix: 16 of 16 s05 checks pass (each word on its mark by slide + 1.4 s, each row typed before the next change, typed letters never touch the moving word, one row active at a time, finished rows at 45%, last row holds ≥ 1.5 s, no overlaps, inside the stage).
- Holds: cue-to-cue the narration allows 1.0–1.5 s for each adjective alone ("cool" 1.12 s, "modern" 1.28 s, "animation" 1.12 s), above the 0.8 s floor for one word but under 1.83 s. Each completed row stays on screen (dimmed) for the rest of the scene, and the last row holds 1.9 s to the cut.

### Round 3: draft (qa/a-s05.mp4, 30 fps, scale 0.5) and holds
- Slide tile f4026–f4074 (draft frames 76–100): "premium" eases left and down onto the baseline, and "satin" types on right behind it as it clears the column.
- Holds: 2.0 s on the empty ledger plus the first adjective, then 1.9 s, 1.6 s and 2.0 s on completed rows (the last to the cut). The shorter stills fall between the narrator's back-to-back cues.
- Result: no notes left. 3 rounds.

## Final pass (all five scenes)
- Audit, every 3rd frame: all 41 checks for s01–s05 pass. The one failure in the run is s14's.
- Frame 0 re-rendered after the shell fixes: the chapter name "01 The one-prompt myth" now shows on the thumbnail.
