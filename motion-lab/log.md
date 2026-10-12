# Review log: Motion Lab, explained

This is the receipt for the video. Each scene was built from `brief.md`, then reviewed against frames until no notes were left: contact sheets, speed graphs, onion skins, the hold check, and `check()`s of the brief's numbers. Each builder's full log, with every note pinned to its frame, is in `log/`.

| Scenes | Log | Rounds per scene | Frame notes |
| --- | --- | --- | --- |
| s01–s05 · the one-prompt myth, experiment 1 | [log/a.md](log/a.md) | 2–3 | 21 |
| s06–s10 · how code becomes video, the directed prompt | [log/b.md](log/b.md) | 3–4 | 24 |
| s11–s13 · the numbers | [log/c.md](log/c.md) | 2–3 | 17 |
| s14–s17 · experiment 2, the audit, the review loop | [log/d.md](log/d.md) | 3–4 | 27 |
| s18–s21 · engines, the last mile, the close | [log/e.md](log/e.md) | 3 | 18 |

**Totals:**
- 21 scenes, 62 review rounds, 107 notes tied to frame numbers.
- 203 `check()`s, all passing on every third frame of the 19,555.

## Coordinator rounds (the whole video)

- **Round 1: shell.**
  - Scenes leaked into each other. A child's `visibility: visible` overrides a hidden parent, so seeked scenes stayed visible over later ones. Fix: `.scene` also hides with opacity.
  - Frame 0 had no chapter name.
  - `--scale 0.5` failed at 1080x1350: 675 is odd and H.264 needs even sizes. Fix: the renderer rounds to even.
- **Round 2: type.**
  - The bundled Geist had no ζ (nor → or ≤), so ζ drew in a thinner fallback face. Fix: the full Geist, plus Inter's Greek subset by unicode-range.
  - Chapter names faded in 0.05–0.4 s after each cut. Fix: they change on the cut.
- **Round 3: cuts.** A test proved that every hard cut had a ghost frame. The frame on a cut averaged 3 subframes of the old scene with 1 of the new: a black-to-white cut measured 136 on that frame instead of 255. Fix: `VIDEO.cuts`. This video declares its 20 cuts, and `tests/test_render.sh` guards the fix.
- **Round 4: details.**
  - The s01 subtitle measured 3.2–3.7 : 1 on the lit wall. Fix: a darker gray, now about 7 : 1.
  - The end card showed "09 When things break". Fix: the close has no chapter.
  - The progress ticks left a gap over the end card. Fix: the ticks span the article's sections.
  - s20's frames loaded from a QA folder. Fix: they moved to `assets/`.
- **Round 5: decisions.**
  - **The receipt in s17.** The brief invented "23 notes", so it uses the article's own figure: 4 review rounds and 15 follow-ups.
  - **The labels in s14.** They sit below the timeline ruler, out of the hero's flight path.
