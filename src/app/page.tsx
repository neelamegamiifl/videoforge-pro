'use client';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [dark, setDark] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const S = {
    page: { minHeight:'100vh', background: dark?'#070709':'#f0f0f8', display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'Inter,sans-serif', overflow:'auto' },
    logo: { fontSize:56, fontFamily:'Syne,sans-serif', fontWeight:900, background:'linear-gradient(135deg,#e8375a,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-3, marginBottom:8 },
    badge: { background:'linear-gradient(135deg,#e8375a22,#7c3aed22)', border:'1px solid #e8375a55', borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:700, color:'#e8375a', marginBottom:20 },
    sub: { fontSize:17, color:dark?'#8888aa':'#666', maxWidth:540, textAlign:'center' as const, lineHeight:1.65, marginBottom:40 },
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:14, maxWidth:760, width:'100%', marginBottom:44 },
    card: (c:string) => ({ background:dark?'#111118':'#fff', border:`1px solid ${dark?'#1a1a28':'#e0e0ec'}`, borderRadius:14, padding:'18px 16px', borderTop:`2px solid ${c}` }),
    btnPrimary: { background:'linear-gradient(135deg,#e8375a,#c0392b)', border:'none', borderRadius:10, padding:'14px 32px', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 24px rgba(232,55,90,0.4)', letterSpacing:-0.3 },
    btnSecondary: { background:dark?'#111118':'#fff', border:`1px solid ${dark?'#7c3aed':'#ddd'}`, borderRadius:10, padding:'14px 28px', color:dark?'#dde0ee':'#1a1a2e', fontSize:15, fontWeight:700, cursor:'pointer' },
    btnTertiary: { background:'transparent', border:`1px solid ${dark?'#1a1a28':'#ddd'}`, borderRadius:10, padding:'14px 28px', color:dark?'#8888aa':'#666', fontSize:15, fontWeight:700, cursor:'pointer' },
  };

  const features = [
    { icon:'🎬', title:'Real Video Rendering', desc:'FFmpeg.wasm — trim, merge, effects all baked into export', color:'#e8375a' },
    { icon:'🎨', title:'WebGL Color Grading', desc:'LUTs, curves, brightness/contrast/saturation, temperature', color:'#7c3aed' },
    { icon:'🎵', title:'Audio Waveforms', desc:'Web Audio API — EQ, fade, compress, multi-track mixing', color:'#06b6d4' },
    { icon:'🖼', title:'Multi-Layer Canvas', desc:'Picture-in-picture, overlays, compositing in real time', color:'#10b981' },
    { icon:'✂️', title:'Pro Timeline', desc:'Razor tool, ripple edit, magnetic snap, J/L cuts', color:'#f59e0b' },
    { icon:'🤖', title:'AI Powered', desc:'Captions, script writer, color grade AI, hashtag generator', color:'#ec4899' },
    { icon:'📥', title:'Universal Downloader', desc:'YouTube, TikTok, Spotify, SoundCloud, Apple Music', color:'#e8375a' },
    { icon:'📱', title:'Every Platform', desc:'YouTube, TikTok, Reels, Facebook, Twitter — right ratio', color:'#7c3aed' },
  ];

  return (
    <div style={S.page}>
      <button onClick={() => setDark(!dark)} style={{ position:'fixed', top:18, right:18, background:dark?'#111118':'#fff', border:`1px solid ${dark?'#1a1a28':'#ddd'}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', color:dark?'#dde0ee':'#333', fontSize:13, fontWeight:600 }}>
        {dark ? '☀ Light' : '🌙 Dark'}
      </button>

      <div style={{ fontSize:44, marginBottom:10 }}>⚡</div>
      <div style={S.logo}>VideoForge Pro</div>
      <div style={S.badge}>PREMIERE-LEVEL · BROWSER · FREE</div>
      <p style={S.sub}>Real FFmpeg rendering, WebGL color grading, Web Audio mixing — everything Premiere Pro does, entirely free in your browser.</p>

      <div style={S.grid}>
        {features.map(f => (
          <div key={f.title} style={S.card(f.color)}>
            <div style={{ fontSize:26, marginBottom:8 }}>{f.icon}</div>
            <div style={{ fontWeight:700, fontSize:13, color:dark?'#dde0ee':'#1a1a2e', marginBottom:4 }}>{f.title}</div>
            <div style={{ fontSize:11, color:dark?'#8888aa':'#777', lineHeight:1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* FIX: both buttons now route to real, working pages */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:12 }}>
        <button style={S.btnPrimary} onClick={() => router.push('/editor')}>🎬 Video Editor</button>
        <button style={S.btnSecondary} onClick={() => router.push('/image-editor')}>🖌️ Image Editor</button>
        {!session && (
          <button style={S.btnTertiary} onClick={() => signIn('google', { callbackUrl:'/editor' })}>Sign in with Google</button>
        )}
        {session && (
          <button style={S.btnTertiary} onClick={() => router.push('/editor')}>Continue as {session.user?.name?.split(' ')[0]} →</button>
        )}
      </div>
      <p style={{ fontSize:11, color:dark?'#3a3a55':'#aaa' }}>No install · No cost · Runs in browser · Powered by FFmpeg + WebGL + Web Audio</p>
    </div>
  );
}
