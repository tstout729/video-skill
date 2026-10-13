# Video Skill: the keynote film

GOAL: In under a minute, a LinkedIn viewer feels the energy of a product launch and sees the range of what the skill can make: walkthroughs, diagrams, 3D, loops, style packs, every frame size, a real voice timed to the word, and the self-review. Every clip is real output of the skill, and the film itself is made with it.
AUDIENCE: LinkedIn feeds, mostly phones, often muted at first. Every shot reads from its picture and one or two words. Trevor asked for "more upbeat, more like an Apple announcement keynote video, showing off the cool stuff that can be done" (2026-10-12), replacing the calmer narrated cut in `one-minute/`.
TIME: 28.5 bars at 124 BPM = 55.16 s, 3,310 frames at 60 fps. A bar is 1.935 s, a beat 0.484 s (29.03 frames). Bar 0 starts at t = 0. Every time is `barT(bar, beat)` from kit.js, computed from the beat number.
OUTPUT: HTML + motion.js + transitions.js + three.js r186, 1080x1350 (4:5), 60 fps, 4 subframes, shutter 0.4, linear-light blur. Not a loop. Mixed at −14 LUFS for social.
VOICE: none, except one line: George's real take from `one-minute/` ("It writes the script, records the voice, and times every move to the words.", 4.88 s) in shot s09, as the demonstration of the voice. No new ElevenLabs credits. The words on screen are its captions.
FRAME:
- No chrome. Content inside x 54–1026, y 96–1255. The bottom 95 px stay empty (feed buttons and the progress bar).
- One message per shot: a word or two set huge, over a real piece of output.

SHOTS: one scene module per shot (scenes/sNN.js). Handoffs are centered on the bar line, so the new shot takes over on the downbeat. Music sections in brackets.
  s01 Introducing · bars 0–4 (0–7.74) · keynote studio · cut. [intro, build in bar 3, stop on bar 3 beat 3]
      f0 (the thumbnail): the mark at a three-quarter turn (yaw −38°), traced only by its rim lights against black, the key light at 8%. Bar 0 beat 2 (0.97): "Introducing" (h2, muted) reveals at y 170. Bar 1 (1.94): the key light rises over 1.2 s and the mark turns to −14° over 1.6 s (ζ 1.0, one purposeful turn, then still). Bar 2 (3.87): "Video Skill" (hero 168 px) reveals; light sweep at bar 2 beat 0.5. Bar 2 beat 2 (4.84): "for Claude Code" (h2, gradient). Bar 3 beat 3 (7.26), the stop: the key light snaps off over 3 frames; the rim and the type hold. Smash cut on bar 4.
  s02 Every frame · bars 4–6 (7.74–11.61) · black · zoom-through. [drop]
      Bar 4 (7.74): "Every frame." (giant 200–220 px, two lines) lands on the downbeat with one punch. Bar 4 beat 1: a mono counter under it shows this film's real frame number on every frame (`f 0465`). Bar 5 (9.68): "Made in code." (display 120 px, "code." in the gradient). Hold to the zoom-through.
  s03 Walkthroughs · bars 6–8 (11.61–15.48) · light · whip left. [drop]
      The walkthrough clip in a 16:9 window (972 px wide) is on screen from the zoom-through. Bar 6 beat 1: "Walkthroughs." (hero 140 px, ink). Bar 7: one short line under the window, "Real screens, clicked step by step." (small). The clip plays a stretch where the pointer clicks and types. Drift 1.00→1.04.
  s04 Diagrams · bar 8 (15.48–17.42) · black · cut. [drop]
      "Diagrams." over the Manim explainer clip, a stretch where the diagram moves. One bar.
  s05 3D · bar 9 (17.42–19.35) · keynote studio · whip up. [drop]
      "3D." (giant) above the mark. The mark hops; touchdown lands on bar 9 beat 2 (18.39), with a pop. Light sweep on bar 9 beat 2.
  s06 Loops · bar 10 (19.35–21.29) · light · cut. [drop]
      "Loops." over the loop clip (one shape morphing through checkout states), a stretch with one full morph.
  s07 Any style · bars 11–13 (21.29–25.16) · black · cut. [drop]
      "Any style." (display) at the top. One square window (860 px) plays "How a seed grows" in riso. Bar 11 beat 2 (22.26): an edge wipes from the right to one third: the right two thirds become pixel art. Bar 12 (23.23): a second edge to two thirds: the right third becomes cut paper. Three tags under it light as each style appears: Riso · Pixel · Paper. The three clips share one timeline, frame for frame. Hold the three-way picture 1.9 s.
  s08 Any frame · bars 13–15 (25.16–29.03) · light · dissolve. [drop]
      "Any frame." (display) at the top. One window springs through four frame sizes on half-bars: 16:9 (bar 13), 1:1 (bar 13 beat 2), 4:5 (bar 14), 9:16 (bar 14 beat 2), ζ 0.82, 0.5 s, with the picture inside reframing. A mono label under it swaps with each shape: "16:9 · YouTube", "1:1 · Feeds", "4:5 · LinkedIn", "9:16 · Reels".
  s09 Voice · bars 15–18 (29.03–34.84) · black · cut. [break: no kick; the music ducks under the voice]
      George's line starts at bar 15 beat 1 (29.52). The sentence is set in h1 (84 px) over three or four lines; every word starts dim and lights to white at its real start time (audio/voice.json), the word being spoken in the gradient. Under it, the take's real waveform draws on with a playhead at the true time. A label: "VOICE · ELEVENLABS · WORD-TIMED". Nothing invented: every time comes from voice.json.
  s10 Review · bars 18–21 (34.84–40.65) · black · cut. [build in bar 18, stop on its beat 3; drop from bar 19]
      Bar 18 (34.84): "It checks its own work." (display, two lines). Bar 19 (36.77), the drop: a real contact sheet of this film assembles cell by cell on eighth notes (9 cells). Bar 20 (38.71): its onion skin; bar 20 beat 2: its speed graph, the curve drawing on. One card at a time; the last steps back as the next arrives (60% travel, 150 ms later).
  s11 Checks · bars 21–23 (40.65–44.52) · black · zoom-through. [drop]
      Bar 21: a giant number counts up to this film's real number of check()s (window.CHECKS.length), "checks" beside it. Bar 22: the number turns mint, a check mark draws, and "All pass." reveals, with a success sound.
  s12 Everything · bars 23–25 (44.52–48.39) · black · cut. [drop]
      A bento grid of live tiles lands on eighth notes across bar 23: walkthrough, diagram, loop, riso, pixel, cut paper, the 3D mark, the waveform, and a stat tile or two ("60 fps", the check count). The whole grid plays and holds through bar 24.
  s13 Get it · bars 25–28.5 (48.39–55.16) · keynote studio · end. [end: the final chord hits on bar 25, then rings out]
      The mark drops in; touchdown on bar 25 beat 1 (48.87), with a pop. Bar 25 beat 2: "Video Skill" (hero); light sweep at bar 25 beat 2.5. Bar 26: "Free and open source." Bar 26 beat 2: the install line `/plugin marketplace add tstout729/video-skill`, then `github.com/tstout729/video-skill`. The full card holds at least 3.4 s.

LOOK:
- The keynote stage: black #000 for dark shots; Apple's light gray #F5F5F7 with ink #1D1D1F for light shots. Light and dark alternate, so every cut reads.
- Display type: Geist 700, tracking −0.045 to −0.055em, set huge. White #F5F5F7 on black. One warm gradient (saffron #F2B544 → orange #EE7A3A → clay #E2553A) on one word or phrase per shot at most, display type only.
- Secondary text: #A1A1A6 on black, #6E6E73 on light. Mono (Geist Mono) for numbers, code and labels. Nothing under 28 px; contrast at least 4.5:1, measured with the finish off.
- Windows: radius 36, a 1 px hairline; on light shots a soft shadow.
- The keynote studio (hero3d variant "keynote"): black, a soft pool of light on a glossy dark floor, the satin ceramic mark with key, rim and a specular sweep. No visible wall, no horizon line.
- Film finish: grain 0.03 at 12 fields a second, vignette 0.14. No finish sweeps: on black they read as grey haze (log/hero.md). The 3D studio's own specular sweep lands on the three beats instead: the title lands, the 3D shot, the end card.
MOTION:
- Type lands on the beat: reveal() starts 2 frames before the beat (from 14 px blur and 106% scale, expo ease-out, 0.6 s). Exits 0.24 s. Words 80 ms apart.
- One punch (4% scale, peak on the beat, gone in 6 frames) on each shot's hero at most.
- Springs ζ 0.82 for objects and windows, 1.0 for text. One hero move per shot; secondaries travel 60% as far and start 150 ms later.
- Every shot drifts: scale 1.00→1.03–1.04, linear over the shot. Text never moves otherwise while it is read.
- Holds: the floor for fast teasers, 0.3 s per word plus 0.5 s, for every text; most shots hold a full bar (1.94 s).
- Cuts and handoffs on bar lines; layout changes on beats, never more than one per beat.
CAMERA: 3D: FOV 35°, drift under 2%, one reveal turn in s01. 2D: the drift only.
SOUND:
- Music: bed.py `--mood anthem` at 124 BPM in E major with `--sections intro:3,build:1,drop:11,break:3,build:1,drop:6,end:3.5`: offbeat open hats, four-on-the-floor kick, clap and snare on 2 and 4, sidechained bright chords, a sixteenth-note hook, snare rolls and a riser in each build, a one-beat stop before each drop, an impact on each drop. Generated, royalty-free.
- sfx() only on visible hits, at most 2 per shot: whoosh on the two whips, pop on the two landings, success on "All pass."
- `mux.py --social` (−14 LUFS), true peak −1 dBTP, the music ducked under George's line, sounds 1 frame after their picture. check_sync.py passes.
BAN:
- From references/brief.md: purple or blue gradients, navy "space" backgrounds, glow, bloom, lens flares, neon, halo rings, floating particles, sparkles, turntable spins, bouncy easing (ζ under 0.7), everything fading in at once, dead time, template looks.
- Emoji. Stock icons. Text that moves while it is read (beyond the 3% drift).
- Invented numbers: every figure on screen is this film's own (frame numbers, the check count, render settings).
- The gradient anywhere but display type. Any light sweep beyond the three named beats, and the finish layer's sweeps on black.
QA:
- Per shot: a contact sheet, a speed graph of the hero move, check()s for landings on their beats, marks, and overlaps.
- `review.mjs audit`, `lint --query finish=0` and `cuts` pass.
- Log every round in log.md, notes tied to frame numbers.

Render contract: skills/video/references/brief.md → Render contract.
