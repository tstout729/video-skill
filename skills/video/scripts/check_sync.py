#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Measure a finished video's sound: does every UI sound land just after its picture?

    python3 check_sync.py <final.mp4> [--sfx render/video.sfx.json] [--sfx-dir sfx] [--fps 30]

An agent cannot listen, so this measures. For each sound in the .sfx.json (render.mjs writes
it next to the render), it finds the sound in the final audio within 150 ms of its declared
time by matching the sound's own waveform from --sfx-dir (the kit sfx.py makes, when the
folder lacks one; the sharpest transient for an unknown sound), and reports where its peak
landed relative to the first frame that shows the hit:

  OK     on that frame or up to 2 frames after it (mux.py puts it 1 frame after)
  EARLY  before that frame: the ear hears the hit before the eye sees it
  LATE   more than 2 frames after it
  FAINT  too buried under the voice or music to measure (or missing): a warning, not a
         timing verdict; raise --sfx-db in mux.py or move the sound if it should be heard

It also prints integrated loudness (LUFS), true peak (dBTP) and the share of energy below
60 Hz, which phone speakers cannot play (a warning above 25%). Exits 1 if any sound is EARLY
or LATE.
"""

import argparse
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
WINDOW = 0.150     # seconds either side of the declared time
TOLERANCE = 0.001  # seconds of measurement slack at either edge of the OK band
OK_FRAMES = 2
# A match is timed when its correlation is STRONG, or at least FLOOR and CLEAR times the best
# match the same sound finds by chance in nearby audio with no declared sound. Measured on the
# examples: absent sounds score at most 0.25 and 1.2x chance; present ones, buried under a
# voice, 0.17 and 1.5x chance.
STRONG, FLOOR, CLEAR = 0.30, 0.12, 1.4
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from assemble import TRUE_PEAK, measure_loudness  # noqa: E402


def streams(path: Path) -> list[dict]:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_type,start_time,avg_frame_rate,r_frame_rate", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout).get("streams", [])


def rate(s: dict) -> float:
    for key in ("avg_frame_rate", "r_frame_rate"):
        num, _, den = s.get(key, "0/0").partition("/")
        if float(num or 0) > 0 and float(den or 1) > 0:
            return float(num) / float(den or 1)
    return 0.0


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32767
        return x.reshape(-1, w.getnchannels()).mean(axis=1)


def templates(kinds: set[str], sfx_dir: Path | None) -> dict[str, np.ndarray]:
    """Each sound's waveform: the file mux.py used, else the synthesized kit."""
    out, kit = {}, None
    for kind in kinds:
        f = sfx_dir / f"{kind}.wav" if sfx_dir else None
        if f and f.exists():
            out[kind] = read_wav(f)
            continue
        if kit is None:
            from sfx import kit as make_kit
            kit = make_kit()
        if kind in kit:
            out[kind] = np.asarray(kit[kind], dtype=np.float64)
    return out


def window(audio: np.ndarray, s0: int, s1: int) -> np.ndarray:
    """audio[s0:s1], zero-padded where the range runs off either end."""
    seg = np.zeros(s1 - s0)
    lo, hi = max(0, s0), min(len(audio), s1)
    if hi > lo:
        seg[lo - s0:hi - s0] = audio[lo:hi]
    return seg


def band(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    """Zero-phase band-pass with soft edges (no time shift)."""
    f = np.log2(np.maximum(np.fft.rfftfreq(len(x), 1 / SR), 1.0))
    mask = 1 / (1 + np.exp(-(f - np.log2(lo)) * 6)) / (1 + np.exp((f - np.log2(hi)) * 6))
    return np.fft.irfft(np.fft.rfft(x) * mask, len(x))


def match(audio: np.ndarray, tpl: np.ndarray, lo: float, hi: float) -> tuple[float, float]:
    """Where the template's peak sits, between audio times lo and hi (s), by normalized
    cross-correlation in the band that holds the middle 90% of the sound's energy, so a music
    bed outside that band does not dilute the match. Returns (peak time, correlation 0..1)."""
    power = np.abs(np.fft.rfft(tpl)) ** 2
    share = np.cumsum(power) / power.sum()
    f = np.fft.rfftfreq(len(tpl), 1 / SR)
    f_lo, f_hi = max(80.0, f[np.searchsorted(share, 0.05)]), max(160.0, f[np.searchsorted(share, 0.95)])
    pad = 2048
    tpl_b = band(np.pad(tpl, pad), f_lo, f_hi)
    p = int(np.argmax(np.abs(tpl))) + pad  # mux.py aligns the unfiltered sound's peak sample
    s0, s1 = round(lo * SR) - p, round(hi * SR) - p
    seg = band(window(audio, s0 - pad, s1 + len(tpl_b) + pad), f_lo, f_hi)[pad:-pad]
    nfft = 1 << int(np.ceil(np.log2(len(seg) + len(tpl_b))))
    corr = np.fft.irfft(np.fft.rfft(seg, nfft) * np.conj(np.fft.rfft(tpl_b, nfft)), nfft)[:s1 - s0 + 1]
    c = np.concatenate([[0.0], np.cumsum(seg ** 2)])
    energy = c[len(tpl_b):len(tpl_b) + s1 - s0 + 1] - c[:s1 - s0 + 1]
    ncc = corr / (np.sqrt(np.maximum(energy, 1e-20)) * np.linalg.norm(tpl_b) + 1e-12)
    k = int(np.argmax(ncc))
    return (s0 + k + p) / SR, float(ncc[k])


def transient(audio: np.ndarray, lo: float, hi: float) -> tuple[float, float]:
    """For a sound with no template: the loudest moment of the high band (> 1 kHz)."""
    s0, s1 = round(lo * SR), round(hi * SR)
    pad = int(0.02 * SR)
    seg = window(audio, s0 - pad, s1 + pad)
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    high = np.fft.irfft(np.fft.rfft(seg) * (f > 1000), len(seg))
    env = np.convolve(np.abs(high), np.ones(48) / 48, mode="same")[pad:pad + s1 - s0]
    k = int(np.argmax(env))
    return (s0 + k) / SR, 1.0 if env[k] > 0 else 0.0


def chance(audio: np.ndarray, tpl: np.ndarray, t: float, busy: list[float], offset: float) -> float | None:
    """The best match `tpl` finds by chance in up to three nearby windows with no declared sound."""
    clear = WINDOW + len(tpl) / SR + WINDOW
    found = []
    for d in (0.6, -0.6, 1.0, -1.0, 1.5, -1.5, 2.0, -2.0):
        c = t + d
        if c - WINDOW - offset < 0 or c + WINDOW - offset > len(audio) / SR:
            continue
        if any(abs(c - o) < clear for o in busy):
            continue
        found.append(match(audio, tpl, c - WINDOW - offset, c + WINDOW - offset)[1])
        if len(found) == 3:
            break
    return max(found) if found else None


def check(audio: np.ndarray, events: list[dict], fps: float, offset: float = 0.0,
          sfx_dir: Path | None = None) -> list[dict]:
    """Measure every declared sound. `offset` is the audio's start time in the video's clock."""
    events = sorted(events, key=lambda e: e["t"])
    tpls = templates({e["kind"] for e in events}, sfx_dir)
    frame = 1 / fps
    rows = []
    for i, e in enumerate(events):
        t = float(e["t"])
        hit = math.ceil(t * fps - 1e-6) / fps  # the first frame that shows the hit
        lo, hi = t - WINDOW, t + WINDOW
        # Sounds of the same kind close together: each one searches only its half of the gap.
        center = hit + frame
        for o in events:
            if o is not e and o["kind"] == e["kind"]:
                other = math.ceil(o["t"] * fps - 1e-6) / fps + frame
                if other < center:
                    lo = max(lo, (other + center) / 2)
                elif other > center:
                    hi = min(hi, (other + center) / 2)
        tpl = tpls.get(e["kind"])
        if tpl is not None:
            at, score = match(audio, tpl, lo - offset, hi - offset)
            if score < STRONG:
                level = chance(audio, tpl, t, [o["t"] for o in events], offset)
                timed = score >= FLOOR and level is not None and score >= CLEAR * level
            else:
                timed = True
        else:
            at, score = transient(audio, lo - offset, hi - offset)
            timed = score > 0
        at += offset
        rel = at - hit
        if not timed:
            status = "FAINT"
        elif rel < -TOLERANCE:
            status = "EARLY"
        elif rel > OK_FRAMES * frame + TOLERANCE:
            status = "LATE"
        else:
            status = "OK"
        rows.append({"kind": e["kind"], "t": t, "measured": at, "offset": at - t, "frames": (at - t) * fps,
                     "match": score, "status": status})
    return rows


def low_share(audio: np.ndarray, cutoff: float = 60.0) -> float:
    """Share of the energy below `cutoff` Hz (averaged spectrum over 1.4 s windows)."""
    n = 1 << 16
    if len(audio) < n:
        audio = np.concatenate([audio, np.zeros(n - len(audio))])
    win = np.hanning(n)
    power = np.zeros(n // 2 + 1)
    for s in range(0, len(audio) - n + 1, n // 2):
        power += np.abs(np.fft.rfft(audio[s:s + n] * win)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    return float(power[f < cutoff].sum() / max(power.sum(), 1e-20))


def default_sfx_json(video: Path) -> Path | None:
    for p in (Path(str(video).removesuffix(".mp4") + ".sfx.json"), Path("render/video.sfx.json"),
              video.parent.parent / "render/video.sfx.json"):
        if p.exists():
            return p
    return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("video", type=Path)
    ap.add_argument("--sfx", type=Path, help="the render's .sfx.json (default: next to the video, "
                                              "else render/video.sfx.json)")
    ap.add_argument("--sfx-dir", type=Path, help="the sounds mux.py used (default: sfx/ beside render/)")
    ap.add_argument("--fps", type=float, help="frame rate when the file has no video stream (default 30)")
    args = ap.parse_args()

    info = streams(args.video)
    video = next((s for s in info if s.get("codec_type") == "video"), None)
    audio_s = next((s for s in info if s.get("codec_type") == "audio"), None)
    if not audio_s:
        raise SystemExit(f"{args.video}: no audio stream")
    fps = args.fps or (rate(video) if video else 0) or 30.0
    start = lambda s: float(s.get("start_time") or 0) if s and s.get("start_time") not in (None, "N/A") else 0.0
    offset = start(audio_s) - start(video)
    audio = decode(args.video)

    sfx_json = args.sfx or default_sfx_json(args.video)
    events = json.loads(sfx_json.read_text()) if sfx_json else []
    sfx_dir = args.sfx_dir or next((d for d in ((sfx_json.parent.parent / "sfx") if sfx_json else None, Path("sfx"))
                                    if d and d.is_dir()), None)
    rows = check(audio, events, fps, offset, sfx_dir)

    if rows:
        print(f"{'sound':<9} {'declared':>9} {'measured':>9} {'offset':>9} {'frames':>7} {'match':>6}  status")
        for r in rows:
            print(f"{r['kind']:<9} {r['t']:>8.3f}s {r['measured']:>8.3f}s {r['offset'] * 1000:>+7.1f}ms "
                  f"{r['frames']:>+7.2f} {r['match']:>6.2f}  {r['status']}")
        print(f"({len(rows)} sounds at {fps:g} fps; OK = 0 to {OK_FRAMES} frames after the frame that shows the hit)")
    else:
        print("no declared sounds" + (f" in {sfx_json}" if sfx_json else " (no .sfx.json found; pass --sfx)"))

    lufs, peak = measure_loudness(args.video)
    share = low_share(audio)
    print(f"loudness     {lufs:6.1f} LUFS   (social -14, training -16)")
    print(f"true peak    {peak:6.1f} dBTP   (cap {TRUE_PEAK:g})" + ("   WARN: over the cap" if peak > TRUE_PEAK else ""))
    print(f"below 60 Hz  {share:6.1%}        " + ("WARN: phone speakers cannot play this share" if share > 0.25 else "(phones play little below 60 Hz)"))
    faint = [r for r in rows if r["status"] == "FAINT"]
    if faint:
        print(f"WARN: {len(faint)} sounds too faint to measure (buried or missing); raise --sfx-db if they should be heard")
    bad = [r for r in rows if r["status"] in ("EARLY", "LATE")]
    if bad:
        print(f"FAIL: {len(bad)} of {len(rows)} sounds land before their picture or too late")
        sys.exit(1)


if __name__ == "__main__":
    main()
