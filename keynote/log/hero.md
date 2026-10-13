# Hero builder log: hero3d "keynote", s01, s05, s13

## Round 0: first look at the keynote studio (stills, finish on and off)
- Checked: s01 stills at f0, f240, f270, f444; pixel samples with `--query finish=0`.
- f0: the key at "8%" lit the face to about 30% brightness (a light at 8% intensity looks 30% as bright), so the thumbnail was a lit brown mark, not a rim-lit silhouette. Fix: light levels are perceived brightness; the key and the environment shine at level^2.2.
- f240: the reflection read at about 40% of the mark (15% applied in linear light). Fix: tuned by measurement; the face reflection now starts at 27/190 sRGB (14%) and is gone by about 0.5 heights down.
- f1103: a bright tick in the floor under the right edge: a clearcoat glint from a rim light is so hot that even at 0.7% it saturated in the reflection. Fix: the reflection pass clamps to white before it scales and fades.
- f0: the rims traced the top and right edges only. Fix: two analytic strip softboxes behind left and right (constant, Fresnel-weighted, upside down in the reflection pass), plus the two directional rims; the bottom edge is left dark.
- s01: the mark sat left of centre (the hop's resting x0 −0.6). Fix: framing x0 0.
- Result: fixed; f0 reads as a black mark traced by thin cool rims.

## Round 1: stills at every landing, contact sheets, speed graphs, audit, lint
- Checked: stills (debug) at f0, f58, f116, f174, f232, f274, f290, f435, f463, f1046, f1067, f1088, f1103, f1106, f1142, f2904, f2922, f2932, f2961, f3003, f3019, f3077, f3309; sheets `qa/hero-s01.png`, `qa/hero-s05.png`, `qa/hero-s13.png`; graphs `qa/hero-graph-s05.png` (hop, f1068–f1107, soft start and stop, touchdown f1103), `qa/hero-graph-s13.png` (drop, f2907–f2934, gravity ramp to a hard landing at f2932); audit per shot; lint `--query finish=0`.
- f274, f1119–f1131, f3003–f3014: the finish's 2D sweep (a 12% white band across the frame) reads as a grey haze over the black, on top of the glaze sweep. Shared file (index.html): asked for it to be removed; hero3d's specular sweep carries those three beats.
- f1071: the hop's anticipation squash put the mark's box at x 53, 1 px outside the stage. Fix: x0 −1.08 → −1.05.
- s05 at rest after the hop sat right of "3D." (x0 −0.6 lands at +0.59). Fix: the hop starts at the left and lands under the word.
- Sweep: the highlight crossed the face in about 0.25 s of its 0.9 s (cubic ease, ±1.8 half-faces). Fix: sine ease over ±1.3 half-faces (about 0.5 s on the face, glints on each bevel), band 0.11 half-face wide.
- Checks: 6 failures, all in the checks' edges: frame rounding at range starts (s01 key rise, the stop), 99.7% vs 99.9% opacity (s05), the box before the shot's first frame (s05), the drop entering through the top edge (s13), and the drop's yaw spring at 0.4° when "Video Skill" lands (0.6 px). The stop moved onto the frame grid (dark at f433, off by f436).
- Result: audit 13/13 (s01), 8/8 (s05), 15/15 (s13); lint has no findings in f0–f464, f1046–f1179 or f2904–f3310.

## Round 2: the lit face, the s01 framing, motion and handoffs
- Checked: pixel samples of the lit face (`--query finish=0`, f216, f1134, f3306); sheets again for all three shots (the look changed); onion skins `qa/hero-onion-s05.png` (f1067–f1103) and `qa/hero-onion-s13.png` (f2905–f2941); drafts `qa/hero-s01.mp4`, `qa/hero-s05.mp4`, `qa/hero-s13.mp4` (30 fps, half scale) and a sheet of the turn from the draft, `qa/hero-s01-turn.png` (1.90–3.70 s); `review.mjs cuts`; audit per shot; the declared sounds; a render-time bench of both studios.
- f216: the lit face was a flat cream (top 205, bottom 191 sRGB) with no modelling. Tried a low front card for a glaze sheen: it only lifted the whole face (220 → 195), so it came out. Fix: the key moved closer and more to the side (−2.8, 3.2, 2.8), the environment fill cut from 0.5 to 0.3 and the key raised to 2.9; the face now grades 207 → 173 from the key's corner and the lower-right bevel turns into shadow.
- s01: the mark at 380 px was small for the thumbnail. Fix: 400 px, centre y 852; the type still clears it (checked on every frame).
- Onion skins: the hop's spacing tightens into the apex and the touchdown (f1103); the drop's spacing widens under gravity to the landing (f2932). Draft sheet: the turn reads as one move into the light, still from about 3.0 s.
- Cuts: 17.42 s warns "still → zoom −0.4%": "3D." landing on the downbeat as the brief directs (the mark is still across the cut; the hop starts 0.36 s later). The whip out of s05 (19.05 s, still at its start) and the cut into s13 (48.39 s, still → still) pass.
- Sounds: pops declared at 18.400 s (f1103 + 1) and 48.883 s (f2932 + 1).
- Cost: keynote 1.7–2.5 ms a frame (median) against 9.7–9.9 ms for directed at 1080x1350 (no shadow pass, no 32-tap PCF; two light passes of the mark and one floor quad).
- Result: audit 13/13, 8/8, 15/15; lint clean in my ranges. Open: the finish's 2D sweep (shared index.html) still shows as a grey band over the black at f274, f1119–f1131 and f3003–f3014.
