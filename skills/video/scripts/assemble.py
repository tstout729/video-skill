#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Mux each rendered Manim scene with its narration, join them, and add a captions track.

    python3 assemble.py <project> --videos <dir with S01.mp4...> --out <final.mp4>

Scene order and ids come from <project>/narration.json (id "s01" -> video "S01.mp4").
Each scene's video length wins: narration is padded with silence, never cut, because
Narrated.finish() already holds the picture until the narration ends.
Captions are a soft subtitle track (mov_text) plus a sidecar .srt next to the output.
"""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path


def probe_duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def stamp(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def caption_lines(words: list[dict], max_words: int = 9) -> list[tuple[float, float, str]]:
    """Break at sentence ends; never strand the last one or two words of a sentence."""
    ends = [bool(re.search(r"[.!?:]$", w["word"])) for w in words]
    lines, current = [], []
    for i, w in enumerate(words):
        current.append(w)
        near_end = any(ends[i + 1:i + 3]) and not ends[i]
        if ends[i] or (len(current) >= max_words and not near_end) or len(current) >= max_words + 2 \
                or (len(current) >= 5 and w["word"].endswith(",") and not near_end):
            lines.append((current[0]["start"], current[-1]["end"], " ".join(x["word"] for x in current)))
            current = []
    if current:
        lines.append((current[0]["start"], current[-1]["end"], " ".join(x["word"] for x in current)))
    return lines


# narration.json "language" (ISO 639-1, default "en") labels the caption track (ISO 639-2).
CAPTION_LANGUAGES = {"en": "eng", "es": "spa", "fr": "fra", "de": "deu", "pt": "por", "it": "ita"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--videos", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    cfg = json.loads((args.project / "narration.json").read_text())
    timings = json.loads((args.project / "audio/timings.json").read_text())
    args.out.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        parts, srt, offset, n = [], [], 0.0, 1
        for scene in cfg["scenes"]:
            sid = scene["id"]
            video = args.videos / f"{sid.upper()}.mp4"
            audio = args.project / "audio" / f"{sid}.mp3"
            part = tmp / f"{sid}.mp4"
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(audio),
                "-filter_complex", "[1:a]apad[a]", "-map", "0:v", "-map", "[a]", "-shortest",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(part),
            ], check=True)
            parts.append(part)
            lines = caption_lines(timings[sid]["words"])
            for k, (start, end, text) in enumerate(lines):
                hold = min(end + 0.25, lines[k + 1][0]) if k + 1 < len(lines) else end + 0.25
                srt.append(f"{n}\n{stamp(offset + start)} --> {stamp(offset + hold)}\n{text}\n")
                n += 1
            offset += probe_duration(part)

        listing = tmp / "parts.txt"
        listing.write_text("".join(f"file '{p}'\n" for p in parts))
        srt_path = args.out.with_suffix(".srt")
        srt_path.write_text("\n".join(srt))
        joined = tmp / "joined.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
                        "-c", "copy", str(joined)], check=True)
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(joined), "-i", str(srt_path),
            "-map", "0", "-map", "1", "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "192k", "-c:s", "mov_text",
            "-metadata", f"title={cfg.get('title', '')}", "-metadata:s:s:0",
            f"language={CAPTION_LANGUAGES.get(cfg.get('language', 'en'), cfg.get('language', 'en'))}",
            "-movflags", "+faststart", str(args.out),
        ], check=True)
    print(f"{args.out}  {probe_duration(args.out):.1f}s  captions: {srt_path}")


if __name__ == "__main__":
    main()
