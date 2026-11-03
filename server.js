'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 12000, cors: { origin: false } });
const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = 60;
const players = new Map();
const colors = ['#8eb4a3','#daaf73','#97b0d6','#d88f94','#b9a0d7','#89bba6'];
const clamp = (x,a,b) => Math.min(b, Math.max(a,x));
const clean = (v,n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n) : '';
app.disable('x-powered-by');
app.get('/health', (_,res)=>res.json({status:'ok',online:players.size}));
app.get('/', (_,res)=>res.sendFile(path.join(__dirname,'index.html')));
for (const file of ['index.html','style.css','game.js']) app.get('/'+file, (_,res)=>res.sendFile(path.join(__dirname,file)));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '1d' }));
io.on('connection', socket => {
  let lastMove=0,lastChat=0;
  socket.on('join', data=>{
    const name=clean(data?.name,18);
    if(name.length<2){socket.emit('serverError','Tên phải có 2–18 ký tự');return;}
    if(!players.has(socket.id)&&players.size>=MAX_PLAYERS){socket.emit('serverError','Sân chùa đang đông, vui lòng thử lại sau');return;}
    if(players.has(socket.id))players.delete(socket.id);
    const p={id:socket.id,name,x:610,y:610,dir:0,scene:'temple',moving:false,color:colors[Math.floor(Math.random()*colors.length)]};
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
    p.dir=data.dir===-1?-1:1;p.scene=['temple','inside','release'].includes(data.scene)?data.scene:'temple';p.moving=data.moving===true;
    socket.broadcast.volatile.emit('playerMoved',{id:p.id,x:p.x,y:p.y,dir:p.dir,scene:p.scene,moving:p.moving});
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
server.listen(PORT,'0.0.0.0',()=>console.log(`Chùa Online Multiplayer: http://localhost:${PORT}`));
