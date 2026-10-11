#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Turn a video into a JPEG image sequence that a seek(t) page shows frame by frame.

    python3 clip.py <video.mp4> --out <dir> [--fps 30] [--width 960] [--from s] [--to s] [--quality 3]

Playwright's Chromium cannot decode H.264, and a <video> cannot seek to an exact frame, so a
page shows a clip with frames() from runtime/motion.js instead.
Writes:
  <dir>/000001.jpg ...   frame k (from 1) shows clip time (k - 1) / fps, from --from
  <dir>/clip.json        {fps, count, width, height, source}
--width is the largest width (0 keeps the source width); the height keeps the aspect ratio.
--quality is the JPEG quality, 2 (best) to 31. A re-run replaces the old frames.
"""

import argparse
import json
import subprocess
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, required=True, help="folder for the frames and clip.json")
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--width", type=int, default=960, help="largest width in pixels (0 keeps the source width)")
    ap.add_argument("--from", dest="start", type=float, default=0.0, help="start time in the video (s)")
    ap.add_argument("--to", type=float, help="end time in the video (s)")
    ap.add_argument("--quality", type=int, default=3, help="JPEG quality, 2 (best) to 31")
    args = ap.parse_args()
    if not args.video.is_file():
        raise SystemExit(f"no such video: {args.video}")
    if args.to is not None and args.to <= args.start:
        raise SystemExit("--to must be after --from")

    args.out.mkdir(parents=True, exist_ok=True)
    # Frames from an earlier, longer run would otherwise linger past the new count.
    for old in args.out.glob("[0-9]" * 6 + ".jpg"):
        old.unlink()

    # A JPEG decoder (Chromium included) reads BT.601 at full range, so convert the matrix and the
    # range from the video's own tags. Accurate rounding: the fast path darkens by about 4 levels.
    size = f"'min({args.width},iw)':-2" if args.width else "iw:ih"
    vf = [f"fps={args.fps:g}",
          f"scale={size}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt601:out_range=pc",
          "format=yuvj420p"]
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{args.start:.3f}", "-i", str(args.video)]
    if args.to is not None:
        cmd += ["-t", f"{args.to - args.start:.3f}"]
    cmd += ["-an", "-vf", ",".join(vf), "-q:v", str(args.quality), "-start_number", "1",
            str(args.out / "%06d.jpg")]
    subprocess.run(cmd, check=True)

    count = len(list(args.out.glob("[0-9]" * 6 + ".jpg")))
    if not count:
        raise SystemExit("ffmpeg wrote no frames; check --from and --to")
    size = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                           "stream=width,height", "-of", "csv=p=0", str(args.out / "000001.jpg")],
                          capture_output=True, text=True, check=True).stdout.strip()
    width, height = (int(x) for x in size.split(",")[:2])
    fps = int(args.fps) if args.fps.is_integer() else args.fps
    info = {"fps": fps, "count": count, "width": width, "height": height, "source": str(args.video)}
    (args.out / "clip.json").write_text(json.dumps(info, indent=1) + "\n")
    print(f"{args.out}  {count} frames  {width}x{height}  {fps} fps  ({count / args.fps:.2f}s)")


if __name__ == "__main__":
    main()
