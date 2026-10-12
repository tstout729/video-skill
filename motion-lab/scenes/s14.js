// s14 · Experiment 2: the directed hero hops on a floor drawn as an animation timeline.
// The playhead tracks the hop's own frames (shown at 1/3 speed), and each principle label lights
// on the exact hop frame from hero3d's HOP timing. Then one late take: the playhead rewinds, the
// hero replays the landing 6 frames late, and the squash label lights first, as a ghost; the hero
// touches down 6 frames after it.
import { createHero, heroPose, HOP } from "../hero3d.js";

export default function build(root, k) {
  const { make, place, show, cueIn, check, box, overlap, sfx, clamp, lerp, easeInOut, C, win } = k;
  const S = "s14";
  const snap = (t) => Math.round(t * 60) / 60;

  // ---------- timing (hop frames, at 1/3 speed) ----------
  const R = 20;                // hop frames per second of video: 60 fps / 3
  const LATE = 6;              // the late take runs the hero 6 frames behind the playhead
  const P = [                  // label, pinned frame, row (1 is nearest the ruler)
    { key: "anticipation", f: HOP.anticipation[1], row: 2 },  // f4: deepest crouch, still on the floor
    { key: "stretch", f: HOP.push[1], row: 1 },               // f8: scaleY 1.08 in the air
    { key: "arc", f: HOP.apex, row: 3 },                      // f21: apex of the arc
    { key: "squash", f: HOP.squash[0], row: 2 },              // f38: scaleY 0.86 on the floor
    { key: "overlap", f: 44, row: 1 },                        // f44: tilt peaks while the squash still recovers
    { key: "follow-through", f: HOP.settle, row: 3 },         // f65: everything settled
  ];
  const SQ = P[3];
  let SQ_CHIP = null;
  const T0 = snap(cueIn(k.id, "follow through") - HOP.settle / R);   // f65 lands on "follow-through"
  const TEND = T0 + HOP.settle / R;
  const TG = snap(cueIn(k.id, "late"));                                // the ghost lights on "late"
  const REW = 0.7, F_TAKE = 28, F_END = 70;
  const TT = TG - (SQ.f - F_TAKE) / R, TR = TT - REW;   // the take plays at the same 1/3 speed
  const TLAND = TT + (HOP.contact + LATE - F_TAKE) / R;  // the late touchdown
  const tLight = (f) => T0 + f / R;

  // Playhead frame fp and hero frame fh at time t (continuous, for motion and blur), snapped to
  // 1e-6 so an integer frame is exact (41.9999999 would leave the hero 1e-13 above the floor).
  const exact = (x) => Math.round(x * 1e6) / 1e6;
  function frames(t) {
    const { fp, fh } = rawFrames(t);
    return { fp: exact(fp), fh: exact(fh) };
  }
  function rawFrames(t) {
    if (t < T0) return { fp: 0, fh: 0 };
    if (t < TR) { const f = Math.min((t - T0) * R, HOP.settle); return { fp: f, fh: f }; }
    if (t < TT) { const e = easeInOut(clamp((t - TR) / REW)); return { fp: lerp(HOP.settle, F_TAKE, e), fh: lerp(HOP.settle, F_TAKE - LATE, e) }; }
    const fp = Math.min(F_TAKE + (t - TT) * R, F_END);
    return { fp, fh: fp - LATE };
  }
  // Labels and the frame readout change per output frame, so every subframe of a frame agrees.
  const quant = (t) => Math.ceil(t * 60 - 1e-6) / 60;
  const lit = (t, f) => frames(quant(t)).fp >= f - 1e-6;
  const stateAt = (t) => ({ hop: t - frames(t).fh / 60 });

  // ---------- the 3D studio ----------
  const canvas = place(make("canvas", "", "", root), 0, 0);
  const hero = createHero(canvas, { variant: "directed", width: 1080, height: 992, seed: 14, framing: { fill: 262 / 992, center: [0.5, 0.41] } });
  hero.render(win.cutIn, {});
  const V3 = hero.camera.position.constructor;
  const v = new V3();
  const proj = (x, y, z) => { v.set(x, y, z).project(hero.camera); return [(v.x + 1) * 540, (1 - v.y) * 496]; };
  const VP = proj(0, 0, -400);                     // where floor lines running away from the camera meet
  const YR = Math.round(proj(0, 0, 0.62)[1]);      // the ruler lies on the floor in front of the hero

  // ---------- the floor timeline ----------
  const FMAX = 70, X0 = 90, X1 = 990;
  const X = (f) => X0 + (f / FMAX) * (X1 - X0);
  const NS = "http://www.w3.org/2000/svg";
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
  // Ruler line and frame ticks, leaning toward the vanishing point so they lie on the floor.
  el("line", { x1: X0, y1: YR, x2: X1, y2: YR, stroke: C.ink, "stroke-width": 2.5, "stroke-linecap": "round" });
  for (let f = 0; f <= FMAX; f++) {
    const x = X(f), len = f % 10 === 0 ? 26 : f % 5 === 0 ? 17 : 10;
    const dx = VP[0] - x, dy = VP[1] - YR, d = Math.hypot(dx, dy);
    el("line", { x1: x, y1: YR, x2: x + (dx / d) * len, y2: YR + (dy / d) * len, stroke: f % 10 === 0 ? C.ink : C.muted,
      "stroke-width": f % 10 === 0 ? 2.5 : 1.6, "stroke-linecap": "round" });
  }
  // The dotted arc: the hero's centre, frame by frame, through the flight (f6-f36).
  const arcFrames = [];
  for (let f = HOP.liftoff; f <= HOP.contact; f++) arcFrames.push(f);
  const dots = arcFrames.map(() => el("circle", { r: 4.5, fill: C.accent, opacity: 0 }));
  const centre = (p) => [p.x, p.y + 0.5 * p.sy, 0];
  // Pinned frames on the ruler, and the late take's gap.
  const pins = P.map((p) => el("circle", { cx: X(p.f), cy: YR, r: 7, fill: C.accent, opacity: 0 }));
  const gap = el("line", { x1: X(SQ.f), y1: YR, x2: X(SQ.f + LATE), y2: YR, stroke: C.red, "stroke-width": 7, "stroke-linecap": "round", opacity: 0 });

  // Labels: chips below the ruler, each on a stem from its frame.
  const ROW = (r) => YR + 72 + (r - 1) * 64;
  const chips = P.map((p, i) => {
    const stem = make("div", "", "", root, { position: "absolute", left: `${X(p.f) - 1.5}px`, top: `${YR}px`, width: "3px",
      height: `${ROW(p.row) - YR}px`, background: C.faint, borderRadius: "2px" });
    const chip = make("div", "chip", `<span class="mono">f${p.f}</span><span>${p.key}</span>`, root,
      { position: "absolute", top: `${ROW(p.row)}px`, fontSize: "28px", padding: "8px 18px", gap: "10px" });
    if (p.f === HOP.settle) chip.style.right = `${1080 - (X(p.f) + 26)}px`;
    else chip.style.left = `${p.f === HOP.anticipation[1] ? X0 : X(p.f) - 26}px`;
    chip.dataset.label = p.key;
    return { ...p, i, stem, chip };
  });
  SQ_CHIP = chips[3];
  const lateNote = make("div", "chip red", `<span class="mono">6 f</span><span>late</span>`, root,
    { position: "absolute", left: "762px", top: `${ROW(SQ.row)}px`, fontSize: "28px", padding: "8px 18px" });

  // Playhead: a line across the ruler and a frame tag beneath it.
  const head = make("div", "", "", root, { position: "absolute", top: `${YR - 30}px`, width: "4px", height: "38px", background: C.accent, borderRadius: "2px" });
  const tag = make("div", "mono", "f0", root, { position: "absolute", top: `${YR + 12}px`, width: "92px", height: "46px", lineHeight: "46px",
    textAlign: "center", fontSize: "28px", fontWeight: "600", color: "#fff", background: C.accent, borderRadius: "23px" });
  tag.id = "s14-tag";

  const legend = place(make("div", "small", `<span class="mono" style="color:var(--ink)">65 frames</span> · shown at <span class="mono" style="color:var(--ink)">1/3</span> speed`, root,
    { fontSize: "28px" }), X0, 36);

  // An invisible marker on the hero's centre, for the speed graph and the checks.
  const track = make("div", "", "", root, { position: "absolute", width: "2px", height: "2px" });
  track.id = "s14-hero";

  // ---------- cues ----------
  const tChips = cueIn(k.id, "classic");
  const tLegend = cueIn(k.id, "character");
  const tNote = TG + 0.15;   // secondary: 150 ms after the ghost
  sfx(tLight(HOP.contact) + 1 / 60, "tap");   // touchdown
  sfx(TG + 1 / 60, "pop");                     // the ghost label lights
  sfx(TLAND + 1 / 60, "tap");                  // the late touchdown, 6 frames after its label

  // ---------- seek ----------
  const seek = (t) => {
    const st = stateAt(t);
    hero.render(t, st);
    const { fp, fh } = frames(t);
    const fq = frames(quant(t)).fp;

    // Hero centre on screen.
    const pose = hero.pose(t, st);
    const [hx, hy] = proj(...centre(pose));
    track.style.left = `${(hx - 1).toFixed(2)}px`;
    track.style.top = `${(hy - 1).toFixed(2)}px`;

    // Dotted arc: traced up to the hero's frame in the first pass, then kept; hidden near the hero.
    const traced = t < T0 ? -1 : t < TR ? fh : HOP.contact;
    arcFrames.forEach((f, i) => {
      const p = heroPose(f / 60, { hop: 0 });
      const c = centre(p);
      const near = Math.hypot(c[0] - pose.x, c[1] - (pose.y + 0.5 * pose.sy)) < 0.64;
      const [x, y] = proj(...c);
      dots[i].setAttribute("cx", x.toFixed(2));
      dots[i].setAttribute("cy", y.toFixed(2));
      dots[i].setAttribute("opacity", f <= traced + 1e-6 && !near ? "0.85" : "0");
    });

    // Playhead.
    head.style.left = `${(X(fp) - 2).toFixed(2)}px`;
    tag.style.left = `${(X(fp) - 46).toFixed(2)}px`;
    tag.textContent = `f${Math.floor(fq + 1e-6)}`;

    // Labels: enter as a list on "classic principles", light when the playhead reaches their frame.
    // In the late take only the squash label resets. The others keep their light but go quiet:
    // a white chip with accent text (6:1 contrast, so they stay readable), stems and pins at 40%.
    const late = t >= TR;
    const dim = 1 - 0.6 * easeInOut(clamp((t - TR) / 0.4));
    chips.forEach((c) => {
      const isSq = c === SQ_CHIP;
      const on = late && !isSq ? true : lit(t, c.f);
      const ghost = on && isSq && t >= TT;
      const quiet = late && !isSq;
      show(c.chip, t, tChips + c.i * 0.06, Infinity, { dur: 0.5, dy: 12 });
      c.stem.style.opacity = (show(c.stem, t, tChips + c.i * 0.06, Infinity, { dur: 0.5, dy: 0 }) * (isSq ? 1 : dim)).toFixed(4);
      c.chip.dataset.lit = on ? (ghost ? "ghost" : "1") : "0";
      Object.assign(c.chip.style, ghost
        ? { background: C.paper, color: C.red, boxShadow: "none", outline: `2.5px dashed ${C.red}`, outlineOffset: "-2.5px" }
        : quiet ? { background: C.paper, color: C.accent, boxShadow: `inset 0 0 0 2px ${C.accentSoft}`, outline: "none" }
        : on ? { background: C.accent, color: "#fff", boxShadow: "none", outline: "none" }
        : { background: C.paper, color: C.muted, boxShadow: "", outline: "none" });
      c.stem.style.background = ghost ? C.red : on ? C.accent : C.faint;
      pins[c.i].setAttribute("opacity", on ? (isSq ? 1 : dim).toFixed(3) : "0");
      pins[c.i].setAttribute("fill", ghost ? C.red : C.accent);
    });
    gap.setAttribute("opacity", show(lateNote, t, tNote, Infinity, { dur: 0.45, dy: 8 }).toFixed(3));
    show(legend, t, tLegend, Infinity, { dur: 0.5, dy: 10 });
  };

  // ---------- checks ----------
  const poseAt = (t) => hero.pose(t, stateAt(t));
  const tagAt = (f) => {
    const b = box(tag);
    return Math.abs(b.cx - X(f)) < 1 && tag.textContent === `f${f}` ? true : `playhead at ${b.cx.toFixed(1)} "${tag.textContent}", want ${X(f).toFixed(1)} "f${f}"`;
  };
  const lights = (c, cond) => (t) => {
    if (c.chip.dataset.lit !== "1") return `${c.key} not lit (${c.chip.dataset.lit})`;
    if (lit(t - 1 / 60, c.f)) return `${c.key} already lit on the frame before`;
    const pt = tagAt(c.f);
    if (pt !== true) return pt;
    if (Math.abs(frames(t).fh - c.f) > 1e-6) return `hero on f${frames(t).fh}, label on f${c.f}`;
    return cond(poseAt(t));
  };
  const [cA, cS, cArc, cSq, cO, cF] = chips;
  check(`${S}: anticipation lights at f4 on the crouch (scaleY <= 0.9, still on the floor)`, tLight(cA.f), lights(cA,
    (p) => (p.sy <= 0.9 && p.y === 0 && Math.abs(p.x + 0.6) < 1e-9) || `sy ${p.sy.toFixed(3)} y ${p.y} x ${p.x}`));
  check(`${S}: stretch lights at f8 in the air (scaleY >= 1.05)`, tLight(cS.f), lights(cS,
    (p) => (p.sy >= 1.05 && p.y > 0.1) || `sy ${p.sy.toFixed(3)} y ${p.y.toFixed(3)}`));
  check(`${S}: arc lights at f21, the apex`, tLight(cArc.f), lights(cArc, (p) => {
    const y = (f) => heroPose(f / 60, { hop: 0 }).y;
    return (Math.abs(p.y - HOP.height) < 1e-9 && y(20) < p.y && y(22) < p.y) || `y ${p.y.toFixed(4)}`;
  }));
  check(`${S}: squash lights at f38 on the floor (scaleY <= 0.9)`, tLight(cSq.f), lights(cSq,
    (p) => (p.sy <= 0.9 && p.y === 0) || `sy ${p.sy.toFixed(3)} y ${p.y}`));
  check(`${S}: overlap lights at f44, tilt at its peak while the squash still recovers`, tLight(cO.f), lights(cO, (p) => {
    const end = heroPose(5, { hop: 0 }).x;
    return (p.tilt >= 3.5 && p.sy < 0.95 && Math.abs(p.x - end) < 0.002) || `tilt ${p.tilt.toFixed(2)} sy ${p.sy.toFixed(3)}`;
  }));
  check(`${S}: follow-through lights at f65, settled, and the hero holds still until the rewind`, tLight(cF.f), lights(cF, (p) => {
    for (let tt = tLight(cF.f); tt < TR; tt += 1 / 60) {
      const q = poseAt(tt);
      if (Math.abs(q.sy - 1) >= 0.003 || Math.abs(q.tilt) >= 0.15) return `moving at ${tt.toFixed(3)}: sy ${q.sy.toFixed(4)} tilt ${q.tilt.toFixed(3)}`;
    }
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(3)}`;
  }));
  check(`${S}: hero rests on f0 until the hop`, T0, () => {
    const p = poseAt(T0 - 1 / 60);
    return (p.sy === 1 && p.y === 0 && tag.textContent === "f0") || `sy ${p.sy} tag ${tag.textContent}`;
  });
  check(`${S}: late take, the squash label lights as a ghost while the hero is still in the air`, TG, () => {
    const p = poseAt(TG);
    if (cSq.chip.dataset.lit !== "ghost") return `squash label ${cSq.chip.dataset.lit}`;
    if (lit(TG - 1 / 60, cSq.f)) return "ghost lit a frame early";
    if (tagAt(cSq.f) !== true) return tagAt(cSq.f);
    return (p.y > 0.3 && Math.abs(frames(TG).fh - (cSq.f - LATE)) < 1e-6) || `hero y ${p.y.toFixed(3)} on f${frames(TG).fh}`;
  });
  check(`${S}: late take, the hero touches down 6 frames after the ghost (playhead f42) and squashes on f44`, [TLAND - 3 / 60, TLAND + 7 / 60], (t) => {
    const p = poseAt(t), fp = frames(t).fp;
    // "On the floor" within 1e-9 heights: hero3d recomputes the frame as (t - hop) * 60, which can
    // leave 1e-13 of float error (about 3e-11 px).
    if (fp < HOP.contact + LATE - 1e-6) return p.y > 1e-9 || `on the floor early at playhead f${fp.toFixed(2)}`;
    if (p.y > 1e-9) return `still in the air at playhead f${fp.toFixed(2)}: y ${p.y}`;
    if (Math.abs(fp - (SQ.f + LATE)) < 1e-6) return p.sy <= 0.9 || `no squash at playhead f44: sy ${p.sy.toFixed(3)}`;
    return true;
  });
  check(`${S}: hero holds still from the end of the late take to the cut`, [TT + (F_END - F_TAKE) / R, win.cutOut - 1 / 60], (t) => {
    const p = poseAt(t);
    return (Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.2 && p.y === 0) || `sy ${p.sy.toFixed(4)} tilt ${p.tilt.toFixed(3)}`;
  });
  check(`${S}: labels, note, playhead tag and legend never overlap and stay on the stage`, [TG + 1, win.cutOut - 1 / 60], () => {
    const items = [...chips.map((c) => c.chip), lateNote, tag, legend];
    for (let i = 0; i < items.length; i++) {
      const b = box(items[i]);
      if (b.x < 40 || b.x + b.w > 1040 || b.y + b.h > 128 + 980) return `${items[i].textContent} off the stage: ${JSON.stringify(b)}`;
      for (let j = i + 1; j < items.length; j++) if (overlap(items[i], items[j]) > 0) return `${items[i].textContent} overlaps ${items[j].textContent}`;
    }
    for (const c of chips) for (const d of [...chips.map((x) => x.chip), lateNote]) if (d !== c.chip && overlap(c.stem, d) > 0) return `${c.key} stem crosses ${d.textContent}`;
    return true;
  });
  check(`${S}: every label sits below the ruler, clear of the hero's path`, TEND, () => {
    const floor = proj(0, 0, 0.35)[1] + 128;
    for (const c of chips) if (box(c.chip).y < floor) return `${c.key} above the floor line`;
    return true;
  });

  return seek;
}
