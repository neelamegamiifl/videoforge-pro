'use client';
import { useStore, defaultGrade } from '@/store/editor';
const LUTS=['None','Teal Orange','Film Grain','Matte','Fade','Cinematic Warm','Cyberpunk','Summer Vibes','Moody Dark','Bleach Bypass','Cross Process','Vivid Pop'];
export default function ColorGradePanel({onClose,notify}:{onClose:()=>void;notify:(m:string,t?:any)=>void}) {
  const store = useStore();
  const selClip = store.project.clips.find(c=>c.id===store.selectedId);
  const grade = selClip?.grade || defaultGrade();
  const bd='#1a1a28', t='#dde0ee', m='#8888aa', c='#111118', bg='#0d0d12';

  const update=(k:string,v:number|string)=>{
    if(!selClip){notify('Select a clip first','err');return;}
    store.updateClip(selClip.id,{grade:{...grade,[k]:v}});
  };
  const reset=()=>{if(selClip)store.updateClip(selClip.id,{grade:defaultGrade()});};

  const Sl=({l,k,min,max,col}:{l:string;k:string;min:number;max:number;col?:string})=>{
    const v=(grade as any)[k]??0;
    return <div style={{marginBottom:11}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}><span style={{color:m}}>{l}</span><span style={{color:col||'#e8375a',fontWeight:700}}>{v>0?'+':''}{v}</span></div>
      <input type="range" min={min} max={max} value={v} onChange={e=>update(k,+e.target.value)} style={{width:'100%'}}/>
    </div>;
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border:`1px solid ${bd}`,borderRadius:16,width:520,maxHeight:'85vh',overflow:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7)',animation:'slideUp .2s ease'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${bd}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:800,fontSize:17,color:t}}>🎨 Color Grading</div>
            <div style={{fontSize:11,color:m,marginTop:1}}>{selClip?`Clip: ${selClip.name}`:'Select a clip to grade'} · WebGL accelerated</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={reset} style={{background:c,border:`1px solid ${bd}`,borderRadius:7,padding:'6px 13px',color:m,cursor:'pointer',fontSize:12}}>Reset</button>
            <button onClick={onClose} style={{background:'none',border:'none',color:m,cursor:'pointer',fontSize:20}}>✕</button>
          </div>
        </div>
        <div style={{padding:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:10,letterSpacing:.5}}>TONE</div>
            <Sl l="Exposure / Brightness" k="brightness" min={-100} max={100}/>
            <Sl l="Contrast" k="contrast" min={-100} max={100}/>
            <Sl l="Highlights" k="highlights" min={-100} max={100} col="#f59e0b"/>
            <Sl l="Shadows" k="shadows" min={-100} max={100} col="#7c3aed"/>
            <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:10,marginTop:16,letterSpacing:.5}}>COLOR</div>
            <Sl l="Saturation" k="saturation" min={-100} max={100} col="#ec4899"/>
            <Sl l="Temperature (Warm/Cool)" k="temperature" min={-100} max={100} col="#f97316"/>
            <Sl l="Tint (Green/Magenta)" k="tint" min={-100} max={100} col="#10b981"/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:10,letterSpacing:.5}}>DETAIL</div>
            <Sl l="Sharpness" k="sharpness" min={0} max={100} col="#06b6d4"/>
            <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:10,marginTop:16,letterSpacing:.5}}>CREATIVE</div>
            <Sl l="Vignette" k="vignette" min={0} max={100}/>
            <Sl l="Film Grain" k="grain" min={0} max={100} col="#8888aa"/>
            <div style={{marginTop:16}}>
              <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:8,letterSpacing:.5}}>LUT PRESET</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                {LUTS.map(l=>(
                  <button key={l} onClick={()=>{update('lut',l);notify(`LUT: ${l} ✓`);}}
                    style={{background:grade.lut===l?'#e8375a15':c,border:`1px solid ${grade.lut===l?'#e8375a':bd}`,borderRadius:7,padding:'7px 5px',cursor:'pointer',color:grade.lut===l?'#e8375a':t,fontSize:11,fontWeight:grade.lut===l?700:400}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview strip */}
        <div style={{padding:'0 20px 20px'}}>
          <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:8,letterSpacing:.5}}>GRADE SUMMARY</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
            {Object.entries(grade).filter(([k,v])=>v!==0&&v!==null&&k!=='lut').map(([k,v])=>(
              <span key={k} style={{background:'#e8375a15',border:'1px solid #e8375a33',borderRadius:20,padding:'3px 10px',fontSize:11,color:'#e8375a'}}>
                {k}: {(v as number)>0?'+'+(v as number):v}
              </span>
            ))}
            {grade.lut&&<span style={{background:'#7c3aed15',border:'1px solid #7c3aed33',borderRadius:20,padding:'3px 10px',fontSize:11,color:'#7c3aed'}}>LUT: {grade.lut}</span>}
            {Object.values(grade).every(v=>v===0||v===null)&&<span style={{color:m,fontSize:11}}>No grade applied</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
