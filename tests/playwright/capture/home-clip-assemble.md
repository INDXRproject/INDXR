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
# → tests/playwright/capture/recordings/home-clip{,-dark}.webm  + …timings.json
```

The spec covers the first paint (the credit balance loading 0→N) with a solid theme-bg splash and only
tears it down once the real balance is painted, and it writes `home-clip{,-dark}.timings.json` with the
recording-clock milliseconds of three landmarks the assembly needs:
`reveal_ms` (splash torn down), `libnav_ms` (View-in-Library clicked), `liblist_ms` (library list loaded).

## 2. Brand frames (existing logo asset, solid theme `--bg`, no new design)

A 1280×720 frame = the theme's `--bg` (`oklch(0.985 0.004 70)` light / `oklch(0.165 0.008 70)` dark) with
`/logo/indxr-horizontal-black-transparent.svg` centred (`filter: invert(1)` for the white, dark-theme
variant). Render each with Playwright (`page.goto` a tiny file:// HTML, screenshot 1280×720 at DSR 1) →
`brand-{light,dark}.png`.

## 3. Assemble — intro + trimmed recording + outro (short fades)

Two trims come off the recording, driven by the timings file:
- **splash**: drop everything before `reveal_ms` (minus a 0.2 s lead), so the visible clip starts on the
  loaded page (no dead splash, no 0→N balance flash).
- **library load**: the real load between `libnav_ms` and `liblist_ms` is often seconds; cap the on-screen
  part to 0.5 s by keeping `[…, libnav+0.5]` then jumping to `[liblist, …]`.

```bash
for th in light dark; do
  src=recordings/home-clip$([ $th = dark ] && echo -dark).webm
  read TRIM S1END LIBLIST DUR < <(node -e '
    const fs=require("fs"),{execSync}=require("child_process"),m=JSON.parse(fs.readFileSync(process.argv[1]));
    const dur=parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${process.argv[2]}"`)+"");
    console.log([Math.max(0,m.reveal_ms/1000-0.2), m.libnav_ms/1000+0.5, m.liblist_ms/1000, dur].map(x=>x.toFixed(3)).join(" "))
  ' "${src%.webm}.timings.json" "$src")
  ffmpeg -y -loop 1 -t 1.4 -i brand-$th.png -i "$src" -loop 1 -t 1.4 -i brand-$th.png \
    -filter_complex "[0:v]scale=1280:720,fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=1.05:d=0.35,setsar=1[intro];\
[1:v]split=2[x][y];\
[x]trim=start=$TRIM:end=$S1END,setpts=PTS-STARTPTS,scale=1280:720,fps=30,setsar=1[s1];\
[y]trim=start=$LIBLIST:end=$DUR,setpts=PTS-STARTPTS,scale=1280:720,fps=30,setsar=1[s2];\
[2:v]scale=1280:720,fps=30,fade=t=in:st=0:d=0.35,fade=t=out:st=1.05:d=0.35,setsar=1[outro];\
[intro][s1][s2][outro]concat=n=4:v=1:a=0[v]" \
    -map "[v]" -c:v libx264 -crf 23 -preset veryslow -pix_fmt yuv420p -movflags +faststart \
    ../../../apps/marketing/public/video/home-clip-$th.mp4
  ffmpeg -y -ss $(node -e "console.log($LIBLIST+4)") -i "$src" -frames:v 1 ../../../apps/marketing/public/video/home-clip-$th-poster.png
done
```
