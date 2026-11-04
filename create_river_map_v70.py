import os, json, math
import numpy as np
import trimesh
from trimesh.creation import box, cylinder, icosphere
from trimesh.transformations import rotation_matrix

OUTDIR='/mnt/data/xastress70/assets'
os.makedirs(OUTDIR, exist_ok=True)
GLB=os.path.join(OUTDIR,'thung-lung-song-vong-tron-3d.glb')
ROUTE=os.path.join(OUTDIR,'river-route.json')

# ---------- helpers ----------
def rgba(hexcolor, a=255):
    h=hexcolor.lstrip('#')
    return [int(h[i:i+2],16) for i in (0,2,4)] + [a]

def color_mesh(mesh, color):
    mesh.visual.face_colors = np.tile(rgba(color), (len(mesh.faces),1))
    return mesh

scene=trimesh.Scene()

# ---------- route ----------
N=720
# larger, curvier loop
pts=[]
for i in range(N):
    t=2*math.pi*i/N
    r=116 + 20*math.sin(3*t+0.45) + 16*math.cos(5*t-0.2) + 9*math.sin(8*t+1.1)
    x=(r+8*math.cos(2*t))*math.cos(t)*1.05
    z=(r+20+12*math.sin(2*t-0.7))*math.sin(t)*1.12
    y=-0.35 + 0.05*math.sin(4*t) - 0.02*math.cos(7*t)
    pts.append((x,y,z))
pts=np.array(pts,float)
# smooth a bit cyclically
for _ in range(2):
    pts = (np.roll(pts,1,axis=0)+pts*2+np.roll(pts,-1,axis=0))/4

# choose start index near north-east-ish straighter area
start_idx=96
entry_pt=pts[start_idx]
next_pt=pts[(start_idx+1)%N]
prev_pt=pts[(start_idx-1)%N]
dir_vec=(next_pt-prev_pt); dir_vec=dir_vec/np.linalg.norm(dir_vec)
normal=np.array([-dir_vec[2],0,dir_vec[0]])

dock_center = entry_pt + normal*15.5 + np.array([0,0.85,0])

# ---------- terrain grid ----------
size_x=420
size_z=420
nx=nz=150
xs=np.linspace(-size_x/2,size_x/2,nx)
zs=np.linspace(-size_z/2,size_z/2,nz)
X,Z=np.meshgrid(xs,zs)
R=np.sqrt(X**2 + Z**2)
# base terrain
H = 1.8 + 0.4*np.sin(X/18.0)*np.cos(Z/15.0)
# outer mountains / walls
outer=np.clip((R-120)/85,0,1)
H += outer**1.8 * 62
# central island/hills
H += 28*np.exp(-((X/55)**2 + (Z/70)**2))
H += 9*np.exp(-(((X+45)/24)**2 + ((Z-35)/18)**2))
H += 7*np.exp(-(((X-55)/22)**2 + ((Z+25)/18)**2))
# distance to river centerline using chunks
P = np.stack([X.ravel(), Z.ravel()], axis=1)
river2 = pts[:,[0,2]]
min_d2 = np.full(len(P), np.inf)
chunk=120
for i in range(0, len(river2), chunk):
    C = river2[i:i+chunk]
    d2 = ((P[:,None,:]-C[None,:,:])**2).sum(axis=2)
    md = d2.min(axis=1)
    min_d2 = np.minimum(min_d2, md)
D = np.sqrt(min_d2).reshape(X.shape)
# carve channel
river_width=26.0
channel = np.exp(-(D/(river_width*0.58))**2)
H -= channel*7.5
# riverbed shoulders / banks
H += np.exp(-((D-river_width*0.72)/(river_width*0.26))**2)*1.4
# flatten around dock area
dockdx = X-dock_center[0]
dockdz = Z-dock_center[2]
H = H*(1-np.exp(-((dockdx/12)**2+(dockdz/10)**2))*0.65) + 0.25*np.exp(-((dockdx/12)**2+(dockdz/10)**2))
# clamp low area to riverbed around water
H = np.maximum(H, -3.0)

# terrain mesh
verts=np.stack([X.ravel(), H.ravel(), Z.ravel()], axis=1)
faces=[]
for iz in range(nz-1):
    row=iz*nx
    for ix in range(nx-1):
        a=row+ix; b=a+1; c=a+nx; d=c+1
        faces.append([a,c,b]); faces.append([b,c,d])
faces=np.array(faces)
terrain=trimesh.Trimesh(vertices=verts, faces=faces, process=False)
# face colors based on average height
centers=terrain.triangles_center[:,1]
fc=np.zeros((len(terrain.faces),4),dtype=np.uint8)
for i,h in enumerate(centers):
    if h < -0.5: fc[i]=rgba('#866545')
    elif h < 3: fc[i]=rgba('#77a868')
    elif h < 16: fc[i]=rgba('#5d8c50')
    elif h < 38: fc[i]=rgba('#7b8d64')
    else: fc[i]=rgba('#8f908d')
terrain.visual.face_colors=fc
scene.add_geometry(terrain, node_name='terrain')

# ---------- dock ----------
# Build dock platform aligned tangentially
angle=math.atan2(dir_vec[2], dir_vec[0])
platform = box(extents=[9.5,0.45,5.2])
platform.apply_transform(rotation_matrix(-angle, [0,1,0]))
platform.apply_translation(dock_center + np.array([0,-0.15,0]))
color_mesh(platform,'#8a6746'); scene.add_geometry(platform, node_name='dock_platform')
for sx in (-3.4,-1.2,1.2,3.4):
    for sz in (-1.8,1.8):
        p=np.array([sx,-1.4,sz])
        leg=cylinder(radius=0.16,height=2.6,sections=10)
        leg.apply_transform(rotation_matrix(math.pi/2,[1,0,0]))
        leg.apply_transform(rotation_matrix(-angle,[0,1,0]))
        # translate local coordinate rotated
        rot=np.array([[math.cos(angle),0,math.sin(angle)],[0,1,0],[-math.sin(angle),0,math.cos(angle)]])
        tp=rot@p + dock_center + np.array([0,0.2,0])
        leg.apply_translation(tp)
        color_mesh(leg,'#65472f'); scene.add_geometry(leg)
# small sign arch
sign=box(extents=[5.8,1.0,0.24]); sign.apply_transform(rotation_matrix(-angle,[0,1,0])); sign.apply_translation(dock_center + np.array([0,3.0,0]) - normal*0.6)
color_mesh(sign,'#36584b'); scene.add_geometry(sign, node_name='dock_sign')
beam=box(extents=[0.24,3.4,0.24]);
for s in (-2.4,2.4):
    col=beam.copy(); col.apply_transform(rotation_matrix(-angle,[0,1,0]));
    pos = dock_center + np.array([0,1.45,0]) + np.array([math.cos(angle)*s,0,-math.sin(angle)*s]) - normal*0.6
    col.apply_translation(pos); color_mesh(col,'#6c4d36'); scene.add_geometry(col)

# ---------- trees and rocks (outside river only) ----------
def nearest_dist(x,z):
    d=((river2[:,0]-x)**2 + (river2[:,1]-z)**2)
    return math.sqrt(float(d.min()))

rng=np.random.default_rng(42)
for _ in range(130):
    x=float(rng.uniform(-185,185)); z=float(rng.uniform(-185,185))
    if nearest_dist(x,z) < 24: continue
    # sample terrain height
    ix=np.searchsorted(xs,x); iz=np.searchsorted(zs,z)
    if ix<=0 or ix>=nx or iz<=0 or iz>=nz: continue
    y=float(H[iz-1,ix-1])
    if y < 1.5 or y > 40: continue
    trunk=cylinder(radius=0.22,height=2.0,sections=8)
    trunk.apply_transform(rotation_matrix(math.pi/2,[1,0,0]))
    trunk.apply_translation([x,y+1.0,z])
    color_mesh(trunk,'#6a4a31'); scene.add_geometry(trunk)
    for scale,dy,col in [(1.9,3.0,'#375f34'),(1.5,4.1,'#3f6b3a'),(1.1,5.0,'#477844')]:
        cone=trimesh.creation.cone(radius=scale, height=2.8, sections=10)
        cone.apply_transform(rotation_matrix(math.pi,[1,0,0]))
        cone.apply_translation([x,y+dy,z])
        color_mesh(cone,col); scene.add_geometry(cone)
for _ in range(90):
    x=float(rng.uniform(-190,190)); z=float(rng.uniform(-190,190))
    if nearest_dist(x,z) < 22: continue
    ix=np.searchsorted(xs,x); iz=np.searchsorted(zs,z)
    if ix<=0 or ix>=nx or iz<=0 or iz>=nz: continue
    y=float(H[iz-1,ix-1])
    if y < 0.5: continue
    rock=icosphere(subdivisions=1, radius=float(rng.uniform(0.8,2.2)))
    rock.apply_scale([1.2,0.8,1.0])
    rock.apply_translation([x,y+0.7,z])
    color_mesh(rock,'#8d8d88'); scene.add_geometry(rock)

# export glb
scene.export(GLB)

# route json
route={
    'format':'xastress-river-route-v2',
    'mapUnits':'threejs',
    'bounds':{'minX':-size_x/2,'maxX':size_x/2,'minZ':-size_z/2,'maxZ':size_z/2},
    'river':{
        'type':'closed-loop',
        'waterLevel':-0.35,
        'averageWidth':river_width,
        'waypointCount':N,
        'loopsContinuously':True,
        'startIndex':start_idx
    },
    'entryDeck':{'x':float(dock_center[0]),'y':float(dock_center[1]),'z':float(dock_center[2]),'pointIndex':start_idx},
    'floatingPath':[{'x':round(float(x),3),'y':round(float(y),3),'z':round(float(z),3)} for x,y,z in pts],
    'notes':'Larger curvy closed river valley with wider terrain and dock. Water rendered at runtime, character floats only on river path.'
}
with open(ROUTE,'w',encoding='utf-8') as f:
    json.dump(route,f,ensure_ascii=False,indent=2)
print('saved',GLB, os.path.getsize(GLB))
print('saved',ROUTE)
