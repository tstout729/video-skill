#!/usr/bin/env bash
# Render every example end to end at draft quality, with no API key, and check the output.
#   bash tests/render-examples.sh            all examples
#   bash tests/render-examples.sh loop       one example
#   bash tests/render-examples.sh styles/riso   one example inside a group folder
# A folder with neither video.py nor index.html is a group: each subfolder that has one is an example.
# Each example is copied to a temporary folder first, so the repo stays clean.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
skill="$repo/skills/video"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
names=("$@")
if [[ ${#names[@]} -eq 0 ]]; then
  for d in $(ls "$skill/examples"); do
    if [[ -f "$skill/examples/$d/video.py" || -f "$skill/examples/$d/index.html" ]]; then names+=("$d")
    else for s in $(ls "$skill/examples/$d"); do [[ -f "$skill/examples/$d/$s/index.html" || -f "$skill/examples/$d/$s/video.py" ]] && names+=("$d/$s"); done
    fi
  done
fi
manim=(uv run -q --python 3.12 --with manim==0.21.0 manim)

check_video() {  # file, minimum seconds
  local d; d="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")"
  awk -v d="$d" -v m="$2" 'BEGIN { exit !(d >= m) }' || { echo "FAIL: $1 is ${d}s, expected at least $2s"; exit 1; }
  echo "  ok: $(basename "$1") ${d%.*}s"
}

for name in "${names[@]}"; do
  src="$skill/examples/$name"
  [[ -d "$src" ]] || { echo "no example: $name"; exit 1; }
  echo "== $name"
  mkdir -p "$(dirname "$work/$name")"
  cp -R "$src" "$work/$name"
  cd "$work/$name"
  mkdir -p out
  if [[ -f video.py ]]; then
    export EXPLAINER_DIR="$PWD" PYTHONPATH="$skill/scripts"
    "${manim[@]}" -ql --disable_caching -a video.py >/dev/null 2>&1
    uv run -q --script "$skill/scripts/assemble.py" . --videos media/videos/video/480p15 --out out/test.mp4
    check_video out/test.mp4 10
    [[ -s out/test.srt ]] || { echo "FAIL: no captions"; exit 1; }
  elif [[ -f index.html ]]; then
    [[ -f narration.json ]] && uv run -q --script "$skill/scripts/timeline.py" .
    node "$skill/scripts/render.mjs" index.html --stills qa/stills >/dev/null
    ls qa/stills/*.jpg >/dev/null
    node "$skill/scripts/render.mjs" index.html --out render/video.mp4 --fps 15 --sub 1 --scale 0.5 >/dev/null
    if [[ -f narration.json ]]; then
      uv run -q --script "$skill/scripts/mux.py" render/video.mp4 --out out/test.mp4 \
        --narration audio/narration.wav --words words.js --sfx-dir sfx >/dev/null
      [[ -s out/test.srt ]] || { echo "FAIL: no captions"; exit 1; }
    else
      uv run -q --script "$skill/scripts/mux.py" render/video.mp4 --out out/test.mp4 --sfx-dir sfx >/dev/null
    fi
    check_video out/test.mp4 5
  else
    echo "FAIL: $name has neither video.py nor index.html"; exit 1
  fi
  cd "$repo"
done
echo "All examples rendered."
