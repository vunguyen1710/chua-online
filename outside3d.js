import * as THREE from '/vendor/three/three.module.js';

const host = document.getElementById('outside3d');
let renderer, scene, camera, avatar, entered = false;
let peers = new Map(), last = performance.now(), elapsed = 0;
let cameraYaw = 0, cameraPitch = 0.32, cameraDistance = 8.8;
let dragPointer = null, dragLastX = 0, dragLastY = 0;

const col = (hex, roughness = .78, metalness = 0, emissive = null, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, ...(emissive ? { emissive, emissiveIntensity } : {}) });
const box = (w,h,d,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(r1,r2,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};

function textSprite(text, bg='#fff0ce', fg='#493321', size=64){
  const c=document.createElement('canvas'); c.width=1024; c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(12,16,1000,224,34); ctx.fill();
  ctx.font=`bold ${size}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=fg; ctx.fillText(String(text).slice(0,36), 512, 128, 950);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.scale.set(4.2,1.02,1); return sprite;
}
function assignLabel(g,name){ if(g.userData.label) g.remove(g.userData.label); const s=textSprite(name); s.position.y=2.85; g.userData.label=s; g.add(s); }
function assignBubble(g,text){
  if(g.userData.bubbleText===text) return;
  if(g.userData.bubble) g.remove(g.userData.bubble);
  const s=textSprite(text,'#fff9df','#503a25',43); s.position.y=3.58; s.visible=!!text; g.add(s); g.userData.bubble=s; g.userData.bubbleText=text;
}
function makePerson(color='#83a8a4'){
  const g=new THREE.Group(); g.userData.walk=0;
  const cloth=col(color), skin=col('#f0c39d'), black=col('#2a2b2c');
  const body=cyl(.42,.5,1.08,cloth,0,1.02,0,g);
  sphere(.38,skin,0,1.88,0,g); const hair=sphere(.39,black,0,2.08,-.03,g); hair.scale.set(1,.45,1);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.12,28), new THREE.MeshStandardMaterial({color:'#7b5a3f',roughness:.9})); base.position.set(0,.08,0); g.add(base);
  g.userData.body=body; g.userData.base=base;
  assignLabel(g,'Khách'); assignBubble(g,'');
  return g;
}

// Keep gameplay coordinates the same, but spread them wider in the visual scene to fit many players.
function mapPosition(p){
  const x = (p.x - 600) / 32.5;
  const z = (p.y - 560) / 15.4;
  return { x: THREE.MathUtils.clamp(x, -19.4, 19.4), z: THREE.MathUtils.clamp(z, -10.8, 11.6) };
}

// Gabled tiled roof constructed from actual pitched faces. No rotated flat box sections.
// The roof is centered on parent origin; eaves y=0, ridge y=ridgeRise.
function makeRoofSegment(w,d,y,z,color='#7e3825',edge='#d39755', parent=scene, ridgeRise=1.65){
  const g=new THREE.Group(); g.position.set(0,y,z); parent.add(g);
  const tileMat=col(color,.82,.01), edgeMat=col(edge,.48,.13), dark=col('#48251c',.82);
  const halfW=w/2,halfD=d/2;
  // Pitched panels, sharing a continuous ridge (roof slope follows the X axis).
  const planes=[
    [[-halfW,0,-halfD], [0,ridgeRise,-halfD], [0,ridgeRise,halfD],[-halfW,0,halfD]],
    [[0,ridgeRise,-halfD],[halfW,0,-halfD],[halfW,0,halfD],[0,ridgeRise,halfD]],
  ];
  for(const corners of planes){
    const v=corners.flat();
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    geo.setIndex([0,1,2,0,2,3]); geo.computeVertexNormals();
    const mat=tileMat.clone(); mat.side=THREE.DoubleSide;
    const face=new THREE.Mesh(geo,mat); g.add(face);
  }
  // Vertical triangular ends under the ridge; stable roof silhouette from all camera angles.
  for(const frontZ of [-halfD,halfD]){
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute([-halfW,0,frontZ,halfW,0,frontZ,0,ridgeRise,frontZ],3));
    geo.setIndex([0,1,2]); geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#673421',roughness:.86,side:THREE.DoubleSide}));g.add(mesh);
    box(w,.13,.16,edgeMat,0,-.035,frontZ,g);
    const halfSlope=Math.hypot(halfW,ridgeRise);
    for(const sign of [-1,1]){
      const slope=new THREE.Mesh(new THREE.BoxGeometry(halfSlope,.13,.14),edgeMat);
      slope.position.set(sign*halfW/2,ridgeRise/2,frontZ);
      slope.rotation.z=sign===-1?Math.atan2(ridgeRise,halfW):-Math.atan2(ridgeRise,halfW);
      g.add(slope);
    }
  }
  // Tile courses follow each face in depth and add a readable terracotta rhythm.
  const courses=Math.max(4,Math.floor(d/.58));
  for(let k=1;k<courses;k++){
    const zz=-halfD+k*d/courses;
    for(const side of [-1,1]){
      const x=side*halfW*.51,y=ridgeRise*(1-.51)+.014;
      const strip=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(halfW,ridgeRise)*.98,.026,.043),dark);
      strip.position.set(x,y,zz);strip.rotation.z=side===-1?Math.atan2(ridgeRise,halfW):-Math.atan2(ridgeRise,halfW);g.add(strip);
    }
  }
  box(.22,.22,d+.22,edgeMat,0,ridgeRise+.025,0,g);
  return g;
}

function treeCluster(x,z,scale=1){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  cyl(.36*scale,.52*scale,3.5*scale,col('#6b4128'),0,1.75*scale,0,g);
  const leafMat=col('#4d8d48'), leafMat2=col('#5da450');
  for(const item of [[0,4.3,0,2.3],[1.3,4.1,.2,1.55],[-1.3,4.15,-.1,1.7],[.4,3.5,1.25,1.45],[-.45,3.55,-1.35,1.52],[.2,5.2,.4,1.35],[-.4,5.05,-.2,1.2]]){
    sphere(item[3]*scale, Math.random()>.5?leafMat:leafMat2, item[0]*scale,item[1]*scale,item[2]*scale,g);
  }
  return g;
}
function lanternPole(x,z,height=2.2){
  cyl(.11,.11,height,col('#6d4429'),x,height*.5,z);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.23,18,12), col('#ffcc78',.3,.1,'#d68f2f',1.5));
  lamp.position.set(x,height+.18,z); scene.add(lamp);
}
function shrub(x,z,scale=.7){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  sphere(.55*scale,col('#5a9248'),0,.3,0,g); sphere(.45*scale,col('#78aa61'),.5,.28,.15,g); sphere(.45*scale,col('#4a8542'),-.48,.28,-.1,g);
  return g;
}
function wishTag(x,y,z,parent){
  const g=new THREE.Group(); g.position.set(x,y,z); parent.add(g);
  cyl(.01,.01,.4,col('#eac87c'),0,.16,0,g);
  const tag=box(.22,.34,.02,col('#f6e0a7',.62,.02),0,-.06,0,g);
  box(.18,.03,.025,col('#c44434',.55,.08),0,.07,.005,g);
  tag.rotation.z=(Math.random()-.5)*.18;
  return g;
}

function buildKarmaTree(x,z){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const bark=col('#6d4429'), leaf1=col('#517f3d'), leaf2=col('#63934e'), glow=col('#ffcc78',.3,.05,'#d68f2f',1.4);
  cyl(.75,.95,6.6,bark,0,3.3,0,g);
  // Branches
  for(const b of [[1.3,5.4,.5,.9,.18,-.42],[-1.2,5.2,-.2,.95,-.22,.38],[.35,4.7,1.3,.72,.42,.08],[-.4,4.9,-1.35,.78,-.38,-.12],[0,5.9,0,.8,.16,.16]]){
    const br = cyl(.16*b[3], .34*b[3], 2.1*b[3], bark, b[0], b[1], b[2], g); br.rotation.z=b[4]; br.rotation.x=b[5];
  }
  for(const item of [[0,8.1,0,3.2],[2.4,7.2,.4,2.15],[-2.5,7.0,-.1,2.25],[.7,6.5,2.0,1.8],[-.8,6.3,-2.1,1.9],[0,9.2,.5,1.7],[-1.2,8.6,1.6,1.5],[1.5,8.8,-1.3,1.4]]){
    sphere(item[3], Math.random()>.45?leaf1:leaf2, item[0],item[1],item[2],g);
  }
  // lanterns
  for(const l of [[1.4,6.7,1.1],[-1.6,6.5,-.8],[.8,7.8,-1.6],[-.4,8.4,1.8]]){
    cyl(.012,.012,.45,col('#eac87c'),l[0],l[1],l[2],g);
    const lamp=sphere(.21,glow,l[0],l[1]-.34,l[2],g);
    lamp.scale.set(.9,1.1,.9);
  }
  // karma tags
  for(let i=0;i<14;i++){
    const a=(i/14)*Math.PI*2; const r=2.2+Math.random()*1.25; const h=5.9+Math.random()*2.2; wishTag(Math.cos(a)*r,h,Math.sin(a)*r,g);
  }
  const sign=textSprite('CÂY KHẨU NGHIỆP','#6d321e','#ffefbf',38); sign.scale.set(4.5,.9,1); sign.position.set(0,10.5,.2); g.add(sign);
  return g;
}

function buildTemple(){
  const redWall=col('#a64a31',.79), cream=col('#d9bb91',.78), gold=col('#d5a55e',.42,.27);
  const wood=col('#6d3424',.68), darkWood=col('#47241c',.74), stone=col('#bba286',.88);
  const temple=new THREE.Group();temple.position.set(0,0,-18.2);scene.add(temple);
  // Continuous raised foundation, not a floating collection of pieces.
  box(25,.92,13.6,stone,0,.46,.2,temple);
  box(21,.18,11.5,cream,0,1.01,-.1,temple);
  // Steps rise steadily toward the entrance (nearer to player = positive Z).
  for(let i=0;i<4;i++){
    box(10.5-i*.35,.20,1.15,col(i%2?'#c4ab8c':'#d7c0a1',.88),0,.19+i*.2,8.4-i*.91,temple);
  }
  for(const x of [-8.5,8.5]){
    const base=box(1.1,.68,1.1,stone,x,1.36,5.7,temple);
    sphere(.37,cream,x,1.98,5.7,temple);
  }
  // Solid building, with deep front portico and paired side wings.
  box(18.4,4.9,.65,redWall,0,3.52,-5.65,temple);
  for(const x of [-8.85,8.85])box(.62,4.9,10.5,redWall,x,3.52,-.5,temple);
  box(5.1,4.0,6.25,redWall,-11.25,3.0,-1.5,temple);
  box(5.1,4.0,6.25,redWall,11.25,3.0,-1.5,temple);
  // Doors are visible in the portico without central pillars or railings in front.
  box(6.75,4.12,.22,darkWood,0,3.08,4.65,temple);
  for(const x of [-1.68,1.68]){
    box(3.13,3.72,.13,wood,x,3.02,4.83,temple);
    for(const j of [-1,0,1])box(.067,3.38,.065,gold,x+j*.76,3.0,4.916,temple);
    for(const yy of [1.75,3.0,4.3])box(2.87,.07,.06,gold,x,yy,4.917,temple);
    sphere(.07,gold,Math.sign(x)*.31,2.94,4.94,temple);
  }
  // Door lintel and outer beams. Columns connect floor to underside of front roof.
  box(18.6,.34,.66,wood,0,5.78,4.1,temple);
  box(18.4,.19,.72,gold,0,6.0,4.1,temple);
  const columnRed=col('#912f28',.46),columnGold=col('#e0b469',.42,.23);
  for(const x of [-7.65,-5.45,-3.5,3.5,5.45,7.65]){
    cyl(.32,.36,4.85,columnRed,x,3.59,4.45,temple); // bottom 1.165, top 6.015
    cyl(.48,.48,.22,columnGold,x,1.22,4.45,temple);
    cyl(.47,.47,.2,columnGold,x,6.02,4.45,temple);
  }
  // Two railing sections only: leave a clear central gap for the entrance.
  for(const side of [-1,1]){
    const xx=side*6.95;
    box(4.3,.18,.24,cream,xx,2.15,5.23,temple);
    for(let i=-2;i<=2;i++)box(.15,.9,.18,cream,xx+i*.85,1.63,5.23,temple);
  }
  for(const x of [-11.35,11.35]){
    box(2.62,2.28,.17,darkWood,x,3.05,1.8,temple);
    for(let i=-2;i<=2;i++)box(.07,1.89,.07,gold,x+i*.4,3.05,1.92,temple);
    for(const yy of [2.28,3.05,3.82])box(2.25,.07,.06,gold,x,yy,1.92,temple);
  }
  // Main double-tier roof: upper ridge / lower eave are correctly connected.
  // Front porch: eave rests above column capitals (y≈6.25), ridge at ≈8.25.
  makeRoofSegment(20.7,8.0,6.34,2.6,'#7f3828','#d7a55e',temple,2.0);
  // Upper tier rises above the first roof; separate setback keeps tiers legible.
  box(12.9,1.2,5.1,redWall,0,7.47,-1.2,temple);
  makeRoofSegment(15.2,6.7,8.1,-1.2,'#843f2b','#d5a25a',temple,1.55);
  // Side wings have their own lower pitched roofs; no stray center roof.
  const leftWing=new THREE.Group();leftWing.position.set(-11.35,0,-1.5);temple.add(leftWing);
  makeRoofSegment(6.3,7.4,5.13,0,'#82402b','#d5a25a',leftWing,1.2);
  const rightWing=new THREE.Group();rightWing.position.set(11.35,0,-1.5);temple.add(rightWing);
  makeRoofSegment(6.3,7.4,5.13,0,'#82402b','#d5a25a',rightWing,1.2);
  // 3D plaque is kept below the eave and above the door, with a small forward offset.
  box(6.3,.83,.32,darkWood,0,5.57,5.0,temple);
  box(6.55,.09,.39,gold,0,6.04,5.0,temple);
  box(6.55,.09,.39,gold,0,5.1,5.0,temple);
  const sign=textSprite('ĐIỆN QUAN ÂM','#68271d','#ffe6a1',43);
  sign.scale.set(5.62,.82,1);sign.position.set(0,5.58,5.22);temple.add(sign);
  for(const x of [-6.15,-3.0,3.0,6.15])lanternPole(x,-11.85,2.6);
  for(const x of [-8,8]){
    cyl(.4,.48,.6,col('#8b6a47',.65),x,1.42,4.8,temple);
    sphere(.2,col('#eb9dab'),x,1.92,4.8,temple);
  }
  return temple;
}

function buildPond(){
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.1,44), new THREE.MeshStandardMaterial({color:'#4ea2ba', roughness:.28, metalness:.08}));
  water.rotation.x=-Math.PI/2; water.position.set(-18.2,.03,11.7); scene.add(water);
  const rim = new THREE.Mesh(new THREE.RingGeometry(5.2,5.65,48), new THREE.MeshStandardMaterial({color:'#b8a688', roughness:.92})); rim.rotation.x=-Math.PI/2; rim.position.set(-18.2,.035,11.7); scene.add(rim);
  for(const [x,z,s] of [[-19.1,12.4,.7],[-16.9,10.4,.6],[-20.2,10.7,.55],[-17.4,13.9,.5],[-18.5,9.2,.42]]){
    const lotus=new THREE.Group(); lotus.position.set(x,.06,z); scene.add(lotus); sphere(.12,col('#edd08b', .4,.15),0,.05,0,lotus);
    for(let i=0;i<8;i++){ const a=i*Math.PI*2/8; const p=sphere(.16*s,col('#e48ca9'),Math.cos(a)*.26*s,.03,Math.sin(a)*.26*s,lotus); p.scale.set(.7,1.1,.9);} }
}


function buildCourtyardTiles(){
  const tileMatA = col('#a7adb1', .95, 0), tileMatB = col('#969da2', .95, 0), groutMat = col('#737a7f', 1, 0);
  const base = new THREE.Mesh(new THREE.BoxGeometry(34.8,.1,24.8), new THREE.MeshStandardMaterial({color:'#8a8f94', roughness:.98}));
  base.position.set(0,.03,3.8); scene.add(base);
  const tileW=1.55, tileD=1.55, startX=-16.15, startZ=-7.55;
  for(let ix=0; ix<22; ix++){
    for(let iz=0; iz<15; iz++){
      const tone = ((ix+iz)%2===0) ? tileMatA : tileMatB;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(1.42,.045,1.42), tone);
      tile.position.set(startX + ix*tileW, .08, startZ + iz*tileD + 3.8);
      tile.rotation.y = ((ix*7+iz*11)%3)*0.02;
      scene.add(tile);
    }
  }
  for(let ix=0; ix<23; ix++) box(.06,.02,24.2,groutMat,startX - .73 + ix*tileW,.06,3.8);
  for(let iz=0; iz<16; iz++) box(34.2,.02,.06,groutMat,0,.06,startZ - .74 + iz*tileD + 3.8);
}

function buildBoundaryWall(){
  const wallMat = col('#f2efe7', .92, 0), trimMat = col('#c6473e', .68, .04), roofMat = col('#d1783b', .62, .08), capMat = col('#c7beb0', .88, .02);
  const makeWallSection = (w, x, z, rotY=0, gate=false) => {
    const g = new THREE.Group(); g.position.set(x,0,z); g.rotation.y = rotY; scene.add(g);
    if(!gate){
      box(w,3.6,.42,wallMat,0,1.8,0,g);
      box(w,.18,.52,capMat,0,3.67,0,g);
      box(w,.24,.7,roofMat,0,4.0,0,g);
      // small red windows
      const gap = 3.7; const count = Math.max(1, Math.floor((w-2.2)/gap));
      const offset = -((count-1)*gap)/2;
      for(let i=0;i<count;i++){
        const px = offset + i*gap;
        box(.95,1.05,.06,trimMat,px,2.1,.23,g);
        box(.82,.92,.045,col('#f7f4ef', .94, 0),px,2.1,.25,g);
        for(let k=-1;k<=1;k++) box(.03,.72,.03,trimMat,px+k*.23,2.1,.27,g);
        for(const yy of [1.83,2.1,2.37]) box(.74,.03,.03,trimMat,px,yy,.27,g);
      }
    } else {
      // leave a central gateway opening
      const side = (w-8)/2;
      box(side,3.6,.42,wallMat,-(4+side/2),1.8,0,g);
      box(side,3.6,.42,wallMat,(4+side/2),1.8,0,g);
      box(side,.18,.52,capMat,-(4+side/2),3.67,0,g); box(side,.18,.52,capMat,(4+side/2),3.67,0,g);
      box(side,.24,.7,roofMat,-(4+side/2),4.0,0,g); box(side,.24,.7,roofMat,(4+side/2),4.0,0,g);
      box(9.2,.24,.7,roofMat,0,4.35,0,g); box(8.4,.16,.5,capMat,0,4.05,0,g);
    }
  };
  makeWallSection(66,0,-27.8,0,false);
  makeWallSection(66,0,27.8,0,true);
  makeWallSection(54,-33,0,Math.PI/2,false);
  makeWallSection(54,33,0,Math.PI/2,false);
  // gateway pillars front center
  const pillarMat = col('#ad3f35', .66, .06);
  for(const x of [-4.2,4.2]){ box(.72,4.5,.72,pillarMat,x,2.25,27.8); box(.88,.16,.88,capMat,x,4.55,27.8); }
  box(10.2,.28,.82,roofMat,0,4.65,27.8); box(9.3,.18,.6,capMat,0,4.35,27.8);
}

function buildScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#b7d9f1');
  scene.fog = new THREE.Fog('#bdd8e7', 35, 72);
  camera = new THREE.PerspectiveCamera(64,1,.08,140);
  scene.add(new THREE.HemisphereLight('#fff4dc','#5b6b52',2.5));
  const sun = new THREE.DirectionalLight('#fff0c2',3.8); sun.position.set(-12,18,14); scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(72,64), new THREE.MeshStandardMaterial({color:'#6d9256', roughness:.97}));
  ground.rotation.x=-Math.PI/2; scene.add(ground);

  // very large courtyard for many players
  const courtyard = new THREE.Mesh(new THREE.PlaneGeometry(34,24), new THREE.MeshStandardMaterial({color:'#c6a781', roughness:.95}));
  courtyard.rotation.x=-Math.PI/2; courtyard.position.set(0,.01,3.8); scene.add(courtyard);
  for(let x=-16.5;x<=16.5;x+=1.7) box(.05,.01,24,col('#9a7b58'),x,.02,3.8);
  for(let z=-7.8;z<=15.5;z+=1.7) box(34,.01,.05,col('#9a7b58'),0,.02,z);

  // outer stone path
  for(let i=0;i<10;i++){ const stone=new THREE.Mesh(new THREE.BoxGeometry(1.8,.08,2.1), new THREE.MeshStandardMaterial({color:i%2?'#cdb496':'#bea281', roughness:.95})); stone.position.set(0,.06,17.5-i*2.25); scene.add(stone);}  
  box(10,.32,.5,col('#d1ad67',.4,.2),0,4.25,22.2); box(.56,4.5,.56,col('#8c2d23'),-3.7,2.25,22.2); box(.56,4.5,.56,col('#8c2d23'),3.7,2.25,22.2); box(8.6,.22,.36,col('#4a2114'),0,4.52,22.2);

  buildTemple();
  buildPond();

  // karma tree area left side, large and eye-catching
  buildKarmaTree(-24.5,1.2);
  treeCluster(-28.5,-5.2,1.2); treeCluster(-26.6,8.0,1.05);

  // prayer desk area on right
  box(3.4,.22,1.5,col('#8c5c36'),24.5,1.3,2.1); box(.22,1.15,.22,col('#694226'),23.35,.58,1.45); box(.22,1.15,.22,col('#694226'),25.65,.58,1.45); box(.22,1.15,.22,col('#694226'),23.35,.58,2.75); box(.22,1.15,.22,col('#694226'),25.65,.58,2.75); box(1.8,.1,.82,col('#ebddb0'),24.5,1.47,2.1);
  const desk=textSprite('BÀN VIẾT SỚ','#694226','#f9ecc5',34); desk.scale.set(3.4,.8,1); desk.position.set(24.5,2.95,2.2); scene.add(desk);
  lanternPole(22.4,1.3,2.35); lanternPole(26.6,1.3,2.35);

  // garden decorations and trees around the edges
  for(const [x,z,s] of [[17.8,13,.95],[24.2,11.5,.8],[-8,17.2,.95],[10.5,18.3,.85],[-15.5,-8.5,.95],[4.6,-9.3,.85],[21.8,-6.8,.9],[-25.0,16.5,.85]]) treeCluster(x,z,s);
  for(const [x,z,s] of [[-12,13,.9],[-7,13.8,.75],[-2,14.5,.7],[5,14.7,.72],[12,13.9,.8],[19,13.2,.78]]) shrub(x,z,s);
  for(const [x,z,s] of [[-17,4,.8],[-14,6,.72],[-11,7.6,.7],[11,6.5,.75],[14,4.8,.7],[18,5.4,.73]]) shrub(x,z,s);
  for(const [x,z,h] of [[-13.5,-1.2,2.4],[-6.3,-1.5,2.3],[6.3,-1.5,2.3],[13.5,-1.2,2.4],[-10.5,11.6,2.4],[10.5,11.6,2.4],[-23.2,4.4,2.6],[23.2,4.4,2.6]]) lanternPole(x,z,h);

  avatar = makePerson('#d7a85f'); scene.add(avatar); assignLabel(avatar,'Bạn');
}

function setupControls(){
  if(!host || host.dataset.bound==='1') return; host.dataset.bound='1';
  host.addEventListener('pointerdown', e=>{ if(!entered) return; dragPointer=e.pointerId; dragLastX=e.clientX; dragLastY=e.clientY; host.setPointerCapture?.(e.pointerId); });
  host.addEventListener('pointermove', e=>{ if(dragPointer!==e.pointerId||!entered) return; const dx=e.clientX-dragLastX, dy=e.clientY-dragLastY; dragLastX=e.clientX; dragLastY=e.clientY; cameraYaw -= dx*0.0075; cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy*0.0028, .23, .64); });
  const end = e=>{ if(dragPointer===e.pointerId) dragPointer=null; };
  host.addEventListener('wheel',e=>{if(!entered)return;e.preventDefault();cameraDistance=THREE.MathUtils.clamp(cameraDistance+Math.sign(e.deltaY)*.6,6.5,13);},{passive:false});
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end); host.addEventListener('lostpointercapture', end);
}
function resize(){ if(!renderer||!camera) return; const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w<h?72:59; camera.updateProjectionMatrix(); }
function updateCamera(playerPos){
  const radiusXZ = cameraDistance*Math.cos(cameraPitch);
  const target = new THREE.Vector3(playerPos.x, 1.5, playerPos.z + .4);
  const desired = target.clone().add(new THREE.Vector3(Math.sin(cameraYaw)*radiusXZ, cameraDistance*Math.sin(cameraPitch)+.2, Math.cos(cameraYaw)*radiusXZ));
  camera.position.lerp(desired,.08); camera.lookAt(target);
}
function loop(now){ requestAnimationFrame(loop); if(!entered||!renderer) return; const dt=Math.min((now-last)/1000,.06); last=now; elapsed+=dt;
  if(avatar?.userData?.body){ avatar.userData.walk += dt*7; const bob = Math.sin(avatar.userData.walk)*.03; avatar.userData.body.position.y = 1.02 + bob; avatar.position.y = 0; }
  for(const peer of peers.values()){ peer.group.userData.walk += dt*7; const bob = peer.moving ? Math.sin(peer.group.userData.walk)*.04 : 0; peer.group.userData.body.position.y = 1.02 + bob; }
  renderer.render(scene,camera);
}
function setup(){
  try { renderer = new THREE.WebGLRenderer({ antialias: !matchMedia('(pointer:coarse)').matches, alpha:false, powerPreference:'default' }); }
  catch(_){ return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, matchMedia('(pointer:coarse)').matches?1.4:1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.2;
  renderer.domElement.style.width='100%'; renderer.domElement.style.height='100%'; host.appendChild(renderer.domElement);
  buildScene(); setupControls(); window.addEventListener('resize', resize); resize(); loop(performance.now()); return true;
}

window.courtyard3D = {
  enter(){ if(!renderer){ if(!setup()) return false; } host.classList.remove('hidden'); host.style.pointerEvents='auto'; entered=true; last=performance.now(); resize(); return true; },
  exit(){ host.classList.add('hidden'); host.style.pointerEvents='none'; entered=false; },
  getCameraYaw(){ return cameraYaw; },
  sync({ player, others, name, bubble }){
    if(!entered || !scene || !avatar) return;
    const pos = mapPosition(player); avatar.position.x=pos.x; avatar.position.z=pos.z; assignLabel(avatar, name||'Bạn'); assignBubble(avatar, bubble||''); updateCamera(pos);
    const seen=new Set();
    for(const p of others||[]){
      if(p.scene!=='temple') continue;
      seen.add(p.id);
      let o=peers.get(p.id);
      if(!o){ const group=makePerson(p.color||'#88a8a5'); scene.add(group); o={group}; peers.set(p.id,o); }
      const pp=mapPosition(p); o.group.position.x=pp.x; o.group.position.z=pp.z; o.moving=p.moving; assignLabel(o.group,p.name||'Khách'); assignBubble(o.group,p.chat||'');
    }
    for(const [id,o] of peers){ if(!seen.has(id)){ scene.remove(o.group); peers.delete(id); } }
  }
};

window.dispatchEvent(new Event('courtyard3d-ready'));
