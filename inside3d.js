// Chùa Online 3.5 — dedicated WebGL shrine. Three.js is installed via npm and served locally.
import * as THREE from '/vendor/three/three.module.js';

const host = document.getElementById('inside3d');
const txt = document.getElementById('inside3dHint');
let renderer, scene, camera, avatar, ritualLight, incense, entered=false, available=true;
let peers = new Map(), elapsed=0, last=performance.now();
const mats = {};
const col = (hex, roughness=.72, metalness=0) => new THREE.MeshStandardMaterial({color:hex,roughness,metalness});
const wood = col('#622617'), darkWood = col('#36160f'), gold=col('#d2a34c',.31,.6), paleGold=col('#f6d88c',.45,.22);
const red = col('#961f20'), ivory=col('#f8e9c9'), stone=col('#bf8b60'), green=col('#37664d');
const floorMat=col('#9e563f');
const box=(w,h,d,m,x,y,z,parent=scene)=> {const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(r1,r2,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
function textSprite(text, bg='#fff0ce', fg='#493321', size=64){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(8,9,496,110,26);ctx.fill();ctx.font=`bold ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.fillText(text.slice(0,22),256,65,470);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(2.9,.73,1);return s;
}
function pillar(x,z){cyl(.46,.48,5.5,red,x,2.75,z);cyl(.61,.61,.26,gold,x,.26,z);cyl(.6,.6,.23,gold,x,5.43,z);}
function makeLotus(x,y,z,s=.7){const mat=col('#ea88a8',.55);const center=sphere(.26*s,paleGold,x,y,z);for(let j=0;j<9;j++){const a=j*Math.PI*2/9;let p=sphere(.3*s,mat,x+Math.cos(a)*.29*s,y-.08*s,z+Math.sin(a)*.29*s);p.scale.set(.65,1.3,.85)}return center;}
function makeStatue(){
 const g=new THREE.Group();g.position.set(0,3.55,-13.2);scene.add(g);
 // lotus pedestal, robe body, arms, face, halo and crown. Artistic 3D interpretation.
 cyl(1.16,1.22,.38,gold,0,0,0,g);makeLotus(0,.37,0,2.7);
 const body=cyl(.46,.88,1.75,ivory,0,1.42,0,g);body.rotation.z=.02;
 sphere(.51,ivory,0,2.37,0,g).scale.set(.75,1.15,.72);
 const hair=col('#1d211e');sphere(.39,hair,0,2.74,-.05,g).scale.set(.91,.52,.9);
 cyl(.2,.3,.26,gold,0,3.08,0,g);sphere(.14,paleGold,0,3.29,0,g);
 for(const side of [-1,1]){const arm=cyl(.14,.2,1.08,ivory,side*.48,1.73,.15,g);arm.rotation.z=side*.65;sphere(.17,ivory,side*.81,1.25,.31,g);}
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.9,.09,12,66),new THREE.MeshStandardMaterial({color:'#ffe3a4',emissive:'#ce922e',emissiveIntensity:1.6,metalness:.5}));halo.position.set(0,2.45,-.32);g.add(halo);
 const light=new THREE.PointLight('#eec977',16,9);light.position.set(0,2.7,-.2);g.add(light);
 return g;
}
function makePerson(color='#83a8a4'){
 const g=new THREE.Group();g.userData.walk=0;
 const cloth=col(color), skin=col('#f0c39d'), black=col('#2a2b2c');
 const body=cyl(.42,.5,1.08,cloth,0,1.02,0,g);
 body.scale.set(1,.98,1);
 sphere(.38,skin,0,1.88,0,g);
 sphere(.39,black,0,2.08,-.03,g).scale.set(1,.45,1);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.12,28),new THREE.MeshStandardMaterial({color:'#7b5a3f',roughness:.9}));base.position.set(0,.08,0);g.add(base);
 const label=textSprite('Khách');label.position.y=2.75;g.add(label);g.userData.label=label;
 const bubble=textSprite('');bubble.position.y=3.45;bubble.visible=false;g.add(bubble);g.userData.bubble=bubble;g.userData.bubbleText='';g.userData.base=base;g.userData.body=body;g.userData.legs=[];
 return g;
}
function assignLabel(g,name){g.remove(g.userData.label);const s=textSprite(name);s.position.y=2.85;g.userData.label=s;g.add(s)}
function assignBubble(g,text){if(g.userData.bubbleText===text)return;g.remove(g.userData.bubble);const s=textSprite(text,'#fff9df','#503a25',43);s.position.y=3.55;s.visible=!!text;g.add(s);g.userData.bubble=s;g.userData.bubbleText=text;}
function mapPosition(p){return {x:THREE.MathUtils.clamp((p.x-600)/46,-11.8,11.8),z:THREE.MathUtils.clamp((p.y-570)/21,-7.6,9.2)};}
const meditationPads2D=[{x:450,y:620},{x:600,y:620},{x:750,y:620},{x:525,y:560},{x:675,y:560}];
const meditationPads3D=meditationPads2D.map(mapPosition);
function setup(){
 try{renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches,alpha:false,powerPreference:'default'});}catch(e){available=false;return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.4:1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.setAttribute('aria-label','Điện Quan Âm không gian ba chiều');host.appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#221818');scene.fog=new THREE.Fog('#34251f',13,32);
 camera=new THREE.PerspectiveCamera(64,1,.08,90);
 scene.add(new THREE.HemisphereLight('#fff1cc','#533126',3));const sun=new THREE.DirectionalLight('#ffe2a7',4);sun.position.set(-5,12,6);scene.add(sun);
 const floor=box(30,.16,34,floorMat,0,-.09,-3.5); // wider hall floor tiles
 for(let x=-15;x<=15;x+=1.5)box(.025,.013,34,col('#754234'),x,.015,-3.5);
 for(let z=-20;z<14;z+=1.5)box(30,.014,.025,col('#754234'),0,.018,z);
 box(30,7,.5,darkWood,0,3.5,-20);box(.4,7,34,darkWood,-15,3.5,-3.5);box(.4,7,34,darkWood,15,3.5,-3.5);
 box(30,.43,34,darkWood,0,6.8,-3.5);
 // panel art is decorative, but walls, columns, altar and statue are 3D meshes
 const loader=new THREE.TextureLoader();loader.load('/assets/dien-quan-am.png',tex=>{tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:tex});box(12,5.7,.08,m,0,3.7,-19.62);},undefined,()=>{});
 for(const x of [-12,-8,-4,4,8,12]){pillar(x,-16);pillar(x,8)}
 for(const z of [-16,8]){box(24,.24,.5,gold,0,5.55,z);box(24,.18,.6,wood,0,6.15,z)}
 // altar 3D
 box(9,1.1,2.6,wood,0,1.05,-12.5);box(9.6,.22,3,gold,0,1.65,-12.5);
 for(const x of [-3.7,3.7]){box(.18,1.1,2.4,paleGold,x,1.12,-12.5);makeLotus(x,2,-12.3,1.2)}
 cyl(.65,.8,.57,gold,0,1.98,-11.4);cyl(.72,.72,.18,darkWood,0,1.66,-11.4);
 for(let i=-3;i<=3;i++){const stick=cyl(.019,.019,.8,red,i*.15,2.65,-11.4);stick.rotation.z=.035*i;}
 const altarGlow=new THREE.PointLight('#efb04d',12,12);altarGlow.position.set(0,3,-11.3);scene.add(altarGlow);
 for(const x of [-2.5,2.5]){cyl(.09,.09,1.1,gold,x,2.35,-9.6);sphere(.19,new THREE.MeshStandardMaterial({color:'#ffc76e',emissive:'#ea9c39',emissiveIntensity:2}),x,2.97,-9.6)}
 makeStatue();
 // nearby approach marker on walkable floor
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.06,8,60),new THREE.MeshBasicMaterial({color:'#ffd17e',transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.04,-5.2);scene.add(ring);ritualLight=ring;
 meditationPads3D.forEach((spot,i)=>{const base=new THREE.Mesh(new THREE.CylinderGeometry(.88,.88,.08,28),new THREE.MeshStandardMaterial({color:i<3?'#a7623c':'#b8794c',roughness:.92}));base.position.set(spot.x,.05,spot.z);scene.add(base);const cushion=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.16,28),new THREE.MeshStandardMaterial({color:i<3?'#d6a15f':'#d8b57b',roughness:.76}));cushion.position.set(spot.x,.16,spot.z);scene.add(cushion);const glow=new THREE.Mesh(new THREE.TorusGeometry(.92,.04,8,48),new THREE.MeshBasicMaterial({color:'#ffe4a0',transparent:true,opacity:.33}));glow.rotation.x=-Math.PI/2;glow.position.set(spot.x,.11,spot.z);glow.userData.phase=i;scene.add(glow);(scene.userData.padGlows ||= []).push(glow);});
 avatar=makePerson('#d7a85f');scene.add(avatar);assignLabel(avatar,'Bạn');
 // thin incense haze drifting upwards
 const smokeMat=new THREE.MeshBasicMaterial({color:'#ffefdc',transparent:true,opacity:.15,depthWrite:false});incense=[];
 for(let i=0;i<12;i++){const puff=sphere(.2,smokeMat.clone(),0,2.7,-8.9);puff.position.x=(i%4-1.5)*.16;puff.position.y=2.6+(i/12)*2;incense.push(puff)}
 window.addEventListener('resize',resize);resize();loop(performance.now());
}
function resize(){if(!renderer||!camera)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?78:64;camera.updateProjectionMatrix();}
function loop(now){requestAnimationFrame(loop);if(!entered||!renderer)return;const dt=Math.min((now-last)/1000,.06);last=now;elapsed+=dt;
 ritualLight.material.opacity=.45+.25*Math.sin(elapsed*2);
 for(let i=0;i<incense.length;i++){const p=incense[i];const t=(elapsed*.24+i/12)%1;p.position.y=2.6+t*2.5;p.position.x=Math.sin(elapsed+i)*(.1+t*.48);p.scale.setScalar(.7+t*2);p.material.opacity=(1-t)*.09;}
 for(const p of peers.values()){p.group.userData.walk+=dt*6; if(p.group.userData.base){p.group.userData.base.position.y=.08+(p.meditating?-.03:0)+Math.sin(elapsed*2+(p.group.position.x||0))*.01;}}
 if(scene.userData.padGlows){for(const glow of scene.userData.padGlows){glow.material.opacity=.22+.12*Math.sin(elapsed*2+(glow.userData.phase||0));}}
 renderer.render(scene,camera);
}
window.temple3D={
 enter(){if(!renderer && available)setup();if(!renderer){host.classList.add('hidden');txt?.classList.remove('hidden');if(txt)txt.textContent='Thiết bị chưa hỗ trợ WebGL, đang dùng cảnh 2D dự phòng cho nội điện.';return false;}host.classList.remove('hidden');entered=true;last=performance.now();resize();return true;},
 exit(){host.classList.add('hidden');entered=false;peers.forEach(x=>scene.remove(x.group));peers.clear();},
 sync({player,others,name,bubble}){if(!entered||!scene)return;const pos=mapPosition(player);avatar.position.set(pos.x,0,pos.z);assignLabelIfChanged(avatar,name||'Bạn');assignBubble(avatar,bubble||'');
  avatar.position.y=player.meditating ? .08 : 0; if(avatar.userData.base) avatar.userData.base.position.y=player.meditating ? .05 : .08;
  camera.position.lerp(new THREE.Vector3(pos.x*.45,6.6,Math.min(pos.z+11.8,16.2)),.085);camera.lookAt(pos.x*.3,2.35,pos.z-7.7);
  const seen=new Set();for(const p of others||[]){if(p.scene!=='inside')continue;seen.add(p.id);let o=peers.get(p.id);if(!o){const group=makePerson(p.color||'#88a8a5');scene.add(group);o={group};peers.set(p.id,o)}const pp=mapPosition(p);o.group.position.set(pp.x,p.meditating ? .08 : 0,pp.z);o.moving=p.moving;o.meditating=p.meditating===true;if(o.group.userData.base) o.group.userData.base.position.y=p.meditating ? .05 : .08;assignLabelIfChanged(o.group,p.name||'Khách');assignBubble(o.group,p.chat||'');}
  for(const [id,o] of peers)if(!seen.has(id)){scene.remove(o.group);peers.delete(id)}
 }
};
function assignLabelIfChanged(g,name){if(g.userData.lastName===name)return;g.userData.lastName=name;assignLabel(g,name)}
