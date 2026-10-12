// s17 · Feelings into numbers. Two rows: "make it pop" becomes "+8% · 6 frames · on the beat" and a
// card pops 8% over 6 frames, peaking exactly on four beats of the bed; "it drags" becomes "each hold
// −1 beat" and a hold bar shortens by one beat, ending on the grid. Then the receipts: a log card
// with a follow-up count, pinned with a check.

// The receipt is from the article (Experiment 1, directed side: fifteen follow-ups over four review
// rounds). The brief's "23 notes" is not in the article, so it is not shown.
const RECEIPT = { kicker: "Experiment 1 · directed side", line: "4 review rounds · 15 follow-ups" };

export default function build(root, k) {
  const { make, place, show, cueIn, typeOn, check, box, overlap, sfx, swap, style, mix, clamp, easeOut, easeInOut, spring01, nearestBeat, C, win } = k;
  const S = "s17";

  // ---------- cues ----------
  const tPop = cueIn(k.id, "make it pop");
  const tBecomes1 = cueIn(k.id, "becomes", 1);
  const tDrags = cueIn(k.id, "it drags");
  const tBecomes2 = cueIn(k.id, "becomes", 2);
  const tShorter = cueIn(k.id, "shorter");
  const tPost = cueIn(k.id, "post");
  const tReceipts = cueIn(k.id, "receipts");
  const CPS = 30;

  // Four pops, each peaking exactly on a beat of the 120 BPM bed, starting once the numbers are typed.
  const L1 = "+8% · 6 frames · on the beat";
  const typed1 = tBecomes1 + L1.length / CPS;
  const firstBeat = nearestBeat(typed1 + 0.25);
  const BEATS = [0, 1, 2, 3].map((i) => firstBeat + i * 0.5);
  const HALF = 3 / 60;                              // 3 frames up, 3 frames down: 6 frames
  const popAt = (t) => {
    for (const b of BEATS) {
      const u = (t - (b - HALF)) / (2 * HALF);
      // Raised cosine: zero speed at both ends, so it eases in and out (1, 1.02, 1.06, 1.08, 1.06, 1.02, 1).
      if (u > 0 && u < 1) return 1 + 0.08 * (1 - Math.cos(2 * Math.PI * u)) / 2;
    }
    return 1;
  };

  // ---------- layout ----------
  place(make("div", "h2", "Feelings → numbers", root), 80, 44);

  const feeling = (text, y) => place(make("div", "h2", `“${text}”`, root), 80, y);
  const numbers = (y) => {
    const row = place(make("div", "", "", root, { display: "flex", alignItems: "baseline", gap: "16px" }), 80, y);
    const arrow = make("div", "h2", "→", row, { color: C.accent });
    const text = make("div", "mono", "", row, { fontSize: "36px", fontWeight: "550", color: C.ink, whiteSpace: "pre" });
    return { row, arrow, text };
  };

  // Row 1: make it pop.
  const f1 = feeling("make it pop", 160);
  const n1 = numbers(234);
  const popWrap = place(make("div", "", "", root), 780, 132, 220, 140);
  const popCard = make("div", "card", "", popWrap, { left: "0px", top: "0px", width: "220px", height: "140px", transformOrigin: "50% 50%" });
  popCard.id = "s17-pop";
  popCard.innerHTML = `<svg width="220" height="140" viewBox="0 0 220 140" style="position:absolute;left:0;top:0">
    <path d="M94 46 Q94 38 101 42 L131 62 Q137 70 131 78 L101 98 Q94 102 94 94 Z" fill="${C.accent}"/></svg>`;
  const dots = [0, 1, 2, 3].map((i) => place(make("div", "", "", root, { width: "16px", height: "16px", borderRadius: "8px", background: C.line }), 830 + i * 40, 300));

  // Row 2: it drags.
  const f2 = feeling("it drags", 420);
  const n2 = numbers(494);
  const BX = 760, BW = 56, BY = 440, BH = 44;
  const grid = place(make("div", "", "", root), 0, 0);
  for (let i = 0; i <= 4; i++) place(make("div", "", "", grid, { width: "2.5px", height: `${BH + 24}px`, background: C.faint, borderRadius: "2px" }), BX + i * BW - 1.25, BY - 12);
  const ghost = place(make("div", "", "", root, { border: `2.5px dashed ${C.faint}`, borderRadius: "10px" }), BX + 3 * BW + 4, BY, BW - 8, BH);
  const bar = place(make("div", "", "", root, { background: C.accent, borderRadius: "10px" }), BX + 4, BY, 4 * BW - 8, BH);
  bar.id = "s17-bar";
  const holdA = place(make("div", "mono", "hold · 4 beats", root, { fontSize: "28px", color: C.muted }), BX, BY + BH + 24);
  const holdB = place(make("div", "mono", "hold · 3 beats", root, { fontSize: "28px", color: C.ink }), BX, BY + BH + 24);

  // Row 3: receipts.
  const card = place(make("div", "card", "", root), 60, 700, 960, 196);
  card.id = "s17-log";
  place(make("div", "small", `<span class="mono">log.md</span> · ${RECEIPT.kicker}`, card, { fontSize: "28px", color: C.muted }), 44, 40);
  place(make("div", "mono", RECEIPT.line, card, { fontSize: "40px", fontWeight: "600", color: C.ink }), 44, 100);
  const pin = place(make("div", "", `<svg width="64" height="64" viewBox="0 0 64 64" style="display:block"><circle cx="32" cy="32" r="30" fill="${C.green}"/><path d="M20 33l8.5 8.5L45 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    root, { width: "64px", height: "64px", transformOrigin: "50% 50%" }), 940, 700 - 26);
  pin.id = "s17-check";

  const SHRINK = 0.6;
  sfx(tReceipts + 1 / 60, "success");               // the check pins on the log

  // ---------- seek ----------
  const seek = (t) => {
    // Row 1
    show(f1, t, tPop, Infinity, { dur: 0.5, dy: 12 });
    show(popWrap, t, tPop + 0.15, Infinity, { dur: 0.5, dy: 12 });
    dots.forEach((d) => show(d, t, tPop + 0.15, Infinity, { dur: 0.5, dy: 12 }));
    show(n1.row, t, tBecomes1, Infinity, { dur: 0.3, dy: 0 });
    typeOn(n1.text, L1, t, tBecomes1, CPS);
    popCard.style.transform = `scale(${popAt(t).toFixed(5)})`;
    // Beat dots: each lights on its beat (2 a second, under the 3 flashes/s limit) and fades in 0.2 s.
    dots.forEach((d, i) => {
      const lit = t >= BEATS[i] - 1e-6 ? 1 - easeInOut(clamp((t - BEATS[i] - 0.18) / 0.2)) : 0;
      d.style.background = mix(C.line, C.accent, lit);
    });

    // Row 2
    show(f2, t, tDrags, Infinity, { dur: 0.5, dy: 12 });
    show(grid, t, tDrags + 0.15, Infinity, { dur: 0.5, dy: 0 });
    show(bar, t, tDrags + 0.15, Infinity, { dur: 0.5, dy: 0 });
    show(n2.row, t, tBecomes2, Infinity, { dur: 0.3, dy: 0 });
    typeOn(n2.text, "each hold −1 beat", t, tBecomes2, CPS);
    const p = easeInOut(clamp((t - tShorter) / SHRINK));
    bar.style.width = `${(4 * BW - 8 - p * BW).toFixed(2)}px`;
    ghost.style.opacity = (easeOut(clamp((t - tShorter - 0.2) / 0.4))).toFixed(4);
    show(holdA, t, tDrags + 0.15, Infinity, { dur: 0.5, dy: 0 });
    if (t >= tShorter + SHRINK) {
      const s = swap(t, tShorter + SHRINK);
      style(holdA, s.out); style(holdB, s.in);
    } else style(holdB, { opacity: 0, blur: 0, y: 0 });

    // Row 3
    show(card, t, tPost, Infinity, { dur: 0.5, dy: 16 });
    const a = spring01(t, tReceipts, { duration: 0.45, damping: 0.82 });
    style(pin, { opacity: easeOut(clamp((t - tReceipts) / 0.2)), scale: 0.4 + 0.6 * a });
  };

  // ---------- checks ----------
  const px = (el) => box(el);
  check(`${S}: each pop peaks at +8% exactly on a beat of the 120 BPM grid`, BEATS[0], () => {
    for (const b of BEATS) {
      if (Math.abs(b * 2 - Math.round(b * 2)) > 1e-9) return `pop at ${b} is off the beat grid`;
      if (Math.abs(popAt(b) - 1.08) > 1e-9) return `peak ${popAt(b)} at ${b}`;
    }
    return true;
  });
  BEATS.forEach((b, i) => check(`${S}: pop ${i + 1} lasts 6 frames (f${Math.round(b * 60) - 3}–f${Math.round(b * 60) + 3}) and peaks on f${Math.round(b * 60)}`,
    [b - 4 / 60, b + 4 / 60], (t) => {
      const d = Math.round((t - b) * 60), s = popAt(t);
      const card = px(popCard).w / 220;
      if (Math.abs(card - s) > 0.002) return `card drawn at ${card.toFixed(4)}, pop ${s.toFixed(4)}`;
      if (Math.abs(d) >= 3) return Math.abs(s - 1) < 1e-9 || `still scaled ${s.toFixed(4)} at ${d} frames from the beat`;
      return (s > 1 && (d !== 0 || Math.abs(s - 1.08) < 1e-9)) || `scale ${s.toFixed(4)} at ${d} frames from the beat`;
    }));
  check(`${S}: the hold bar ends on the grid, one beat shorter, from ${(tShorter + SHRINK).toFixed(2)} s to the cut`, [tShorter + SHRINK, win.cutOut - 1 / 60], () => {
    const b = px(bar);
    const end = BX + 3 * BW - 4;
    return Math.abs(b.x + b.w - end) < 0.5 || `bar ends at ${(b.x + b.w).toFixed(2)}, grid at ${end}`;
  });
  check(`${S}: the check is pinned on the log card by ${(tReceipts + 0.6).toFixed(2)} s and holds to the cut`, [tReceipts + 0.6, win.cutOut - 1 / 60], () => {
    const b = px(pin), c = px(card);
    const on = b.x < c.x + c.w && b.x + b.w > c.x + c.w - 80 && b.y < c.y + 30;
    return (Number(pin.style.opacity) > 0.999 && Math.abs(b.w - 64) < 1 && on) || `check w ${b.w.toFixed(1)} op ${pin.style.opacity}`;
  });
  check(`${S}: rows, demos and the log card stay apart and inside the stage`, win.cutOut - 0.1, () => {
    const items = [f1, n1.row, popWrap, f2, n2.row, bar, holdB, card];
    for (let i = 0; i < items.length; i++) {
      const b = px(items[i]);
      if (b.x < 40 || b.x + b.w > 1040 || b.y < 128 || b.y + b.h > 128 + 980) return `${items[i].textContent || items[i].id} off the stage`;
      for (let j = i + 1; j < items.length; j++) if (overlap(items[i], items[j]) > 0) return `${items[i].textContent || items[i].id} overlaps ${items[j].textContent || items[j].id}`;
    }
    return true;
  });

  return seek;
}
