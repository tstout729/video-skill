# Review log: agent e (s18–s21)

Windows (kit.sceneWindow, 120 BPM grid from t = 0): s18 271.00–283.00, s19 283.00–299.50, s20 299.50–313.50, s21 313.50–325.92.

## s18 Engines

Plan: a chooser that is finished at the cut: "Name the engine", three engine chips (three.js, Remotion, plain HTML) over three dashed empty slots, and below a rule the smaller engines: "think in web pages" with HyperFrames and GSAP, "no renderer" with Motion. On "the model picks one" (272.84) the subline. Each named engine is picked on its cue ("Three J S" 274.44, "Remotion" 277.40, "plain HTML" 279.48): the chip turns accent with a 4% press, and the slot fills with a live window (height on a spring, ζ 0.82, 0.7 s; opacity eases, never bounces), with its use 0.45 s later. three.js: the ceramic mark (hero3d directed) turns once on "3D" (276.20, 1.8 s ease-in-out, then rests). Remotion: cards 02–04 deal onto card 01 on "series" (278.44), 80 ms apart, on springs at ζ 0.82. plain HTML: the real loop clip through frames() (card, press, spinner, check), and seek returns its decode promise. No sfx: nothing here lands.

### Round 1: stills at 271.0, 273.4, 275.0, 276.9, 277.95, 279.0, 280.3, 282.95
- f16260–f16979: the composition sits high, with the bottom 130 px of the stage empty, and the 330 px windows are small on a phone (the loop clip's spinner is about 60 px). Fix: windows 330 → 400 px tall, everything below moves down 70 px, and the loop clip is cropped tighter (480 px image in a 280 px window).
- f16614 (276.9 s): mid-turn the mark shows its edge: it reads as 3D. Kept.
- Result: fixed.

### Round 2: contact sheet f16260–f16979 (qa/e-s18.png), speed graph of card 04 (qa/e-s18-graph.png), audit
- Sheet: one change per cell, on its cue; the cut is a finished chooser; the last cell holds on the loop's green check.
- Speed graph: the deal moves f16716–f16741, only 0.42 s, short for a UI move in an explainer (600–900 ms). Fix: spring duration 0.6 → 0.9 s.
- Audit: "series dealt onto its marks by series + 1.2 s" then failed (card 4 off by 0.71 px), because the slower spring settles later. Fix: the check now computes the last card's settle frame from the spring itself (f16782) and holds it to the cut.
- Result: fixed.

### Round 3: draft (qa/e-s18.mp4, 30 fps, scale 0.5), audit
- Draft strip of the window opening (274.3–275.2), the turn (276.1–277.9) and the deal (278.35–279.3): the window opens without a pop, the turn eases in and out with one pass of the edge, and the cards arrive in order and settle on their marks.
- Holds: the 3D drift and the playing loop never stop, so `review.mjs holds` cannot see them (as the reference warns). From the cue times: the chooser holds 2.1 s, then about 1 s between back-to-back cues while the narrator names the engines, and the finished chooser holds 3.5 s to the cut.
- Audit: 9 of 9 s18 checks pass.
- Result: no notes left. 3 rounds.

## s19 The last mile

Plan: four modules, each on its cue; when one arrives, the one before steps back to 45%.
1. At the cut a large phone (scale 1.55, centred) plays the real walkthrough clip through frames(), with the walkthrough's own captions burned in at the clip's offset (the clip starts 17.5 s into its source, matched by frame difference): "Next, click Invite.", "Type your teammate's email address.", "Now choose a role.". On "muted" (284.04) a muted badge pops (ζ 0.82); on "silence" (286.36) a green "works in silence" chip (sfx success).
2. Hero move: on "Mix" (287.48) the phone travels to its slot top left (ease-in-out, scale 1.55 → 1), then the loudness meter enters. On "fourteen" its level rises on a spring (ζ 0.82) and settles at −14 LUFS under a peak line at −1 dBTP.
3. On "each picture" (290.52) a frame strip of real frame numbers. On "one frame" the picture hits at f17486 (the cell pops 8% over 6 frames), and a real tap is declared at f17487, so the strip's claim is true of its own soundtrack. On "its sound" (292.28) the waveform draws and peaks on f17487, with a bracket: "1 frame later".
4. On "export GIFs" (293.72) two 1-second loops side by side, each with a clock row (the frame due now, ⌊T·fps⌋) and a GIF row (the frame a GIF player shows when every delay is stored as 4 cs, ⌊T/0.04⌋). 24 fps: 24 × 40 ms = 0.96 s, so its GIF playhead pulls ahead by one frame a second (5 frames by the cut), red, "4% fast" (1/0.96 = 1.042). 25 fps: 25 × 40 ms = 1.00 s, and its rows never part, green, "exact". Both loops start 0.6 s after the card, once it is in.

### Round 1: stills at 283.0, 284.6, 286.9, 287.9, 289.6, 291.0, 291.5, 293.3, 294.6, 296.2, 298.2, 299.45
- f16980–f17250: the large phone sits in the upper half, with the lower 45% of the stage empty for 4.5 s. Fix: it starts lower and larger (centre y 470, scale 1.55).
- f17967 (299.45 s), full size: after 5.1 s the 24 fps GIF row is on frame 8 and its clock on frame 3 (5 ahead); the 25 fps rows sit on the same cell. True and readable. Kept.
- Result: fixed.

### Round 2: contact sheet f16980–f17969 (qa/e-s19.png), speed graph of the phone (qa/e-s19-graph.png), audit
- Sheet: one idea per cell, each on its cue; the final cell holds all four modules with the GIF card in front.
- Speed graph: the phone's move peaks at 17.4 px/frame over 0.63 s while it also shrinks, short for a layout change in an explainer (0.9–1.5 s). Fix: 0.9 → 1.2 s, the meter enters halfway through.
- Audit: 9 of 9 s19 checks pass.
- Result: fixed.

### Round 3: draft (qa/e-s19.mp4, 30 fps, scale 0.5), stills at 287.9–289.2, audit at every frame
- Draft f17298–f17310: the meter starts entering while the shrinking phone still covers its slot; they overlap for about 0.3 s. Fix: the meter enters at Mix + 0.9 s (75% of the move), when the phone has cleared it; the overlap check now runs from "Mix", not from the end of the move.
- Stills: the phone clears, then the meter arrives; the level rises on "fourteen". Speed graph again: 0.78 s of travel, peak 13.1 px/frame, soft start and stop.
- Holds: the playing clip and the running GIF loops hide holds from `review.mjs holds`; from the cues: the phone holds 4.5 s, the meter 2.6 s after settling, the strip 3.2 s, the GIF card 5.8 s to the cut.
- Audit (every frame): 9 of 9 s19 checks pass: the cut is finished; the phone sits on its slot; the level settles at −14 LUFS by f17407 and holds; the picture hits on f17486, not before; its sound is declared on f17487; the GIF and clock rows match ⌊T/0.04⌋ and ⌊T·fps⌋ on every frame; the 24 fps loop is ahead by ⌊T⌋ ± 1 frames (5 by the cut) while 25 fps stays exact; no module overlaps another; everything stays inside the stage.
- Result: no notes left. 3 rounds.

## s20 When things break, and the homework

Plan: at the cut, two real frames from the skill's walkthrough example, just before and just after the moment its Invite button broke: f1110 (18.50 s, the dark button with its label) and f1122 (18.70 s, an empty gray box). These are the review stills that caught the bug (skills/video/examples/walkthrough/qa/fly). Below them, the render contract at 45%: three rules and an empty fourth slot.
- On "compare" (301.60) an arrow draws between the frames, then "describe the difference".
- On "after it" (303.40) the difference pins as a red note: "f1122 · the label is gone and the box is empty gray".
- On "Every fix" (304.52) a green chip: "fix · a shape keeps its content while it changes" (the walkthrough README's rule for this fix).
- Hero move: on "joins the contract" (305.40) the chip flies into slot 4 on an arc (bowing 90 px right; spring ζ 0.82) and the contract comes up to full.
- On "The homework" (307.16) the frames leave (ease-in 0.3 s), the contract steps back, and "The homework · Experiment 3 is yours" arrives with three rows 60 ms apart.
- The boxes tick green on "make one" (308.44), "two notes" (309.64) and "post every prompt" (311.48), each popping 8% over 6 frames, with a toggle one frame after its green frame.

### Round 1: stills at 299.5, 301.0, 302.4, 304.0, 305.0, 305.9, 306.9, 307.9, 309.0, 310.2, 312.0, 313.45
- f17970–f18414: the frames are cropped too wide (x 40–98%); the button that breaks is about 40 px, so the difference is hard to see on a phone. Fix: crop to the button and the box (x 56–97%, y 16–62%): the button is now 72 px, the box 205 px.
- f18354 (305.9 s): the flying chip passes over rule 3 for about 0.15 s. Kept: it is in motion and the card is still dim.
- Result: fixed.

### Round 2: contact sheet f17970–f18809 (qa/e-s20.png), speed graph of the fix chip (qa/e-s20-graph.png)
- Sheet: the difference now reads at a glance; one change per cue; the homework holds 2.0 s after its last tick.
- Speed graph: the flight is 0.67 s with a clean arc in x and a 6 px settle in y, short for the scene's hero move. Fix: spring duration 1.0 → 1.3 s, now 0.80 s of travel, peak 14.1 px/frame, soft start and stop.
- Result: fixed.

### Round 3: draft (qa/e-s20.mp4, 30 fps, scale 0.5), audit at every frame
- Draft f18431–f18440: the homework card started 0.1 s before the frames had finished leaving, so for a moment both were legible in the same place. Fix: the card enters when the 0.3 s exit ends. New check: the frames and the homework card are never on screen together.
- Sound: the scene declared 4 sounds (a landing tap and 3 ticks), over the limit of 3. Fix: the chip's landing is silent (it settles softly), and each tick lands on a frame with its toggle exactly one frame later. The same frame alignment applied to s19's two chip sounds: show() is still at opacity 0 on its start frame, so each sound is at start + 2 frames, one after the first visible frame.
- Audit (every frame): 9 of 9 s20 checks pass: a finished cut with both frames decoded; the chip in slot 4 (±0.5 px) by f18429 and held; each box green on its cue and not before; frames and homework never on screen together; phase-1 elements never overlapping; the homework card clear of the contract; everything inside the stage.
- Result: no notes left. 3 rounds.

## s21 Close

Plan: the end card bookends s01, with the same full-stage directed studio, a title top left, the mark in the middle and a mono line under it.
- Hero move: on "All of this" (313.72) the mark drops in and lands in the centre (hero3d `land`: touchdown f27 = f18850, squash, settled at f63 = f18886), facing the camera, with a tap one frame after touchdown.
- Then one line per cue, each on the words that say it:
  - "free video skill" (315.52) → "video skill · free and open source", fitted to the 920 px measure;
  - "made with it" (317.84) → "Made with the skill it explains", as its deck;
  - "Florence's article" (318.84) → "Florence's article: x.com/flxrnc", in a white pill under the mark;
  - "the skill" (320.20) → `/plugin marketplace add tstout729/video-skill`, mono, in a white pill.
- The arrival order follows the narration, not the brief's list order. With the brief's order, the install line would arrive while the narrator says "made with it", and "Made with the skill it explains" while he says "linked below". Every line in the brief is on the card.
- The full card is complete at 320.70 and holds 5.22 s to the last frame (at least 4 s).
- Contrast, measured on s01's backdrop: muted gray on the studio is 3.1–4.4:1, which fails 4.5:1. So all text on the studio is ink (9.7–14.5:1), and the accent is used only on white (5.9:1).

### Round 1: stills at 313.5, 313.95, 314.2, 315.2, 316.2, 318.5, 319.5, 320.9, 323.0, 325.9
- f18810 (313.5 s): the cut lands on the empty studio; the mark enters from above 0.22 s later (hero3d's land starts above the frame). Kept.
- f19080 onward: the deck (32 px) and the pills read small and light against the title. Fix: deck 36 px, article pill 36 px, install line 32 px; pills at y 680 and 784.
- Result: fixed.

### Round 2: contact sheet f18810–f19554 (qa/e-s21.png), speed graphs of the landing (qa/e-s21-graph.png, qa/e-s21-squash.png), audit
- Sheet: the cut, the landing, then one line per cell; the last five cells are the complete card.
- Speed graph (y): a constant-gravity fall from f18825 to touchdown at f18850 (land + f27); the squash takes up the stop and the mark is at rest by f18886.
- Audit: two s21 checks failed.
  - "holds still": my regex read el.style.transform, which the browser normalises to `translate(0px, 0px) scale(1)`. Fix: compare the computed matrix.
  - "inside the 80 px margins": the install pill was 924 px wide (x 78–1002). Fix: horizontal padding 30 → 26 px (916 px).
- Result: fixed.

### Round 3: draft (qa/e-s21.mp4, 30 fps, scale 0.5), full-size last frame (qa/e/s21-final/t0325.90.jpg), audit at every frame
- Draft strip (313.8–314.9 s): a straight drop, a squash at touchdown, a short settle; no drift off the centre line.
- Last frame: every line is legible at full size inside the 80 px margins, and nothing moves except the studio camera's slow drift.
- Audit (every frame): 7 of 7 s21 checks pass:
  - the mark settles by land + f63 and rests on the centre line to the end;
  - the lines arrive in order;
  - the full card is complete and holds at least 4 s to the last frame, and no line moves once it is in;
  - the mark and lines never overlap;
  - text stays inside the 80 px margins.
- The whole page passes 191 of 191 checks.
- Result: no notes left. 3 rounds.
