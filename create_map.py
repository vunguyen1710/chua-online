import json, math, os
import numpy as np
import trimesh
from scipy.spatial import cKDTree
from matplotlib import pyplot as plt
from matplotlib.colors import LightSource

HERE=os.path.dirname(os.path.abspath(__file__))
GLB=os.path.join(HERE,'thung-lung-song-uon-khuc-v71.glb')
ROUTE=os.path.join(HERE,'tuyen-song-v71.json')

def rgb(s): return np.array([int(s[i:i+2],16) for i in (1,3,5)], dtype=np.uint8)
def shade_faces(mesh, colors):
    mesh.visual.face_colors=np.column_stack([np.asarray(colors,dtype=np.uint8),np.full(len(mesh.faces),255,dtype=np.uint8)])
    return mesh

def meshcolor(mesh, color):
    mesh.visual.face_colors=np.tile(np.r_[rgb(color),255],(len(mesh.faces),1))
    return mesh

def add(name,mesh):
    scene.add_geometry(mesh,node_name=name,geom_name=name)

# smooth non-self-intersecting meandering river (close loop)
N=1000
t=np.linspace(0,2*np.pi,N,endpoint=False)
r=99+15*np.sin(3*t+.38)+7*np.sin(5*t-1.1)+4*np.sin(7*t+.25)
# asymmetric bends, no self-intersections
xs=(r*np.cos(t))*1.13+7*np.sin(2*t+.5)
zs=(r*np.sin(t))*1.02+8*np.cos(3*t-.7)
centers=np.c_[xs,zs]
prev=np.roll(centers,1,axis=0); nxt=np.roll(centers,-1,axis=0)
tang=nxt-prev;tang/=np.linalg.norm(tang,axis=1)[:,None]
normals=np.c_[-tang[:,1],tang[:,0]]
# sanity: nearest non-local points >= ~width
mind=1e9
for i in range(0,N,4):
    others=np.arange(N)
    mask=np.minimum((others-i)%N,(i-others)%N)>40
    v=np.sqrt(np.sum((centers[mask]-centers[i])**2,axis=1)).min()
    mind=min(mind,v)
print('nonlocal separation:',mind)

scene=trimesh.Scene()
HALF_W=12.0
WATER_Y=.24
GRID=285
extent=198
x1=np.linspace(-extent,extent,GRID)
z1=np.linspace(-extent,extent,GRID)
X,Z=np.meshgrid(x1,z1,indexing='xy')
flat=np.c_[X.ravel(),Z.ravel()]
tree=cKDTree(centers)
dist,inds=tree.query(flat,workers=-1)
D=dist.reshape(X.shape)
# Nature style, central mountain island, ring hills and distant mountain ridges.
rad=np.hypot(X,Z)
center_mount=42*np.exp(-((X+10)/51)**2-((Z-8)/48)**2)
center_mount += 18*np.exp(-((X-34)/25)**2-((Z+38)/25)**2)
center_mount += 12*np.exp(-((X+41)/25)**2-((Z-40)/25)**2)
outer_rise=np.clip((rad-119)/80,0,1)**1.7*57
side_peaks=(14*np.exp(-((X+145)/34)**2-((Z-92)/42)**2) +
            18*np.exp(-((X-135)/40)**2-((Z+102)/38)**2) +
            13*np.exp(-((X-102)/38)**2-((Z-155)/37)**2))
ridges=1.45*np.sin(X/13+Z/21)*np.sin(Z/18-X/29)
base=2.5+center_mount+outer_rise+side_peaks+ridges
# channel bed with raised banks, water surface is clearly ABOVE the channel mesh.
# smoothstep 0 at close to center, 1 away from water
u=np.clip((D-(HALF_W-2.3))/4.4,0,1)
s=u*u*(3-2*u)
height=(-2.15)*(1-s)+(np.maximum(base,2.6))*s
# shoreline rim 1-2 metres, water always below the banks
height+=np.exp(-((D-(HALF_W+3))/2.8)**2)*.7
# terrain mesh y-up world (THREE standard)
verts=np.c_[X.ravel(),height.ravel(),Z.ravel()]
faces=np.empty(((GRID-1)*(GRID-1)*2,3),dtype=np.int64)
k=0
for iz in range(GRID-1):
    for ix in range(GRID-1):
        a=iz*GRID+ix; b=a+1;c=a+GRID;d=c+1
        faces[k]=[a,c,b]; faces[k+1]=[b,c,d];k+=2
terrain=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
# vertex colors (trimesh will convert into GLB reliably)
hh=height.ravel(); dd=D.ravel()
colors=np.empty((len(verts),4),dtype=np.uint8)
colors[:,:3]=rgb('#75a56a')
colors[(hh>12),:3]=rgb('#638c55')
colors[(hh>28),:3]=rgb('#778a6b')
colors[(hh>44),:3]=rgb('#858b82')
colors[(hh>63),:3]=rgb('#acafaa')
colors[(dd>HALF_W)&(dd<HALF_W+6),:3]=rgb('#c9b68a')
colors[(dd<=HALF_W),:3]=rgb('#7a8a73')
colors[:,3]=255
terrain.visual.vertex_colors=colors
add('01_MOUNTAINS_RIVERBED',terrain)

# Actual WATER geometry, continuous loop, with an irregular river coastline.
# Cross sections along river: [-w, 0, w], making a triangulated water mesh.
waterverts=[];uv=[]
for i,p in enumerate(centers):
    n=normals[i]
    for k,u in enumerate((-1.,0.,1.)):
        wp=p+u*HALF_W*n
        waterverts.append((wp[0],WATER_Y,wp[1]))
        uv.append((k/2, i/35))
waterverts=np.array(waterverts)
wf=[]
for i in range(N):
    j=(i+1)%N
    a=i*3; b=j*3
    wf.extend([[a,a+1,b],[a+1,b+1,b],[a+1,a+2,b+1],[a+2,b+2,b+1]])
water=trimesh.Trimesh(vertices=waterverts,faces=wf,process=False)
# glb vertex color smooth variation makes water obvious without special shaders
water_colors=np.empty((len(waterverts),4),dtype=np.uint8)
for i in range(N):
    c=rgb('#49bad1') if i%12<6 else rgb('#58c4d6')
    for j in range(3):
        water_colors[i*3+j,:3]=(c*.9+rgb('#91e2e9')*.1).astype(np.uint8) if j!=1 else c
        water_colors[i*3+j,3]=255
water.visual.vertex_colors=water_colors
add('02_VISIBLE_RIVER_WATER',water)

# Sand shallows near water, separate 2 side bands above terrain not necessary (terrain texture handles banks)
# Add wood dock on outer shore at a wide open bend.
start_idx=118
P=centers[start_idx]
# decide outward normal from river side via radial dot
n=normals[start_idx].copy()
if np.dot(n,P)<0:n=-n
outer=P+n*(HALF_W+3.4)
# dock extends from outer bank toward the river center
mid=P+n*8.5
angle=math.atan2(n[1],n[0])
# boxes align using trimesh standard local XYZ (width along X, length along Z)
T=np.eye(4)
# local z axis along n (using yaw)
yaw=math.atan2(n[0],n[1])
T[:3,:3]=trimesh.transformations.rotation_matrix(yaw,[0,1,0])[:3,:3]

def local_box(name,extents,pos,color):
    m=trimesh.creation.box(extents=extents)
    m.apply_transform(T)
    m.apply_translation([pos[0],pos[1],pos[2]])
    add(name,meshcolor(m,color))

# wide deck on top shore and river near water
local_box('03_WOOD_DOCK',[8.8,.38,11.5],[mid[0],1.2,mid[1]],'#927049')
for a in (-3.5,-1.2,1.2,3.5):
    for b in (-3.8,3.8):
        pos=np.array([mid[0],0,mid[1]])+T[:3,:3]@np.array([a,0,b])
        c=trimesh.creation.cylinder(radius=.14,height=3.2,sections=10)
        c.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
        c.apply_translation([pos[0],-.2,pos[2]])
        add('03_DOCK_POST',meshcolor(c,'#68492f'))
# Docks are not blocking the water route.

# Forest clusters aggregate into small number of meshes
rng=np.random.default_rng(1122)
tree_trunks=[];tree_leaves=[]; rock_meshes=[]
for i in range(230):
    x=float(rng.uniform(-178,178));z=float(rng.uniform(-178,178))
    if np.hypot(x-mid[0],z-mid[1])<18: continue
    d=float(tree.query([x,z])[0])
    if d<HALF_W+12:continue
    ix=np.clip(np.searchsorted(x1,x),0,GRID-1);iz=np.clip(np.searchsorted(z1,z),0,GRID-1)
    h=float(height[iz,ix])
    if h<3 or h>52:continue
    scale=float(rng.uniform(.7,1.6))
    trunk=trimesh.creation.cylinder(radius=.15*scale,height=2.5*scale,sections=7)
    trunk.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
    trunk.apply_translation((x,h+1.25*scale,z));tree_trunks.append(trunk)
    for ww,hh_,dy in [(1.7,3.4,3.3),(1.35,3.0,4.6),(.95,2.4,5.6)]:
        leaf=trimesh.creation.cone(radius=ww*scale,height=hh_*scale,sections=8)
        leaf.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
        leaf.apply_translation((x,h+dy*scale,z));tree_leaves.append(leaf)
if tree_trunks:add('04_FOREST_TRUNKS',meshcolor(trimesh.util.concatenate(tree_trunks),'#6d4d34'))
if tree_leaves:add('05_FOREST_PINES',meshcolor(trimesh.util.concatenate(tree_leaves),'#41744c'))
for i in range(100):
    x=float(rng.uniform(-185,185));z=float(rng.uniform(-185,185))
    if tree.query([x,z])[0]<HALF_W+7:continue
    ix=np.clip(np.searchsorted(x1,x),0,GRID-1);iz=np.clip(np.searchsorted(z1,z),0,GRID-1)
    h=float(height[iz,ix]);
    if h<1.5:continue
    m=trimesh.creation.icosphere(subdivisions=1,radius=float(rng.uniform(.55,2.0)))
    m.apply_scale([1.2,.75,1]);m.apply_translation([x,h+.45,z]);rock_meshes.append(m)
if rock_meshes:add('06_ROCKS',meshcolor(trimesh.util.concatenate(rock_meshes),'#8e918c'))

# Route with water-level coordinates and segment distances for code integration later
route=[]
for i,p in enumerate(centers):
    route.append({'x':round(float(p[0]),4),'y':float(WATER_Y),'z':round(float(p[1]),4)})

metadata={
 'format':'xastress-river-loop-v3',
 'version':'7.1-model-only',
 'units':'3d-meters',
 'bounds':{'minX':-extent,'maxX':extent,'minZ':-extent,'maxZ':extent},
 'river':{'closedLoop':True,'averageWidth':HALF_W*2,'waterSurfaceY':WATER_Y,'waypointCount':N,'startIndex':start_idx,'safeDriftMax':HALF_W-3.6},
 'entryDeck':{'x':round(float(mid[0]),4),'y':1.2,'z':round(float(mid[1]),4),'pointIndex':start_idx},
 'floatingPath':route,
 'notes':'Standalone model only; no edits to deployed game. Continuous river mesh. Avoid banks by clamping lateral drift to river half-width minus the inflatable radius.'
}
with open(ROUTE,'w',encoding='utf-8') as f:json.dump(metadata,f,ensure_ascii=False,indent=2)
scene.export(GLB)
print('saved',GLB,os.stat(GLB).st_size,'triangles',sum(len(g.faces) for g in scene.geometry.values()),'nodes',len(scene.geometry))

# Preview maps grounded in generated mesh geometry (not AI generated)
fig,ax=plt.subplots(figsize=(11,10))

from matplotlib.colors import LinearSegmentedColormap
land_cmap=LinearSegmentedColormap.from_list('land',['#3e6e4d','#74a465','#567f48','#748567','#b8b3a4'],N=256)
ax.imshow(LightSource(315,45).shade(height,cmap=land_cmap,vert_exag=1.2,blend_mode='soft',vmin=-3,vmax=76),extent=(-extent,extent,-extent,extent),origin='lower')
ax.fill(xs,np.nan) if False else None
ax.fill(np.r_[centers[:,0]+normals[:,0]*HALF_W,(centers[::-1,0]-normals[::-1,0]*HALF_W)],np.r_[centers[:,1]+normals[:,1]*HALF_W,(centers[::-1,1]-normals[::-1,1]*HALF_W)],color='#45bcd5',alpha=.93)
ax.scatter([mid[0]],[mid[1]],s=80,c='#e3a764',edgecolors='#56351b',linewidths=1.4,zorder=8)
ax.annotate('BẾN XUẤT PHÁT',xy=(mid[0],mid[1]),xytext=(mid[0]+22,mid[1]+24),color='white',fontsize=10,weight='bold',arrowprops=dict(arrowstyle='->',color='white'))
ax.set_xlim(-185,185);ax.set_ylim(-185,185);ax.set_aspect('equal');ax.set_facecolor('#788f74');ax.set_axis_off()
ax.set_title('THUNG LŨNG TRÔI SÔNG 3D • MÔ HÌNH V7.1',fontsize=18,pad=12,weight='bold')
fig.tight_layout();fig.savefig(os.path.join(HERE,'ban-do-nhin-tren.png'),dpi=170,facecolor='white');plt.close(fig)

# perspective preview of generated height mesh, water path extrusion, for inspection
from mpl_toolkits.mplot3d import Axes3D
fig=plt.figure(figsize=(12,8)); ax=fig.add_subplot(111,projection='3d')
sub=3
ax.plot_surface(X[::sub,::sub],Z[::sub,::sub],height[::sub,::sub],rstride=1,cstride=1,facecolors=land_cmap(np.clip((height[::sub,::sub]+3)/76,0,1)),linewidth=0,antialiased=False,shade=True)
# matplotlib coords z-up layout: X, Z, H
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
verts_surface=[]
for i in range(0,N,2):
 j=(i+2)%N
 a=centers[i];b=centers[j];na=normals[i];nb=normals[j]
 verts_surface.append([[*(a+na*HALF_W),WATER_Y],[*(a-na*HALF_W),WATER_Y],[*(b-nb*HALF_W),WATER_Y],[*(b+nb*HALF_W),WATER_Y]])
coll=Poly3DCollection(verts_surface,facecolor='#44bbd1',edgecolor='none',alpha=.97);ax.add_collection3d(coll)
ax.view_init(elev=52,azim=-64);ax.set_box_aspect((1,1,.26));ax.set_xlim(-190,190);ax.set_ylim(-190,190);ax.set_zlim(-5,80);ax.set_axis_off();fig.tight_layout()
fig.savefig(os.path.join(HERE,'ban-do-goc-nghieng.png'),dpi=150,facecolor='white');plt.close(fig)

# geometry sanity tests
loaded=trimesh.load(GLB,force='scene')
print('verified geometry',[(k,len(v.faces)) for k,v in loaded.geometry.items()])
print('terrain min/max',height.min(),height.max(),'channel center <= water',np.mean(height[D < 8]<WATER_Y),'bank above water',np.mean(height[(D>16)&(D<22)]>WATER_Y))
print('river bounds',centers.min(axis=0),centers.max(axis=0),'min distant bend separation',mind)
assert np.mean(height[D<8]<WATER_Y)>.995
assert np.mean(height[(D>16)&(D<22)]>WATER_Y)>.995
assert len(loaded.geometry)>=5
