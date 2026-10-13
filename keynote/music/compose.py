# /// script
# dependencies = []
# ///
"""Compose the keynote film's score with ElevenLabs Music, one chunk per music section.

    uv run --script keynote/music/compose.py --out take.mp3 [--seed 1] [--model music_v2_5]

Bars at 110 BPM (2181.818 ms). Chunk lengths are exact multiples of the bar, so the drops land on
the film's bar lines: intro+build 4, drop 10, drop 6, break+build 4, drop 5, end 3.5 (70.91 s).
The key is read from ELEVENLABS_API_KEY and never printed. About 1,065 credits a take.

The styles describe the sound measured in Apple's 2025-26 product films (log.md, round 5) without
naming them: ElevenLabs refuses a plan that names a brand or artist ("copyrighted_material_detected").
The film's score is take 1 (seed 1), composed before the last two chunks' wording was made more
explicit; takes 2 and 3 with the wording below still put their first drop on bars 8 and 6. A take
does not reliably follow the plan, so measure it bar by bar before music/edit.py cuts it.
"""
import argparse, json, os, sys, urllib.request

BAR = 4 * 60000 / 110
ms = lambda bars: round(bars * BAR)

CORE = ["premium tech product launch film music", "sleek electronic hip-hop", "deep 808 sub-bass",
        "punchy tight kick", "crisp finger snaps on 2 and 4", "crisp 16th-note hi-hats with short rolls",
        "dark plucked synth hook", "polished, minimal, confident", "110 BPM", "E minor", "instrumental"]
NEG = ["vocals", "lyrics", "singing", "rap", "EDM supersaw", "four-on-the-floor house beat",
       "orchestra", "piano ballad", "lo-fi", "acoustic guitar"]

CHUNKS = [
    (4, "[Intro]\n{quiet tonal opening: a soft filtered synth motif over an airy pad, no drums}\n"
        "{in the last two seconds a rising sweep and a fast hi-hat roll build tension}\n"
        "{complete silence for the final half second, right before the drop}",
     ["quiet tonal intro", "filtered synth", "airy pad", "rising sweep", "tension", "110 BPM", "E minor", "instrumental"]),
    (10, "[Drop]\n{a big hit on the very first beat: the deep 808 sub-bass and punchy kick enter together}\n"
         "{snaps on 2 and 4, crisp hi-hats, the dark plucked synth hook}\n{steady, confident, driving}",
     CORE),
    (6, "[Drop 2]\n{an impact hit on the first beat; the hook doubles an octave up}\n"
        "{hi-hat triplet rolls, extra percussion, more energy}",
     CORE + ["higher energy", "octave-up hook"]),
    (4, "[Breakdown]\n{drums and 808 drop out: only a warm pad and the filtered hook, quiet, room for a spoken voice}\n"
        "{in the last two seconds a short riser and snare roll}\n{silence for the final half second}",
     ["minimal breakdown", "no drums", "warm pad", "filtered hook", "quiet", "riser", "110 BPM", "E minor", "instrumental"]),
    (5, "[Final drop]\n{the biggest hit on the first beat: full 808, kick, snaps, hats and hook at full energy}\n"
        "{the full beat plays continuously through all five bars, with no gaps and no silence}",
     CORE + ["biggest energy", "final drop", "continuous full beat"]),
    (3.5, "[Ending]\n{exactly one final deep impact with a sub-bass boom on the very first beat}\n"
          "{then the synth chord rings out steadily and fades to silence over the last two seconds, no more drums}",
     ["final impact", "sub-bass boom", "ringing synth chord", "fade out", "no drums", "E minor", "instrumental"]),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--model", default="music_v2_5")
    a = ap.parse_args()
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set")
    plan = {"chunks": [{"text": text, "duration_ms": ms(bars), "positive_styles": pos, "negative_styles": NEG}
                       for bars, text, pos in CHUNKS]}
    body = {"composition_plan": plan, "model_id": a.model, "seed": a.seed}
    total = sum(c["duration_ms"] for c in plan["chunks"])
    req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = r.read()
            song = {k: v for k, v in r.headers.items() if "song" in k.lower()}
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:800]}")
    open(a.out, "wb").write(data)
    print(f"{a.out}  {len(data) / 1e6:.1f} MB  plan {total} ms  model {a.model}  seed {a.seed}  {song}")


if __name__ == "__main__":
    main()
