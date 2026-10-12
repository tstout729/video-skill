#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Mux each rendered Manim scene with its narration, join them, and add a captions track.

    python3 assemble.py <project> --videos <dir with S01.mp4...> --out <final.mp4> [--lufs -16 | --social]

Scene order and ids come from <project>/narration.json (id "s01" -> video "S01.mp4").
Each scene's video length wins: narration is padded with silence, never cut, because
Narrated.finish() already holds the picture until the narration ends.
Captions are a soft subtitle track (mov_text) plus a sidecar .srt next to the output.
Loudness is normalized in two passes to -16 LUFS (--social: -14 LUFS for feeds), with true
peaks capped at -1.0 dBTP; the measured result is printed. A scene still read by the scratch
voice (narrate.py --scratch) gets a loud warning that the video is a draft.
"""

import argparse
import json
import math
import re
import subprocess
import sys
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


# Words a caption line may start with when a long sentence has to break.
SOFT_BREAKS = {"and", "or", "but", "so", "with", "to", "for", "that", "which", "in", "on", "at", "of",
               "from", "because", "while", "then", "when", "if", "y", "o", "pero", "con", "para", "que"}


def _split_point(line: list[dict]) -> int:
    """Where to break a full line: after a comma, else before a soft word, never inside a name."""
    best, best_score = len(line), -1
    for k in range(3, len(line)):
        prev, nxt = line[k - 1]["word"], line[k]["word"]
        if prev.endswith((",", ";", "\u2014", "\u2013")):
            score = 3
        elif re.sub(r"\W", "", nxt).lower() in SOFT_BREAKS:
            score = 2
        elif prev[:1].isupper() and nxt[:1].isupper():
            score = -1  # "Claude / Code"
        else:
            score = 1
        if score >= best_score:
            best, best_score = k, score
    return best


def caption_lines(words: list[dict], max_words: int = 9) -> list[tuple[float, float, str]]:
    """Break at sentence ends; never strand the last one or two words of a sentence."""
    ends = [bool(re.search(r"[.!?:]$", w["word"])) for w in words]
    lines, current = [], []

    def emit(part):
        lines.append((part[0]["start"], part[-1]["end"], " ".join(x["word"] for x in part)))

    for i, w in enumerate(words):
        current.append(w)
        near_end = any(ends[i + 1:i + 3]) and not ends[i]
        if ends[i] or (len(current) >= 5 and w["word"].endswith(",") and not near_end):
            emit(current)
            current = []
        elif (len(current) >= max_words and not near_end) or len(current) >= max_words + 2:
            k = _split_point(current)
            emit(current[:k])
            current = current[k:]
    if current:
        emit(current)
    return lines


# Loudness targets: -16 LUFS for training and docs, -14 LUFS for social feeds. True peaks are
# capped at -1.0 dBTP in both.
LUFS_DEFAULT, LUFS_SOCIAL, TRUE_PEAK = -16.0, -14.0, -1.0


def loudnorm_filter(lufs: float = LUFS_DEFAULT, true_peak: float = TRUE_PEAK) -> str:
    return f"loudnorm=I={lufs:g}:TP={true_peak:g}:LRA=11"


LOUDNORM = loudnorm_filter()


def two_pass_loudnorm(ffmpeg_args: list[str], lufs: float = LUFS_DEFAULT, true_peak: float = TRUE_PEAK) -> str:
    """Measure, then return a loudnorm filter that lands on `lufs` (one pass lands about 1 LU low).

    ffmpeg_args are the inputs and filter options of the real command, with "{loudnorm}" where
    the filter goes. Falls back to the one-pass filter if the measurement is unusable.
    """
    base = loudnorm_filter(lufs, true_peak)
    probe = [a.replace("{loudnorm}", base + ":print_format=json") for a in ffmpeg_args]
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *probe, "-f", "null", "-"],
                         capture_output=True, text=True, check=False).stderr
    found = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", out)
    try:
        m = json.loads(found[-1])
        values = [float(m[k]) for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")]
    except (IndexError, KeyError, ValueError):
        return base
    if not all(map(math.isfinite, values)):
        return base  # silence measures as -inf
    i, tp, lra, thresh, offset = values
    return (f"{base}:measured_I={i}:measured_TP={tp}:measured_LRA={lra}"
            f":measured_thresh={thresh}:offset={offset}:linear=true")


def measure_loudness(path: Path, start: float = 0.0, duration: float | None = None) -> tuple[float, float]:
    """Integrated loudness (LUFS) and true peak (dBTP) of a file's first audio stream (ffmpeg ebur128)."""
    span = ["-ss", str(start)] + (["-t", str(duration)] if duration else [])
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *span, "-i", str(path), "-map", "0:a:0",
                          "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, check=False).stderr
    summary = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
    tp = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
    return (float(i.group(1)) if i else -math.inf), (float(tp.group(1)) if tp else -math.inf)


def limiter(ceiling: float) -> str:
    """Lookahead peak limiter holding sample peaks at `ceiling` dBFS (then shifted to -6 dBFS,
    which the loudnorm after it undoes). Its delay is compensated, so no sound moves in time."""
    level_in = min(63.0, max(0.016, 10 ** ((-6 - ceiling) / 20)))
    return f"alimiter=level_in={level_in:.6f}:limit=0.501187:attack=5:release=50:level=0:latency=1"


def linear_loudnorm(measure_args: list[str], lufs: float = LUFS_DEFAULT, true_peak: float = TRUE_PEAK) -> str:
    """The filter chain for {loudnorm}: two-pass loudnorm with one fixed gain. When that gain would
    push true peaks over the cap (narration and UI sounds peak 15-20 dB over their loudness), a
    limiter first takes the peaks down, so loudnorm need not fall back to its dynamic mode, which
    rides the gain and lands 1-2 LU under the target."""
    flt = two_pass_loudnorm(measure_args, lufs, true_peak)

    def over(f: str) -> float | None:  # dB the linear gain would put the peaks over the cap
        m = dict(re.findall(r"measured_(I|TP)=(-?[\d.]+)", f))
        return float(m["TP"]) + lufs - float(m["I"]) - true_peak if len(m) == 2 else None

    excess = over(flt)
    if excess is None or excess <= 0:
        return flt
    m = dict(re.findall(r"measured_(I|TP)=(-?[\d.]+)", flt))
    ceiling = float(m["TP"]) - excess - 0.5
    for _ in range(4):
        chain = limiter(ceiling)
        flt = two_pass_loudnorm([a.replace("{loudnorm}", chain + ",{loudnorm}") for a in measure_args],
                                lufs, true_peak)
        excess = over(flt)
        if excess is None or excess <= 0:
            break
        ceiling -= 2 * excess + 0.2
    return chain + "," + flt  # if still over, loudnorm's own limiter takes the rest


def normalize(measure_args: list[str], encode, out: Path, lufs: float = LUFS_DEFAULT,
              true_peak: float = TRUE_PEAK) -> tuple[float, float]:
    """Two-pass loudnorm (see linear_loudnorm), encode(filter chain), then measure `out`. The AAC
    encoder can push true peaks a few tenths of a dB past the cap; when it does, aim that much
    lower and encode again."""
    aim = true_peak
    for _ in range(3):
        encode(linear_loudnorm(measure_args, lufs, aim))
        level, peak = measure_loudness(out)
        if peak <= true_peak:
            break
        aim = max(-9.0, aim - (peak - true_peak) - 0.1)
    return level, peak


def scratch_warning(scenes: list[str], project: Path | None, redo: str) -> None:
    """Say loudly that the computer's draft voice (narrate.py --scratch) is still in the video."""
    if not scenes:
        return
    narrate = Path(__file__).resolve().parent / "narrate.py"
    bar = "!" * 78
    sys.stdout.flush()  # the warning comes last, after the summary line
    print("\n".join(["", bar, f"!!  SCRATCH NARRATION in {', '.join(scenes)}: the computer's draft voice.",
                     "!!  This video is a draft. Do not deliver it. Record the real voice:",
                     f"!!    uv run --script {narrate} {project or '<project>'}",
                     f"!!  then {redo}.", bar, ""]), file=sys.stderr)


# narration.json "language" (ISO 639-1, default "en") labels the caption track (ISO 639-2).
CAPTION_LANGUAGES = {"en": "eng", "es": "spa", "fr": "fra", "de": "deu", "pt": "por", "it": "ita"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--videos", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    level = parser.add_mutually_exclusive_group()
    level.add_argument("--lufs", type=float, default=LUFS_DEFAULT, help="loudness target (default -16)")
    level.add_argument("--social", action="store_const", dest="lufs", const=LUFS_SOCIAL,
                       help="mix for social feeds: -14 LUFS")
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
        def encode(level: str) -> None:
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(joined), "-i", str(srt_path),
                "-map", "0", "-map", "1", "-c:v", "copy", "-af", level,
                "-c:a", "aac", "-b:a", "192k", "-c:s", "mov_text",
                "-metadata", f"title={cfg.get('title', '')}", "-metadata:s:s:0",
                f"language={CAPTION_LANGUAGES.get(cfg.get('language', 'en'), cfg.get('language', 'en'))}",
                "-movflags", "+faststart", str(args.out),
            ], check=True)

        lufs, peak = normalize(["-i", str(joined), "-map", "0:a", "-af", "{loudnorm}"], encode, args.out, args.lufs)
    print(f"{args.out}  {probe_duration(args.out):.1f}s  {lufs:.1f} LUFS  {peak:.1f} dBTP  captions: {srt_path}")
    scratch_warning([s["id"] for s in cfg["scenes"] if timings[s["id"]].get("scratch")], args.project,
                    "render the scenes and run assemble.py again")


if __name__ == "__main__":
    main()
