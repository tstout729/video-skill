# Video Skill: the keynote film (v2)

GOAL: In about a minute, a LinkedIn viewer feels they are watching an Apple product announcement, and sees the range of what the skill can make: walkthroughs, diagrams, 3D, loops, style packs, every frame size, a voice timed to the word, and the self-review. Every clip is real output of the skill, and the film itself is made with it.
AUDIENCE: LinkedIn feeds, mostly phones, often muted at first. Every shot reads from its picture and its headline alone.
FEEDBACK THAT SHAPED v2 (Trevor, 2026-10-13, on v1): "It skips through some stuff kinda quick and I do not like the music. I want it to be like an Apple announcement video." v1 gave diagrams, 3D and loops one bar (1.9 s) each, changed the frame shape every 0.8 s, landed ten tiles in one bar, and ran on an EDM track (claps, saws, offbeat open hats).
TIME: 32.5 bars at 110 BPM = 70.91 s, 4,255 frames at 60 fps. A bar is 2.182 s, a beat 0.545 s (32.73 frames). Bar 0 starts at t = 0. Every time is `barT(bar, beat)` from kit.js.
OUTPUT: HTML + motion.js + transitions.js + three.js r186, 1080x1350 (4:5), 60 fps, 4 subframes, shutter 0.4, linear-light blur. Not a loop. Mixed at −14 LUFS for social.
MUSIC: a score composed with ElevenLabs Music from a six-chunk plan of whole bars at 110 BPM (`music/compose.py`), measured against Apple's films: sleek electronic hip-hop, a deep 808, snaps on 2 and 4, crisp hats, a dark plucked hook; a quiet intro and a one-beat stop before the drop on bar 4; a breakdown under the voice (bars 20–23); a build and stop on bar 23, the drop on bar 24; a final hit on bar 29. Cut to the picture on bar lines by `music/edit.py` (log.md, round 5). Options A and B (`bed.py --mood cinematic`) were rejected.
VOICE: one line, George's real take from `one-minute/` ("It writes the script, records the voice, and times every move to the words.", 4.88 s), from bar 20 beat 1 (44.18 s), in the break. No new ElevenLabs credits.
FRAME: no chrome. Content inside x 54–1026, y 96–1255. The bottom 95 px stay empty (feed buttons and the progress bar).

SHOTS: one scene module per shot (scenes/sNN.js). The music's sections are in brackets.
  s01 Introducing · bars 0–4 (0–8.73) · black studio · cut. [intro; build in bar 3, stop on bar 3 beat 3]
      f0: the mark rim-lit against black (the thumbnail). Bar 0 beat 2: "Introducing" (gray). Bar 1: the key light rises and the mark turns to face us. Bar 2: "Video Skill". Bar 2 beat 2: "for Claude Code" (gradient). Bar 3 beat 3, the stop: the key light snaps off. Cut on bar 4.
  s02 Every frame · bars 4–6 (8.73–13.09) · black · cut. [drop 1: the boom]
      "Every frame." lands on the boom on bar 4: the film's one hard landing. The live frame counter under it. "Made in code." on bar 5 ("code." in the gradient). Hold.
  s03 Walkthroughs · bars 6–8 (13.09–17.45) · black · cut.
      The walkthrough clip on a screen floating in black (`.stage3d` + `.screen`), turned −16° and easing to −5° across the shot, with its reflection. Bar 6 beat 1: headline "Walkthroughs."; bar 6 beat 3: subhead "Real screens, clicked step by step." The clip shows the pointer clicking and typing.
  s04 Diagrams · bars 8–10 (17.45–21.82) · black · cut.
      Mirror of s03: the screen turned +16° easing to +5°. "Diagrams." / "Ideas, explained in motion." Pick the stretch where the network draws on, and crop so the diagram fills the screen: v1's diagram was thin and small.
  s05 3D · bars 10–12 (21.82–26.18) · black studio · cut.
      "3D." / "Lit and rendered with three.js." The mark turns slowly into the light; the studio's specular sweep crosses it; one hop that touches down on bar 11 (pop).
  s06 Loops · bars 12–14 (26.18–30.55) · black · dissolve 0.8 s into s07.
      A square screen, gently tilted. "Loops." / "Seamless, and on the beat." One full morph of the checkout loop, then hold.
  s07 Any style · bars 14–17 (30.55–37.09) · black. [drop 2: the boom on bar 14]
      "Any style." lands with the boom. Riso from the start; bar 15: the edge wipes to pixel art on the right two thirds; bar 16: to cut paper on the right third. Tags Riso · Pixel · Paper. The three-way picture holds a full bar.
  s08 Any frame · bars 17–20 (37.09–43.64) · black · dissolve 0.8 s into s09.
      "Any frame." One screen springs (ζ 0.82, 0.6 s) through 16:9 · YouTube, 1:1 · Feeds, 4:5 · LinkedIn, 9:16 · Reels. Each shape holds at least 1.4 s settled with its label; the last at least 2 s.
  s09 Voice · bars 20–23 (43.64–50.18) · black · cut. [break: no heartbeat; the music ducks under the voice]
      The sentence in large type; every word dim until its real start (audio/voice.json), the spoken word in the gradient, then white. The take's waveform with a playhead at the true time. A gray subhead: "A voice, timed to every word." (It is an ElevenLabs voice: never call it real or human.)
  s10 Review · bars 23–27 (50.18–58.91) · black · cut. [build on bar 23, stop on its beat 3; drop 3 from bar 24]
      Bar 23: "It checks its own work." Bar 24, the boom: this film's own contact sheet assembles. Bar 25: its onion skin. Bar 26: its speed graph, the curve drawing on. Each card holds about a bar.
  s11 Checks · bars 27–29 (58.91–63.27) · black · cut.
      Bar 27: the number counts up to this film's real number of check()s. Bar 28: it turns mint, a check draws, "All pass." (success sound). Hold.
  s13 Get it · bars 29–32.5 (63.27–70.91) · black studio · end. [end: the final boom on bar 29, then the chord rings out]
      The mark drops in and touches down on bar 29 beat 1 (pop). Bar 29 beat 3: "Video Skill". Bar 30 beat 2: "Free and open source. Available now." Bar 31: both install lines, then the repo. The full card holds at least 3 s.

LOOK:
- An Apple announcement: black #000 throughout; output shown on screens floating in black space with soft reflections, or as the 3D mark in its studio. No light shots.
- Headlines: Geist 700, 120–160 px, −0.045em, white #F5F5F7, centered (`.headline`). Subheads: Geist 600, 44 px, Apple gray #86868B (5.8:1 on black, `.subhead`). The warm gradient (saffron → orange → clay) on one word or phrase per shot at most, display type only.
- Mono (Geist Mono) for numbers, code and labels. Nothing under 28 px; contrast at least 4.5:1, measured with the finish off.
- Film finish: grain 0.03 at 12 fields a second, vignette 0.14, no finish sweeps (on black they read as haze); the studio's own specular sweep instead.
MOTION:
- Calm and continuous, never rushed. Every shot pushes in slowly (scale 1.00 → 1.05, ease-in-out across the shot); screens turn slowly as described. The camera never stops dead inside a shot.
- Text enters with `appear()`: up 24 px from 8 px of blur over 0.9 s, ease-out, starting 2 frames before its beat. A headline, then its subhead a beat or two later. No punch and no blur-slam, except "Every frame." on the first drop.
- Springs ζ 0.82 for objects and windows, 1.0 for text. One hero move per shot.
- Holds: every state at least 1.5 s settled plus 0.3 s per new word; each shot's finished picture at least 2 s before its cut (s01 excepted: its stop is the beat before the drop).
- Handoffs: cuts on bar lines, and two dissolves. No whips, no zoom-throughs.
CAMERA: 3D: FOV 35°, drift under 2%, one purposeful turn per 3D shot. 2D: the slow push and the screens' turns.
SOUND:
- The cinematic score above, ducked under George's line (`mux.py --music-db -6`).
- sfx() only on visible hits: pop on the two landings, success on "All pass." No whooshes.
- `mux.py --social` (−14 LUFS), true peak −1 dBTP, sounds 1 frame after their picture. check_sync.py passes.
BAN:
- From references/brief.md: purple or blue gradients, navy "space" backgrounds, glow, bloom, lens flares, neon, halo rings, floating particles, sparkles, turntable spins, bouncy easing (ζ under 0.7), everything fading in at once, dead time, template looks.
- v1's hype moves: beat-slams on every word, punches, whips, zoom-throughs, light/dark alternation, shots of one bar, states shorter than 1.4 s.
- Emoji. Stock icons. Invented numbers: every figure on screen is this film's own.
QA:
- Per shot: a contact sheet, a speed graph of the hero move, check()s for landings on their beats, holds, marks and overlaps.
- `review.mjs audit`, `lint --query finish=0 --allow lint-allow.txt` and `cuts` pass; `holds` on the final file.
- Log every round in log.md, notes tied to frame numbers.

Render contract: skills/video/references/brief.md → Render contract.
