#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""A free draft take in the computer's own voice, with word times that match it.

narrate.py --scratch uses this when there is no ElevenLabs key or no credits to spend:

    engine = Engine.find(name=None, voice=None, rate=150, language="en")
    words = engine.take("Every frame is drawn in code.", Path("audio/s01.mp3"))

Engines: macOS `say`; on Linux, `espeak-ng` or the older `espeak`.

The word times come from a forced alignment, not a guess. The same voice reads the script a
second time with a silence after every word, so each word's sound is known exactly in that
reference. Dynamic time warping over log-mel spectra then maps the reference onto the real
take frame by frame, and each word's edges come with it. Against the engines' own word
markers, word starts land within about 25 ms (median) and 50 ms (90th percentile).
"""

import hashlib
import html
import math
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np

SR = 16000            # analysis sample rate
HOP, WIN = 160, 400   # 10 ms frames over 25 ms windows
APART_MS = 300        # the silence after each word in the reference reading
MAX_CELLS = 2e7       # warping-grid cells (80 MB); longer takes are warped at a coarser step
PAUSE_FRAMES = 8      # a silence longer than 80 ms is a pause between words, not a stop consonant
SNAP_FRAMES = 5       # at most this much of a word on the far side of a pause is a warping slip

# Voices that ship with macOS, by language. Others fall back to the first voice `say` lists.
SAY_VOICES = {"en": ["Samantha", "Alex", "Daniel", "Karen", "Moira"], "es": ["Mónica", "Paulina"],
              "fr": ["Thomas", "Amélie"], "de": ["Anna"], "it": ["Alice"], "pt": ["Luciana", "Joana"],
              "ja": ["Kyoko"], "zh": ["Tingting", "Meijia"], "ko": ["Yuna"]}

NO_ENGINE = ("narrate.py --scratch needs a speech engine on this computer: `say` (built into macOS), "
             "or espeak-ng or espeak on Linux (sudo apt-get install espeak-ng). Neither was found.")


def spoken(token: str) -> bool:
    """A token with letters or digits. A lone dash or symbol makes no sound of its own."""
    return any(c.isalnum() for c in token)


@dataclass
class Engine:
    name: str           # say | espeak-ng | espeak
    voice: str | None   # None: the engine's default voice
    rate: int           # words per minute

    @classmethod
    def find(cls, name: str | None, voice: str | None, rate: int, language: str = "en") -> "Engine":
        if name and not shutil.which(name):
            raise SystemExit(f"--scratch-engine {name}: not found. {NO_ENGINE}")
        if not name:
            # Some Linux desktops ship an unrelated `say` (GNUstep), so `say` counts only on macOS.
            found = [e for e in ("say", "espeak-ng", "espeak") if shutil.which(e) and (e != "say" or sys.platform == "darwin")]
            if not found:
                raise SystemExit(NO_ENGINE)
            name = found[0]
        return cls(name, voice or default_voice(name, language), rate)

    @property
    def label(self) -> str:
        return f"{self.name} {self.voice or 'default voice'}, {self.rate} wpm"

    def digest(self, text: str) -> str:
        return hashlib.sha256(f"scratch|{self.name}|{self.voice}|{self.rate}|{text}".encode()).hexdigest()[:16]

    def command(self, text: str, out: Path, apart: bool = False) -> list[str]:
        """The command that reads `text` into an AIFF (say) or WAV (espeak) file.
        apart=True pauses after every word."""
        groups = word_groups(text.split())
        src = out.with_suffix(".txt")
        if self.name == "say":
            src.write_text(f" [[slnc {APART_MS}]] ".join(" ".join(g) for g in groups) if apart else text)
            cmd = ["say", "-r", str(self.rate), "-o", str(out), "-f", str(src)]
        else:
            if apart:
                pause = f' <break time="{APART_MS}ms"/> '
                src.write_text("<speak>" + pause.join(html.escape(" ".join(g)) for g in groups) + "</speak>")
            else:
                src.write_text(text)
            cmd = [self.name, "-s", str(self.rate), "-w", str(out), "-f", str(src)] + (["-m"] if apart else [])
        return cmd[:1] + (["-v", self.voice] if self.voice else []) + cmd[1:]

    def take(self, text: str, mp3: Path) -> list[dict]:
        """Record `text` to `mp3` and return its word times, in timings.json's shape."""
        ext = ".aiff" if self.name == "say" else ".wav"
        with tempfile.TemporaryDirectory() as tmp:
            take, apart = Path(tmp) / f"take{ext}", Path(tmp) / f"apart{ext}"
            runs = [(cmd, subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True))
                    for cmd in (self.command(text, take), self.command(text, apart, apart=True))]
            for (cmd, proc), out in zip(runs, (take, apart)):  # both readings run at once
                err = proc.communicate()[1]
                if proc.returncode or not out.exists():
                    raise SystemExit(f"{self.name} failed ({' '.join(cmd)}): {err.strip() or 'no audio written'}")
            words = align(decode(take), decode(apart), text.split())
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(take), "-ar", "44100", "-ac", "1",
                            "-b:a", "192k", str(mp3)], check=True)
        return words


def default_voice(engine: str, language: str) -> str | None:
    if engine != "say":
        return "en-us" if language == "en" else language
    listing = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    voices = re.findall(r"^(.*\S)\s+([a-z]{2,3})_\w+\s+#", listing, re.M)
    names = [n for n, lang in voices if lang == language]  # "Samantha (English (US))", "Karen", ...
    plain = {re.sub(r"\s*\(.*\)$", "", n) for n in names}
    return next((v for v in SAY_VOICES.get(language, []) if v in plain), names[0] if names else None)


def word_groups(tokens: list[str]) -> list[list[str]]:
    """Spoken tokens, each with the silent tokens ("—") that follow it. Leading silent tokens are dropped."""
    groups: list[list[str]] = []
    for t in tokens:
        if spoken(t):
            groups.append([t])
        elif groups:
            groups[-1].append(t)
    return groups


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def mel_bank(bands: int = 26, n_fft: int = 512, lo: float = 80.0, hi: float = 7600.0) -> np.ndarray:
    mel = np.linspace(2595 * np.log10(1 + lo / 700), 2595 * np.log10(1 + hi / 700), bands + 2)
    bins = np.floor((n_fft + 1) * 700 * (10 ** (mel / 2595) - 1) / SR).astype(int)
    bank = np.zeros((bands, n_fft // 2 + 1))
    for k in range(bands):
        a, b, c = bins[k:k + 3]
        bank[k, a:b] = (np.arange(a, b) - a) / max(1, b - a)
        bank[k, b:c] = (c - np.arange(b, c)) / max(1, c - b)
    return bank


MEL = mel_bank()


def analyze(x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per 10 ms frame: whether it has sound, and its log-mel spectrum."""
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (0, WIN)), WIN)[::HOP]
    level = 10 * np.log10(np.mean(frames.astype(np.float64) ** 2, axis=1) + 1e-12)
    # Synthetic speech pauses are near digital silence; stop closures inside words stay well above this.
    sound = level > max(np.percentile(level, 2) + 12, np.percentile(level, 95) - 45)
    power = np.abs(np.fft.rfft(frames * np.hanning(WIN), 512, axis=1)) ** 2
    return sound, np.log(power @ MEL.T + 1e-8)


def word_spans(sound: np.ndarray, weights: list[int]) -> list[tuple[int, int]]:
    """Frame ranges of the words in the reading with a pause after each: split at its longest silences."""
    count = len(weights)
    edges = np.flatnonzero(np.diff(np.r_[0, sound.astype(np.int8), 0]))
    on, off = edges[::2], edges[1::2]
    if len(on) >= count:
        cuts = np.sort(np.argsort(on[1:] - off[:-1], kind="stable")[len(on) - count:])
        return [(on[a], off[b]) for a, b in zip(np.r_[0, cuts + 1], np.r_[cuts, len(on) - 1])]
    # Two words ran together (rare): share the sound by letters instead.
    frames = np.flatnonzero(sound)
    bounds = np.round(np.cumsum([0, *weights]) / sum(weights) * len(frames)).astype(int)
    return [(frames[a], frames[max(a, b - 1)] + 1) for a, b in zip(bounds, bounds[1:])]


def warp(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Dynamic time warping: the cheapest monotonic path through frame pairs, as (i, j) rows."""
    a = a - a.mean(axis=0)
    b = b - b.mean(axis=0)
    a /= np.linalg.norm(a, axis=1, keepdims=True) + 1e-9
    b /= np.linalg.norm(b, axis=1, keepdims=True) + 1e-9
    n, m = len(a), len(b)
    cost = np.full((n + 1, m + 1), np.inf, dtype=np.float32)
    cost[0, 0] = 0
    for k in range(2, n + m + 1):  # one anti-diagonal at a time, so each step is a single numpy call
        i = np.arange(max(1, k - m), min(n, k - 1) + 1)
        j = k - i
        d = 1 - np.einsum("ij,ij->i", a[i - 1], b[j - 1])  # cosine distance
        cost[i, j] = d + np.minimum(np.minimum(cost[i - 1, j - 1], cost[i - 1, j]), cost[i, j - 1])
    path, i, j = [], n, m
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        step = int(np.argmin((cost[i - 1, j - 1], cost[i - 1, j], cost[i, j - 1])))
        i, j = (i - 1, j - 1) if step == 0 else (i - 1, j) if step == 1 else (i, j - 1)
    return np.array(path[::-1])


def align(take: np.ndarray, apart: np.ndarray, tokens: list[str]) -> list[dict]:
    """Word times in `take` (16 kHz samples), found by warping the word-by-word reading onto it."""
    groups = word_groups(tokens)
    if not groups:
        return [{"word": t, "start": 0.0, "end": 0.0} for t in tokens]
    sound_t, mel_t = analyze(take)
    sound_r, mel_r = analyze(apart)
    vt, vr = np.flatnonzero(sound_t), np.flatnonzero(sound_r)
    if not len(vt) or not len(vr):
        raise SystemExit("the scratch voice wrote silence; try another --scratch-voice")
    spans = word_spans(sound_r, [sum(c.isalnum() for c in " ".join(g)) or 1 for g in groups])
    step = max(1, math.ceil(math.sqrt(len(vt) * len(vr) / MAX_CELLS)))
    path = warp(mel_t[vt][::step], mel_r[vr][::step]) * step
    # For each reference frame with sound, the first and last take frame the path pairs with it.
    first = np.full(len(vr), len(vt) - 1)
    last = np.zeros(len(vr), dtype=int)
    np.minimum.at(first, np.minimum(path[:, 1], len(vr) - 1), np.minimum(path[:, 0], len(vt) - 1))
    np.maximum.at(last, np.minimum(path[:, 1], len(vr) - 1), np.minimum(path[:, 0], len(vt) - 1))
    first = np.minimum.accumulate(first[::-1])[::-1]  # coarse steps leave gaps; fill them in order
    last = np.maximum.accumulate(last)

    # The warp sees only frames with sound, so it can slip a frame or two across a pause, which
    # moves a word's edge by the whole pause. A sliver of a word on the far side of a pause is
    # that slip: the word starts after the pause, or ends before it.
    resume = np.flatnonzero(np.diff(vt) > PAUSE_FRAMES) + 1  # first frame after each pause

    def seconds(frame: int) -> float:
        return (frame * HOP + WIN / 2) / SR

    end_of_take = len(take) / SR
    times = []
    for f0, f1 in spans:
        r0 = min(int(np.searchsorted(vr, f0)), len(vr) - 1)
        r1 = max(int(np.searchsorted(vr, f1)) - 1, r0)
        start, end = int(first[r0]), int(last[r1])
        for q in resume[(resume > start) & (resume <= end)]:
            before, after = q - start, end - q + 1
            if before <= SNAP_FRAMES and before < after:
                start = q
            elif after <= SNAP_FRAMES and after < before:
                end = q - 1
        times.append([seconds(vt[start]), min(seconds(vt[end]) + HOP / SR, end_of_take)])
    for k in range(len(times)):  # words never overlap and never run backwards
        if k:
            times[k][0] = max(times[k][0], times[k - 1][1])
        if k + 1 < len(times):
            times[k][1] = min(times[k][1], times[k + 1][0])
        times[k][1] = max(times[k][1], times[k][0])
    lead = tokens[:len(tokens) - sum(map(len, groups))]
    words = [{"word": t, "start": round(times[0][0], 3), "end": round(times[0][0], 3)} for t in lead]
    for (start, end), group in zip(times, groups):
        words.append({"word": group[0], "start": round(start, 3), "end": round(end, 3)})
        words += [{"word": t, "start": round(end, 3), "end": round(end, 3)} for t in group[1:]]
    return words
