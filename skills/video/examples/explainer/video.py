"""What happens when you open a website: the reference explainer for this skill.

Four narrated scenes, one class per scene in narration.json (s01-s04). Each is a
Narrated subclass: `play_at("words", ...)` starts an animation as the narrator says
those words, and `finish()` holds the last frame until the narration ends.

Patterns worth copying:
  * Each scene starts from the last frame of the one before (`Pieces` and the
    `pose_after_*` helpers), so the cuts between scenes are invisible.
  * One idea per cue. A group comes in with LaggedStart(lag_ratio=0.15) and short
    items, so the items start 40-80 ms apart (lag_ratio x each item's run time).
  * Change happens by moving what is already on screen: the name flies to DNS, the
    IP address flies back, the request carries it to the server. Each move puts
    path_arc on the animation itself.
  * Lines and arrows are drawn only after both of their ends are on screen.

Render it with the commands in README.md.
"""

from types import SimpleNamespace

from manim import (
    DOWN, LEFT, RIGHT, UP, UL, AddTextLetterByLetter, AnimationGroup, Arrow, Create,
    Dot, FadeIn, FadeOut, GrowArrow, GrowFromCenter, GrowFromEdge, LaggedStart,
    Line, MoveAlongPath, MoveToTarget, Rectangle, RoundedRectangle, Succession, VGroup,
    VMobject, there_and_back,
)

from narrated import Narrated, kit

# ---------------------------------------------------------------------------
# Layout, in Manim units. The frame is about 14.2 wide and 8 tall, centered on 0.
# ---------------------------------------------------------------------------
BIG, BIG_SCALE = (0, -0.25, 0), 1.15     # the browser in scene 1, large so the typing reads
HOME, SMALL = (-4.05, -0.8, 0), 0.64     # the browser from scene 2 on
ENTER_AT = (0, -3.5, 0)
DNS_AT = (1.55, 1.7, 0)
SERVER_AT = (4.95, -0.8, 0)
URL_SIZE = 30
ROW = URL_SIZE * SMALL      # DNS rows match the shrunk address bar, so text flies between them unchanged

# Reserved example names and documentation-only IP addresses (RFC 2606 and RFC 5737).
SERVER_IP = "203.0.113.10"

# The four steps: the scene headers and the recap use the same words as the narration.
STEPS = {
    1: ("Type a web address", kit.BLUE),
    2: ("DNS finds the IP address", kit.YELLOW),
    3: ("The server sends back the page", kit.TEAL),
    4: ("The browser draws it", kit.PURPLE),
}

# Draw order (z-index): the network sits behind the cards, and moving things go on top.
Z_NET, Z_ROUTE, Z_ROUTER, Z_CARD, Z_ARROW, Z_MOVING = 0, 1, 1.5, 2, 3, 4

# The internet: a loose mesh of routers between the browser and the server.
ROUTERS = {
    "a": (-0.15, -0.8, 0), "b": (0.6, -1.75, 0), "c": (1.6, -0.75, 0), "d": (2.7, -1.6, 0),
    "e": (-0.6, -2.65, 0), "f": (0.55, -0.1, 0), "g": (1.65, -2.8, 0), "h": (2.9, -0.2, 0),
    "i": (3.65, -2.7, 0),
}
LINKS = "a-b a-e a-f b-c b-e b-g c-d c-f c-h d-g d-h d-i f-h g-i".split()
ROUTE = "abcd"  # the hops the request takes


def header(step: int):
    name, color = STEPS[step]
    return kit.header(str(step), name, color)


def swap(old, new):
    """Change a header: the old one leaves upward as the new one arrives. A cross-fade would garble the words."""
    return LaggedStart(FadeOut(old, shift=UP * 0.25), FadeIn(new, shift=UP * 0.25), lag_ratio=0.5)


def enter_key():
    return kit.card("Enter", kit.MUTED, size=24, pad=0.22, solid=True).move_to(ENTER_AT).set_z_index(Z_CARD)


def solid_box(width: float, height: float, color: str, radius: float = 0.16, fill: float = 0.06):
    """An outlined box with an opaque backing, so lines can pass behind it."""
    backing = RoundedRectangle(corner_radius=radius, width=width, height=height, stroke_width=0,
                               fill_color=kit.BG, fill_opacity=1)
    frame = RoundedRectangle(corner_radius=radius, width=width, height=height, stroke_color=color,
                             stroke_width=2.5, fill_color=color, fill_opacity=fill)
    return VGroup(backing, frame)


# ---------------------------------------------------------------------------
# The pieces of the diagram
# ---------------------------------------------------------------------------
class Browser(VGroup):
    """A plain browser window: three dots, an address bar and an empty page area."""

    def __init__(self, typed: bool = False, scale: float = 1.0, at=(0, 0, 0)):
        super().__init__()
        w, h, chrome = 8.0, 4.6, 0.85
        top = h / 2
        rule = Line([-w / 2, top - chrome, 0], [w / 2, top - chrome, 0],
                    stroke_color=kit.MUTED, stroke_width=1.5, stroke_opacity=0.5)
        self.window = VGroup(solid_box(w, h, kit.BLUE, radius=0.25, fill=0.04), rule)
        self.dots = VGroup(*[Dot(radius=0.075, color=kit.MUTED) for _ in range(3)]).arrange(RIGHT, buff=0.17)
        self.dots.move_to([-w / 2 + 0.6, top - chrome / 2, 0])
        self.bar = RoundedRectangle(corner_radius=0.26, width=5.9, height=0.52, stroke_color=kit.MUTED,
                                    stroke_width=2, fill_color=kit.INK, fill_opacity=0.04)
        self.bar.move_to([0.4, top - chrome / 2, 0])
        self.placeholder = kit.text("Search or type a web address", size=26, color=kit.MUTED)
        self.url = kit.text("example.com", size=URL_SIZE)
        for label in (self.placeholder, self.url):
            label.next_to(self.bar.get_left(), RIGHT, buff=0.32)
        self.caret = Line(UP * 0.17, DOWN * 0.17, stroke_color=kit.BLUE, stroke_width=3)
        self.caret.move_to(self.bar.get_left() + RIGHT * 0.26)
        # The page area is invisible. It places the IP address chip and, later, the page.
        self.content = Rectangle(width=w - 0.7, height=h - chrome - 0.5, stroke_width=0)
        self.content.move_to([0, (top - chrome - h / 2) / 2, 0])
        self.add(self.window, self.dots, self.bar, self.content)
        if typed:  # the state after scene 1: the address is typed and Enter is pressed
            self.bar.set_stroke(kit.BLUE)
            self.add(self.url)
        else:
            self.add(self.placeholder, self.caret)
        # Place everything, including the address that scene 1 has not typed yet.
        everything = VGroup(self, self.url, self.placeholder, self.caret)
        everything.scale(scale, about_point=(0, 0, 0)).shift(at).set_z_index(Z_CARD)


class PhoneBook(VGroup):
    """DNS drawn as a small phone book: names on the left, IP addresses on the right."""

    ENTRIES = [("example.org", "198.51.100.24"), ("example.com", SERVER_IP), ("example.net", "192.0.2.81")]

    def __init__(self):
        super().__init__()
        w, h = 4.6, 2.9
        left, top = -w / 2 + 0.32, h / 2
        title = kit.text("DNS", size=32, color=kit.YELLOW, weight="BOLD")
        title.move_to([left, top - 0.4, 0], aligned_edge=LEFT)
        note = kit.text("the internet's phone book", size=20, color=kit.MUTED)
        note.next_to(title, DOWN, buff=0.12, aligned_edge=LEFT)
        self.card = VGroup(solid_box(w, h, kit.YELLOW, fill=0.035), title, note)

        ip_x = left + 2.2
        heads = VGroup(kit.text("Name", 17, kit.MUTED), kit.text("IP address", 17, kit.MUTED))
        heads[0].move_to([left, top - 1.32, 0], aligned_edge=LEFT)
        heads[1].move_to([ip_x, top - 1.32, 0], aligned_edge=LEFT).align_to(heads[0], UP)
        self.rows = VGroup()
        for k, (name, ip) in enumerate(self.ENTRIES):
            y = top - 1.72 - 0.4 * k
            name_t = kit.text(name, ROW).move_to([left, y, 0], aligned_edge=LEFT)
            ip_t = kit.text(ip, ROW).move_to([ip_x, y, 0], aligned_edge=LEFT).align_to(name_t, UP)
            self.rows.add(VGroup(name_t, ip_t))
        self.match = self.rows[1]  # example.com
        # The highlight starts invisible inside the group, so it always draws behind the row's text.
        self.highlight = RoundedRectangle(corner_radius=0.08, width=w - 0.3, height=0.36, stroke_width=0,
                                          fill_color=kit.YELLOW, fill_opacity=0)
        self.highlight.move_to([0, self.match.get_y(), 0])
        self.table = VGroup(heads, *self.rows)
        self.add(self.card, self.highlight, self.table)
        self.set_z_index(Z_CARD)


class Server(VGroup):
    """A server rack: three drive bays, a label and its IP address."""

    def __init__(self):
        super().__init__()
        bays = VGroup()
        for _ in range(3):
            bay = RoundedRectangle(corner_radius=0.08, width=1.5, height=0.36, stroke_color=kit.TEAL,
                                   stroke_width=2.5, fill_color=kit.TEAL, fill_opacity=0.12)
            light = Dot(bay.get_right() + LEFT * 0.22, radius=0.045, color=kit.TEAL)
            vents = VGroup(*[Line(LEFT * 0.2, RIGHT * 0.2, stroke_color=kit.TEAL, stroke_width=2,
                                  stroke_opacity=0.6) for _ in range(2)]).arrange(DOWN, buff=0.08)
            vents.move_to(bay.get_left() + RIGHT * 0.4)
            bays.add(VGroup(bay, light, vents))
        bays.arrange(DOWN, buff=0.1)
        backing = RoundedRectangle(corner_radius=0.1, width=bays.width + 0.1, height=bays.height + 0.1,
                                   stroke_width=0, fill_color=kit.BG, fill_opacity=1).move_to(bays)
        self.icon = VGroup(backing, bays)
        self.label = kit.text("Server", 26).next_to(bays, DOWN, buff=0.22)
        self.ip = kit.text(SERVER_IP, ROW, kit.MUTED).next_to(self.label, DOWN, buff=0.12)
        self.add(self.icon, self.label, self.ip)
        self.set_z_index(Z_CARD)


class RequestCard(VGroup):
    """The request: a card with an empty line where the IP address will go."""

    def __init__(self):
        super().__init__()
        self.box = solid_box(2.1, 1.0, kit.BLUE, radius=0.14, fill=0.12)
        label = kit.text("Request", 24).move_to(self.box).shift(UP * 0.2)
        self.add(self.box, label)
        self.set_z_index(Z_MOVING)

    def slot(self):
        """Where the IP address sits: the card's second line."""
        return self.box.get_center() + DOWN * 0.2


def internet(browser: Browser, server: Server):
    """Routers and links. Links into the browser and server start at their edges."""
    dots = {k: Dot(p, radius=0.06, color=kit.MUTED) for k, p in ROUTERS.items()}
    link = lambda p, q: Line(p, q, stroke_color=kit.MUTED, stroke_width=1.6, stroke_opacity=0.45)
    links = [link(ROUTERS[x], ROUTERS[y]) for x, y in (pair.split("-") for pair in LINKS)]
    b_edge, s_edge = browser.get_right()[0], server.icon.get_left()[0]
    links += [link((b_edge, -0.55, 0), ROUTERS["a"]), link((b_edge, -1.6, 0), ROUTERS["e"]),
              link(ROUTERS["h"], (s_edge, 0.3, 0)), link(ROUTERS["d"], (s_edge, -0.4, 0)),
              link(ROUTERS["i"], (s_edge, -0.75, 0))]
    mesh = VGroup(VGroup(*links).set_z_index(Z_NET), VGroup(*dots.values()).set_z_index(Z_ROUTER))

    hops = [ROUTERS[k] for k in ROUTE]
    # The lit route follows the real links; the request itself rides a smooth curve through the same hops.
    glow = VMobject(stroke_color=kit.BLUE, stroke_width=4).set_points_as_corners([*hops, (s_edge, -0.4, 0)])
    glow.set_z_index(Z_ROUTE)
    there = VMobject().set_points_smoothly([*hops, server.icon.get_center()])
    back = VMobject().set_points_smoothly([server.icon.get_center(), *reversed(hops)])
    return SimpleNamespace(mesh=mesh, dots=dots, links=links, glow=glow, there=there, back=back)


def page_drawing(content: Rectangle):
    """A simple page drawn as blocks: heading, picture, lines of text and a button."""
    left, top = content.get_left()[0] + 0.25, content.get_top()[1] - 0.22

    def block(w, h, color, opacity, radius=0.05):
        return RoundedRectangle(corner_radius=radius, width=w, height=h, stroke_width=0,
                                fill_color=color, fill_opacity=opacity)

    heading = block(2.4, 0.2, kit.INK, 0.9).move_to([left, top - 0.1, 0], aligned_edge=LEFT)
    subline = block(1.6, 0.1, kit.MUTED, 0.8).next_to(heading, DOWN, buff=0.12, aligned_edge=LEFT)
    picture = RoundedRectangle(corner_radius=0.08, width=1.7, height=1.05, stroke_color=kit.PURPLE,
                               stroke_width=2, fill_color=kit.PURPLE, fill_opacity=0.3)
    picture.next_to(subline, DOWN, buff=0.2, aligned_edge=LEFT)
    lines = VGroup(*[block(w, 0.09, kit.MUTED, 0.8) for w in (2.2, 2.0, 2.2, 1.4)])
    lines.arrange(DOWN, buff=0.13, aligned_edge=LEFT).next_to(picture, RIGHT, buff=0.3).align_to(picture, UP)
    button = block(0.9, 0.26, kit.PURPLE, 0.9, radius=0.13).next_to(lines, DOWN, buff=0.2, aligned_edge=LEFT)
    return VGroup(heading, subline, picture, *lines, button).set_z_index(Z_CARD)


class Pieces:
    """Every piece of the diagram, built in its place from scene 2 on."""

    def __init__(self):
        self.browser = Browser(typed=True, scale=SMALL, at=HOME)
        self.server = Server().move_to(SERVER_AT)
        self.dns = PhoneBook().move_to(DNS_AT)
        self.net = internet(self.browser, self.server)

        b, d = self.browser, self.dns
        style = dict(buff=0, stroke_width=4, tip_length=0.2, max_tip_length_to_length_ratio=0.15)
        self.ask = Arrow(b.get_top() + RIGHT * 1.0 + UP * 0.08, d.get_left() + UP * 0.55 + LEFT * 0.08,
                         path_arc=-0.9, color=kit.BLUE, **style)
        self.answer = Arrow(d.get_bottom() + LEFT * 1.6 + DOWN * 0.08, b.get_right() + DOWN * 0.15 + RIGHT * 0.08,
                            path_arc=-0.7, color=kit.YELLOW, **style)
        for arrow in (self.ask, self.answer):
            arrow.set_z_index(Z_ARROW)

        # The browser's copy of the IP address, shown as a chip in its page area.
        self.chip_box, self.chip_label = kit.card(SERVER_IP, kit.YELLOW, size=ROW, pad=0.16, solid=True)
        VGroup(self.chip_box, self.chip_label).move_to(b.content).set_z_index(Z_CARD)

        self.request = RequestCard().move_to(ROUTERS["a"])
        self.page = kit.card("Page", kit.TEAL, size=24, solid=True).set_z_index(Z_MOVING)


def pose_after_s02(p: Pieces):
    """The last frame of scene 2: DNS has answered with the IP address."""
    p.dns.highlight.set_fill(opacity=0.2)
    return [p.net.mesh, p.browser, p.server, p.dns, p.ask, p.answer, p.chip_box, p.chip_label]


def pose_after_s03(p: Pieces):
    """The last frame of scene 3: the page has come back to the browser."""
    p.dns.highlight.set_fill(opacity=0.2)
    p.dns.fade(0.6)
    p.page.move_to(ROUTERS["a"])
    return [p.net.mesh, p.net.glow, p.browser, p.server, p.dns, p.page]


# ---------------------------------------------------------------------------
# Scenes
# ---------------------------------------------------------------------------
class S01(Narrated):
    SCENE_ID = "s01"

    def construct(self):
        title = VGroup(kit.text("What happens when you", size=56, weight="BOLD"),
                       kit.text("open a website", size=56, weight="BOLD")).arrange(DOWN, buff=0.28)
        self.play_at("What happens", FadeIn(title, shift=UP * 0.2), run_time=1.2)

        # "First": the title clears, then the header and the browser come in, part by part.
        b = Browser(scale=BIG_SCALE, at=BIG)
        enter = enter_key()
        self.play_at("First", Succession(
            FadeOut(title, shift=UP * 0.4, run_time=0.5),
            LaggedStart(FadeIn(header(1), shift=UP * 0.15), FadeIn(b.window, shift=UP * 0.3), FadeIn(b.dots),
                        FadeIn(VGroup(b.bar, b.placeholder, b.caret)), FadeIn(enter, shift=UP * 0.15),
                        lag_ratio=0.15, run_time=0.8),  # five 0.5 s items, 75 ms apart
            lag_ratio=0.8,  # start the browser as the title finishes, so no frame is empty
        ), run_time=1.2)

        # Typing is a steady process, so the letters come at a linear rate (AddTextLetterByLetter's default).
        # It reveals letters by opacity, so an updater moves the caret to just after the last visible one.
        def follow_letters(caret):
            shown = [glyph for glyph in b.url if glyph.get_fill_opacity() > 0]
            if shown:
                caret.set_x(shown[-1].get_right()[0] + 0.07)

        typing = AddTextLetterByLetter(b.url, run_time=1.15)  # hides every letter as it is created
        b.caret.add_updater(follow_letters)
        self.play_at("example.com", Succession(b.placeholder.animate(run_time=0.25).set_opacity(0), typing),
                     run_time=1.4)
        b.caret.clear_updaters()

        # "press Enter": the key dips and comes back; the address bar lights up as follow-through.
        self.play_at("press Enter", AnimationGroup(
            enter.animate(rate_func=there_and_back).scale(0.9),
            b.bar.animate.set_stroke(kit.BLUE),
            b.caret.animate.set_opacity(0),
        ), run_time=0.6)
        self.finish(tail=0.9)


class S02(Narrated):
    SCENE_ID = "s02"

    def construct(self):
        p = Pieces()
        # Start from scene 1's last frame.
        h1, browser, enter = header(1), Browser(typed=True, scale=BIG_SCALE, at=BIG), enter_key()
        self.add(h1, browser, enter)

        # Pull back: the browser moves aside, the server and the internet come in.
        # This move also scales the browser, so it goes straight: path_arc would tilt its text.
        links = sorted(p.net.links, key=lambda m: m.get_center()[0])
        mesh_in = Succession(
            LaggedStart(*[FadeIn(dot, scale=0.5) for dot in sorted(p.net.dots.values(), key=lambda m: m.get_x())],
                        lag_ratio=0.15, run_time=0.6),
            # Links come after the routers, so every line has both ends on screen. They draw left to right,
            # three at a time, so the waves start about 70 ms apart.
            LaggedStart(*[Create(VGroup(*links[i:i + 3])) for i in range(0, len(links), 3)],
                        lag_ratio=0.15, run_time=0.9),
        )
        # The parts keep their own run times: the play's run_time equals their natural total, so nothing is rescaled.
        self.play_at("Computers", LaggedStart(
            AnimationGroup(swap(h1, header(2)), browser.animate.scale(SMALL / BIG_SCALE).move_to(HOME),
                           FadeOut(enter), run_time=1.3),
            FadeIn(p.server, shift=LEFT * 0.3, run_time=0.8),
            mesh_in,
            lag_ratio=0.4), run_time=2.34)
        self.remove(browser)
        self.add(p.browser)  # the same picture, swapped for the shared piece

        # DNS: the card first, then its rows as a staggered group.
        self.play_at("DNS", Succession(
            FadeIn(p.dns.card, shift=DOWN * 0.2, run_time=0.8),
            LaggedStart(*[FadeIn(row, shift=RIGHT * 0.1) for row in p.dns.table], lag_ratio=0.15, run_time=0.7),
        ), run_time=1.5)
        self.remove(p.dns.card, *p.dns.table)
        self.add(p.dns)

        # The browser asks: the arrow is drawn (both ends are on screen), then the name flies along it.
        query = p.browser.url.copy().set_z_index(Z_MOVING)
        self.play_at("asks", Succession(
            GrowArrow(p.ask, run_time=0.6),
            query.animate(path_arc=-0.8, run_time=1.0).move_to(p.dns.match[0]),
        ), run_time=1.6)

        # The look-up: the matching row lights up.
        self.play_at("example.com", p.dns.highlight.animate.set_fill(opacity=0.2), run_time=0.6)
        self.remove(query)  # it sits exactly on the row's own copy of the name

        # The answer: the IP address flies back and becomes the browser's chip.
        ip = p.dns.match[1].copy().set_z_index(Z_MOVING)
        self.play_at("sends back", Succession(
            GrowArrow(p.answer, run_time=0.45),
            ip.animate(path_arc=-0.7, run_time=0.9).move_to(p.chip_label),
            FadeIn(p.chip_box, run_time=0.25),
        ), run_time=1.6)
        self.remove(ip)
        self.add(p.chip_label)
        self.finish(tail=0.7)


class S03(Narrated):
    SCENE_ID = "s03"

    def construct(self):
        p = Pieces()
        h2 = header(2)
        self.add(h2, *pose_after_s02(p))

        # Staging: DNS has done its job, so it steps back.
        self.play_at("Next", AnimationGroup(
            swap(h2, header(3)), FadeOut(p.ask), FadeOut(p.answer), p.dns.animate.fade(0.6),
        ), run_time=1.0)

        # The request appears, and the IP address moves onto it: that is where it is going.
        req = p.request
        self.play_at("request", LaggedStart(
            FadeIn(req, shift=RIGHT * 0.4),
            FadeOut(p.chip_box),
            p.chip_label.animate(path_arc=0.6).move_to(req.slot()),
            lag_ratio=0.35), run_time=1.3)
        self.remove(p.chip_label)
        req.add(p.chip_label.set_z_index(Z_MOVING))

        # Hops: the request rides a curve through the routers while its route lights up behind it.
        self.play_at("hops", Succession(
            AnimationGroup(MoveAlongPath(req, p.net.there), Create(p.net.glow), run_time=1.5),
            FadeOut(req, target_position=p.server.icon, scale=0.3, run_time=0.35),
        ), run_time=1.85)

        # The page comes back the same way. Cues search forward, so "server sends" finds the second "server".
        page = p.page.move_to(p.net.back.get_start())
        self.play_at("server sends", Succession(
            FadeIn(page, shift=LEFT * 0.2, run_time=0.3),
            MoveAlongPath(page, p.net.back, run_time=1.2),
        ), run_time=1.5)
        self.finish(tail=1.0)


class S04(Narrated):
    SCENE_ID = "s04"

    def construct(self):
        p = Pieces()
        h3 = header(3)
        self.add(h3, *pose_after_s03(p))
        network = VGroup(p.net.mesh, p.net.glow, p.server)

        # Staging: dim the network so the eye goes to the browser.
        h4 = header(4)
        self.play_at("Last", AnimationGroup(swap(h3, h4), network.animate.fade(0.5)), run_time=0.9)

        # The page slides into the browser and is drawn, block by block.
        drawing = page_drawing(p.browser.content)
        self.play_at("browser", Succession(
            p.page.animate(path_arc=0.6, run_time=0.4).move_to(p.browser.content).set_opacity(0),
            LaggedStart(*[GrowFromEdge(m, LEFT) if m.height < 0.3 else FadeIn(m, scale=0.95) for m in drawing],
                        lag_ratio=0.15, run_time=0.9),
        ), run_time=1.3)
        self.remove(p.page)

        # Recap. One MoveToTarget both shrinks the diagram and undoes the dimming.
        diagram = VGroup(p.net.mesh, p.net.glow, p.browser, drawing, p.dns, p.server)
        diagram.generate_target()
        net_t, glow_t, _, _, dns_t, server_t = diagram.target
        for part in (net_t, glow_t, server_t):
            part.fade(-1.0)  # fade(0.5) halved the opacity; fade(-1.0) doubles it back
        dns_t.fade(-1.5)     # fade(0.6) kept 40%; fade(-1.5) multiplies by 2.5
        diagram.target.scale(0.48).move_to([-3.65, -0.05, 0])
        recap = kit.text("Recap", size=26, weight="BOLD").to_corner(UL, buff=0.5)
        self.play_at("To recap", AnimationGroup(swap(h4, recap), MoveToTarget(diagram)), run_time=1.1)

        # Each step's dot leaves its part of the diagram and settles in a list on the right.
        sources = {1: p.browser.url, 2: p.dns.card, 3: p.server.icon, 4: drawing}
        nodes = {}
        for step, cue in [(1, "you type"), (2, "DNS finds"), (3, "The server"), (4, "The browser")]:
            name, color = STEPS[step]
            node = kit.node(name, color, size=27, r=0.13, side=RIGHT)
            node[1].next_to(node[0], RIGHT, buff=0.32)
            node.shift([0.4, 1.95 - 1.3 * (step - 1), 0] - node[0].get_center()).set_z_index(Z_MOVING)
            dot, label = node
            spot = dot.get_center()
            dot.move_to(sources[step].get_center())
            finish = [FadeIn(label, shift=RIGHT * 0.15)]
            if step > 1:  # join it to the dot above, now that both ends are on screen
                link = Line(nodes[step - 1][0].get_center(), spot, stroke_color=kit.MUTED, stroke_width=2)
                finish.append(Create(link.set_z_index(Z_ARROW)))
            self.play_at(cue, Succession(
                GrowFromCenter(dot, run_time=0.25),
                dot.animate(path_arc=-0.7 if step % 2 else 0.7, run_time=0.7).move_to(spot),
                AnimationGroup(*finish, run_time=0.25),
            ), run_time=1.2)
            nodes[step] = node
        self.finish(tail=1.2)
