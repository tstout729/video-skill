"""Manim base class that times animations to the narration's word timings.

Use in a video file:

    from narrated import Narrated, kit
    class S01(Narrated):
        SCENE_ID = "s01"
        def construct(self):
            self.play_at("shower", FadeIn(card))   # starts as the narrator says "shower"
            self.finish()                          # holds until the narration ends

Cues search forward from the previous cue, so repeated words resolve in order.
EXPLAINER_DIR points at the project folder holding audio/timings.json (default: cwd).
"""

import json
import os
import re
import unicodedata
from pathlib import Path

from manim import (
    DOWN, LEFT, ORIGIN, RIGHT, UP, UL, Circle, Dot, FadeIn, Line, RoundedRectangle,
    Scene, Text, VGroup, config,
)


def _norm(word: str) -> str:
    # Strip accents first, so a cue matches however the transcript spells it ("huésped" == "huesped").
    word = "".join(c for c in unicodedata.normalize("NFKD", word) if not unicodedata.combining(c))
    return re.sub(r"[\W_]", "", word.lower())  # letters and digits of any script


def _register_fonts() -> None:
    """Make the bundled fonts visible to Pango, so a Mac and a Linux sandbox render the same."""
    import manimpango
    for ttf in sorted((Path(__file__).resolve().parent.parent / "assets/fonts").glob("*.ttf")):
        manimpango.register_font(str(ttf))


_register_fonts()


class Narrated(Scene):
    SCENE_ID: str = ""
    LEAD = 0.15  # start visuals slightly before the word lands

    def setup(self):
        project = Path(os.environ.get("EXPLAINER_DIR", "."))
        timing = json.loads((project / "audio/timings.json").read_text())[self.SCENE_ID]
        self.words = timing["words"]
        self.narration = timing["duration"]
        self._cursor = 0
        self.camera.background_color = kit.BG

    @property
    def now(self) -> float:
        return self.renderer.time

    def at(self, phrase: str) -> float:
        """Start time of the next occurrence of `phrase` after the previous cue."""
        target = [_norm(w) for w in re.split(r"[\s-]+", phrase) if _norm(w)]
        if not target:
            raise ValueError(f"cue {phrase!r} has no letters or digits")
        # Split hyphenated words ("eighty-nine") so a cue can name either part.
        tokens = [(_norm(part), i) for i, w in enumerate(self.words)
                  for part in re.split(r"-+", w["word"]) if _norm(part)]
        for k in range(len(tokens) - len(target) + 1):
            index = tokens[k][1]
            if index >= self._cursor and [t for t, _ in tokens[k:k + len(target)]] == target:
                self._cursor = index + 1
                return self.words[index]["start"]
        raise ValueError(f"{self.SCENE_ID}: cue {phrase!r} not found after word {self._cursor}")

    def until(self, cue, lead: float | None = None):
        t = self.at(cue) if isinstance(cue, str) else float(cue)
        t -= self.LEAD if lead is None else lead
        if t - self.now > 1 / config.frame_rate:
            self.wait(t - self.now)

    def play_at(self, cue, *animations, run_time: float = 1.0, lead: float | None = None, **kwargs):
        self.until(cue, lead)
        self.play(*animations, run_time=run_time, **kwargs)

    def finish(self, tail: float = 0.8):
        self.until(self.narration + tail, lead=0)


class kit:
    """Shared look: dark 3Blue1Brown-style palette, Nunito Sans."""

    BG = "#0E1117"
    INK = "#ECEFF4"
    MUTED = "#8B93A1"
    BLUE = "#58C4DD"
    TEAL = "#5CD0B3"
    YELLOW = "#F4D35E"
    GREEN = "#83C167"
    RED = "#FC6255"
    PURPLE = "#B189F5"
    ORANGE = "#F39C5A"
    FONT = "Nunito Sans"  # bundled in assets/fonts (SIL OFL), so every machine renders the same

    @staticmethod
    def text(s: str, size: float = 30, color: str | None = None, weight: str = "MEDIUM", max_width: float | None = None):
        t = Text(s, font=kit.FONT, font_size=size, color=color or kit.INK, weight=weight)
        if max_width and t.width > max_width:
            t.scale_to_fit_width(max_width)
        return t

    @staticmethod
    def card(s: str, color: str, size: float = 24, pad: float = 0.28, width: float | None = None,
             fill: float = 0.12, solid: bool = False):
        """Rounded label box. solid=True puts an opaque backing under it so lines can pass behind."""
        label = kit.text(s, size=size, max_width=(width - 2 * pad) if width else None)
        w = width or label.width + 2 * pad
        h = label.height + 2 * pad
        box = RoundedRectangle(corner_radius=0.14, width=w, height=h,
                               stroke_color=color, stroke_width=2.5, fill_color=color, fill_opacity=fill)
        if solid:
            backing = RoundedRectangle(corner_radius=0.14, width=w, height=h, stroke_width=0,
                                       fill_color=kit.BG, fill_opacity=1)
            return VGroup(VGroup(backing, box), label.move_to(box))
        return VGroup(box, label.move_to(box))

    @staticmethod
    def header(step: str, name: str, color: str):
        num = kit.text(step, size=26, color=color, weight="BOLD")
        title = kit.text(name, size=26, color=kit.MUTED)
        group = VGroup(num, title).arrange(RIGHT, buff=0.25)
        return group.to_corner(UL, buff=0.5)

    @staticmethod
    def node(s: str, color: str, size: float = 22, r: float = 0.11, side=DOWN):
        dot = Dot(radius=r, color=color)
        label = kit.text(s, size=size, color=kit.INK).next_to(dot, side, buff=0.12)
        return VGroup(dot, label)

    @staticmethod
    def graph(n: int, seed: int, width: float = 5.0, height: float = 3.2, color: str | None = None,
              k: int = 2, dot_r: float = 0.045):
        """A loose network of dots and edges, used as 'the brain'."""
        import random
        rnd = random.Random(seed)
        pts = []
        while len(pts) < n:
            x, y = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
            if x * x + y * y <= 1:
                pts.append((x * width / 2, y * height / 2, 0))
        dots = VGroup(*[Dot(p, radius=dot_r, color=color or kit.BLUE) for p in pts])
        edges = VGroup()
        for i, p in enumerate(pts):
            near = sorted(range(n), key=lambda j: (pts[j][0] - p[0]) ** 2 + (pts[j][1] - p[1]) ** 2)[1:k + 1]
            for j in near:
                if j > i or i not in sorted(range(n), key=lambda m: (pts[m][0] - pts[j][0]) ** 2 + (pts[m][1] - pts[j][1]) ** 2)[1:k + 1]:
                    edges.add(Line(p, pts[j], stroke_width=1.2, color=kit.MUTED, stroke_opacity=0.45))
        return VGroup(edges, dots)


__all__ = ["Narrated", "kit", "ORIGIN", "UP", "DOWN", "LEFT", "RIGHT", "Circle", "FadeIn"]
