# ⚡ VideoForge Pro

Premiere-level browser video editor — real FFmpeg rendering, WebGL color grading, Web Audio mixing.

## Features
- 🎬 **Real rendering** — FFmpeg.wasm bakes cuts, effects, color grade into MP4
- 🎨 **WebGL color grading** — GPU shaders: brightness, contrast, saturation, LUTs, vignette, grain
- 🎵 **Web Audio mixing** — 3-band EQ, pan, fade, level meters, waveforms
- ✂️ **Pro timeline** — Razor cut, ripple edit, magnetic snap, multi-track
- 🤖 **AI Studio** — captions, script writer, color AI, hashtags (Claude)
- 📥 **Video downloader** — YouTube, TikTok, Instagram, Facebook, Vimeo
- 🎵 **Music downloader** — Spotify, Apple Music, YouTube Music, SoundCloud
- 📱 **Platform export** — YouTube Shorts/Long, TikTok, Reels, Facebook, Twitter
- 🔐 **Auth** — Google login + guest mode

## Deploy to Vercel

1. Push to GitHub
2. Import at vercel.com/new
3. Set environment variables:
   - `NEXTAUTH_URL` = your Vercel URL (e.g. https://videoforge.vercel.app)
   - `NEXTAUTH_SECRET` = any 32+ char random string
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (console.cloud.google.com)
   - `ANTHROPIC_API_KEY` (console.anthropic.com) — optional, AI works without it
4. Google OAuth redirect URI: `https://your-url.vercel.app/api/auth/callback/google`

## Local dev

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| J / L | -5s / +5s |
| K | Pause |
| B | Razor tool |
| V | Select tool |
| D | Duplicate clip |
| M | Mute selected |
| Delete | Delete selected |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |
| Ctrl+S | Save project |
| Ctrl+= / Ctrl+- | Zoom in/out |
| Home / End | Start / End |
