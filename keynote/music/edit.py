# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Cut the keynote film's score to the picture, from the take composed by compose.py.

    uv run --script keynote/music/edit.py take.mp3 --out keynote/music/score.wav

The take follows the plan for its first 24 bars and then loses it: its final drop is nine seconds
of near silence (log.md, round 5). So the score is edited on bar lines, the way music is cut for
film: each film bar range takes a range of the take's bars. The take sits on a 110 BPM grid with
every hit 23 ms after its bar line (measured on bars 8-28, no drift); splices fall on the bar line,
inside that 23 ms, so no hit is cut. The two builds end in a one-beat stop: silence from beat 3
until the next downbeat's hit, so the drop lands like a reveal. Mastered to -14 LUFS with bed.py.
"""

import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "skills/video/scripts"))
import bed  # noqa: E402

SR = 48000
BAR = 4 * 60 / 110
FILM_BARS = 32.5
# (film bar, take bar, bars): which bars of the take play under which bars of the film.
EDIT = [
    (0, 0, 20),     # intro, the build into the drop on bar 4, and the drop under s02-s08
    (20, 21, 3),    # the take's breakdown under George's line (s09)
    (23, 3, 1),     # the take's opening build under "It checks its own work" (s10)
    (24, 4, 5),     # the take's first drop again: the boom as the contact sheet lands
    (29, 28, 1),    # the take's last hit under the end card's landing (s13)
    (30, 1, 2.5),   # the quiet opening motif, so the film ends where it began
]
STOPS = [3.75, 23.75]   # film bars where a build's last beat goes silent
XFADE = 0.006           # s, each side of a splice
HP_HZ = 45               # Hz, the 808's lowest weight (see main)


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("take", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    x = round(XFADE * SR)
    take = np.concatenate([np.zeros((x, 2)), decode(a.take)])   # x samples of silence before bar 0
    n = round(FILM_BARS * BAR * SR)
    out = np.zeros((n, 2))
    for film, src, bars in EDIT:
        d0, s0, length = round(film * BAR * SR), round(src * BAR * SR) + x, round(bars * BAR * SR)
        seg = take[s0 - x:s0 + length + x].copy()   # s0 is offset by the x samples of padding
        k = np.linspace(0, np.pi / 2, 2 * x)
        seg[:2 * x] *= np.sin(k)[:, None] ** 2 if film else 1   # equal-power fades over the splice
        seg[-2 * x:] *= np.cos(k)[:, None] ** 2
        lo = d0 - x
        seg = seg[max(0, -lo):]
        lo = max(lo, 0)
        hi = min(n, lo + len(seg))
        out[lo:hi] += seg[:hi - lo]
    t = np.arange(n) / SR
    for b in STOPS:
        a0, a1 = b * BAR + 0.023, (np.floor(b) + 1) * BAR + 0.023 - 0.004
        out *= (1 - bed.ramp(t, a0, 0.03) * (1 - bed.ramp(t, a1, 0.004)))[:, None]
    out *= (1 - bed.ramp(t, (FILM_BARS - 1) * BAR, BAR))[:, None]   # the motif fades over the last bar
    # The take's 808 puts 74% of its energy below 60 Hz; Apple's films measure 25-42% there, with the
    # weight at 60-120 Hz, where phones still play it. A steep high-pass at HP_HZ moves it up.
    out = bed.filt(out, [bed.biquad("hp", HP_HZ)] * 3)
    out = bed.master(out, -14.0, circular=False)
    bed.write_wav(a.out, out)
    tp = 20 * np.log10(bed.peak_envelope(out).max() + 1e-12)
    print(f"{a.out}  {n / SR:.2f}s  {bed.lufs(out):.1f} LUFS  {tp:.1f} dBTP  below 60 Hz {bed.low_share(out):.1%}")


if __name__ == "__main__":
    main()
