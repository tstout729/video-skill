# Proof builder log: s09 Voice, s10 Review, s11 Checks, s12 Everything

Range: 28.63–48.39 s (f1718–f2903). Files: `keynote/scenes/s09.js`–`s12.js`. QA output: `keynote/qa/proof*`.

## Round 1: first build, stills at the landings
- Checked: 18 stills (`qa/proof/r1-board.png`), then `review.mjs audit` per shot.
- f2118 (s10, 35.3 s): the headline sat at the top over about 800 px of black for all of bar 18. It read as a slide waiting for content. Fix: the headline lands centered on bar 18 and glides up to the top on the drop (ease-in-out, 0.36 s). The cells start half a beat later, once it has cleared the deck.
- f2850 (s12, 47.5 s): the explainer tile was nearly empty. The style tiles cut "How a seed grows" and their step labels at the left edge. Fix: re-crop each tile to its action (explainer network, flower and sun, loop check).
- Audit, 6 failures:
  - f2074 (s09): the playhead box ended at x 1042 at the end of the 3% drift. Fix: full-width parts are 940 px wide, so they stay inside x 54–1026 at the drift's 1.03. The same applies in s10, s11 and s12.
  - s09: voice.json gives "words." an end of 4.96 s, past the 4.88 s take. The all-white sentence held only 0.26 s before the cut. Fix: the last word hands over at the take's end. It now holds 0.34 s.
  - f2321 (s10): a card rising 100 px onto the deck passed below y 1255 and over the tags. Fix: the rise is now 80 px (the step back is 48 px, 60% as far), and the deck ends 86 px above the tags.
  - f2359 and f2417 (s10): the ζ 0.82 spring was still 0.7 px past its mark at +0.6 s. Fix: the "on its mark" checks now start at +0.7 s.
  - f2332 (s10) and f2553 (s11): two check ranges were off by one frame.
  - f2903 (s12): the explainer ran 0.1 s past its last frame. Fixed by starting it earlier.
- Result: fixed; see round 2.

## Round 2: stills per shot, lint
- Checked: 38 stills (`qa/proof/r2-s09.png` … `r2-s12.png`), audit, `lint --query finish=0`.
- s12, all tiles: the crops did not change. Cause: `inset: auto` came after `left`/`top` in the style object, which reset them, so every clip showed its top-left corner. Fix: set `inset` first. A check now confirms each picture sits on its crop.
- f2328 and f2385 (s10): the arriving onion and graph read as a double exposure over the card behind for about 10 frames. Fix: the arrival fade is 0.16 s instead of 0.3 s. The card one step back now dims to 30% instead of 40%.
- f2598 (s11): the check mark started about 17 px left of the "1". Fix: moved the stroke right to align them.
- f2901 (s12): the explainer's "DNS" box enters at clip frame 160 and was cut by the tile's top edge. Fix: the clip now plays frames 25–153.
- Lint, 24 findings:
  - Six overlaps in s09: each word had a gradient copy laid over it. Fix: one span per word, with three looks (dim, gradient, white). The gradient hands over to white through a white layer inside the same span.
  - Four contrast findings in s12: the stat numbers were visible at 25% before their tiles landed. Fix: stat type is absent until its tile lands, then lands with `reveal()`.
  - 14 contrast findings in s09: the unspoken words are C.dim (2.3:1), as brief.md asks. Allowed in `qa/proof/lint-allow.txt`, with the reason.
- Result: audit 54 of 54 checks pass. Lint shows no findings to fix (14 allowed).

## Round 3: sheets, speed graphs, draft
- Checked: contact sheets `qa/proof-s09.png` … `proof-s12.png`; speed graphs `qa/proof-graph-s10-head.png`, `-s10-onion.png`, `-s11-punch.png`; the half-scale draft `qa/proof.mp4` and its sheet `qa/proof-draft-sheet.png`; onion skin `qa/proof-onion-s10-drop.png`; holds; cuts.
- f2217 (s10, 36.95 s): the "CONTACT SHEET" tag faded in before the first cell, which lands at 37.02 s. Fix: the sheet's moment, its tag and its deck time, is its first cell.
- Speed graphs:
  - Headline glide (f2206–f2224): soft start and soft stop, peak 59 px/frame.
  - Onion rise (f2321–f2346): soft start and soft stop.
  - s11 number: the punch is the brief's punch, rising over 2 frames to peak on the beat, so the tool reports a hard start by design.
- Holds:
  - With the finish on, no still stretch appears: the grain changes 12 times a second and the drift never stops.
  - With the finish off: s10 holds 0.9 s + 0.7 s on bar 18 (the drift splits it), and s11 holds 0.8 s.
  - s09 and s12 move by design: the playhead and the lit words run through s09, and every tile plays through s12.
- Cuts: the dissolve in at 28.63 s and the zoom-through at 44.12 s are "ok". The cuts at 34.84 and 40.65 warn "still → zoom −0.5%", because the type reveal (106% to 100%) starts on the cut. That is the brief's landing on the downbeat; s02 and s05 show the same warning.
- Result: audit 54 of 54 checks pass (s09 23, s10 14, s11 7, s12 10), lint clean, no notes left.

# v2 (2026-10-13): Apple-announcement rework of s09, s10, s11

Trevor on v1: "It skips through some stuff kinda quick and I do not like the music. I want it to be like an Apple announcement video." The tempo is now 110 BPM, s09 runs 43.24–50.18 (in by dissolve), s10 50.18–58.91, s11 58.91–63.27, and s12 is deleted. Text uses `appear()`, with no punches or blur-slams. Each shot pushes in slowly with an ease-in-out across the shot: 1.00→1.04 in s09, 1.00→1.05 in s10 and s11.

## v2 round 1: rebuild, stills, audit, lint
- Built:
  - **s09:** the mono label is dropped. The sentence is centered at the largest size that fits a 920 px column (100 px). The whole waveform is drawn dim, and bars turn white as the playhead crosses them, mirroring the words. The gray subhead "A voice, timed to every word." sits under it. Everything is on screen from the dissolve, because the take starts 0.14 s after the dissolve ends and an entrance would compete with the first word.
  - **s10:** the headline appears centered on bar 23 and glides up during the stop (bar 23 beat 3). The sheet rises on the boom and its 9 cells land on the 32nd notes of beat 0. The onion skin arrives on bar 25. On bar 26 the graph arrives and its plot draws on as it rises. Each card leads for a full bar.
  - **s11:** both rows are centered. The count runs from bar 27 to beat 3. On bar 28 the number turns mint, the check draws, "All pass." appears, and the success sound plays one frame later.
- Timing decisions:
  - **s10 cells:** 9 eighth notes need 4 beats and would run into bar 25. On sixteenths, the finished sheet would hold only about 0.85 s. On 32nds, the last cell lands on bar 24 beat 1 and the sheet holds 1.2 s settled.
  - **s11 "All pass.":** it can't be settled for 2.1 s (1.5 s + 0.3 s a word). It appears on bar 28 and the cut is one bar later, so it is fully in 1.3 s before the cut.
- Stills (`qa/proof/v2r1-s09.png`, `-s10.png`, `-s11.png`):
  - f3318 and f3396 (s10): behind the onion, the stepped-back sheet's light "Walkthroughs" cell showed as a lopsided tab. Fix: the card behind now dims to 22% instead of 30%. The tab disappears with the v2 sheet, which has no light frames.
- Audit: 4 failures, all in the checks themselves.
  - f2594 (s09): visibility is inherited from the root, which transitions.js hides on the dissolve's first frame. The check now reads the element's own style.
  - f3271 and f3402 (s10): the last frame of each "in front" range already belonged to the next card.
  - f3537 (s11): a count-range clause was too tight.
  - s11: a string compare of `strokeDashoffset` failed.
- Lint with `keynote/lint-allow.txt`: 14 dim-word findings, because the shared allow line still carries v1's range `@ 28.6-34.9`. With the range set to `@ 43.2-50.2` (`qa/proof/lint-allow-v2.txt`), the whole film lints clean: 0 findings to fix, 14 allowed.

## v2 round 2: sheets, graphs, draft, cuts
- Checked: contact sheets `qa/proof-s09.png`, `proof-s10.png`, `proof-s11.png`; speed graphs `qa/proof-graph-s10-head.png`, `-s10-onion.png`, `-s10-graph.png`, `-s11-pass.png`, `-s09-playhead.png`; the draft `qa/proof.mp4` (43.24–63.27, half scale) and its sheet `qa/proof-draft-sheet.png`; onion skin `qa/proof-onion-s10-boom.png`; holds (finish off); cuts.
- Speed graphs:
  - s10 headline glide, f3110–f3134: soft start and soft stop.
  - Onion and graph rises: soft, about 0.42 s each.
  - s11 "All pass." f3660–f3699: soft.
  - s09 playhead: linear by design (it is the true time).
- Holds with the finish off: s10 1.0 s and 1.1 s; s11 1.23 s to the cut. The push keeps every hold moving slightly, so `freezedetect` reads them shorter than the settled times in the checks. s09 moves throughout by design: the playhead and the words follow the voice.
- Cuts: the dissolve in at 43.24 is "ok", and so are the cuts at 50.18, 58.91 and 63.27.
- Draft f339 (54.54 s): the onion's 0.16 s arrival fade shows the sheet through it for a few frames. This is the intended short fade; the card is opaque before it has risen far.
- Result: audit 51 of 51 checks pass (s09 25, s10 17, s11 9), no notes left.

## v2.1 round 3: Apple caption style (coordinator, 2026-10-13)
Apple's feature text is one small centered line (`.caption`, 64 px, white, with the secondary part in gray). Only the product name, or a number, is huge.
- **s09:** the subhead is now the caption "A voice, *timed to every word*". The sentence is capped at 84 px (it renders at 84).
- **s10:** the two-line display headline is replaced by the caption "It checks *its own work*". It still appears centered on bar 23 and glides to the top during the stop. The cards fill the freed space, between the caption (plus room for a stepped-back card) and the tags. Sheet cells are now about 280 px tall, up from about 200; the onion skin is 868 px tall. The gradient is gone from s10.
- **s11:** a 340 px number alone and centered. Under it are the caption "checks" in gray, appearing 150 ms after the number, and on bar 28 the caption line "✓ All pass." with a 56 px mint check.
- Checked: stills `qa/proof/v21-s09.png`, `-s10.png`, `-s11.png`; contact sheets `qa/proof-s09.png`, `proof-s10.png`, `proof-s11.png`; speed graphs `qa/proof-graph-s10-head.png` (caption glide, f3110–f3134, soft), `-s10-onion.png` (soft) and `-s11-pass.png` (soft stop); the draft `qa/proof.mp4` and `qa/proof-draft-sheet.png`.
- f3276 (s10): the onion now has the same footprint as the sheet, so its 0.16 s arrival fade read as a full-frame double exposure. Fix: the arrival fade is 0.1 s (6 frames).
- f3396 (s10): the stepped-back sheet's light "Walkthroughs" cell still peeks above the onion. It goes away with the v2 sheet, which has only black frames.
- Result: audit 51 of 51 checks pass (s09 25, s10 17, s11 9). `lint --query finish=0 --allow keynote/lint-allow.txt` shows no findings to fix film-wide (14 allowed); the coordinator updated the allow range to 43.2–50.2. No notes left.
