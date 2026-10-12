#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Synthesize a royalty-free music bed to cut on, and write its exact beat grid.

    python3 bed.py --out bed.wav [--bpm 120] [--bars 16] [--key A] [--mood calm|drive]
        [--beats beats.js] [--seed 1] [--loop] [--first 0.5] [--lufs -14]

calm   felt-piano arpeggio over a warm pad, a soft shaker, a very soft kick on beats 1 and 3
drive  tight kick on every beat, clap on 2 and 4, muted pluck ostinato, eighth-note bass

The chords loop I-V-vi-IV in the key (i-VI-III-VII for a minor key such as "F#m"), voice-led,
with velocities humanized by --seed and a short reverb (Schroeder allpasses into a feedback
delay network). Without --loop, parts enter over the first bars, the last bars cadence
IV-V-I and the final chord rings out. With --loop the file is exactly --bars long and its
end flows into its start.

Mixed for phone speakers: no fundamental below 70 Hz, high-passed at 60 Hz, --lufs
integrated (default -14) with true peaks under -1.5 dBTP. The first downbeat sits at
--first seconds. --beats writes window.BEATS = {bpm, first, beats, downbeats} (JSON for a
.json path), like beats.py. Every beat is first + n * 60 / bpm, computed from time and never
by adding a rounded frames-per-beat, so motion.js beat(n) stays on the music at any length.
"""

import argparse
import functools
import itertools
import json
import wave
from pathlib import Path

import numpy as np

SR = 48000
TABLE = 4096
NOTES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
MAJOR = (0, 2, 4, 5, 7, 9, 11)
MINOR = (0, 2, 3, 5, 7, 8, 10)
# (scale degree of the chord root, chord tones as scale steps above it). Four tones per chord,
# so every chord has four voices; 7 is the root's octave.
LOOP_MAJOR = [(0, (0, 2, 4, 8)), (4, (0, 2, 4, 8)), (5, (0, 2, 4, 6)), (3, (0, 2, 4, 6))]  # Iadd9 Vadd9 vi7 IVmaj7
END_MAJOR = [(3, (0, 2, 4, 6)), (4, (0, 2, 4, 6)), (0, (0, 2, 4, 7))]                      # IVmaj7 V7 I
LOOP_MINOR = [(0, (0, 2, 4, 8)), (5, (0, 2, 4, 6)), (2, (0, 2, 4, 8)), (6, (0, 2, 4, 7))]  # i(add9) VImaj7 III(add9) VII
END_MINOR = [(5, (0, 2, 4, 6)), (6, (0, 2, 4, 7)), (0, (0, 2, 4, 7))]                      # VImaj7 VII i
BASS_RANGE = (38, 49)  # D2 (73 Hz) to C#3: no bass fundamental below ~70 Hz
CEILING = -1.5         # dBTP; leaves room for the AAC encoder's overshoot
# ITU-R BS.1770 K-weighting at 48 kHz: high shelf, then high-pass.
K_WEIGHT = [(np.array([1.53512485958697, -2.69169618940638, 1.19839281085285]),
             np.array([1.0, -1.69065929318241, 0.73248077421585])),
            (np.array([1.0, -2.0, 1.0]), np.array([1.0, -1.99004745483398, 0.99007225036621]))]


# ---------- time ----------

def beat_grid(bpm: float, first: float, count: int) -> list[float]:
    """Exact beat times. Each one is computed from time; adding a rounded step would drift."""
    return [first + k * 60.0 / bpm for k in range(count)]


# ---------- DSP helpers ----------

def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def biquad(kind: str, f0: float, q: float = 0.7071) -> tuple[np.ndarray, np.ndarray]:
    w = 2 * np.pi * f0 / SR
    c, alpha = np.cos(w), np.sin(w) / (2 * q)
    b = {"hp": [(1 + c) / 2, -(1 + c), (1 + c) / 2], "lp": [(1 - c) / 2, 1 - c, (1 - c) / 2]}[kind]
    a = [1 + alpha, -2 * c, 1 - alpha]
    return np.array(b) / a[0], np.array(a) / a[0]


def filt(x: np.ndarray, sections, circular: bool = False) -> np.ndarray:
    """Causal IIR biquads with their exact phase, applied through the FFT (fast in numpy).
    circular=True filters one period of a loop, so the filter's ringing wraps to the start."""
    n = len(x)
    nfft = n if circular else n + SR
    z = np.exp(-2j * np.pi * np.fft.rfftfreq(nfft))
    h = np.ones_like(z)
    for b, a in sections:
        h *= (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)
    spec = np.fft.rfft(x, nfft, axis=0)
    return np.fft.irfft(spec * (h[:, None] if x.ndim == 2 else h), nfft, axis=0)[:n]


def band_noise(rng: np.random.Generator, dur: float, lo: float, hi: float, dense: float = 0.0) -> np.ndarray:
    """Band-limited noise, peak 1. `dense` soft-saturates it first, as drum samples are, so a
    hit carries more energy for its peak (Gaussian noise alone has a 12 dB crest factor)."""
    n = int(dur * SR)
    f = np.log2(np.maximum(np.fft.rfftfreq(n, 1 / SR), 1.0))
    mask = 1 / (1 + np.exp(-(f - np.log2(lo)) * 8)) / (1 + np.exp((f - np.log2(hi)) * 8))
    x = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) * mask, n)
    if dense:
        x = np.fft.irfft(np.fft.rfft(np.tanh(dense * x / x.std())) * mask, n)
    return x / (np.abs(x).max() + 1e-12)


def ramp(t: np.ndarray, start: float, dur: float) -> np.ndarray:
    """0 before start, rising on a raised cosine to 1 after start + dur."""
    p = np.clip((t - start) / max(dur, 1e-6), 0, 1)
    return 0.5 - 0.5 * np.cos(np.pi * p)


def table(harmonics: int, slope: float, warmth: float) -> np.ndarray:
    """One cycle of a band-limited saw-like wave; low `warmth` rolls the highs off."""
    k = np.arange(1, harmonics + 1)[:, None]
    ph = np.arange(TABLE)[None, :] / TABLE
    w = (k.astype(float) ** -slope * np.exp(-(k - 1) / warmth) * np.sin(2 * np.pi * k * ph)).sum(0)
    return w / np.abs(w).max()


def osc(tab: np.ndarray, f: float, n: int, phase: float) -> np.ndarray:
    idx = ((phase + f / SR * np.arange(n)) % 1.0) * TABLE
    i = idx.astype(np.int64)
    fr = idx - i
    return tab[i] * (1 - fr) + tab[(i + 1) % TABLE] * fr


PAD_DARK, PAD_BRIGHT = table(24, 1.0, 3.5), table(24, 1.0, 9.0)
BASS_TAB, SOFT_BASS_TAB = table(32, 1.15, 7.0), table(6, 1.8, 1.6)


def allpass(x: np.ndarray, d: int, g: float) -> np.ndarray:
    """Schroeder allpass y[n] = -g x[n] + x[n-d] + g y[n-d], computed d samples at a time."""
    n = len(x)
    xp = np.concatenate([np.zeros(d), x])
    yp = np.zeros(n + d)
    for s in range(0, n, d):
        e = min(n, s + d)
        yp[s + d:e + d] = -g * x[s:e] + xp[s:e] + g * yp[s:e]
    return yp[d:]


def hadamard(m: int) -> np.ndarray:
    h = np.array([[1.0]])
    while len(h) < m:
        h = np.block([[h, h], [h, -h]])
    return h / np.sqrt(m)


def reverb(x: np.ndarray, rt60: float, predelay: float = 0.018, damp: float = 0.32) -> np.ndarray:
    """Short stereo room: allpass diffusers into an 8-line feedback delay network.
    Each line loses 60 dB in rt60 seconds; a two-tap low-pass in the loop darkens the tail.
    Blocks are no longer than the shortest line, so each block only reads finished samples."""
    x = np.concatenate([np.zeros(int(predelay * SR)), x])
    for d, g in ((245, 0.6), (371, 0.6), (480, 0.55), (605, 0.55)):
        x = allpass(x, d, g)
    lens = np.array([1123, 1361, 1597, 1847, 2087, 2311, 2579, 2819])
    m, n, pre = len(lens), len(x), int(lens.max()) + 2
    a = hadamard(m)
    g = 10 ** (-3 * lens / (rt60 * SR))
    b_in = np.array([1, -1, 1, 1, -1, 1, -1, -1]) / np.sqrt(m)
    c_l, c_r = np.array([1, 1, 1, 1, -1, -1, -1, -1]), np.array([1, -1, 1, -1, 1, -1, 1, -1])
    v = np.zeros((m, n + pre))
    out = np.zeros((n, 2))
    step = int(lens.min())
    for s in range(0, n, step):
        e = min(n, s + step)
        fb = np.empty((m, e - s))
        for i in range(m):
            j = s + pre - lens[i]
            fb[i] = g[i] * ((1 - damp) * v[i, j:j + e - s] + damp * v[i, j - 1:j - 1 + e - s])
        v[:, s + pre:e + pre] = a @ fb + np.outer(b_in, x[s:e])
        out[s:e, 0], out[s:e, 1] = c_l @ fb, c_r @ fb
    return out / np.sqrt(m)


# ---------- measurement ----------

def loudness(xk: np.ndarray) -> float:
    """Gated integrated loudness (BS.1770) of an already K-weighted stereo signal."""
    block, hop = int(0.4 * SR), int(0.1 * SR)
    c = np.concatenate([[0.0], np.cumsum((xk ** 2).sum(axis=1))])
    starts = np.arange(0, max(1, len(xk) - block + 1), hop)
    z = (c[np.minimum(starts + block, len(xk))] - c[starts]) / block
    lk = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z = z[lk > -70]
    if not len(z):
        return -70.0
    rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[-0.691 + 10 * np.log10(z) > rel]
    return float(-0.691 + 10 * np.log10(z.mean()))


def lufs(x: np.ndarray) -> float:
    return loudness(filt(x, K_WEIGHT))


def peak_envelope(x: np.ndarray, factor: int = 4, chunk: int = 1 << 17) -> np.ndarray:
    """Per-sample true peak: the largest |value| of the 4x oversampled signal in each sample
    period, over both channels. Oversampled through the FFT in overlapping chunks."""
    n, margin = len(x), 256
    env = np.zeros(n)
    for s in range(0, n, chunk):
        lo, hi = max(0, s - margin), min(n, s + chunk + margin)
        seg = x[lo:hi]
        spec = np.fft.rfft(seg, axis=0)
        up = np.fft.irfft(spec, (hi - lo) * factor, axis=0) * factor
        a = np.abs(up).max(axis=1).reshape(hi - lo, factor).max(axis=1)
        e = min(n, s + chunk)
        env[s:e] = a[s - lo:e - lo]
    return np.maximum(env, np.abs(x).max(axis=1))


def low_share(x: np.ndarray, cutoff: float = 60.0) -> float:
    """Share of the signal's energy below `cutoff` Hz."""
    mono = x.mean(axis=1) if x.ndim == 2 else x
    p = np.abs(np.fft.rfft(mono)) ** 2
    f = np.fft.rfftfreq(len(mono), 1 / SR)
    return float(p[f < cutoff].sum() / max(p.sum(), 1e-20))


def run_min(x: np.ndarray, w: int) -> np.ndarray:
    """Centered moving minimum over 2w+1 samples (van Herk / Gil-Werman, vectorized)."""
    k = 2 * w + 1
    p = np.concatenate([np.full(w, np.inf), x, np.full(w + k, np.inf)])
    p = np.concatenate([p, np.full(-len(p) % k, np.inf)]).reshape(-1, k)
    pre = np.minimum.accumulate(p, axis=1).ravel()
    suf = np.minimum.accumulate(p[:, ::-1], axis=1)[:, ::-1].ravel()
    j = np.arange(len(x))
    return np.minimum(suf[j], pre[j + k - 1])


def run_mean(x: np.ndarray, w: int) -> np.ndarray:
    c = np.concatenate([[0.0], np.cumsum(np.concatenate([np.full(w, x[0]), x, np.full(w, x[-1])]))])
    return (c[2 * w + 1:] - c[:-(2 * w + 1)]) / (2 * w + 1)


def limiter_gain(env: np.ndarray, ceiling: float, circular: bool) -> np.ndarray:
    """Smooth gain that keeps env under ceiling: a moving minimum, then a moving average of the
    same width, which can only stay at or below the gain each peak needs."""
    need = np.minimum(1.0, ceiling / np.maximum(env, 1e-9))
    w = int(0.02 * SR)
    if circular:
        wrap = np.concatenate([need[-2 * w:], need, need[:2 * w]])
        return run_mean(run_min(wrap, w), w)[2 * w:-2 * w]
    return run_mean(run_min(need, w), w)


def master(x: np.ndarray, target: float, circular: bool) -> np.ndarray:
    """Set integrated loudness to target while a gentle limiter holds true peaks under CEILING."""
    ceiling = 10 ** ((CEILING - 0.15) / 20)
    xk = filt(x, K_WEIGHT, circular)
    env = peak_envelope(x)
    gain = 1.0
    for _ in range(6):
        g = gain * limiter_gain(env * gain, ceiling, circular)
        err = target - loudness(xk * g[:, None])
        gain *= 10 ** (err / 20)
        if abs(err) < 0.02:
            break
    g = gain * limiter_gain(env * gain, ceiling, circular)
    y = x * g[:, None]
    over = 20 * np.log10(peak_envelope(y).max() + 1e-12) - CEILING
    return y * 10 ** (-max(0.0, over + 0.05) / 20)


# ---------- instruments ----------

INSTRUMENT_RNG = np.random.default_rng(20261011)


def kick(mood: str) -> np.ndarray:
    """A short pitched thump. Its body settles at 72-74 Hz, above what phones lose."""
    t = np.arange(int(0.45 * SR)) / SR
    tight = mood == "drive"
    f_hi, f_lo, sweep, decay = (190, 72, 0.028, 0.13) if tight else (125, 74, 0.035, 0.17)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / sweep)
    body = np.sin(2 * np.pi * (np.cumsum(f) - f[0]) / SR)
    env = np.minimum(1, t / (0.0008 if tight else 0.003)) * np.exp(-t / decay)
    drive = 2.2 if tight else 1.3  # saturation adds harmonics a phone can play
    body = np.tanh(drive * body * env) / np.tanh(drive)
    rng = np.random.default_rng(7 if tight else 8)
    if tight:
        click = 0.22 * band_noise(rng, 0.45, 1500, 9000) * np.exp(-t / 0.0015)
    else:
        click = 0.07 * band_noise(rng, 0.45, 250, 1800) * np.exp(-t / 0.004)
    return (body + click) * (1 - ramp(t, 0.42, 0.03))


def clap() -> np.ndarray:
    t = np.arange(int(0.4 * SR)) / SR
    noise = band_noise(np.random.default_rng(9), 0.4, 900, 4200, dense=1.5)
    env = np.zeros_like(t)
    for start, amp in ((0.0, 0.9), (0.009, 0.75), (0.019, 0.7), (0.027, 0.8)):
        env += amp * (t >= start) * np.exp(-np.maximum(t - start, 0) / 0.0045)
    env += 0.5 * (t >= 0.027) * np.exp(-np.maximum(t - 0.027, 0) / 0.085)
    return noise * env * np.minimum(1, t / 0.0004)


def shaker(variant: int) -> np.ndarray:
    t = np.arange(int(0.14 * SR)) / SR
    noise = band_noise(np.random.default_rng(100 + variant), 0.14, 3000, 9000, dense=1.5)
    return noise * ramp(t, 0, 0.007) * np.exp(-np.maximum(t - 0.007, 0) / 0.038)


def hat(variant: int, open_: bool = False) -> np.ndarray:
    dur = 0.5 if open_ else 0.12
    t = np.arange(int(dur * SR)) / SR
    noise = band_noise(np.random.default_rng(200 + variant), dur, 7000, 15000, dense=1.5)
    decay = 0.16 if open_ else 0.02
    return noise * np.minimum(1, t / 0.0005) * np.exp(-t / decay) * (1 - ramp(t, dur - 0.02, 0.02))


@functools.cache
def piano(midi: int, layer: int) -> np.ndarray:
    """Felt piano: slightly stretched partials, highs that die first, two strings per note
    beating against each other, a soft hammer attack and a little felt thump."""
    f0 = hz(midi)
    vel = (0.45, 0.65, 0.85)[layer]
    dur = float(np.clip(1.4 + 2.4 * (220 / f0) ** 0.5, 1.6, 4.2))
    t = np.arange(int(dur * SR)) / SR
    stiff = 3.0e-4 * (f0 / 220) ** 0.5
    tau1 = float(np.clip(2.6 * (220 / f0) ** 0.55, 0.7, 4.0))
    tilt = 0.36 - 0.20 * vel
    out = np.zeros_like(t)
    for k in range(1, 17):
        fk = k * f0 * np.sqrt(1 + stiff * k * k)
        if fk > 9000:
            break
        amp = k ** -1.0 * np.exp(-(k - 1) * tilt)
        tau = tau1 / (1 + 0.35 * (k - 1))
        env = 0.6 * np.exp(-t / (0.28 * tau)) + 0.4 * np.exp(-t / tau)
        cents = (-0.7, 0.8) if k <= 10 else (0.0,)
        for c in cents:
            out += amp / len(cents) * env * np.sin(2 * np.pi * fk * 2 ** (c / 1200) * t)
    thump = band_noise(np.random.default_rng(midi), dur, 80, 700) * np.exp(-t / 0.012)
    out = out * ramp(t, 0, 0.004) + 0.05 * vel * thump
    out *= 1 - ramp(t, dur - 0.08, 0.08)
    return out / np.abs(out).max()


@functools.cache
def pluck(midi: int, layer: int) -> np.ndarray:
    """A muted pluck: harmonic partials whose highs die within a few tens of ms."""
    f0 = hz(midi)
    vel = (0.55, 0.75, 1.0)[layer]
    t = np.arange(int(0.7 * SR)) / SR
    out = np.zeros_like(t)
    for k in range(1, 25):
        if k * f0 > 9000:
            break
        amp = k ** -1.0 * np.exp(-(k - 1) * (0.22 - 0.10 * vel))
        tau = 0.21 / (1 + 0.6 * (k - 1))
        out += amp * np.exp(-t / tau) * (np.sin(2 * np.pi * k * f0 * t)
                                         + 0.35 * np.sin(2 * np.pi * k * f0 * 1.004 * t + 1.0))
    pick = band_noise(np.random.default_rng(300 + midi), 0.7, 2500, 9000) * np.exp(-t / 0.002)
    out = out * np.minimum(1, t / 0.0015) + 0.06 * vel * pick
    out *= 1 - ramp(t, 0.62, 0.08)
    return out / np.abs(out).max()


def pad_note(midi: int, start: float, dur: float, attack: float, release: float,
             lfo_period: float, rng: np.random.Generator) -> np.ndarray:
    """Three detuned voices spread left, center and right; brightness drifts slowly."""
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    bright = 0.35 + 0.25 * np.sin(2 * np.pi * (start + t) / lfo_period)
    out = np.zeros((n, 2))
    for cents, pan in ((-7, -0.55), (0, 0.0), (7, 0.55)):
        f, ph = hz(midi) * 2 ** (cents / 1200), rng.random()
        voice = osc(PAD_DARK, f, n, ph) * (1 - bright) + osc(PAD_BRIGHT, f, n, ph) * bright
        out += voice[:, None] * pan_gains(pan)
    env = ramp(t, 0, attack) * (1 - ramp(t, dur, release))
    return out * env[:, None] / 3


def bass_note(midi: int, dur: float, soft: bool) -> np.ndarray:
    release = 0.35 if soft else 0.03
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    tab = SOFT_BASS_TAB if soft else BASS_TAB
    sig = osc(tab, hz(midi), n, 0.0)
    if soft:
        env = ramp(t, 0, 0.04) * (1 - ramp(t, dur, release))
    else:
        env = np.minimum(1, t / 0.003) * (0.75 + 0.25 * np.exp(-t / 0.08)) * (1 - ramp(t, dur, release))
    return sig * env


def riser(dur: float) -> np.ndarray:
    """Filtered noise that swells into the first downbeat."""
    t = np.arange(int(dur * SR)) / SR
    rng = np.random.default_rng(11)
    p = t / dur
    sig = band_noise(rng, dur, 400, 2500) * (1 - p) + band_noise(rng, dur, 2500, 10000) * p
    return sig * p ** 2.5


def pan_gains(pan: float) -> np.ndarray:
    th = (pan + 1) * np.pi / 4
    return np.array([np.cos(th), np.sin(th)]) * np.sqrt(2)


class Bus:
    def __init__(self, n: int):
        self.x = np.zeros((n, 2))

    def add(self, sig: np.ndarray, t: float, gain: float = 1.0, pan: float = 0.0) -> None:
        i = round(t * SR)
        sig = sig if sig.ndim == 2 else sig[:, None] * pan_gains(pan)[None, :]
        if i < 0:
            sig, i = sig[-i:], 0
        j = min(len(self.x), i + len(sig))
        if j > i:
            self.x[i:j] += sig[:j - i] * gain


# ---------- harmony ----------

def parse_key(key: str) -> tuple[int, bool]:
    k = key.strip().replace("♯", "#").replace("♭", "b")
    minor = k.endswith("m") and not k.endswith("maj") or k.lower().endswith("minor")
    letter = k[:1].upper()
    if letter not in NOTES:
        raise SystemExit(f"--key {key!r}: use a note name such as A, F#, Bb or F#m")
    acc = k[1:2]
    return (NOTES[letter] + (1 if acc == "#" else -1 if acc == "b" else 0)) % 12, minor


def progression(bars: int, minor: bool, loop: bool) -> list[tuple[int, tuple[int, ...]]]:
    cycle, end = (LOOP_MINOR, END_MINOR) if minor else (LOOP_MAJOR, END_MAJOR)
    chords = [cycle[i % 4] for i in range(bars)]
    if not loop:
        chords[-min(3, bars):] = end[-min(3, bars):]
    return chords


def chord_pcs(root: int, scale: tuple, degree: int, steps: tuple) -> list[int]:
    return [(root + scale[(degree + s) % 7] + 12 * ((degree + s) // 7)) % 12 for s in steps]


def voice(pcs: list[int], prev: list[int] | None, lo: int, hi: int) -> list[int]:
    """The voicing in [lo, hi] that moves least from the previous chord (voice leading),
    with no semitone clusters and no muddy close intervals low down."""
    pcs = list(dict.fromkeys(pc % 12 for pc in pcs))  # a repeated pitch class can never be voiced twice
    options = [[m for m in range(lo, hi + 1) if m % 12 == pc] for pc in pcs]
    best, best_cost = None, float("inf")
    for span in (16, 24, 127):  # widen the span only if a chord has no close voicing
        for combo in itertools.product(*options):
            notes = sorted(combo)
            if len(set(notes)) < len(notes) or notes[-1] - notes[0] > span:
                continue
            gaps = np.diff(notes)
            cost = 3.0 * np.sum(gaps == 1) + 1.5 * np.sum((gaps <= 3) & (np.array(notes[:-1]) < 55))
            if prev:
                cost += sum(abs(a - b) for a, b in zip(notes, prev))
            else:
                cost += abs(np.mean(notes) - (lo + hi) / 2)
            if cost < best_cost:
                best, best_cost = notes, cost
        if best is not None:
            return best
    raise ValueError(f"no voicing of pitch classes {pcs} fits {lo}..{hi}")


def nearest(pc: int, prev: int | None, lo: int, hi: int) -> int:
    target = prev if prev is not None else (lo + hi) / 2
    return min((m for m in range(lo, hi + 1) if m % 12 == pc), key=lambda m: (abs(m - target), m))


# ---------- arrangement ----------

def render(bpm: float = 120.0, bars: int = 16, key: str = "A", mood: str = "calm", seed: int = 1,
           loop: bool = False, first: float = 0.5, target: float = -14.0) -> np.ndarray:
    """Render the bed as float stereo (n, 2) at 48 kHz."""
    spb = 60.0 / bpm
    length = bars * 4 * spb
    tail = 0.0 if loop else 1.6
    total = first + length + tail
    n = int(np.ceil((total + 5.0) * SR))
    rng = np.random.default_rng(seed)
    root, minor = parse_key(key)
    scale = MINOR if minor else MAJOR
    chords = progression(bars, minor, loop)
    staged = not loop and bars >= 8   # parts enter over the first bars
    final = None if loop else bars - 1
    calm = mood == "calm"

    def at(b: float) -> float:  # time of beat b (fractional beats allowed), from time
        return first + b * spb

    def vel(base: float) -> float:
        return base * float(np.clip(1 + rng.normal(0, 0.07), 0.82, 1.18))

    def nudge(ms: float) -> float:
        return float(np.clip(rng.normal(0, ms), -2.5 * ms, 2.5 * ms)) / 1000

    stems = {k: Bus(n) for k in ("kick", "clap", "hats", "keys", "pad", "bass", "fx")}
    send = Bus(n)

    def place(stem: str, sig, t: float, gain: float, pan: float = 0.0, wet: float = 0.0) -> None:
        stems[stem].add(sig, t, gain, pan)
        if wet:
            send.add(sig, t, gain * wet, pan)

    pad_prev = keys_prev = None
    root_prev = bass_prev = top_prev = None
    for b, (degree, steps) in enumerate(chords):
        pcs = chord_pcs(root, scale, degree, steps)
        is_final = b == final
        bar_t = at(4 * b)
        lfo = 8 * 4 * spb

        # Pad: one sustained chord per bar, voice-led, legato into the next.
        if calm or not staged or b >= 4 or is_final:
            pad_prev = voice(pcs, pad_prev, 52 if calm else 55, 71 if calm else 74)
            pickup = b == 0 and not loop and first >= 0.2  # swell from 0 s into the first downbeat
            start = 0.0 if pickup else bar_t
            attack = first + 0.3 if pickup else (0.9 if calm else 0.35)
            hold = 4 * spb + (tail if is_final else 0) + (bar_t - start)
            for m in pad_prev:
                note = pad_note(m, start, hold, attack, 1.6 if is_final else 1.1, lfo, rng)
                place("pad", note, start, (0.19 if calm else 0.11) * vel(1.0), wet=0.5)

        # Bass: whole notes when calm; driving eighths with a lift into the next bar otherwise.
        if not staged or b >= 4 or is_final:
            bass_prev = nearest(pcs[0], bass_prev, *BASS_RANGE)
            if calm:
                dur = 4 * spb + (1.0 if is_final else 0.0)
                place("bass", bass_note(bass_prev, dur, True), bar_t, 0.21 * vel(1.0))
            elif is_final:
                place("bass", bass_note(bass_prev, 2 * spb, False), bar_t, 0.43)
            else:
                for e in range(8):
                    m = bass_prev + (12 if e == 7 else 0)
                    place("bass", bass_note(m, 0.75 * spb / 2, False), at(4 * b + e / 2),
                          0.43 * vel(1.0 if e % 2 else 0.85))

        if calm:
            # Felt piano: root below, then up and down the voice-led chord in eighths.
            root_prev = nearest(pcs[0], root_prev, 40, 51)
            keys_prev = voice(pcs, keys_prev, 57, 79)
            line = [root_prev, *keys_prev]
            if is_final:
                for i, m in enumerate(line):  # a rolled final chord that rings out
                    place("keys", piano(m, 1), bar_t + 0.03 * i, 0.63 * vel(0.9), (m - 64) / 40, 0.35)
            else:
                accents = (0.95, 0.6, 0.75, 0.6, 0.85, 0.6, 0.72, 0.58)
                for e, i in enumerate((0, 1, 2, 3, 4, 3, 2, 1)):
                    m, a = line[i], accents[e]
                    layer = 2 if a >= 0.85 else 1 if a >= 0.7 else 0
                    sig = piano(m, layer)
                    # The damper lifts at the chord change.
                    keep = int((4 * spb - e * spb / 2 + 0.3) * SR)
                    sig = sig[:keep] * (1 - ramp(np.arange(min(keep, len(sig))) / SR, keep / SR - 0.3, 0.3))
                    place("keys", sig, at(4 * b + e / 2) + (nudge(2.0) if e else 0.0), 0.63 * vel(a), (m - 64) / 40, 0.35)
            # A slow top line: one high chord tone every other bar, moving by step where it can.
            if (not staged or b >= 4) and (b % 2 == 1 or is_final):
                tops = [m for m in range(74, 87) if m % 12 in pcs]
                if is_final:
                    tops = [m for m in tops if m % 12 == pcs[0]] or tops
                top_prev = min(tops, key=lambda m: (abs(m - (top_prev or 81)), m))
                place("keys", piano(top_prev, 1), bar_t + (0.12 if is_final else 0) + nudge(2.0),
                      0.30 * vel(1.0), 0.2, 0.45)
        else:
            # Muted pluck ostinato on a 3-3-2 sixteenth pattern, with two soft ghost notes.
            keys_prev = voice(pcs, keys_prev, 57, 76)
            if is_final:
                for i, m in enumerate(keys_prev):
                    place("keys", pluck(m, 2), bar_t + 0.012 * i, 0.45, 0.0, 0.35)
            else:
                hits = ((0, 0, 2), (3, 2, 1), (6, 3, 1), (8, 1, 2), (11, 2, 1), (14, 3, 1), (7, 0, 0), (15, 0, 0))
                for step, i, layer in hits:
                    gain = (0.28, 0.40, 0.50)[layer]
                    pan = (-0.15, 0.15)[step % 2]
                    place("keys", pluck(keys_prev[i], layer), at(4 * b + step / 4) + nudge(1.5),
                          gain * vel(1.0), pan, 0.25)

        # Drums.
        for beat in range(1 if is_final else 4):
            t = at(4 * b + beat)  # exactly on the grid: the downbeats are measured against these
            if calm and beat in (0, 2):
                place("kick", kick("calm"), t, 0.30 * (1.0 if beat == 0 else 0.82), wet=0.08)
            elif not calm:
                place("kick", kick("drive"), t, 0.64)
                if beat in (1, 3) and (not staged or b >= 2):
                    place("clap", clap(), t, 1.05 * vel(1.0), wet=0.35)
            if is_final:
                continue
            if calm and (not staged or b >= 2):
                swing = 0.06 * spb / 4
                for s, a in enumerate((0.35, 0.22, 0.75, 0.3)):
                    place("hats", shaker(int(rng.integers(4))), at(4 * b + beat + s / 4) + (swing if s % 2 else 0)
                          + nudge(2.0), 0.26 * vel(a), 0.35, 0.2)
            elif not calm:
                swing = 0.04 * spb / 4
                for s, a in enumerate((0.0, 0.3, 1.0, 0.35)):
                    ghost = s % 2 == 1
                    if a == 0 or (ghost and staged and b < 2):
                        continue
                    t = at(4 * b + beat + s / 4) + (swing if ghost else 0) + nudge(1.5)
                    if s == 2 and beat == 3 and b % 2 == 1:
                        place("hats", hat(int(rng.integers(4)), True), t, 0.22 * vel(1.0), 0.3, 0.1)
                    else:
                        place("hats", hat(int(rng.integers(4))), t, 0.32 * vel(a), 0.25, 0.1)

    if not calm and not loop and first >= 0.25:
        dur = min(first, 4 * spb)
        place("fx", riser(dur), first - dur, 0.44, wet=0.3)

    # Sidechain: when driving, the bass and pad duck under each kick, so the low end pumps.
    if not calm:
        t = np.arange(int(0.4 * SR)) / SR
        shape = np.minimum(1, t / 0.003) * np.exp(-np.maximum(t - 0.003, 0) / 0.09)
        duck = np.zeros(n + len(shape))
        for k in range(bars * 4 - (3 if final is not None else 0)):
            i = round(at(k) * SR)
            duck[i:i + len(shape)] = np.maximum(duck[i:i + len(shape)], shape)
        duck = duck[:n]
        stems["bass"].x *= (1 - 0.65 * duck)[:, None]
        stems["pad"].x *= (1 - 0.40 * duck)[:, None]
        stems["keys"].x *= (1 - 0.12 * duck)[:, None]

    dry = sum(s.x for s in stems.values())
    wet_in = filt(filt(send.x.mean(axis=1), [biquad("hp", 220)]), [biquad("lp", 6500)])
    wet = reverb(wet_in, 1.6 if calm else 1.0)[:n] * (0.40 if calm else 0.28)
    mix = dry + wet

    if loop:
        period = round(length * SR)
        folded = np.zeros((period, 2))
        for s in range(0, n, period):
            seg = mix[s:s + period]
            folded[:len(seg)] += seg
        mix = folded
    else:
        mix = mix[:round(total * SR)]
    mix = filt(mix, [biquad("hp", 60)], circular=loop)
    mix = master(mix, target, circular=loop)
    if not loop:
        t = np.arange(len(mix)) / SR
        mix *= (1 - ramp(t, total - 0.45, 0.45))[:, None]
        if first < 0.01:
            mix *= ramp(t, 0, 0.003)[:, None]
    return mix


def beats_of(bpm: float, bars: int, first: float, loop: bool) -> dict:
    """window.BEATS for the bed: every beat of the music from the first downbeat."""
    times = beat_grid(bpm, first, bars * 4)
    if loop:  # beats past the loop point wrap to the start, before `first`
        times = [t for t in times if t < bars * 4 * 60.0 / bpm - 1e-9]
    return {"bpm": round(bpm, 6), "first": round(first, 4),
            "beats": [round(t, 4) for t in times], "downbeats": [round(t, 4) for t in times[::4]]}


def write_beats(path: Path, beats: dict, note: str) -> None:
    if path.suffix == ".json":
        path.write_text(json.dumps(beats, indent=1))
    else:
        path.write_text(f"// Generated by video/scripts/bed.py ({note})\nwindow.BEATS = {json.dumps(beats)};\n")


def write_wav(path: Path, x: np.ndarray, seed: int = 0) -> None:
    rng = np.random.default_rng(seed)
    dither = (rng.random(x.shape) - rng.random(x.shape)) / 32767  # TPDF, one step
    pcm = np.clip(np.round((x + dither) * 32767), -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", type=Path, required=True, help="output .wav (48 kHz stereo)")
    ap.add_argument("--bpm", type=float, default=120.0)
    ap.add_argument("--bars", type=int, default=16, help="bars of 4 beats")
    ap.add_argument("--key", default="A", help="A, F#, Bb ... add m for minor (F#m)")
    ap.add_argument("--mood", choices=("calm", "drive"), default="calm")
    ap.add_argument("--beats", type=Path, help="write the beat grid here (beats.js or .json)")
    ap.add_argument("--seed", type=int, default=1, help="humanized velocity and timing")
    ap.add_argument("--loop", action="store_true", help="exactly --bars long; the end flows into the start")
    ap.add_argument("--first", type=float, default=0.5, help="time of the first downbeat (s)")
    ap.add_argument("--lufs", type=float, default=-14.0, help="integrated loudness of the file")
    args = ap.parse_args()
    if not 40 <= args.bpm <= 220 or args.bars < 1 or args.first < 0:
        raise SystemExit("--bpm must be 40-220, --bars at least 1, --first at least 0")

    mix = render(args.bpm, args.bars, args.key, args.mood, args.seed, args.loop, args.first, args.lufs)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_wav(args.out, mix, args.seed)
    _, minor = parse_key(args.key)
    note = f"{args.mood}, {args.bpm:g} BPM, {args.key} {'minor' if minor else 'major'}, seed {args.seed}" \
           + (", loop" if args.loop else "")
    tp = 20 * np.log10(peak_envelope(mix).max() + 1e-12)
    print(f"{args.out}  {len(mix) / SR:.2f}s  {note}  {lufs(mix):.1f} LUFS  {tp:.1f} dBTP  "
          f"below 60 Hz {low_share(mix):.1%}")
    if args.beats:
        beats = beats_of(args.bpm, args.bars, args.first, args.loop)
        args.beats.parent.mkdir(parents=True, exist_ok=True)
        write_beats(args.beats, beats, note)
        print(f"{args.beats}  {len(beats['beats'])} beats, first downbeat {beats['first']}s")


if __name__ == "__main__":
    main()
