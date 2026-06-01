'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FX_CSS_MAP } from '@/lib/webgl';

type Tool = 'select' | 'crop' | 'brush' | 'eraser' | 'text';
const FONTS = ['Inter','Georgia','Impact','Arial Black','Courier New','Verdana'];

export default function ImageEditorPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [dark] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [opacity, setOpacity] = useState(100);

  // Applied FX
  const [appliedFx, setAppliedFx] = useState<string[]>([]);

  // Text overlay
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(32);
  const [textFont, setTextFont] = useState('Inter');

  const C = { bg:'#070709', panel:'#0d0d12', border:'#1a1a28', text:'#dde0ee', muted:'#8888aa' };

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) { notify('Please select an image file'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { setImage(img); setImageSrc(url); notify('Image loaded ✓'); };
    img.src = url;
  };

  const fxCssFilter = appliedFx.map(f => FX_CSS_MAP[f] || '').filter(Boolean).join(' ');
  const baseFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
  const fullFilter = [baseFilter, fxCssFilter].filter(Boolean).join(' ');

  const downloadImage = useCallback(() => {
    if (!imageSrc) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = fullFilter;
      ctx.globalAlpha = opacity / 100;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'edited-image.png';
        a.click();
      });
    };
    img.src = imageSrc;
    notify('Downloading...');
  }, [imageSrc, fullFilter, opacity]);

  const SLIDERS = [
    { l:'Brightness', v:brightness, s:setBrightness, min:0, max:200, def:100, col:'#f59e0b' },
    { l:'Contrast',   v:contrast,   s:setContrast,   min:0, max:200, def:100, col:'#e8375a' },
    { l:'Saturation', v:saturation, s:setSaturation, min:0, max:200, def:100, col:'#ec4899' },
    { l:'Blur',       v:blur,       s:setBlur,       min:0, max:20,  def:0,   col:'#8888aa' },
    { l:'Opacity',    v:opacity,    s:setOpacity,    min:0, max:100, def:100, col:'#06b6d4' },
  ];

  const FX_LIST = Object.keys(FX_CSS_MAP).filter(k => !['Mirror'].includes(k));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg, fontFamily:'Inter,sans-serif', overflow:'hidden' }}>
      {/* Top bar */}
      <div style={{ height:50, background:C.panel, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', padding:'0 16px', gap:10, flexShrink:0 }}>
        <button onClick={() => router.push('/')} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:18 }}>←</button>
        <div style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:16, background:'linear-gradient(135deg,#e8375a,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>🖌️ Image Editor</div>
        <div style={{ flex:1 }} />
        <button onClick={() => fileRef.current?.click()} style={{ background:`#e8375a20`, border:`1px solid #e8375a`, borderRadius:7, padding:'6px 14px', color:'#e8375a', fontWeight:700, cursor:'pointer', fontSize:12 }}>📂 Import Image</button>
        {imageSrc && <button onClick={downloadImage} style={{ background:'linear-gradient(135deg,#e8375a,#c0392b)', border:'none', borderRadius:7, padding:'7px 18px', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:13 }}>⬇ Export</button>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if(f) loadImage(f); e.target.value=''; }} />
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Left panel — adjustments */}
        <div style={{ width:230, background:C.panel, borderRight:`1px solid ${C.border}`, overflow:'auto', padding:14, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:12, letterSpacing:.5 }}>ADJUSTMENTS</div>
          {SLIDERS.map(sl => (
            <div key={sl.l} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                <span style={{ color:C.muted }}>{sl.l}</span>
                <span style={{ color:sl.col, fontWeight:700 }}>{sl.v}{sl.l==='Blur'?'px':'%'}</span>
              </div>
              <input type="range" min={sl.min} max={sl.max} value={sl.v} onChange={e=>sl.s(+e.target.value)} style={{ width:'100%' }} />
              {sl.v !== sl.def && <button onClick={()=>sl.s(sl.def)} style={{ fontSize:10, color:C.muted, background:'none', border:'none', cursor:'pointer', padding:0, marginTop:2 }}>Reset</button>}
            </div>
          ))}

          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:10, letterSpacing:.5 }}>FX FILTERS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
              {FX_LIST.map(fx => (
                <button key={fx} onClick={() => {
                  setAppliedFx(prev => prev.includes(fx) ? prev.filter(f=>f!==fx) : [...prev, fx]);
                  notify(`${fx} ${appliedFx.includes(fx) ? 'removed' : 'applied'}`);
                }} style={{ background:appliedFx.includes(fx)?'#e8375a15':'#111118', border:`1px solid ${appliedFx.includes(fx)?'#e8375a':'#1a1a28'}`, borderRadius:7, padding:'7px 5px', cursor:'pointer', color:appliedFx.includes(fx)?'#e8375a':C.text, fontSize:11, fontWeight:appliedFx.includes(fx)?700:400 }}>
                  {fx}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#050507', position:'relative', overflow:'hidden' }}>
          {imageSrc ? (
            <div style={{ position:'relative', maxWidth:'90%', maxHeight:'90%', display:'inline-block' }}>
              <img
                src={imageSrc}
                alt="Edit canvas"
                style={{ maxWidth:'100%', maxHeight:'75vh', objectFit:'contain', filter:fullFilter, opacity:opacity/100, borderRadius:8, boxShadow:'0 0 0 1px #1a1a28, 0 20px 60px rgba(0,0,0,.8)', display:'block' }}
              />
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()} style={{ border:`2px dashed #1a1a28`, borderRadius:16, padding:'60px 40px', textAlign:'center', cursor:'pointer', color:C.muted }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🖼</div>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Drop an image or click to import</div>
              <div style={{ fontSize:12 }}>Supports PNG, JPG, WebP, GIF, AVIF</div>
            </div>
          )}
        </div>

        {/* Right panel — tools & info */}
        <div style={{ width:200, background:C.panel, borderLeft:`1px solid ${C.border}`, overflow:'auto', padding:14, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:10, letterSpacing:.5 }}>TOOLS</div>
          {(['select','crop','brush','eraser','text'] as Tool[]).map(tl => (
            <button key={tl} onClick={() => setTool(tl)} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, background:tool===tl?'#e8375a15':'transparent', border:`1px solid ${tool===tl?'#e8375a':'transparent'}`, borderRadius:7, padding:'8px 10px', cursor:'pointer', color:tool===tl?'#e8375a':C.text, fontSize:12, fontWeight:tool===tl?700:400, marginBottom:4 }}>
              <span>{{select:'↖',crop:'✂',brush:'🖌',eraser:'⬜',text:'T'}[tl]}</span> {tl.charAt(0).toUpperCase()+tl.slice(1)}
            </button>
          ))}

          {imageSrc && (
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:8, letterSpacing:.5 }}>ACTIVE FILTERS</div>
              {appliedFx.length===0 ? <div style={{ fontSize:11, color:C.muted }}>None</div> : appliedFx.map(fx => (
                <div key={fx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#e8375a15', border:'1px solid #e8375a33', borderRadius:12, padding:'3px 10px', marginBottom:4, fontSize:11, color:'#e8375a' }}>
                  {fx}<button onClick={() => setAppliedFx(prev=>prev.filter(f=>f!==fx))} style={{ background:'none', border:'none', color:'#e8375a', cursor:'pointer', padding:0, fontSize:12 }}>✕</button>
                </div>
              ))}
              <button onClick={() => { setAppliedFx([]); setBrightness(100); setContrast(100); setSaturation(100); setBlur(0); setOpacity(100); notify('Reset all'); }} style={{ width:'100%', marginTop:8, background:'transparent', border:`1px solid ${C.border}`, borderRadius:7, padding:'7px', color:C.muted, cursor:'pointer', fontSize:11 }}>Reset All</button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:26, left:'50%', transform:'translateX(-50%)', background:'#10b981', color:'#fff', padding:'10px 22px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, whiteSpace:'nowrap', boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
