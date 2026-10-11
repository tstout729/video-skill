#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Add narration, UI sounds, an optional music bed and captions to a rendered video.

    python3 mux.py <video.mp4> --out final.mp4 [--narration audio/narration.wav]
        [--words words.js] [--music track.mp3 --music-db -24 --music-start 0]
        [--sfx-dir sfx/] [--sfx-db -14]

UI sounds come from <video>.sfx.json (written by render.mjs). Each sound is placed so its
measured peak lands on the declared time. With narration, the music bed ducks under the
voice. Captions (from words.js) become a soft mov_text track plus a sidecar .srt.
Loudness is normalized to -16 LUFS.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 48000
HERE = Path(__file__).resolve().parent
# Caption line breaking is shared with the explainer pipeline's assemble.py.
sys.path.insert(0, str(HERE))
from assemble import CAPTION_LANGUAGES, caption_lines, stamp, two_pass_loudnorm  # noqa: E402


def probe(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32767
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
        if w.getframerate() != SR:
            raise SystemExit(f"{path}: expected {SR} Hz")
    return x


def sfx_track(events: list[dict], sfx_dir: Path, duration: float, db: float) -> np.ndarray:
    out = np.zeros(int((duration + 1) * SR), dtype=np.float32)
    cache: dict[str, tuple[np.ndarray, int]] = {}
    for e in events:
        kind = e["kind"]
        if kind not in cache:
            x = read_wav(sfx_dir / f"{kind}.wav")
            cache[kind] = (x, int(np.argmax(np.abs(x))))
        x, peak = cache[kind]
        start = int(e["t"] * SR) - peak
        lo, hi = max(0, start), min(len(out), start + len(x))
        if hi > lo:
            out[lo:hi] += x[lo - start:hi - start] * e.get("gain", 1)
    return out[: int(duration * SR)] * (10 ** (db / 20))


def write_wav(path: Path, x: np.ndarray) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def words_from_js(path: Path) -> list[dict]:
    m = re.search(r"window\.WORDS = (\[.*?\]);", path.read_text(), re.S)
    return json.loads(m.group(1)) if m else []


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--narration", type=Path)
    ap.add_argument("--words", type=Path, help="words.js for captions")
    ap.add_argument("--music", type=Path)
    ap.add_argument("--music-db", type=float, default=-24.0, help="bed level under narration")
    ap.add_argument("--music-start", type=float, default=0.0, help="offset into the track (s)")
    ap.add_argument("--sfx-dir", type=Path, default=Path("sfx"))
    ap.add_argument("--sfx-db", type=float, default=-14.0)
    ap.add_argument("--title", default="")
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    duration = probe(args.video)
    sfx_json = Path(str(args.video).removesuffix(".mp4") + ".sfx.json")
    events = json.loads(sfx_json.read_text()) if sfx_json.exists() else []
    if any(not (args.sfx_dir / f"{e['kind']}.wav").exists() for e in events):
        subprocess.run([sys.executable, str(HERE / "sfx.py"), str(args.sfx_dir)], check=True)

    # Sounds alone are not speech, so loudness normalization would flatten their relative levels.
    # Scale them to a fixed peak instead.
    sfx_only = bool(events) and not args.narration and not args.music
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        inputs, chains, mix = ["-i", str(args.video)], [], []
        n = 1
        if events:
            track = sfx_track(events, args.sfx_dir, duration, args.sfx_db)
            if sfx_only and np.abs(track).max() > 0:
                track = track * (10 ** (-6 / 20) / np.abs(track).max())
            write_wav(tmp / "sfx.wav", track)
            inputs += ["-i", str(tmp / "sfx.wav")]
            chains.append(f"[{n}:a]aresample={SR}[sfx]")
            mix.append("[sfx]")
            n += 1
        voice = None
        if args.narration:
            inputs += ["-i", str(args.narration)]
            chains.append(f"[{n}:a]aresample={SR},asplit=2[voice][key]")
            voice, n = "[voice]", n + 1
            mix.append(voice)
        if args.music:
            inputs += ["-ss", str(args.music_start), "-i", str(args.music)]
            fade = max(0.0, duration - 2.5)
            chains.append(f"[{n}:a]aresample={SR},atrim=0:{duration:.3f},volume={args.music_db}dB,"
                          f"afade=t=in:d=1.0,afade=t=out:st={fade:.3f}:d=2.5[bed0]")
            if voice:
                chains.append("[bed0][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=600[bed]")
            else:
                chains.append("[bed0]anull[bed]")
            mix.append("[bed]")
            n += 1
        elif voice:
            chains.append("[key]anullsink")
        if not mix:
            raise SystemExit("nothing to mix: pass --narration, --music, or render with SFX")
        level = "" if sfx_only else ",{loudnorm}"
        chains.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=longest,"
                      f"atrim=0:{duration:.3f}{level}[a]")
        graph = ";".join(chains)
        if not sfx_only:
            graph = graph.replace("{loudnorm}", two_pass_loudnorm([*inputs, "-filter_complex", graph, "-map", "[a]"]))

        cmd = ["ffmpeg", "-v", "error", "-y", *inputs]
        srt_path = None
        words = words_from_js(args.words) if args.words else []
        if words:
            srt_path = args.out.with_suffix(".srt")
            lines = caption_lines(words)
            srt = []
            for k, (start, end, text) in enumerate(lines):
                hold = min(end + 0.25, lines[k + 1][0]) if k + 1 < len(lines) else end + 0.25
                srt.append(f"{k + 1}\n{stamp(start)} --> {stamp(hold)}\n{text}\n")
            srt_path.write_text("\n".join(srt))
            cmd += ["-i", str(srt_path)]
        cmd += ["-filter_complex", graph, "-map", "0:v", "-map", "[a]"]
        if srt_path:
            # The project's narration.json (next to words.js) names the caption language.
            spec = args.words.parent / "narration.json"
            lang = json.loads(spec.read_text()).get("language", "en") if spec.exists() else "en"
            cmd += ["-map", f"{n}:s", "-c:s", "mov_text", "-metadata:s:s:0",
                    f"language={CAPTION_LANGUAGES.get(lang, lang)}"]
        cmd += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR),
                "-metadata", f"title={args.title}", "-movflags", "+faststart", str(args.out)]
        subprocess.run(cmd, check=True)
    print(f"{args.out}  {probe(args.out):.1f}s  sfx: {len(events)}" + (f"  captions: {srt_path}" if srt_path else ""))


if __name__ == "__main__":
    main()
