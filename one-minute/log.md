# Review log: The video skill, in one minute

The coordinator's log: direction, integration and whole-film reviews. Each scene builder keeps its own rounds in `log/` (hero: s01, s06, s07; numbers: s02, s05; range: s03, s04).

## Round 0 · 2026-10-12 · direction

- Request: Trevor found the 5½-minute Motion Lab film far too long for LinkedIn. He wants one video of about a minute that shows off what the skill can do. The longer films stay on GitHub.
- Brief: `brief.md`. Seven scenes, one capability each, shown by real output of the skill: the brief in numbers, walkthroughs, diagrams, 3D, loops, style packs, voice timing, the review tools, and the end card.
- Narration: George, 113 words, 7 takes, all matched by Scribe on the first take (s06 at 0.979). 44.7 s of speech; with 1.1 s gaps the film is 55.92 s.
- Gaps: first set at 0.8 s, then widened to 1.1 s so each transition (0.8–1.0 s) fits in the silence between scenes without covering a word. Only `timeline.py` re-ran; nothing was re-recorded.
- Music: bed.py, drive, 120 BPM, D major, 28 bars, seed 11. Cuts land on the beat nearest the middle of each gap.
- Clips: cut with clip.py from the real example renders: the walkthrough (re-rendered today with lint fixes), the Manim explainer, the checkout loop, and the three style packs (rendered today at 24 fps).
- Palette checked by the WCAG formula before building: muted text #5C5953 (5.8:1 on canvas), muted on dark #C9C4BA (10.5:1 on ink, 4.8:1 on pine), clay #9E3D27 (5.6:1 on canvas), green #1A6B45 (5.4:1). Saffron is 3.8:1 on pine, so pine scenes use mint for accents.

## Round 1 · whole film · s02 and s05 in

- s02 and s05 are done (log/numbers.md): 3 rounds, 31 checks pass.
- The numbers builder corrected the brief: ζ 0.82 over 0.45 s overshoots +1.1% (5.8 px on the 520 px move), not 2–3%. The screen shows the measured value; brief.md now says so.
- f300 (5.00 s, the cut into s02): the finish's sweep for the s01 hop ran 4.51–5.41 s, across the hard cut. Removed; the film keeps one sweep, on the end card.

## Round 2 · whole film · s01, s06 and s07 in

- s01, s06 and s07 are done (log/hero.md): 3 rounds, 26 checks pass, lint clean across the film with the finish off.
- f0 and f2818: the chrome named the scenes "HOOK" and "END CARD", production words a viewer should not see. Now "MADE IN CODE" and "GET IT".
- s06 shows Motion Lab's sheet, onion skin and graph as stand-ins. To do once every scene is in: replace them with this film's own (a sheet of the whole film, an onion skin of the s01 hop, a speed graph of the s02 spring card).

## Round 3 · whole film · every scene in

- s03 and s04 are done (log/range.md): 4 rounds, 27 checks pass.
- Shared fixes the range builder asked for:
  - kit.clipWindow's hairline was an inset shadow on the window, covered by its `<img>`. design.css now draws it in `::after`, above the picture; s03's own rim layer is gone.
  - `review.mjs cuts` counted the caption line changing at 16.56 s as motion at the whip's end (f996). `#cap` is marked `data-fx`, so the check measures the picture only.
- s06 now shows this film's own review output: a contact sheet of the whole film (12 frames), an onion skin of the s01 hop (f222–f292), and the speed graph of the s02 spring card (f652–f671: soft start, soft stop, peak 50.3 px/frame at f657).
- Whole film: audit 84 of 84 checks over 3,194 frames; lint (finish off) no findings; cuts: 2 cuts and 7 transitions, all keep their motion across.
- Known short holds, accepted: the narration puts some cues 0.6–1.4 s apart (s02, s05, s06), and s03's 3D shot is on screen 1.85 s. Each still state is complete before the next cue, and the clips keep moving under their words.

## Round 4 · the final render

- The first full render stopped with "No space left on device": the Mac had 356 MB free. Another process freed the space (24 GB free); nothing in this project was deleted. The re-render took 232 s: 3,355 frames at 60 fps with 4 subframes.
- Mix (`mux.py --social`): −14.0 LUFS, −1.1 dBTP, music at −24 dB under the voice. check_sync.py: all 8 sounds land 1 frame after their picture; 0.0% of the energy is below 60 Hz.
- Final sheet (qa/final-sheet.png, 12 frames from the MP4): every scene reads as planned. f918 catches the "One skill" → "Walkthroughs" roll mid-move, as intended.
- `review.mjs holds` can't measure this film: the grain changes 12 times a second and the captions light word by word, so no 0.6 s stretch of the frame is still. The still states were checked per scene with check()s instead (see the scene logs).
- Delivered: `out/The video skill, in one minute.mp4` (56.0 s, 217 MB master), the LinkedIn export (85.4 MB, 1080x1350, 60 fps), `.srt`, and a 22 MB web copy for the Pages site (`docs/one-minute.mp4`).
