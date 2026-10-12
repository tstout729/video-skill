"""The scratch voice makes a full draft with no key. Run: uv run --with numpy --with requests python3 tests/test_scratch_voice.py

- align() finds word edges inside a phrase and across pauses, measured on audio with known edges.
- narrate.py --scratch writes the same files a real take does, with "scratch": true.
- A scratch run keeps real takes; a real run replaces scratch takes, even when the text is unchanged.
- timeline.py marks the draft, and mux.py and assemble.py warn while a scratch take is in use.
Needs a speech engine: `say` on macOS, espeak-ng or espeak on Linux. SCRATCH_ENGINE=espeak-ng
picks one (for example, to test the Linux engine on a Mac with espeak-ng installed).
"""

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SCRIPTS = Path(__file__).resolve().parents[1] / "skills/video/scripts"
sys.path.insert(0, str(SCRIPTS))
import narrate  # noqa: E402
import scratch_voice  # noqa: E402

SR = scratch_voice.SR
SCENES = [{"id": "s01", "text": "Every frame is drawn in code. Then the voice is added, word by word."},
          {"id": "s02", "text": "This take is a draft — and it is free."}]


def run(*cmd: str, cwd: Path | None = None) -> subprocess.CompletedProcess:
    done = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    assert done.returncode == 0, f"{' '.join(cmd)}\n{done.stdout}\n{done.stderr}"
    return done


def script(name: str, *args: str) -> subprocess.CompletedProcess:
    if name == "narrate.py" and os.environ.get("SCRATCH_ENGINE"):
        args += ("--scratch-engine", os.environ["SCRATCH_ENGINE"])
    return run("uv", "run", "-q", "--script", str(SCRIPTS / name), *args)


def tone(freq: float, seconds: float) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    return sum(np.sin(2 * np.pi * freq * k * t) / k for k in (1, 2, 3)).astype(np.float32) * 0.3


def test_align_finds_word_edges() -> None:
    # Six "words", each its own timbre. The take runs them together at its own pace, with one
    # pause; the reference reads them slower, apart. align() must recover the take's edges.
    freqs = [220, 330, 495, 740, 1110, 1660]
    take_len = [0.22, 0.35, 0.18, 0.41, 0.27, 0.30]
    pause_after = 2  # silence after the third word, as at a comma
    take, starts = [np.zeros(int(0.05 * SR), np.float32)], []
    for k, (f, d) in enumerate(zip(freqs, take_len)):
        starts.append(sum(map(len, take)) / SR)
        take.append(tone(f, d))
        if k == pause_after:
            take.append(np.zeros(int(0.25 * SR), np.float32))
    apart = []
    for f, d in zip(freqs, take_len):
        apart += [tone(f, d * 1.4 + 0.05), np.zeros(int(0.3 * SR), np.float32)]
    words = scratch_voice.align(np.concatenate(take), np.concatenate(apart), "a b c, — d e f.".split())
    assert [w["word"] for w in words] == ["a", "b", "c,", "—", "d", "e", "f."], words
    spoken = [w for w in words if w["word"] != "—"]
    errors = [abs(w["start"] - s) for w, s in zip(spoken, starts)]
    assert max(errors) <= 0.03, (errors, words)
    assert words[3]["start"] == words[3]["end"] == words[2]["end"], words  # a dash takes no time


def speech_onsets(mp3: Path) -> list[float]:
    """Times where sound resumes after at least 150 ms of silence, and the first sound."""
    sound, _ = scratch_voice.analyze(scratch_voice.decode(mp3))
    on = np.flatnonzero(np.diff(np.r_[0, sound.astype(np.int8)]) == 1)
    off = np.flatnonzero(np.diff(np.r_[sound.astype(np.int8), 0]) == -1)
    keep = [on[0]] + [o for o in on[1:] if o - off[off < o].max() > 15]
    return [(f * scratch_voice.HOP + scratch_voice.WIN / 2) / SR for f in keep]


def test_scratch_pipeline() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        project = Path(tmp)
        cfg = {"title": "Scratch", "voice_id": "JBFqnCBsd6RMkjVDRZzb", "model_id": "eleven_v4", "scenes": SCENES}
        (project / "narration.json").write_text(json.dumps(cfg))
        out = script("narrate.py", str(project), "--scratch").stdout
        assert "scratch take" in out and "scratch takes: s01, s02" in out, out

        # The same files and shape as a real take, marked as scratch.
        timings = json.loads((project / "audio/timings.json").read_text())
        for scene in SCENES:
            entry, mp3 = timings[scene["id"]], project / "audio" / f"{scene['id']}.mp3"
            assert entry["scratch"] is True and mp3.exists(), entry
            assert abs(entry["duration"] - narrate.duration(mp3)) < 0.01, entry
            words = entry["words"]
            assert [w["word"] for w in words] == scene["text"].split(), words
            assert all(0 <= w["start"] <= w["end"] <= entry["duration"] for w in words), words
            assert all(a["end"] <= b["start"] for a, b in zip(words, words[1:])), words
        # Word starts sit on the sound: the first word and the sentence after a full stop start
        # where the speech starts, within two frames at 30 fps.
        words = timings["s01"]["words"]
        onsets = speech_onsets(project / "audio/s01.mp3")
        then = next(w for w in words if w["word"] == "Then")
        assert abs(words[0]["start"] - onsets[0]) < 0.067, (words[0], onsets)
        assert min(abs(then["start"] - t) for t in onsets) < 0.067, (then, onsets)

        # A second run records nothing. A real take of the current text is never replaced.
        assert script("narrate.py", str(project), "--scratch").stdout.count("unchanged (scratch)") == 2
        text = SCENES[1]["text"]
        real = {"digest": narrate.hashlib.sha256(f"{cfg['voice_id']}|{cfg['model_id']}|{text}".encode()).hexdigest()[:16],
                "duration": timings["s02"]["duration"], "match": 1.0, "words": timings["s02"]["words"]}
        timings["s02"] = real
        (project / "audio/timings.json").write_text(json.dumps(timings))
        out = script("narrate.py", str(project), "--scratch", "--force").stdout
        assert "s02: real take kept" in out and "s01: scratch take" in out, out
        # A real run replaces a scratch take even when its text is unchanged; it keeps the real one.
        s01 = project / "audio/s01.mp3"
        digest = narrate.hashlib.sha256(f"{cfg['voice_id']}|{cfg['model_id']}|{SCENES[0]['text']}".encode()).hexdigest()[:16]
        assert not narrate.has_real_take({**timings["s01"], "digest": digest}, digest, s01)
        assert narrate.has_real_take(real, real["digest"], project / "audio/s02.mp3")

        # timeline.py marks the draft; mux.py warns while a scratch take is in it.
        script("timeline.py", str(project))
        assert re.search(r'window\.NARRATION = \{duration: [\d.]+, scratch: \["s01"\]\};', (project / "words.js").read_text())
        video = project / "video.mp4"
        run("ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:r=30", "-t", "3",
            "-pix_fmt", "yuv420p", "-c:v", "libx264", str(video))
        mux = ["mux.py", str(video), "--out", str(project / "out/draft.mp4"),
               "--narration", str(project / "audio/narration.wav"), "--words", str(project / "words.js")]
        assert "SCRATCH NARRATION in s01" in script(*mux).stderr
        # assemble.py (explainers) warns too.
        videos = project / "scenes"
        videos.mkdir()
        for scene in SCENES:
            run("ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:r=15", "-t", "2",
                "-pix_fmt", "yuv420p", "-c:v", "libx264", str(videos / f"{scene['id'].upper()}.mp4"))
        assembled = script("assemble.py", str(project), "--videos", str(videos), "--out", str(project / "out/x.mp4"))
        assert "SCRATCH NARRATION in s01" in assembled.stderr, assembled.stderr

        # With every take real, nothing is marked and nothing warns.
        timings["s01"].pop("scratch")
        (project / "audio/timings.json").write_text(json.dumps(timings))
        script("timeline.py", str(project))
        assert "scratch" not in (project / "words.js").read_text()
        assert "SCRATCH" not in script(*mux).stderr


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
