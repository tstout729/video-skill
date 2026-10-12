#!/usr/bin/env bash
# review.mjs regressions that need a browser: lint finds what a page breaks on purpose and nothing
# else, board draws the storyboard and look frames, and audit --grep picks checks by name.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
review="$repo/skills/video/scripts/review.mjs"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $*"; exit 1; }

# ---------- lint: a 9:16 page that breaks every rule once, plus traps that must not be flagged ----------
mkdir -p "$work/broken"
cat > "$work/broken/index.html" <<'HTML'
<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Broken on purpose</title>
<style>
  @font-face { font-family: Geist; font-weight: 100 900; src: url(/_skill/assets/fonts/geist-latin-wght-normal.woff2) format("woff2"); }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1080px; height: 1920px; overflow: hidden; background: #ECEAE5; font-family: Geist, sans-serif; color: #1F1E1B; }
  body > *, .abs { position: absolute; white-space: nowrap; }
  #headline { left: 140px; top: 240px; font-size: 96px; font-weight: 650; letter-spacing: -0.02em; }
  #title { left: 140px; top: 380px; font-size: 64px; font-weight: 600; }
  #subtitle { left: 150px; top: 410px; font-size: 40px; color: #2F6A57; }
  #tag { left: 140px; top: 520px; width: 300px; height: 64px; padding: 0 24px; border-radius: 32px; overflow: hidden;
    background: #2F6A57; color: #fff; font-size: 30px; line-height: 64px; }
  #faint { left: 140px; top: 620px; font-size: 36px; color: #A39D93; }
  #watermark { left: 640px; top: 600px; font-size: 72px; font-weight: 800; color: rgba(31, 30, 27, 0.08); }
  #card { left: 120px; top: 690px; width: 840px; height: 160px; border-radius: 24px; background: #fff; }
  #gray777 { left: 140px; top: 710px; font-size: 34px; color: #777777; }
  #gray767676 { left: 140px; top: 775px; font-size: 34px; color: #767676; }
  #covered { left: 140px; top: 900px; font-size: 36px; color: #C9C3B8; }
  #cover { left: 120px; top: 880px; width: 840px; height: 90px; border-radius: 20px; background: #fff; }
  #coverText { left: 24px; top: 22px; font-size: 36px; }
  #photo { left: 120px; top: 1000px; width: 840px; height: 200px; border-radius: 20px; }
  #on-dark { left: 150px; top: 1070px; font-size: 44px; color: #fff; }
  #on-light { left: 540px; top: 1070px; font-size: 44px; color: #fff; }
  #gl { left: 120px; top: 1230px; width: 840px; height: 120px; border-radius: 20px; }
  #on-gl { left: 150px; top: 1262px; font-size: 44px; color: #fff; }
  #fine { left: 140px; top: 1380px; font-size: 16px; color: #45413B; }
  #shrink { left: 140px; top: 1410px; transform: scale(0.5); transform-origin: 0 0; }
  #shrunk { font-size: 40px; }
  #zoom { left: 140px; top: 1450px; transform: scale(2); transform-origin: 0 0; }
  #zoomed { font-size: 20px; }
  #late { left: 440px; top: 1372px; font-size: 36px; }
  .card2 { left: 680px; width: 220px; height: 70px; border-radius: 14px; background: #fff; }
  #veiled { left: 700px; top: 1393px; font-size: 30px; color: #1F1E1B; }
  #veil { left: 680px; top: 1380px; width: 220px; height: 70px; border-radius: 14px; background: rgba(255, 255, 255, 0.8); }
  #scrimmed { left: 700px; top: 1473px; font-size: 30px; color: #595959; }
  #scrim { left: 680px; top: 1460px; width: 220px; height: 70px; border-radius: 14px; background: rgba(0, 0, 0, 0.3); }
  #flyer { left: 0; top: 620px; font-size: 36px; font-weight: 600; }
  #cta { left: 140px; top: 1640px; height: 96px; padding: 0 44px; border-radius: 48px; background: #1F1E1B; color: #fff;
    font-size: 44px; font-weight: 600; line-height: 96px; }
</style></head>
<body>
  <div id="headline">Summer schedule changes</div>
  <div id="title">New check-in times</div>
  <div id="subtitle">Starting on June 1</div>
  <div id="tag">Free cancellation until Friday</div>
  <div id="faint">Bring your booking code</div>
  <div id="watermark">DRAFT</div>
  <div id="card"></div>
  <div id="gray777">#777 on white: 4.48 to 1</div>
  <div id="gray767676">#767676 on white: 4.54 to 1</div>
  <div id="covered">This line is under the card</div>
  <div id="cover"><div id="coverText" class="abs">A white card on top</div></div>
  <canvas id="photo" width="840" height="200"></canvas>
  <div id="on-dark">Pool opens at 9</div>
  <div id="on-light">Spa opens at 10</div>
  <canvas id="gl" width="840" height="120"></canvas>
  <div id="on-gl">Drawn over WebGL</div>
  <div id="fine">Terms apply. See the house rules.</div>
  <div id="shrink"><div id="shrunk">Shrunk by the camera</div></div>
  <div id="zoom"><div id="zoomed">Zoomed in by the camera</div></div>
  <div id="late">Arrives later</div>
  <div class="card2" style="top: 1380px"></div><div id="veiled">Under a veil</div><div id="veil"></div>
  <div class="card2" style="top: 1460px"></div><div id="scrimmed">Under a scrim</div><div id="scrim"></div>
  <div id="flyer">Flying past</div>
  <div id="cta">Book now</div>
<script type="module">
import { style, progress, lerp, rand, check } from "/_skill/runtime/motion.js";
await document.fonts.load("600 40px Geist");
// A "photo": dark on the left, a light, slightly noisy wall on the right.
const c = document.getElementById("photo").getContext("2d"), r = rand(7);
c.fillStyle = "#1F3B33"; c.fillRect(0, 0, 400, 200);
const g = c.createLinearGradient(400, 0, 840, 200); g.addColorStop(0, "#E9E4DA"); g.addColorStop(1, "#F6F3EC");
c.fillStyle = g; c.fillRect(400, 0, 440, 200);
for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(120,110,95,${(0.04 * r()).toFixed(3)})`; c.fillRect(400 + 440 * r(), 200 * r(), 3, 3); }
// A WebGL canvas cleared to a light color.
const gl = document.getElementById("gl").getContext("webgl", { preserveDrawingBuffer: true });
gl.clearColor(0.9, 0.88, 0.84, 1); gl.clear(gl.COLOR_BUFFER_BIT);
window.seek = (t) => {
  style("#flyer", {}, { left: lerp(-500, 1600, progress(t, 0.9, 1.15)) });   // crosses #faint for a moment
  style("#late", { opacity: progress(t, 1.95, 2.15) });                     // low contrast mid-fade only
};
check("headline fits", 1, () => document.getElementById("headline").getBoundingClientRect().right <= 1080 || "runs off the right");
check("caption band clear", "all", () => true);
window.VIDEO = { width: 1080, height: 1920, duration: 4 };
window.seek(0);
</script></body></html>
HTML
printf '# Accepted on purpose, each with its reason.\ncontrast #watermark -- the DRAFT stamp is a watermark, not text to read\n' > "$work/broken/allow.txt"

cd "$work/broken"
set +e
node "$review" lint index.html --allow allow.txt --out lint.png > lint.log 2>&1
code=$?
set -e
[ "$code" = 1 ] || { cat lint.log; fail "lint should exit 1 on the broken page (got $code)"; }
expect() { grep -qE "^ +[0-9]+  $1 +$2" lint.log || { cat lint.log; fail "lint missed: $1 $2"; }; }
reject() { ! grep -qE "^ +[0-9]+  [a-z]+ +(.* × )?$1" lint.log || { cat lint.log; fail "lint flagged $1, which is fine"; }; }
expect clipped '#headline'            # runs off the frame
expect clipped '#tag'                 # too long for its pill
expect safe '#headline'               # in the right 10% of a 9:16 frame
expect safe '#cta'                    # in the bottom 20%, under the platform's buttons
expect overlap '#title .* × #subtitle'
expect small '#fine'                  # 16 px
expect small '#shrunk'                # 40 px in a 0.5 scale is 20 px on screen
expect contrast '#faint'
expect contrast '#gray777'            # 4.48:1, just under 4.5
expect contrast '#on-light'           # white over the light half of a 2D canvas
expect contrast '#on-gl'              # white over a light WebGL canvas
expect contrast '#veiled'             # dark text under an 80% white veil
grep -A1 'contrast  #gray777' lint.log | grep -q 'at f0: 4.48:1, #777777 on #FFFFFF' || fail "contrast of #777 on white is not 4.48:1"
for ok in '#gray767676' '#covered' '#coverText' '#on-dark' '#zoomed' '#scrimmed' '#late' '#flyer' '#title "New check-in times"$'; do reject "$ok"; done
grep -q 'allowed by allow.txt:2: the DRAFT stamp is a watermark' lint.log || { cat lint.log; fail "the watermark was not allowed with its reason"; }
grep -q '^12 findings to fix (2 clipped, 2 safe, 1 overlap, 2 small, 5 contrast), 1 allowed, 2 brief ones ignored' lint.log || { cat lint.log; fail "unexpected summary"; }
[ -s lint.png ] || fail "lint --out wrote no picture"
echo "ok: lint finds clipping, safe area, overlap, small type and contrast (canvas, WebGL, veil), and nothing else"

# An allowed finding can name a box that contains the text, and a time range that must cover it.
printf 'small #shrink -- the wrapper scales a footnote on purpose\nclipped #headline @ 0-1 -- only the first second\n' > allow2.txt
set +e; node "$review" lint index.html --allow allow2.txt > lint2.log 2>&1; set -e
grep -q 'allowed by allow2.txt:1: the wrapper scales' lint2.log || { cat lint2.log; fail "a container selector did not allow #shrunk"; }
grep -qE '^ +[0-9]+  clipped +#headline' lint2.log && grep -q 'note: allow2.txt:2 (clipped #headline) matched no finding' lint2.log ||
  { cat lint2.log; fail "a time range that does not cover the finding allowed it"; }
echo "ok: allowed findings match a containing box, and only within their time range"

# Allowed findings need a reason; a bad file fails before the browser starts.
printf 'contrast #watermark\n' > bad.txt
set +e; out="$(node "$review" lint index.html --allow bad.txt 2>&1)"; code=$?; set -e
[ "$code" = 1 ] && grep -q 'write the reason after " -- "' <<<"$out" || fail "an allow line without a reason was accepted: $out"
echo "ok: an allowed finding needs a written reason"

# ---------- audit --grep ----------
set +e; out="$(node "$review" audit index.html --grep caption 2>&1)"; code=$?; set -e
[ "$code" = 0 ] && grep -q '^1 of 1 checks (names with "caption") pass' <<<"$out" || fail "audit --grep caption: $out"
set +e; out="$(node "$review" audit index.html --grep HEADLINE 2>&1)"; code=$?; set -e
[ "$code" = 1 ] && grep -q 'FAIL  headline fits' <<<"$out" || fail "audit --grep HEADLINE: $out"
set +e; out="$(node "$review" audit index.html --grep nothing 2>&1)"; code=$?; set -e
[ "$code" = 1 ] && grep -q 'no check name contains "nothing"' <<<"$out" || fail "audit --grep nothing: $out"
echo "ok: audit --grep runs only the checks it names"

# ---------- every HTML example passes lint, and board draws its shots ----------
# An example's deliberate findings are in its lint-allow.txt, each with a reason; a line that
# matches nothing means the file is out of date. Contrast is checked with the film finish off
# (finish=0), as references/transitions.md advises; grain on a software GPU is also slow.
examples="$repo/skills/video/examples"
for page in "$examples"/*/index.html "$examples"/styles/*/index.html; do
  dir="$(dirname "$page")"; name="${dir#"$examples/"}"; log="lint-${name//\//-}.log"
  allow=(); [ -f "$dir/lint-allow.txt" ] && allow=(--allow "$dir/lint-allow.txt")
  node "$review" lint "$page" --query finish=0 ${allow[@]+"${allow[@]}"} > "$log" 2>&1 || { cat "$log"; fail "lint fails the $name example"; }
  grep -q '^no findings to fix' "$log" && ! grep -q 'matched no finding' "$log" || { cat "$log"; fail "the $name example's lint-allow.txt is out of date"; }
  echo "ok: the $name example passes lint$([ -f "$dir/lint-allow.txt" ] && echo ", its deliberate findings allowed")"
done
loop="$examples/loop/index.html"

node "$review" board "$loop" --out board.png > board.log
grep -q '^board: 6 panels from window.SHOTS' board.log && grep -q 'Back to Pay' board.log || { cat board.log; fail "board did not use window.SHOTS"; }
node "$review" board "$loop" --look --at 3.5,8.5,12 --out look.png > look.log
grep -q '^look: 3 frames from --at' look.log || { cat look.log; fail "look frames"; }
size() { ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$1"; }
IFS=, read -r bw bh <<<"$(size board.png)"
[ "$bw" = 2400 ] && [ "$bh" -gt 1900 ] && [ "$bh" -lt 2300 ] || fail "board.png is ${bw}x$bh, expected two rows of three square panels, 2400 wide"
IFS=, read -r lw lh <<<"$(size look.png)"
[ "$lw" = 3400 ] && [ "$lh" -gt 1300 ] || fail "look.png is ${lw}x$lh, expected three 1080 px frames across"
echo "ok: board draws numbered panels from window.SHOTS, and --look full-size frames"
