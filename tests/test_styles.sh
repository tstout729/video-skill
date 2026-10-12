#!/usr/bin/env bash
# Style packs (runtime/styles): every frame is a pure function of t, and the stepped styles hold each
# drawing for two frames. Renders the examples in examples/styles/ with render.mjs --stills.
#   bash tests/test_styles.sh              all three: riso, pixel, cut-paper
#   bash tests/test_styles.sh pixel        one
# 1. Determinism: the same frames rendered twice, in opposite orders by separate browsers, are
#    byte-identical (cmp). Seeded textures, boil and registration may not depend on what came before.
# 2. On twos: at 24 fps, frames 85 and 86 are one drawing; frame 87 is the next one. Riso moves on
#    ones, so its frames 85 and 86 differ.
# 3. Cost: prints what each style costs per frame (tests/style_cost.mjs). Informational.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
examples="$repo/skills/video/examples/styles"
render="$repo/skills/video/scripts/render.mjs"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
names=("$@"); [[ ${#names[@]} -gt 0 ]] || names=(riso pixel cut-paper)

# Frames spread over the story, as exact 24 fps frame times.
frames=(0 13 25 71 89 126 161 191 228 250)
times=$(for k in "${frames[@]}"; do awk -v k="$k" 'BEGIN { printf "%.9f\n", k / 24 }'; done)
forward=$(echo "$times" | paste -sd, -)
backward=$(echo "$times" | awk '{ a[NR] = $0 } END { for (i = NR; i > 0; i--) printf "%s%s", a[i], (i > 1 ? "," : "\n") }')
twos=$(for k in 85 86 87; do awk -v k="$k" 'BEGIN { printf "%.9f\n", k / 24 }'; done | paste -sd, -)

fail() { echo "FAIL: $*"; exit 1; }
for name in "${names[@]}"; do
  page="$examples/$name/index.html"
  [[ -f "$page" ]] || fail "no style example: $name"
  echo "== $name"
  node "$render" "$page" --stills "$work/$name/a" --at "$forward" >/dev/null
  node "$render" "$page" --stills "$work/$name/b" --at "$backward" >/dev/null
  n=0
  for f in "$work/$name/a"/*.jpg; do
    cmp -s "$f" "$work/$name/b/$(basename "$f")" || fail "$name: $(basename "$f") differs between two renders"
    n=$((n + 1))
  done
  [[ $n -eq ${#frames[@]} ]] || fail "$name: expected ${#frames[@]} stills, got $n"
  echo "  ok: $n frames identical when rendered in the opposite order"

  node "$render" "$page" --stills "$work/$name/twos" --at "$twos" >/dev/null
  f=("$work/$name/twos"/*.jpg)
  if [[ "$name" == riso ]]; then
    cmp -s "${f[0]}" "${f[1]}" && fail "$name: frames 85 and 86 are identical, but riso moves on ones"
    echo "  ok: on ones (f85 and f86 differ)"
  else
    cmp -s "${f[0]}" "${f[1]}" || fail "$name: frames 85 and 86 differ; on twos they are one drawing"
    cmp -s "${f[1]}" "${f[2]}" && fail "$name: frames 86 and 87 are identical; on twos f87 is a new drawing"
    echo "  ok: on twos (f85 = f86, f87 is the next drawing)"
  fi
done

node "$repo/tests/style_cost.mjs" "${names[@]}"
echo "Style packs are deterministic."
