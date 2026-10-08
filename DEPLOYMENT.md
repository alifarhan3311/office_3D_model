# Deploy to Vercel

The project is prepared as a static Vite application. The original office model is included at `public/models/office-plan.glb`; keep this file in your upload/repository.

## Option 1: GitHub import

1. Upload the project to your GitHub repository, including `src`, `public`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, and `vercel.json`. Do not upload `node_modules` or `dist`.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Set the project root to the folder containing `package.json` (use `.` if this is the repository root).
4. Confirm these settings and deploy:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Node.js | 22.x |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | dist |
| Environment variables | None required |

`vercel.json` supplies these build settings and asset cache/security headers. Local development port 3002 does not affect the deployed website.

## Option 2: Deploy this local folder with the CLI

In a terminal inside this project:

```sh
npx vercel login
npx vercel
```

Follow the prompts to choose your account/team, create or link the Vercel project, and use this folder as the project root. Inspect the returned preview URL first. To publish to production:

```sh
npx vercel --prod
```

`.vercelignore` excludes local dependencies, build output, test artifacts, and the duplicate original GLB at the project root. The actual deployment model in `public/models/` remains included. This keeps source uploads around 40 MiB rather than uploading the model twice.

## Verify the deployment

- Open the returned website URL and wait for **Original model loaded**.
- Open `/models/office-plan.glb` on the same domain; it should return the GLB, not an HTML page or 404.
- Check orbit, wheel/pinch zoom, front/top/side views, reset, fullscreen, and PNG export.
- Confirm mobile rendering and use Balanced mode on slower devices.

The GLB is a static asset and does not require a serverless function. Its original geometry and textures are preserved. The first download is about 39.26 MiB; caching helps subsequent visits. If you replace it at the same path, the model's configured cache lifetime is one day; a new versioned filename avoids waiting for a cached model to expire.

Official references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json), [upload limits](https://vercel.com/docs/limits).
