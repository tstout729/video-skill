# Walkthrough example: Invite a teammate

A 48-second narrated training video for Acme, a made-up team app. It shows how to invite a teammate:

1. Open Settings, then Members.
2. Click Invite.
3. Type their email.
4. Choose a role.
5. Send the invite, and see it in the list, marked Pending.

It ends on a three-point recap. The app is a redraw with sample data. Every name and email address is made up.

Copy this folder to start your own walkthrough. The comment at the top of `index.html` lists the timing constants and each key state with its cue word.

## What to copy from it

- **Timing from the voice.** Every change starts on a narrator's word with `cue("word")`. Guards such as `Math.max(cue("Type"), cardSettled)` stop a move from starting before the last one has settled.
- **Springs by the size of the change.** `snappy` for presses and the leading edge of a sliding pill, `smooth` for its trailing edge, `gentle` for the invite card, a slower `MORPH` for the window, and `camera` for zooms.
- **`swap` and `presence`.** Pages, tabs and the role description swap with a short blur. The step list, rows and recap points stagger in at 70 ms.
- **A pointer that flies on an arc, then presses.** Its longer axis moves on a faster spring than its shorter axis, so the path curves. Each tap declares a UI sound.
- **A camera that waits.** It zooms only after the content it frames has settled. It lives inside the clipped app window, so a zoom never shows the canvas.
- **One shape.** The intro card morphs into the app window, and the window morphs into the recap card. Inside the app, the Invite button grows into the invite card, and the card flies into the list as the new row. A shape keeps its content while it changes: the button stays ink with its label until it has mostly grown, then turns white in about 0.15 s as the card's title arrives. No frame shows an empty gray box.
- **Review stills.** `window.VIDEO.stills` lists eleven settled states for a contact sheet.

## Files

| File | What it is |
| --- | --- |
| `narration.json` | The script: six short scenes, George voice |
| `audio/s01.mp3` ... `s06.mp3`, `audio/timings.json` | The recorded takes and their word times. They are committed, so you can render without an ElevenLabs key |
| `index.html` | The animation. Every frame is a pure function of time |
| `words.js`, `audio/narration.wav` | Written by `timeline.py` from the takes |

## Render it

You do not need an ElevenLabs API key. Run these commands from the repository root:

```sh
bash skills/video/scripts/setup.sh
cd skills/video/examples/walkthrough
uv run --script ../../scripts/timeline.py .
node ../../scripts/render.mjs index.html --out render/video.mp4
uv run --script ../../scripts/mux.py render/video.mp4 --out "out/Invite a teammate.mp4" --narration audio/narration.wav --words words.js --sfx-dir render/sfx
```

1. `setup.sh` installs Playwright and Chromium once. It warns that there is no ElevenLabs key; that is fine here.
2. `timeline.py` joins the six takes into `audio/narration.wav` and writes `words.js`.
3. `render.mjs` renders 1920x1080 at 60 fps with motion blur. It takes a few minutes. On a busy machine, set `RENDER_WORKERS=2`.
4. `mux.py` adds the voice, the UI sounds and captions. You get `out/Invite a teammate.mp4` and `out/Invite a teammate.srt`.

To look at the review stills first, run `node ../../scripts/render.mjs index.html --stills qa/stills`. To preview one moment in a browser, run `node ../../scripts/render.mjs index.html --serve` and add `?t=20` to the address.

## Change the script

1. Edit `narration.json`.
2. Run `uv run --script ../../scripts/narrate.py .`. It needs an ElevenLabs key, and it records only the scenes whose text changed. Without a key, add `--scratch` for a free draft in your computer's voice ([scratch voice](../../references/scratch-voice.md)).
3. If you changed a word that `index.html` cues on, change that cue too.
4. Run the three commands after `setup.sh` again.
