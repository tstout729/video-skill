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
