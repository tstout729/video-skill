---
name: video
description: Make videos entirely in code - narrated explainers with animated diagrams (Manim), walkthroughs of a real app screen with a moving pointer for product demos and training (HTML + springs, rendered with Playwright and ffmpeg), and beat-synced UI motion loops. Writes the script, records an ElevenLabs voice, times every motion to the narrator's words, adds captions, and paces the motion by the classic principles of animation. Use when the user asks for an explainer video, animated diagram, product demo, app walkthrough, training or onboarding video, feature teaser, UI animation or motion design. Not for AI-generated footage (Sora, Veo, Runway) or for editing camera footage.
---

# Video

Every video here is drawn in code. The result is one MP4 (H.264, AAC at −16 LUFS) with a soft captions track, plus a sidecar `.srt`. `<skill>` is this skill's folder: the directory that contains this file.

## Before you start

1. **Check the machine** once: `bash <skill>/scripts/setup.sh`. It installs Playwright and Chromium into a private cache folder. It also checks ffmpeg, Node, uv, Manim and the ElevenLabs key. Fix anything marked ✗ before you render.
2. **Read the user's preferences**, if they exist: `VIDEO.md` in the current project, then `~/.config/video-skill/preferences.md`. The project file wins. Preferences can set the voice, languages, output folder, brand colors and fonts, delivery steps, and whether to make a video on their own initiative. They change defaults. They never relax the privacy and accuracy rules below.
3. **Pick a folder**: the one the user names, else `videos/<slug>/` in the current directory. In a git repository, add `media/`, `render/`, `qa/` and `out/` to `.gitignore`.

Make a video when the user asks for one, or when their preferences say to. Do not make one on your own initiative otherwise: narration costs the user ElevenLabs credits.

## Pick the kind

- **Explainer.** How a system, process or idea works: narrated diagrams in Manim, in the style of 3Blue1Brown, with every animation timed to the narrator's words. Build it with [Explainer (Manim)](#explainer-manim). Copy from `examples/explainer/`.
- **Walkthrough.** A real screen used step by step, with a pointer that clicks each control as the narrator names it. Use it for product demos, feature tours, training and onboarding. A step list on the left and the app on the right work well for training; a full-frame app works for demos. Build it with [UI motion (HTML)](#ui-motion-html). Copy from `examples/walkthrough/`.
- **Loop.** No voice. One shape morphs through 6–12 UI states and the last frame matches the first, for social posts and feature teasers. Each change lands on a beat, but not on every beat: change state about every 4–8 beats (2–4 s at 120 BPM), so each state holds long enough to read. Use the beats in between for the pointer's approach and small reactions. Build it with [UI motion (HTML)](#ui-motion-html). Copy from `examples/loop/`.

Pick the frame for where the video will play:

| Frame | Size | Use |
| --- | --- | --- |
| 16:9 | 1920x1080 | YouTube, docs, README, slides, training sites |
| 1:1 | 1080x1080 | LinkedIn and other feeds (fills more of a phone screen) |
| 4:5 | 1080x1350 | Instagram and LinkedIn feeds |
| 9:16 | 1080x1920 | Reels, Shorts, TikTok. Keep text inside the middle 80%, clear of app buttons |

Feeds autoplay without sound, so a feed video must make sense from its pictures and captions alone.

## Pace

Slow down. Agent-made animation is usually too fast and shows too much at once. Read [animation principles](animation-principles.md) before you plan, and review the draft against it. In short: one change at a time, each settled state held at least 1.5 s plus reading time, and more time for bigger moves.

## Shared steps

- **Research.** Read the real sources: the code, the docs, the data. Every number, name and example on screen, and every fact the narrator says, must be true. Use the product's real labels and a realistic example with sample data. Never show passwords, keys, access codes or personal data; mask a code as `• • • •`, and use made-up names.
- **Script.** Write `narration.json` (format below) in [plain writing](references/plain-writing.md): short sentences, one idea each, the same word for the same thing. Plan one visual per sentence. Narration runs about 130 words per minute. An explainer has 6–10 scenes of 15–30 seconds. A walkthrough opens with the situation, does the task step by step, and ends with a one-line recap.
- **Narrate.** `uv run --script <skill>/scripts/narrate.py <project>`. It records one unedited ElevenLabs take per scene, transcribes each take, and retries below a 0.93 match, because a take sometimes repeats or drops a phrase. Re-runs only record scenes whose text changed. The key comes from `ELEVENLABS_API_KEY` or a line `ELEVENLABS_API_KEY=...` in `~/.config/elevenlabs/env`. Never print it. Each take uses the user's ElevenLabs credits, so say roughly how much narration you will record.
- **Deliver.** Put the MP4 and `.srt` in the project's `out/` folder, or where the user's preferences say. Never overwrite an existing file. Report the path, the length and the voice, and anything you simplified. For a walkthrough, say that the screen is a redraw with sample data.

```json
{"title": "How a request finds a server", "voice_id": "JBFqnCBsd6RMkjVDRZzb", "model_id": "eleven_v4",
 "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
 "scenes": [{"id": "s01", "text": "You type an address and press Enter. ..."}]}
```

Optional fields: `language` (ISO 639-1, default `en`; it labels the caption track) and, for HTML videos, `timeline` (`{"gap": 1.0, "lead_in": 1.0, "tail": 2.0}` in seconds: the silence between, before and after scenes).

Voices: George (`JBFqnCBsd6RMkjVDRZzb`, a warm storyteller) is the default. Calm alternatives: Daniel `onwK4e9ZLuTAKqWW03F9`, Alice `Xb7hH8MSUJpSbSDYk0k2`. Any voice in the user's ElevenLabs library works; ask before using a cloned voice of a real person. Keep one voice per series. If the user's plan has no access to `eleven_v4`, set `model_id` to a model it has, such as `eleven_multilingual_v2`.

## Other languages

Make each language its own project: `<slug>` for the first language and `<slug>.<lang>` (for example `<slug>.es`) for each translation. You write the translation; no tool does it.

1. Translate `narration.json`. Keep the scene ids, set `"language"`, choose a native voice for that language, and say exactly what the original says. Copy any `timeline` block.
2. Record it with `narrate.py`.
3. Copy the animation (`video.py` or `index.html`) and translate every on-screen string. Keep an app's labels as the app shows them in that language; if the app is only in English, keep its labels in English so viewers recognize them.
4. Change every cue to the words the narrator now says at that moment. Cues ignore case, accents and punctuation, in any alphabet. Languages written without spaces (Chinese, Japanese, Thai) get one timing per phrase, so cue by phrase or by scene start.
5. Render and check it like the original. Translations often run 10–20% longer, so check that each state still holds long enough to read, and that longer text still fits its box.
6. Link shared pictures instead of copying them: `ln -s ../<slug>/assets <slug>.es/assets`.

## Explainer (Manim)

1. **Research, script and narrate** (shared steps).
2. **Animate.** Write `video.py`: one `Narrated` subclass per scene with `SCENE_ID`, using `self.play_at("cue words", ...)` so each animation starts as the narrator says those words, and `self.finish()` at the end. Use `kit` for the shared palette, font (Nunito Sans, bundled), cards, nodes and graphs. Follow [animation principles](animation-principles.md); in Manim that means:
   - Stage one idea at a time. Cue each element on its own words; do not fade in a title, cards and arrows with one `play_at`. Bring in a group with `LaggedStart(..., lag_ratio=0.15)`. Draw an arrow only after both of its ends are on screen.
   - Show change by moving or transforming what is already on screen, not by fading in a new picture. Moves follow an arc: put `path_arc=0.4` on the animation itself (`mob.animate(path_arc=0.4).move_to(...)` or `Transform(a, b, path_arc=0.4)`), not on `play_at`.
   - Keep `play_at`'s 1 s default for fades and small changes. Use `run_time=1.5` to `2` for moves across the frame and for transforms.
3. **Draft render and check.** Render at 480p, then build a contact sheet per scene and look at every one: overlaps, text off screen, arrows over labels, empty stretches, facts on screen that the narration contradicts, several things appearing at once, and states that change before they can be read.
4. **Final render and assemble.** Render at 1080p30, then run `assemble.py`. It pads narration to each scene, joins the scenes, normalizes loudness, and adds captions.
5. **Deliver** (shared steps).

```sh
export EXPLAINER_DIR="$PWD" PYTHONPATH="<skill>/scripts"
uv run -q --python 3.12 --with manim==0.21.0 manim -ql --disable_caching -a video.py      # draft, 480p15
mkdir -p qa && for f in media/videos/video/480p15/S*.mp4; do
  ffmpeg -v error -y -i "$f" -vf "fps=1/3,scale=427:240,tile=3x3" -frames:v 1 "qa/$(basename "$f" .mp4).png"; done
uv run -q --python 3.12 --with manim==0.21.0 manim --resolution 1920,1080 --frame_rate 30 --disable_caching -a video.py
uv run --script <skill>/scripts/assemble.py . --videos media/videos/video/1080p30 --out "out/<Title>.mp4"
```

Manim keeps the frame 8 units tall, so a 9:16 frame (`--resolution 1080,1920`) is only 4.5 units wide: lay it out vertically.

Gotchas:

- Avoid `MathTex`, `Tex`, `DecimalNumber` and `Integer` unless LaTeX is installed (`setup.sh` reports it). Count with a `ValueTracker` and an `always_redraw` `Text`.
- Cues search forward from the previous cue. Do not cue the same word twice for one moment; a hyphenated word ("eighty-nine") can be cued by either part.
- Draw lines behind cards with `kit.card(..., solid=True)` and `set_z_index`, or the lines cross the text.
- `path_arc` tilts text when the same animation also scales it. Move first and scale after, or move along a custom arc path.
- Manim's `add_sound` needs pydub, which does not work on Python 3.13+. Audio is added in `assemble.py` instead.
- Some ffmpeg builds have no `drawtext`; put all on-screen text in Manim.
- A 4-minute 1080p render takes a minute or two. Iterate on drafts freely.

## UI motion (HTML)

One HTML page draws every frame as a pure function of time (`window.seek(t)`). Playwright screenshots it, ffmpeg blends subframes for motion blur and joins the chunks, and `mux.py` adds the voice, UI sounds, an optional music bed and captions.

Look:

- One shape, no cuts. Each state is the same container changing size, corner radius and color while its content swaps with a quick blur (`swap`, `presence`).
- A pointer (or a touch dot for phone screens) triggers every change with real taps and drags.
- Springs throughout with only slight overshoot (`SPRING.*`, bounce at most about 0.14). Choose the spring by the size of the change: `snappy` only for presses and toggles, `smooth` for content swaps and short moves, `gentle` for layout changes, and `camera` (or slower) for zooms. The camera zooms so each state fills the frame, and moves only after the content has settled.
- A light, warm-gray canvas, the app's own colors, and one UI font (Geist is bundled in `assets/fonts`).
- Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, mixed icon stroke widths, dead time, anything that looks like a template. A hold on a settled state that the viewer is reading is not dead time.
- For a real product, redraw the real screen from its source code or screenshots: the same words, colors and layout. Read the component and copy its strings and hex colors. Use sample data and made-up names.

Pipeline:

1. **Research** (shared steps). Read the real screen's code or screenshots and the docs for the facts.
2. **Plan.** List the states and when each happens (word cues or beat numbers), and check the list against [animation principles](animation-principles.md). Show the plan to the user before animating if the request is open-ended. For a clear request, go ahead.
3. **Audio first.**
   - Walkthrough: write `narration.json` and run `narrate.py` (shared steps), then `uv run --script <skill>/scripts/timeline.py .`. This writes `audio/narration.wav` and `words.js` (global word times).
   - Loop with music: `uv run --script <skill>/scripts/beats.py track.mp3 --out beats.js`, then use `beat(n)` for every action. Start on `BEATS.first` (a downbeat). Use only a track the user has the right to use (their own, or royalty-free with a license that allows it).
   - Silent loop: no audio step. Define `window.BEATS = {bpm: 120, first: 0.5}` in the page and use `beat(n)` the same way.
4. **Build `index.html`.** Load `words.js` or `beats.js`, then `import {...} from "/_skill/runtime/motion.js"`. Build all tracks once at load, measure element positions with the camera at identity, then define `window.seek(t)` and finally `window.VIDEO = {width, height, duration, stills: [...]}`.
5. **Check stills.** `node <skill>/scripts/render.mjs index.html --stills qa/stills` renders `VIDEO.stills` (or `--every 0.5`, `--at 3,7.5`). Tile them (`ffmpeg -pattern_type glob -i 'qa/stills/*.jpg' -vf "scale=480:-2,tile=4x5" -frames:v 1 qa/stills.png`) and look at every one: clipping, overlaps, unreadable text, empty frames, anything off the cue.
6. **Draft.** `node <skill>/scripts/render.mjs index.html --out qa/draft.mp4 --fps 30 --sub 1 --scale 0.5` takes about 10 seconds per minute of video on a fast machine. Make 5 fps strips around each transition. Review the motion against [animation principles](animation-principles.md) and run its hold check.
7. **Final.** `node <skill>/scripts/render.mjs index.html --out render/video.mp4` (60 fps, 4 subframes; about 100 seconds per minute of 1080p). It also writes `render/video.sfx.json`.
8. **Mix.** `uv run --script <skill>/scripts/mux.py render/video.mp4 --out "out/<Title>.mp4" --narration audio/narration.wav --words words.js --sfx-dir sfx`. Add `--music track.mp3` for a bed that ducks under the voice. A silent loop needs only `--sfx-dir sfx`, or `--music`. The output is normalized to −16 LUFS, with soft captions and a sidecar `.srt` when there is narration.
9. **Deliver** (shared steps).

`motion.js` in brief:

- `track(v).to(t, value, spring)`: each change adds one closed-form spring, so values stay pure functions of time even when targets change mid-motion. Read a track with `x(t)`. `.set(t, v)` jumps. `.drag(t0, t1, fn)` follows the pointer directly; the next spring starts from the release point and carries its velocity.
- `swap(t, at)` gives `{out, in}` looks with separate exit and enter timing. `presence(t, on, off)` fades an element in and out. Apply looks with `style(el, look, css)`.
- `cue("phrase")` returns the time just before the narrator says the phrase. Cues search forward, like the explainer's `play_at`, and a missing cue throws.
- `pointer(x, y)`: `.tap(t, x, y, sound)`, `.drag(t0, t1, path)`, `.appear(t)`, `.hide(t)`. Taps declare sounds automatically.
- `sfx(t, kind)` declares a UI sound (`tap`, `key`, `toggle`, `whoosh`, `success`, `pop`; `sfx.py` synthesizes the kit, so there is nothing to license). `mux.py` places each sound's measured peak on its time.
- For a "liquid" indicator (tab, toggle, language pill), give each edge its own track: the leading edge gets a faster spring than the trailing edge.

Gotchas:

- Never put `will-change` on anything the camera scales, or text renders blurry.
- No CSS transitions, animations, timers or state carried between frames. The renderer splits time into chunks across several pages, so every frame must be computable on its own.
- `progress()` treats an infinite end as "never", so `presence(t, on, Infinity)` stays visible. Do not pass `NaN` to styles; a `NaN` opacity silently renders at full opacity.
- Pages load over the renderer's local server, because ES modules do not load from `file://`. `node <skill>/scripts/render.mjs index.html --serve` serves the page for a browser preview; add `?t=12.5` to see one moment.
- Put the camera inside a clipped stage when there is a side panel, and keep the zoomed focus inside a phone's edges, or a zoom shows the canvas past the screen's edge.
- For a seamless loop, the last frame must match the first, including the pointer's position and speed. Leave about 1.5 seconds after the final morph for springs to settle.
- Playwright is loaded only from `$PLAYWRIGHT_DIR`, the skill's cache folder (`setup.sh` installs it there), or the global npm root, never from the current folder. Where Playwright cannot download its browser (some cloud sandboxes), set `CHROMIUM_PATH` to an installed Chromium. `RENDER_WORKERS` limits the parallel pages on a busy machine.
- Motion blur covers 40% of each frame interval (`--shutter 0.4`). A full shutter ghosts text into doubled copies during fast camera moves.
