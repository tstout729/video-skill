# Review log: hero (s01 Hook, s06 Review, s07 End card)

Windows (kit `k.win`): s01 0–5.00, cut. s06 34.73–47.07, in by zoom-through (34.73–35.53), out by light leak (46.07–47.07). s07 46.07–55.92.
Cues: s01 "frame" 0.96, "Claude" 3.76. s06 "reviews its own frames" 36.22, "Contact sheets" 39.42, "Onion skins" 40.78, "Speed graphs" 42.14, "test" 43.66. s07 "free" 47.24, "Install" 49.16, "line" 50.28.

## Round 1: build and first stills
- Checked: stills at 0, 4.11, 35.6–46.0, 46.6–55.9 (`qa/hero-r1/`), raw f0 with the finish off (`qa/hero-s01-raw/`).
- f0 (s01): the thumbnail reads: "Made in / code." at 160 px over the studio, and the mark on the floor in the lower third. The studio canvas is full-frame, so there is no seam between the 3D render and the page. Sampled with the finish off: the floor around the mark renders #EBEBE9 (the canvas, #ECEBE7). The cyclorama wall falls off to #CFCFCF at the top.
- f0–f299 (s01, s07): the kit's muted chrome (#5c5953) measures 4.48:1 on that #CFCFCF wall. Fix: the chrome in both studio scenes takes #4a4945 (5.7:1).
- f238–f246 (s01): during the hop's rise, the mark's box overlaps the counter by up to 1,129 px². At f240 its top corner passes about 15 px from the last digit. Fix: counter 38 px, moved up 14 px; mark 310 px, starting at x 468, resting centre y 918. After the fix, the audit passes on all 300 frames.
- f2764 (s07): the "studio drawn from cutIn" check sampled frame 2764 (46.067 s), 3 ms before cutIn, when the scene is not yet seeked or shown. Fix: check the first frame at or after cutIn. It passes: the floor renders light.
- Result: the audit passes for s01 (7/7), s06 (10/10) and s07 (9/9).

## Round 2: contact sheets, speed graphs, lint
- Checked: contact sheets `qa/hero-s01.png` (f0–f299), `qa/hero-s06.png` (f2084–f2824), `qa/hero-s07.png` (f2764–f3354). Speed graphs `qa/hero-graph-s01.png`, `qa/hero-graph-s06.png`, `qa/hero-graph-s07.png`. Lint `qa/hero-lint.txt` (finish off).
- f2173–f2365 (s06, 36.22–39.42): the film strip sat top-aligned at y 390–786, leaving the lower 40% of the stage empty for 3.2 s. Fix: centre the strip in the deck's slot (y 487–883). It still steps back 60 px, then hides behind the sheet.
- Speed graph, s01 hop (#s01-mark, x and y): moves f226, push-off peak at f233 (45.2 px/frame), touchdown about f262, box settled f264. The pose settles at hop + f65 = f291 (4.843 s), 9 frames before the cut. Soft start and soft stop.
- Speed graph, s06 sheet card (y): moves f2365, settled f2390 (0.42 s), about 1 px of overshoot (ζ 0.82). Soft start and soft stop.
- Speed graph, s07 drop (#s07-mark, y): moves f2780, peak 59.2 px/frame at f2805, "hard stop" at touchdown (f2807). Accepted: this is hero3d's land as the brief specifies it (touchdown f27). A fall under gravity stops on the floor, and the squash at f29–f31 takes the impact, with a tap one frame after touchdown. It settles at land + f63 (47.36 s).
- Lint (s01, s06, s07): three "safe" findings. The titles had been nudged 3–6 px left of the 54 px margin for optical alignment. Fix: all three sit exactly on x 54. No contrast, size or overlap findings in my ranges.

## Round 3: drafts, motion and final checks
- Checked: draft MP4s `qa/hero-s01.mp4` and `qa/hero-s06s07.mp4` (30 fps, half scale, debug); onion skins `qa/hero-onion-s01.png` (hop, f222–f294) and `qa/hero-onion-s06.png` (the onion card arriving as the deck steps back, f2446–f2506); holds on clean drafts; `cuts`; re-run audit and lint; final contact sheets `qa/hero-s01.png`, `qa/hero-s06.png`, `qa/hero-s07.png`.
- Onion skins: the hop's arc tightens into touchdown and clears the counter. The card rise and the deck's step back both tighten into their poses: eased, not linear.
- Holds (`qa/hero-s06s07-nofinish.mp4`, finish off; with the finish, grain and the debug overlay hide every hold): s06's states hold 0.8–1.4 s between cues. That is set by the narration, since "Contact sheets", "Onion skins" and "Speed graphs" are 1.36 s apart. Caption word changes split the strip's settled state (36.97–39.42, 2.45 s). The final "N checks · all pass" state is settled at 45.11 and holds to the leak at 46.07. s07's full card is still from 51.03 to the last frame; the camera's drift (under 2%, hero3d) splits that span into 1.7 s pieces. s01 has no still stretch by design: its counter shows every frame.
- Cuts: s01 → s02 cut at 5.00 (f299|f300) still → still. The s05 → s06 zoom-through and the s06 → s07 light leak are ok. (The one warning, the whip at 16.00, belongs to s03.)
- Audit: s01 7/7, s06 10/10, s07 9/9. Lint, finish off: no findings in the film.
- Result: no notes left.
