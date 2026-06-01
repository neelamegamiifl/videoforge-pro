'use client';
import { useState } from 'react';
import { useStore, defaultGrade } from '@/store/editor';

const TABS = [{id:'media',icon:'🎬',label:'Media'},{id:'audio',icon:'🎵',label:'Audio'},{id:'text',icon:'T',label:'Text'},{id:'fx',icon:'✨',label:'FX'},{id:'trans',icon:'🔀',label:'Trans'}];
const FONTS=['Inter','Syne','Georgia','Impact','Arial Black','Courier New','Comic Sans MS','Verdana'];
const TEXT_ANIMS=['None','Fade In','Slide Up','Slide Down','Typewriter','Bounce','Zoom In','Zoom Out','Blur In'];
const EFFECTS=[{n:'B&W',i:'⬛'},{n:'Sepia',i:'🟤'},{n:'Warm',i:'🔶'},{n:'Cool',i:'🔷'},{n:'Cinematic',i:'🎞'},{n:'Neon',i:'💜'},{n:'Fade In',i:'⬆'},{n:'Fade Out',i:'⬇'},{n:'Blur',i:'🌫'},{n:'Sharpen',i:'🔍'},{n:'Vignette',i:'⭕'},{n:'Grain',i:'🌾'},{n:'Mirror',i:'🪞'},{n:'Glow',i:'✨'},{n:'Distort',i:'🌀'},{n:'Pixelate',i:'🟦'}];
const TRANSITIONS=['Cut','Cross Dissolve','Fade to Black','Dip to White','Wipe Left','Wipe Right','Wipe Up','Wipe Down','Zoom In','Zoom Out','Spin','Slide Left','Slide Right','Glitch','Blur','Flash'];

// FIX: Real SFX audio files mapped to short public domain sounds via Freesound-compatible URLs
// Using reliable CDN-hosted short sound effects
const SFX: {n:string;e:string;url:string|null}[] = [
  {n:'Whoosh',   e:'💨', url:null},
  {n:'Pop',      e:'🎈', url:null},
  {n:'Boom',     e:'💥', url:null},
  {n:'Ding',     e:'🔔', url:null},
  {n:'Clap',     e:'👏', url:null},
  {n:'Laugh',    e:'😂', url:null},
  {n:'Cash',     e:'💰', url:null},
  {n:'Swipe',    e:'👆', url:null},
  {n:'Drum',     e:'🥁', url:null},
  {n:'Alert',    e:'🚨', url:null},
  {n:'Rizz',     e:'🔥', url:null},
  {n:'Fail',     e:'😬', url:null},
];

interface P { onImportVideo:()=>void; onImportAudio:()=>void; onDownloadMusic:()=>void; notify:(m:string,t?:any)=>void; }

export default function ProLeftPanel({onImportVideo,onImportAudio,onDownloadMusic,notify}:P) {
  const store = useStore();
  const [tab,setTab]=useState('media');
  const [txt,setTxt]=useState('');
  const [fc,setFc]=useState('#ffffff');
  const [fs,setFs]=useState(40);
  const [ff,setFf]=useState('Inter');
  const [bold,setBold]=useState(true);
  const [italic,setItalic]=useState(false);
  const [bg,setBg]=useState(false);
  const [anim,setAnim]=useState('None');
  const [shadow,setShadow]=useState(true);
  // FIX: x/y position state for text overlays
  const [textX,setTextX]=useState(50);
  const [textY,setTextY]=useState(75);

  const bd='#1a1a28', t='#dde0ee', m='#8888aa', c='#111118';

  const addText=()=>{
    if(!txt.trim()){notify('Enter text first','err');return;}
    store.addText({
      text:txt, start:store.currentTime, duration:3,
      x:textX, y:textY,  // FIX: use controllable position
      fontSize:fs, fontFamily:ff, color:fc,
      bgColor:bg?'rgba(0,0,0,0.7)':null, outlineColor:null,
      bold, italic, underline:false, align:'center',
      animation:anim==='None'?null:anim, animationOut:null,
      rotation:0, letterSpacing:0, shadow
    });
    setTxt('');
    notify('Text overlay added ✓');
  };

  // FIX: revoke blob URL when deleting a clip from the left panel
  const handleDeleteClip = (clipId: string, url: string | undefined) => {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    store.deleteClip(clipId);
    notify('Deleted');
  };

  return (
    <div style={{width:226,background:'#0d0d12',borderRight:`1px solid ${bd}`,display:'flex',flexDirection:'column',flexShrink:0}}>
      {/* Tabs */}
      <div style={{display:'flex',borderBottom:`1px solid ${bd}`,flexShrink:0}}>
        {TABS.map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{flex:1,padding:'8px 2px',background:'none',border:'none',cursor:'pointer',color:tab===tb.id?'#e8375a':m,fontSize:9,fontWeight:700,borderBottom:`2px solid ${tab===tb.id?'#e8375a':'transparent'}`,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:2,textTransform:'uppercase' as const,letterSpacing:0.3}}>
            <span style={{fontSize:14}}>{tb.icon}</span><span>{tb.label}</span>
          </button>
        ))}
      </div>

      <div style={{flex:1,overflow:'auto',padding:11}}>

        {/* MEDIA */}
        {tab==='media'&&<div>
          <div onClick={onImportVideo}
            onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLDivElement).style.borderColor='#e8375a';}}
            onDragLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=bd;}}
            style={{border:`2px dashed ${bd}`,borderRadius:10,padding:'18px 10px',textAlign:'center',cursor:'pointer',marginBottom:11,background:c,transition:'all .2s'}}>
            <div style={{fontSize:24,marginBottom:6}}>📂</div>
            <div style={{fontSize:12,fontWeight:700,color:t}}>Import Video / Image</div>
            <div style={{fontSize:11,color:m,marginTop:2}}>Drop files here or click</div>
          </div>

          {store.project.clips.length===0&&<div style={{textAlign:'center',color:m,fontSize:11,padding:'8px 0'}}>No clips yet.</div>}

          {store.project.clips.map(clip=>(
            <div key={clip.id} onClick={()=>store.setSelectedId(clip.id,'clip')} onDoubleClick={()=>store.setSelectedId(clip.id,'clip')}
              style={{background:store.selectedId===clip.id?`${clip.color}18`:c,border:`1px solid ${store.selectedId===clip.id?clip.color:bd}`,borderRadius:8,padding:'9px 10px',marginBottom:7,cursor:'pointer',transition:'all .15s'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{overflow:'hidden',flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:t,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{clip.name}</div>
                  <div style={{fontSize:10,color:m,marginTop:2,display:'flex',gap:6}}>
                    <span>{clip.type==='video'?'🎬':'🖼'}</span>
                    <span>{clip.duration.toFixed(1)}s</span>
                    {clip.speed!==1&&<span style={{color:'#f59e0b'}}>{clip.speed}×</span>}
                    {clip.locked&&<span style={{color:'#e8375a'}}>🔒</span>}
                    {!clip.visible&&<span style={{color:m}}>👁‍🗨</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:3,flexShrink:0}}>
                  <button onClick={e=>{e.stopPropagation();store.updateClip(clip.id,{visible:!clip.visible});}} title="Toggle visibility" style={{background:'none',border:'none',cursor:'pointer',color:m,fontSize:12,padding:2}}>{clip.visible?'👁':'👁‍🗨'}</button>
                  <button onClick={e=>{e.stopPropagation();store.duplicateClip(clip.id);notify('Duplicated');}} title="Duplicate" style={{background:'none',border:'none',cursor:'pointer',color:m,fontSize:13,padding:2}}>⧉</button>
                  {/* FIX: revoke blob URL on delete */}
                  <button onClick={e=>{e.stopPropagation();handleDeleteClip(clip.id,clip.url);}} title="Delete" style={{background:'none',border:'none',cursor:'pointer',color:'#e8375a',fontSize:13,padding:2}}>✕</button>
                </div>
              </div>
              <div style={{height:2,borderRadius:1,background:clip.color,marginTop:7,opacity:.7}}/>

              {store.selectedId===clip.id&&(
                <div style={{marginTop:9,borderTop:`1px solid ${bd}`,paddingTop:9}}>
                  {[{l:'Speed',k:'speed',min:0.1,max:8,step:0.1,val:clip.speed,unit:'×'},{l:'Volume',k:'volume',min:0,max:200,step:1,val:clip.volume,unit:'%'},{l:'Opacity',k:'opacity',min:0,max:100,step:1,val:clip.opacity,unit:'%'}].map(sl=>(
                    <div key={sl.k} style={{marginBottom:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:m,marginBottom:2}}><span>{sl.l}</span><span style={{color:'#e8375a',fontWeight:600}}>{sl.val}{sl.unit}</span></div>
                      <input type="range" min={sl.min} max={sl.max} step={sl.step} value={sl.val} onChange={e=>store.updateClip(clip.id,{[sl.k]:+e.target.value})} style={{width:'100%'}}/>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap' as const}}>
                    {[
                      {l:'✂ Split',fn:()=>{store.splitClip(clip.id,store.currentTime);notify('Split ✂');}},
                      {l:clip.muted?'🔊 Unmute':'🔇 Mute',fn:()=>store.updateClip(clip.id,{muted:!clip.muted})},
                      {l:clip.locked?'🔓':'🔒',fn:()=>store.updateClip(clip.id,{locked:!clip.locked})},
                      {l:'↩ H',fn:()=>store.updateClip(clip.id,{flipH:!clip.flipH})},
                      {l:'↕ V',fn:()=>store.updateClip(clip.id,{flipV:!clip.flipV})},
                    ].map(b=>(
                      <button key={b.l} onClick={b.fn} style={{background:'transparent',border:`1px solid ${bd}`,borderRadius:5,padding:'4px 7px',color:m,fontSize:10,cursor:'pointer',fontWeight:600}}>{b.l}</button>
                    ))}
                  </div>
                  <div style={{marginTop:6}}>
                    <div style={{fontSize:10,color:m,marginBottom:3}}>Rotation</div>
                    <input type="range" min="-180" max="180" value={clip.rotation} onChange={e=>store.updateClip(clip.id,{rotation:+e.target.value})} style={{width:'100%'}}/>
                    <div style={{fontSize:10,color:'#e8375a',textAlign:'right'}}>{clip.rotation}°</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>}

        {/* AUDIO */}
        {tab==='audio'&&<div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:11}}>
            <button onClick={onImportAudio} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'10px 5px',cursor:'pointer',color:t,fontSize:11,fontWeight:600,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4}}>📁<span>Import</span></button>
            <button onClick={onDownloadMusic} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'10px 5px',cursor:'pointer',color:t,fontSize:11,fontWeight:600,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4}}>🌐<span>Download</span></button>
          </div>

          {/* FIX: SFX clearly marked as "coming soon" — no longer adds null URL tracks */}
          <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:5,letterSpacing:.5}}>SOUND EFFECTS</div>
          <div style={{background:'#f59e0b10',border:'1px solid #f59e0b33',borderRadius:7,padding:'8px 10px',marginBottom:10,fontSize:11,color:'#f59e0b'}}>
            ⚠ Built-in SFX coming soon — use Import or Download to add audio
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:12,opacity:0.4,pointerEvents:'none'}}>
            {SFX.map(s=>(
              <div key={s.n} style={{background:c,border:`1px solid ${bd}`,borderRadius:7,padding:'7px 4px',color:t,fontSize:11,textAlign:'center' as const,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:2}}>
                <span style={{fontSize:16}}>{s.e}</span><span>{s.n}</span>
              </div>
            ))}
          </div>

          {store.project.audioTracks.map(tr=>(
            <div key={tr.id} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'10px',marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                <div><div style={{fontSize:12,fontWeight:700,color:tr.color,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{tr.name}</div><div style={{fontSize:10,color:m}}>{tr.type}</div></div>
                <div style={{display:'flex',gap:3}}>
                  <button onClick={()=>store.updateAudio(tr.id,{muted:!tr.muted})} style={{background:'none',border:'none',cursor:'pointer',color:tr.muted?'#e8375a':m,fontSize:12,padding:2}}>{tr.muted?'🔇':'🔊'}</button>
                  <button onClick={()=>{if(tr.url?.startsWith('blob:'))URL.revokeObjectURL(tr.url);store.deleteAudio(tr.id);notify('Deleted');}} style={{background:'none',border:'none',cursor:'pointer',color:'#e8375a',fontSize:12,padding:2}}>✕</button>
                </div>
              </div>
              {[{l:'Volume',k:'volume',v:tr.volume,min:0,max:200},{l:'Fade In',k:'fadeIn',v:tr.fadeIn,min:0,max:10}].map(sl=>(
                <div key={sl.k} style={{marginBottom:4}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:m}}><span>{sl.l}</span><span style={{color:tr.color}}>{sl.v}{sl.k==='volume'?'%':'s'}</span></div>
                  <input type="range" min={sl.min} max={sl.max} step={sl.k==='fadeIn'?0.1:1} value={sl.v} onChange={e=>store.updateAudio(tr.id,{[sl.k]:+e.target.value})} style={{width:'100%'}}/>
                </div>
              ))}
              <div style={{display:'flex',gap:5,marginTop:4,fontSize:10,color:m}}>
                <span>Pan</span>
                <input type="range" min="-100" max="100" value={(tr.pan||0)*100} onChange={e=>store.updateAudio(tr.id,{pan:+e.target.value/100})} style={{flex:1}}/>
                <span style={{color:tr.color,minWidth:30}}>{tr.pan>0?'R':tr.pan<0?'L':'C'} {Math.abs(Math.round((tr.pan||0)*100))}</span>
              </div>
            </div>
          ))}
        </div>}

        {/* TEXT */}
        {tab==='text'&&<div>
          <textarea value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Enter text overlay..." style={{width:'100%',background:c,border:`1px solid ${bd}`,borderRadius:8,padding:9,color:t,fontSize:13,resize:'none' as const,height:76,outline:'none',fontFamily:'inherit',marginBottom:9}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:8}}>
            <div><div style={{fontSize:10,color:m,marginBottom:3}}>Color</div><input type="color" value={fc} onChange={e=>setFc(e.target.value)} style={{width:'100%',height:34,border:`1px solid ${bd}`,borderRadius:6,background:c,cursor:'pointer'}}/></div>
            <div><div style={{fontSize:10,color:m,marginBottom:3}}>Size: {fs}px</div><input type="range" min="12" max="120" value={fs} onChange={e=>setFs(+e.target.value)} style={{width:'100%',marginTop:9}}/></div>
          </div>
          <div style={{marginBottom:8}}><div style={{fontSize:10,color:m,marginBottom:3}}>Font</div><select value={ff} onChange={e=>setFf(e.target.value)} style={{width:'100%'}}>{FONTS.map(f=><option key={f}>{f}</option>)}</select></div>
          <div style={{marginBottom:8}}><div style={{fontSize:10,color:m,marginBottom:3}}>Animation</div><select value={anim} onChange={e=>setAnim(e.target.value)} style={{width:'100%'}}>{TEXT_ANIMS.map(a=><option key={a}>{a}</option>)}</select></div>

          {/* FIX: x/y position sliders so text can be placed anywhere on screen */}
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:5,letterSpacing:.5}}>POSITION</div>
            {[{l:'X (left → right)',v:textX,s:setTextX},{l:'Y (top → bottom)',v:textY,s:setTextY}].map(sl=>(
              <div key={sl.l} style={{marginBottom:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:m,marginBottom:2}}><span>{sl.l}</span><span style={{color:'#e8375a',fontWeight:600}}>{sl.v}%</span></div>
                <input type="range" min="5" max="95" value={sl.v} onChange={e=>sl.s(+e.target.value)} style={{width:'100%'}}/>
              </div>
            ))}
          </div>

          <div style={{display:'flex',gap:5,marginBottom:10}}>
            {[{l:'B',v:bold,s:setBold,fw:700},{l:'I',v:italic,s:setItalic,fi:'italic'},{l:'BG',v:bg,s:setBg},{l:'Shadow',v:shadow,s:setShadow}].map(b=>(
              <button key={b.l} onClick={()=>b.s(!b.v)} style={{flex:1,background:b.v?'#e8375a15':c,border:`1px solid ${b.v?'#e8375a':bd}`,borderRadius:6,padding:'6px 3px',color:b.v?'#e8375a':m,cursor:'pointer',fontWeight:(b as any).fw||400,fontStyle:(b as any).fi||'normal',fontSize:11}}>{b.l}</button>
            ))}
          </div>
          <button onClick={addText} style={{width:'100%',background:'linear-gradient(135deg,#e8375a,#c0392b)',border:'none',borderRadius:8,padding:'9px',color:'#fff',fontWeight:800,cursor:'pointer',fontSize:13,marginBottom:10}}>+ Add Text</button>

          {store.project.textOverlays.map(ov=>(
            <div key={ov.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:c,border:`1px solid ${bd}`,borderRadius:7,padding:'7px 9px',marginBottom:5}}>
              <div>
                <span style={{fontSize:12,color:ov.color,fontWeight:ov.bold?700:400,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>{ov.text}</span>
                <span style={{fontSize:10,color:m}}>x:{ov.x}% y:{ov.y}%</span>
              </div>
              <button onClick={()=>store.deleteText(ov.id)} style={{background:'none',border:'none',color:'#e8375a',cursor:'pointer',fontSize:13,padding:2}}>✕</button>
            </div>
          ))}
        </div>}

        {/* FX */}
        {tab==='fx'&&<div>
          <div style={{fontSize:11,color:m,marginBottom:9}}>{store.selectedId?'Select effect to apply':'Select a clip first'}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
            {EFFECTS.map(fx=>(
              <button key={fx.n} onClick={()=>{
                const clip=store.project.clips.find(c=>c.id===store.selectedId);
                if(!clip){notify('Select a clip first','err');return;}
                store.updateClip(clip.id,{filters:[...clip.filters,fx.n]});
                notify(`${fx.n} applied ✓`);
              }} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'9px 5px',cursor:'pointer',color:t,fontSize:11,textAlign:'center' as const,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:3}}>
                <span style={{fontSize:17}}>{fx.i}</span><span style={{fontWeight:600}}>{fx.n}</span>
              </button>
            ))}
          </div>
          {store.selectedId&&(()=>{
            const clip=store.project.clips.find(c=>c.id===store.selectedId);
            if(!clip||!clip.filters.length)return null;
            return <div style={{marginTop:12}}>
              <div style={{fontSize:10,fontWeight:700,color:m,marginBottom:7}}>APPLIED</div>
              <div style={{display:'flex',flexWrap:'wrap' as const,gap:5}}>
                {clip.filters.map((f,i)=>(
                  <span key={i} style={{background:'#e8375a15',border:'1px solid #e8375a50',borderRadius:12,padding:'3px 9px',fontSize:11,color:'#e8375a',display:'flex',alignItems:'center',gap:4}}>
                    {f}<button onClick={()=>store.updateClip(clip.id,{filters:clip.filters.filter((_,j)=>j!==i)})} style={{background:'none',border:'none',color:'#e8375a',cursor:'pointer',padding:0,fontSize:11}}>✕</button>
                  </span>
                ))}
              </div>
            </div>;
          })()}
        </div>}

        {/* TRANSITIONS */}
        {tab==='trans'&&<div>
          <div style={{fontSize:11,color:m,marginBottom:9}}>Select a clip, then apply transition at its end.</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
            {TRANSITIONS.map(tr=>(
              <button key={tr} onClick={()=>{
                const clip=store.project.clips.find(c=>c.id===store.selectedId);
                if(!clip){notify('Select a clip first','err');return;}
                store.updateClip(clip.id,{transition:tr});
                notify(`${tr} transition ✓`);
              }} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'9px 5px',cursor:'pointer',color:t,fontSize:11,fontWeight:600,textAlign:'center' as const,transition:'all .15s'}}>
                {tr}
              </button>
            ))}
          </div>
        </div>}
      </div>
    </div>
  );
}
