'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useStore, PLATFORMS, defaultGrade } from '@/store/editor';
import { WebGLGrader, getFilterCSS } from '@/lib/webgl';

const fmt = (s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s%1)*10)}`;

export default function ProPreview({ notify }:{ notify:(m:string,t?:any)=>void }) {
  const store = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLGrader|null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const [activeClip, setActiveClip] = useState<any>(null);
  const cfg = PLATFORMS[store.project.platform];

  // Determine preview dimensions
  const previewH = 420;
  const previewW = cfg.ratio === '9:16' ? Math.round(previewH * 9/16)
    : cfg.ratio === '1:1' ? previewH
    : Math.round(previewH * 16/9);

  // Init WebGL grader
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      glRef.current = new WebGLGrader(canvas);
    } catch { console.warn('WebGL unavailable, using CSS fallback'); }
    return () => { glRef.current?.destroy(); };
  }, []);

  // Find active clip
  useEffect(() => {
    const clip = store.project.clips.find(c => c.visible && store.currentTime >= c.start && store.currentTime < c.start + c.duration) || null;
    setActiveClip(clip);
    if (videoRef.current && clip?.type === 'video' && clip.url) {
      const vid = videoRef.current;
      if (vid.src !== clip.url) { vid.src = clip.url; }
      const seek = store.currentTime - clip.start + clip.trimIn;
      if (Math.abs(vid.currentTime - seek) > 0.3) vid.currentTime = seek;
      vid.playbackRate = clip.speed;
      if (store.playing && !clip.muted) vid.play().catch(()=>{});
      else vid.pause();
    }
  }, [store.currentTime, store.playing]);

  // WebGL render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const vid = videoRef.current;
    if (!canvas || !vid || !activeClip) return;

    const render = () => {
      if (glRef.current && !vid.paused && !vid.ended) {
        try {
          glRef.current.uploadFrame(vid);
          glRef.current.render(activeClip.grade || defaultGrade(), previewW, previewH);
        } catch {}
      }
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeClip, previewW, previewH]);

  const activeCaption = store.project.captions.find(c => store.currentTime >= c.time && store.currentTime < c.time + c.duration);
  const activeTexts = store.project.textOverlays.filter(t => store.currentTime >= t.start && store.currentTime < t.start + t.duration);
  const grade = activeClip?.grade || defaultGrade();
  const cssFilter = getFilterCSS(grade);

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#050507', gap:12, padding:16, overflow:'hidden', position:'relative' }}>

      {/* Platform info */}
      <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(13,13,18,0.9)', border:'1px solid #1a1a28', borderRadius:20, padding:'4px 14px', fontSize:11, fontWeight:600, color:'#8888aa', display:'flex', gap:8, alignItems:'center', zIndex:10, whiteSpace:'nowrap' }}>
        <span>{cfg.icon}</span> {cfg.label} · {cfg.ratio} · {cfg.w}×{cfg.h}
        {store.ffmpegReady && <span style={{ color:'#10b981', fontSize:10 }}>· FFmpeg ✓</span>}
      </div>

      {/* Preview window */}
      <div style={{ position:'relative', width:previewW, height:previewH, background:'#000', borderRadius:10, overflow:'hidden', boxShadow:'0 0 0 1px #1a1a28, 0 20px 60px rgba(0,0,0,.8)', flexShrink:0 }}>

        {/* WebGL canvas (color graded output) */}
        <canvas ref={canvasRef} width={previewW} height={previewH}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity: activeClip && glRef.current ? 1 : 0, zIndex:2 }} />

        {/* Hidden video source for WebGL */}
        <video ref={videoRef} crossOrigin="anonymous" playsInline muted={activeClip?.muted}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
            filter: glRef.current ? 'none' : cssFilter, // CSS fallback if no WebGL
            opacity: activeClip?.type==='video' && !glRef.current ? 1 : (glRef.current ? 0 : 0),
            transform: `${activeClip?.flipH?'scaleX(-1)':''} ${activeClip?.flipV?'scaleY(-1)':''} rotate(${activeClip?.rotation||0}deg)`,
            zIndex:1 }} />

        {/* Image clips */}
        {activeClip?.type === 'image' && (
          <img src={activeClip.url} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:cssFilter, opacity:activeClip.opacity/100, zIndex:2 }} alt="" />
        )}

        {/* Empty state */}
        {!activeClip && store.project.clips.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#3a3a55', gap:14 }}>
            <div style={{ fontSize:48 }}>📱</div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#8888aa' }}>Drop video here or click Import</div>
              <div style={{ fontSize:11, color:'#3a3a55', marginTop:4 }}>Supports MP4, MOV, WebM, MKV, GIF, PNG, JPG</div>
            </div>
          </div>
        )}

        {/* Gap in timeline */}
        {!activeClip && store.project.clips.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#3a3a55', fontSize:13 }}>Gap / no clip at this time</div>
        )}

        {/* Text overlays */}
        {activeTexts.map(ov => (
          <div key={ov.id} style={{ position:'absolute', left:`${ov.x}%`, top:`${ov.y}%`, transform:'translate(-50%,-50%)', color:ov.color, fontSize: Math.max(10, ov.fontSize * previewH / 1920), fontWeight:ov.bold?700:400, fontStyle:ov.italic?'italic':'normal', textDecoration:ov.underline?'underline':'none', fontFamily:ov.fontFamily, background:ov.bgColor||'transparent', padding:ov.bgColor?'3px 10px':0, borderRadius:4, textShadow:ov.shadow?'0 2px 8px rgba(0,0,0,0.9)':'none', textAlign:ov.align, pointerEvents:'none', letterSpacing:ov.letterSpacing||0, transform:`translate(-50%,-50%) rotate(${ov.rotation||0}deg)`, maxWidth:'90%', zIndex:5 }}>
            {ov.text}
          </div>
        ))}

        {/* Captions */}
        {activeCaption && (
          <div style={{ position:'absolute', bottom:'10%', left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.88)', color:'#fff', padding:'7px 18px', borderRadius:6, fontSize: Math.max(11, previewH * 0.033), fontWeight:700, whiteSpace:'nowrap', maxWidth:'92%', overflow:'hidden', textOverflow:'ellipsis', zIndex:6, textShadow:'0 1px 4px rgba(0,0,0,.9)' }}>
            {activeCaption.text}
          </div>
        )}

        {/* Vignette overlay from grade */}
        {grade.vignette > 0 && (
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at center, transparent ${60-grade.vignette*0.3}%, rgba(0,0,0,${grade.vignette/100}) 100%)`, pointerEvents:'none', zIndex:4 }} />
        )}

        {/* Grain overlay */}
        {grade.grain > 0 && (
          <div style={{ position:'absolute', inset:0, opacity: grade.grain/100 * 0.4, background:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', pointerEvents:'none', mixBlendMode:'overlay', zIndex:4 }} />
        )}

        {/* Playhead time */}
        <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.75)', borderRadius:6, padding:'3px 8px', fontSize:11, fontFamily:'JetBrains Mono,monospace', color:'#dde0ee', zIndex:10 }}>
          {fmt(store.currentTime)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', alignItems:'center', gap:10, background:'#0d0d12', border:'1px solid #1a1a28', borderRadius:12, padding:'8px 18px' }}>
        <span style={{ fontSize:12, fontFamily:'monospace', color:'#8888aa', minWidth:62 }}>{fmt(store.currentTime)}</span>
        <button onClick={()=>store.setCurrentTime(0)} style={{ background:'none',border:'none',cursor:'pointer',color:'#8888aa',fontSize:16 }} title="Go to start">⏮</button>
        <button onClick={()=>store.setCurrentTime(Math.max(0,store.currentTime-1/30))} style={{ background:'none',border:'none',cursor:'pointer',color:'#8888aa',fontSize:14 }} title="Frame back">◀</button>
        <button onClick={()=>store.setPlaying(!store.playing)}
          style={{ width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#e8375a,#c0392b)',border:'none',cursor:'pointer',color:'#fff',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 14px rgba(232,55,90,.5)',flexShrink:0 }}>
          {store.playing?'⏸':'▶'}
        </button>
        <button onClick={()=>store.setCurrentTime(Math.min(store.project.duration,store.currentTime+1/30))} style={{ background:'none',border:'none',cursor:'pointer',color:'#8888aa',fontSize:14 }} title="Frame forward">▶</button>
        <button onClick={()=>store.setCurrentTime(store.project.duration)} style={{ background:'none',border:'none',cursor:'pointer',color:'#8888aa',fontSize:16 }} title="Go to end">⏭</button>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <span style={{fontSize:14}}>🔊</span>
          <input type="range" min="0" max="100" value={store.volume} onChange={e=>store.setVolume(+e.target.value)} style={{width:70}} />
          <span style={{fontSize:11,color:'#8888aa',minWidth:28}}>{store.volume}%</span>
        </div>
        <span style={{ fontSize:12, fontFamily:'monospace', color:'#8888aa', minWidth:62 }}>{fmt(store.project.duration)}</span>
      </div>

      {/* Keyboard hints */}
      <div style={{ display:'flex', gap:14, fontSize:10, color:'#2a2a40' }}>
        {['Space: Play','J/L: ±5s','B: Razor','V: Select','Del: Delete','Ctrl+Z: Undo','Ctrl+S: Save'].map(h=><span key={h}>{h}</span>)}
      </div>
    </div>
  );
}
