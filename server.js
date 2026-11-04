'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs/promises');
const { Pool } = require('pg');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 12000, cors: { origin: false } });
const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = 60;
// Render Free files are ephemeral: set DATABASE_URL to store notes durably in PostgreSQL.
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString:databaseUrl, ssl:process.env.PGSSL_DISABLE==='1' ? false : { rejectUnauthorized:false }, max:5 }) : null;
const noteFile = path.join(__dirname, 'local-notes.json');
let localNotes = [];
let writeQueue = Promise.resolve();
const noteRate = new Map();
async function initNotes(){
  if(pool){
    await pool.query(`CREATE TABLE IF NOT EXISTS karma_notes (
      id BIGSERIAL PRIMARY KEY,
      author VARCHAR(18) NOT NULL,
      content VARCHAR(400) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    console.log('Cây Khẩu Nghiệp: PostgreSQL connected');
  } else {
    try { localNotes=JSON.parse(await fs.readFile(noteFile,'utf8')); if(!Array.isArray(localNotes))localNotes=[]; }catch(_){localNotes=[];}
    console.warn('Cây Khẩu Nghiệp: local JSON mode. Configure DATABASE_URL for persistent Render storage!');
  }
}
async function getNotes(page,limit){
  const offset=(page-1)*limit;
  if(pool){const [rows,count]=await Promise.all([
    pool.query('SELECT id, author, content, created_at AS "createdAt" FROM karma_notes ORDER BY id DESC LIMIT $1 OFFSET $2',[limit,offset]),
    pool.query('SELECT COUNT(*)::int AS total FROM karma_notes')
  ]);return {items:rows.rows.map(r=>({...r,id:String(r.id)})),total:count.rows[0].total};}
  const a=[...localNotes].reverse();return {items:a.slice(offset,offset+limit),total:a.length};
}
async function addNote(author,content){
  if(pool){const {rows}=await pool.query('INSERT INTO karma_notes(author,content) VALUES($1,$2) RETURNING id, author, content, created_at AS "createdAt"',[author,content]);return {...rows[0],id:String(rows[0].id)};}
  const note={id:require('crypto').randomUUID(),author,content,createdAt:new Date().toISOString()};
  localNotes.push(note);
  writeQueue=writeQueue.catch(()=>{}).then(()=>fs.writeFile(noteFile+'.tmp',JSON.stringify(localNotes))).then(()=>fs.rename(noteFile+'.tmp',noteFile));
  await writeQueue;return note;
}

const players = new Map();
const colors = ['#8eb4a3','#daaf73','#97b0d6','#d88f94','#b9a0d7','#89bba6'];
const clamp = (x,a,b) => Math.min(b, Math.max(a,x));
const clean = (v,n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n) : '';
app.disable('x-powered-by');
app.use(express.json({limit:'8kb'}));
app.get('/api/notes',async(req,res)=>{
  const page=clamp(Number.parseInt(req.query.page,10)||1,1,100000),limit=clamp(Number.parseInt(req.query.limit,10)||12,1,40);
  try{res.set('Cache-Control','no-store');res.json(await getNotes(page,limit));}
  catch(err){console.error('Notes GET:',err.message);res.status(503).json({error:'Chưa thể đọc cây sớ, thử lại sau'});}
});
app.post('/api/notes',async(req,res)=>{
  const author=clean(req.body?.author,18),content=clean(req.body?.content,400);
  if(author.length<2||content.length<3)return res.status(400).json({error:'Tên hoặc lời khẩu nghiệp chưa hợp lệ (3–400 ký tự)'});
  const ip=(req.ip||req.socket.remoteAddress||'').slice(0,100),now=Date.now();
  if(now-(noteRate.get(ip)||0)<20000)return res.status(429).json({error:'Hãy đợi 20 giây trước khi treo lời tiếp theo'});
  noteRate.set(ip,now);
  try{const note=await addNote(author,content);io.emit('noteAdded',note);res.status(201).json({note});}
  catch(err){noteRate.delete(ip);console.error('Notes POST:',err.message);res.status(503).json({error:'Không thể lưu lời khẩu nghiệp, vui lòng thử lại'});}
});
// Optional moderation endpoint; never expose ADMIN_TOKEN to browser code.
app.delete('/api/notes/:id',async(req,res)=>{
  if(!process.env.ADMIN_TOKEN || req.get('x-admin-token')!==process.env.ADMIN_TOKEN)return res.status(403).json({error:'Không có quyền'});
  const id=String(req.params.id||'');
  try{
    if(pool){if(!/^\d+$/.test(id))return res.status(400).json({error:'ID không hợp lệ'});await pool.query('DELETE FROM karma_notes WHERE id=$1',[id]);}
    else {localNotes=localNotes.filter(n=>n.id!==id);writeQueue=writeQueue.catch(()=>{}).then(()=>fs.writeFile(noteFile+'.tmp',JSON.stringify(localNotes))).then(()=>fs.rename(noteFile+'.tmp',noteFile));await writeQueue;}
    io.emit('notesRefresh');res.json({success:true});
  }catch(err){console.error('Notes DELETE:',err.message);res.status(503).json({error:'Xóa thất bại'});}
});
setInterval(()=>{const cutoff=Date.now()-60000;for(const [key,t] of noteRate)if(t<cutoff)noteRate.delete(key)},60000).unref();
app.get('/health', (_,res)=>res.json({status:'ok',online:players.size}));
app.get('/', (_,res)=>{res.set('Cache-Control','no-store, max-age=0');res.sendFile(path.join(__dirname,'index.html'));});
for (const file of ['index.html','style.css','game.js']) app.get('/'+file, (_,res)=>{res.set('Cache-Control','no-store, max-age=0');res.sendFile(path.join(__dirname,file));});
app.use('/vendor/three/addons', express.static(path.join(__dirname,'node_modules','three','examples','jsm'), { maxAge:'7d' }));
app.use('/vendor/three', express.static(path.join(__dirname,'node_modules','three','build'), { maxAge:'7d' }));
app.get('/inside3d.js', (_,res)=>{res.set('Cache-Control','no-store, max-age=0');res.sendFile(path.join(__dirname,'inside3d.js'));});
app.get('/outside3d.js', (_,res)=>{res.set('Cache-Control','no-store, max-age=0');res.sendFile(path.join(__dirname,'outside3d.js'));});
app.get('/river3d.js', (_,res)=>{res.set('Cache-Control','no-store, max-age=0');res.sendFile(path.join(__dirname,'river3d.js'));});
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '0' }));
io.on('connection', socket => {
  let lastMove=0,lastChat=0;
  socket.on('join', data=>{
    const name=clean(data?.name,18);
    if(name.length<2){socket.emit('serverError','Tên phải có 2–18 ký tự');return;}
    if(!players.has(socket.id)&&players.size>=MAX_PLAYERS){socket.emit('serverError','Sân chùa đang đông, vui lòng thử lại sau');return;}
    if(players.has(socket.id))players.delete(socket.id);
    const p={id:socket.id,name,x:610,y:610,dir:0,scene:'temple',moving:false,meditating:false,color:colors[Math.floor(Math.random()*colors.length)]};
    players.set(socket.id,p);
    socket.emit('players',{players:[...players.values()],count:players.size});
    socket.broadcast.emit('playerJoined',p);
    io.emit('online',players.size);
  });
  socket.on('move', data=>{
    const p=players.get(socket.id);if(!p||!data||typeof data!=='object')return;
    const now=Date.now();if(now-lastMove<45)return;lastMove=now;
    if(!Number.isFinite(data.x)||!Number.isFinite(data.y))return;
    p.x=clamp(Math.round(data.x),37,1163);p.y=clamp(Math.round(data.y),390,721);
    p.dir=data.dir===-1?-1:1;p.scene=['temple','inside','release','river'].includes(data.scene)?data.scene:'temple';p.moving=data.moving===true;p.meditating=data.meditating===true;
    socket.broadcast.volatile.emit('playerMoved',{id:p.id,x:p.x,y:p.y,dir:p.dir,scene:p.scene,moving:p.moving,meditating:p.meditating});
  });
  socket.on('chat', data=>{
    const p=players.get(socket.id);if(!p||p.scene==='release')return;
    const now=Date.now();if(now-lastChat<1100)return;
    const msg=clean(data?.text,100);if(!msg)return;lastChat=now;
    io.emit('chat',{id:p.id,name:p.name,text:msg});
  });
  socket.on('disconnect',()=>{
    if(!players.delete(socket.id))return;
    io.emit('playerLeft',socket.id);io.emit('online',players.size);
  });
});
initNotes().then(()=>server.listen(PORT,'0.0.0.0',()=>console.log(`Xả Stress Online Multiplayer: http://localhost:${PORT}`))).catch(err=>{console.error('Database startup error:',err);process.exit(1)});
