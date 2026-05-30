'use client';
import { useStore, PLATFORMS, defaultGrade } from '@/store/editor';
const fmt=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export default function ProInspector({ notify }:{ notify:(m:string,t?:any)=>void }) {
  const store = useStore();
  const cfg = PLATFORMS[store.project.platform];
  const bd='#1a1a28', t='#dde0ee', m='#8888aa', c='#111118', bg='#0d0d12';
  const selClip = store.project.clips.find(x=>x.id===store.selectedId);
  const selAudio = store.project.audioTracks.find(x=>x.id===store.selectedId);
  const saved = typeof window!=='undefined' ? JSON.parse(localStorage.getItem('vfpro-projects')||'[]') : [];
  const Stat=({l,v,col}:{l:string;v:any;col?:string})=>(<div style={{background:c,border:`1px solid ${bd}`,borderRadius:7,padding:'7px',textAlign:'center'}}><div style={{fontSize:16,fontWeight:800,color:col||'#e8375a'}}>{v}</div><div style={{fontSize:9,color:m,marginTop:1}}>{l}</div></div>);
  const Row=({l,v,col}:{l:string;v:any;col?:string})=>(<div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${bd}18`,fontSize:11}}><span style={{color:m}}>{l}</span><span style={{color:col||t,fontWeight:600}}>{v}</span></div>);

  return (
    <div style={{width:205,background:bg,borderLeft:`1px solid ${bd}`,display:'flex',flexDirection:'column',flexShrink:0,overflow:'auto'}}>
      <div style={{padding:13}}>
        <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:11,letterSpacing:.5}}>INSPECTOR</div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:13}}>
          <Stat l="Duration" v={fmt(store.project.duration)} col="#e8375a"/>
          <Stat l="Clips" v={store.project.clips.length} col="#7c3aed"/>
          <Stat l="Audio" v={store.project.audioTracks.length} col="#f59e0b"/>
          <Stat l="FPS" v={store.project.fps} col="#06b6d4"/>
        </div>

        <div style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:10,marginBottom:13,textAlign:'center'}}>
          <div style={{fontSize:22}}>{cfg.icon}</div>
          <div style={{fontWeight:700,color:'#e8375a',fontSize:12,marginTop:4}}>{cfg.ratio}</div>
          <div style={{color:m,fontSize:10}}>{cfg.w}×{cfg.h} · {cfg.label}</div>
          <div style={{color:'#10b981',fontSize:10,marginTop:2}}>Max {cfg.maxSec}s</div>
        </div>

        <div style={{marginBottom:13}}>
          <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:7}}>MASTER</div>
          {[{l:'Volume',k:'volume',v:store.volume,min:0,max:100,set:(v:number)=>store.setVolume(v),unit:'%',col:'#e8375a'},{l:'Zoom',k:'zoom',v:+store.zoom.toFixed(1),min:.1,max:20,set:(v:number)=>store.setZoom(v),unit:'×',col:'#7c3aed'}].map(sl=>(
            <div key={sl.k} style={{marginBottom:7}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:m,marginBottom:2}}><span>{sl.l}</span><span style={{color:sl.col,fontWeight:600}}>{sl.v}{sl.unit}</span></div>
              <input type="range" min={sl.min} max={sl.max} step={sl.k==='zoom'?.1:1} value={sl.v} onChange={e=>sl.set(+e.target.value)} style={{width:'100%'}}/>
            </div>
          ))}
          <div style={{marginBottom:4}}>
            <div style={{fontSize:10,color:m,marginBottom:2}}>FPS</div>
            <select value={store.project.fps} onChange={e=>store.setFps(+e.target.value)} style={{width:'100%',fontSize:11}}><option value={24}>24 fps</option><option value={30}>30 fps</option><option value={60}>60 fps</option></select>
          </div>
        </div>

        {/* Selected clip inspector */}
        {selClip&&<div style={{marginBottom:13,animation:'slideUp .15s ease'}}>
          <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:7}}>SELECTED CLIP</div>
          <div style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:10}}>
            <div style={{fontSize:12,fontWeight:700,color:selClip.color,marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selClip.name}</div>
            <Row l="Start" v={fmt(selClip.start)}/>
            <Row l="Duration" v={`${selClip.duration.toFixed(1)}s`}/>
            <Row l="Speed" v={`${selClip.speed}×`} col="#f59e0b"/>
            <Row l="Volume" v={`${selClip.volume}%`} col="#10b981"/>
            <Row l="Opacity" v={`${selClip.opacity}%`}/>
            {selClip.transition&&<Row l="Transition" v={selClip.transition} col="#06b6d4"/>}
            {selClip.filters.length>0&&<Row l="Filters" v={selClip.filters.length} col="#7c3aed"/>}
            {/* Grade summary */}
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${bd}`}}>
              <div style={{fontSize:10,color:m,marginBottom:4}}>Color Grade</div>
              {(['brightness','contrast','saturation'] as const).map(k=>(selClip.grade[k]!==0&&(
                <Row key={k} l={k.slice(0,3).toUpperCase()} v={`${selClip.grade[k]>0?'+':''}${selClip.grade[k]}`} col={selClip.grade[k]>0?'#10b981':'#e8375a'}/>
              )))}
            </div>
          </div>
        </div>}

        {selAudio&&<div style={{marginBottom:13,animation:'slideUp .15s ease'}}>
          <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:7}}>SELECTED AUDIO</div>
          <div style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:10}}>
            <div style={{fontSize:12,fontWeight:700,color:selAudio.color,marginBottom:8}}>{selAudio.name}</div>
            <Row l="Volume" v={`${selAudio.volume}%`} col="#f59e0b"/>
            <Row l="Fade In" v={`${selAudio.fadeIn}s`}/>
            <Row l="Pan" v={selAudio.pan===0?'Center':selAudio.pan>0?`R${Math.round(selAudio.pan*100)}%`:`L${Math.round(-selAudio.pan*100)}%`}/>
          </div>
        </div>}

        {/* Recent projects */}
        {saved.length>0&&<div>
          <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:7}}>RECENT</div>
          {saved.slice(0,5).map((p:any)=>(
            <button key={p.id} onClick={()=>{store.loadProject(p);notify(`Opened "${p.name}"`);}}
              style={{width:'100%',background:c,border:`1px solid ${bd}`,borderRadius:7,padding:'7px 9px',marginBottom:5,cursor:'pointer',color:t,fontSize:11,textAlign:'left' as const,display:'flex',justifyContent:'space-between'}}>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{p.name}</span>
              <span style={{color:m,flexShrink:0}}>{p.clips?.length||0}c</span>
            </button>
          ))}
        </div>}
      </div>
    </div>
  );
}
