// s18 Engines. A chooser. At the cut: "Name the engine", three engine chips over three empty dashed
// slots, and the engines that "think in web pages" (HyperFrames, GSAP) and Motion ("no renderer") as
// smaller chips below. On "the model picks one" the subline. Each named engine is picked on its cue:
// its chip turns accent and its slot fills with a live window (spring ζ 0.82), with its use 150 ms
// later. three.js: the ceramic mark (hero3d directed) turns once on "3D". Remotion: three more cards
// deal onto the first on "series", 80 ms apart. plain HTML: the real loop clip, through frames().
import { createHero } from "../hero3d.js";

export default async function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, easeInOut, p01, frames, check, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tModel = cueIn(k.id, "the model picks one");
  const tPick = [cueIn(k.id, "Three J S"), cueIn(k.id, "Remotion"), cueIn(k.id, "plain HTML")];
  const tTurn = cueIn(k.id, "3D");          // the mark turns once
  const tSeries = cueIn(k.id, "series");    // the series deals in
  const TURN = 1.8, OPEN = { duration: 0.7, damping: 0.82 }, USE_LAG = 0.15;
  const DEAL_LAG = 0.08;                     // list items 40–80 ms apart

  // ---- layout: three columns on the 80 px margin ----
  const COLX = [80, 400, 720], CW = 280;
  const HEAD_Y = 56, SUB_Y = 136, CHIP_Y = 214, CHIP_H = 60, WIN_Y = 292, WIN_H = 400, USE_Y = 712;
  const DIV_Y = 792, SEC_Y = 814, SEC_CHIP_Y = 864;

  const head = place(make("div", "h1", "Name the engine", root), 80, HEAD_Y);
  const sub = place(make("div", "body", "or the model picks one", root, { color: C.muted }), 80, SUB_Y);

  const NAMES = ["three.js", "Remotion", "plain HTML"];
  const USES = ["anything 3D", "a series", "a short loop"];
  const chips = NAMES.map((n, i) => place(make("div", "chip mono", n, root, {
    width: `${CW}px`, height: `${CHIP_H}px`, justifyContent: "center", fontSize: "32px", fontWeight: "560",
  }), COLX[i], CHIP_Y));
  const slots = COLX.map((x) => place(make("div", "", "", root, {
    border: `2.5px dashed ${C.faint}`, borderRadius: "28px",
  }), x, WIN_Y, CW, WIN_H));
  const wins = COLX.map((x) => place(make("div", "card", "", root, { overflow: "hidden", transformOrigin: "50% 0%" }), x, WIN_Y, CW, WIN_H));
  const uses = USES.map((u, i) => place(make("div", "body", u, root, { width: `${CW}px`, textAlign: "center", fontWeight: "560" }), COLX[i], USE_Y));

  // ---- the smaller engines, part of the chooser from the cut ----
  const rule = place(make("div", "", "", root, { background: C.line }), 80, DIV_Y, 920, 2);
  const secLabel = (txt, x) => place(make("div", "", txt, root, { fontSize: "30px", color: C.muted, fontWeight: "500" }), x, SEC_Y);
  const webLabel = secLabel("think in web pages", 80);
  const noLabel = secLabel("no renderer", 720);
  const small = (txt, x) => place(make("div", "chip", txt, root, { fontSize: "28px" }), x, SEC_CHIP_Y);
  const hyper = small("HyperFrames", 80);
  const gsap = small("GSAP", 0);           // placed after layout, 16 px after HyperFrames
  const motion = small("Motion", 720);

  // ---- window 1: three.js, the ceramic mark ----
  const canvas = make("canvas", "", "", wins[0], { position: "absolute", left: "0px", top: "0px" });
  const hero = createHero(canvas, {
    variant: "directed", width: CW, height: WIN_H, seed: 7,
    framing: { fill: 0.4, aim: [0, 0.5], center: [0.5, 0.56], x0: 0 },
  });
  const yawAt = (t) => -20 + 360 * easeInOut(p01(t, tTurn, TURN));   // one deliberate turn, then rest

  // ---- window 2: Remotion, a series of cards from one template ----
  const MW = 196, MH = 128, STEP = 18, N = 4;
  const sx = (CW - (MW + STEP * (N - 1))) / 2, sy = (WIN_H - (MH + STEP * (N - 1))) / 2;
  const minis = Array.from({ length: N }, (_, i) => {
    const m = place(make("div", "", "", wins[1], {
      background: C.paper, borderRadius: "16px", border: `2px solid ${C.line}`, boxShadow: "0 6px 18px rgba(28,28,26,0.08)", overflow: "hidden",
    }), sx + i * STEP, sy + STEP * (N - 1) - i * STEP, MW, MH);
    make("div", "", "", m, { position: "absolute", left: "0px", top: "0px", width: "100%", height: "30px", background: i === N - 1 ? C.accent : C.ink });
    make("div", "mono", `0${i + 1}`, m, { position: "absolute", left: "16px", top: "44px", fontSize: "30px", fontWeight: "600", color: C.ink });
    make("div", "", "", m, { position: "absolute", left: "16px", top: "90px", width: "120px", height: "10px", borderRadius: "5px", background: C.line });
    make("div", "", "", m, { position: "absolute", left: "16px", top: "108px", width: "80px", height: "10px", borderRadius: "5px", background: "#e6e4df" });
    return m;
  });
  minis[N - 1].dataset.track = "s18-deal";
  const dealAt = (i) => tSeries + (i - 1) * DEAL_LAG;          // card 1 is there when the window opens
  const DEAL_DX = 150, DEAL = { duration: 0.9, damping: 0.82 };

  // ---- window 3: plain HTML, the real loop clip ----
  const clipInfo = await (await fetch("clips/loop/clip.json")).json();
  const IMG = 480;                            // the loop's card fills about 280 px of the window
  const img = make("img", "", "", wins[2], { position: "absolute", left: `${(CW - IMG) / 2}px`, top: `${(WIN_H - IMG) / 2}px`, width: `${IMG}px`, height: `${IMG}px` });
  const clip = frames(img, { dir: "clips/loop", ...clipInfo });
  const CLIP_FROM = 3.2;                     // card, press, spinner, check: the busiest 3.5 s of the loop
  const clipTime = (t) => CLIP_FROM + Math.max(0, t - tPick[2]);

  await document.fonts.ready;
  gsap.style.left = `${80 + hyper.offsetWidth + 16}px`;

  // ---- checks ----
  const openAt = (i, t) => spring01(t, tPick[i], OPEN);
  check("s18 f cutIn is a finished picture: heading, chips, slots, smaller engines", cutIn, () =>
    [head, ...chips, ...slots, hyper, gsap, motion, webLabel, noLabel].every((el) => getComputedStyle(el).visibility !== "hidden" && Number(el.style.opacity || 1) > 0.99) || "missing");
  tPick.forEach((tp, i) => check(`s18 ${NAMES[i]} window open and settled by its cue + 1.2 s`, tp + 1.2, () => {
    const b = box(wins[i]);
    return (Math.abs(b.h - WIN_H) < 0.5 && Math.abs(b.y - 128 - WIN_Y) < 0.5) || `h ${b.h.toFixed(2)} y ${(b.y - 128).toFixed(2)}`;
  }));
  check("s18 the mark ends its single turn at rest (yaw back to −20° + 360°)", tTurn + TURN, () => Math.abs(yawAt(tTurn + TURN) - 340) < 1e-6 || `${yawAt(tTurn + TURN)}`);
  // The last card's settle frame: the first frame after which it stays within 0.5 px of its mark.
  let dealSettle = 0;
  for (let f = 0; f < 240; f++) if (DEAL_DX * Math.abs(1 - spring01(f / FPS, 0, DEAL)) > 0.5) dealSettle = f + 1;
  const dealt = dealAt(N - 1) + dealSettle / FPS;
  check(`s18 series dealt onto its marks (±0.5 px) by f${Math.round(dealt * FPS)} and held`, [dealt, cutOut - 1 / FPS], () => {
    for (let i = 1; i < N; i++) {
      const b = box(minis[i]), w = box(wins[1]);
      const dx = b.x - w.x - (sx + i * STEP);
      if (Math.abs(dx) > 0.5) return `card ${i + 1} off by ${dx.toFixed(2)} px`;
    }
    return true;
  });
  check("s18 loop clip shows a decoded frame", [tPick[2] + 0.1, cutOut - 1 / FPS], () => (img.complete && img.naturalWidth > 0) || "no frame");
  check("s18 nothing important overlaps", [cutIn, cutOut - 1 / FPS], () => {
    const els = [head, sub, ...chips, ...wins, ...uses, webLabel, noLabel, hyper, gsap, motion];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s18 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [head, sub, ...chips, ...slots, ...uses, hyper, gsap, motion, webLabel, noLabel].every((el) => {
      const b = box(el); return b.x >= 0 && b.x + b.w <= 1080 && b.y >= 128 && b.y + b.h <= 1120;
    }) || "outside");

  return (t) => {
    show(sub, t, tModel, Infinity, { dur: 0.5, dy: 12 });

    for (let i = 0; i < 3; i++) {
      // The pick: the chip turns accent with a small press (ζ 0.7, 4% travel), then the window opens.
      const on = t >= tPick[i];
      const press = on ? 1 - 0.04 * Math.sin(Math.PI * Math.min(1, (t - tPick[i]) / 0.18)) : 1;
      const tone = easeOut(p01(t, tPick[i], 0.2));
      chips[i].style.background = tone > 0 ? `color-mix(in srgb, ${C.accent} ${(tone * 100).toFixed(1)}%, ${C.paper})` : "";
      chips[i].style.color = tone > 0.5 ? "#ffffff" : C.ink;
      chips[i].style.boxShadow = tone > 0 ? "none" : "";
      chips[i].style.transform = `scale(${press.toFixed(4)})`;

      // The window fills its slot: height grows from the top edge on a spring (size may bounce,
      // opacity may not), and the dashed slot gives way under it.
      const s = openAt(i, t);
      const a = easeOut(p01(t, tPick[i], 0.3));
      wins[i].style.opacity = a.toFixed(4);
      wins[i].style.visibility = a > 0.001 ? "visible" : "hidden";
      wins[i].style.transform = `scaleY(${(0.82 + 0.18 * s).toFixed(4)})`;
      slots[i].style.opacity = (1 - a).toFixed(4);
      show(uses[i], t, tPick[i] + USE_LAG + 0.3, Infinity, { dur: 0.5, dy: 12 });
    }

    // three.js: render every frame the scene is on (the drift never stops), turn once on "3D".
    hero.render(t, { yaw: yawAt(t) });

    // Remotion: cards 2–4 deal in from the right, each on a spring, 80 ms apart.
    for (let i = 1; i < N; i++) {
      const s = spring01(t, dealAt(i), DEAL);
      const a = easeOut(p01(t, dealAt(i), 0.25));
      minis[i].style.transform = `translateX(${(DEAL_DX * (1 - s)).toFixed(2)}px)`;
      minis[i].style.opacity = a.toFixed(4);
      minis[i].style.visibility = a > 0.001 ? "visible" : "hidden";
    }

    // plain HTML: the real loop clip, from its window opening. Return the decode promise.
    return clip(clipTime(t));
  };
}
