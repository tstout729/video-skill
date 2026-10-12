// s06 Review · canvas · 34.73–47.07 (in through a zoom-through, out through a light leak).
// The skill reviews its own frames. A deck of cards builds on the narrator's words, one card per cue:
//   "reviews its own frames" → a short film strip of real frames made by the skill (clips/*)
//   "Contact sheets"         → assets/sheet.png
//   "Onion skins"            → assets/onion.png
//   "Speed graphs"           → assets/graph.png
// Each card's hero move is its arrival: it rises 100 px on a spring (ζ 0.82) as it fades in. The
// deck behind it steps back 150 ms later, travelling 60% as far (60 px up), smaller and dimmer.
// A card three steps back retires. The images sit in their cards with object-fit: contain on the
// review tools' own paper (#F1EFEA), so any image of a similar shape drops in at the same path.
// On "test": a counter runs to window.CHECKS.length (every check() the whole film declares, read
// inside seek once every scene is built) and turns green: "N checks · all pass". No other numbers.
export default async function build(root, k) {
  const { make, place, show, cueIn, check, sfx, box, overlap, chrome, clamp, easeOut, mix, spring01, p01, C, STAGE, win } = k;
  const S = "s06";
  const FPS = 60;
  root.style.background = C.canvas;
  chrome(root, 6, "REVIEW");

  // ---------- cues ----------
  const tStrip = cueIn(k.id, "reviews its own frames");
  const tSheet = cueIn(k.id, "Contact sheets");
  const tOnion = cueIn(k.id, "Onion skins");
  const tGraph = cueIn(k.id, "Speed graphs");
  const tTest = cueIn(k.id, "test");

  // ---------- the deck's numbers ----------
  const X0 = STAGE.x0, CW = STAGE.x1 - STAGE.x0;      // cards span the stage: x 54–1026
  const Y0 = 390, CH = 590;                           // the front card's top and height
  const RISE = 100, STEP = 0.6 * RISE, LAG = 0.15;    // hero travel; the deck steps back 60% as far, 150 ms later
  const ARRIVE = { duration: 0.6, damping: 0.82 }, BACK = { duration: 0.55, damping: 0.82 };
  const SHRINK = 0.05, DIM = 0.6;                      // per step back: 5% smaller, 40% of the way to the canvas

  // ---------- header: on screen from cutIn, so the zoom-through lands on a finished picture ----------
  const header = place(make("div", "h1", "Render → look → fix", root, { color: C.ink, whiteSpace: "nowrap", zIndex: "50" }), X0, 150);
  header.id = "s06-header";

  // ---------- cards ----------
  const loads = [];
  const image = (src, parent, css) => {
    const el = make("img", "", "", parent, { position: "absolute", display: "block", ...css });
    el.src = src;
    loads.push(el.decode());
    return el;
  };
  const card = (id, h, bg) => {
    const el = place(make("div", "", "", root, {
      overflow: "hidden", borderRadius: "28px", background: bg, boxShadow: "var(--shadow)", transformOrigin: "50% 0%",
    }), X0, Y0, CW, h);
    el.id = id;
    return el;
  };
  const finish = (el, dark) => {
    // A hairline at 12% of the text color, over the content; then the veil that dims it as it steps back.
    make("div", "", "", el, { position: "absolute", inset: "0px", borderRadius: "28px", pointerEvents: "none",
      boxShadow: `inset 0 0 0 1.5px ${dark ? "rgba(236,235,231,0.14)" : "rgba(22,21,19,0.12)"}` });
    return make("div", "", "", el, { position: "absolute", inset: "-1px", background: C.canvas, opacity: "0", pointerEvents: "none" });
  };

  // 1. The film strip: three real frames from the skill's examples, on ink with sprocket holes.
  const GAP = 24, FW = (CW - 4 * GAP) / 3, BAND = 52, SH = FW + 2 * BAND;
  // Centred in the deck's slot while it is in front; one step back, it is hidden by the sheet.
  const strip = card("s06-strip", SH, C.ink);
  strip.style.top = `${Y0 + (CH - SH) / 2}px`;
  for (const top of [0, SH - BAND]) {
    const row = make("div", "", "", strip, { position: "absolute", left: "0px", top: `${top}px`, width: `${CW}px`, height: `${BAND}px` });
    for (let x = 22; x + 16 <= CW - 10; x += 38) {
      make("div", "", "", row, { position: "absolute", left: `${x}px`, top: `${(BAND - 22) / 2}px`, width: "16px", height: "22px", borderRadius: "4px", background: "rgba(236,235,231,0.86)" });
    }
  }
  // [clip, frame, object-position]: the walkthrough's invite dialog, the explainer's DNS step, the riso bloom.
  const FRAMES = [["walkthrough", 157, "78% 50%"], ["explainer", 175, "84% 50%"], ["riso", 240, "50% 50%"]];
  FRAMES.forEach(([clip, n, pos], i) => {
    image(`clips/${clip}/${String(n).padStart(6, "0")}.jpg`, strip, {
      left: `${GAP + i * (FW + GAP)}px`, top: `${BAND}px`, width: `${FW}px`, height: `${FW}px`, objectFit: "cover", objectPosition: pos, borderRadius: "6px",
    });
  });

  // 2–4. The review tools' own pictures, contained on their paper.
  const PAPER = "#f1efea";
  const tool = (id, src) => {
    const el = card(id, CH, PAPER);
    image(src, el, { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px`, objectFit: "contain", objectPosition: "50% 50%" });
    return el;
  };
  const sheet = tool("s06-sheet", "assets/sheet.png");
  const onion = tool("s06-onion", "assets/onion.png");
  const graph = tool("s06-graph", "assets/graph.png");

  const deck = [[strip, tStrip], [sheet, tSheet], [onion, tOnion], [graph, tGraph]].map(([el, t0], i) => {
    el.style.zIndex = String(10 + i);
    return { el, t0, top: parseFloat(el.style.top), veil: finish(el, el === strip), i };
  });

  // ---------- the counter ----------
  const row = place(make("div", "", "", root, { display: "flex", alignItems: "center", gap: "20px", whiteSpace: "nowrap" }), X0, 1006);
  row.id = "s06-checks";
  const NS = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(NS, "svg");
  icon.setAttribute("width", "56"); icon.setAttribute("height", "56"); icon.setAttribute("viewBox", "0 0 56 56");
  icon.style.display = "block"; icon.style.flex = "none";
  row.appendChild(icon);
  const ring = document.createElementNS(NS, "circle");
  Object.entries({ cx: 28, cy: 28, r: 25.5, fill: "none", stroke: C.muted, "stroke-width": 3 }).forEach(([a, b]) => ring.setAttribute(a, b));
  const tick = document.createElementNS(NS, "path");
  Object.entries({ d: "M16 29l8 8 16-17", fill: "none", stroke: C.paper, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round" }).forEach(([a, b]) => tick.setAttribute(a, b));
  icon.append(ring, tick);
  const label = make("div", "", "", row, { fontSize: "56px", fontWeight: "650", letterSpacing: "-0.025em", lineHeight: "1.1", color: C.ink });
  const num = make("span", "mono", "0", label, { display: "inline-block", textAlign: "right", fontWeight: "600", letterSpacing: "-0.02em" });
  make("span", "", " checks", label);
  const pass = make("span", "", " · all pass", label);
  const COUNT = 1.0;
  const tPass = tTest + COUNT + 0.05, PASS = 0.3;     // the count lands, then the row turns green
  const tDone = tPass + 0.45;
  const GREEN = `rgb(${[1, 3, 5].map((i) => parseInt(C.green.slice(i, i + 2), 16)).join(", ")})`;

  sfx(tStrip + 2 / FPS, "pop");                        // the film strip arrives
  sfx(tPass + 1 / FPS, "success");                     // the check turns green

  await Promise.all(loads);
  const tickLen = tick.getTotalLength();
  tick.style.strokeDasharray = `${tickLen} ${tickLen}`;

  // ---------- seek ----------
  const pose = (c, t) => {
    // Steps back: one per later card, as a spring (position, size) and an ease (dim, retire).
    let back = 0, fade = 0;
    for (const d of deck) if (d.i > c.i) {
      back += spring01(t, d.t0 + LAG, BACK);
      fade += easeOut(p01(t, d.t0 + LAG, 0.45));
    }
    const arrive = spring01(t, c.t0, ARRIVE);
    // Two steps back is the deepest place; a third step retires the card where it is (ease-in),
    // behind the card that takes its place.
    const y = RISE * (1 - arrive) - STEP * Math.min(back, 2);
    const s = 1 - SHRINK * Math.min(back, 2);
    const opacity = easeOut(p01(t, c.t0, 0.35)) * (1 - clamp(fade - 2, 0, 1) ** 3);
    return { y, s, opacity, veil: 1 - DIM ** Math.min(fade, 3) };
  };
  const seek = (t) => {
    for (const c of deck) {
      const p = pose(c, t);
      c.el.style.transform = `translate(0px, ${p.y.toFixed(2)}px) scale(${p.s.toFixed(4)})`;
      c.el.style.opacity = p.opacity.toFixed(4);
      c.el.style.visibility = p.opacity < 0.001 ? "hidden" : "visible";
      c.veil.style.opacity = p.veil.toFixed(4);
    }

    // The counter: enters on "test", counts to the film's real number of checks, then turns green.
    const N = (window.CHECKS || []).length;
    num.style.width = `${String(N).length}ch`;
    k.countTo(num, t, tTest, tTest + COUNT, 0, N);
    show(row, t, tTest, Infinity, { dur: 0.45, dy: 12 });
    const g = easeOut(p01(t, tPass, PASS));
    label.style.color = mix(C.ink, C.green, g);
    ring.setAttribute("fill", g > 0 ? C.green : "none");
    ring.setAttribute("fill-opacity", g.toFixed(4));
    ring.setAttribute("stroke", mix(C.muted, C.green, g));
    tick.style.strokeDashoffset = (tickLen * (1 - easeOut(p01(t, tPass + 0.08, PASS)))).toFixed(2);
    tick.style.opacity = t >= tPass + 0.08 ? "1" : "0";
    pass.style.opacity = g.toFixed(4);
  };

  // ---------- checks ----------
  const op = (e) => (e.style.visibility === "hidden" ? 0 : Number(e.style.opacity || 1));
  const front = (t) => [...deck].reverse().find((c) => t >= c.t0);
  check(`${S} composed at cutIn: the header is on screen before any card`, win.cutIn, () =>
    (op(header) === 1 && deck.every((c) => op(c.el) === 0)) || "header missing or a card early");
  check(`${S} the strip's frames and the three review images are decoded`, win.cutIn, () => {
    const bad = [...root.querySelectorAll("img")].filter((i) => !i.complete || !i.naturalWidth);
    return !bad.length || `not decoded: ${bad.map((i) => i.src.split("/").slice(-2).join("/")).join(", ")}`;
  });
  // Each card is on its mark, fully in, before the next one starts (and the last one to the cut).
  deck.forEach((c, i) => {
    const until = i + 1 < deck.length ? deck[i + 1].t0 : win.cutOut - 1 / FPS;
    const at = c.t0 + 0.75;
    check(`${S} ${c.el.id.slice(4)} settles on its mark (top ${c.top}, ±0.5 px) by ${at.toFixed(2)} s and holds until the next cue`, [at, until], () => {
      const b = box(c.el);
      return (Math.abs(b.y - c.top) < 0.5 && op(c.el) > 0.999) || `top ${b.y.toFixed(2)} opacity ${op(c.el).toFixed(3)}`;
    });
  });
  check(`${S} the deck steps back ${LAG * 1000} ms after each new card and travels 60% as far (${STEP} px)`, win.cutIn, () => {
    for (let j = 1; j < deck.length; j++) {
      const prev = deck[j - 1], t0 = deck[j].t0;
      const before = pose(prev, t0 - 1 / FPS).y, still = pose(prev, t0 + LAG - 1 / FPS).y, moved = pose(prev, t0 + 1.2).y;
      if (Math.abs(still - before) > 0.01) return `${prev.el.id} moves before ${LAG * 1000} ms`;
      if (Math.abs(before - moved - STEP) > 0.5) return `${prev.el.id} steps ${(before - moved).toFixed(2)} px`;
    }
    return true;
  });
  check(`${S} one card in front at a time, and nothing three steps back stays on screen`, [win.cutIn, win.cutOut - 1 / FPS], (t) => {
    const f = front(t);
    if (f && op(strip) > 0.001 && f.i >= 3 && t > f.t0 + LAG + 0.6) return "the strip has not retired";
    return true;
  });
  check(`${S} the counter ends on window.CHECKS.length, green, "all pass", held to the cut`, [tDone, win.cutOut - 1 / FPS], () => {
    const N = (window.CHECKS || []).length;
    const green = getComputedStyle(label).color === GREEN && ring.getAttribute("fill") === C.green && Number(ring.getAttribute("fill-opacity")) > 0.999;
    return (N > 0 && num.textContent === String(N) && green && Number(pass.style.opacity) > 0.999 && op(row) > 0.999) ||
      `shows ${num.textContent} of ${N}, color ${getComputedStyle(label).color}`;
  });
  check(`${S} header, deck and counter stay apart and inside the stage`, [win.inEnd, win.outStart], () => {
    const f = deck.filter((c) => op(c.el) > 0.01);
    const items = [header, ...f.map((c) => c.el), ...(op(row) > 0.01 ? [row] : [])];
    for (const e of items) {
      const b = box(e);
      if (b.x < STAGE.x0 - 4 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${e.id} at x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
    }
    for (const c of f) if (overlap(header, c.el) > 0) return `${c.el.id} under the header`;
    for (const c of f) if (op(row) > 0.01 && overlap(row, c.el) > 0) return `${c.el.id} over the counter`;
    return true;
  });

  return seek;
}
