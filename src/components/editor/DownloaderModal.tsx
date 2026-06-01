'use client';
import { useState } from 'react';
import { useStore } from '@/store/editor';
import { v4 as uuid } from 'uuid';
import { renderProject } from '@/lib/ffmpeg';

/* ── AI MODAL ── */
const AI_FEATURES=[
  {id:'captions',icon:'💬',label:'Auto Captions',col:'#06b6d4',desc:'Generate timed captions for your video'},
  {id:'script',icon:'📝',label:'Script Writer',col:'#7c3aed',desc:'Write a viral script for your platform'},
  {id:'enhance',icon:'✨',label:'Color Grade AI',col:'#10b981',desc:'AI-suggested color grading preset'},
  {id:'analyze',icon:'🔍',label:'Video Analyzer',col:'#f59e0b',desc:'SEO score and improvement tips'},
  {id:'titles',icon:'🎯',label:'Title Generator',col:'#e8375a',desc:'5 high-converting title ideas'},
  {id:'hashtags',icon:'#️⃣',label:'Hashtag AI',col:'#ec4899',desc:'Trending hashtags for your niche'},
];

// FIX: formatted AI result renderers instead of raw JSON
function AIResultView({ feat, data }: { feat: string; data: any }) {
  const bd='#1a1a28', t='#dde0ee', m='#8888aa', c='#111118';
  if (feat === 'captions' && data.captions) {
    return (
      <div>
        {data.captions.map((cap: any, i: number) => (
          <div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:`1px solid ${bd}`,fontSize:12}}>
            <span style={{color:'#06b6d4',fontFamily:'monospace',flexShrink:0,minWidth:40}}>{cap.time.toFixed(1)}s</span>
            <span style={{color:t}}>{cap.text}</span>
          </div>
        ))}
      </div>
    );
  }
  if (feat === 'script' && data.hook) {
    return (
      <div style={{fontSize:12,color:t}}>
        <div style={{fontWeight:700,color:'#7c3aed',marginBottom:6}}>{data.title}</div>
        <div style={{background:'#7c3aed15',borderRadius:6,padding:'8px 10px',marginBottom:8,borderLeft:'3px solid #7c3aed'}}><strong>Hook:</strong> {data.hook}</div>
        {data.sections?.map((s: any, i: number) => (
          <div key={i} style={{background:c,borderRadius:6,padding:'7px 10px',marginBottom:5}}>
            <div style={{color:m,fontSize:10,marginBottom:2}}>{s.startTime}s – {s.endTime}s · {s.note}</div>
            <div>{s.text}</div>
          </div>
        ))}
        <div style={{color:'#10b981',marginTop:8}}><strong>CTA:</strong> {data.cta}</div>
        <div style={{marginTop:4,color:m}}>{data.hashtags?.join(' ')}</div>
      </div>
    );
  }
  if (feat === 'enhance' && data.brightness !== undefined) {
    return (
      <div style={{fontSize:12,color:t}}>
        <div style={{fontWeight:700,color:'#10b981',marginBottom:8}}>Suggested Grade: {data.colorGrade}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginBottom:8}}>
          {['brightness','contrast','saturation','sharpness','temperature','shadows'].map(k=>(
            <div key={k} style={{background:c,borderRadius:5,padding:'5px 7px',textAlign:'center'}}>
              <div style={{fontWeight:700,color:'#10b981'}}>{data[k]>0?'+':''}{data[k]}</div>
              <div style={{fontSize:10,color:m}}>{k}</div>
            </div>
          ))}
        </div>
        <div style={{color:m,fontSize:11}}>{data.tips?.map((tip: string, i: number) => <div key={i}>💡 {tip}</div>)}</div>
      </div>
    );
  }
  if (feat === 'titles' && data.titles) {
    return (
      <div style={{fontSize:12,color:t}}>
        {data.titles.map((tt: any, i: number) => (
          <div key={i} style={{background:c,borderRadius:7,padding:'9px 12px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
            <div><div style={{fontWeight:700}}>{tt.title}</div><div style={{color:m,fontSize:11,marginTop:2}}>{tt.hook}</div></div>
            <div style={{flexShrink:0,background:'#e8375a15',color:'#e8375a',borderRadius:12,padding:'2px 8px',fontSize:11,fontWeight:700}}>{tt.score}</div>
          </div>
        ))}
        {data.thumbnailText&&<div style={{background:'#f59e0b15',borderRadius:6,padding:'7px 10px',color:'#f59e0b',fontWeight:700}}>Thumbnail text: {data.thumbnailText}</div>}
      </div>
    );
  }
  if (feat === 'hashtags' && data.combined) {
    return (
      <div style={{fontSize:13,color:t}}>
        <div style={{display:'flex',flexWrap:'wrap' as const,gap:5,marginBottom:8}}>
          {data.hashtags?.map((h: string, i: number) => <span key={i} style={{background:'#ec4899',background:'#ec489915',color:'#ec4899',borderRadius:12,padding:'3px 10px',fontSize:12}}>{h}</span>)}
          {data.niche?.map((h: string, i: number) => <span key={i} style={{background:'#7c3aed15',color:'#7c3aed',borderRadius:12,padding:'3px 10px',fontSize:12}}>{h}</span>)}
          {data.trending?.map((h: string, i: number) => <span key={i} style={{background:'#10b98115',color:'#10b981',borderRadius:12,padding:'3px 10px',fontSize:12}}>{h}</span>)}
        </div>
        <div style={{color:'#8888aa',fontSize:11}}>Full string ready to copy: <span style={{color:t}}>{data.combined}</span></div>
      </div>
    );
  }
  if (feat === 'analyze' && data.score) {
    return (
      <div style={{fontSize:12,color:t}}>
        <div style={{fontSize:28,fontWeight:800,color:data.score>80?'#10b981':data.score>60?'#f59e0b':'#e8375a',marginBottom:8}}>Score: {data.score}/100</div>
        <div style={{marginBottom:8}}><strong style={{color:'#8888aa'}}>Best post time:</strong> {data.bestPostTime}</div>
        <div style={{marginBottom:6,fontWeight:700,color:'#8888aa'}}>Improvements:</div>
        {data.improvements?.map((tip: string, i: number) => <div key={i} style={{marginBottom:3}}>• {tip}</div>)}
        <div style={{marginTop:8,marginBottom:6,fontWeight:700,color:'#8888aa'}}>Trending formats:</div>
        {data.trending?.map((tr: string, i: number) => <div key={i} style={{marginBottom:3}}>📈 {tr}</div>)}
      </div>
    );
  }
  // Generic fallback for unknown types
  return <pre style={{whiteSpace:'pre-wrap' as const,lineHeight:1.6,fontFamily:'inherit',fontSize:11,color:t}}>{JSON.stringify(data,null,2)}</pre>;
}

export function AIModal({onClose,notify}:{onClose:()=>void;notify:(m:string,t?:any)=>void}) {
  const store=useStore();
  const [feat,setFeat]=useState<string|null>(null);
  const [topic,setTopic]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<any>(null);
  const bd='#1a1a28',t='#dde0ee',m='#8888aa',c='#111118',bg='#0d0d12';

  const run=async(id:string)=>{
    setFeat(id);setLoading(true);setResult(null);
    try{
      const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({feature:id,topic:topic||'general',platform:store.project.platform,duration:store.project.duration})});
      const d=await r.json();setResult(d);
    }catch{setResult({error:'AI unavailable'});}
    setLoading(false);
  };

  const apply=()=>{
    if(!result?.data)return;
    const d=result.data;
    if(feat==='captions'&&d.captions){store.setCaptions(d.captions.map((c2:any)=>({id:uuid(),text:c2.text,time:c2.time,duration:c2.duration||2.5})));notify(`✓ ${d.captions.length} captions applied`);}
    if(feat==='enhance'&&d.colorGrade){const cl=store.project.clips.find(c3=>c3.id===store.selectedId)||store.project.clips[0];if(cl)store.updateClip(cl.id,{filters:[...cl.filters,d.colorGrade]});notify(`✓ ${d.colorGrade} applied`);}
    if(feat==='titles'&&d.titles?.[0]){store.setProjectName(d.titles[0].title);notify('✓ Title updated');}
    if(feat==='hashtags'&&d.combined){navigator.clipboard.writeText(d.combined).then(()=>notify('📋 Hashtags copied!'));}
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border:`1px solid ${bd}`,borderRadius:16,width:580,maxHeight:'82vh',overflow:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7),0 0 40px rgba(124,58,237,.2)'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${bd}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontWeight:800,fontSize:17,background:'linear-gradient(135deg,#e8375a,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>✦ AI Studio</div><div style={{fontSize:11,color:m}}>Powered by Claude · {store.project.clips.length} clips loaded</div></div>
          <button onClick={onClose} style={{background:'none',border:'none',color:m,cursor:'pointer',fontSize:20}}>✕</button>
        </div>
        <div style={{padding:20}}>
          <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Video topic (optional — improves AI accuracy)" style={{width:'100%',background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'9px 13px',color:t,fontSize:13,outline:'none',marginBottom:14}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:18}}>
            {AI_FEATURES.map(f=>(
              <button key={f.id} onClick={()=>run(f.id)} style={{background:feat===f.id?`${f.col}18`:c,border:`1px solid ${feat===f.id?f.col:bd}`,borderRadius:10,padding:'13px',cursor:'pointer',textAlign:'left' as const,transition:'all .15s',color:t}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}><span style={{fontSize:20}}>{f.icon}</span><span style={{fontWeight:700,fontSize:13}}>{f.label}</span></div>
                <div style={{fontSize:11,color:m}}>{f.desc}</div>
              </button>
            ))}
          </div>
          {loading&&<div style={{textAlign:'center',padding:'26px 0',color:m}}><div style={{fontSize:34,display:'inline-block',marginBottom:8}}>✦</div><div style={{fontWeight:600}}>Claude is thinking...</div></div>}
          {result&&!loading&&(
            <div style={{background:c,border:`1px solid ${bd}`,borderRadius:12,padding:16}}>
              {result.error&&<div style={{color:'#e8375a'}}>⚠ {result.error}</div>}
              {/* FIX: formatted result view instead of raw JSON */}
              {result.data&&<AIResultView feat={feat||''} data={result.data}/>}
              {result.data&&<button onClick={apply} style={{width:'100%',marginTop:12,background:'linear-gradient(135deg,#e8375a,#7c3aed)',border:'none',borderRadius:8,padding:'10px',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>✓ Apply to Project</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── DOWNLOADER MODAL ── */
const VID_PLATS=[
  {n:'YouTube',i:'▶️',url:'https://youtube.com'},
  {n:'TikTok',i:'🎵',url:'https://tiktok.com'},
  {n:'Instagram',i:'📸',url:'https://instagram.com'},
  {n:'Twitter/X',i:'🐦',url:'https://twitter.com'},
  {n:'Facebook',i:'👥',url:'https://facebook.com'},
  {n:'Vimeo',i:'🎬',url:'https://vimeo.com'},
];
const MUS_PLATS=[
  {n:'Spotify',i:'🟢',url:'https://open.spotify.com'},
  {n:'Apple Music',i:'🎵',url:'https://music.apple.com'},
  {n:'YouTube Music',i:'🔴',url:'https://music.youtube.com'},
  {n:'SoundCloud',i:'🟠',url:'https://soundcloud.com'},
  {n:'Deezer',i:'🎧',url:'https://deezer.com'},
];

export function DownloaderModal({tab,onClose,onFile,notify}:{tab:'video'|'music';onClose:()=>void;onFile:(f:File)=>void;notify:(m:string,t?:any)=>void}) {
  const [url,setUrl]=useState('');
  const [quality,setQuality]=useState('1080');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<any>(null);
  const bd='#1a1a28',t='#dde0ee',m='#8888aa',c='#111118',bg='#0d0d12';

  const go=async()=>{
    if(!url.trim()){notify('Paste a URL','err');return;}
    // FIX: basic URL validation
    if(!url.startsWith('http')){notify('Please paste a full URL starting with https://','err');return;}
    setLoading(true);setResult(null);
    try{
      const r=await fetch(tab==='video'?'/api/download':'/api/music',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,quality})});
      const d=await r.json();setResult(d);
      if(d.url&&d.status==='success'){const a=document.createElement('a');a.href=d.url;a.download='download.mp4';a.click();notify('⬇ Download started!');}
    }catch{setResult({error:'Network error'});}
    setLoading(false);
  };

  const plats=tab==='video'?VID_PLATS:MUS_PLATS;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border:`1px solid ${bd}`,borderRadius:16,width:550,maxHeight:'80vh',overflow:'auto',boxShadow:'0 30px 80px rgba(0,0,0,.7)'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${bd}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:800,fontSize:17,color:t}}>{tab==='video'?'📥 Video Downloader':'🎵 Music Downloader'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:m,cursor:'pointer',fontSize:20}}>✕</button>
        </div>
        <div style={{padding:20}}>
          {/* FIX: platform buttons open the site in a new tab, not paste domain as URL */}
          <div style={{fontSize:11,color:m,marginBottom:6}}>Open platform to copy a URL:</div>
          <div style={{display:'flex',flexWrap:'wrap' as const,gap:6,marginBottom:14}}>
            {plats.map(p=>(
              <button key={p.n} onClick={()=>window.open(p.url,'_blank')}
                style={{background:c,border:`1px solid ${bd}`,borderRadius:20,padding:'5px 12px',cursor:'pointer',color:t,fontSize:12,fontWeight:600}}>
                {p.i} {p.n} ↗
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:7,marginBottom:12}}>
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder={`Paste ${tab} URL (https://...)...`} style={{flex:1,background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'10px 13px',color:t,fontSize:13,outline:'none'}}/>
            <button onClick={go} disabled={loading} style={{background:loading?'#333':'linear-gradient(135deg,#e8375a,#c0392b)',border:'none',borderRadius:8,padding:'10px 18px',color:'#fff',fontWeight:700,cursor:loading?'not-allowed':'pointer',flexShrink:0}}>{loading?'⏳':'⬇ Get'}</button>
          </div>
          {tab==='video'&&<div style={{display:'flex',gap:5,marginBottom:14}}>{['360','720','1080','4K','audio'].map(q=><button key={q} onClick={()=>setQuality(q)} style={{flex:1,background:quality===q?'#e8375a15':c,border:`1px solid ${quality===q?'#e8375a':bd}`,borderRadius:6,padding:'6px',color:quality===q?'#e8375a':t,cursor:'pointer',fontSize:11,fontWeight:600}}>{q}</button>)}</div>}
          {result&&!loading&&<div>
            {result.error&&<div style={{color:'#e8375a',padding:10,background:'#e8375a10',borderRadius:8}}>⚠ {result.error}</div>}
            {result.methods&&<div>{result.message&&<div style={{color:'#f59e0b',marginBottom:10,fontSize:12,background:'#f59e0b10',borderRadius:8,padding:10}}>{result.message}</div>}
              {result.methods.map((mx:any,i:number)=><div key={i} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'11px 13px',marginBottom:7}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div><div style={{fontWeight:700,color:t,fontSize:13}}>{i+1}. {mx.name}</div>
                    {mx.command&&<div style={{fontFamily:'monospace',fontSize:11,color:'#06b6d4',marginTop:4,background:'#000',padding:'3px 8px',borderRadius:4}}>{mx.command}</div>}
                    {mx.note&&<div style={{fontSize:11,color:m,marginTop:4}}>{mx.note}</div>}
                  </div>
                  <div style={{display:'flex',gap:4,flexShrink:0,marginLeft:8}}>
                    {mx.free&&<span style={{background:'#10b98120',color:'#10b981',fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:600}}>FREE</span>}
                    {mx.link&&<a href={mx.link} target="_blank" rel="noreferrer" style={{background:'#7c3aed',color:'#fff',fontSize:11,padding:'4px 10px',borderRadius:6,textDecoration:'none',fontWeight:600}}>Open ↗</a>}
                  </div>
                </div>
              </div>)}
              {result.note&&<div style={{fontSize:12,color:m,marginTop:10,lineHeight:1.6}}>💡 {result.note}</div>}
            </div>}
          </div>}
          <div style={{marginTop:18,borderTop:`1px solid ${bd}`,paddingTop:16}}>
            <div style={{fontSize:12,color:m,marginBottom:9}}>Already downloaded? Import directly:</div>
            <label style={{display:'block',background:c,border:`2px dashed ${bd}`,borderRadius:10,padding:'16px',textAlign:'center' as const,cursor:'pointer',color:t}}>
              <input type="file" accept={tab==='video'?'video/*,image/*':'audio/*'} style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){onFile(f);onClose();}}}/>
              <div style={{fontSize:22,marginBottom:6}}>📂</div>
              <div style={{fontWeight:600,fontSize:13}}>Click to import {tab} file</div>
              <div style={{fontSize:11,color:m,marginTop:2}}>or drag & drop</div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── EXPORT MODAL ── */
export function ExportModal({onClose,notify}:{onClose:()=>void;notify:(m:string,t?:any)=>void}) {
  const store=useStore();
  const [quality,setQuality]=useState('1080p');
  const [format,setFormat]=useState('mp4');
  const [fps,setFps]=useState('30');
  const [progress,setProgress]=useState<number|null>(null);
  const [done,setDone]=useState(false);
  const [log,setLog]=useState('');
  const bd='#1a1a28',t='#dde0ee',m='#8888aa',c='#111118',bg='#0d0d12';

  const doExport=async()=>{
    if(store.project.clips.length===0){notify('Add clips to export','err');return;}
    setProgress(0);setDone(false);setLog('');
    try{
      if(store.ffmpegReady){
        const blob=await renderProject(store.project,pct=>setProgress(pct),msg=>setLog(msg));
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`${store.project.name.replace(/[^a-z0-9]/gi,'_')}.mp4`;a.click();
        URL.revokeObjectURL(url);
      }else{
        // Fallback: download first clip blob URL
        for(let i=0;i<=100;i+=5){await new Promise(r=>setTimeout(r,80));setProgress(i);}
        const cl=store.project.clips.find(x=>x.url?.startsWith('blob:')); // FIX: only use blob URLs
        if(cl){const a=document.createElement('a');a.href=cl.url;a.download=`${store.project.name}.${format}`;a.click();}
        else notify('No importable clip found for fallback export','err');
      }
      setDone(true);notify('✓ Export complete!');
    }catch(e:any){notify(e.message||'Export failed','err');setProgress(null);}
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,border:`1px solid ${bd}`,borderRadius:16,width:490,boxShadow:'0 30px 80px rgba(0,0,0,.7)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${bd}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:800,fontSize:17,color:t}}>⬇ Export Video{store.ffmpegReady&&<span style={{fontSize:12,color:'#10b981',fontWeight:600,marginLeft:8}}>FFmpeg ✓</span>}</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:m,cursor:'pointer',fontSize:20}}>✕</button>
        </div>
        <div style={{padding:20}}>
          <div style={{background:c,border:`1px solid ${bd}`,borderRadius:10,padding:13,marginBottom:16,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,textAlign:'center' as const}}>
            {[['Clips',store.project.clips.length,'#e8375a'],['Audio',store.project.audioTracks.length,'#f59e0b'],['Duration',`${Math.round(store.project.duration)}s`,'#06b6d4'],['FPS',store.project.fps,'#10b981']].map(([l,v,col])=>(
              <div key={l}><div style={{fontWeight:800,color:col as string,fontSize:16}}>{v}</div><div style={{fontSize:10,color:m}}>{l}</div></div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:16}}>
            {[{l:'Quality',vals:['4K','1080p','720p','480p'],v:quality,s:setQuality},{l:'Format',vals:['mp4','webm','mov'],v:format,s:setFormat},{l:'FPS',vals:['24','30','60'],v:fps,s:setFps}].map(sl=>(
              <div key={sl.l}><div style={{fontSize:10,color:m,marginBottom:5}}>{sl.l}</div>
              <select value={sl.v} onChange={e=>sl.s(e.target.value)} style={{width:'100%'}}>{sl.vals.map(v=><option key={v}>{v}</option>)}</select></div>
            ))}
          </div>
          {!store.ffmpegReady&&<div style={{background:'#f59e0b15',border:'1px solid #f59e0b33',borderRadius:8,padding:10,fontSize:12,color:'#f59e0b',marginBottom:14}}>⚠ FFmpeg still loading. Export will use basic download (no baked effects).</div>}
          {progress!==null&&<div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:m,marginBottom:5}}><span>{done?'✓ Done!':'Exporting...'}</span><span style={{color:'#e8375a',fontWeight:700}}>{progress}%</span></div>
            <div style={{height:6,background:bd,borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,#e8375a,#7c3aed)',borderRadius:3,transition:'width .1s'}}/></div>
            {log&&<div style={{fontSize:10,color:m,marginTop:5,fontFamily:'monospace',maxHeight:60,overflow:'auto'}}>{log}</div>}
          </div>}
          {!done?<button onClick={doExport} disabled={progress!==null&&!done} style={{width:'100%',background:progress!==null&&!done?'#333':'linear-gradient(135deg,#e8375a,#c0392b)',border:'none',borderRadius:10,padding:'13px',color:'#fff',fontWeight:800,fontSize:15,cursor:progress!==null&&!done?'not-allowed':'pointer',boxShadow:progress!==null&&!done?'none':'0 4px 20px rgba(232,55,90,.4)',marginBottom:12}}>
            {progress!==null&&!done?`Exporting ${progress}%...`:`⬇ Export ${quality} ${format.toUpperCase()}`}
          </button>:<div style={{background:'#10b98115',border:'1px solid #10b981',borderRadius:10,padding:14,textAlign:'center' as const,marginBottom:12}}><div style={{fontSize:26,marginBottom:5}}>✅</div><div style={{fontWeight:700,color:'#10b981'}}>Export Complete!</div></div>}
          <div style={{fontSize:11,fontWeight:700,color:m,marginBottom:9}}>UPLOAD TO</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {[{i:'▶️',l:'YouTube',u:'https://studio.youtube.com/channel/upload'},{i:'🎵',l:'TikTok',u:'https://www.tiktok.com/upload'},{i:'📸',l:'Instagram',u:'https://www.instagram.com/'},{i:'🐦',l:'Twitter',u:'https://twitter.com/compose/tweet'},{i:'👥',l:'Facebook',u:'https://www.facebook.com/'},{i:'💼',l:'LinkedIn',u:'https://www.linkedin.com/'}].map(p=>(
              <button key={p.l} onClick={()=>{window.open(p.u,'_blank');notify(`${p.l} opened`);}} style={{background:c,border:`1px solid ${bd}`,borderRadius:8,padding:'9px 5px',cursor:'pointer',color:t,fontSize:11,fontWeight:600,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:3}}>
                <span style={{fontSize:17}}>{p.i}</span>{p.l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
