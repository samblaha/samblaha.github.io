"""Generate editable Blender miniatures, GLBs, and transparent shelf renders.
Run: Blender -b -P scripts/build_project_miniatures.py
"""
import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets/models/miniatures');os.makedirs(OUT,exist_ok=True)
def mat(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.32
 return m
cream=mat('Ivory polymer',(.82,.78,.64));white=mat('Porcelain',(.92,.95,.94));dark=mat('Graphite',(.035,.055,.068));silver=mat('Aluminum',(.5,.62,.65),.65);red=mat('Tin red',(.65,.04,.035));green=mat('PCB green',(.025,.3,.17));gold=mat('Gold',(.9,.57,.13),.5);blue=mat('Display blue',(.12,.64,.86));purple=mat('Quantum violet',(.4,.12,.8));wood=mat('Mahogany',(.26,.075,.035));teal=mat('Teal',(.02,.45,.42))
def box(name,loc,size,m,bevel=.05):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def sphere(name,loc,r,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=r,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cyl(name,loc,r,depth,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(m);mod=o.modifiers.new('Rim','BEVEL');mod.width=.025;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def rod(name,a,b,r,m):
 a,b=Vector(a),Vector(b);o=cyl(name,(a+b)/2,r,(b-a).length,m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def label(txt,loc,size,m):
 bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='Label '+txt;o.data.body=txt;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.004;o.data.materials.append(m);bpy.ops.object.convert(target='MESH');return o
def screen(name,w=1.4,h=1.6):
 box(name,(0,0,h/2),(w,.22,h),dark,.09);box('Display',(0,-.13,h/2+.08),(w-.2,.04,h-.34),cream,.035)
def ballrack():
 box('Wooden cabinet',(0,.09,.92),(1.65,.34,1.84),wood);box('Dark backing',(0,-.105,.92),(1.42,.025,1.60),dark,.015)
 for z in [.25,.66,1.07,1.48]:
  box('Shelf',(0,-.21,z),(1.44,.28,.055),wood,.01)
  for j,x in enumerate([-.5,-.17,.17,.5]):
   sphere('Logo golf ball',(x,-.21,z+.16),.137,white);sphere('Course emblem',(x,-.34,z+.16),.034,[teal,red,blue,gold][j])
 box('Foot',(0,0,.055),(1.9,.5,.1),wood)
def reader():
 screen('OpenPage e-reader');label('OpenPage',(0,-.158,1.17),.16,dark)
 for i in range(5):box('Printed line',(-.02,-.161,.94-i*.12),(.86 if i<4 else .57,.012,.018),silver,.002)
 cyl('Button',(0,-.04,.11),.045,.018,silver).rotation_euler[0]=math.pi/2
 box('Stand',(0,.08,.025),(1.0,.65,.05),dark)
def tin():
 box('Tin base',(0,0,.2),(1.6,1.0,.4),red,.12);box('Tin silver rim',(0,0,.405),(1.53,.93,.06),silver,.1);box('Circuit board',(0,0,.46),(1.4,.79,.055),green,.03)
 box('CPU',(-.15,0,.52),(.4,.38,.07),dark);box('USB ports',(.5,-.12,.56),(.24,.42,.15),silver,.018)
 for x in [-.51,-.4,-.29,-.18,-.07,.04]:box('Gold header',(x,.26,.52),(.04,.1,.06),gold,.006)
 box('Open upright lid',(0,.49,1.01),(1.6,.09,1.05),red,.10);box('Lid inset',(0,.435,1.01),(1.41,.03,.86),cream,.055);label('Pi-Pentester',(0,.41,1.03),.17,red)
 rod('WiFi antenna',(-.57,.3,.5),(-.57,.3,1.62),.045,dark)
def quantum():
 box('Quantum processor',(0,0,.15),(1.65,1.2,.3),dark)
 for x in [-.65,-.4,-.15,.1,.35,.6]:
  for y in [-.68,.68]:box('Gold pin',(x,y,.12),(.11,.24,.05),gold,.01)
 for z in [.6,1.,1.4]:
  rod('Qubit wire',(-.7,0,z),(.7,0,z),.025,silver)
  box('Hadamard gate',(-.35,0,z),(.24,.18,.24),purple,.03);label('H',(-.35,-.11,z-.065),.17,white)
 rod('Entanglement',(0,0,.6),(0,0,1.4),.025,blue)
 for z in [.6,1.,1.4]:sphere('Qubit',(0,0,z),.09,blue)
 label('QRNG',(0,-.615,.1),.18,gold)
def guppy():
 box('Guppy enclosure',(0,0,.85),(1.45,.75,1.7),cream,.16);box('Screen bezel',(0,-.39,1.05),(1.2,.055,.95),dark,.12);box('LCD',(0,-.427,1.05),(1.04,.035,.79),blue,.10)
 label('Guppy',(0,-.453,1.11),.2,dark);label('ask me anything',(0,-.453,.9),.085,dark)
 box('Speaker slot',(.26,-.405,.4),(.56,.035,.055),silver,.014);cyl('Control knob',(-.4,-.425,.3),.095,.08,dark).rotation_euler[0]=math.pi/2
 for x in [-.5,.5]:box('Foot',(x,0,.02),(.24,.55,.08),dark)
def cipher():
 o=cyl('Cipher wheel',(0,0,.87),.83,.25,gold);o.rotation_euler[0]=math.pi/2
 o=cyl('Inner rotating disk',(0,-.15,.87),.62,.10,teal);o.rotation_euler[0]=math.pi/2
 for i in range(12):
  a=i*math.tau/12;x=.71*math.sin(a);z=.87+.71*math.cos(a);label(chr(65+i),(x,-.14,z-.05),.13,dark)
 label('A  >  D',(0,-.23,.83),.23,white);box('Wheel stand',(0,.04,.03),(1.25,.55,.06),dark)
def golfprinter():
 box('Printer base',(0,0,.12),(1.75,1.1,.24),teal)
 for x in [-.64,.64]:
  box('Ball cradle',(x,0,.45),(.15,.42,.64),silver)
 rod('Rotating spindle',(-.7,0,.65),(.7,0,.65),.055,dark);sphere('Golf ball',(0,0,.68),.38,white)
 for x in [-.65,.65]:rod('Gantry post',(x,.35,.2),(x,.35,1.5),.045,dark)
 rod('Pen carriage',(-.65,.35,1.5),(.65,.35,1.5),.05,silver)
 rod('Marker',(0,.16,1.4),(0,-.03,.99),.045,purple);sphere('Printed mark',(0,-.357,.74),.09,purple)
 label('GOLF BOT',(0,-.565,.095),.15,white)
def laptop():
 box('Laptop base',(0,0,.10),(1.9,1.2,.15),silver);box('Keyboard',(0,.1,.19),(1.58,.55,.025),dark,.018)
 for row in range(4):
  for col in range(10):box('Key',(-.69+col*.153,-.11+row*.13,.214),(.105,.07,.012),silver,.004)
 box('Trackpad',(0,-.36,.19),(.56,.25,.016),silver,.015)
 box('Display lid',(0,.53,.83),(1.9,.12,1.45),silver);box('Terminal screen',(0,.459,.86),(1.67,.028,1.17),dark,.025)
 label('>_ KALI',(0,.434,1.03),.24,green)
 for i in range(3):box('Terminal line',(-.25,.437,.78-i*.12),(.84-i*.15,.009,.024),green,.001)
def delta():
 cyl('Circular print bed',(0,0,.16),.72,.16,dark)
 points=[(-.72,-.4),( .72,-.4),(0,.7)]
 for x,y in points:
  box('Tower',(x,y,1.16),(.12,.12,2.3),dark,.016);box('Blue tower foot',(x,y,.12),(.28,.28,.24),blue)
  rod('Delta arm',(x,y,1.65),(0,0,.94),.035,silver)
 for i,(x,y) in enumerate(points):
  xx,yy=points[(i+1)%3];rod('Top triangle',(x,y,2.27),(xx,yy,2.27),.045,dark)
 cyl('Print head',(0,0,.94),.15,.18,red);sphere('Printed part',(0,0,.38),.17,white)
def retro():
 box('Retro console',(0,.12,.33),(1.65,.95,.66),cream,.10);box('Cartridge slot',(0,-.37,.41),(.86,.05,.12),dark,.01);box('Power button',(-.55,-.385,.17),(.17,.04,.10),red,.012)
 for x in [-.45,.45]:box('Controller port',(x,-.375,.28),(.21,.025,.07),dark,.012)
 box('Gamepad',(0,-.65,.11),(1.08,.47,.19),silver,.11)
 box('D-pad horizontal',(-.3,-.69,.22),(.24,.06,.035),dark,.008);box('D-pad vertical',(-.3,-.69,.22),(.06,.24,.035),dark,.008)
 for x,y,m in [(.24,-.72,red),(.37,-.6,purple)]:cyl('Action button',(x,y,.23),.065,.035,m)
 label('RETRO PI',(0,-.405,.52),.15,dark)
MODELS={'virtual-ball-rack':ballrack,'laser-timing-gates':reader,'pi-pentester':tin,'quantum-random-number-generator':quantum,'guppy':guppy,'caesar-cipher':cipher,'golf-ball-printer':golfprinter,'kali-macbook':laptop,'delta-3d-printer':delta,'retro-pi':retro}
for slug,build in MODELS.items():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);build()
 objects=list(bpy.context.scene.objects)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,slug+'.glb'),export_format='GLB',export_apply=True)
 corners=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
 lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)));hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)));center=(lo+hi)/2;size=max(hi-lo)
 bpy.ops.object.camera_add(location=center+Vector((3.5,-6,3))*size);camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=size*1.48;bpy.context.scene.camera=camera
 for loc,power,scale in [(( -3,-4,6),550,4),((4,-1,3),350,3),((0,3,4),500,3)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(loc));light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=scale;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=384;scene.render.resolution_y=384;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.world.color=(.25,.25,.25);scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath=os.path.join(OUT,slug+'.png')
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,slug+'.blend'));bpy.ops.render.render(write_still=True)
 print('MINIATURE READY:',slug,flush=True)
