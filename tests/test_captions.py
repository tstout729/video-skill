"""Caption lines break where a reader expects. Run: python3 tests/test_captions.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "skills/video/scripts"))
from assemble import caption_lines  # noqa: E402


def words(text: str) -> list[dict]:
    return [{"word": w, "start": i * 0.3, "end": i * 0.3 + 0.25} for i, w in enumerate(text.split())]


def lines(text: str) -> list[str]:
    return [line for _, _, line in caption_lines(words(text))]


def test_keeps_names_together() -> None:
    out = lines("This is the video skill, a free, open-source skill for coding agents like Claude Code and Codex.")
    assert out == ["This is the video skill,", "a free, open-source skill", "for coding agents like Claude Code and Codex."], out
    assert not any(line.endswith("Claude") for line in out), out


def test_breaks_after_a_comma() -> None:
    out = lines("Everything happens at once, and nothing stays still long enough to read.")
    assert out == ["Everything happens at once,", "and nothing stays still long enough to read."], out


def test_short_sentences_stay_whole() -> None:
    assert lines("One change at a time. Each step holds.") == ["One change at a time.", "Each step holds."]


def test_every_word_kept_in_order() -> None:
    text = ("Your agent writes the script, records the voice, and animates every frame in code, "
            "in time with the narrator, while it checks its own pacing frame by frame for you.")
    assert " ".join(lines(text)) == text


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
