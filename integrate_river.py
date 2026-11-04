from pathlib import Path
p=Path('/mnt/data/xastress67/game.js')
s=p.read_text()
s=s.replace("nearArena:false,", "nearArena:false, nearRiver:false,")
s=s.replace("arena:{x:980,y:640,r:96},ritual", "arena:{x:980,y:640,r:96},river:{x:600,y:650,r:80},ritual")
# sendPosition use river floated as meditation flag; peers see 3D lying
s=s.replace("meditating:state.meditating===true});", "meditating:(state.scene==='river'?!!window.river3D?.isFloating?.():state.meditating===true)});")
# location update only when outside
s=s.replace("state.nearArena=state.scene==='temple'&&near3D(ZONES.arena,2.3);", "state.nearArena=state.scene==='temple'&&near3D(ZONES.arena,2.3);\n    state.nearRiver=state.scene==='temple'&&near3D(ZONES.river,2.5);")
s=s.replace("near=state.nearTree||state.nearSmash||state.nearArena||near3D", "near=state.nearTree||state.nearSmash||state.nearArena||state.nearRiver||near3D")
s=s.replace("state.lastNearArena!==state.nearArena){", "state.lastNearArena!==state.nearArena||state.lastNearRiver!==state.nearRiver){")
s=s.replace("state.lastNearArena=state.nearArena;updateAction()", "state.lastNearArena=state.nearArena;state.lastNearRiver=state.nearRiver;updateAction()")
# current render only reacts to temple and inside, new river chunk before 2d draw
s=s.replace("if(state.scene==='temple'){drawTemple();drawPeers();drawPlayer();sendPosition();window.courtyard3D?.sync", "if(state.scene==='temple'){drawTemple();drawPeers();drawPlayer();sendPosition();window.courtyard3D?.sync")
s=s.replace("}else drawRelease();requestAnimationFrame(render)}", "}else if(state.scene==='river'){const rp=window.river3D?.getNetworkPosition?.();if(rp){state.player.x=rp.x;state.player.y=rp.y;}sendPosition();window.river3D?.syncPeers?.([...peers.entries()].map(([id,p])=>({...p,id})));}else drawRelease();requestAnimationFrame(render)}")
# fallback canvas hidden while river active
s=s.replace("canvas.classList.toggle('scene-fallback-hidden',state.scene!=='release' && !!window.courtyard3D && !$('outside3d').classList.contains('hidden'));", "canvas.classList.toggle('scene-fallback-hidden',state.scene==='river' || (state.scene!=='release' && !!window.courtyard3D && !$('outside3d').classList.contains('hidden')));")
# action label
s=s.replace("state.nearArena?'💥 Đấu trường Deadline 3D':atDesk?", "state.nearArena?'💥 Đấu trường Deadline 3D':state.nearRiver?'🌊 Đến Thung Lũng Trôi Sông':atDesk?")
s=s.replace("const enabled=state.scene!=='release'&&state.near&&!state.locked;", "const enabled=state.scene!=='release'&&state.scene!=='river'&&state.near&&!state.locked;")
# create entrance handler after arena
s=s.replace("if(state.scene==='temple'&&state.nearArena){ playArena(); return; }", "if(state.scene==='temple'&&state.nearArena){ playArena(); return; }\n    if(state.scene==='temple'&&state.nearRiver){ enterRiver(); return; }")
# insert river state functions before interact
anchor="  function interact(){"
functions='''  function enterRiver(){
    if(arena.active)endArena();
    window.courtyard3D?.exit();window.temple3D?.exit();
    if(!window.river3D?.enter?.()){
      window.courtyard3D?.enter();toast('Không thể mở khu sông 3D trên thiết bị này.');return;
    }
    state.scene='river'; state.near=false;state.nearTree=false;state.nearArena=false;state.nearRiver=false;state.nearSmash=false;
    state.keys.clear();state.joyX=0;state.joyY=0;resetJoystick();syncShrineMusic();
    $('chapter').textContent='03 / THUNG LŨNG TRÔI SÔNG';
    $('sceneTitle').innerHTML='Thả mình trôi sông,<br>quay về điểm bắt đầu.';
    $('sceneSubtitle').textContent='Nằm theo dòng sông vòng tròn 3D, ngắm núi và quay lại bến sau mỗi vòng.';
    $('riverPanel').classList.remove('hidden');$('actionBtn').classList.add('hidden');
    $('mobileControls').classList.add('hidden');$('controlTip').classList.add('hidden');
    $('riverFloatBtn').textContent='🌊 Bắt đầu trôi'; $('riverFloatBtn').disabled=true;
    sendPosition(true);toast('🌊 Bạn đã đến Thung Lũng Trôi Sông 3D!');
  }
  function leaveRiver(){
    if(state.scene!=='river')return;
    window.river3D?.exit?.();state.scene='temple';
    state.player.x=600;state.player.y=650;
    state.keys.clear();state.joyX=0;state.joyY=0;resetJoystick();state.near=false;
    window.courtyard3D?.enter();syncShrineMusic();sendPosition(true);
    $('chapter').textContent='01 / KHU XẢ STRESS';
    $('sceneTitle').innerHTML='Xả bực, thư giãn,<br>và treo khẩu nghiệp.';
    $('sceneSubtitle').textContent='Bạn đã trở lại sân chính. Cổng Thung Lũng Trôi Sông luôn mở để bạn ghé lại.';
    $('riverPanel').classList.add('hidden');$('actionBtn').classList.remove('hidden');
    $('mobileControls').classList.remove('hidden');$('controlTip').classList.remove('hidden');
    updateAction();toast('Bạn đã quay lại khu xả stress.');
  }
  $('riverFloatBtn').addEventListener('click',()=>{
    if(state.scene!=='river')return;
    const ok=window.river3D?.toggle?.();if(!ok)toast('Đang tải địa hình hoặc tuyến sông, vui lòng thử lại.');
  });
  $('riverExitBtn').addEventListener('click',leaveRiver);
'''
s=s.replace(anchor, functions+anchor)
# no river scene input interference, Escape exits river
s=s.replace("if(e.key==='Escape'){for(const id", "if(e.key==='Escape'&&state.scene==='river'){leaveRiver();return;}if(e.key==='Escape'){for(const id")
# make loop use near for river not needed; ensure sendPosition sets no moving
s=s.replace("moving:(!state.meditating)&&(state.keys.size>0||Math.hypot(state.joyX,state.joyY)>.13)", "moving:(state.scene!=='river'&&!state.meditating)&&(state.keys.size>0||Math.hypot(state.joyX,state.joyY)>.13)")
p.write_text(s)

p=Path('/mnt/data/xastress67/index.html');s=p.read_text()
s=s.replace('<div id="outside3d" class="outside3d hidden"></div>', '<div id="outside3d" class="outside3d hidden"></div><div id="river3d" class="river3d hidden"></div>')
s=s.replace('<div id="arenaPanel"', '''<div id="riverPanel" class="river-panel hidden" aria-label="Điều khiển trôi sông">
      <strong>🌊 THUNG LŨNG TRÔI SÔNG</strong>
      <p id="riverStatus">Đang chuẩn bị bản đồ 3D...</p>
      <div class="river-stats">🌀 Vòng đã trôi: <b id="riverLaps">0</b> · Tuyến sông: <b id="riverProgress">0%</b></div>
      <div class="river-actions"><button id="riverFloatBtn" type="button" disabled>🌊 Bắt đầu trôi</button><button id="riverExitBtn" type="button">↶ Quay về sân chính</button></div>
      <small>Vuốt để xoay camera · Lăn chuột để thu/phóng · Sông tự nối vòng</small>
    </div>
    <div id="arenaPanel"''')
s=s.replace('<script src="game.js?v=6.5.1" defer></script>', '<script type="module" src="river3d.js?v=6.7.0"></script>\n  <script src="game.js?v=6.7.0" defer></script>')
s=s.replace('outside3d.js?v=6.5.1','outside3d.js?v=6.7.0').replace('inside3d.js?v=6.5.1','inside3d.js?v=6.7.0').replace('style.css?v=6.5.1','style.css?v=6.7.0').replace('v6.6</span>','v6.7</span>')
p.write_text(s)

p=Path('/mnt/data/xastress67/style.css');s=p.read_text()+'''
/* v6.7 — dedicated river scene and clear mobile controls */
.river3d{position:absolute;inset:0;z-index:2;overflow:hidden;background:#c5dce9;pointer-events:none;touch-action:none;cursor:grab}
.river3d canvas{display:block;width:100%;height:100%}
.river-panel{position:absolute;right:18px;bottom:75px;z-index:13;background:rgba(23,51,59,.88);backdrop-filter:blur(12px);border:1px solid #8bd0d8;border-radius:18px;padding:16px;max-width:min(380px,calc(100% - 32px));color:#fff4df;box-shadow:0 12px 40px #102e3c99}
.river-panel strong{font-size:14px;letter-spacing:.7px}.river-panel p{font-size:12px;line-height:1.5;color:#ebf7f3}.river-stats{font-size:12px;margin:10px 0 13px}
.river-actions{display:flex;gap:8px;flex-wrap:wrap}
.river-actions button{border:0;border-radius:10px;padding:12px 15px;background:#b9e9da;color:#143a37;font-weight:800;font-size:12px;flex:1}
.river-actions button:last-child{background:#f2dfb2;color:#4d3320}.river-actions button:disabled{opacity:.55}
.river-panel small{display:block;margin-top:12px;font-size:10px;color:#c4e1e4}
@media(max-width:700px){.river-panel{left:14px;right:14px;bottom:58px;max-width:none;padding:13px}.river-panel p{margin:8px 0}.river-actions button{font-size:11px;padding:11px 8px}.scene-caption:has(~.river-panel:not(.hidden)) p{display:none}}
'''
p.write_text(s)

p=Path('/mnt/data/xastress67/server.js');s=p.read_text().replace("app.get('/outside3d.js', (_,res)=>res.sendFile(path.join(__dirname,'outside3d.js')));","app.get('/outside3d.js', (_,res)=>res.sendFile(path.join(__dirname,'outside3d.js')));\napp.get('/river3d.js', (_,res)=>res.sendFile(path.join(__dirname,'river3d.js')));")
s=s.replace("['temple','inside','release'].includes(data.scene)","['temple','inside','release','river'].includes(data.scene)")
s=s.replace("Chùa Online Multiplayer: http://localhost:","Xả Stress Online Multiplayer: http://localhost:")
p.write_text(s)
