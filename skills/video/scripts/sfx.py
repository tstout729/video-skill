#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Synthesize the UI sound kit with numpy (no licensing questions).

    python3 sfx.py <dir>     writes tap.wav, key.wav, toggle.wav, whoosh.wav, success.wav, pop.wav

Each sound is short and quiet by design; mux.py lines up each file's measured peak with
the time the page declared in window.SFX.
"""

import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000


def env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def tone(freq: float, dur: float, attack=0.002, decay=0.05) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env(n, attack, decay)


def noise(dur: float, lo: float, hi: float, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-9)


def mixdown(*parts: np.ndarray) -> np.ndarray:
    """Sum layers of different lengths, padding the shorter ones with silence."""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[: len(p)] += p
    return out


def kit() -> dict[str, np.ndarray]:
    tap = mixdown(0.55 * noise(0.03, 2500, 7000, 2) * env(int(0.03 * SR), 0.0005, 0.006), 0.5 * tone(1900, 0.06, decay=0.012))
    key = mixdown(0.4 * noise(0.025, 1800, 5000, 3) * env(int(0.025 * SR), 0.0005, 0.005), 0.45 * tone(1300, 0.05, decay=0.01))
    toggle = mixdown(0.6 * tone(880, 0.08, decay=0.018), 0.4 * tone(1320, 0.08, decay=0.014))
    n = int(0.35 * SR)
    sweep = noise(0.35, 300, 4000, 4) * np.sin(np.linspace(0, np.pi, n)) ** 2
    whoosh = 0.35 * sweep
    succ = np.zeros(int(0.6 * SR))
    for k, (f, dt) in enumerate([(1046.5, 0.0), (1568.0, 0.09)]):
        s = tone(f, 0.5, attack=0.003, decay=0.16) + 0.25 * tone(f * 2, 0.5, attack=0.003, decay=0.08)
        i = int(dt * SR)
        succ[i:i + len(s)] += 0.4 * s[: len(succ) - i]
    pop = 0.6 * tone(620, 0.09, attack=0.001, decay=0.02) * np.linspace(1.25, 0.8, int(0.09 * SR))
    return {"tap": tap, "key": key, "toggle": toggle, "whoosh": whoosh, "success": succ, "pop": pop}


def write(path: Path, x: np.ndarray) -> None:
    x = np.clip(x / (np.abs(x).max() + 1e-9) * 0.5, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("-"):
        sys.exit(__doc__)  # an option such as --help is never an output folder
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "sfx")
    out.mkdir(parents=True, exist_ok=True)
    for name, x in kit().items():
        write(out / f"{name}.wav", x)
    print(f"sfx kit -> {out}")
