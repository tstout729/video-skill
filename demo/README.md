# Showcase video

This is the video at the top of the repository's README and in the launch post. It is a 74-second, 1080x1080 square for social feeds. The George voice (ElevenLabs) narrates it, and it has captions. Every point is also clear with the sound off.

What it shows:

1. **Before and after.** The same small UI sequence plays twice. First it plays the way agents usually animate: every change inside one second, with the camera moving during the swaps. Then it plays staged, one change at a time, and each step holds.
2. **The pipeline.** Someone types a request to a coding agent. The request flows into Script, Voice, Animate, Check and Render.
3. **Three kinds of video.** An explainer draws a diagram. In a walkthrough, a pointer clicks a button. In a loop, one shape morphs through three states.
4. **Principles and the self-check.** Four principle names appear. Then a check marks every frame and measures every pause.
5. **Captions and the end card.** A caption switches from English to Spanish. The end card shows the name, the license, the link and the install line.

`index.html` times every motion to the narrator's words with `cue()`. The app screens are redrawn with made-up names and sample data.

## Render it

You do not need an ElevenLabs key. The recorded narration (`audio/*.mp3` and `audio/timings.json`) is in the repository. Run these commands from the repository root:

```sh
bash skills/video/scripts/setup.sh
uv run --script skills/video/scripts/timeline.py demo
node skills/video/scripts/render.mjs demo/index.html --out demo/render/video.mp4
uv run --script skills/video/scripts/mux.py demo/render/video.mp4 --out demo/out/demo.mp4 --narration demo/audio/narration.wav --words demo/words.js --sfx-dir demo/sfx
```

1. `setup.sh` installs Playwright and Chromium into a cache folder. It also checks ffmpeg, Node and uv. If you have no ElevenLabs key, it warns about that. You can ignore the warning.
2. `timeline.py` joins the six recorded takes into `audio/narration.wav`. It also writes `words.js`, the word times that the page uses.
3. `render.mjs` renders the page at 60 fps with motion blur. On a fast machine, this takes about 2 to 5 minutes.
4. `mux.py` adds the voice and the UI sounds, and sets the loudness to −16 LUFS. It writes `out/demo.mp4` with a soft captions track, and `out/demo.srt`.

To save a poster frame from the end card, run `ffmpeg -ss 72 -i demo/out/demo.mp4 -frames:v 1 -q:v 2 demo/out/poster.jpg`.

To preview one moment in a browser, run `node skills/video/scripts/render.mjs demo/index.html --serve`. Then open the address it prints with `?t=40` added to the end.

To change the words, edit `narration.json`. Then run `uv run --script skills/video/scripts/narrate.py demo` with your own key. It records only the scenes whose text changed. After that, run the four steps again. Check each cue in `index.html` against the new words.
