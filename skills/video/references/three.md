# 3D with three.js

Use three.js when a piece needs a real object, material or camera move: a product, a logo, a mascot, a hero shot. It runs inside the same `seek(t)` page as any HTML video, so 3D, UI, kinetic type and captions can share one frame.

## Setup

```sh
bash <skill>/scripts/setup.sh --with three     # installs three.js r186, pinned, into the skill's cache
```

The renderer serves the cache at `/_vendor/`. Use an import map so three's addons resolve:

```html
<script type="importmap">
{"imports": {"three": "/_vendor/three/build/three.module.js",
             "three/addons/": "/_vendor/three/examples/jsm/"}}
</script>
<script type="module">
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
</script>
```

Write the version in the brief's OUTPUT line (`three.js r186`). Option names change between releases, and an unknown option is silently ignored.

## Rendering

- Create the renderer, scene, geometry and materials once, at load. Inside `seek(t)`, set every transform from `t`, then call `renderer.render(scene, camera)` synchronously.
- Use `new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })` at the page's pixel size, with `setPixelRatio(1)`. The renderer's screenshots then capture the finished frame.
- No clock, no `requestAnimationFrame` loop, no `Math.random`. Use `rand(seed)` from `motion.js`. Two renders of the same `t` must produce identical pixels.
- `render.mjs` starts Chromium with GPU flags:
  - **macOS:** Metal, about 20–25 ms a frame on an M1.
  - **Elsewhere:** SwiftShader, about 80 ms a frame (it works on CI and Linux).
  - Override with `VIDEO_GL=metal|swiftshader|off`.
- Several canvases are fine. Each one is its own WebGL context, so create them once.

## Look

These rules replace "premium" and "cool" with numbers.

- **Materials:**
  - Satin ceramic: `MeshPhysicalMaterial`, roughness 0.3–0.4, clearcoat 1, clearcoat roughness 0.15.
  - Near-mirror chrome: metalness 1, roughness 0.05–0.1. It needs something to reflect, such as a horizon line, an environment or a bright card.
  - Use the brand color on one part only.
- **Light:**
  - A key light (warm, about 2–2.5), a fill (cool, about 0.5) and a rim light from behind.
  - Environment reflections generated in code with `RoomEnvironment` through `PMREMGenerator`.
  - Soft contact shadows under every object.
  - No glow and no bloom.
- **Camera:** a narrow lens (FOV 35–50°), a slow drift of under 2% that never stops, and push-ins on ease-in-out. The camera moves on the gentlest curves in the piece.
- **Motion:**
  - Objects move on springs with a damping ratio of 0.8.
  - 3–6 frames of anticipation before a jump.
  - Squash and stretch that keep the volume (scale y by s, x and z by 1/√s).
  - Arcs for anything that travels.
  - Shadows that tighten as an object comes down.
- **Lock the proportions** of any character or logo in the brief, for example "the slab is 1 : 1 : 0.28, the corner radius is 22% of the width". This is what keeps it recognizable.

## Gotchas in r186

- **`TextGeometry` takes `depth`, not `height`.** The default depth is 50 units, so text made with the old option name comes out absurdly thick.
- **`PCFSoftShadowMap` no longer exists.** Requesting it silently falls back to a grainy filter. Use `VSMShadowMap`, a contact-shadow plane, or a custom shadow filter on your own materials.
- **Addons import the bare name `three`,** so they need the import map above.
- **Text over a 3D scene is HTML, not geometry,** unless it must sit in the scene. HTML text stays sharp, can be selected in review images, and works with `captions()`.

## Review

- **Speed graphs need a DOM element.** `review.mjs graph` measures one, so pin an invisible element to the object's projected screen position each frame (project its position with `camera`), or plot the pose function directly.
- **Contact sheets and onion skins** work on 3D frames like any other.
- **The camera drift defeats the hold check.** Because the drift never stops, a 3D pane never reads as still, so check its holds from stills.
