"""Build a native GLB mesh for Chùa Online: ornate Vietnamese Quan Âm hall (outside model).
Coordinate system: Y up, temple front faces +Z, local origin at the ground center.
No Blender, image billboards, or external model needed. Requires trimesh & numpy.
"""
from collections import defaultdict
from pathlib import Path
import math
import numpy as np
import trimesh

PARTS=defaultdict(list)

def add(mesh, color):
    PARTS[color].append(mesh)

def block(x,y,z,w,h,d,color):
    m=trimesh.creation.box(extents=[w,h,d]);m.apply_translation([x,y,z]);add(m,color)

def cylinder(x,y,z,r,h,color,n=20, axis='y'):
    m=trimesh.creation.cylinder(r,h,sections=n)
    if axis=='y': m.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
    if axis=='x': m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
    m.apply_translation([x,y,z]);add(m,color)

def ball(x,y,z,rx,ry,rz,color,level=1):
    m=trimesh.creation.icosphere(subdivisions=level,radius=1.0);m.apply_scale([rx,ry,rz]);m.apply_translation([x,y,z]);add(m,color)

def beam(a,b,r,color,n=8):
    a=np.array(a,float);b=np.array(b,float);v=b-a;h=np.linalg.norm(v)
    if h<1e-6:return
    m=trimesh.creation.cylinder(r,h,sections=n)
    m.apply_transform(trimesh.geometry.align_vectors([0,0,1],v/h))
    m.apply_translation((a+b)/2);add(m,color)

def prism(x,z,w,d,y,h,color):
    hw=w/2;hd=d/2
    vv=np.array([[x-hw,y,z-hd],[x+hw,y,z-hd],[x,y+h,z-hd],
                 [x-hw,y,z+hd],[x+hw,y,z+hd],[x,y+h,z+hd]])
    ff=np.array([[0,2,1],[3,4,5],[0,3,5],[0,5,2],[2,5,4],[2,4,1],[0,1,4],[0,4,3]])
    m=trimesh.Trimesh(vertices=vv,faces=ff,process=False);add(m,color)

def roof(x,z,w,d,y,rise,color, tilecolor, name=''):
    # aligned gable, eave rests on horizontal cross-beams
    prism(x,z,w,d,y,rise,color)
    for zz in [z-d/2+.04,z+d/2-.04]:
        beam([x-w/2,y,zz],[x,y+rise,zz],.085,'#e2ac58')
        beam([x,y+rise,zz],[x+w/2,y,zz],.085,'#e2ac58')
        block(x,y-.05,zz,w,.13,.18,'#a9552d')
    beam([x,y+rise+.09,z-d/2],[x,y+rise+.09,z+d/2],.14,'#e5b861')
    # individual curved tile lanes, affordable count, atop roof and following slope
    for side in (-1,1):
        for k in range(1,11):
            t=k/11
            xx=x+side*t*w/2
            yy=y+rise*(1-t)+.045
            beam([xx,yy,z-d/2+.10],[xx,yy,z+d/2-.10],.032,tilecolor,6)
        # roof end finials
        for zz in (z-d/2,z+d/2):
            ball(x+side*w/2,y+.11,zz,.16,.18,.16,'#f3c577',1)
    for zz in (z-d/2,z+d/2):
        ball(x,y+rise+.24,zz,.22,.3,.22,'#f2c577',1)

# Palette with lacquered red wood and gold accents
STONE='#b9aaa0';STEPS='#ddd2c0';LIGHTSTONE='#f1e9d6'
CREAM='#f2dfbd';IVORY='#f8eacb';RED='#8b3026';MAROON='#67221d';WOOD='#653222';DARK='#321d1b'
GOLD='#ddae55';GOLDHI='#f5d28a';BRONZE='#a37539';TERRACOTTA='#aa4e2d';TILE='#c66a3a';SHADE='#73351f'
PINK='#e6a6b5';LEAF='#517b43';BROWN='#72543d';LANTERN='#fac56a'

# Continuous stone podium and steps
block(0,.52,.0,25.7,1.04,14,STONE)
block(0,1.06,-.12,22.6,.13,11.8,LIGHTSTONE)
for i in range(5):
    # broad staircase with taller steps near the top
    block(0,.14+i*.18,8.8-i*.80,10.0-i*.22,.26,1.02,STEPS if i%2==0 else CREAM)
for side in [-1,1]:
    block(side*6.12,.82,6.05,.55,.62,1.12,LIGHTSTONE)
    ball(side*6.12,1.31,6.05,.33,.36,.33,STONE)

# Building shell: strong geometry and symmetrical proportions
block(0,3.53,-5.68,18.5,5.0,.72,CREAM)
block(-9.14,3.51,-.65,.70,5.03,10.4,CREAM)
block(9.14,3.51,-.65,.70,5.03,10.4,CREAM)
block(0,5.9,-.65,19.0,.28,10.4,MAROON)
# left/right side annexes
for side in [-1,1]:
    sx=side*11.5
    block(sx,3.18,-1.45,5.35,4.10,6.45,CREAM)
    block(sx,1.24,-1.43,5.65,.25,6.65,STONE)
    block(sx,4.95,-1.45,5.6,.19,6.7,GOLD)
    # wood lattice window facing forward (+Z)
    block(sx,3.10,1.88,2.8,2.42,.15,DARK)
    block(sx,3.1,1.98,2.47,2.11,.08,WOOD)
    for k in range(-3,4):block(sx+k*.34,3.1,2.07,.045,1.97,.07,GOLD)
    for yy in (2.45,3.1,3.75):block(sx,yy,2.08,2.47,.05,.07,GOLD)

# Door: centered, wood, framed, wide enough to enter visually
block(0,3.14,4.75,7.50,4.24,.22,MAROON)
for side in [-1,1]:
    sx=side*1.86
    block(sx,3.14,4.89,3.45,3.94,.13,WOOD)
    for dx in (-1.05,-.34,.34,1.05):block(sx+dx,3.13,4.97,.065,3.66,.07,GOLD)
    for yy in (1.98,3.06,4.18):block(sx,yy,4.975,3.32,.07,.07,GOLD)
    cylinder(side*.23,3.03,5.00,.095,.08,GOLD,12,axis='z')
block(0,5.32,4.71,8.10,.25,.54,GOLD)

# Temple porch columns: all columns exactly aligned to z=4.52,
# bases flush to platform y=1.12 and capitals touch support beam y=6.36.
block(0,6.30,4.5,19.2,.37,.85,MAROON)
block(0,6.49,4.5,19.2,.11,.90,GOLD)
COLUMN_X=[-8.0,-5.65,-3.72,3.72,5.65,8.0]  # no column in door center
for x in COLUMN_X:
    cylinder(x,3.72,4.52,.36,4.92,RED,28) # bottom 1.26, top 6.18
    cylinder(x,1.19,4.52,.55,.18,STONE,24)
    cylinder(x,1.35,4.52,.50,.14,GOLD,24)
    cylinder(x,6.17,4.52,.52,.18,GOLDHI,24)
    # carved collar rings at column ends
    cylinder(x,5.98,4.52,.41,.08,GOLD,24)
    cylinder(x,1.51,4.52,.41,.08,GOLD,24)
# side balustrades, gap kept in front of central door
for side in (-1,1):
    bx=side*6.96
    block(bx,2.02,5.47,4.15,.19,.25,CREAM)
    for i in range(-2,3):block(bx+i*.8,1.58,5.47,.13,.85,.16,CREAM)

# Decorative console brackets between columns and roof beam
for x in COLUMN_X:
    for side in (-1,1):
        beam([x,6.15,4.5],[x+side*.45,6.46,4.5],.095,GOLD)
    ball(x,6.40,4.51,.12,.12,.12,GOLDHI,1)

# Main sweeping orange terracotta roofs with two tiers
roof(0,1.4,21.0,9.2,6.60,2.15,TERRACOTTA,TILE,'lower tier')
block(0,7.55,-1.45,13.2,1.65,5.10,CREAM)
for x in (-5.7,-3.8,0,3.8,5.7):
    block(x,7.45,1.20,.22,1.25,.18,GOLD)
roof(0,-1.45,15.3,6.5,8.32,1.7,SHADE,TILE,'upper tier')
for side in [-1,1]:
    roof(side*11.5,-1.45,6.5,7.0,5.37,1.05,SHADE,TILE,'side roofs')

# Grand wooden plaque at entrance below lower roof eaves, NOT floating over doorway
block(0,5.66,5.14,6.65,.95,.30,DARK)
block(0,6.19,5.15,6.85,.095,.35,GOLD)
block(0,5.13,5.15,6.85,.095,.35,GOLD)
for x in (-3.25,3.25):block(x,5.66,5.16,.09,1.10,.39,GOLD)
for x in np.linspace(-2.8,2.8,9):
    block(x,5.17,5.37,.045,.20,.02,GOLD)

# Decorative golden lotus motifs and hanging lamps under eaves
for side in (-1,1):
    sx=side*8.58
    ball(sx,4.40,4.86,.29,.29,.10,GOLD,2)
    for angle in np.linspace(0,2*math.pi,8,endpoint=False):
        ball(sx+.34*math.cos(angle),4.40+.34*math.sin(angle),4.88,.13,.23,.075,GOLDHI,1)

# Winding side column panels, flower vases and folk lanterns
for side in (-1,1):
    x=side*8.10
    cylinder(x,1.63,6.02,.46,.88,BROWN,18)
    cylinder(x,2.14,6.02,.42,.12,GOLD,18)
    for theta in np.linspace(0,2*math.pi,6,endpoint=False):
        xx=x+.33*math.sin(theta);zz=6.02+.33*math.cos(theta)
        beam([x,2.10,6.02],[xx,2.90,zz],.025,LEAF,6)
        ball(xx,2.92,zz,.15,.15,.16,PINK,1)
    # altar guardians: stone lions, simple low-poly sculptures
    ball(side*8.9,1.45,5.92,.48,.42,.43,LIGHTSTONE,1)
    ball(side*8.9,1.84,5.98,.27,.28,.28,LIGHTSTONE,1)

# Entrance lanterns -- paired front corner pillars, hanging from an overhead bracket
for x in (-6.45,6.45):
    beam([x,6.16,5.15],[x,4.85,5.15],.025,GOLD,8)
    cylinder(x,4.64,5.15,.26,.50,LANTERN,10)
    cylinder(x,4.96,5.15,.31,.10,GOLD,12)
    cylinder(x,4.32,5.15,.31,.09,GOLD,12)
    beam([x,4.22,5.15],[x,3.96,5.15],.03,RED,8)

# Carved roof-tip ornaments and corner decoration
for zz in (-3.17,5.97):
    for x in (-10.5,10.5):
        ball(x,6.76,zz,.19,.24,.19,GOLDHI,1)
        beam([x,6.6,zz],[x+math.copysign(.55,x),7.00,zz],.08,GOLD,8)

# Export material-grouped, single binary scene. The asset is geometry, not an image/plane.
scene=trimesh.Scene()
for i,(color,meshes) in enumerate(PARTS.items()):
    combined=trimesh.util.concatenate(meshes)
    rgb=[int(color[j:j+2],16) for j in (1,3,5)]
    combined.visual.face_colors=np.tile(rgb+[255],(len(combined.faces),1))
    scene.add_geometry(combined,node_name=f'Material_{i:02d}_{color[1:]}')
out=Path('/mnt/data/quan_am_v57/assets/dien-quan-am-3d.glb')
out.parent.mkdir(parents=True,exist_ok=True)
scene.export(str(out))
loaded=trimesh.load(out,force='scene')
print('OUTPUT',out,'BYTES',out.stat().st_size,'GEOMETRIES',len(loaded.geometry),'TRIANGLES',sum(len(g.faces) for g in loaded.geometry.values()),'BOUNDS',loaded.bounds)
