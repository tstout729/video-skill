# Loop example: checkout

A silent UI motion loop, 1080x1080 and 16 seconds, that repeats without a seam. One shape morphs through a card payment:

1. A **Pay $48.00** button grows into a card sheet.
2. The sheet folds into a processing ring.
3. The ring closes and fills with a green check.
4. The check rises, and the shape opens into a receipt.
5. **Done** shrinks the receipt back into the Pay button.

A pointer taps each step. The UI sounds (taps, a success chime and one soft whoosh) are synthesized, so there is nothing to license. The last frame matches the first, including the pointer, so the video plays as a seamless loop. "Acme Coffee" and the card are sample data.

The beat plan is the comment at the top of `index.html`. Every change is placed with `beat(n)` at 120 BPM.

## Render it

Run these from the repository root. You do not need an API key: there is no narration, and the sounds are generated.

```sh
bash skills/video/scripts/setup.sh    # once: installs Playwright and Chromium
cd skills/video/examples/loop
node ../../scripts/render.mjs index.html --stills qa/stills     # optional: key frames to check
node ../../scripts/render.mjs index.html --out render/video.mp4
uv run --script ../../scripts/mux.py render/video.mp4 --out "out/Checkout loop.mp4" --sfx-dir sfx
```

The render takes under a minute on a fast machine. It writes `render/video.mp4` and `render/video.sfx.json`, which lists the sounds that the page declared. `mux.py` writes the sound kit into `sfx/` the first time it runs, places each sound on its time, and writes `out/Checkout loop.mp4`.

To preview one moment in a browser, run `node ../../scripts/render.mjs index.html --serve` and open the printed address with `?t=7.5` added.

## Check the seam

The page should draw the same picture at 0 s, at the last frame (15.983 s) and at 16 s:

```sh
node ../../scripts/render.mjs index.html --stills qa/seam --at 0,15.9833,16
cmp qa/seam/t0000.00.jpg qa/seam/t0015.98.jpg && cmp qa/seam/t0000.00.jpg qa/seam/t0016.00.jpg && echo identical
```

Compare the page's own frames, as above, not frames decoded from the MP4. The first frame of an MP4 is compressed differently from the last one, so decoded frames differ slightly even when the picture is the same.

To see the loop point in motion, play the video twice in a row:

```sh
ffmpeg -v error -y -stream_loop 1 -i "out/Checkout loop.mp4" -c copy qa/twice.mp4
```

## Make your own

- Change `SIZE` for each state's size and corner radius. Each state's content is a `.layer`, laid out at that state's final size.
- Change the timeline section, in time order. Start each change on `beat(n)`. Give every settled state at least 1.5 seconds, plus about a third of a second for each new word.
- Keep the first and last states the same, put the pointer back where it started, and let everything settle about 1.5 seconds before the end.
