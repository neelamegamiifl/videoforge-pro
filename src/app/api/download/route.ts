import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { url, quality } = await req.json();

  // FIX: use correct Cobalt API endpoint from env or default
  const cobaltUrl = process.env.COBALT_API_URL ?? 'https://api.cobalt.tools/api/json';

  try {
    const res = await fetch(cobaltUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ url, vQuality: quality || '1080', isAudioOnly: false }),
    });
    if (res.ok) {
      const d = await res.json();
      return NextResponse.json({ status: 'success', ...d });
    }
  } catch { /* fall through to instructions */ }

  return NextResponse.json({
    status: 'instructions',
    message: 'Direct download not available — here are free alternatives:',
    methods: [
      { name: 'yt-dlp (free CLI)', command: `yt-dlp "${url}" -f "bestvideo[height<=1080]+bestaudio" --merge-output-format mp4`, free: true, link: 'https://github.com/yt-dlp/yt-dlp' },
      { name: 'Cobalt.tools', link: 'https://cobalt.tools', note: 'Paste URL and download — no account required', free: true },
      { name: '4K Video Downloader', link: 'https://www.4kdownload.com', note: 'Desktop app, free tier available' },
    ],
    note: 'After downloading, import the file into VideoForge Pro using the Import button.',
  });
}
