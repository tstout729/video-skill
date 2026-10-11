# Explainer example: What happens when you open a website

A narrated explainer of about 50 seconds, drawn in Manim at 1920x1080. It is the reference for the skill's explainer pipeline: copy this folder to start a new one.

It shows four steps, one per scene:

1. You type a web address, `example.com`, and press Enter.
2. The browser asks DNS, the internet's phone book, for the server's IP address. The name flies to DNS, and the IP address flies back.
3. A request carries that IP address across the internet to the server. The server sends back the page along the same route.
4. The browser draws the page. A recap then lists the four steps, each one leaving its part of the diagram.

The names and numbers are reserved for examples: `example.com`, `example.org` and `example.net` (RFC 2606), and IP addresses from the documentation ranges (RFC 5737).

## Files

- `narration.json`: the script, one entry per scene, with the voice (George, `eleven_v4`).
- `audio/`: the recorded takes (`s01.mp3` to `s04.mp3`) and `timings.json`, the time of every word. They are committed, so you can render without an ElevenLabs key.
- `video.py`: the animation. Each scene is a `Narrated` class, and each `play_at("words", ...)` starts as the narrator says those words. The comments point out the patterns worth copying.

## Render it

You need ffmpeg and uv. You do not need an ElevenLabs key. Run these from the repository root:

```sh
bash skills/video/scripts/setup.sh --check
cd skills/video/examples/explainer
export EXPLAINER_DIR="$PWD" PYTHONPATH="$PWD/../../scripts"
uv run -q --python 3.12 --with manim==0.21.0 manim --resolution 1920,1080 --frame_rate 30 --disable_caching -a video.py
uv run --script ../../scripts/assemble.py . --videos media/videos/video/1080p30 --out "out/What happens when you open a website.mp4"
```

The result is `out/What happens when you open a website.mp4` (about 50 seconds) and the captions file `out/What happens when you open a website.srt`. If `setup.sh --check` reports only that Playwright is missing, you can still render this example; Playwright is for the HTML videos.

For a quick draft at 480p, use `-ql` in place of `--resolution 1920,1080 --frame_rate 30`. The scenes are then in `media/videos/video/480p15`.

## Change it

If you change the words in `narration.json`, record the changed scenes again. This needs an ElevenLabs key and uses a little credit:

```sh
uv run --script ../../scripts/narrate.py .
```

Then check that every cue in `video.py` still matches a word the narrator says, and render again.
