# The directed brief

Every video starts with a `brief.md` in its project folder, written before any animation. Each line of a brief removes one decision the model would otherwise make. Those default decisions are what make motion look generated: a vague request gets glow, particles, a dark gradient and everything fading up at once. Swap every adjective for a number, and the decision is yours again.

A brief is short. Most fit on one screen. Show it to the user before animating when the request is open-ended.

## Template

```markdown
# <Title>

GOAL: <one sentence: what the viewer should feel, know or do afterwards. Write this first.>
AUDIENCE: <who watches, where, with or without sound>
TIME: <duration> at <fps>. <frames> frames. <BPM if music>
OUTPUT: <engine: Manim | HTML | HTML + three.js r186>, <width>x<height>, <fps> fps, <frames> frames, <loop: frames 0..N-1 | no loop>
SHOTS:
  1. f0–f119 (0–2 s): <one hero move>. Handoff: <cut on beat 4 | match cut: the card becomes the window | mask wipe>
  2. ...
LOOK: <background hex>, <ink hex>, <one accent hex, used only on ...>, <font>, <materials for 3D: satin ceramic, roughness 0.35, clearcoat 1>
MOTION: springs ζ 0.82 (UI) and 1.0 (text); entrances 400 ms ease-out, exits 200 ms ease-in; stagger 60 ms; anticipation 4 frames
CAMERA: <for 3D or zooms: FOV 40°, path, one push-in at f240–f300 ease-in-out, parallax 1.0 / 0.5 / 0.2>
SOUND: <voice id | silent | bed: calm, 120 BPM>; hits land 1 frame after their picture; -14 LUFS for social, -16 for training
BAN: <the starter list below, plus anything specific>
QA: render stills at <frames> and a contact sheet before the full render; speed graph the hero move of each shot
```

Cuts are the default handoff between shots. A match cut or a wipe is a deliberate choice; write it down.

## Adjectives into numbers

| The request says | The brief says |
| --- | --- |
| premium | ζ 0.8–0.85 springs, no overshoot on text, strong ease-out on entrances; real materials (satin ceramic, roughness 0.35, clearcoat 1), the brand color on one part only |
| cool | a real light setup: key, fill and rim with colors and strengths, soft contact shadows, no glow |
| modern | a narrow lens (FOV 35–50°), a camera that drifts and never stops, one push-in at a set time on ease-in-out |
| smooth | ease-out entrances of 400–600 ms, exits 40% shorter, items staggered 40–80 ms |
| snappy | feedback in 100–150 ms, ζ 0.7, moves under 300 ms, holds unchanged |
| playful | ζ 0.5–0.6 on position and size only, 10% squash on landings, arcs on every travel |
| calm | ζ 1.0, moves of 800 ms or more, one change per 2 bars, ambient motion under 2% |
| energetic | cuts on every beat, layout changes on every bar, 120–128 BPM |
| cinematic | 24 fps, a 180° shutter (`--shutter 0.5`), slow push-ins, shallow parallax |
| animation | a tempo (120 BPM), 3–6 frames of anticipation, springs with exact ζ, follow-through 80–150 ms after the main move |

## Feedback into notes

Give notes against frames, one or two per round.

| Vague feedback | The note |
| --- | --- |
| make it pop | a quick scale up of about 8% and back over 6 frames, peaking on the beat |
| make it feel premium | strong ease-out on entrances, springs at ζ 0.8, no overshoot on text |
| it drags | shorten each hold by exactly one beat, so the cuts stay on the grid |
| it feels busy | one hero move at a time; everything else delayed about 150 ms and travelling about 60% as far |
| it's too fast | add a hold of 1.5 s plus 0.33 s per word after each change; remove a state if the narration has no room |
| it looks like AI | name each default it used (glow, particles, gradient, everything fading up at once), add them to BAN, render again |
| the timing is off | "f212: the card lands 2 frames after the tap sound; start it 3 frames earlier" |
| it looks cheap | one font, real colors, exits shorter than entrances, no linear moves, contact shadows under objects |

## Ban list

Start every brief with this list, and add to it after each first render: name every default the model used anyway.

- Purple or blue gradients, and dark navy "space" backgrounds unless the brand calls for them.
- Glow, bloom, lens flares, neon, glowing halo rings.
- Decorative floating particles and sparkles.
- Turntable spins: an object rotating for no reason.
- Everything fading in at once, and fade-and-slide-up on every element.
- Everything centered.
- Text that moves while someone is trying to read it.
- Invented taglines, claims or numbers that the sources do not support.
- Bounce on text, opacity or color.
- Emoji used as icons, and mixed icon stroke widths.

## Render contract

Paste this under every brief. It keeps every frame reproducible, checkable and fixable.

- Every frame is a pure function of time: `seek(t)` sets everything. No clocks, `Date.now()`, timers, CSS transitions or animations, or state carried between frames.
- Randomness is seeded (`rand(seed)` in `motion.js`), so shapes never jitter between renders.
- A loop renders frames 0 to N−1, never frame N, which repeats frame 0 and causes a hitch at the seam. Drive a loop from a phase (frame ÷ N) with whole-number cycles, and sample noise along a circle (`loopNoise`) so it returns to its start.
- Frame 0 is a finished composition: it is the thumbnail people see while the video loads.
- Text is real text in the bundled fonts, never an image of text. Fonts load before the first frame.
- For 3D: pin the library version (three.js r186 from `/_vendor/`), and name the exact options. For example, `TextGeometry` takes `depth`, not `height`: an unknown option is ignored, and the default depth of 50 makes the letters absurdly thick.

## Review log

Keep a `log.md` next to the brief. Write one entry per review round:

```markdown
## Round 2: draft at 30 fps
- Checked: contact sheet f0–f2999, speed graph of the card (f300–f360), holds
- f312: the card lands 2 frames after the tap. Fix: start the spring 3 frames earlier.
- f1440–f1500: two heroes (title and chart). Fix: delay the chart 150 ms, travel 60%.
- Result: fixed; the holds pass in all scenes.
```

The log is the project's memory of what went wrong. It also shows the work honestly: most finished pieces take 2–4 rounds.
