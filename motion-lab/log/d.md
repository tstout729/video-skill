# Review log · agent d · scenes s14, s15, s16, s17

Windows (120 BPM grid from t = 0): s14 210.50–230.00, s15 230.00–241.00, s16 241.00–256.50, s17 256.50–271.00.

## s14 · plan
- Hero move: the directed hop, shown at 1/3 speed (20 hop frames per second). f65 lands on "follow-through" (T0 = 218.717 s, f65 = 221.967 s).
- Labels pinned to hero3d's HOP frames: anticipation f4 (scaleY 0.88, on the floor), stretch f8 (1.08, airborne), arc f21 (apex, y 0.9), squash f38 (0.86, on the floor), overlap f44 (tilt peaks at 4.06° while the squash is still at 0.89), follow-through f65 (settled).
- Narration fit: anticipation (218.92), squash (220.62, inside "squash and stretch"), overlap (220.92) and follow-through (221.97) light during their words. Stretch (f8) and arc (f21) cannot at a constant playback rate, because the narrator names them in a different order from the hop.
- Late take: the playhead rewinds and replays from f28 with the hero 6 frames behind. On "late" the squash label lights as a red dashed ghost while the hero is still 0.42 heights in the air. A red "6 f late" note follows 150 ms later.
- Labels sit below the ruler, on the floor in front of the hero, not above it: anywhere above the floor crosses the hero's arc (the article's "props overlapping the labels" note).

## s14 · Round 1: stills (debug) at 210.50, 213.60, 216.20, 218.92, 219.77, 220.62, 222.50, 226.20, 227.20, 229.95
- Checked: cut-in composition, each label frame, the full lit row, the late take, the cut.
- f13797 (229.95): the late take stopped with the playhead on f38, so the hero hung frozen in mid-air for 2.7 s until the cut. Fix: the take keeps running at the same 1/3 speed to f70. The hero touches down at playhead f42, 6 frames after its label, then settles and holds from 228.80 s.
- f13632 (227.20): the "6 f late" note sat in the playhead tag's path, and overlap and follow-through re-lit blue during the late take, which muddled the single ghost. Fix: move the note into row 2 beside the ghost. In the late take, only the squash label resets; the others keep their light and go quiet.
- Result: fixed. Added checks for the late touchdown and the final hold.

## s14 · Round 2: stills at the cut, each label frame, mid-rewind, the ghost, the late touchdown and the cut out; audit
- f13632–f13797: the quieted labels at 40% opacity put white text on pale blue at about 2:1, below 4.5:1. Fix: quiet them by style (white chip, accent text at 6:1) at full opacity; only the stems and pins dim to 40%.
- f13797: the f70 playhead tag reached x 1070, 10 px from the frame edge. Fix: the ruler now runs from x 90 to 990.
- Audit: 1 fail, in the check itself (it rounded the playhead frame; the tag floors it). Fix: compare the exact playhead frame.
- Result: fixed.

## s14 · Round 3: contact sheet f12630–f13799, speed graph of #s14-hero (f13113–f13338), audit
- Contact sheet: reads as a storyboard. f12630 is a finished picture, labels enter on "classic", the 6-label read holds 6.1 s before the hop, then the hop, the full lit row (hold 4.0 s), the rewind, the ghost and the final hold of 1.2 s still plus 2.8 s on the ghost.
- Speed graph: soft start, soft stop. The anticipation hump before liftoff shows (f13120–f13135), the flight is a parabola, peak 13.2 px/frame at f13142 (push-off), settled f13236.
- Audit: 1 fail, f13644: the playhead computed 41.9999999, which left the hero 1e-13 heights off the floor at the late touchdown. Fix: snap playhead and hero frames to 1e-6.

## s14 · Round 4: draft qa/d-s14.mp4 (210.50–230.00, 30 fps, scale 0.5, debug), audit
- Draft at 5 fps reads as one move at a time: the hop at 1/3 speed, labels lighting in order, the full lit row held 4.0 s, a 0.7 s scrub back, the late take landing after its ghost label, then the hold.
- Audit: hero3d recomputes the hop frame as (t - hop) * 60, so even an exact state can leave 1e-13 of float error. The touchdown check now counts "on the floor" to within 1e-9 heights (about 3e-11 px).
- Result: all 12 s14 checks pass. No notes left. s14 done in 4 rounds.

## s15 · plan
- Hero move: a scan across a strip of 480 frame ticks (f0–f479), ease-in-out over 2.0 s from "four hundred" (234.24–236.24 s).
- Cues: counter 0 → 71 from "ran" (232.04), landing on "seventy-one"; scan on "four"; "6 failed" on "Six" (236.44); ticks turn green on "fixed" (238.80, 60 ms stagger); "71 / 71 pass" swaps in 150 ms later.
- The six failing frames are seeded (rand), because the article does not say which frames failed; no frame numbers are shown for them.

## s15 · Round 1: stills at 230.00, 232.50, 233.20, 234.90, 235.60, 236.40, 236.90, 238.90, 239.10, 239.50, 240.98
- All frames: top-heavy. Content ended at stage y 860, leaving 130 px empty above the caption band. Fix: everything moves down about 30 px and the strip card grows to 362 px.
- f14334 (238.90): the readout is empty for 0.18 s between "6 failed" and "71 / 71 pass". This is the kit swap's gap, so it stays.
- Result: fixed.

## s15 · Round 2: contact sheet f13800–f14459, speed graph of #s15-scan (f14040–f14208), audit, draft qa/d-s15.mp4
- Contact sheet: one change per cell, in order: the counter on "seventy-one", the scan, six red ticks found by the scan, "6 failed", the green stagger, then the pass readout.
- Speed graph: ease-in-out, soft start, soft stop, peak 21.8 px/frame at f14122.
- f13800–f13920: the right-aligned counter put the "0" 32 px in from the title, so the first frame looked misaligned. Fix: left-align the number in its fixed 206 px box.
- Audit: 1 fail, in the check: the sixth tick finishes turning green at 239.40 s, 3 frames after the readout settles. Fix: check from the later of the two.
- Draft at 5 fps: smooth scan, red ticks appear only behind the scan, green stagger, held readout.
- Hold: "71 / 71 pass" holds 1.65 s to the cut, and "6 failed" holds 2.4 s. The narration ends 0.36 s before the cut, so there is no more room.

## s15 · Round 3: audit
- All 6 s15 checks pass (107 of 107 overall). No notes left. s15 done in 3 rounds.

## s16 · plan
- Real images only, one on the stage at a time: assets/sheet.png assembled cell by cell (12 crops of the real sheet, 60 ms stagger), assets/onion.png, assets/graph.png with its speed curve highlighted, then the f1123 catch (wt-before-1123.jpg → wt-after-1123.jpg).
- The highlight is the graph's own speed line, traced from the image's pixels (a continuity tracker, with the two label boxes masked), drawn on in accent. The two sharp corners (the push-off peak at f506 and the touchdown drop at f535) get rings on "sharp corners".
- The brief's "red note chip pinned to a frame" and the f1123 catch are one beat: the red note "f1123 · card opens as an empty gray box" pins on "notes", with a red outline on the box in the real frame. The narration leaves no room for a separate note beat, and the 7-word note needs its time on screen. On "point" the frame cross-fades to the fixed frame, the outline turns green and "fixed" (green) joins the note.
- Cues: "draft" (render 1 · draft chip), "read a contact" (cells), "onion skin", "speed graph", "sharp corners" (rings), "write" (graph out, frame in 0.3 s later), "notes" (red note, sfx pop), "point" (fixed, sfx success).

## s16 · Round 1: stills at 241.00, 243.20, 244.10, 244.90, 246.50, 247.60, 249.30, 250.80, 251.75, 252.40, 253.30, 254.90, 256.48
- f14694 (244.90) and f15294 (254.90): each image sat high, leaving 130–145 px empty above the captions. Fix: center each image in the space under the header (sheet y 268, onion 214, graph 286, f1123 frame 250, notes 822).
- f15030 (250.50): the graph's finished state (curve plus rings) held only 0.7 s before the frame replaced it. Fix: the graph leaves on "write" instead of 0.3 s before it, and the frame lands 0.3 s later. That gives the graph 1.0 s fully settled, plus the 0.8 s it spends drawing on, which is all the narration allows.
- Result: fixed.

## s16 · Round 2: contact sheet f14460–f15389, speed graph of #s16-onion's entrance (f14784–f14856), audit, draft qa/d-s16.mp4
- Contact sheet: one state per cell, in narration order: the empty draft sheet, cells assembling, the onion skin, the graph highlighted and ringed, then f1123 before, the note, fixed.
- Speed graph: the kit's standard ease-out entrance (16 px), flagged "hard start" because ease-out starts at peak speed. It starts at 0 opacity, so the jump is not visible; the brief requires ease-out entrances. Soft stop.
- Audit: 1 fail, in the check: Chrome serializes style.transform as "scale(1)", not "scale(1.0000)". Fix: parse the number.
- Draft at 4 fps: one image at a time, with a 0.3 s handoff between each exit and the next entrance.
- Holds: sheet settled 1.63 s, onion 1.5 s, graph 1.0 s plus its 0.8 s draw-on, the f1123 note 3.8 s (7 words: 2.6 s floor), "fixed" 2.15 s.

## s16 · Round 3: audit
- All 9 s16 checks pass (147 of 147 overall). No notes left. s16 done in 3 rounds.

## s17 · plan
- Row 1: "make it pop" (on "make it pop"), then "→ +8% · 6 frames · on the beat" types on "becomes". The card pops 8% over 6 frames (3 up, 3 down), peaking exactly on four beats of the bed (261.0, 261.5, 262.0, 262.5 s), with a beat dot lighting on each (2 flashes a second).
- Row 2: "it drags" (on "it drags"), then "→ each hold −1 beat" types on "becomes". On "shorter" the hold bar shrinks from 4 beats to 3 (ease-in-out, 0.6 s), ending on a grid tick; the dropped beat stays as a dashed outline, and "hold · 4 beats" swaps to "hold · 3 beats".
- Receipts: a log card on "post"; a green check pins on "receipts" (sfx success).
- Fact change: the brief asks for "4 rounds · 23 notes", but "23 notes" is not in the article. The card reads "log.md · Experiment 1 · directed side / 4 review rounds · 15 follow-ups", from the article. It is one constant (RECEIPT) at the top of scenes/s17.js.

## s17 · Round 1: stills at 256.50, 259.60, 260.50, 261.00, 261.50, 262.80, 263.60, 264.50, 265.30, 266.00, 267.60, 269.00, 270.98
- f15660 (261.00): the card is at 1.08 and beat dot 1 is lit, exactly on the beat. The "−" in "−1" renders in Geist Mono.
- f15390 (256.50): the cut-in frame is the title alone for 2.6 s while the narrator says "Turn feelings into numbers". It is a finished picture, and each row enters on its own cue after it, so I left it.
- No notes needing code.

## s17 · Round 2: contact sheet f15390–f16259, speed graphs of #s17-pop (scale, f15648–f15768) and #s17-bar (scale, f15876–f15948), audit, draft qa/d-s17.mp4
- Contact sheet: one change per cue, in narration order.
- Bar graph: soft start, soft stop, settled f15927.
- f15657–f15663 (and the three later pops): the pop used a half sine, so speed jumped to 100% of its peak in one frame at both ends. Fix: a raised cosine (1.00, 1.02, 1.06, 1.08, 1.06, 1.02, 1.00) with zero slope at both ends. The graph still flags a 50% jump, which is the floor for a 3-frame rise; the article's "8% over six frames" fixes the length.
- Audit: all 8 s17 checks pass.

## s17 · Round 3: speed graph of #s17-pop after the fix, audit
- The pop peaks on f15660, f15690, f15720 and f15750 (exact beats), with the jump down from 100% to 50% of peak.
- Audit: all 8 s17 checks pass (164 of 164 overall). No notes left. s17 done in 3 rounds.

## Holds · clean draft qa/d-s14-s17-clean.mp4 (210.50–271.00, no debug overlay), review.mjs holds
- s14: longest hold 1.9 s, s15: 2.4 s, s16: 2.2 s, s17: 2.1 s. Every scene has a hold of 1.5 s or more.
