# Form — Office Model Explorer

A complete React + Vite viewer for the supplied **office plan.glb**, using Three.js, React Three Fiber, Drei, and Tailwind CSS 4. The original file is retained in the repository; `public/models/office-plan.glb` is a byte-identical deployment copy.

## Run

Use **Node.js 22.x (22.12 or newer within that release line)**. The same runtime is pinned for Vercel.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3002/**. Production commands:

```sh
npm run build
npm run preview
```

## Controls

| Action | Input |
| --- | --- |
| Orbit 360° | Left mouse drag / one-finger drag |
| Zoom | Wheel zooms toward the cursor; pinch / toolbar + and − also supported |
| Pan | Right mouse drag / two-finger drag |
| Reset | Toolbar reset / R |
| Fullscreen | Toolbar fullscreen / Esc to exit |

The expanded canvas includes 3D, top, front, and side camera presets, a PNG screenshot download, and an Expand workspace button that hides the inspector. Settings also offer automatic rotation, ground grid visibility, brightness adjustment/reset, and High/Balanced render quality. High uses soft directional shadows and capped device pixel ratio (2); Balanced disables shadows and uses DPR 1. Transparent/glass objects do not cast opaque shadows. Mobile starts in Balanced mode. A locally generated studio environment provides reflections without external HDR requests. Texture anisotropy is capped at 8 or the GPU's supported limit.

## Model handling

Drei `useGLTF` loads the actual office file. The scene is cloned with SkeletonUtils, preserving shared geometries, original materials and textures, and skeletal animation compatibility. Camera fitting projects all eight world-bound corners into each camera orientation, giving a closer fit than a bounding sphere for this flat office. The viewer refits after viewport resizing and limits zoom to scene-relative bounds. The orbit angle stays above the ground, and scene-relative near/far planes improve depth precision. Scene material colors and texture content are not replaced.

This office GLB contains **no animation clips**. If clips are present in a replacement GLB at the same asset path, the interface automatically shows clip selection and playback/pause using Drei `useAnimations`. This conditional path is implemented; the supplied static model cannot exercise animation playback.

Dimensions are model units, not independently verified architectural measurements. Scene triangle totals include repeated mesh instances. The original geometry is retained: this is a large scene (~1.38 million rendered triangles), so frame rate depends on device/GPU. Frustum culling, shared geometry, capped DPR, a small reflection map, and Balanced mode limit rendering cost without changing the asset.

## Vercel

Follow [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub import or local CLI deployment. Select **Vite**, **Node 22.x**, install with `npm ci`, build with `npm run build`, and use **dist** as output. Build settings and cache/security headers are supplied in `vercel.json`. The 39.26 MiB model is a static asset; it is not processed by a serverless function. No environment variables, external APIs, or runtime CDN assets are required. `.vercelignore` excludes the duplicate root GLB from CLI uploads while retaining the deployment copy in `public/models/`.

## Verification

```sh
npm test
npx playwright test
```

Unit tests verify that the deployed GLB matches the original SHA-256, GLB headers and inventory, world-space bounding calculations, and mobile camera fitting. Browser tests load the actual GLB and cover camera orbit, right-button panning, wheel/button zoom, reset, auto-rotation, top view, fullscreen, responsive layout, touch gestures, and failed-load recovery. Screenshots are written to `test-results/`.

Browser tests default to installed Microsoft Edge. For another machine, change `channel: 'msedge'` in `playwright.config.js` to your installed browser, or remove `channel` and run `npx playwright install chromium`. For CI, install the matching browser before running tests. The browser uses its default graphics backend with software WebGL fallback enabled. Tests use Balanced mode for the interaction suite and mobile layout, since software rendering of the untouched large model is expensive.

Reference documentation: [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite), [Drei useGLTF](https://drei.docs.pmnd.rs/loaders/gltf-use-gltf), [Drei useAnimations](https://drei.docs.pmnd.rs/abstractions/use-animations).
