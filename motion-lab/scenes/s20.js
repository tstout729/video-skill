// s20 When things break, and the homework.
// At the cut: two real frames from this skill's walkthrough example, just before and just after the
// moment its Invite button broke (f1110 and f1122, the review stills that caught the empty gray box),
// and below them the render contract at 45%, its three rules and an empty fourth slot.
// On "compare" an arrow draws between the frames: "describe the difference". On "after it" the
// difference pins as a red note. On "Every fix" a green fix chip. Hero move: on "joins the contract"
// the chip flies into the empty slot on an arc (spring ζ 0.82) and the contract comes up to full.
// On "The homework" the frames leave (ease-in, 40% shorter than the entrances), the contract steps
// back, and the homework card arrives; its three boxes tick green on "make one", "two notes" and
// "post every prompt".

export default async function build(root, k) {
  const { make, place, show, cueIn, note, spring01, easeOut, easeIn, p01, lerp, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tCompare = cueIn(k.id, "compare");
  const tAfter = cueIn(k.id, "after it");
  const tEvery = cueIn(k.id, "Every fix");
  const tJoins = cueIn(k.id, "joins the contract");
  const tHome = cueIn(k.id, "The homework");
  // Each tick lands on a frame (the first frame at or after its cue), so its sound can follow by exactly one.
  const tTicks = [cueIn(k.id, "make one"), cueIn(k.id, "two notes"), cueIn(k.id, "post every prompt")].map((t) => Math.ceil(t * FPS - 1e-6) / FPS);
  const FLY = { duration: 1.3, damping: 0.82 };   // the hero move: about 0.9 s of travel
  const DIM = 0.45;

  // ================= phase 1: the two frames =================
  const top = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "560px" });
  const FW = 420, FH = 269, FY = 76, FX = [80, 580];
  // Crop of the 1920x1080 still: x 56–97%, y 16–62%: the Invite button, the box it grows into, the pointer.
  const SRC = ["assets/wt-f1110.jpg", "assets/wt-f1122.jpg"];
  const FR = [1110, 1122];                       // 18.50 s and 18.70 s at 60 fps
  const CROP = { x0: 0.56, x1: 0.97, y0: 0.16 };
  const IW = FW / (CROP.x1 - CROP.x0), IH = IW * 1080 / 1920;
  const imgs = [];
  FX.forEach((x, i) => {
    const lab = place(make("div", "", `<span class="mono" style="font-weight:600">f${FR[i]}</span><span style="color:${C.muted}">&nbsp;&nbsp;${i ? "just after" : "just before"}</span>`, top, { fontSize: "30px" }), x, 24);
    const frame = place(make("div", "", "", top, { overflow: "hidden", borderRadius: "18px", boxShadow: "var(--shadow)", background: C.paper }), x, FY, FW, FH);
    const img = make("img", "", "", frame, { position: "absolute", left: `${(-CROP.x0 * IW).toFixed(2)}px`, top: `${(-CROP.y0 * IH).toFixed(2)}px`, width: `${IW.toFixed(2)}px`, height: `${IH.toFixed(2)}px` });
    img.src = SRC[i];
    imgs.push({ lab, frame, img });
  });
  // The arrow between them, 2.5 px ink, and its instruction under the gap.
  const SVGNS = "http://www.w3.org/2000/svg";
  const arrow = document.createElementNS(SVGNS, "svg");
  arrow.setAttribute("width", "60"); arrow.setAttribute("height", "40");
  Object.assign(arrow.style, { position: "absolute", left: "510px", top: `${FY + FH / 2 - 20}px`, overflow: "visible" });
  arrow.innerHTML = `<path d="M4 20 H54 M42 9 L55 20 L42 31" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/>`;
  top.appendChild(arrow);
  const arrowPath = arrow.firstElementChild;
  const describe = make("div", "", "describe the difference", top, { position: "absolute", left: "0px", width: "1080px", top: `${FY + FH + 18}px`, textAlign: "center", fontSize: "30px", fontWeight: "600" });
  const diff = place(note(top, FR[1], "the label is gone and the box is empty gray", "red"), 0, FY + FH + 76);
  Object.assign(diff.style, { fontSize: "28px" });

  // ================= the contract =================
  const CY = 568, CH = 390;
  const contract = place(make("div", "card", "", root), 80, CY, 920, CH);
  place(make("div", "h2", "Render contract", contract), 40, 30);
  const RULES = ["No clocks or timers", "Seeded randomness", "Frames 0 to N−1"];
  const ROW0 = 112, ROWH = 64;
  RULES.forEach((r, i) => {
    place(make("div", "mono", String(i + 1), contract, { fontSize: "30px", color: C.faint, fontWeight: "600" }), 40, ROW0 + i * ROWH + 2);
    place(make("div", "body", r, contract), 84, ROW0 + i * ROWH);
  });
  place(make("div", "mono", "4", contract, { fontSize: "30px", color: C.faint, fontWeight: "600" }), 40, ROW0 + 3 * ROWH + 6);
  const SLOT_X = 84, SLOT_Y = ROW0 + 3 * ROWH - 4;
  const slot = place(make("div", "", "", contract, { border: `2.5px dashed ${C.faint}`, borderRadius: "999px" }), SLOT_X, SLOT_Y, 760, 54);

  // ================= the fix chip: appears under the note, then flies into slot 4 =================
  const fix = make("div", "chip green", `<span class="mono" style="font-weight:700">fix</span><span>a shape keeps its content while it changes</span>`, root, { position: "absolute", fontSize: "28px", left: "0px", top: "0px" });
  fix.dataset.track = "s20-fix";

  // ================= phase 2: the homework =================
  const home = place(make("div", "card", "", root), 80, 40, 920, 470);
  place(make("div", "h2", "The homework", home), 40, 32);
  place(make("div", "", "Experiment 3 is yours", home, { fontSize: "30px", color: C.muted, fontWeight: "500" }), 40, 92);
  const ITEMS = ["Make one", "Write 2 notes with frame numbers", "Post every prompt"];
  const items = ITEMS.map((txt, i) => {
    const row = place(make("div", "", "", home), 40, 168 + i * 96, 840, 64);
    const boxEl = place(make("div", "", "", row, { border: `2.5px solid ${C.ink}`, borderRadius: "14px" }), 0, 4, 56, 56);
    boxEl.innerHTML = `<svg width="56" height="56" viewBox="0 0 56 56" style="position:absolute;left:-2.5px;top:-2.5px"><path d="M16 29 L24.5 37.5 L40 20" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
    const label = place(make("div", "", txt, row, { fontSize: "40px", fontWeight: "600", letterSpacing: "-0.01em", whiteSpace: "nowrap" }), 84, 6);
    return { row, boxEl, tick: boxEl.querySelector("path"), label };
  });

  tTicks.forEach((t) => sfx(t + 1 / FPS, "toggle"));          // each box turns green on its cue frame; its sound one frame later

  await document.fonts.ready;
  await Promise.all(imgs.map(({ img }) => img.decode()));

  // Fix chip: its start under the note and its mark in slot 4 (stage coordinates).
  const fixW = fix.offsetWidth, fixH = fix.offsetHeight;
  diff.style.left = `${((1080 - diff.offsetWidth) / 2).toFixed(2)}px`;   // centred under the instruction
  const FIX0 = { x: (1080 - fixW) / 2, y: FY + FH + 150 };
  const FIX1 = { x: 80 + SLOT_X + (760 - fixW) / 2, y: CY + SLOT_Y + (54 - fixH) / 2 };
  const flyAt = (t) => spring01(t, tJoins, FLY);
  let flySettle = 0;
  const travel = Math.hypot(FIX1.x - FIX0.x, FIX1.y - FIX0.y);
  for (let f = 0; f < 240; f++) if (travel * Math.abs(1 - spring01(f / FPS, 0, FLY)) > 0.5) flySettle = f + 1;
  const tLanded = tJoins + flySettle / FPS;
  // No sound on the chip's landing: it settles softly into its slot, and the scene's three sounds
  // (the limit) belong to the three ticks.

  // ---- checks ----
  const EXIT = 0.3;
  check("s20 cut is a finished picture: both real frames decoded, labelled, the contract behind", cutIn, () =>
    (imgs.every(({ img }) => img.complete && img.naturalWidth === 1920) && getComputedStyle(contract).visibility !== "hidden") || "missing");
  check(`s20 fix chip lands in slot 4 (±0.5 px) by f${Math.round(tLanded * FPS)} and stays`, [tLanded, cutOut - 1 / FPS], () => {
    const b = box(fix), s = box(slot);
    const dx = b.cx - s.cx, dy = b.cy - s.cy;
    return (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) || `off by ${dx.toFixed(2)}, ${dy.toFixed(2)}`;
  });
  tTicks.forEach((tt, i) => check(`s20 box ${i + 1} ticks on its cue, not before`, [tt - 2 / FPS, tt + 0.5], (t) => {
    const green = items[i].boxEl.style.background === "rgb(31, 138, 91)";
    return t < tt ? (!green || "green before its cue") : t >= tt + 0.2 ? (green || "not green") : true;
  }));
  check("s20 the frames and the homework card are never on screen together", [tHome - 1 / FPS, tHome + EXIT + 0.6], () =>
    !(Number(top.style.opacity) > 0.01 && Number(home.style.opacity) > 0.01) || `frames ${top.style.opacity} card ${home.style.opacity}`);
  check("s20 phase 1 notes, frames and chip never overlap", [cutIn, tJoins], () => {
    const els = [imgs[0].frame, imgs[1].frame, describe, diff, fix, contract];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (overlap(els[i], els[j]) > 0) return `${i} x ${j}`;
    return true;
  });
  check("s20 the homework card clears the contract and the stage edges", [tHome, cutOut - 1 / FPS], () => {
    const b = box(home), c = box(contract);
    return (overlap(home, contract) === 0 && b.y >= 128 && c.y + c.h <= 1120) || "overlap or outside";
  });
  check("s20 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [imgs[0].frame, imgs[1].frame, describe, diff, fix, contract, home].every((el) => {
      if (getComputedStyle(el).visibility === "hidden") return true;
      const b = box(el); return b.x >= 0 && b.x + b.w <= 1080 && b.y >= 128 && b.y + b.h <= 1120;
    }) || "outside");

  return (t) => {
    // Phase 1. The frames and their labels are on screen from the cut.
    const a = easeOut(p01(t, tCompare, 0.5));
    arrowPath.setAttribute("stroke-dashoffset", (1 - a).toFixed(4));
    arrow.style.visibility = a > 0 ? "visible" : "hidden";
    show(describe, t, tCompare + 0.3, Infinity, { dur: 0.5, dy: 10 });
    show(diff, t, tAfter, Infinity, { dur: 0.45, dx: -16, dy: 0 });
    // The frames and notes leave on "The homework": ease-in, 0.3 s.
    const out = easeIn(p01(t, tHome, EXIT));
    top.style.opacity = (1 - out).toFixed(4);
    top.style.transform = `translateY(${(-14 * out).toFixed(2)}px)`;
    top.style.visibility = out >= 1 ? "hidden" : "visible";

    // The contract: 45% until the fix joins it, full while it lands, back to 45% for the homework.
    const up = easeOut(p01(t, tJoins + 0.3, 0.5)), back = easeOut(p01(t, tHome, 0.4));
    contract.style.opacity = (DIM + (1 - DIM) * up - (1 - DIM) * back * up).toFixed(4);
    slot.style.opacity = (1 - easeOut(p01(t, tJoins + 0.5, 0.3))).toFixed(4);

    // The fix chip: enters under the note, then flies to slot 4 on an arc (it bows 90 px right).
    const vin = show(fix, t, tEvery, Infinity, { dur: 0.45, dx: -16, dy: 0 });
    const s = flyAt(t);
    const x = lerp(FIX0.x, FIX1.x, s) + 90 * Math.sin(Math.PI * Math.min(1, Math.max(0, s)));
    const y = lerp(FIX0.y, FIX1.y, s);
    fix.style.left = `${x.toFixed(2)}px`;
    fix.style.top = `${y.toFixed(2)}px`;
    // After landing it belongs to the contract, so it steps back with it.
    fix.style.opacity = (vin * (1 - (1 - DIM) * back * up)).toFixed(4);

    // Phase 2: the homework card, its rows 60 ms apart, then the ticks.
    // It enters only once the frames have left, so the two never overlap legibly.
    show(home, t, tHome + EXIT, Infinity, { dur: 0.5, dy: 16 });
    items.forEach((it, i) => {
      show(it.row, t, tHome + EXIT + 0.1 + 0.06 * i, Infinity, { dur: 0.45, dy: 10 });
      const g = t >= tTicks[i];
      it.boxEl.style.background = g ? C.green : "transparent";
      it.boxEl.style.borderColor = g ? C.green : C.ink;
      it.tick.setAttribute("stroke-dashoffset", (1 - easeOut(p01(t, tTicks[i], 0.18))).toFixed(4));
      const pop = g ? 1 + 0.08 * Math.sin(Math.PI * Math.min(1, (t - tTicks[i]) * FPS / 6)) : 1;
      it.boxEl.style.transform = `scale(${pop.toFixed(4)})`;
    });
  };
}
