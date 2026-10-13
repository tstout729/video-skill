# Range builder log: s02, s03, s04, s06, s07, s08

Frames are at 60 fps (frame = round(t × 60)). Shots are centered; each one's content sits in one inner
stage that drifts 1.00 → 1.04 about the frame's centre, laid out so it is still inside x 54–1026,
y 96–1255 at 1.04 (so a 972 px window is 932 px at 1.00).

## Plan
- s02 (black): "Every frame." giant 220 px, two lines, words 80 ms apart from 2 frames before bar 4
  (f465 is the cut's first frame), punch peaking on bar 4. Counter `f 0494` (Geist Mono 60 px, this
  film's frame, `Math.round(t*60)`) from bar 4 beat 1 (f494). "Made in code." (display 120 px, "code." in
  the gradient) on bar 5 (f581).
- s03 (light): walkthrough clip in a 932 × 524 window from the zoom-through. "Walkthroughs." (140 px)
  on bar 6 beat 1 (f726). Line on bar 7 (f813). Clip stretch: clip f52 at the cut in (the modal
  opening) → f122 (the click on the email field) on bar 7 → "jordan@example.com" typed by f164
  (14.95 s, 0.24 s before the whip) → f189 at the cut out.
- s04 (black): explainer clip in a window the size of s03's. "Diagrams." on bar 8 beat 1 (f958), the
  first beat after the whip ends. Clip stretch f39–f106: the browser slides aside as the whip lands
  (f57 at 15.78 s), the server appears, the nodes and edges draw on under the word.
- s06 (light): loop clip in a 780 px square. "Loops." on bar 10 beat 1 (f1190). Clip stretch f204–f271:
  the green check holds through the whip; the check grows into the receipt on bar 10 beat 2 (clip f242
  at f1219), settled by f1257, 0.3 s before the cut.
- s07 (black): "Any style." on the cut (bar 11, f1277). 860 px square, riso / pixel / cut paper on one
  story timeline (story t0 16.64 s: story 4.65–8.52, frames 111–204 of 252). Pixel edge enters from the
  right on bar 11 beat 2 (f1336), lands at one third in 0.5 s (ease-out); paper edge on bar 12 (f1394),
  two thirds in 0.4 s (half the travel). Tags RISO · PIXEL · PAPER (mono 30 px) under the thirds light
  150 ms after each style shows (#7a7a7f 4.9:1 → #f5f5f7). The bloom (story 7.55) on bar 12 beat 2
  (f1452), in the pixel third, inside the three-way hold.
- s08 (light): "Any frame." on the cut (bar 13, f1510). One window in a 932 × 860 box around (540, 720)
  springs (ζ 0.82, 0.5 s, from 2 frames before each half-bar) 16:9 932×524 → 1:1 860 (f1566) → 4:5
  688×860 (f1624) → 9:16 484×860 (f1682). Clip: the loop's checkout card (clip f34–f104, a still pose in
  the source, held after f104) on the clip's own ground (#eae9e4), so the frame extends the picture.
  Chosen over riso/pixel/paper because the story clips carry a title and a step label that any crop
  slices into fragments; the card is one centered object that reads whole at every ratio.

## Round 1: stills and contact sheets at 60 fps (finish on)
- Checked: stills r1 (8.4, 10.6, 13.0, 16.6, 20.0, 22.0, 24.5, 26.7 s); sheets keynote/qa/range-s02…s08.png;
  `audit --grep s0`; `lint --query finish=0`.
- s04 f911–f1045: the window is two thirds empty dark ground; the diagram is small and thin on a phone.
  Fix: window and word centered on the frame (word y 318, window y 508); clip cropped 1.09× about the
  diagram (clip x 23–879, y 59–540; diagram measured at x 32–870, y 220–463), so it is 12% larger and the
  step label is out.
- s06 f1192–f1277: at 1.2× the check sits small in a mostly empty square; tried 1.35× (receipt 71%) but
  the pointer was cut by the bottom-right corner at f1217–f1277. Fix: back to 1.2× (receipt 63%, pointer
  whole, 27 px clear of the edges), with a check on the crop.
- s08 f1580–f1650: at a constant 720 px the card is 48% of the 1:1 window, lost in it. Fix: the picture is
  laid out per frame size (760 / 940 / 860 / 730 px, on the same springs), so the card is 52–64% of the
  window width and always whole; a check tests it on every frame.
- s08 f1566–f1577: the outgoing "16:9 · YouTube" label (y 1018) was still fading while the window grew
  past it to 1:1 (audit: text over the window). Fix: each label leaves in 0.12 s, ending as the next
  spring starts; the next enters 150 ms after its spring (0.2 s).
- s07: the settled three-way hold is 1.57 s (f1416–f1509); the three-way picture is on screen from bar 12,
  1.94 s. Kept the 0.4 s edge; the check now reads "on screen 1.9 s from bar 12, settled ≥ 1.5 s".
- Lint f480–f690: "Every" × "frame." line boxes cross at the .giant line-height 0.88 (set for one word).
  Fix: line-height 1.0 for the two lines, block re-centered (y 296).
- Lint f834–f930 and f1530–f1740: secondary gray #6E6E73 measures 4.18–4.22:1 under the windows' soft
  shadow (ground #DEDEE0–#EDEDEF for ~90 px below a light window). Fix: the s03 line and the s08 platform
  names use #616166 (4.6:1 at the darkest, 5.0:1 on the median).
- Audit: settle checks fired on the frame before a fractional settle time, and "at cutIn" checks on the
  frame before the shot is drawn; checks now use the first rendered frame at or after the time. s08
  springs: within 1% of the move at +0.5 s, exact (±0.5 px) from +0.7 s.
- Result: every range check passed (80 checks matched "s0", other builders' included) before the s04/s06/s02
  layout changes; re-run in round 2.

## Round 2: sheets of the changed shots, speed graphs, lint, the cut check
- Checked: sheets s02, s04, s06, s07, s08; graphs keynote/qa/range-graph-s02.png (the drop's scale),
  range-graph-s07.png (the pixel edge), range-graph-s08.png (the window's size); `lint --query finish=0`
  (no findings in f465–f1766); `cuts` (keynote/qa/range-cuts.png).
- s02 f465–f474: lands as a slam: on the cut's first frame "Every" is 38% in and blurred (the reveal
  started 2 frames before the beat), "frame." follows 5 frames later, both solid by f474. Graph: one
  scale move f465–f471, peak at the cut, soft stop. Kept: it is the brief's drop.
- s04 f960–f1045: with the 16:9 window the diagram still sat in its lower half under 175 px of dead
  ground. Fix: a 932 × 420 window cropped to the diagram's band (clip y 150–535), the word and window
  centered (word y 370, window y 560–980).
- s06 f1144–f1277: receipt reads ($48.00, Paid to Acme Coffee, Done); pointer whole at 1.2×. No change.
- s07 graph f1333–f1357: the pixel edge enters at speed from the square's right border (ease-out, peak
  54 px/frame at f1335, soft stop at one third by f1357); the tool calls the start hard. Kept: the edge
  emerges from outside the picture, as a wipe does, and lands on the beat.
- s08 graph f1566–f1702: three size moves, each soft start and soft stop, settled in 0.30–0.33 s.
- Cuts: 21.29 s (s06 → s07) and 25.16 s (s07 → s08) warned "still → zoom": each shot opened on its word's
  reveal. Fix: s07's and s08's words land on beat 1 after the cut (f1305, f1539), as in s03, s04 and s06:
  the picture is composed and still on the cut (s07: riso square, Riso tag lit; s08: the 16:9 window
  with "16:9 · YouTube"), then the word lands from rest. Both cuts now pass still → still.
- Cuts left warning near the range: 7.74 s (s01 → s02), the drop, deliberate; 17.42 s (s04 → s05), the
  motion is s05's "3D." reveal on its first frame (s04's side is still).
- s08 f1566–f1702: each platform label was fully visible ~0.5 s (out 0.12 s before the spring, in
  0.15 s + 0.2 s after). Fix: the labels swap on each spring's first frame (out on that frame, before
  the window can reach them; in over 0.15 s): on screen 0.97 s, settled 0.82 s each, the most the
  half-bar cadence allows. Still under the 1.1 s floor for a two-word label; the brief's cadence sets it.
- Result: all s02–s08 checks pass (55 + the s08 rework, 12 of 12).

## Round 3: half-scale draft of the range, final checks
- Checked: draft keynote/qa/range.mp4 (7.74–29.43 s, 30 fps, sub 1, 0.5×) and its sheet
  keynote/qa/range-draft-sheet.png; onion skins keynote/qa/range-onion-s08.png (f1565–f1600, the 1:1
  spring) and range-onion-s07.png (the pixel edge); landing stills keynote/qa/range/landings/ (25 frames,
  tiled in landings-tile.png); `audit --grep s0`; `lint --query finish=0`; `cuts`.
- s08 onion f1565–f1600: the window's edges tighten into the pose (spring, no linear spacing); the card
  is laid out again with the frame; the old label is gone on the spring's first frame, the new one in by
  f1575.
- Draft: light and dark alternate on every cut; each shot reads as one word over one piece of output.
  Every word lands on a beat from rest except s02's, which slams in on the drop by design.
- Sound: s03 declares the whoosh for the whip into s04 (15.50 s). s05 declares none for its whip into
  s06, so s06 adds it (19.37 s), and only if no whoosh is already declared within 0.15 s of the peak.
- Result: 47 of 47 s02–s08 checks pass; lint has no findings in f465–f1766; cuts: zoom-through, both
  whips, the dissolve and the 21.29 / 25.16 s cuts pass. Two cuts warn: 7.74 s (the s02 drop, deliberate)
  and 17.42 s (s05's reveal on its first frame). No notes left.
