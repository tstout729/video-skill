# Scratch voice

`narrate.py --scratch` reads each scene in the computer's own voice instead of ElevenLabs. It needs no key and no credits. It writes the same files a real take writes, with word timings, so every later step works unchanged: `timeline.py`, the page's `cue()`, Manim's `play_at`, captions, `mux.py` and `assemble.py`.

Use it for two jobs:

- **Iterate on timing for free.** Write the script, animate against the scratch take, and review drafts as often as you like. Record the real voice once, when the script and the timing are settled. Only then does narration cost credits.
- **Make a full draft without a key.** Someone who has no ElevenLabs account can still go from a request to a narrated MP4 with captions. Test runs often have no keys at all: the [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills) list tests every skill on a machine with no API keys for voice models.

The scratch voice sounds robotic. It is for drafts only; never deliver a video that still uses it.

## Use it

```sh
uv run --script <skill>/scripts/narrate.py <project> --scratch
uv run --script <skill>/scripts/timeline.py <project>          # HTML videos, as usual
```

| Option | Default | What it does |
| --- | --- | --- |
| `--scratch-voice NAME` | By language (below) | A `say` voice (`say -v '?'` lists them) or an espeak voice (`espeak-ng --voices`) |
| `--scratch-rate WPM` | 150 | Words per minute. 150 is close to the real voices' pace (below) |
| `--scratch-engine` | `say` on macOS, else `espeak-ng`, else `espeak` | Picks another engine that is installed |

`--only` and `--force` work as they do for real takes.

## Engines

| Computer | Engine | Default voice |
| --- | --- | --- |
| macOS | `say`, built in | Samantha for English; Mónica (es), Thomas (fr), Anna (de), Alice (it), Luciana (pt), Kyoko (ja), Tingting (zh), Yuna (ko) when installed; otherwise the first voice for the scene's `language` |
| Linux | `espeak-ng`, or the older `espeak` (`sudo apt-get install espeak-ng`) | `en-us` for English; otherwise the `language` code |

When neither is installed, `narrate.py --scratch` stops with a message that names both. `setup.sh` reports which one it found.

## What it writes

`audio/<id>.mp3` (44.1 kHz mono MP3, like a real take) and an entry in `audio/timings.json`:

```json
"s01": {"digest": "370f80fea99a7610", "duration": 4.58, "scratch": true,
        "voice": "say Samantha, 150 wpm",
        "words": [{"word": "Every", "start": 0.012, "end": 0.332}, ...]}
```

It has the same `duration` and `words` as a real take. `"scratch": true` marks it, and `voice` names the engine. There is no `match`, because nothing is transcribed.

## Scratch takes and real takes

- `--scratch` records each scene that has no take, or whose text changed. It never replaces a real take of the current text, even with `--force`, so it never throws away audio that cost credits. A project can mix real and scratch takes.
- `narrate.py` without `--scratch` replaces every scratch take, even when the text is unchanged.
- `timeline.py` lists the scenes still in the scratch voice: in `words.js` (`window.NARRATION.scratch`) and in the comment tag of `audio/narration.wav`.
- `mux.py` and `assemble.py` end with a large warning that names those scenes and says how to record the real voice. They still write the MP4, because a draft is a useful thing to watch.

When the real take arrives, run `narrate.py`, then `timeline.py` and render again (HTML), or render the Manim scenes again (explainers). Cues follow their words, so no cue needs to change. Holds do change, so run `review.mjs holds` on the new render.

## How the word times are found

The word times come from a forced alignment, not an estimate:

1. The engine reads the scene twice. One reading is the take. In the second reading, every word is followed by 300 ms of silence, so each word's sound sits on its own and its edges are exact.
2. Both readings become 10 ms frames of log-mel spectra. Frames of silence are left out.
3. Dynamic time warping finds the cheapest path that pairs the frames of the word-by-word reading with the frames of the take. Each word's first and last frame then map onto the take.
4. Warping can slip a frame or two across a pause, which would move a word by the whole pause. When a word has only a sliver of itself on the far side of a pause, it starts after the pause or ends before it.

A token with no letters or digits, such as a lone `—`, takes no time: it starts and ends where the word before it ends. If two words ever run together in the word-by-word reading, their sound is shared by letter count. The code is `scripts/scratch_voice.py`; it uses only numpy and ffmpeg.

### Accuracy

The engines report their own word positions (`say` through AVSpeechSynthesizer's markers, which produce the same audio, and espeak-ng through its library's word events). Measured against those positions, on all 16 narrated scenes in the repository (the demo, the walkthrough and the explainer):

| Engine | Words | Median error | 90% within | Largest |
| --- | --- | --- | --- | --- |
| `say` Samantha, 150 wpm | 346 | 25 ms | 51 ms | 96 ms |
| `espeak-ng` en-us, 150 wpm | 342 | 11 ms | 44 ms | 62 ms |

At 30 fps a frame is 33 ms, so a cue lands within one or two frames of its word. The test `tests/test_scratch_voice.py` checks the alignment on audio whose word edges are known exactly.

## How close it is to the real take

The scratch voice reads at its own pace, so each cue moves when the real voice replaces it. Comparing the 67 cues in those three videos with their ElevenLabs takes, measured from the start of each scene:

| Engine | Median shift | 90% within | Largest | Total length |
| --- | --- | --- | --- | --- |
| `say` Samantha, 150 wpm | 0.33 s | 0.83 s | 1.29 s | 5% shorter |
| `espeak-ng` en-us, 150 wpm | 0.16 s | 0.49 s | 0.65 s | 1% longer |

Across a whole HTML video the shifts add up. In the walkthrough, `say` reads 34.5 s of narration where the real take reads 37.9 s, so its last cue comes 3.3 s earlier. This is not an error to fix. Each cue still lands on its word, and only the holds between cues change.

Samantha's rate moves in steps: everything from 110 to 150 wpm sounds the same, and 100 wpm is about 9% slower. espeak's rate changes smoothly. If the real voice is much slower than the scratch voice, lower `--scratch-rate` so the holds in the draft are closer to the final ones.

## Limits

- `say` treats `[[...]]` in the script as a speech command. Avoid double square brackets in narration.
- Languages written without spaces (Chinese, Japanese, Thai) get one timing per phrase, as they do with real takes. Cue by phrase or by scene start.
- The scratch voice's pronunciation of names and numbers can differ from ElevenLabs'. Check the real take as usual.
