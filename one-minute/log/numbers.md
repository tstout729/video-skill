# numbers: s02 The brief, s05 Voice and timing

Spring under test (s02): kit.spring01, damping 0.82, duration 0.45, 520 px. Measured from the function at 0.1 ms: it first reaches its mark at +0.317 s, peaks at +0.393 s at 1.0111 (+1.1%, 5.8 px), and stays within 0.5 px from +0.619 s. The brief's "2–3% overshoot" is not true of ζ 0.82; the screen shows the measured +1.1%.

## Round 1: first build, stills at every cue
- Checked: stills qa/numbers-r1 (s02, 13 times) and qa/numbers-r1b (s05, 15 times), tiled in grid.jpg.
- s02 f431–f618: "premium" at 180 px sat high (y 330–490) above about 600 px of empty ink for 3 s. Fix: set it at y 470 (optical middle), so the shrink is a real lift of 224 px; shorten the text spring to 0.5 s so the numbers' line clears 0.39 s into it.
- s05 f1731–f1800: under the wipe, the frame was three small file labels on empty pine. Fix: draw the empty voice track (a hairline where the waveform will draw) from the wipe.
- Result: fixed in round 2.

## Round 2: audit and contact sheets
- Checked: audit --grep s02 / s05, sheets qa/numbers-s02.png and qa/numbers-s05.png (12 frames each).
- Audit: 2 s02 checks failed, both faulty checks. (1) "ring sits on the peak" failed by 5.8 px across: the curve's top is flat to 0.01 px over ±5 ms, so the first-minimum sample is not the peak. Fix: judge the ring by height, and against the curve sample under its centre. (2) "texts never overlap" counted the numbers' empty line box from f586–f598 before a letter was typed. Fix: count the line from its first letter (letter-by-letter clearance is its own check, which passed).
- s02 f300–f397 (5.00–6.62): still a quarter of the scene with a 32 px caret and a hairline. Fix: the caret moves to where the first word goes, at the word's size (9 px wide, from cap height to descender, saffron), blinking at 1 Hz (0.55 s on, 80 ms fades, never below 15%, under the three-flashes-a-second limit); on "numbers", "premium" types on at it, 3 frames a letter. The file name types without a caret.
- s05 f1913–f2095: everything was small mono with no focal point; the lit-word staircase, the payoff, was the smallest type. Fix: script 36 → 40 px, waveform 200 → 240 px tall, lit labels 30 → 34 px, rows re-spaced (last row ends at y 1056).
- Result: audit 11/11 and 20/20.

## Round 3: motion, lint, drafts, holds, cuts
- Checked: stills qa/numbers-r3 (12 times; full-size finals at 12.40 and 34.40); speed graphs qa/numbers-graph-s02-card.png, -s02-word.png, -s05-playhead.png; onion skins qa/numbers-onion-s02-shrink.png and -card.png; lint --query finish=0 (qa/numbers-lint.txt); drafts qa/numbers-s02.mp4, qa/numbers-s05.mp4 (debug) and -clean.mp4 (finish off); sheets of the push and the wipe/zoom edges; holds; cuts; final sheets qa/numbers-s02.png and qa/numbers-s05.png.
- s02 card f652–f671: soft start, soft stop, peak 50.3 px/frame at f657; peak +1.1% at f675; within 0.5 px of the mark from f689 (+37 f). The onion skin tightens into the pose and the pen dots trace the curve frame by frame.
- s02 word f580–f606: soft start and stop (text spring ζ 1.0); the numbers type from f602 to f616, after the descenders clear their line.
- s05 playhead f1954–f2081: linear by design (it is the true time); its hard stop at f2081 is the end of the scene's audio (34.68 s), before the zoom-through at f2084.
- Lint: no findings in 5.00–13.93 or 28.85–35.53 (the 3 findings are s01, s06 and s07 titles in the left safe margin).
- Cuts: 5.00 cut, 13.03 push, 28.85 wipe and 34.73 zoom-through all ok (the whip warning at 16.00 is s03's).
- Holds (clean drafts): s02 longest 1.3 s (11.80–13.10, the final picture, then steady through the 0.9 s push), 1.1 s on the struck word (8.60–9.70); s05 longest 1.1 s. Both are below 1.5 s because the narration puts the brief's cues 0.56–1.37 s apart (s02: 6.62, 7.18, 8.38, 9.66, 10.30, 10.86, 11.66, push 13.03; s05: 30.00, 31.20, 32.56, then a word every 0.08–0.40 s to 33.96). Nothing in my files can lengthen them without dropping a cue the brief asks for.
- Result: no notes left. Audit 11/11 (s02) and 20/20 (s05).
