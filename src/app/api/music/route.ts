import { NextRequest, NextResponse } from 'next/server';
function detect(url: string) {
  if (url.includes('spotify')) return 'spotify';
  if (url.includes('music.apple')) return 'apple_music';
  if (url.includes('soundcloud')) return 'soundcloud';
  if (url.includes('music.youtube')) return 'youtube_music';
  return 'youtube';
}
export async function POST(req: NextRequest) {
  const { url } = await req.json();
  const p = detect(url||'');
  if (p === 'soundcloud') {
    try {
      const res = await fetch('https://api.cobalt.tools/', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ url, isAudioOnly:true, aFormat:'mp3' }) });
      if (res.ok) { const d = await res.json(); return NextResponse.json({ status:'success', platform:p, ...d }); }
    } catch {}
  }
  const guides: Record<string,any> = {
    spotify: { platform:'Spotify', icon:'🟢', methods:[{name:'SpotDL',command:'spotdl download [url]',link:'https://spotdl.readthedocs.io',free:true},{name:'Spotifydown.com',link:'https://spotifydown.com',note:'Web-based, free'}] },
    apple_music: { platform:'Apple Music', icon:'🎵', methods:[{name:'Gamdl',link:'https://github.com/glomatico/gamdl',free:true,note:'CLI tool'},{name:'MusicFab',link:'https://www.musicfab.com',note:'Desktop app'}] },
    soundcloud: { platform:'SoundCloud', icon:'🟠', methods:[{name:'yt-dlp',command:'yt-dlp [url]',free:true},{name:'SCDownloader',link:'https://sclouddownloader.net',note:'Web-based'}] },
    youtube_music: { platform:'YouTube Music', icon:'🔴', methods:[{name:'yt-dlp',command:'yt-dlp -x --audio-format mp3 [url]',free:true},{name:'Cobalt.tools',link:'https://cobalt.tools',note:'Web-based'}] },
    youtube: { platform:'YouTube Audio', icon:'▶️', methods:[{name:'yt-dlp',command:'yt-dlp -x --audio-format mp3 [url]',free:true},{name:'Cobalt.tools',link:'https://cobalt.tools',note:'Web-based'}] },
  };
  return NextResponse.json({ status:'instructions', ...guides[p], note:'After downloading, import the audio file into VideoForge Pro.' });
}
