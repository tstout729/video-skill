#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Export a finished video for where it will be posted.

    export.py <video.mp4> --platform linkedin|x|instagram|reels|youtube|web --out post.mp4
    export.py <video.mp4> --gif loop.gif [--fps 25] [--width 720] [--from s] [--to s] [--x]
    export.py <video.mp4> --poster 12.5 --out poster.jpg

MP4: H.264 High, standard (limited) range, AAC, fast start: what every platform and phone
plays. It warns when the frame does not suit the platform. Loudness is set earlier, by mux.py
(--social for -14 LUFS) or assemble.py.
GIF: one palette for the whole clip, so colors do not flicker between frames. GIF stores frame
delays in hundredths of a second, so 25 fps (4/100 s) is exact; 24 fps would round every frame
to 4/100 s and run about 4% fast. --x checks X's limit of 350 frames.
"""

import argparse
import json
import subprocess
import sys
import tempfile
from fractions import Fraction
from pathlib import Path

# Aspect ratios (width / height) each feed shows without cropping, and a bitrate ceiling.
PLATFORMS = {
    "linkedin": {"aspect": (9 / 16, 16 / 9), "best": "1:1 or 4:5 (1080x1350) in the feed", "maxrate": "12M"},
    "x": {"aspect": (1 / 3, 3), "best": "16:9 or 1:1", "maxrate": "12M"},
    "instagram": {"aspect": (4 / 5, 1.91), "best": "4:5 (1080x1350)", "maxrate": "8M"},
    "reels": {"aspect": (9 / 16, 9 / 16), "best": "9:16 (1080x1920); keep text inside the middle 80%", "maxrate": "8M"},
    "youtube": {"aspect": (9 / 16, 16 / 9), "best": "16:9 (1920x1080)", "maxrate": "16M"},
    "web": {"aspect": (0.1, 10), "best": "any", "maxrate": "8M"},
}


def probe(path: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    video = next(s for s in data["streams"] if s["codec_type"] == "video")
    return {"width": video["width"], "height": video["height"], "fps": float(Fraction(video["r_frame_rate"])),
            "duration": float(data["format"]["duration"]),
            "audio": any(s["codec_type"] == "audio" for s in data["streams"])}


def run(cmd: list[str]) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *cmd], check=True)


def export_mp4(src: Path, out: Path, platform: str) -> None:
    info, spec = probe(src), PLATFORMS[platform]
    aspect = info["width"] / info["height"]
    lo, hi = spec["aspect"]
    if not lo - 0.01 <= aspect <= hi + 0.01:
        print(f"warning: {info['width']}x{info['height']} is outside what {platform} shows uncropped; "
              f"best: {spec['best']}", file=sys.stderr)
    audio = ["-c:a", "aac", "-b:a", "160k", "-ar", "48000"] if info["audio"] else ["-an"]
    run(["-i", str(src), "-map", "0:v:0", *(["-map", "0:a:0"] if info["audio"] else []),
         "-vf", "scale=out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
         "-profile:v", "high", "-maxrate", spec["maxrate"], "-bufsize", spec["maxrate"],
         "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         *audio, "-movflags", "+faststart", str(out)])
    done = probe(out)
    print(f"{out}  {done['width']}x{done['height']}  {done['fps']:.0f} fps  {done['duration']:.1f}s  "
          f"{out.stat().st_size / 1e6:.1f} MB  ({platform}: {spec['best']})")


def export_gif(src: Path, out: Path, fps: int, width: int, start: float | None, end: float | None, x: bool) -> None:
    trim = (["-ss", str(start)] if start is not None else []) + (["-to", str(end)] if end is not None else [])
    info = probe(src)
    length = (end if end is not None else info["duration"]) - (start or 0)
    frames = round(length * fps)
    if 100 % fps:
        print(f"warning: {fps} fps is not a whole number of hundredths of a second per frame; "
              "the GIF will run slightly fast or slow (25, 20 or 50 fps are exact)", file=sys.stderr)
    if x and frames > 350:
        sys.exit(f"{frames} frames: X allows at most 350 GIF frames ({350 / fps:.1f} s at {fps} fps). "
                 "Shorten it with --from/--to or lower --fps.")
    scale = f"fps={fps},scale={width}:-2:flags=lanczos"
    with tempfile.TemporaryDirectory() as tmp:
        palette = Path(tmp) / "palette.png"
        run([*trim, "-i", str(src), "-vf", f"{scale},palettegen=stats_mode=full:max_colors=256", str(palette)])
        run([*trim, "-i", str(src), "-i", str(palette), "-lavfi",
             f"{scale}[v];[v][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle", "-loop", "0", str(out)])
    print(f"{out}  {frames} frames at {fps} fps  {out.stat().st_size / 1e6:.1f} MB")


def export_poster(src: Path, out: Path, at: float) -> None:
    run(["-ss", str(at), "-i", str(src), "-frames:v", "1", "-q:v", "2", str(out)])
    print(f"{out}  frame at {at}s")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--platform", choices=sorted(PLATFORMS))
    ap.add_argument("--out", type=Path)
    ap.add_argument("--gif", type=Path)
    ap.add_argument("--fps", type=int, default=25)
    ap.add_argument("--width", type=int, default=720)
    ap.add_argument("--from", dest="start", type=float)
    ap.add_argument("--to", dest="end", type=float)
    ap.add_argument("--x", action="store_true", help="enforce X's 350-frame GIF limit")
    ap.add_argument("--poster", type=float, help="time of the poster frame in seconds")
    args = ap.parse_args()
    if not args.video.exists():
        sys.exit(f"no such video: {args.video}")
    if args.gif:
        export_gif(args.video, args.gif, args.fps, args.width, args.start, args.end, args.x)
    elif args.poster is not None and args.out:
        export_poster(args.video, args.out, args.poster)
    elif args.platform and args.out:
        export_mp4(args.video, args.out, args.platform)
    else:
        ap.error("choose --platform with --out, --gif, or --poster with --out")


if __name__ == "__main__":
    main()
