'use client';
import { useStore, PLATFORMS } from '@/store/editor';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

interface P {
  dark:boolean; onToggleTheme:()=>void; onImportVideo:()=>void; onImportAudio:()=>void;
  onRecord:()=>void; recording:boolean; onDownloadVideo:()=>void; onDownloadMusic:()=>void;
  onAI:()=>void; onExport:()=>void; onGrade:()=>void; onMixer:()=>void;
  onNewProject:()=>void; // FIX: added prop for URL-revoking new project
  notify:(m:string,t?:any)=>void;
}

export default function ProTopBar({ dark,onToggleTheme,onImportVideo,onImportAudio,onRecord,recording,onDownloadVideo,onDownloadMusic,onAI,onExport,onGrade,onMixer,onNewProject,notify }:P) {
  const store = useStore();
  const { data: session } = useSession();
  const [editName, setEditName] = useState(false);
  const [showPlat, setShowPlat] = useState(false);
  const [showUser, setShowUser] = useState(false);

  const b = '#0d0d12', bd = '#1a1a28', t = dark?'#dde0ee':'#1a1a2e', m = '#8888aa', c = dark?'#111118':'#f5f5ff';
  const btn = (accent=false, color='#e8375a') => ({
    display:'flex',alignItems:'center',gap:5,
    background:accent?`${color}20`:c,
    border:`1px solid ${accent?color:bd}`,
    borderRadius:6,padding:'5px 10px',cursor:'pointer',
    color:accent?color:t,fontSize:11,fontWeight:600,
    whiteSpace:'nowrap' as const,transition:'all .15s'
  });

  return (
    <div style={{ height:50, background:b, borderBottom:`1px solid ${bd}`, display:'flex', alignItems:'center', padding:'0 12px', gap:7, flexShrink:0, zIndex:50 }}>
      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:16, background:'linear-gradient(135deg,#e8375a,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginRight:6, flexShrink:0, letterSpacing:-0.5 }}>⚡ VF Pro</div>

      {editName
        ? <input autoFocus defaultValue={store.project.name} onBlur={e=>{store.setProjectName(e.target.value||'Untitled');setEditName(false);}} onKeyDown={e=>e.key==='Enter'&&(e.target as HTMLInputElement).blur()} style={{ background:'transparent', border:`1px solid #e8375a`, borderRadius:5, padding:'3px 8px', color:t, fontSize:12, fontWeight:600, outline:'none', width:150 }} />
        : <span onClick={()=>setEditName(true)} style={{ fontSize:12, fontWeight:600, color:t, cursor:'text', padding:'3px 6px', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{store.project.name}</span>
      }

      <div style={{ position:'relative', flexShrink:0 }}>
        <button onClick={()=>setShowPlat(!showPlat)} style={btn()}>
          {PLATFORMS[store.project.platform].icon} {PLATFORMS[store.project.platform].label} ▾
        </button>
        {showPlat && (
          <div style={{ position:'absolute', top:'100%', left:0, marginTop:3, background:'#111118', border:`1px solid ${bd}`, borderRadius:10, zIndex:200, minWidth:200, boxShadow:'0 12px 40px rgba(0,0,0,.6)', overflow:'hidden' }}>
            {Object.entries(PLATFORMS).map(([k,v])=>(
              <button key={k} onClick={()=>{store.setPlatform(k as any);setShowPlat(false);}} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:store.project.platform===k?'#e8375a15':'transparent', border:'none', cursor:'pointer', color:store.project.platform===k?'#e8375a':t, fontSize:12, textAlign:'left' as const }}>
                <span>{v.icon}</span>
                <div><div style={{ fontWeight:600 }}>{v.label}</div><div style={{ fontSize:10, color:m }}>{v.ratio} · {v.w}×{v.h}</div></div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:4, padding:'0 4px', borderLeft:`1px solid ${bd}`, borderRight:`1px solid ${bd}`, marginLeft:2 }}>
        {(['select','razor','hand','text'] as const).map(tool=>(
          <button key={tool} onClick={()=>store.setActiveTool(tool)} title={`${tool} (${tool==='select'?'V':tool==='razor'?'B':''})`} style={{ ...btn(store.activeTool===tool,'#e8375a'), padding:'5px 8px', fontSize:14 }}>
            {tool==='select'?'↖':tool==='razor'?'✂':tool==='hand'?'✋':'T'}
          </button>
        ))}
      </div>

      <button onClick={onImportVideo} style={btn()}>📂 Import</button>
      <button onClick={onRecord} style={btn(recording,'#e8375a')}>{recording?'⏹ Stop':'🔴 Record'}</button>
      <button onClick={onDownloadVideo} style={btn()}>📥 Video DL</button>
      <button onClick={onDownloadMusic} style={btn()}>🎵 Music DL</button>
      <button onClick={onGrade} style={btn(false,'#7c3aed')}>🎨 Grade</button>
      <button onClick={onMixer} style={btn(false,'#06b6d4')}>🎛 Mixer</button>
      <button onClick={onAI} style={btn(false,'#7c3aed')}><span style={{color:'#7c3aed'}}>✦</span> AI</button>

      <div style={{ fontSize:10, color: store.ffmpegReady?'#10b981':store.ffmpegLoading?'#f59e0b':'#3a3a55', background: store.ffmpegReady?'#10b98115':store.ffmpegLoading?'#f59e0b15':'#1a1a28', border:`1px solid ${store.ffmpegReady?'#10b981':store.ffmpegLoading?'#f59e0b':'#2a2a40'}`, borderRadius:12, padding:'3px 9px', fontWeight:600, whiteSpace:'nowrap' as const, flexShrink:0 }}>
        {store.ffmpegReady?'FFmpeg ✓':store.ffmpegLoading?'FFmpeg ⏳':'FFmpeg ✗'}
      </div>

      <div style={{ flex:1 }} />

      <button onClick={store.undo} disabled={!store.undoStack.length} style={{ ...btn(), opacity:store.undoStack.length?1:0.4 }} title="Undo (Ctrl+Z)">↩</button>
      <button onClick={store.redo} disabled={!store.redoStack.length} style={{ ...btn(), opacity:store.redoStack.length?1:0.4 }} title="Redo (Ctrl+Shift+Z)">↪</button>

      <button onClick={()=>{store.saveProject();notify('Saved ✓');}} style={{ ...btn(), color:m }}>💾</button>
      <button onClick={onToggleTheme} style={btn()}>{dark?'☀':'🌙'}</button>

      <button onClick={onExport} style={{ background:'linear-gradient(135deg,#e8375a,#c0392b)', border:'none', borderRadius:7, padding:'7px 18px', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 2px 14px rgba(232,55,90,.4)', flexShrink:0 }}>
        ⬇ Export
      </button>

      <div style={{ position:'relative', flexShrink:0 }}>
        <button onClick={()=>setShowUser(!showUser)} style={{ ...btn(), gap:6 }}>
          {session?.user?.image?<img src={session.user.image} width={18} height={18} style={{borderRadius:'50%'}} alt="" />:'👤'}
          {session?.user?.name?.split(' ')[0]||'Guest'}
        </button>
        {showUser && (
          <div style={{ position:'absolute', top:'100%', right:0, marginTop:3, background:'#111118', border:`1px solid ${bd}`, borderRadius:10, zIndex:200, minWidth:160, boxShadow:'0 12px 40px rgba(0,0,0,.6)', overflow:'hidden' }}>
            {session
              ? <><div style={{padding:'9px 14px',fontSize:11,color:m,borderBottom:`1px solid ${bd}`}}>{session.user?.email}</div>
                  {/* FIX: use onNewProject which revokes blob URLs */}
                  <button onClick={()=>{onNewProject();setShowUser(false);}} style={{width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:t,fontSize:12,textAlign:'left' as const}}>📄 New Project</button>
                  <button onClick={()=>signOut({callbackUrl:'/'})} style={{width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:'#e8375a',fontSize:12,textAlign:'left' as const}}>Sign Out</button></>
              : <><button onClick={()=>signIn('google')} style={{width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:t,fontSize:12,textAlign:'left' as const}}>Sign in with Google</button>
                  <button onClick={()=>{onNewProject();setShowUser(false);}} style={{width:'100%',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:t,fontSize:12,textAlign:'left' as const}}>📄 New Project</button></>
            }
          </div>
        )}
      </div>
    </div>
  );
}
