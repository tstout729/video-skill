// s07 The render contract. A card titled "Render contract" fills with three rules on their cues, each
// with a live demo (finished rules step back to 45%):
//   1 "No clocks or timers": a clock ticks until a red strike lands on "timers", then it stops.
//   2 "Seeded randomness": two fields of the same 16 dots. Left, labelled `Math.random`, is re-drawn
//     with new random offsets on every video frame (reseeded from the frame number, so the render
//     stays reproducible); right, `rand(seed)`, holds still.
//   3 "Loops render frames 0 to N−1": a strip of 8 frames of a dot going round, played into a
//     preview at 0.16 s a frame. Hero move: on "because frame N" a 9th frame slides in (ζ 0.82); on
//     "repeats" it turns red ("frame N = frame 0"). The playback then shows the hitch twice: the dot
//     holds at the top for two steps (N, then 0) while the preview rings red and "hitch" lights. Right
//     after the second, frame N is removed and the loop runs smoothly to the cut.

export default function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, easeIn, p01, rand, check, sfx, box, overlap, clamp, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tClock = cueIn(k.id, "no clocks");
  const tTimers = cueIn(k.id, "timers");
  const tSeed = cueIn(k.id, "seeded");
  const tLoop = cueIn(k.id, "a loop");
  const tN = cueIn(k.id, "because");                      // N slides in as "because frame N" begins
  const tRed = cueIn(k.id, "repeats");
  const tCauses = cueIn(k.id, "causes a hitch");

  // ---- the card (on screen from the cut) ----
  const CX = 60, CY = 24, CW = 960, CH = 944;
  const card = place(make("div", "card", "", root, { overflow: "hidden" }), CX, CY, CW, CH);
  make("div", "h2", "Render contract", card, { position: "absolute", left: "48px", top: "36px" });
  make("div", "", "pasted under every motion prompt", card, { position: "absolute", right: "48px", top: "48px", fontSize: "28px", color: C.muted });
  // Each rule's number sits faint in its row from the cut (an empty numbered form); the rule fills it.
  const nums = [];
  const rule = (y, n, html) => {
    nums.push(make("div", "mono", String(n), card, { position: "absolute", left: "48px", top: `${y + 4}px`, fontSize: "30px", color: C.faint }));
    const g = make("div", "", "", card, { position: "absolute", left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px` });
    make("div", "", "", g);                                // keeps the rule text at children[1]
    make("div", "", html, g, { position: "absolute", left: "92px", top: `${y}px`, fontSize: "38px", fontWeight: "620", letterSpacing: "-0.015em", lineHeight: "1.2" });
    return g;
  };
  const divider = (y) => make("div", "", "", card, { position: "absolute", left: "48px", right: "48px", top: `${y}px`, height: "2px", background: C.line });
  divider(112);
  const RC = 706;                                          // centre of the demo column

  // ---- rule 1: no clocks or timers ----
  const r1 = rule(146, 1, "No clocks or timers");
  const clock = make("div", "", "", r1, { position: "absolute", left: `${RC - 52}px`, top: "132px", width: "104px", height: "104px" });
  clock.innerHTML = `<svg width="104" height="104" viewBox="0 0 104 104">
    <circle cx="52" cy="52" r="40" fill="none" stroke="${C.ink}" stroke-width="2.5"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${52 + 33 * Math.sin(a)}" y1="${52 - 33 * Math.cos(a)}" x2="${52 + 37 * Math.sin(a)}" y2="${52 - 37 * Math.cos(a)}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>`; }).join("")}
    <line x1="52" y1="52" x2="36" y2="38" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/>
    <line class="hand" x1="52" y1="52" x2="52" y2="20" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" style="transform-origin:52px 52px"/>
    <circle cx="52" cy="52" r="3.5" fill="${C.ink}"/></svg>`;
  const hand = clock.querySelector(".hand");
  // The strike draws from the clock's top left to its bottom right (scaled about its left end).
  const strike = make("div", "", "", r1, { position: "absolute", left: `${RC - 64}px`, top: "181px", width: "128px", height: "6px", borderRadius: "3px", background: C.red, transform: "scaleX(0)" });
  const STRIKE = 0.35;
  const tStruck = tTimers + STRIKE;
  // The second hand ticks 30° twice a second from the cue until the strike lands, then stops.
  const ticks = (t) => Math.floor((Math.min(t, tStruck) - tClock) * 2);
  divider(268);

  // ---- rule 2: seeded randomness ----
  const r2 = rule(300, 2, "Seeded randomness");
  const FW = 190, FH = 150, FY = 296, FX = [RC - FW - 16, RC + 16];
  const field = (x) => make("div", "", "", r2, { position: "absolute", left: `${x}px`, top: `${FY}px`, width: `${FW}px`, height: `${FH}px`, borderRadius: "16px", background: "#f6f5f2", boxShadow: "0 0 0 2px #d8d6d0", overflow: "hidden" });
  const fields = FX.map(field);
  // One seeded layout for both fields: a jittered 4 x 4 grid.
  const lay = rand("s07-field");
  const BASE = Array.from({ length: 16 }, (_, i) => ({
    x: 24 + (i % 4) * 47.3 + (lay() - 0.5) * 22, y: 22 + Math.floor(i / 4) * 35.3 + (lay() - 0.5) * 16, r: 5 + lay() * 4,
  }));
  const dots = fields.map((f) => BASE.map(() => make("div", "", "", f, { position: "absolute", borderRadius: "50%", background: C.ink })));
  // The unseeded field: new random offsets every video frame. Reseeding from the frame number keeps
  // it a pure function of t. Math.round, not floor: the renderer's 4 subframes for frame n sit at
  // (n − 0.3 … n) / 60, so all four round to n and each frame shows one sharp field.
  const JIT = 9;
  const jittered = (t) => {
    const r = rand(Math.round(t * FPS));
    return BASE.map((b) => ({ x: b.x + (r() - 0.5) * 2 * JIT, y: b.y + (r() - 0.5) * 2 * JIT, r: b.r * (0.8 + 0.4 * r()) }));
  };
  const setDot = (el, d) => Object.assign(el.style, { left: `${(d.x - d.r).toFixed(2)}px`, top: `${(d.y - d.r).toFixed(2)}px`, width: `${(2 * d.r).toFixed(2)}px`, height: `${(2 * d.r).toFixed(2)}px` });
  dots[1].forEach((el, i) => setDot(el, BASE[i]));
  const label = (x, text, color) => make("div", "mono", text, r2, { position: "absolute", left: `${x}px`, top: `${FY + FH + 12}px`, width: `${FW}px`, textAlign: "center", fontSize: "28px", fontWeight: "560", color });
  const labels = [label(FX[0], "Math.random", C.red), label(FX[1], "rand(seed)", C.green)];
  divider(516);

  // ---- rule 3: loops render frames 0 to N−1 ----
  const r3 = rule(548, 3, "Loops render<br>frames 0 to N−1");
  const N8 = 8, CELL = 84, GAP = 13.5, SY = 744;
  const cellX = (i) => 48 + i * (CELL + GAP);
  const angle = (i) => -Math.PI / 2 + (2 * Math.PI * (i % N8)) / N8;    // frame N = frame 0
  const picture = (size, track, dotR) => {
    const el = make("div", "", "", null, { position: "absolute", width: `${size}px`, height: `${size}px`, borderRadius: `${size * 0.16}px`, background: "#f6f5f2", boxShadow: "0 0 0 2px #d8d6d0" });
    el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${track}" fill="none" stroke="${C.line}" stroke-width="2.5"/><circle class="dot" r="${dotR}" fill="${C.accent}"/></svg>`;
    const dot = el.querySelector(".dot");
    const set = (i) => { dot.setAttribute("cx", (size / 2 + track * Math.cos(angle(i))).toFixed(2)); dot.setAttribute("cy", (size / 2 + track * Math.sin(angle(i))).toFixed(2)); };
    return { el, dot, set };
  };
  const cells = Array.from({ length: N8 + 1 }, (_, i) => {
    const p = picture(CELL, 26, 7);
    r3.appendChild(p.el);
    place(p.el, cellX(i), SY);
    p.set(i);
    p.label = make("div", "mono", i === N8 ? "N" : String(i), r3, { position: "absolute", left: `${cellX(i)}px`, top: `${SY + CELL + 10}px`, width: `${CELL}px`, textAlign: "center", fontSize: "28px", color: C.muted });
    return p;
  });
  const nCell = cells[N8];
  nCell.el.dataset.track = "s07-frame-n";
  const cursor = make("div", "", "", r3, { position: "absolute", top: `${SY - 7}px`, width: `${CELL + 14}px`, height: `${CELL + 14}px`, marginLeft: "-7px", borderRadius: "20px", border: `3px solid ${C.accent}`, boxSizing: "border-box" });
  const preview = picture(170, 58, 15);
  r3.appendChild(preview.el);
  place(preview.el, RC - 85, 544);
  preview.el.dataset.track = "s07-preview";
  const eq = place(make("div", "chip red", "frame N = frame 0", r3, { fontSize: "30px" }), 92, 664);
  const hitchTag = place(make("div", "chip red", "hitch", r3, { fontSize: "30px" }), RC - 85 - 150, 600);

  // Playback: one frame every 0.16 s. The schedule is fixed so that the second hitch lands on
  // "causes a hitch" and the first one 9 steps earlier; earlier cycles are the clean 8-frame loop.
  const D = 0.16;
  const S2 = tCauses + 0.1, S1 = S2 - 9 * D;               // frame N is shown at S1 and S2
  const tRemove = S2 + 2 * D;                              // the second hitch is over
  const firstN = S1 - N8 * D;                              // the cycle that first includes N
  const tPlay0 = firstN - N8 * D * Math.floor((firstN - (tLoop + 0.8)) / (N8 * D));
  const steps = [];                                        // [{t, frame}] in order
  for (let s = tPlay0; s < cutOut + 1; ) {
    for (let i = 0; i < N8; i++) steps.push({ t: s + i * D, frame: i });
    const withN = Math.abs(s - firstN) < 1e-6 || Math.abs(s - (S1 + D)) < 1e-6;
    if (withN) steps.push({ t: s + N8 * D, frame: N8 });
    s += (withN ? N8 + 1 : N8) * D;
  }
  const frameAt = (t) => {
    if (t < tPlay0) return 0;
    let f = 0;
    for (const st of steps) { if (st.t > t + 1e-9) break; f = st.frame; }
    return f;
  };
  const stalled = (t) => (t >= S1 && t < S1 + 2 * D) || (t >= S2 && t < S2 + 2 * D);
  const NSPRING = { duration: 1.0, damping: 0.82 }, N_FROM = 120;
  let nTouch = tN;                                         // N reaches its slot (spring crosses 1)
  for (let n = 1; n < 120; n++) if (spring01(tN + n / FPS, tN, NSPRING) >= 1) { nTouch = tN + n / FPS; break; }

  sfx(tStruck + 1 / FPS, "tap");                           // the strike lands
  sfx(nTouch + 1 / FPS, "tap");                            // frame N lands in its slot
  sfx(tRed + 0.12 + 1 / FPS, "pop");                       // "frame N = frame 0" pins

  // ---- checks ----
  check("s07 the Math.random field changes on every frame", [tSeed + 0.1, cutOut - 1 / FPS], (t) => {
    const a = jittered(t), b = jittered(t - 1 / FPS);
    const moved = Math.max(...a.map((d, i) => Math.hypot(d.x - b[i].x, d.y - b[i].y)));
    const shown = dots[0].every((el, i) => Math.abs(parseFloat(el.style.left) - (a[i].x - a[i].r)) < 0.01);
    return (moved > 3 && shown) || `largest move ${moved.toFixed(2)} px, on screen ${shown}`;
  });
  check("s07 the Math.random field is one sharp field per frame (all 4 subframes agree)", [tSeed + 0.1, tSeed + 2], (t) => {
    const a = jittered(t), b = jittered(t - 0.3 / FPS);
    return a.every((d, i) => d.x === b[i].x && d.y === b[i].y) || "subframes differ";
  });
  check("s07 the rand(seed) field holds still", [tSeed, cutOut - 1 / FPS], () =>
    dots[1].every((el, i) => Math.abs(parseFloat(el.style.left) - (BASE[i].x - BASE[i].r)) < 0.01 && Math.abs(parseFloat(el.style.top) - (BASE[i].y - BASE[i].r)) < 0.01) || "a seeded dot moved");
  check("s07 the clock stops once struck", [tStruck, tSeed], () => hand.style.transform === `rotate(${ticks(tStruck) * 30}deg)` || hand.style.transform);
  check("s07 frame N shows frame 0's picture", tRed, () =>
    (nCell.dot.getAttribute("cx") === cells[0].dot.getAttribute("cx") && nCell.dot.getAttribute("cy") === cells[0].dot.getAttribute("cy")) || "N differs from 0");
  check("s07 before N: the loop plays 0…7 with no repeat", [tPlay0, S1 - 1 / FPS], (t) => {
    const f = frameAt(t);
    return (f < N8 && cursor.style.left === `${cellX(f)}px`) || `frame ${f}`;
  });
  check("s07 the hitch: the preview holds frame 0's picture for two steps at each seam", [S1 - D, S2 + 3 * D], (t) => {
    const f = frameAt(t);
    const top = preview.dot.getAttribute("cx") === (85).toFixed(2) && Number(preview.dot.getAttribute("cy")) < 85;
    if (stalled(t)) return (top && (f === N8 || f === 0)) || `stall shows frame ${f}`;
    return true;
  });
  check("s07 the hitch lands on “causes a hitch” (±0.15 s)", tCauses, () => Math.abs(S2 - tCauses) <= 0.15 || `S2 ${S2.toFixed(2)}`);
  check("s07 frame N is red before it first plays", S1, () => nCell.el.style.boxShadow.includes("215, 38, 61") || nCell.el.style.boxShadow);
  check("s07 frame N settles in its slot (±0.5 px) before it first plays", [S1, tRemove], () => {
    const x = box(nCell.el).x;
    return Math.abs(x - (CX + cellX(N8))) < 0.5 || `N at ${x.toFixed(2)} (want ${CX + cellX(N8)})`;
  });
  check("s07 after removal: N never plays and is gone", [tRemove + 0.35, cutOut - 1 / FPS], (t) =>
    (frameAt(t) !== N8 && Number(nCell.el.style.opacity) < 0.01) || "N still there");
  check("s07 rules, demos and chips never overlap", [cutIn, cutOut - 1 / FPS], () => {
    const els = [r1.children[1], clock, r2.children[1], ...fields, ...labels, r3.children[1], eq, hitchTag, preview.el, ...cells.map((c) => c.el)];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${els[i].textContent.slice(0, 12) || i} x ${els[j].textContent.slice(0, 12) || j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s07 the card stays inside the stage", cutIn, () => { const b = box(card); return (b.y >= 128 && b.y + b.h <= 1120 && b.x >= 0 && b.x + b.w <= 1080) || "outside"; });

  return (t) => {
    // Finished rules step back to 45% as the next one arrives.
    const dim = (t0) => 1 - 0.55 * easeOut(p01(t, t0, 0.4));
    show(r1, t, tClock, Infinity, { dur: 0.5, dy: 14 });
    r1.style.opacity = (Number(r1.style.opacity) * dim(tSeed)).toFixed(4);
    show(r2, t, tSeed, Infinity, { dur: 0.5, dy: 14 });
    r2.style.opacity = (Number(r2.style.opacity) * dim(tLoop)).toFixed(4);
    show(r3, t, tLoop, Infinity, { dur: 0.5, dy: 14 });
    [[tClock, tSeed], [tSeed, tLoop], [tLoop, Infinity]].forEach(([on, next], i) => {
      nums[i].style.color = t >= on ? C.muted : C.faint;
      nums[i].style.opacity = (Number.isFinite(next) ? dim(next) : 1).toFixed(4);
    });

    // 1: the hand ticks, the strike draws on (ease-out), the hand stops.
    hand.style.transform = `rotate(${Math.max(0, ticks(t)) * 30}deg)`;
    strike.style.transform = `rotate(45deg) translateX(-64px) scaleX(${easeOut(p01(t, tTimers, STRIKE)).toFixed(4)}) translateX(64px)`;

    // 2: a fresh field of offsets on every frame, left only.
    jittered(t).forEach((d, i) => setDot(dots[0][i], d));

    // 3: the strip arrives 50 ms a frame; the cursor and the preview follow the playback.
    cells.slice(0, N8).forEach((c, i) => {
      show(c.el, t, tLoop + 0.15 + i * 0.05, Infinity, { dur: 0.4, dy: 12 });
      show(c.label, t, tLoop + 0.15 + i * 0.05, Infinity, { dur: 0.4, dy: 0 });
    });
    const f = frameAt(t);
    cursor.style.left = `${cellX(f)}px`;
    show(cursor, t, tPlay0 - 0.2, Infinity, { dur: 0.25, dy: 0 });
    preview.set(f);
    const st = stalled(t);
    preview.el.style.boxShadow = st ? `0 0 0 4px ${C.red}` : "0 0 0 2px #d8d6d0";
    cursor.style.borderColor = f === N8 ? C.red : C.accent;

    // Hero: frame N slides in from the right on a spring, turns red on "repeats", leaves after the hitch.
    const sN = spring01(t, tN, NSPRING);
    const out = easeIn(p01(t, tRemove, 0.3));
    nCell.el.style.transform = `translateX(${((1 - sN) * N_FROM + 40 * out).toFixed(2)}px)`;
    const inA = easeOut(p01(t, tN, 0.3));
    nCell.el.style.opacity = (inA * (1 - out)).toFixed(4);
    nCell.el.style.visibility = inA * (1 - out) > 0.001 ? "visible" : "hidden";
    nCell.label.style.opacity = (easeOut(p01(t, tN + 0.3, 0.3)) * (1 - out)).toFixed(4);
    const red = easeOut(p01(t, tRed, 0.3));
    nCell.el.style.boxShadow = red > 0 ? `0 0 0 ${(2 + 2 * red).toFixed(2)}px rgba(215, 38, 61, ${red.toFixed(3)})` : "0 0 0 2px #d8d6d0";
    nCell.label.style.color = red > 0.5 ? C.red : C.muted;
    show(eq, t, tRed + 0.12, tRemove, { dur: 0.45, dx: -16, dy: 0 });

    // "hitch" lights for each stall and fades 0.25 s after it.
    const lit = (s) => (t >= s && t < s + 2 * D ? 1 : 1 - clamp((t - s - 2 * D) / 0.25));
    const h = t < S1 ? 0 : t < S2 ? (t < S1 + 2 * D + 0.25 ? lit(S1) : 0) : t < S2 + 2 * D + 0.25 ? lit(S2) : 0;
    hitchTag.style.opacity = h.toFixed(4);
    hitchTag.style.visibility = h > 0.001 ? "visible" : "hidden";
  };
}
