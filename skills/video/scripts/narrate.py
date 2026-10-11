# /// script
# requires-python = ">=3.11"
# dependencies = ["requests", "num2words"]
# ///
"""Generate per-scene narration with ElevenLabs and verify each take with Scribe.

Reads <project>/narration.json:
  {"voice_id": "...", "model_id": "eleven_v4", "scenes": [{"id": "s01", "text": "..."}]}
Writes <project>/audio/<id>.mp3 and <project>/audio/timings.json:
  {"s01": {"duration": 12.3, "words": [{"word": "Every", "start": 0.12, "end": 0.40}, ...]}}

Each scene is one unedited take (splicing sentences sounds robotic). eleven_v4 sometimes
repeats or drops a phrase, so every take is transcribed and retried when it does not match.
Re-running skips scenes whose text is unchanged; pass --force to regenerate.
"""

import argparse
import base64
import difflib
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import requests

API = "https://api.elevenlabs.io/v1"
ENV_FILE = Path.home() / ".config/elevenlabs/env"


def api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key and ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith("ELEVENLABS_API_KEY="):
                key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not key:
        # A cloud sandbox can add the key through its proxy instead; otherwise the API answers 401.
        print("No ELEVENLABS_API_KEY in the environment or ~/.config/elevenlabs/env; "
              "continuing in case a proxy adds it.", file=sys.stderr)
    return key or ""


def auth(key: str) -> dict:
    return {"xi-api-key": key} if key else {}


def spell_numbers(text: str, lang: str) -> str:
    """Write digits as words ("71%" -> "seventy one percent"), as the script spells them.

    The transcriber writes numbers as digits, so without this a correct take of "seventy-one"
    scores as a mismatch and is recorded again for nothing.
    """
    from num2words import num2words

    def say(m: re.Match) -> str:
        num, pct = m.group(1).replace(",", ""), m.group(2)
        try:
            words = num2words(float(num) if "." in num else int(num), lang=lang)
        except (NotImplementedError, ValueError, OverflowError):
            return m.group(0)
        return words + (" percent" if pct and lang == "en" else "")

    return re.sub(r"(?<![\w.])(\d+(?:,\d{3})*(?:\.\d+)?)(%?)", say, text)


def normalize(text: str, lang: str = "en") -> list[str]:
    """Words without case, accents or punctuation, so any language compares fairly."""
    text = spell_numbers(text, lang).replace(" and ", " ")
    # "zero point five" and "point five" are the same number said two ways.
    text = re.sub(r"\bzero point\b", "point", text, flags=re.IGNORECASE)
    text = unicodedata.normalize("NFKD", text.lower().replace("-", " ").replace("\u2019", "'"))
    words = re.findall(r"[\w']+", "".join(c for c in text if not unicodedata.combining(c)))
    # Scripts written without spaces (Thai, Lao, Myanmar, Khmer, Japanese, Chinese) compare by character.
    if re.search(r"[\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff\u3040-\u30ff\u3400-\u9fff]", text):
        return [c for w in words for c in w]
    return words


def words_from_alignment(alignment: dict) -> list[dict]:
    words, current, start, end = [], "", None, None
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    for ch, s, e in zip(chars, starts, ends):
        if ch.isspace():
            if current:
                words.append({"word": current, "start": start, "end": end})
            current, start = "", None
            continue
        if start is None:
            start = s
        current += ch
        end = e
    if current:
        words.append({"word": current, "start": start, "end": end})
    return words


def synthesize(key: str, cfg: dict, text: str) -> tuple[bytes, list[dict]]:
    body = {
        "text": text,
        "model_id": cfg.get("model_id", "eleven_v4"),
        "voice_settings": cfg.get("voice_settings", {"stability": 0.5, "similarity_boost": 0.75}),
    }
    r = requests.post(
        f"{API}/text-to-speech/{cfg['voice_id']}/with-timestamps?output_format=mp3_44100_192",
        headers=auth(key),
        json=body,
        timeout=300,
    )
    r.raise_for_status()
    data = r.json()
    return base64.b64decode(data["audio_base64"]), words_from_alignment(data["alignment"])


def transcribe(key: str, audio: bytes) -> str:
    r = requests.post(
        f"{API}/speech-to-text",
        headers=auth(key),
        data={"model_id": "scribe_v1"},
        files={"file": ("take.mp3", audio, "audio/mpeg")},
        timeout=300,
    )
    r.raise_for_status()
    return r.json()["text"]


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--only", nargs="*", help="scene ids to (re)generate")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--min-ratio", type=float, default=0.93)
    parser.add_argument("--tries", type=int, default=4)
    args = parser.parse_args()

    cfg = json.loads((args.project / "narration.json").read_text())
    audio_dir = args.project / "audio"
    audio_dir.mkdir(exist_ok=True)
    timings_path = audio_dir / "timings.json"
    timings = json.loads(timings_path.read_text()) if timings_path.exists() else {}
    key = api_key()

    for scene in cfg["scenes"]:
        sid, text = scene["id"], scene["text"]
        digest = hashlib.sha256(f"{cfg['voice_id']}|{cfg.get('model_id')}|{text}".encode()).hexdigest()[:16]
        mp3 = audio_dir / f"{sid}.mp3"
        if args.only and sid not in args.only:
            continue
        if not args.force and mp3.exists() and timings.get(sid, {}).get("digest") == digest:
            print(f"{sid}: unchanged")
            continue
        best = None
        for attempt in range(1, args.tries + 1):
            audio, words = synthesize(key, cfg, text)
            heard = transcribe(key, audio)
            lang = cfg.get("language", "en")
            ratio = difflib.SequenceMatcher(None, normalize(text, lang), normalize(heard, lang)).ratio()
            print(f"{sid}: take {attempt} match {ratio:.3f}")
            if best is None or ratio > best[0]:
                best = (ratio, audio, words, heard)
            if ratio >= args.min_ratio:
                break
        ratio, audio, words, heard = best
        if ratio < args.min_ratio:
            print(f"{sid}: WARNING best take only {ratio:.3f}. Heard: {heard}")
        mp3.write_bytes(audio)
        timings[sid] = {"digest": digest, "duration": duration(mp3), "match": round(ratio, 3), "words": words}
        timings_path.write_text(json.dumps(timings, indent=1))

    total = sum(t["duration"] for t in timings.values())
    print(f"total narration {total:.1f}s")


if __name__ == "__main__":
    main()
