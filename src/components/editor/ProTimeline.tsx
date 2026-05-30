'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store/editor';
import { extractWaveformPeaks, paintWaveform } from '@/lib/audio';

const fmt=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s%1)*10)}`;
const TRACK_H=40, LABEL_W=80;

interface WaveData { [id:string]: number[] }

export default function ProTimeline({ notify }:{ notify:(m:string,t?:any)=>void }) {
  const store = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const waveCanvases = useRef<{[id:string]:HTMLCanvasElement|null}>({});
  const [waveData, setWaveData] = useState<WaveData>({});
  const [dragging, setDragging] = useState<any>(null);
  const [trimming, setTrimming] = useState<any>(null);

  const pps = 60 * store.zoom; // pixels per second
  const totalW = Math.max(store.project.duration * pps + 300, 1000);
  const bd='#1a1a28', t='#dde0ee', m='#8888aa', c='#0d0d12';

  // Extract waveforms for audio tracks
  useEffect(() => {
    store.project.audioTracks.forEach(async (track) => {
      if (!track.url || waveData[track.id]) return;
      const peaks = await extractWaveformPeaks(track.url, 200);
      setWaveData(prev => ({ ...prev, [track.id]: peaks }));
    });
  }, [store.project.audioTracks]);

  // Paint waveforms on canvas
  useEffect(() => {
    Object.entries(waveCanvases.current).forEach(([id, canvas]) => {
      if (!canvas || !waveData[id]) return;
      paintWaveform(canvas, waveData[id], '#06b6d4');
    });
  }, [waveData]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging || trimming) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - LABEL_W + (containerRef.current?.scrollLeft||0);
    store.setCurrentTime(Math.max(0, Math.min(x / pps, store.project.duration)));
  }, [pps, dragging, trimming]);

  const startDragClip = useCallback((e: React.MouseEvent, item: any, type: 'clip'|'audio'|'text') => {
    if (store.activeTool === 'razor') {
      // Razor cut
      if (type === 'clip') store.splitClip(item.id, store.currentTime);
      notify('✂ Cut');
      return;
    }
    e.stopPropagation();
    store.setSelectedId(item.id, type);
    const startX = e.clientX;
    const origStart = item.start;
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dt = dx / pps;
      const ns = Math.max(0, origStart + dt);
      if (type==='clip') store.updateClip(item.id,{start:ns});
      else if (type==='audio') store.updateAudio(item.id,{start:ns});
      else if (type==='text') store.updateText(item.id,{start:ns});
    };
    const onUp = () => { window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  }, [pps, store.activeTool]);

  const startTrimRight = useCallback((e: React.MouseEvent, item: any, type: 'clip'|'audio') => {
    e.stopPropagation();
    const startX = e.clientX;
    const origDur = item.duration;
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const nd = Math.max(0.1, origDur + dx/pps);
      if (type==='clip') store.updateClip(item.id,{duration:nd,trimOut:item.trimIn+nd});
      else store.updateAudio(item.id,{duration:nd});
    };
    const onUp = () => { window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); store.recalcDuration(); };
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  }, [pps]);

  const playheadX = store.currentTime * pps;

  const TRACKS: {label:string; icon:string; items:any[]; type:'clip'|'audio'|'text'|'caption'}[] = [
    { label:'VIDEO 1', icon:'🎬', items: store.project.clips.filter(c=>c.trackIndex===0), type:'clip' },
    { label:'VIDEO 2', icon:'🎬', items: store.project.clips.filter(c=>c.trackIndex===1), type:'clip' },
    { label:'AUDIO 1', icon:'🎵', items: store.project.audioTracks.filter(a=>a.trackIndex===0), type:'audio' },
    { label:'AUDIO 2', icon:'🎵', items: store.project.audioTracks.filter(a=>a.trackIndex===1), type:'audio' },
    { label:'TEXT', icon:'✏️', items: store.project.textOverlays, type:'text' },
    ...(store.project.captions.length>0?[{label:'CAPTIONS',icon:'💬',items:store.project.captions.map(c=>({...c,start:c.time,color:'#7c3aed',name:c.text})),type:'caption' as const}]:[]),
    ...(store.project.markers.length>0?[{label:'MARKERS',icon:'📌',items:[],type:'caption' as const}]:[]),
  ];

  return (
    <div style={{height:220,background:c,borderTop:`1px solid ${bd}`,flexShrink:0,display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',padding:'4px 10px',borderBottom:`1px solid ${bd}`,height:30,gap:8,flexShrink:0}}>
        <span style={{fontSize:10,fontWeight:700,color:m,letterSpacing:.5}}>TIMELINE</span>
        <div style={{display:'flex',gap:5}}>
          <button onClick={()=>store.setCurrentTime(0)} title="Go to start" style={{background:'none',border:'none',cursor:'pointer',color:m,fontSize:14,padding:'0 2px'}}>⏮</button>
          <button onClick={()=>store.setPlaying(!store.playing)} style={{background:'#e8375a',border:'none',cursor:'pointer',color:'#fff',fontSize:12,borderRadius:4,padding:'3px 9px',fontWeight:700}}>{store.playing?'⏸':'▶'}</button>
          <button onClick={()=>{if(store.selectedId){store.splitClip(store.selectedId,store.currentTime);notify('✂ Split');}else notify('Select clip first','err')}} style={{background:'none',border:`1px solid ${bd}`,cursor:'pointer',color:m,fontSize:10,borderRadius:4,padding:'3px 8px'}} title="Razor cut (B)">✂ Cut</button>
          <button onClick={store.toggleSnapToGrid} style={{background:store.snapToGrid?'#e8375a15':'none',border:`1px solid ${store.snapToGrid?'#e8375a':bd}`,cursor:'pointer',color:store.snapToGrid?'#e8375a':m,fontSize:10,borderRadius:4,padding:'3px 8px'}}>⊞ Snap</button>
          <button onClick={store.toggleRippleEdit} style={{background:store.rippleEdit?'#7c3aed15':'none',border:`1px solid ${store.rippleEdit?'#7c3aed':bd}`,cursor:'pointer',color:store.rippleEdit?'#7c3aed':m,fontSize:10,borderRadius:4,padding:'3px 8px'}}>⇥ Ripple</button>
          <button onClick={store.toggleWaveforms} style={{background:store.showWaveforms?'#06b6d415':'none',border:`1px solid ${store.showWaveforms?'#06b6d4':bd}`,cursor:'pointer',color:store.showWaveforms?'#06b6d4':m,fontSize:10,borderRadius:4,padding:'3px 8px'}}>〜 Wave</button>
        </div>
        <span style={{fontSize:11,color:m,fontFamily:'monospace'}}>{fmt(store.currentTime)} / {fmt(store.project.duration)}</span>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:m}}>Zoom</span>
        <input type="range" min="0.1" max="20" step="0.1" value={store.zoom} onChange={e=>store.setZoom(+e.target.value)} style={{width:90}}/>
        <span style={{fontSize:10,color:'#e8375a',minWidth:32}}>{store.zoom.toFixed(1)}×</span>
        <button onClick={()=>store.addMarker(store.currentTime)} title="Add marker" style={{background:'none',border:`1px solid ${bd}`,cursor:'pointer',color:'#f59e0b',fontSize:12,borderRadius:4,padding:'2px 6px'}}>📌</button>
      </div>

      {/* Track area */}
      <div ref={containerRef} style={{flex:1,overflow:'auto',position:'relative'}}>
        <div style={{position:'relative',minWidth:totalW+LABEL_W}}>

          {/* Time ruler */}
          <div style={{position:'sticky',top:0,zIndex:10,display:'flex',background:c,borderBottom:`1px solid ${bd}`,height:20}}>
            <div style={{width:LABEL_W,flexShrink:0,borderRight:`1px solid ${bd}`}}/>
            <div style={{position:'relative',flex:1}} onClick={seek}>
              {Array.from({length:Math.ceil(store.project.duration)+1},(_,i)=>(
                <div key={i} style={{position:'absolute',left:i*pps,top:0,height:'100%',display:'flex',alignItems:'center',paddingLeft:3,borderLeft:`1px solid ${bd}`,pointerEvents:'none'}}>
                  <span style={{fontSize:9,color:m,whiteSpace:'nowrap',fontFamily:'monospace'}}>{fmt(i)}</span>
                </div>
              ))}
              {/* Markers on ruler */}
              {store.project.markers.map(mk=>(
                <div key={mk.id} title={mk.label} style={{position:'absolute',left:mk.time*pps,top:0,height:'100%',width:2,background:'#f59e0b',zIndex:3,cursor:'pointer'}} onClick={e=>{e.stopPropagation();store.deleteMarker(mk.id);}}>
                  <div style={{width:8,height:8,background:'#f59e0b',borderRadius:'50%',marginLeft:-3}}/>
                </div>
              ))}
              <div style={{position:'absolute',left:playheadX,top:0,height:'100%',width:2,background:'#e8375a',pointerEvents:'none',zIndex:5}}/>
            </div>
          </div>

          {/* Tracks */}
          {TRACKS.map((track,ti)=>(
            <div key={track.label} style={{display:'flex',height:TRACK_H,borderBottom:`1px solid ${bd}18`}}>
              <div style={{width:LABEL_W,flexShrink:0,display:'flex',alignItems:'center',gap:5,padding:'0 7px',borderRight:`1px solid ${bd}`,background:c,position:'sticky',left:0,zIndex:5}}>
                <span style={{fontSize:11}}>{track.icon}</span>
                <span style={{fontSize:9,fontWeight:700,color:m,letterSpacing:.3}}>{track.label}</span>
              </div>
              <div style={{position:'relative',flex:1,overflow:'hidden'}} onClick={seek}>
                {/* Grid */}
                {Array.from({length:Math.ceil(store.project.duration)+1},(_,i)=>(
                  <div key={i} style={{position:'absolute',left:i*pps,top:0,height:'100%',width:1,background:`${bd}66`,pointerEvents:'none'}}/>
                ))}

                {/* Items */}
                {track.items.map((item:any)=>{
                  const w=item.duration*pps;
                  const isSel=store.selectedId===item.id;
                  const col=item.color||'#e8375a';
                  const isAudio=track.type==='audio';
                  return (
                    <div key={item.id} className={`tl-clip ${isSel?'selected':''}`}
                      onMouseDown={e=>startDragClip(e,item,track.type as any)}
                      style={{position:'absolute',left:item.start*pps,width:Math.max(w,12),height:'80%',top:'10%',background:`${col}22`,border:`1.5px solid ${isSel?col:col+'77'}`,borderRadius:5,overflow:'hidden',userSelect:'none',outline:isSel?`2px solid ${col}`:'none',outlineOffset:1,minWidth:8}}>
                      {/* Clip label */}
                      <div style={{fontSize:9,fontWeight:700,color:col,padding:'2px 4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3,position:'relative',zIndex:2}}>
                        {item.name||item.text}
                      </div>
                      {/* Waveform for audio tracks */}
                      {isAudio&&store.showWaveforms&&waveData[item.id]&&(
                        <canvas ref={el=>{waveCanvases.current[item.id]=el;}} width={Math.max(w,12)} height={TRACK_H*0.8-16} style={{position:'absolute',bottom:0,left:0,width:'100%',opacity:.6}}/>
                      )}
                      {/* Duration bar */}
                      <div style={{position:'absolute',bottom:0,left:0,height:2,width:'100%',background:`${col}88`}}/>
                      {/* Trim handle right */}
                      {isSel&&(track.type==='clip'||track.type==='audio')&&(
                        <div onMouseDown={e=>{e.stopPropagation();startTrimRight(e,item,track.type as 'clip'|'audio');}} style={{position:'absolute',right:0,top:0,height:'100%',width:8,cursor:'ew-resize',background:`${col}55`,display:'flex',alignItems:'center',justifyContent:'center',zIndex:3}}>
                          <div style={{width:2,height:16,background:col,borderRadius:1}}/>
                        </div>
                      )}
                      {/* Transition indicator */}
                      {item.transition&&(
                        <div style={{position:'absolute',right:0,top:0,height:'100%',width:Math.min(item.transitionDuration*pps,w/2),background:'linear-gradient(to right,transparent,rgba(255,255,255,0.15))',pointerEvents:'none'}}/>
                      )}
                    </div>
                  );
                })}

                {/* Playhead */}
                <div style={{position:'absolute',top:0,left:playheadX,height:'100%',width:2,background:'#e8375a',pointerEvents:'none',zIndex:6,boxShadow:'0 0 3px #e8375a'}}/>
              </div>
            </div>
          ))}

          {/* Playhead full */}
          <div style={{position:'absolute',top:20,left:LABEL_W+playheadX,height:'100%',width:2,background:'#e8375a55',pointerEvents:'none',zIndex:4}}>
            <div style={{width:10,height:10,background:'#e8375a',borderRadius:'50%',marginLeft:-4}}/>
          </div>
        </div>
      </div>
    </div>
  );
}
