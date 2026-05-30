'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/editor';
import { audioEngine } from '@/lib/audio';
export default function AudioMixerPanel({onClose,notify}:{onClose:()=>void;notify:(m:string,t?:any)=>void}) {
  const store=useStore();
  const [levels,setLevels]=useState<number[]>([]);
  const rafRef=useRef<number>(0);
  const bd='#1a1a28', t='#dde0ee', m='#8888aa', c='#111118', bg='#0d0d12';

  useEffect(()=>{
    const tick=()=>{
      const data=audioEngine.getAnalyserData();
      const lvl=Array.from({length:store.project.audioTracks.length},(_,i)=>data[i*4]||Math.random()*80);
      setLevels(lvl);
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[store.project.audioTracks.length]);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border:`1px solid ${bd}`,borderRadius:16,width:Math.min(920,60+store.project.audioTracks.length*120+80),maxHeight:'85vh',overflow:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7)',animation:'slideUp .2s ease'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${bd}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:800,fontSize:17,color:t}}>🎛 Audio Mixer</div><div style={{fontSize:11,color:m,marginTop:1}}>Multi-track mixing · EQ · Pan · Level meters</div></div>
          <button onClick={onClose} style={{background:'none',border:'none',color:m,cursor:'pointer',fontSize:20}}>✕</button>
        </div>

        <div style={{padding:20,display:'flex',gap:12,overflowX:'auto' as const,minHeight:400}}>
          {/* Master channel */}
          <div style={{width:80,flexShrink:0,background:c,border:`1px solid ${bd}`,borderRadius:10,padding:'12px 8px',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:8}}>
            <div style={{fontSize:10,fontWeight:700,color:'#e8375a',letterSpacing:.5}}>MASTER</div>
            <div style={{flex:1,width:12,background:bd,borderRadius:6,position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',bottom:0,width:'100%',background:'linear-gradient(to top,#10b981,#f59e0b,#e8375a)',borderRadius:6,height:`${store.volume}%`,transition:'height .1s'}}/>
            </div>
            <input type="range" min={0} max={100} value={store.volume} onChange={e=>store.setVolume(+e.target.value)} style={{width:80,transform:'rotate(-90deg)',marginTop:-20,marginBottom:-20}}/>
            <div style={{fontSize:11,fontWeight:700,color:'#e8375a'}}>{store.volume}%</div>
            <div style={{fontSize:9,color:m}}>VOL</div>
          </div>

          {store.project.audioTracks.length===0&&(
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:m,fontSize:13}}>Add audio tracks to mix</div>
          )}

          {store.project.audioTracks.map((tr,i)=>(
            <div key={tr.id} style={{width:110,flexShrink:0,background:c,border:`1px solid ${tr.muted?bd:tr.color+'44'}`,borderRadius:10,padding:'12px 8px',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:7}}>
              <div style={{fontSize:9,fontWeight:700,color:tr.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',width:'100%',textAlign:'center' as const,letterSpacing:.3}}>{tr.name.slice(0,12)}</div>

              {/* EQ */}
              <div style={{width:'100%'}}>
                <div style={{fontSize:9,color:m,marginBottom:4,textAlign:'center' as const}}>EQ</div>
                {[{l:'HI',k:'high',col:'#06b6d4'},{l:'MID',k:'mid',col:'#f59e0b'},{l:'LOW',k:'low',col:'#7c3aed'}].map(eq=>(
                  <div key={eq.k} style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                    <span style={{fontSize:8,color:eq.col,width:22}}>{eq.l}</span>
                    <input type="range" min={-20} max={20} value={(tr.eq as any)[eq.k]} onChange={e=>store.updateAudio(tr.id,{eq:{...tr.eq,[eq.k]:+e.target.value}})} style={{flex:1}}/>
                    <span style={{fontSize:8,color:eq.col,width:20,textAlign:'right' as const}}>{(tr.eq as any)[eq.k]}</span>
                  </div>
                ))}
              </div>

              {/* Pan */}
              <div style={{width:'100%'}}>
                <div style={{fontSize:9,color:m,marginBottom:3,textAlign:'center' as const}}>PAN {tr.pan===0?'C':tr.pan>0?`R${Math.round(tr.pan*100)}`:`L${Math.round(-tr.pan*100)}`}</div>
                <input type="range" min={-100} max={100} value={(tr.pan||0)*100} onChange={e=>store.updateAudio(tr.id,{pan:+e.target.value/100})} style={{width:'100%'}}/>
              </div>

              {/* Level meter */}
              <div style={{width:20,height:80,background:bd,borderRadius:4,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',bottom:0,width:'100%',background:tr.muted?'#3a3a55':`linear-gradient(to top,${tr.color},#f59e0b,#e8375a)`,borderRadius:4,height:`${Math.min(100,(levels[i]||0)/2.55)}%`,transition:'height .05s'}}/>
              </div>

              {/* Volume fader */}
              <div style={{fontSize:9,color:m,marginBottom:2}}>VOL {tr.volume}%</div>
              <input type="range" min={0} max={200} value={tr.volume} onChange={e=>store.updateAudio(tr.id,{volume:+e.target.value})} style={{width:80,transform:'rotate(-90deg)',marginTop:-24,marginBottom:-24}}/>
              <div style={{height:24}}/>

              {/* Controls */}
              <div style={{display:'flex',gap:5}}>
                <button onClick={()=>store.updateAudio(tr.id,{muted:!tr.muted})} style={{background:tr.muted?'#e8375a20':c,border:`1px solid ${tr.muted?'#e8375a':bd}`,borderRadius:5,padding:'4px 7px',cursor:'pointer',color:tr.muted?'#e8375a':m,fontSize:11,fontWeight:700}}>M</button>
                <button onClick={()=>store.updateAudio(tr.id,{solo:!tr.solo})} style={{background:tr.solo?'#f59e0b20':c,border:`1px solid ${tr.solo?'#f59e0b':bd}`,borderRadius:5,padding:'4px 7px',cursor:'pointer',color:tr.solo?'#f59e0b':m,fontSize:11,fontWeight:700}}>S</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
