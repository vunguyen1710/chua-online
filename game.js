'use strict';
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  if (!ctx) { alert('Trình duyệt không hỗ trợ Canvas 2D.'); return; }
  const $ = id => document.getElementById(id);
  const W = 1200, H = 760;
  const state = { scene:'temple', keys:new Set(), player:{x:610,y:610,dir:0,steps:0}, time:0, near:false, locked:false, fishStart:-1, fishReleased:false, ritual:0, nearTree:false, hasLetter:false, blessing:'', joyX:0, joyY:0, particles:[], sound:false, last:0, count:0, virtue:0, meditating:false, meditateClock:0, nearMeditation:false, meditationSpot:null };
  try { state.count = Math.max(0, Number(localStorage.getItem('chuaonline_fish') || 0) || 0); } catch (_) {}
  $('fishCount').textContent = String(state.count);
  try { state.virtue = Math.max(0, Number(localStorage.getItem('chuaonline_virtue') || 0) || 0); } catch (_) {}
  $('virtueCount').textContent = String(state.virtue);
  // Real-time state; only character coordinates and public chat are synchronized.
  const peers = new Map();
  let socket = null, nickname = '', joined = false, lastSent = 0, lastChat = 0;
  let myBubble = null;
  let recentNotes=[], noteTotal=0, notePage=1, noteHasNext=false, readingNote=null;
  function updateTreeCount() { $('treeCount').textContent=String(noteTotal); }
  function readableDate(value) {const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('vi-VN');}
  async function loadNotes(page=1) {
    const list=$('noteList');list.textContent='Đang tải lời khẩu nghiệp...';
    try {
      const response=await fetch('/api/notes?page='+page+'&limit=12',{cache:'no-store'});
      if(!response.ok)throw Error('Máy chủ chưa sẵn sàng');
      const data=await response.json();notePage=page;noteTotal=data.total;noteHasNext=page*12<data.total;updateTreeCount();
      if(page===1)recentNotes=data.items.slice(0,12);
      list.replaceChildren();
      if(!data.items.length){list.textContent='Cây còn trống. Hãy là người đầu tiên treo lời khẩu nghiệp!';}
      for(const note of data.items){
        const b=document.createElement('button');b.type='button';b.className='note-card';
        const a=document.createElement('small');a.textContent='🍃 '+readableDate(note.createdAt);
        const name=document.createElement('b');name.textContent=note.author;
        const excerpt=document.createElement('span');excerpt.textContent=note.content;
        b.append(a,name,excerpt);b.addEventListener('click',()=>readNote(note));list.appendChild(b);
      }
      $('notesPage').textContent='Trang '+page;$('notesPrev').disabled=page<=1;$('notesNext').disabled=!noteHasNext;
    }catch(err){list.textContent='Không tải được Cây Khẩu Nghiệp. Vui lòng thử lại khi có mạng.';}
  }
  function showTree(){if(!joined)return;modal('treeModal',true);loadNotes(1)}
  function readNote(note){readingNote=note;modal('treeModal',false);$('readNoteAuthor').textContent='✍ '+note.author+' · '+readableDate(note.createdAt);$('readNoteContent').textContent=note.content;modal('readNoteModal',true)}
  $('treeOpenBtn').addEventListener('click',showTree);
  $('treeWriteBtn').addEventListener('click',()=>{modal('treeModal',false);modal('karmaWriteModal',true);$('karmaInput').focus()});
  canvas.addEventListener('click',event=>{
    if(state.scene!=='temple'||state.locked||!joined||!state.view)return;
    const r=canvas.getBoundingClientRect();const x=(event.clientX-r.left-state.view.offX)/state.view.scale;
    const y=(event.clientY-r.top-state.view.offY)/state.view.scale;
    if(x>78&&x<298&&y>240&&y<480)showTree();
  });
  $('notesPrev').addEventListener('click',()=>loadNotes(Math.max(1,notePage-1)));
  $('notesNext').addEventListener('click',()=>{if(noteHasNext)loadNotes(notePage+1)});
  $('backToTree').addEventListener('click',()=>{modal('readNoteModal',false);showTree()});
  fetch('/api/notes?page=1&limit=12',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d){recentNotes=d.items;noteTotal=d.total;updateTreeCount()}}).catch(()=>{});

  const safeName = s => String(s || '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0,18);
  function bubble(textValue, ts) { return { text: String(textValue).slice(0,100), until: (ts || performance.now()) + 6200 }; }
  function initMultiplayer() {
    if (typeof io === 'undefined') { $('connectionPill').textContent = 'Chưa kết nối máy chủ'; return; }
    socket = io({ transports: ['websocket','polling'], reconnection: true, reconnectionDelayMax: 4000 });
    socket.on('connect', () => { $('connectionPill').textContent='● Đã kết nối'; if(joined) socket.emit('join', {name:nickname}); });
    socket.on('disconnect', () => { $('connectionPill').textContent='○ Mất kết nối — đang thử lại'; peers.clear(); $('onlineCount').textContent='1'; });
    socket.on('players', data => { peers.clear(); for(const p of data.players || []) if(p.id !== socket.id) peers.set(p.id,{...p, bubble:null}); $('onlineCount').textContent=String(data.count || 1); });
    socket.on('playerJoined', p => { if(p.id!==socket.id) peers.set(p.id,{...p,bubble:null}); $('onlineCount').textContent=String(peers.size+1); });
    socket.on('playerLeft', id => { peers.delete(id); $('onlineCount').textContent=String(peers.size+1); });
    socket.on('playerMoved', p => { const peer=peers.get(p.id); if(peer) { peer.x=p.x;peer.y=p.y;peer.dir=p.dir;peer.scene=p.scene;peer.moving=p.moving;peer.meditating=p.meditating===true; } });
    socket.on('chat', data => { const item=bubble(data.text); if(data.id===socket.id) myBubble=item; else if(peers.has(data.id)) peers.get(data.id).bubble=item; });
    socket.on('notesRefresh',()=>loadNotes(1));
    socket.on('noteAdded', note => { recentNotes.unshift(note);recentNotes=recentNotes.slice(0,12);noteTotal++;updateTreeCount(); if(!document.getElementById('treeModal').classList.contains('hidden'))loadNotes(1); });
    socket.on('online', n => $('onlineCount').textContent=String(n));
    socket.on('serverError', msg => toast(String(msg).slice(0,100)));
  }
  function sendPosition(force=false) {
    if(!socket?.connected || !joined)return;
    const now=performance.now(); if(!force && now-lastSent<60)return;lastSent=now;
    socket.emit('move', {x:Math.round(state.player.x),y:Math.round(state.player.y),dir:state.player.dir,scene:state.scene,moving:(!state.meditating)&&(state.keys.size>0||Math.hypot(state.joyX,state.joyY)>.13),meditating:state.meditating===true});
  }
  function wrapBubble(value,x,y){
    const lines=[], words=value.split(/\s+/);let line='';
    for(const word of words){const candidate=line?line+' '+word:word;if(candidate.length>26&&line){lines.push(line);line=word;}else line=candidate; if(lines.length>=3)break;}
    if(line&&lines.length<3)lines.push(line);
    const width=220,height=lines.length*18+17;ctx.save();ctx.font='600 13px sans-serif';ctx.textAlign='center';
    rounded(x-width/2,y-height,width,height,10);ctx.fillStyle='#fff9e9';ctx.fill();ctx.strokeStyle='#bf945a';ctx.lineWidth=1.5;ctx.stroke();
    poly([[x-5,y],[x+7,y],[x,y+8]],'#fff9e9');lines.forEach((s,i)=>text(s,x,y-height+17+i*18,12,'#443522','center','sans-serif','600'));ctx.restore();
  }
  function drawPeers(){
    const list=[...peers.values()].filter(p=>p.scene===state.scene).sort((a,b)=>a.y-b.y);
    for(const p of list){
      const x=p.x,y=p.y;ctx.save();ctx.translate(x,y);
      ellipse(0,10,18,6,'#1c2a2777');const bounce=(p.moving&&!p.meditating)?Math.sin(state.time*.013+p.x)*2:0;
      ctx.translate(0,p.meditating?6:bounce);if(p.dir===-1)ctx.scale(-1,1);
      rounded(-17,-34,34,29,12);ctx.fillStyle=p.color||'#78a58f';ctx.fill();fill(-4,-33,8,18,'#efc27b');
      ellipse(0,-45,21,22,'#f0c296');ellipse(0,-59,21,11,'#343334');ellipse(-8,-45,2.5,3,'#302a26');ellipse(8,-45,2.5,3,'#302a26');ctx.strokeStyle='#6d4130';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,-40,4,0,Math.PI);ctx.stroke();
      if(p.meditating){ellipse(0,-8,26,7,'#84654b');} else {ellipse(-8,8,8,5,'#272e33');ellipse(8,8,8,5,'#272e33');}
      ctx.restore();
      rounded(x-51,y+16,102,22,9);ctx.fillStyle='#20322cdd';ctx.fill();text(p.name||'Khách',x,y+27,12,'#fff1c9','center','sans-serif','700');
      if(p.bubble&&p.bubble.until>performance.now())wrapBubble(p.bubble.text,x,y-78);
    }
    if(myBubble?.until>performance.now())wrapBubble(myBubble.text,state.player.x,state.player.y-102);
    if(joined) {rounded(state.player.x-45,state.player.y+16,90,21,9);ctx.fillStyle='#624728e8';ctx.fill();text(nickname,state.player.x,state.player.y+27,11,'#fff1c9','center','sans-serif','700');}
  }
  function startJoin() {
    const n=safeName($('nameInput').value);if(n.length<2){toast('Tên cần ít nhất 2 ký tự');return;}
    nickname=n;joined=true;state.locked=false;$('joinModal').classList.add('hidden');
    try{localStorage.setItem('chuaonline_name',n)}catch(_){}
    if(socket?.connected)socket.emit('join',{name:n});sendPosition(true);
    toast('Chào mừng '+n+'! Hãy thử trò chuyện với mọi người 💬');
  }
  $('joinBtn').addEventListener('click',startJoin);
  $('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();startJoin()}});
  try{$('nameInput').value=localStorage.getItem('chuaonline_name')||''}catch(_){}
  $('chatForm').addEventListener('submit',e=>{
    e.preventDefault();const input=$('chatInput'),msg=input.value.trim();
    if(!msg||!joined)return;
    if(state.scene==='release'){toast('Hãy quay lại chùa để trò chuyện');return;}
    if(performance.now()-lastChat<1100){toast('Gửi tin nhắn chậm lại một chút nhé');return;}
    lastChat=performance.now();if(socket?.connected){socket.emit('chat',{text:msg});myBubble=bubble(msg);}else toast('Chưa kết nối máy chủ');
    input.value='';input.blur();
  });
  initMultiplayer();
  const blessings = [
    'Mong những chuyện làm bạn phiền hôm nay sẽ nhỏ đi, còn niềm vui ngày mai sẽ lớn lên.',
    'Không phải chuyện gì cũng cần đáp trả. Đôi khi, bình yên là câu trả lời ngầu nhất.',
    'Xin chúc bạn bớt gặp người vô tri, thêm gặp người tinh tế và luôn có món ngon đúng lúc.',
    'Một lời nhẹ nhàng cho chính mình: hôm nay bạn đã cố gắng đủ nhiều rồi.',
    'Mong bạn sớm nhận được tin vui, ngủ ngon không nghĩ ngợi, thức dậy không báo thức.',
    'Cho cơn bực bội trôi đi; giữ lại một chiếc bụng no và một trái tim vui.',
    'Ngày mai hy vọng mọi việc xuôi chèo mát mái, Wi-Fi căng đét và người thương trả lời tin nhắn.',
    'Tâm nhẹ như mây, vận may như gió. Đừng để một chuyện nhỏ chiếm cả ngày vui.',
    'Chúc bạn không còn phải tranh luận với những điều khiến mình mệt; hãy dành sức cho niềm vui.',
    'Hôm nay gửi muộn phiền vào gió, ngày mai đón bình an vào nhà.'
  ];
  const rand = (a,b)=> a+Math.random()*(b-a);
const MEDITATION_SPOTS = [{x:450,y:620},{x:600,y:620},{x:750,y:620},{x:525,y:560},{x:675,y:560}];
  function nearestMeditationSpot(){
    if(state.scene!=='inside') return null;
    for(const spot of MEDITATION_SPOTS){ if(Math.hypot(state.player.x-spot.x,state.player.y-spot.y)<70) return spot; }
    return null;
  }
  function setVirtue(value){ state.virtue=Math.max(0,Math.floor(value)); $('virtueCount').textContent=String(state.virtue); try{localStorage.setItem('chuaonline_virtue',String(state.virtue))}catch(_){} }
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  let audioCtx;
  function tone(freq=660,duration=.17,vol=.05){if(!state.sound)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.67,audioCtx.currentTime+duration);g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){}}
  const rounded = (x,y,w,h,r=12)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
  function fill(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
  function poly(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath();ctx.fill()}
  function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
  function strokeEllipse(x,y,rx,ry,color,width=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
  function text(s,x,y,size=16,color='#fff',align='center',family='Georgia',weight='700'){ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px ${family}`;ctx.fillStyle=color;ctx.fillText(s,x,y)}
  function seedRand(i){let a=Math.sin(i*127.1+78.233)*43758.5453;return a-Math.floor(a)}
  function leaf(x,y,sz=1,phase=0){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(state.time*.0007+phase)*.07);ellipse(-9*sz,0,15*sz,7*sz,'#355d3a');ellipse(12*sz,-5*sz,19*sz,9*sz,'#477548');ellipse(0,-18*sz,14*sz,19*sz,'#4f854b');ellipse(-15*sz,-19*sz,13*sz,11*sz,'#376940');ellipse(17*sz,-24*sz,14*sz,13*sz,'#5f8a46');ctx.restore()}
  function tree(x,y,s=1){ellipse(x+5*s,y+15*s,55*s,19*s,'#273b2b4d');fill(x-7*s,y-60*s,14*s,74*s,'#5e442e');for(let i=0;i<8;i++)leaf(x+Math.sin(i*2.3)*33*s,y-85*s+Math.cos(i*3.1)*26*s,1.1*s,i)}
  function lantern(x,y,scale=1){ctx.save();ctx.translate(x,y+Math.sin(state.time*.002+x)*3);ctx.scale(scale,scale);fill(-1,-36,2,20,'#a98344');ellipse(0,0,15,22,'#a63d28');fill(-13,-3,26,5,'#d67232');fill(-8,-22,16,4,'#f0c675');fill(-8,21,16,4,'#f0c675');fill(-2,25,4,13,'#d8a45c');ellipse(0,0,6,13,'#eaa66a88');ctx.restore()}
  function roof(x,y,w,h){poly([[x-38,y+h],[x+30,y+8],[x+w/2,y-10],[x+w-30,y+8],[x+w+38,y+h],[x+w+3,y+h-3],[x+w/2,y+17],[x-3,y+h-3]],'#403d3c');poly([[x-24,y+h-9],[x+36,y+11],[x+w/2,y-4],[x+w-36,y+11],[x+w+24,y+h-9]],'#42565b');for(let i=0;i<11;i++){const xx=x+i*w/10;poly([[xx-2,y+h-14],[xx+7,y+h-14],[x+w/2+(xx-(x+w/2))*.75,y+14]],'#273b4780')}fill(x-44,y+h-4,w+88,9,'#332d2b');fill(x-44,y+h-7,w+88,3,'#d4a558')}
  function temple(){
    // Building shade and raised platform
    ellipse(600,344,285,42,'#2431274a');rounded(338,298,525,83,10);ctx.fillStyle='#b9a07a';ctx.fill();fill(352,328,497,38,'#cab996');for(let i=0;i<7;i++)fill(355+i*74,359,69,5,'#a48960');
    fill(384,177,433,147,'#9c613c');fill(403,175,395,142,'#b37446');fill(400,214,396,10,'#5d3425');
    // pillars
    for(const x of [414,501,695,782]){fill(x-10,196,20,129,'#5e3527');fill(x-12,196,24,9,'#e9b773');fill(x-12,306,24,10,'#e9b773')}
    fill(526,215,148,110,'#402e28');fill(538,226,124,99,'#6a4431');fill(599,227,4,97,'#34241e');for(let i=0;i<4;i++){fill(546+i*28,235,4,78,'#a67d52')}
    fill(440,229,55,72,'#e9c17c');fill(704,229,55,72,'#e9c17c');for(const x of [445,709])for(let i=0;i<3;i++)fill(x+i*15,229,4,74,'#956744');
    roof(369,116,464,91);
    rounded(527,189,145,35,4);ctx.fillStyle='#5c3328';ctx.fill();ctx.strokeStyle='#e1ad59';ctx.lineWidth=3;ctx.stroke();text('TÂM AN ĐIỆN',600,206,18,'#f8d48a');
    // stairs
    for(let i=0;i<3;i++){fill(508-i*19,327+i*18,184+i*38,19,i%2?'#c8ae8c':'#d6bea0')}
    lantern(393,248,.72);lantern(807,248,.72);
  }
  function lotus(x,y,s=1){ctx.save();ctx.translate(x,y+Math.sin(state.time*.0015+x)*2);ctx.scale(s,s);ellipse(0,10,20,7,'#35775f');for(let i=0;i<7;i++){ctx.save();ctx.rotate(i*Math.PI*2/7);ellipse(0,-8,6,14,i%2?'#eb9ba6':'#f6c3b0');ctx.restore()}ellipse(0,0,5,5,'#ebcc77');ctx.restore()}
  function pond(x,y,rx,ry){ellipse(x,y+8,rx+15,ry+13,'#b4a57a');ellipse(x,y,rx+7,ry+7,'#d5bd89');ellipse(x,y,rx,ry,'#316d76');ellipse(x-20,y-13,rx*.8,ry*.65,'#3d8990');for(let i=0;i<5;i++){let px=x+(seedRand(i+500)-.5)*rx*1.55,py=y+(seedRand(i+510)-.5)*ry*1.1;strokeEllipse(px,py,14+Math.sin(state.time*.002+i)*3,4,'#9bd6c26b',2)}for(let i=0;i<5;i++){const xx=x+(seedRand(i+300)-.5)*rx*1.6, yy=y+(seedRand(i+350)-.5)*ry*1.25;ellipse(xx+10,yy,19,11,'#478b66');lotus(xx,yy-2,.65)} }
  function shrineDesk(){const x=926,y=493;ellipse(x+4,y+23,94,28,'#24312573');fill(x-63,y-16,12,43,'#593c2a');fill(x+49,y-16,12,43,'#593c2a');rounded(x-77,y-25,154,28,5);ctx.fillStyle='#8c5634';ctx.fill();fill(x-70,y-23,140,8,'#c08a53');fill(x-35,y-37,70,18,'#e6d5a5');fill(x-35,y-41,70,5,'#fdf0c8');fill(x-7,y-49,16,11,'#af543c');text('✦',x,-20+y,17,'#f7d48c');if(state.near&&state.ritual===0&&!state.locked&&state.scene==='temple'){ctx.globalAlpha=.5+.4*Math.sin(state.time*.005);strokeEllipse(x,y-8,104,45,'#f8d693',3);ctx.globalAlpha=1}rounded(x-70,y+35,140,29,6);ctx.fillStyle='#f9e6ba';ctx.fill();text('SỚ CẦU AN',x,y+49,13,'#68452c','center','sans-serif')}

  function drawKarmaTree(){
    // Trees and clickable golden parchment hang in a fixed world coordinate area.
    const x=190,y=418;
    ctx.save();
    ellipse(x+6,y+27,94,21,'#263b2e55');
    fill(x-13,y-94,25,116,'#604229');
    for(let i=0;i<13;i++)leaf(x+Math.sin(i*2.1)*68,y-122+Math.cos(i*2.5)*31,1.55,i);
    const count=Math.min(9,recentNotes.length);
    for(let i=0;i<count;i++){
      const a=(i%5-2)*30, b=Math.floor(i/5)*30;
      const px=x+a, py=y-123+b+Math.sin(state.time*.002+i)*3;
      ctx.strokeStyle='#fce4b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px,py-20);ctx.lineTo(px,py-4);ctx.stroke();
      rounded(px-11,py-4,22,30,3);ctx.fillStyle='#f4d38b';ctx.fill();
      ctx.strokeStyle='#9c622f';ctx.lineWidth=1;ctx.stroke();
      text('✦',px,py+10,11,'#8c4b25');
    }
    rounded(x-86,y+32,172,30,7);ctx.fillStyle='#f6e8c8';ctx.fill();
    text('🌳 CÂY KHẨU NGHIỆP',x,y+48,13,'#64452a','center','sans-serif');
    if(state.nearTree){ctx.globalAlpha=.65+.3*Math.sin(state.time*.004);strokeEllipse(x,y+12,108,29,'#ffd78a',3);ctx.globalAlpha=1}
    ctx.restore();
  }
  function stones(){for(let i=0;i<15;i++){const row=Math.floor(i/3),col=i%3;let x=505+col*91+(row%2)*12,y=371+row*82;ctx.save();ctx.translate(x,y);ctx.rotate((seedRand(i)-.5)*.3);rounded(-39,-24,78,46,9);ctx.fillStyle=i%3?'#b3ad94':'#c1baa4';ctx.fill();ctx.strokeStyle='#e9dfbb75';ctx.lineWidth=2;ctx.stroke();ctx.restore()}}
  function drawTemple(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#8e9f8f');sky.addColorStop(.38,'#c5b893');sky.addColorStop(.39,'#66826b');sky.addColorStop(1,'#678868');fill(0,0,W,H,sky);
    ellipse(990,112,175,76,'#ffe6a930');for(let i=0;i<14;i++)ellipse(seedRand(i+9)*W,170+seedRand(i+100)*90,135,38,i%2?'#55735b':'#73836a');
    fill(0,310,W,H-310,'#819478');for(let i=0;i<230;i++){const x=seedRand(i+250)*W,y=310+seedRand(i+490)*(H-310);ellipse(x,y,seedRand(i+920)*3+1,1.5,i%2?'#657b59':'#a0aa7a')}
    // wall and surrounding trees
    fill(0,292,W,40,'#ab9e7a');for(let i=0;i<31;i++){fill(i*40,289,34,4,'#d7c29b');fill(i*40,314,34,3,'#827861')}
    tree(78,330,1.12);tree(1116,335,1.2);tree(175,240,.74);tree(1034,236,.77);
    // path and temple
    poly([[490,350],[710,350],[862,760],[338,760]],'#9f987f');poly([[505,351],[695,351],[828,760],[372,760]],'#aaa68c');stones();temple();
    // ground props
    for(let i=0;i<8;i++){const x=75+i*139,y=430+Math.cos(i*3)*20;ellipse(x,y,24,7,'#46694765');leaf(x,y,.57,i)}
    pond(232,531,192,113);tree(50,580,.78);tree(1115,560,.86);
    shrineDesk();drawKarmaTree();lantern(831,436,.8);lantern(1080,420,.8);
    if(state.ritual>=1){ctx.save();ctx.globalAlpha=.65+.25*Math.sin(state.time*.004);strokeEllipse(600,393,64,23,'#fbe5a5',4);ctx.restore();rounded(536,389,128,30,8);ctx.fillStyle='#f6e7c1';ctx.fill();text('CỬA VÀO ĐIỆN',600,404,13,'#624328','center','sans-serif')}
    // tiny drifting petals
    for(let i=0;i<15;i++){const x=(seedRand(i+33)*W+state.time*.011*(i%3+1))%(W+100)-50;const y=(seedRand(i+88)*480+state.time*.01*(i%2+1))%(H+50);ellipse(x,y,3,2,'#fae0b28f')}
  }
  // Background nội điện: ảnh Quan Thế Âm Bồ Tát 16:9, phủ toàn canvas game.
  // Giữ tọa độ logic 1200×760 để người chơi và Socket.IO không bị lệch.
  const insideBg = new Image();
  insideBg.src = '/assets/dien-quan-am.png';
  let insideBgReady = false;
  insideBg.onload = () => { insideBgReady = true; };
  insideBg.onerror = () => { insideBgReady = false; };
  function drawInside(){
    if (insideBgReady) {
      // Scale kiểu cover: giữ tỷ lệ tự nhiên, crop nhẹ hai bên thay vì kéo méo ảnh.
      const sw=insideBg.naturalWidth, sh=insideBg.naturalHeight;
      const k=Math.max(W/sw,H/sh), dw=sw*k, dh=sh*k;
      ctx.drawImage(insideBg,(W-dw)/2,(H-dh)/2,dw,dh);
    } else {
      const g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#462419');g.addColorStop(1,'#b77b4b');
      fill(0,0,W,H,g);
      text('ĐIỆN QUAN THẾ ÂM BỒ TÁT',600,210,26,'#ffe2a8');
    }
    // Đánh dấu điểm dâng sớ trên nền sân gạch phía trước hương án.
    if(state.ritual===1){
      ctx.save();
      ctx.globalAlpha=.5+.25*Math.sin(state.time*.004);
      strokeEllipse(600,664,87,21,'#ffe2a0',4);
      ctx.restore();
      rounded(514,590,172,30,8);
      ctx.fillStyle='#3e251cdb';ctx.fill();
      text('✦  DÂNG SỚ / THẮP HƯƠNG',600,605,13,'#ffe7ac','center','sans-serif');
    }
    // Khói hương nổi bật khi đã thực hiện nghi thức.
    if(state.ritual>=2){
      for(let i=0;i<4;i++){
        const t=(state.time*.022+i*41)%110;
        ctx.save();ctx.globalAlpha=(1-t/110)*.33;
        ellipse(600+Math.sin(t*.065+i)*16,410-t,5+t*.14,10+t*.1,'#fff5e7');
        ctx.restore();
      }
    }
  }
  function drawPlayer(){const p=state.player,moving=(state.keys.size>0||Math.hypot(state.joyX,state.joyY)>.13)&&!state.locked&&!state.meditating,step=moving?Math.sin(p.steps*10)*3:Math.sin(state.time*.0015)*1;ctx.save();ctx.translate(p.x,p.y);ellipse(0,11,19,7,'#182b2e77');if(state.meditating){ctx.translate(0,8);}else{ctx.translate(0,step*.4);}
    const flip=p.dir===-1; if(flip)ctx.scale(-1,1);
    // cute simple body: no arms, no detailed limbs
    rounded(-19,-35,38,34,15);ctx.fillStyle='#d69559';ctx.fill();
    fill(-5,-34,10,20,'#efc27b');
    ellipse(0,-48,21,20,'#f4c69d');ellipse(0,-61,22,11,'#343334');ellipse(-10,-49,2.2,2.8,'#302a26');ellipse(10,-49,2.2,2.8,'#302a26');ctx.strokeStyle='#6d4130';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-43,4,0,Math.PI);ctx.stroke();ellipse(-10,-43,3.5,2,'#e99983');ellipse(10,-43,3.5,2,'#e99983');
    if(state.meditating){ellipse(0,-8,28,7,'#84654b');} else {ellipse(-8,8,8,5,'#272e33');ellipse(8,8,8,5,'#272e33');}
    ctx.restore();
    if(state.near&&!state.locked){rounded(p.x-84,p.y-104,168,28,9);ctx.fillStyle='#fbefd5';ctx.fill();
      const hint=state.meditating?'E  Đứng dậy khỏi đệm thiền':state.nearMeditation?'E  Ngồi thiền (+1 tích đức/giây)':state.scene==='inside'?'E  Dâng sớ':state.nearTree?'E  Cây khẩu nghiệp':Math.hypot(p.x-926,p.y-493)<117?'E  Viết sớ':'E  Vào điện';
      text(hint,p.x,p.y-90,12,'#5f452d','center','sans-serif')}
  }
  function drawCarp(x,y,size=1,dir=1,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(size*dir,size);ctx.rotate(Math.sin(state.time*.012)*.07);ctx.fillStyle='#e3a43c';poly([[-21,0],[-43,-15],[-37,0],[-43,15]],'#d78a32');ellipse(0,0,25,13,'#f4b850');ellipse(6,-5,15,5,'#ffdf8c7c');poly([[-8,-7],[-12,-19],[6,-12]],'#ffdf8c');ellipse(17,-3,2.5,2.5,'#3f3530');ellipse(20,2,3,2,'#f9d88e');ctx.restore()}
  function drawRelease(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#273f53');g.addColorStop(.4,'#799b9b');g.addColorStop(.62,'#ceb78f');g.addColorStop(.63,'#37788b');g.addColorStop(1,'#1b5365');fill(0,0,W,H,g);ellipse(952,164,90,90,'#f8dc9f33');ellipse(952,164,48,48,'#ffe3ac');
    poly([[0,440],[0,266],[105,326],[238,212],[393,380],[518,271],[710,412],[844,270],[1040,400],[1200,310],[1200,440]],'#466676');poly([[0,459],[0,390],[145,350],[315,425],[483,352],[610,412],[752,363],[990,438],[1200,356],[1200,459]],'#557b7b');
    poly([[0,458],[190,435],[270,446],[460,420],[630,463],[805,430],[990,445],[1200,421],[1200,760],[0,760]],'#2e7687');for(let i=0;i<45;i++){const y=470+i*7.9,x=((seedRand(i+550)*W+state.time*.008*(i%4+1))%(W+130))-50;ellipse(x,y,30+seedRand(i)*50,1,'#b1ddd549')}
    // near shore and lily pads
    poly([[0,610],[72,592],[143,628],[191,690],[282,760],[0,760]],'#7d8661');poly([[1010,760],[1080,684],[1173,651],[1200,650],[1200,760]],'#5b795f');for(let i=0;i<8;i++){const x=130+i*139, y=550+seedRand(i+800)*110;ellipse(x,y,20,10,'#477e68');if(i%2===0)lotus(x,y-5,.75)}
    for(let i=0;i<9;i++){const x=50+i*150,y=510+seedRand(i+770)*60;drawCarp(x+Math.sin(state.time*.001+i)*18,y+Math.sin(state.time*.002+i)*7,.4,i%2?1:-1,.3)}
    const elapsed=(state.time-state.fishStart)/1000;
    if(state.fishReleased&&elapsed>=0){const progress=clamp(elapsed/5.8,0,1);const x=220+progress*830,y=555+Math.sin(progress*11)*31+progress*38;drawCarp(x,y,1.1-progress*.5,1,1-progress*.35);for(let i=0;i<4;i++)strokeEllipse(206+progress*830,555+progress*40,Math.max(0,(elapsed-i*.25)*10),Math.max(0,(elapsed-i*.25)*2),'#d1e8cf55',1.4)}else if(!state.fishReleased){drawCarp(201,552,1.1,1)}
    // animated reeds
    for(let i=0;i<16;i++){const x=i*15-14;ctx.strokeStyle=i%2?'#4b6b49':'#76925d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,760);ctx.quadraticCurveTo(x+15+Math.sin(state.time*.001+i)*10,708,x+8,680-seedRand(i)*50);ctx.stroke()}
  }
  function render(ms){const dt=Math.min((ms-state.last||16)/1000,.045);state.last=ms;state.time=ms;
    if((state.scene==='temple'||state.scene==='inside')&&!state.locked&&joined){let dx=state.joyX,dy=state.joyY;for(const k of state.keys){if(k==='arrowup'||k==='w')dy--;if(k==='arrowdown'||k==='s')dy++;if(k==='arrowleft'||k==='a')dx--;if(k==='arrowright'||k==='d')dx++}
    if(state.meditating && (dx||dy)){state.meditating=false;state.meditateClock=0;toast('Bạn đã đứng dậy khỏi đệm thiền.');updateAction();sendPosition(true);}
    if(!state.meditating && (dx||dy)){const n=Math.max(1,Math.hypot(dx,dy)),oldX=state.player.x,oldY=state.player.y;dx/=n;dy/=n;state.player.x=clamp(oldX+dx*210*dt,37,1163);state.player.y=clamp(oldY+dy*210*dt,state.scene==='temple'?390:440,721);state.player.steps+=dt*2.8;if(Math.abs(dx)>.1)state.player.dir=dx>0?1:-1}
    if(state.scene==='inside' && state.meditating){state.meditateClock+=dt; if(state.meditateClock>=1){const gain=Math.floor(state.meditateClock); state.meditateClock-=gain; setVirtue(state.virtue+gain); window.temple3D?.virtueGain(gain);}}
    let near=false;
    state.nearTree=state.scene==='temple'&&Math.hypot(state.player.x-190,state.player.y-442)<145;
    state.meditationSpot=nearestMeditationSpot(); state.nearMeditation=!!state.meditationSpot || state.meditating;
    if(state.scene==='temple') near=state.nearTree||Math.hypot(state.player.x-926,state.player.y-493)<117||state.ritual===1&&Math.hypot(state.player.x-600,state.player.y-401)<90;
    else near=state.meditating||!!state.meditationSpot||(state.ritual===1&&Math.hypot(state.player.x-600,state.player.y-460)<105);
    if(near!==state.near||state.lastNearTree!==state.nearTree||state.lastNearMeditation!==state.nearMeditation){state.near=near;state.lastNearTree=state.nearTree;state.lastNearMeditation=state.nearMeditation;updateAction()}}
    // Responsive camera: preserve world coordinates (1200×760) for Socket.IO.
    // Keep the player in the usable center area above the mobile joystick/chat.
    const bounds=canvas.getBoundingClientRect();
    const vw=Math.max(1,bounds.width),vh=Math.max(1,bounds.height),dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(vw*dpr)||canvas.height!==Math.round(vh*dpr)){
      canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);
    }
    const portrait=vw<=680&&vh>vw;
    const scale=portrait?Math.max(vw/610,vh/835):Math.max(vw/W,vh/H);
    // Game world can extend past the viewport; follow character on both axes.
    const offX=vw<W*scale?clamp(vw*.5-state.player.x*scale,vw-W*scale,0):(vw-W*scale)/2;
    const offY=portrait?Math.min(36,vh*.55-state.player.y*scale):(vh-H*scale)/2;
    // Fill any extra space with floor/sky tones, without exposing blank canvas.
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle=state.scene==='release'?'#194759':state.scene==='inside'?'#a66d48':'#6a795c';
    ctx.fillRect(0,0,vw,vh);
    state.view={scale,offX,offY};
    ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*offX,dpr*offY);
    if(state.scene==='temple'){drawTemple();drawPeers();drawPlayer();sendPosition()}else if(state.scene==='inside'){drawInside();drawPeers();drawPlayer();sendPosition();window.temple3D?.sync({player:{...state.player,meditating:state.meditating},others:[...peers.entries()].map(([id,p])=>({...p,id,chat:p.bubble?.until>performance.now()?p.bubble.text:''})),name:nickname,bubble:myBubble?.until>performance.now()?myBubble.text:''})}else drawRelease();requestAnimationFrame(render)}
  function updateAction(){const enabled=state.scene!=='release'&&state.near&&!state.locked;$('actionBtn').disabled=!enabled;const atDesk=state.scene==='temple'&&Math.hypot(state.player.x-926,state.player.y-493)<117;const atDoor=state.scene==='temple'&&Math.hypot(state.player.x-600,state.player.y-401)<90;$('actionLabel').textContent=state.meditating?'🪷 Đứng dậy khỏi đệm thiền':state.nearMeditation?'🧘 Ngồi thiền (+1 tích đức/giây)':state.nearTree?'🌳 Cây Khẩu Nghiệp':atDesk?'📜 Viết sớ cầu an':atDoor&&state.ritual===1?'Vào Điện Quan Âm':state.scene==='inside'?'📜 Dâng sớ 3D':state.ritual===1?'Đến cửa điện dâng sớ':'Chọn viết sớ hoặc Cây Khẩu Nghiệp'}
  function modal(id,show){$(id).classList.toggle('hidden',!show);state.locked=show;state.keys.clear();state.joyX=0;state.joyY=0;resetJoystick();updateAction()}
  let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800)}
  function interact(){if(!state.near||state.locked||!joined)return;
    if(state.scene==='temple'&&state.nearTree){showTree();return;}
    if(state.scene==='temple'&&Math.hypot(state.player.x-926,state.player.y-493)<117){if(state.ritual!==0){toast('Bạn đã có sớ cầu an, hãy đến cửa điện chính.');return;}modal('letterModal',true);$('prayerInput').focus();tone(660);return;}
    if(state.scene==='temple'&&state.ritual===1&&Math.hypot(state.player.x-600,state.player.y-401)<90){state.scene='inside';state.player.x=600;state.player.y=713;window.temple3D?.enter();state.near=false;sendPosition(true);$('chapter').textContent='02 / BÊN TRONG ĐIỆN';$('sceneTitle').innerHTML='Dâng sớ thành tâm,<br>thắp hương bình an.';$('sceneSubtitle').textContent='Đến hương án để dâng sớ, hoặc ngồi lên đệm thiền để tích đức. Vuốt màn hình để xoay góc nhìn 3D.';updateAction();tone(660);return;}
    if(state.scene==='inside'&&state.meditating){state.meditating=false;state.meditateClock=0;toast('Bạn đã đứng dậy khỏi đệm thiền.');updateAction();sendPosition(true);tone(500,.2);return;}
    if(state.scene==='inside'&&state.meditationSpot){state.meditating=true;state.meditateClock=0;state.player.x=state.meditationSpot.x;state.player.y=state.meditationSpot.y;toast('🪷 Bạn đang ngồi thiền... mỗi giây cộng 1 tích đức. Vuốt để xoay góc nhìn.');updateAction();sendPosition(true);tone(560,.25);return;}
    if(state.scene==='inside'&&state.ritual===1&&Math.hypot(state.player.x-600,state.player.y-460)<105){modal('offeringModal',true);tone(720)}
  }
  $('actionBtn').addEventListener('click',interact);
  $('helpBtn').addEventListener('click',()=>modal('helpModal',true));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>modal(b.dataset.close,false)));
  $('prayerInput').addEventListener('input',()=>{$('prayerCharCount').textContent=$('prayerInput').value.length+'/400'});
  $('submitPrayerBtn').addEventListener('click',()=>{
    const prayer=$('prayerInput').value.trim();if(prayer.length<3){toast('Hãy viết ít nhất 3 ký tự cho sớ cầu an nhé.');return;}
    state.hasLetter=true;state.ritual=1;state.blessing=blessings[Math.floor(Math.random()*blessings.length)];
    modal('letterModal',false);$('sceneSubtitle').textContent='Sớ cầu an đã được niêm. Hãy mang sớ vào điện dâng hương.';
    updateAction();toast('📜 Đã niêm sớ cầu an! Hãy đến cửa điện chính.');tone(880,.3);
  });
  $('karmaInput').addEventListener('input',()=>{$('charCount').textContent=$('karmaInput').value.length+'/400'});
  $('submitBtn').addEventListener('click',async()=>{
    const content=$('karmaInput').value.trim();if(content.length<3){toast('Nhập ít nhất 3 ký tự cho lời khẩu nghiệp nhé ✍');return;}
    const button=$('submitBtn');button.disabled=true;button.textContent='Đang treo lời lên cây...';
    try {
      const res=await fetch('/api/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:nickname,content})});
      const data=await res.json();if(!res.ok)throw Error(data.error||'Không thể lưu lời khẩu nghiệp');
      $('karmaInput').value='';$('charCount').textContent='0/400';modal('karmaWriteModal',false);
      toast('🍃 Đã treo lời khẩu nghiệp! Ai cũng có thể bấm đọc.');tone(880,.3);
      showTree();
    }catch(err){toast(err.message||'Không thể lưu lời khẩu nghiệp. Thử lại sau.');}
    finally{button.disabled=false;button.textContent='🍃 Treo lời khẩu nghiệp lên cây';}
  });
  $('offerBtn').addEventListener('click',()=>{if(state.scene!=='inside'||state.ritual!==1)return;state.ritual=2;modal('offeringModal',false);modal('incenseModal',true);tone(640,.3)});
  $('incenseBtn').addEventListener('click',()=>{if(state.scene!=='inside'||state.ritual!==2)return;state.ritual=3;modal('incenseModal',false);$('blessingText').textContent='“'+state.blessing+'”';modal('blessingModal',true);tone(880,.3);setTimeout(()=>tone(1046,.4),240)});
  $('releaseBtn').addEventListener('click',()=>{if(state.ritual!==3)return;modal('blessingModal',false);state.scene='release';window.temple3D?.exit();state.ritual=4;state.meditating=false;state.meditateClock=0;sendPosition(true);state.fishStart=-1;state.fishReleased=false;$('chapter').textContent='02 / HỒ SEN';$('sceneTitle').innerHTML='Thả muộn phiền,<br>giữ bình an.';$('sceneSubtitle').textContent='Một chú cá vàng đang chờ được về với làn nước.';$('releasePanel').classList.remove('hidden');$('dropFishBtn').classList.remove('hidden');$('againBtn').classList.add('hidden');$('releaseStatus').textContent='Một chú cá vàng đang đợi bạn...';$('releaseNote').textContent='Nhấn nút để xem chú cá bơi tự do dưới làn nước.';$('actionBtn').classList.add('hidden');$('controlTip').classList.add('hidden');$('mobileControls').classList.add('hidden');tone(523,.25)});
  $('dropFishBtn').addEventListener('click',()=>{if(state.fishReleased)return;state.fishReleased=true;state.fishStart=performance.now();state.count++;$('fishCount').textContent=String(state.count);try{localStorage.setItem('chuaonline_fish',String(state.count))}catch(_){}$('dropFishBtn').classList.add('hidden');$('releaseStatus').textContent='Cá vàng đã trở về hồ ✨';$('releaseNote').textContent='Mong điều vui đến gần, điều buồn trôi xa. Cá đang bơi trong hồ!';$('againBtn').classList.remove('hidden');tone(784,.35);setTimeout(()=>tone(1046,.4),240)});
  $('againBtn').addEventListener('click',()=>{state.scene='temple';window.temple3D?.exit();sendPosition(true);state.player={x:610,y:610,dir:0,steps:0};state.keys.clear();state.joyX=0;state.joyY=0;resetJoystick();state.near=false;state.locked=false;state.ritual=0;state.hasLetter=false;state.blessing='';state.meditating=false;state.meditateClock=0;state.nearMeditation=false;state.meditationSpot=null;$('chapter').textContent='01 / SÂN CHÙA';$('sceneTitle').innerHTML='Viết sớ cầu an,<br>hoặc treo khẩu nghiệp.';$('sceneSubtitle').textContent='Hai hoạt động riêng: viết sớ cầu an hoặc treo lời khẩu nghiệp.';$('releasePanel').classList.add('hidden');$('actionBtn').classList.remove('hidden');$('controlTip').classList.remove('hidden');$('mobileControls').classList.remove('hidden');$('prayerInput').value='';$('prayerCharCount').textContent='0/400';updateAction()});
  const fullscreenBtn=$('fullscreenBtn');
  fullscreenBtn?.addEventListener('click', async()=>{
    try {
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('Bạn có thể dùng tính năng Thêm vào màn hình chính để chơi rộng hơn.');
    } catch(_){toast('Trình duyệt chưa cho phép chế độ toàn màn hình.');}
  });
  document.addEventListener('fullscreenchange',()=>{
    if(fullscreenBtn) fullscreenBtn.title=document.fullscreenElement?'Thoát toàn màn hình':'Toàn màn hình';
  });
  $('soundBtn').addEventListener('click',()=>{state.sound=!state.sound;$('soundBtn').textContent=state.sound?'♫':'♪';$('soundBtn').title=state.sound?'Tắt âm thanh':'Bật âm thanh';tone(740,.24);toast(state.sound?'Đã bật âm thanh ✨':'Đã tắt âm thanh')});
  document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(document.activeElement=== $('karmaInput')||document.activeElement=== $('prayerInput')||document.activeElement===$('chatInput')||document.activeElement===$('nameInput'))return;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();if(e.key==='Escape'){for(const id of ['letterModal','karmaWriteModal','treeModal','readNoteModal','blessingModal','helpModal']){if(!$(id).classList.contains('hidden')){if(id==='blessingModal')return;modal(id,false);return}}}if(state.locked)return;if(key==='e'&&!e.repeat){interact();return}state.keys.add(key)});
  document.addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>state.keys.clear());
  // Real analog virtual joystick: one pointer at a time, independent of screen aspect ratio.
  const joystick=$('joystick'), knob=$('joystickKnob');let activePointer=null;
  function resetJoystick(){if(!knob)return;knob.style.transform='translate(0px,0px)'}
  function setStick(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=Math.max(25,r.width*.32);let x=e.clientX-cx,y=e.clientY-cy;const len=Math.hypot(x,y);if(len>max){x*=max/len;y*=max/len}knob.style.transform=`translate(${x}px,${y}px)`;const dead=.13;state.joyX=Math.abs(x/max)<dead?0:x/max;state.joyY=Math.abs(y/max)<dead?0:y/max}
  joystick.addEventListener('pointerdown',e=>{if(activePointer!==null)return;e.preventDefault();activePointer=e.pointerId;joystick.setPointerCapture(e.pointerId);setStick(e)});
  joystick.addEventListener('pointermove',e=>{if(activePointer!==e.pointerId)return;e.preventDefault();setStick(e)});
  function endStick(e){if(activePointer!==e.pointerId)return;activePointer=null;state.joyX=0;state.joyY=0;resetJoystick()}
  joystick.addEventListener('pointerup',endStick);joystick.addEventListener('pointercancel',endStick);joystick.addEventListener('lostpointercapture',e=>{if(activePointer===e.pointerId)endStick(e)});
  state.locked=true;requestAnimationFrame(render);setTimeout(()=>toast('Bên phải: viết sớ cầu an • Bên trái: Cây Khẩu Nghiệp • Trong điện có đệm thiền 🪷'),800);
})();
