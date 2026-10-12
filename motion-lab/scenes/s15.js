// s15 · The audit. A counter of checks runs to 71; a scan reads a strip of 480 frame ticks and six
// ticks turn red as it finds the failures; on "fixed" each turns green and the readout becomes
// "71 / 71 pass". The hero move is the scan (ease-in-out across the strip).
export default function build(root, k) {
  const { make, place, show, cueIn, countTo, check, box, overlap, sfx, swap, style, rand, clamp, easeOut, easeInOut, mix, spring01, C, win } = k;
  const S = "s15";
  const NS = "http://www.w3.org/2000/svg";

  // ---------- cues ----------
  const tCount = cueIn(k.id, "ran");          // counts 0 → 71, landing as the narrator says "seventy-one"
  const tScan = cueIn(k.id, "four");          // the scan reads the 480 frames
  const tSix = cueIn(k.id, "six");            // "Six failed": the readout
  const tFix = cueIn(k.id, "fixed");          // each tick turns green
  const COUNT = 1.0, SCAN = 2.0, FIX_STAGGER = 0.06, FIX_DUR = 0.3;
  const tSwap = tFix + 0.15;                  // the readout follows the ticks by 150 ms (kit swap: out 0.14, gap 0.04, in 0.22)

  // ---------- layout ----------
  const title = place(make("div", "h2", "Automated audit", root), 80, 108);

  const counter = place(make("div", "", "", root, { display: "flex", alignItems: "baseline", gap: "22px" }), 80, 176);
  const num = make("div", "mono", "0", counter, { width: "206px", textAlign: "left", fontSize: "168px", fontWeight: "600",
    letterSpacing: "-0.04em", lineHeight: "1" });
  num.id = "s15-count";
  make("div", "h2", "checks", counter);

  const card = place(make("div", "card", "", root), 60, 420, 960, 362);
  const L = 100, Rx = 980, N = 480, T0 = 562, T1 = 690;   // tick strip, stage coords
  const xOf = (f) => L + ((f + 0.5) / N) * (Rx - L);
  place(make("div", "body", `<span class="mono">480</span> frames`, root, { color: C.muted }), 100, 446);
  place(make("div", "mono", "f0", root, { fontSize: "28px", color: C.muted }), 100, 716);
  place(make("div", "mono", "f479", root, { fontSize: "28px", color: C.muted, textAlign: "right" }), 780, 716, 200);

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", 1080); svg.setAttribute("height", 992);
  Object.assign(svg.style, { position: "absolute", left: "0px", top: "0px", overflow: "visible" });
  root.appendChild(svg);
  const el = (tag, attrs, parent = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const [a, b] of Object.entries(attrs)) n.setAttribute(a, b);
    parent.appendChild(n);
    return n;
  };
  // 480 ticks, a taller one each second (60 frames). Two copies: faint, and ink revealed by the scan.
  const ticks = (stroke) => {
    let d = "";
    for (let f = 0; f < N; f++) {
      const x = xOf(f).toFixed(2), top = f % 60 === 0 ? T0 - 14 : T0;
      d += `M${x} ${top}V${T1}`;
    }
    return el("path", { d, stroke, "stroke-width": 1.1, fill: "none" });
  };
  ticks(C.line);
  const clip = el("clipPath", { id: "s15-clip" }, el("defs", {}));
  const clipRect = el("rect", { x: L - 2, y: T0 - 20, width: 0, height: T1 - T0 + 40 }, clip);
  const ink = ticks(C.muted);
  ink.setAttribute("clip-path", "url(#s15-clip)");

  // The scan: an accent bar crossing the strip on ease-in-out.
  const scanX = (t) => L + (Rx - L) * easeInOut(clamp((t - tScan) / SCAN));
  const scan = make("div", "", "", root, { position: "absolute", top: `${T0 - 30}px`, width: "4px", height: `${T1 - T0 + 46}px`,
    background: C.accent, borderRadius: "2px" });
  scan.id = "s15-scan";

  // Six failing frames, seeded, spread across the strip.
  const r = rand("s15-fails");
  const fails = [];
  while (fails.length < 6) {
    const f = 30 + Math.floor(r() * (N - 70));
    if (fails.every((g) => Math.abs(g - f) > 50)) fails.push(f);
  }
  fails.sort((a, b) => a - b);
  // When the scan crosses each one (bisection on the ease-in-out), at build time.
  const crossAt = (x) => {
    let a = tScan, b = tScan + SCAN;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (scanX(m) < x) a = m; else b = m; }
    return b;
  };
  const marks = fails.map((f, i) => {
    const g = el("g", { opacity: 0 });
    const bar = el("rect", { x: xOf(f) - 2.5, y: T0 - 16, width: 5, height: T1 - T0 + 32, rx: 2.5, fill: C.red }, g);
    const dot = el("circle", { cx: xOf(f), cy: T0 - 34, r: 9, fill: C.red }, g);
    return { f, i, g, bar, dot, found: crossAt(xOf(f)), fixed: tFix + i * FIX_STAGGER };
  });

  // Readout: "6 failed" (red), then "71 / 71 pass" (green) with a drawn check.
  const chipCss = { fontSize: "40px", padding: "14px 30px", gap: "14px" };
  const failed = place(make("div", "chip red", `<span class="mono">6</span><span>failed</span>`, root, chipCss), 80, 832);
  const check2 = `<svg width="34" height="34" viewBox="0 0 34 34" style="display:block"><path d="M7 17.5l6.5 6.5L27 10.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const pass = place(make("div", "chip green", `${check2}<span class="mono">71 / 71</span><span>pass</span>`, root, chipCss), 80, 832);
  failed.id = "s15-failed"; pass.id = "s15-pass";

  sfx(tSix + 1 / 60, "pop");                       // the failures pinned as a note
  sfx(tSwap + 0.18 + 1 / 60, "success");           // the readout turns green

  // ---------- seek ----------
  const seek = (t) => {
    countTo(num, t, tCount, tCount + COUNT, 0, 71);
    const x = scanX(t);
    clipRect.setAttribute("width", Math.max(0, x - L + 2).toFixed(2));
    scan.style.left = `${(x - 2).toFixed(2)}px`;
    show(scan, t, tScan - 0.3, tScan + SCAN, { dur: 0.3, dy: 0 });

    for (const m of marks) {
      const on = t >= m.found;
      m.g.setAttribute("opacity", on ? easeOut(clamp((t - m.found) / 0.15)).toFixed(4) : "0");
      m.dot.setAttribute("r", (9 * (0.45 + 0.55 * spring01(t, m.found, { duration: 0.4, damping: 0.82 }))).toFixed(2));
      const p = easeInOut(clamp((t - m.fixed) / FIX_DUR));
      const c = mix(C.red, C.green, p);
      m.bar.setAttribute("fill", c); m.dot.setAttribute("fill", c);
      m.g.dataset.state = !on ? "hidden" : p >= 1 ? "green" : p > 0 ? "turning" : "red";
    }

    // "6 failed" enters on "six"; at the swap it leaves and "71 / 71 pass" enters (kit swap).
    if (t < tSwap) {
      show(failed, t, tSix, Infinity, { dur: 0.5, dy: 12 });
      failed.style.filter = "none";
      style(pass, { opacity: 0, blur: 0, y: 0 });
      pass.style.visibility = "hidden";
    } else {
      const s = swap(t, tSwap);
      style(failed, s.out);
      style(pass, s.in);
      failed.style.visibility = s.out.opacity < 0.001 ? "hidden" : "visible";
      pass.style.visibility = s.in.opacity < 0.001 ? "hidden" : "visible";
    }
  };

  // ---------- checks ----------
  const reds = () => marks.filter((m) => m.g.dataset.state === "red").length;
  check(`${S}: the counter lands on 71 with "seventy-one" and holds to the cut`, [tCount + COUNT, win.cutOut - 1 / 60],
    () => num.textContent === "71" || `counter ${num.textContent}`);
  check(`${S}: the scan reaches f479 at the end of the strip, then leaves`, tScan + SCAN, () => {
    const b = box(scan);
    return Math.abs(b.cx - Rx) < 0.5 || `scan at ${b.cx.toFixed(2)}, want ${Rx}`;
  });
  check(`${S}: each tick turns red once the scan reaches it, never ahead of the scan`, [tScan - 0.1, tScan + SCAN + 0.1], () => {
    const x = box(scan).cx;
    for (const m of marks) {
      const shown = m.g.dataset.state !== "hidden";
      if (shown && xOf(m.f) > x + 0.5) return `f${m.f} red ahead of the scan (x ${x.toFixed(1)})`;
      if (!shown && xOf(m.f) < x - 15) return `f${m.f} passed but not red (x ${x.toFixed(1)})`;
    }
    return true;
  });
  check(`${S}: on "six" the strip shows exactly six red ticks and the "6 failed" note`, tSix + 0.5, () =>
    (reds() === 6 && Number(failed.style.opacity) > 0.999 && failed.textContent.includes("failed")) || `${reds()} red, readout ${failed.style.opacity}`);
  const tDone = Math.max(tSwap + 0.4, tFix + 5 * FIX_STAGGER + FIX_DUR);   // the last tick and the readout settle
  check(`${S}: all six green and "71 / 71 pass" settled by ${tDone.toFixed(2)} s, held to the cut`, [tDone, win.cutOut - 1 / 60], () => {
    const green = marks.filter((m) => m.g.dataset.state === "green").length;
    return (green === 6 && Number(pass.style.opacity) > 0.999 && Number(failed.style.opacity) < 0.001) || `${green} green, pass ${pass.style.opacity}`;
  });
  check(`${S}: title, counter, strip and readout stay apart and inside the stage`, tSwap + 0.5, () => {
    const items = [title, counter, card, pass];
    for (let i = 0; i < items.length; i++) {
      const b = box(items[i]);
      if (b.x < 40 || b.x + b.w > 1040 || b.y < 128 || b.y + b.h > 128 + 980) return `${items[i].textContent || "card"} off the stage`;
      for (let j = i + 1; j < items.length; j++) if (overlap(items[i], items[j]) > 0) return `${items[i].textContent} overlaps ${items[j].textContent}`;
    }
    return true;
  });

  return seek;
}
