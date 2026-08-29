# Home-clip: recording → shipped mp4

The landing demo (`apps/marketing/public/video/home-clip-{light,dark}.mp4`) is a **real Playwright screen
recording** with **brand intro/outro frames** bolted on via ffmpeg. No Remotion, no zoom, no simulation.

## 1. Record (both themes)

Seed the Justice AI transcript (`9d072903-…`) as the fresh top library row first, and revert after:

```sql
-- before:
UPDATE transcripts SET created_at = now(), viewed_at = NULL, speaker_names = '{}'::jsonb WHERE id='9d072903-15d7-4722-9140-d64ee3efad59';
-- after each run (and finally restore the real created_at):
UPDATE transcripts SET created_at = '<original>', viewed_at = NULL, speaker_names = '{}'::jsonb WHERE id='9d072903-15d7-4722-9140-d64ee3efad59';
```

```bash
export NODE_PATH="node_modules/.pnpm/@playwright+test@1.59.1/node_modules:node_modules/.pnpm/playwright@1.59.1/node_modules:node_modules/.pnpm/@supabase+supabase-js@2.105.3/node_modules"
CLI=node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js
BASE_URL=https://app.indxr.ai CAPTURE_THEME=light node "$CLI" test --config=playwright.homeclip.config.ts
BASE_URL=https://app.indxr.ai CAPTURE_THEME=dark  node "$CLI" test --config=playwright.homeclip.config.ts
# → tests/playwright/capture/recordings/home-clip{,-dark}.webm
```

## 2. Brand frames (existing logo asset, solid theme `--bg`, no new design)

A 1280×720 frame = the theme's `--bg` (`oklch(0.985 0.004 70)` light / `oklch(0.165 0.008 70)` dark) with
`/logo/indxr-horizontal-black-transparent.svg` centred (`filter: invert(1)` for the white, dark-theme
variant). Render each with Playwright (`page.goto` a tiny file:// HTML, screenshot 1280×720 at DSR 1) →
`brand-{light,dark}.png`.

## 3. Assemble (intro 1.4s + recording + outro 1.4s, short fades)

```bash
for th in light dark; do
  src=recordings/home-clip$([ $th = dark ] && echo -dark).webm
  ffmpeg -y -loop 1 -t 1.4 -i brand-$th.png -i "$src" -loop 1 -t 1.4 -i brand-$th.png \
    -filter_complex "[0:v]scale=1280:720,fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=1.05:d=0.35,setsar=1[a];\
[1:v]scale=1280:720,fps=30,setsar=1[b];\
[2:v]scale=1280:720,fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=1.05:d=0.35,setsar=1[c];\
[a][b][c]concat=n=3:v=1:a=0[v]" \
    -map "[v]" -c:v libx264 -crf 23 -preset veryslow -pix_fmt yuv420p -movflags +faststart \
    ../../../apps/marketing/public/video/home-clip-$th.mp4
  ffmpeg -y -ss 39 -i "$src" -frames:v 1 ../../../apps/marketing/public/video/home-clip-$th-poster.png
done
```
