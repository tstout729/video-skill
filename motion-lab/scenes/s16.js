// s16 · The review loop, with the real review images from this project, staged one at a time:
// the contact sheet assembles cell by cell, the onion skin, the speed graph with its speed curve
// highlighted and its two sharp corners ringed, then the real catch: f1123, a card that opened as
// an empty gray box, with a red note pinned to it, and the fixed frame.
// The hero move of each stage is its image entering; there is one image on the stage at a time.

// The speed curve traced from assets/graph.png's own pixels (image px), and its two sharp corners.
const SPEED = [[145,974.5],[151,974.5],[157,974.5],[163,974.5],[169,974.5],[175,974.5],[181,974.5],[187,974.5],[193,974.5],[199,974.5],[205,974.5],[211,974.5],[217,974.5],[223,974.5],[229,974.5],[235,974.5],[241,974.5],[247,974.5],[253,974.5],[259,974.5],[265,974.0],[271,971.5],[277,969.0],[283,966.5],[289,962.5],[295,958.5],[301,956.5],[307,956.5],[313,956.5],[319,958.5],[325,962.5],[331,965.5],[337,966.5],[343,965.5],[349,965.0],[355,957.0],[361,946.0],[367,935.5],[369,925.5],[373,896.5],[379,853.5],[383,824.5],[384,821.0],[385,811.0],[389,811.0],[390,820.0],[391,821.5],[397,832.5],[403,843.0],[409,853.0],[415,863.0],[421,871.5],[427,875.5],[433,879.5],[439,883.5],[445,886.5],[451,889.5],[457,893.0],[463,896.0],[469,899.5],[475,902.5],[481,905.5],[487,908.5],[493,911.5],[499,914.5],[505,917.5],[511,920.5],[517,923.5],[523,926.5],[529,929.5],[535,932.5],[541,935.5],[547,938.5],[553,941.0],[559,944.0],[565,946.5],[571,949.5],[577,952.0],[583,954.5],[589,957.5],[595,960.0],[601,962.5],[607,965.5],[613,967.5],[619,970.5],[625,973.0],[631,971.5],[637,969.5],[643,968.0],[649,965.5],[655,962.5],[661,959.5],[667,956.5],[673,953.5],[679,951.5],[685,948.5],[691,945.5],[697,942.5],[703,939.5],[709,937.5],[715,934.5],[721,931.5],[727,928.5],[733,926.5],[739,925.5],[745,923.5],[751,921.5],[757,919.5],[763,917.0],[769,914.5],[775,911.5],[781,908.5],[787,905.5],[793,903.0],[799,900.5],[805,897.5],[811,894.5],[817,891.5],[823,888.5],[829,886.5],[835,883.5],[841,880.5],[847,877.5],[853,875.5],[859,872.5],[865,869.5],[871,867.0],[877,864.5],[883,861.5],[889,869.0],[895,881.5],[901,894.0],[907,912.5],[913,933.0],[919,952.0],[925,959.0],[931,964.5],[937,969.0],[943,969.5],[949,970.0],[955,970.5],[961,970.5],[967,970.5],[973,970.5],[979,970.0],[985,969.5],[991,969.5],[997,969.0],[1003,969.0],[1009,968.5],[1015,968.5],[1021,968.5],[1027,968.5],[1033,968.5],[1039,968.5],[1045,968.5],[1051,969.0],[1057,969.0],[1063,969.0],[1069,969.5],[1075,969.5],[1081,969.5],[1087,969.5],[1093,970.0],[1099,970.5],[1105,970.5],[1111,970.5],[1117,970.5],[1123,971.0],[1129,971.0],[1135,971.5],[1141,971.5],[1147,971.5],[1153,972.0],[1159,972.0],[1165,972.5],[1171,972.5],[1177,972.5],[1183,972.5],[1189,972.5],[1195,973.0],[1201,973.0],[1207,973.5],[1213,973.5],[1219,973.5],[1225,973.5],[1231,973.5],[1237,973.5],[1243,973.5],[1249,973.5],[1255,974.0],[1261,974.0],[1267,974.0],[1273,974.0],[1279,974.5],[1285,974.5],[1291,974.5],[1297,974.5],[1303,974.5],[1309,974.5],[1315,974.5],[1321,974.5],[1327,974.5],[1333,974.5],[1339,974.5],[1345,974.5],[1351,974.5],[1357,974.5],[1363,974.5],[1369,974.5],[1375,974.5],[1381,974.5],[1387,974.5],[1393,974.5],[1399,974.5],[1405,974.5],[1411,974.5],[1417,974.5],[1423,974.5],[1429,974.5],[1435,974.5],[1441,974.5],[1447,974.5],[1453,974.5],[1459,974.5],[1465,974.5],[1471,974.5],[1477,974.5],[1483,974.5],[1489,974.5],[1495,974.5],[1501,974.5],[1507,974.5],[1513,974.5],[1519,974.5],[1525,974.5],[1531,974.5],[1537,974.5],[1543,974.5],[1549,974.5],[1555,974.5],[1561,974.5],[1567,974.5],[1573,974.5],[1579,974.5],[1585,974.5],[1591,974.5],[1597,974.5],[1603,974.5],[1609,974.5],[1615,974.5],[1621,974.5],[1627,974.5],[1633,974.5],[1639,974.5],[1645,974.5],[1651,974.5],[1657,974.5],[1663,974.5],[1669,974.5],[1675,974.5],[1681,974.5],[1687,974.5],[1691,974.5]];
const CORNERS = [[387, 811], [885, 860]];   // the push-off peak (f506) and the touchdown drop (f535)

export default async function build(root, k) {
  const { make, place, show, cueIn, check, box, overlap, sfx, style, clamp, easeOut, easeInOut, mix, spring01, C, win } = k;
  const S = "s16";
  const NS = "http://www.w3.org/2000/svg";
  const loads = [];
  const img = (src, parent, css = {}) => {
    const el = make("img", "", "", parent, { position: "absolute", display: "block", maxWidth: "none", ...css });
    el.src = src;
    loads.push(el.decode());
    return el;
  };
  const svgIn = (parent, w, h) => {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("width", w); s.setAttribute("height", h);
    Object.assign(s.style, { position: "absolute", left: "0px", top: "0px", overflow: "visible" });
    parent.appendChild(s);
    return s;
  };
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [a, b] of Object.entries(attrs)) n.setAttribute(a, b);
    parent.appendChild(n);
    return n;
  };

  // ---------- cues ----------
  const tDraft = cueIn(k.id, "draft");
  const tRead = cueIn(k.id, "read a contact");
  const tOnion = cueIn(k.id, "onion skin");
  const tGraph = cueIn(k.id, "speed graph");
  const tCorners = cueIn(k.id, "sharp corners");
  const tWrite = cueIn(k.id, "write");
  const tNotes = cueIn(k.id, "notes");
  const tPoint = cueIn(k.id, "point");
  const IN = 0.5, OUT = 0.3;                       // entrances ease out over 0.5 s; exits ease in, 40% shorter
  const CELL_STAGGER = 0.06, CELL_IN = 0.45;
  const tSheetOut = tOnion - OUT, tOnionOut = tGraph - OUT, tGraphOut = tWrite;
  const tFrame = tWrite + OUT;                     // the f1123 frame lands just before "notes"
  const tDraw = tGraph + IN + 0.05, DRAW = 0.7;    // the curve highlight draws on once the graph has landed

  // ---------- header ----------
  place(make("div", "h2", "Render → look → fix", root), 80, 40);
  const chips = place(make("div", "", "", root, { display: "flex", gap: "14px", alignItems: "center" }), 80, 116);
  const chipCss = { fontSize: "28px", padding: "8px 18px" };
  const draft = make("div", "chip", `<span class="mono">render 1</span><span>·</span><span>draft</span>`, chips, chipCss);
  const slot = make("div", "", "", chips, { position: "relative", width: "260px", height: "50px" });
  const tool = (text) => make("div", "chip accent", text, slot, { ...chipCss, position: "absolute", left: "0px", top: "0px" });
  const tools = [tool("contact sheet"), tool("onion skin"), tool("speed graph")];

  // ---------- 1. contact sheet (2400 x 1549), assembled cell by cell ----------
  const SK = 0.4;
  const sheet = place(make("div", "", "", root, { background: "#f1efea", borderRadius: "20px", boxShadow: "var(--shadow)", overflow: "hidden" }),
    60, 268, 2400 * SK, Math.round(1549 * SK));
  sheet.id = "s16-sheet";
  const crop = (x, y, w, h) => {
    const c = place(make("div", "", "", sheet, { overflow: "hidden" }), x * SK, y * SK, w * SK, h * SK);
    img("assets/sheet.png", c, { left: `${-x * SK}px`, top: `${-y * SK}px`, width: `${2400 * SK}px` });
    return c;
  };
  crop(0, 0, 2400, 140);                           // the sheet's own header, there from the cut
  const CX = [45, 627, 1209, 1791], CY = [146, 608, 1070];
  const cells = [];
  CY.forEach((y) => CX.forEach((x) => {
    // An empty slot (the draft not yet read), then the real cell.
    place(make("div", "", "", sheet, { border: `2px dashed ${C.faint}`, borderRadius: "6px" }), x * SK, y * SK, 565 * SK, 362 * SK);
    cells.push(crop(x - 8, y - 8, 581, 452));
  }));

  // ---------- 2. onion skin (816 x 807) ----------
  const OK_ = 724 / 807;
  const onion = place(make("div", "", "", root, { borderRadius: "20px", boxShadow: "var(--shadow)", overflow: "hidden" }),
    Math.round((1080 - 816 * OK_) / 2), 214, Math.round(816 * OK_), 724);
  img("assets/onion.png", onion, { left: "0px", top: "0px", width: `${816 * OK_}px` });
  onion.id = "s16-onion";

  // ---------- 3. speed graph (1800 x 1105), its speed curve highlighted ----------
  const GK = 960 / 1800;
  const graph = place(make("div", "", "", root, { borderRadius: "20px", boxShadow: "var(--shadow)", overflow: "hidden" }), 60, 286, 960, Math.round(1105 * GK));
  img("assets/graph.png", graph, { left: "0px", top: "0px", width: "960px" });
  graph.id = "s16-graph";
  const gsvg = svgIn(graph, 960, Math.round(1105 * GK));
  const path = el("path", { d: SPEED.map(([x, y], i) => `${i ? "L" : "M"}${(x * GK).toFixed(2)} ${(y * GK).toFixed(2)}`).join(""),
    fill: "none", stroke: C.accent, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, gsvg);
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len} ${len}`;
  const rings = CORNERS.map(([x, y]) => el("circle", { cx: x * GK, cy: y * GK, r: 0, fill: "none", stroke: C.accent, "stroke-width": 2.5, opacity: 0 }, gsvg));

  // ---------- 4. the real catch: f1123 (1920 x 1080 frames) ----------
  const FK = 0.5;
  const frame = place(make("div", "", "", root, { borderRadius: "20px", boxShadow: "var(--shadow)", overflow: "hidden" }), 60, 250, 960, 540);
  frame.id = "s16-frame";
  img("assets/wt-before-1123.jpg", frame, { left: "0px", top: "0px", width: "960px" });
  const after = img("assets/wt-after-1123.jpg", frame, { left: "0px", top: "0px", width: "960px" });
  const fsvg = svgIn(frame, 960, 540);
  // The card in the frame spans x 1258-1649, y 316-617; the outline sits 6 px outside it.
  const outline = el("rect", { x: 1258 * FK - 6, y: 316 * FK - 6, width: 391 * FK + 12, height: 301 * FK + 12, rx: 18,
    fill: "none", stroke: C.red, "stroke-width": 2.5 }, fsvg);
  const notes = place(make("div", "", "", root, { display: "flex", gap: "16px", alignItems: "center" }), 80, 822);
  const noteCss = { fontSize: "30px", padding: "12px 22px" };
  const red = make("div", "chip red", `<span class="mono">f1123</span><span>· card opens as an empty gray box</span>`, notes, noteCss);
  const tick = `<svg width="30" height="30" viewBox="0 0 34 34" style="display:block"><path d="M7 17.5l6.5 6.5L27 10.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const fixed = make("div", "chip green", `${tick}<span>fixed</span>`, notes, noteCss);
  red.id = "s16-note"; fixed.id = "s16-fixed";

  sfx(tNotes + 1 / 60, "pop");                     // the note pins
  sfx(tPoint + 1 / 60, "success");                 // the frame is fixed

  await Promise.all(loads);

  // ---------- seek ----------
  const stages = [[sheet, -Infinity, tSheetOut], [onion, tOnion, tOnionOut], [graph, tGraph, tGraphOut], [frame, tFrame, Infinity]];
  const seek = (t) => {
    for (const [e, a, b] of stages) show(e, t, Number.isFinite(a) ? a : win.cutIn - 1, b, { dur: IN, dy: 16, scale: 0.985 });
    show(draft, t, tDraft, tGraphOut, { dur: IN, dy: 10 });
    show(tools[0], t, tRead, tSheetOut, { dur: IN, dy: 10 });
    show(tools[1], t, tOnion, tOnionOut, { dur: IN, dy: 10 });
    show(tools[2], t, tGraph, tGraphOut, { dur: IN, dy: 10 });

    cells.forEach((c, i) => show(c, t, tRead + i * CELL_STAGGER, Infinity, { dur: CELL_IN, dy: 0, scale: 0.94 }));

    const p = easeInOut(clamp((t - tDraw) / DRAW));
    path.style.strokeDashoffset = (len * (1 - p)).toFixed(2);
    path.style.opacity = p > 0 ? "1" : "0";
    rings.forEach((r, i) => {
      const t0 = tCorners + i * 0.08;
      r.setAttribute("r", (20 * spring01(t, t0, { duration: 0.45, damping: 0.82 })).toFixed(2));
      r.setAttribute("opacity", easeOut(clamp((t - t0) / 0.2)).toFixed(3));
    });

    style(after, { opacity: easeInOut(clamp((t - tPoint) / 0.35)) });
    outline.setAttribute("stroke", mix(C.red, C.green, easeInOut(clamp((t - tPoint) / 0.3))));
    outline.setAttribute("opacity", easeOut(clamp((t - tNotes) / 0.3)).toFixed(3));
    show(red, t, tNotes, Infinity, { dur: IN, dy: 12 });
    show(fixed, t, tPoint + 0.15, Infinity, { dur: IN, dy: 12 });
  };

  // ---------- checks ----------
  const op = (e) => Number(e.style.opacity || 1) * (e.style.visibility === "hidden" ? 0 : 1);
  check(`${S}: the real review images are decoded`, win.cutIn, () => {
    const bad = [...root.querySelectorAll("img")].filter((i) => !i.complete || !i.naturalWidth);
    return !bad.length || `not decoded: ${bad.map((i) => i.src).join(", ")}`;
  });
  check(`${S}: one image on the stage at a time`, [win.cutIn, win.cutOut - 1 / 60], () => {
    const on = [sheet, onion, graph, frame].filter((e) => op(e) > 0.01);
    return on.length <= 1 || `${on.map((e) => e.id).join(" + ")} on screen together`;
  });
  check(`${S}: the contact sheet assembles cell by cell, in order`, [tRead, tRead + 11 * CELL_STAGGER + CELL_IN], () => {
    for (let i = 1; i < cells.length; i++) if (op(cells[i]) > op(cells[i - 1]) + 1e-6) return `cell ${i + 1} ahead of cell ${i}`;
    return true;
  });
  const tSheetDone = tRead + 11 * CELL_STAGGER + CELL_IN;
  check(`${S}: all 12 cells settled by ${tSheetDone.toFixed(2)} s and held ${(tSheetOut - tSheetDone).toFixed(2)} s`, [tSheetDone, tSheetOut], () =>
    cells.every((c) => op(c) > 0.999 && Math.abs(Number((/scale\(([-\d.e]+)\)/.exec(c.style.transform) || [0, 1])[1]) - 1) < 1e-4) || "a cell is still moving");
  check(`${S}: the speed curve is fully highlighted and both corners ringed by "sharp corners"`, tCorners + 0.5, () => {
    if (Number(path.style.strokeDashoffset) > 0.01) return `curve ${path.style.strokeDashoffset} px short`;
    return rings.every((r) => Number(r.getAttribute("opacity")) > 0.99 && Math.abs(Number(r.getAttribute("r")) - 20) < 1.5) || "rings not settled";
  });
  check(`${S}: the f1123 note is up from "notes" to the cut (7 words: at least 2.6 s)`, [tNotes + IN, win.cutOut - 1 / 60], () =>
    (op(red) > 0.999 && win.cutOut - (tNotes + IN) >= 2.6) || `note ${red.style.opacity}`);
  check(`${S}: on "point" the frame is fixed: after image, green outline, "fixed" chip`, [tPoint + 0.15 + IN, win.cutOut - 1 / 60], () =>
    (Number(after.style.opacity) > 0.999 && op(fixed) > 0.999 && outline.getAttribute("stroke") === "rgb(31,138,91)") || `after ${after.style.opacity} fixed ${fixed.style.opacity}`);
  check(`${S}: header, image and notes stay apart and inside the stage`, tPoint + 1, () => {
    const items = [chips, frame, notes];
    for (let i = 0; i < items.length; i++) {
      const b = box(items[i]);
      if (b.x < 40 || b.x + b.w > 1040 || b.y < 128 || b.y + b.h > 128 + 980) return `${items[i].id || "row"} off the stage`;
      for (let j = i + 1; j < items.length; j++) if (overlap(items[i], items[j]) > 0) return `${items[i].id || "chips"} overlaps ${items[j].id || "notes"}`;
    }
    return true;
  });
  check(`${S}: each staged image sits inside the stage`, [tRead + 1, tPoint + 1], () => {
    for (const e of [sheet, onion, graph, frame]) {
      if (op(e) < 0.5) continue;
      const b = box(e);
      if (b.y < 128 + 190 || b.y + b.h > 128 + 975) return `${e.id} at y ${(b.y - 128).toFixed(0)}–${(b.y + b.h - 128).toFixed(0)}`;
    }
    return true;
  });

  return seek;
}
