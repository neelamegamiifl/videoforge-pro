'use client';
import dynamic from 'next/dynamic';
const ProEditor = dynamic(() => import('@/components/editor/ProEditor'), { ssr:false, loading:() => (
  <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#070709',flexDirection:'column',gap:16 }}>
    <div style={{ fontSize:44 }}>⚡</div>
    <div style={{ fontSize:20,fontWeight:800,fontFamily:'Syne,sans-serif',background:'linear-gradient(135deg,#e8375a,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>Loading VideoForge Pro...</div>
    <div style={{ fontSize:13,color:'#3a3a55',marginTop:4 }}>Initializing FFmpeg · WebGL · Web Audio</div>
    <div style={{ display:'flex',gap:6,marginTop:8 }}>{['FFmpeg','WebGL','Audio'].map(l=><span key={l} style={{background:'#111118',border:'1px solid #1a1a28',borderRadius:20,padding:'4px 12px',fontSize:11,color:'#8888aa'}}>{l} ⏳</span>)}</div>
  </div>
)});
export default function EditorPage() { return <ProEditor />; }
