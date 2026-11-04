"""Create a coherent, complete duck inflatable GLB for Xả Stress Online.
Coordinate system: Y-up, duck faces +Z, ground/water base at y=0.
"""
import os, math
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix

DEST=os.path.join(os.path.dirname(__file__),'assets','phao-con-vit-3d.glb')
scene=trimesh.Scene()

def tint(mesh, color, name):
    hx=color.lstrip('#')
    rgb=[int(hx[i:i+2],16) for i in (0,2,4)]
    mesh.visual.face_colors=np.array([rgb+[255]]*len(mesh.faces), dtype=np.uint8)
    scene.add_geometry(mesh,node_name=name,geom_name=name)

def ellipsoid(name, pos, scale, color, count=(32,16)):
    mesh=trimesh.creation.uv_sphere(radius=1.0,count=count)
    mesh.apply_scale(scale)
    mesh.apply_translation(pos)
    tint(mesh,color,name)

def torus(name,R,r,y,color,sections=80,sides=20):
    vertices=[];faces=[]
    for i in range(sections):
        a=2*math.pi*i/sections
        ca,sa=math.cos(a),math.sin(a)
        for j in range(sides):
            b=2*math.pi*j/sides
            rr=R+r*math.cos(b)
            vertices.append([rr*ca,y+r*math.sin(b),rr*sa])
    for i in range(sections):
        for j in range(sides):
            a=i*sides+j;b=((i+1)%sections)*sides+j
            c=((i+1)%sections)*sides+(j+1)%sides;d=i*sides+(j+1)%sides
            faces.extend([[a,d,b],[b,d,c]])
    tint(trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces),process=False),color,name)

def cone_side(name,r,h,pos,color,axis='z',sections=32):
    mesh=trimesh.creation.cone(radius=r,height=h,sections=sections)
    if axis=='z':
        mesh.apply_transform(rotation_matrix(math.pi/2,[1,0,0])) # +z local moves toward -y; instead rotate around x +90 maps +z to -y
        mesh.apply_transform(rotation_matrix(math.pi,[1,0,0]))
    elif axis=='y': mesh.apply_transform(rotation_matrix(-math.pi/2,[1,0,0]))
    mesh.apply_translation(pos)
    tint(mesh,color,name)

# true continuous tube, no gaps between segments
# base of tube floats near water surface; the depression is a seat, not a solid cone.
torus('DuckRing_MainYellow',.94,.245,.34,'#f8d846',96,24)
torus('DuckRing_LowerHighlight',.94,.032,.185,'#e9b828',96,8)
torus('DuckRing_UpperSeam',.94,.036,.581,'#fff0a2',96,8)
# flexible seat disc across ring's hole, sits slightly beneath rim
ellipsoid('DuckSeat_BeigeWeb',[0,.25,-.015],[.70,.075,.70],'#ffe7a1',(40,14))
ellipsoid('DuckSeat_Cushion',[0,.32,-.15],[.48,.095,.5],'#fff1b7',(36,14))
# main duck body and the head/neck rise from the front of the ring, rather than floating above.
ellipsoid('DuckChest_Connected',[0,.63,.92],[.52,.55,.52],'#f8d846',(40,22))
ellipsoid('DuckNeck_Connected',[0,.92,1.05],[.30,.45,.30],'#f8d846',(36,20))
ellipsoid('DuckHead_Main',[0,1.19,1.10],[.40,.39,.39],'#f8d846',(40,20))
ellipsoid('DuckCheek_L',[ -.29,1.09,1.25],[.17,.16,.19],'#ffdf62',(20,14))
ellipsoid('DuckCheek_R',[ .29,1.09,1.25],[.17,.16,.19],'#ffdf62',(20,14))
# plump orange flattened bill, top/bottom are separately sculpted, visibly connected to head
ellipsoid('DuckBill_Upper',[0,1.10,1.48],[.29,.12,.27],'#f3933e',(34,18))
ellipsoid('DuckBill_Lower',[0,1.035,1.43],[.25,.07,.24],'#d8742c',(30,14))
for s,n in [(-1,'L'),(1,'R')]:
    # eyes forward (positive z), spacing intentional
    ellipsoid('DuckEye_White_'+n,[s*.19,1.265,1.425],[.115,.123,.075],'#fffaf3',(22,12))
    ellipsoid('DuckEye_Pupil_'+n,[s*.19,1.27,1.488],[.060,.072,.034],'#262427',(20,10))
    ellipsoid('DuckEye_Glint_'+n,[s*.18-.023,1.294,1.518],[.020,.023,.011],'#ffffff',(12,8))
    ellipsoid('DuckWing_'+n,[s*.95,.405,.04],[.29,.15,.40],'#f8d846',(30,16))
    ellipsoid('DuckFeather_'+n,[s*1.12,.43,-.16],[.15,.105,.22],'#ffe77a',(22,12))
    ellipsoid('DuckBlush_'+n,[s*.305,1.07,1.388],[.08,.045,.025],'#ffba75',(16,10))
# tail feathers are attached at rear, not free floating
ellipsoid('DuckTail_Base',[0,.54,-.93],[.27,.19,.27],'#f4c636',(24,14))
for s in [-1,0,1]:
    ellipsoid('DuckTail_Feather_'+str(s),[s*.13,.68,-1.06],[.11,.19,.21],'#ffe177',(16,12))
# molded handles on left/right of the float
for s,n in [(-1,'L'),(1,'R')]:
    torus('DuckHandle_'+n,.12,.045,.60,'#efa83a',20,8) if False else None
    ellipsoid('DuckHandleGrip_'+n,[s*.72,.64,-.48],[.055,.06,.20],'#dfaa31',(18,10))

scene.export(DEST)
loaded=trimesh.load(DEST,force='scene')
print(DEST,os.path.getsize(DEST),'bytes')
print('parts:',len(loaded.geometry),'triangles:',sum(len(m.faces) for m in loaded.geometry.values()),'bounds:',loaded.bounds.tolist())
