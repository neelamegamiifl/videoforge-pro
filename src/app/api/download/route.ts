import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const { url, quality } = await req.json();
  try {
    const res = await fetch('https://api.cobalt.tools/', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ url, vQuality: quality||'1080', isAudioOnly: false }) });
    if (res.ok) { const d = await res.json(); return NextResponse.json({ status:'success', ...d }); }
  } catch {}
  return NextResponse.json({ status:'instructions', methods:[
    { name:'yt-dlp (free CLI)', command:`yt-dlp "${url}" -f "bestvideo[height<=1080]+bestaudio" --merge-output-format mp4`, free:true },
    { name:'Cobalt.tools', link:'https://cobalt.tools', note:'Paste URL and download' },
    { name:'4K Video Downloader', link:'https://www.4kdownload.com', note:'Desktop app, free tier' },
  ], note:'Download the file then import it into VideoForge Pro.' });
}
