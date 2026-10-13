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

- Render: 3,310 frames at 60 fps with 4 subframes, 268 s. Mix: −14.0 LUFS, −1.2 dBTP true peak, nothing below 60 Hz; check_sync.py puts all 5 sounds 0.9–1.3 frames after their picture. The music's hits measured in the final file land on their cuts: drop 1 at f464.5 and drop 2 at f2206.5 (each cut at the same half-frame), the end hit at f2903.3 (cut f2903.2); the stops fall 39 dB and 42 dB under their hits.
- Read in the LinkedIn copy (export.py, 83.9 MB): f0 rim-lit mark, f456 the stop (key off), the three-way style split, the voice line half lit, the review deck with this film's own sheet, and the two-line install card. No notes.
- Delivered to Downloads and iCloud Drive (byte-identical). Not merged to `main`: the headline swap and the LinkedIn post wait for Trevor's review.

## Round 4: v2, after Trevor watched v1 (2026-10-13)

- Trevor: "It skips through some stuff kinda quick and I do not like the music. I want it to be like an Apple announcement video."
- Fast in v1: diagrams, 3D and loops had one bar each (1.94 s at 124 BPM); the frame shapes changed every 0.82 s; the bento landed ten tiles in one bar; type slammed in on every beat.
- v2 direction (brief.md): 110 BPM; every feature shot gets 2 bars (4.36 s) or more; review 4 bars; the bento is cut; holds of 1.5 s plus 0.3 s a word; black throughout with output on floating screens and reflections; Apple-style headline + gray subhead entering with `appear()` (0.9 s ease-out from 24 px and 8 px of blur); a slow push on every shot; cuts and two dissolves, no whips or zoom-throughs. 70.9 s.
- Music: the EDM anthem is out. Added `bed.py --mood cinematic` (pad, eighth-note pulse, glass bells, heartbeat sub on 1 and 3, booms on drops, felt piano in the break, no claps or snares). First render measured dark (−44 to −50 dB above 2 kHz) with the break as loud as the drops; added the bells' upper partials, offbeat closed hats and a later shaker, opened the pulse's filter, and lowered the break: highs up about 6 dB, the break 2–4 dB under the drops. Two versions for Trevor to choose by ear: A (E major, seed 5) and B (F#m, seed 7), same sections.
- Range, v2 timing at 110 BPM: s02 holds its finished picture 1.5 s (not 2) with "Made in code." on bar 5; s07's wipes start on their bars (riso 1.5 s, pixel 1.58 s, three-way 1.73 s settled); s08 drops 1:1 · Feeds, so three shapes hold 1.5–1.98 s each instead of four at about 1 s. All kept: the film stays 32.5 bars.
- s04: v1's explainer clip was the first 6 s at 960 px. New clip `clips/explainer-hd`: source 16–30 s at 1920×1080 (the DNS card, its table and the request travelling), so the diagram can fill the screen sharply.
- Trevor, on options A and B: "Need a completely different music. Watch recent Apple keynotes and base off of that." Measured five of Apple's films (analysis only, not in the film): the 2026 iPhone 18 Pro and iPhone Duo introductions and event recap, and the 2025 one-minute iPhone 17 Pro and iPhone Air spots. Music: the sub-bass below 80 Hz is the loudest band (−2.4 and −3.3 dB of the total in the two spots, against −9.5 in option A); 5–10 strong onsets a second; about 99 and 129 BPM; one dip and sweep mid-film, then a hard drop; a hard stop at the end. Picture: feature text is one small centered line ("Forged aluminum unibody"), about 4% of the frame's height; only the product name is set huge; text cards and product shots alternate; median shot 1.5–1.8 s in the one-minute spots. So: `.caption` (64 px, white key phrase, gray rest) replaces `.headline` + `.subhead` for feature shots.

## Round 5: the score, from Apple's films (2026-10-13)

- Trevor rejected options A and B (bed.py cinematic) without picking either: "completely different music", based on recent Apple keynotes. Measured against Apple's films, both options were the opposite of Apple's sound: option A had −9.5 dB of sub-bass share against Apple's −2.4/−3.3, a dull top (centroid 873 Hz) and sparse rhythm.
- Composed with ElevenLabs Music (music_v2_5, Trevor's Creator plan, which licenses commercial use) from a six-chunk plan whose lengths are whole bars at 110 BPM (`music/compose.py`). ElevenLabs refused the first plan for naming a brand, so the styles describe the sound in plain terms: sleek electronic hip-hop, deep 808 sub-bass, snaps on 2 and 4, crisp hats with rolls, a dark plucked hook. Three takes, about 1,065 credits each. Take 1 followed the plan for 20 bars (110 BPM, the drop exactly on bar 4) and then lost it (bars 24–27 near silence); takes 2 and 3 put the first drop on bars 8 and 6 and had no break. Kept take 1 (ElevenLabs song fWDT30CfFnVN5WBvhbjM).
- `music/edit.py` cuts take 1 to the picture on bar lines (all its hits sit 23 ms after the bar line, no drift): bars 0–20 as composed; its breakdown under the voice; its opening build before the review; its first drop again under the contact sheet; its last hit under the end card's landing; its opening motif as the tail. Both builds end in a one-beat stop (−60 dB, then −6 dB on the downbeat). The 808 put 74% of the energy below 60 Hz, against 25–42% in Apple's films; a 45 Hz high-pass (3 sections) brings it to 32% below 60 Hz, 23% at 60–120 Hz and 45% above. −14.1 LUFS, −1.6 dBTP.

## Round 6: the whole v2 film (2026-10-13)

- Builders: hero 34 of 34 checks, range 55 of 55, proof 51 of 51, with the one-line Apple captions. Range: `-webkit-box-reflect` renders correctly with 4-subframe blur (within 1–2 levels of the still). Holds the bars couldn't fully give: s02 1.51 s finished, s07 riso 1.47 s, s10's finished sheet 1.2 s, s11 "All pass." 1.3 s settled before the cut (readable about 1.8 s). Accepted: each is still slower than v1's equivalent.
- s10's pictures regenerated from v2: a 9-frame sheet (finish off, 1.7 MB), the onion skin of s06's morph (f1584–f1675) and the speed graph of s05's hop (f1371–f1411, soft start and stop).
- audit 140 of 140 over 4,255 frames; lint (finish off) nothing to fix, 14 allowed; cuts: one warning, the deliberate slam at 8.73 s.

## Round 7: the final v2 file (2026-10-13)

- Render 4,255 frames at 60 fps with 4 subframes, 295 s. Mix: −14.0 LUFS, −1.2 dBTP; check_sync puts the 3 sounds 1.0–1.1 frames after their picture, and warns that 29.8% of the energy is below 60 Hz: kept, since Apple's films measure 25–42% there (round 5). Drops in the final file: 1.4 frames after their cuts at f524 and f3142, out of true silence (−89 and −91 dB); the end hit at f3797. George's line sits 7.0 dB over the music under it.
- Read in the LinkedIn copy (export.py, 107.9 MB): the rim-lit thumbnail, the title, the slam, a floating walkthrough screen, the 3D mark, the style split, the lit sentence, the review deck, "140 checks · All pass." and the end card. No notes.
- Delivered to Downloads and iCloud Drive as "Video Skill, the keynote film v2 (LinkedIn)". The music and the cut wait for Trevor's review; nothing is merged to `main`.
