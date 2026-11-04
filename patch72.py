from pathlib import Path
p=Path(__file__).parent/'river3d.js'
s=p.read_text()
s=s.replace("let camOrbit=0,camHeight=4.8,camDistance=8.3,drag=null,entry=null,boarding=0;", "let camOrbit=0,camHeight=11,camDistance=13,drag=null,entry=null,boarding=0,cameraInitialized=false;")
s=s.replace("  if(waterStrip){ scene.remove(waterStrip); waterStrip.geometry?.dispose?.(); waterStrip.material?.dispose?.(); waterStrip=null; }\n  waterStrip = buildWaterSurface(points, d.river?.averageWidth || 19);\n  if(waterStrip){ scene.add(waterStrip); water = waterStrip; }",
"  // The v7.1 GLB already contains the full river water surface. Do not add a second translucent strip.\n  if(waterStrip){ scene.remove(waterStrip); waterStrip.geometry?.dispose?.(); waterStrip.material?.dispose?.(); waterStrip=null; }")
s=s.replace("    console.error('River GLB load failed',err);document.getElementById('riverStatus').textContent='Không tải được mô hình thung lũng. Hãy tải lại trang.';", "    console.error('River GLB load failed',err);document.getElementById('riverStatus').textContent='Lỗi tải bản đồ sông 3D. Kiểm tra kết nối và tải lại trang.';")
s=s.replace("  const loader=new GLTFLoader();", "  const loader=new GLTFLoader();")
s=s.replace("camHeight=THREE.MathUtils.clamp(camHeight+(drag.y-e.clientY)*.025,3.2,17)","camHeight=THREE.MathUtils.clamp(camHeight+(drag.y-e.clientY)*.025,7,30)")
s=s.replace("camDistance=THREE.MathUtils.clamp(camDistance+e.deltaY*.012,5.5,25)","camDistance=THREE.MathUtils.clamp(camDistance+e.deltaY*.012,7,35)")
start=s.index('  let center,tangent;\n', s.index('function frame(now)'))
end=s.index('  const backward=looping?',start)
new='''  let center,tangent;
  const localProfile=profileFor('local');
  if(looping && points.length){
    boarding=Math.min(1.6,boarding+dt);
    if(boarding>=1.6){ travelled+=speed*(1+localProfile.speedSway*Math.sin(now*.0009 + localProfile.bobPhase))*dt; }
    riverIndex=(startDistance+travelled)%totalDistance;
    const newLaps=Math.floor(travelled/totalDistance);
    if(newLaps!==laps){laps=newLaps;document.getElementById('riverLaps').textContent=String(laps);}
    center=floatingPoint(riverIndex);
    tangent=floatingPoint(riverIndex+2.2).sub(floatingPoint(riverIndex-2.2)).normalize();
    // Different players vary in gentle lateral sway. The safeDriftMax prevents ever touching banks.
    const nrm=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    const safe=Math.max(0.25,Math.min(2.0,(riverHalfWidth-3.2)*.25));
    const sway=THREE.MathUtils.clamp(localProfile.laneBias+Math.sin(now*.0005+localProfile.rollPhase)*localProfile.swayAmp,-safe,safe);
    center.addScaledVector(nrm,sway);
    if(boarding<1.6){ const u=THREE.MathUtils.smoothstep(boarding/1.6,0,1); center.lerpVectors(new THREE.Vector3(entry.x,entry.y+.3,entry.z),center,u); }
    center.y += Math.sin(now*.0035+localProfile.bobPhase)*localProfile.bobAmp;
    document.getElementById('riverProgress').textContent=Math.round((travelled%totalDistance)/totalDistance*100)+'%';
  }else{
    center=new THREE.Vector3(entry.x,entry.y+.3,entry.z);
    tangent=floatingPoint(startDistance+3).sub(floatingPoint(startDistance-3)).normalize();
  }
  player.position.copy(center);
  if(looping){
    setFloatingPose(player,true);
    player.rotation.y = Math.atan2(tangent.x,tangent.z) + localProfile.yawOffset + Math.sin(now*.0007+localProfile.rollPhase)*.02;
    player.userData.body.rotation.x = -.45 + Math.sin(now*.0028+localProfile.rollPhase)*localProfile.pitchAmp;
    player.userData.body.rotation.z = Math.sin(now*.0021+localProfile.rollPhase)*localProfile.rollAmp;
  }else{
    setFloatingPose(player,false);
    player.rotation.y=Math.atan2(tangent.x,tangent.z);
  }
'''
s=s[:start]+new+s[end:]
s=s.replace("let mapBounds={minX:-210,maxX:210,minZ:-210,maxZ:210};", "let mapBounds={minX:-198,maxX:198,minZ:-198,maxZ:198},riverHalfWidth=12;")
s=s.replace("  if(d.bounds) mapBounds=d.bounds;\n  entry=d.entryDeck;", "  if(d.bounds) mapBounds=d.bounds;\n  riverHalfWidth=(d.river?.averageWidth||24)*.5;\n  entry=d.entryDeck;")
s=s.replace("  const backward=looping?tangent.clone().multiplyScalar(-camDistance):new THREE.Vector3(0,0,camDistance);", "  const backward=tangent.clone().multiplyScalar(-camDistance);")
s=s.replace("  const target=new THREE.Vector3(player.position.x,player.position.y+.72,player.position.z);\n  const desired=target.clone().add(new THREE.Vector3(dx,camHeight,dz));\n  camera.position.lerp(desired,.055);camera.lookAt(target);",
"  const target=new THREE.Vector3(player.position.x,player.position.y+.72,player.position.z);\n  const desired=target.clone().add(new THREE.Vector3(dx, looping ? Math.max(7,camHeight) : Math.max(17,camHeight), dz));\n  // Snap on first frame: never fly the camera from world origin through a mountain.\n  if(!cameraInitialized){ camera.position.copy(desired); cameraInitialized=true; }\n  else camera.position.lerp(desired,.12);\n  camera.lookAt(target);")
s=s.replace("  if(waterStrip){ waterStrip.position.y = Math.sin(now*.0012)*.03; if(waterStrip.material){ waterStrip.material.opacity = 0.88 + Math.sin(now*.0018)*.04; waterStrip.material.color.setHSL(0.53,0.62,0.53 + Math.sin(now*.0009)*0.03); } }", "  // Water is part of the verified GLB; no duplicate water mesh is animated over it.")
s=s.replace("  enter(){if(!renderer&&!create())return false;host.classList.remove('hidden');host.style.pointerEvents='auto';entered=true;clock=performance.now();resize();return true},",
"  enter(){if(!renderer&&!create())return false;host.classList.remove('hidden');host.style.pointerEvents='auto';entered=true;clock=performance.now();cameraInitialized=false;camHeight=11;camDistance=13;resize();return true},")
s=s.replace("  start(){if(!points.length||!loaderReady)return false;looping=true;boarding=0;", "  start(){if(!points.length||!loaderReady)return false;looping=true;boarding=0;cameraInitialized=false;")
s=s.replace("  stop(){looping=false;", "  stop(){looping=false;cameraInitialized=false;")
s=s.replace('v=7.0.0','v=7.2.0')
p.write_text(s)

idx=Path(__file__).parent/'index.html'
i=idx.read_text().replace('v7.0','v7.2').replace('v=7.0.0','v=7.2.0')
idx.write_text(i)

readme=Path(__file__).parent/'README.md'
readme.write_text('''# Xả Stress Online 7.2 — sửa khu trôi sông để chơi được\n\n- Thay map sông v7.0 lỗi bằng **mô hình 3D v7.1**, có địa hình núi và nước nằm sẵn trong GLB.\n- **Không tự vẽ đè** mặt nước thứ hai, tránh lỗi chồng hình.\n- **Sửa lỗi `localProfile is not defined`** khiến animation đóng băng khi bắt đầu trôi.\n- Camera xuất hiện trực tiếp trên bến ở góc cao; không chạy xuyên địa hình từ gốc 0,0,0.\n- Phần phao vịt trôi theo đường sông khép kín 1.000 waypoint; giới hạn lệch ngang trong lòng sông.\n- Mỗi người có nhịp lắc/bồng bềnh khác nhau.\n- Giữ nguyên multiplayer, các khu khác, dữ liệu Cây Khẩu Nghiệp.\n\nTriển khai: giải nén toàn bộ project vào repository, Render deploy latest commit. Kiểm tra nhãn v7.2 và Ctrl+F5.\n\nĐã kiểm tra: cú pháp JS, cấu trúc GLB, JSON, ZIP. Chưa kiểm thử WebGL thực tế trên trình duyệt của người dùng.\n''')
