# Review log: Video Skill, the keynote film

The film is cut to the music: frames are 60 fps, a beat is 29.03 frames, a bar 116.13 frames. Each builder's own rounds are in `log/` (hero: s01, s05, s13; range: s02–s08; proof: s09–s12). This log holds the whole-film rounds.

## Round 0: direction (2026-10-12)

- Trevor: "more upbeat and more like an Apple announcement keynote video, but showing off the cool stuff that CAN be done." The narrated cut in `one-minute/` explains the skill; this one shows it off.
- Brief: no narrator except one voice line as the demonstration of the voice; a black stage alternating with #F5F5F7; one or two words per shot at 140–220 px; a handoff on every bar line; real output in every shot.
- Music: `bed.py` had only calm and drive beds with no arrangement. Added `--mood anthem` with `--sections`, so a build can stop for a beat before a reveal and a break can make room for the voice. Measured, not heard: the drops sit at −15 dB RMS per bar, the break 4 dB under them, the intro 10–13 dB under; both stops fall to −55 dB, about 38 dB under the bar before. The voice line sits 7 dB over the bed under it with `mux.py --music-db -6`.

## Round 1: shared-file notes from the builders

- Hero, f274, f1119–f1131, f3003–f3014: the finish layer's light sweep reads as a grey diagonal haze over black. Fixed: no finish sweeps; the keynote studio's specular sweep across the mark lands on the same three beats.
- Range, s07 and s08: the words now land on bar beat 1, not on the cut, because a reveal on a cut's first frame made the cut check warn; each shot opens on a finished picture instead. Kept.
- Range, s08 f1566–f1766: each label holds 0.82 s settled, under the 1.1 s floor for two words. The half-bar cadence sets that maximum; the shape change carries the meaning and the label is secondary. Accepted.
- Range: #6E6E73 measures 4.2:1 under a light window's shadow, so s03 and s08 set #616166 inline (4.6–5.0:1); two-line `.giant` text sets line-height 1.0 inline in s02. Left inline: each is one use.
- Cuts that warn by design: s01→s02 at 7.74 s (the drop: still picture, then "Every frame." landing on the downbeat) and s04→s05 at 17.42 s ("3D." landing on the downbeat). A smash cut onto type that lands on the beat is the keynote move the brief asks for.
- Whole-range sheet (qa/range-draft-sheet.png): s04 is the weakest picture: a thin teal network on near-black, small in the window. To judge in the full draft.

## Round 2: the whole film (2026-10-12)

- s10: the review cards showed `one-minute/`'s images. Replaced with this film's own: a 9-frame contact sheet (f318–f3216), the onion skin of s06's morph (f1217–f1259) and the speed graph of s05's hop (f1068–f1107, soft start, soft stop). The onion of the hop itself was rejected: on the black studio, later frames' black covers the earlier copies and leaves black holes that read as a glitch.
- Proof, s10 f2221–f2279: the 9 sheet cells land on sixteenths, not eighths: nine eighths need 4.5 beats and would collide with the onion skin on bar 20. Kept.
- audit: 137 of 137 checks pass over 3,205 frames. lint (finish off): no findings to fix; 14 allowed (s09's dim, not-yet-spoken words, lint-allow.txt). cuts: four hard cuts warn "still → zoom" at 7.74, 17.42, 34.84 and 40.65 s; each is type landing on the downbeat after a smash cut (reveal() settles its 6% scale), the keynote move the brief asks for. All five transitions pass.
- s13 f3020 on: the end card showed only `/plugin marketplace add tstout729/video-skill`, but the plugin installs in two lines (README.md → Install). The pill now holds both lines (`/plugin install video-skill@video-skill` second); the repo line moved from y 1136 to y 1178. 15 of 15 s13 checks pass.
- s10: the contact sheet inside the film was made before the s13 fix, so its last cell showed the one-line end card. Regenerated assets/sheet.png from the same 9 times and rendered again.
- assets: the regenerated sheet was 8.1 MB because film grain does not compress. Rendered it with the finish off (1.7 MB). Without the vignette, the light cells' backgrounds match the sheet's paper, so the Walkthroughs cell filled 54% of its box and s10's region finder (60% minimum) dropped it; s10 now accepts 40% for the sheet, still matched by the common cell size. The onion skin keeps the finish (1.7 MB): without the vignette its light frame's edge vanishes into the paper. 14 of 14 s10 checks pass.

## Round 3: the final file (2026-10-12)

- Render: 3,310 frames at 60 fps with 4 subframes, 268 s. Mix: −14.0 LUFS, −1.2 dBTP true peak, nothing below 60 Hz; check_sync.py puts all 5 sounds 0.9–1.3 frames after their picture. The music's hits measured in the final file land on their cuts: drop 1 at f464.5 and drop 2 at f2206.5 (each cut at the same half-frame), the end hit at f2903.3 (cut f2903.2); both stops fall to −41 dB under the hit.
- Read in the LinkedIn copy (export.py, 83.9 MB): f0 rim-lit mark, f456 the stop (key off), the three-way style split, the voice line half lit, the review deck with this film's own sheet, and the two-line install card. No notes.
- Delivered to Downloads and iCloud Drive (byte-identical). Not merged to `main`: the headline swap and the LinkedIn post wait for Trevor's review.
