"""The audio rules hold, measured rather than heard. Run: uv run --with numpy python3 tests/test_audio.py

- The beat grid is computed from time, so it never drifts off the frames.
- The bed's kicks land on its downbeats, and the bed is mixed for phones.
- mux.py puts each sound's peak one frame after its picture.
- check_sync.py flags a sound that lands before its picture.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SCRIPTS = Path(__file__).resolve().parents[1] / "skills/video/scripts"
sys.path.insert(0, str(SCRIPTS))
import bed  # noqa: E402
import check_sync  # noqa: E402
import mux  # noqa: E402
import sfx  # noqa: E402

SR = 48000


def test_beat_grid_does_not_drift() -> None:
    bpm, fps, first = 113.0, 24, 0.5
    beats = bed.beat_grid(bpm, first, 64)
    for n, t in enumerate(beats):
        exact = first + n * 60 / bpm
        assert abs(t - exact) < 1e-9, (n, t, exact)
        frame = round(t * fps)
        assert abs(frame / fps - exact) <= 0.5 / fps + 1e-9, (n, frame, exact)
    # The trap: adding a rounded 13 frames per beat (really 12.74) is 16 frames off by beat 64.
    step = round(fps * 60 / bpm)
    drift = max(abs((round(first * fps) + n * step) / fps - (first + n * 60 / bpm)) for n in range(64))
    assert drift > 10 / fps, drift


def test_beats_js_agrees_with_motion_beat() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "beats.js"
        bed.write_beats(path, bed.beats_of(113.0, 16, 0.5, loop=False), "test")
        data = json.loads(re.search(r"window\.BEATS = (\{.*\});", path.read_text()).group(1))
    assert len(data["beats"]) == 64 and data["downbeats"] == data["beats"][::4]
    for n, t in enumerate(data["beats"]):  # motion.js: beat(n) = first + n * 60 / bpm
        assert abs(t - (data["first"] + n * 60 / data["bpm"])) < 1e-4, (n, t)
    loop = bed.beats_of(120.0, 8, 0.5, loop=True)  # beats past the loop point wrap before `first`
    assert loop["beats"][-1] == 15.5 and len(loop["beats"]) == 31


def test_bed_kicks_land_on_downbeats_and_suit_phones() -> None:
    bpm, first = 113.0, 0.25
    x = bed.render(bpm, bars=2, mood="drive", seed=3, first=first)
    assert abs(bed.lufs(x) - -14.0) < 0.3, bed.lufs(x)
    assert 20 * np.log10(bed.peak_envelope(x).max()) <= bed.CEILING + 0.05
    assert bed.low_share(x) < 0.05, bed.low_share(x)
    mono, kick = x.mean(axis=1), bed.kick("drive")[: int(0.08 * SR)]
    for t in bed.beat_grid(bpm, first, 8)[::4]:  # downbeats of both bars
        lo = round(t * SR) - int(0.01 * SR)
        seg = mono[lo:lo + int(0.02 * SR) + len(kick)]
        corr = np.correlate(seg, kick, mode="valid")
        energy = np.sqrt(np.convolve(seg ** 2, np.ones(len(kick)), mode="valid"))
        at = (lo + int(np.argmax(corr / (energy + 1e-12)))) / SR
        assert abs(at - t) < 0.002, (t, at)
    loop = bed.render(bpm, bars=1, mood="calm", loop=True, first=first)
    assert abs(len(loop) - 4 * 60 / bpm * SR) <= 1, len(loop)


def test_anthem_stops_before_the_drop_and_lands_on_it() -> None:
    bpm, first = 124.0, 0.0
    spb = 60 / bpm
    sections = bed.parse_sections("intro:1,build:1,drop:2,break:1,end:1.5")
    x = bed.render_anthem(bpm, "E", sections, seed=3, first=first)
    assert abs(len(x) - 6.5 * 4 * spb * SR) <= 1, len(x)   # the end's half bar sets the length
    assert abs(bed.lufs(x) - -14.0) < 0.3, bed.lufs(x)
    assert 20 * np.log10(bed.peak_envelope(x).max()) <= bed.CEILING + 0.05
    assert bed.low_share(x) < 0.05, bed.low_share(x)
    mono = x.mean(axis=1)
    rms = lambda a, z: 20 * np.log10(np.sqrt(np.mean(mono[round(a * SR):round(z * SR)] ** 2)) + 1e-12)
    # The build's last beat (bar 1, beat 3) is a stop: only the reverb's tail is left.
    stop, drop = (4 + 3) * spb, 8 * spb
    assert rms(stop + 0.02, drop - 0.01) < rms(drop, drop + spb) - 30, (rms(stop + 0.02, drop - 0.01), rms(drop, drop + spb))
    # The drop's kicks land on the grid; the break has none, so it sits under the drop.
    kick = bed.kick("drive")[: int(0.08 * SR)]
    for t in bed.beat_grid(bpm, first, 32)[9:16:2]:   # beats 1 and 3 of the drop's first two bars, past the impact
        lo = round(t * SR) - int(0.01 * SR)
        seg = mono[lo:lo + int(0.02 * SR) + len(kick)]
        corr = np.correlate(seg, kick, mode="valid")
        energy = np.sqrt(np.convolve(seg ** 2, np.ones(len(kick)), mode="valid"))
        at = (lo + int(np.argmax(corr / (energy + 1e-12)))) / SR
        assert abs(at - t) < 0.002, (t, at)
    assert rms(16 * spb, 20 * spb) < rms(8 * spb, 16 * spb) - 2, (rms(16 * spb, 20 * spb), rms(8 * spb, 16 * spb))
    for bad in ("drop:2.5", "end:1,drop:2", "verse:4"):
        try:
            bed.parse_sections(bad)
        except SystemExit:
            continue
        raise AssertionError(f"--sections {bad} should be refused")


def test_mux_puts_each_peak_one_frame_late() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        kit = Path(tmp)
        sfx.write(kit / "tap.wav", sfx.kit()["tap"])
        track = mux.sfx_track([{"t": 0.5, "kind": "tap", "gain": 1}], kit, 1.0, 0.0, lag=1 / 30)
        assert int(np.argmax(np.abs(track))) == round((0.5 + 1 / 30) * SR)
        wrapped = mux.sfx_track([{"t": 0.99, "kind": "tap", "gain": 1}], kit, 1.0, 0.0, lag=1 / 30, loop=True)
        assert int(np.argmax(np.abs(wrapped))) == round((0.99 + 1 / 30 - 1.0) * SR)  # past the end -> start


def make_video(folder: Path, audio: np.ndarray, events: list[dict]) -> Path:
    """A 2 s, 30 fps test clip with the given mono audio, and its .sfx.json."""
    wav, out = folder / "audio.wav", folder / "video.mp4"
    mux.write_wav(wav, audio)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=64x64:r=30:d=2",
                    "-i", str(wav), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-shortest", str(out)], check=True)
    (folder / "video.sfx.json").write_text(json.dumps(events))
    return out


def test_check_sync_flags_an_early_sound() -> None:
    tap = sfx.kit()["tap"]
    peak = int(np.argmax(np.abs(tap)))
    audio = 0.002 * np.random.default_rng(1).standard_normal(2 * SR)
    events = [{"t": 0.5, "kind": "tap", "gain": 1}, {"t": 1.0, "kind": "tap", "gain": 1},
              {"t": 1.5, "kind": "tap", "gain": 1}]
    for t, lag in ((0.5, 1 / 30), (1.0, -0.020), (1.5, 0.100)):  # one frame late, 20 ms early, 100 ms late
        start = round((t + lag) * SR) - peak
        audio[start:start + len(tap)] += 0.5 * tap
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        (folder / "sfx").mkdir()
        sfx.write(folder / "sfx/tap.wav", tap)
        video = make_video(folder, audio, events)
        rows = check_sync.check(check_sync.decode(video), events, 30.0, sfx_dir=folder / "sfx")
        assert [r["status"] for r in rows] == ["OK", "EARLY", "LATE"], rows
        assert abs(rows[0]["frames"] - 1) < 0.05 and abs(rows[1]["offset"] + 0.020) < 0.001, rows
        cli = subprocess.run([sys.executable, str(SCRIPTS / "check_sync.py"), str(video), "--sfx-dir",
                              str(folder / "sfx")], capture_output=True, text=True, check=False)
        assert cli.returncode == 1 and "EARLY" in cli.stdout, cli.stdout + cli.stderr


def test_mux_social_mix_passes_check_sync() -> None:
    events = [{"t": 0.5, "kind": "tap", "gain": 1}, {"t": 1.25, "kind": "pop", "gain": 1}]
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        (folder / "render").mkdir()
        video = make_video(folder / "render", np.zeros(2 * SR), events)
        music = folder / "bed.wav"
        bed.write_wav(music, bed.render(120.0, bars=1, mood="calm", loop=True, first=0.0))
        out = folder / "out.mp4"
        subprocess.run([sys.executable, str(SCRIPTS / "mux.py"), str(video), "--out", str(out), "--sfx-dir",
                        str(folder / "sfx"), "--music", str(music), "--social", "--loop"],
                       check=True, capture_output=True)
        cli = subprocess.run([sys.executable, str(SCRIPTS / "check_sync.py"), str(out), "--sfx",
                              str(folder / "render/video.sfx.json"), "--sfx-dir", str(folder / "sfx")],
                             capture_output=True, text=True, check=False)
        assert cli.returncode == 0, cli.stdout + cli.stderr
        assert len(re.findall(r" OK$", cli.stdout, re.MULTILINE)) == 2, cli.stdout
        lufs = float(re.search(r"loudness\s+(-?[\d.]+) LUFS", cli.stdout).group(1))
        peak = float(re.search(r"true peak\s+(-?[\d.]+) dBTP", cli.stdout).group(1))
        assert abs(lufs - -14) <= 0.5 and peak <= -1.0, cli.stdout


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
