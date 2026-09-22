"""Author the first Blaha Labs bay in Blender. Run with blender -b -P this_file."""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name, color, metal=0, rough=.5, emission=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
 return m
metal=material('Graphite',(.09,.12,.14),.65); panel=material('Panel',(.19,.23,.25),.45); black=material('Carbon',(.018,.027,.034),.2); steel=material('Machined aluminum',(.42,.5,.54),.8,.28); cyan=material('neonCyan',(.08,.8,1),.2,.4,1.6); white=material('neonWhite',(.65,.85,1),0,.4,1.3); amber=material('neonAmber',(1,.4,.07),0,.4,2); magenta=material('neonMagenta',(1,.04,.5),0,.35,2.4); hazard=material('Hazard yellow',(.92,.42,.025),.25,.45); cola_red=material('Blaha Cola red',(.42,.018,.012),.72,.3); cola_dark=material('Blaha Cola shadow',(.075,.009,.007),.58,.34); cola_cream=material('Aged cream',(.69,.52,.31),.32,.5); bottle_glass=material('Bottle glass',(.018,.24,.29),.18,.16,.75); rubber=material('Machine rubber',(.012,.014,.015),.05,.8); brass=material('Aged brass',(.5,.25,.055),.72,.33); porcelain=material('Bottle label porcelain',(.78,.7,.52),.08,.5)
# Coordinates use Three.js axes here, converted to Blender Z-up.
def pos(v): return (v[0],-v[2],v[1])
def box(name, loc, size, mat, bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1, location=pos(loc)); o=bpy.context.object; o.name=name; o.dimensions=(size[0],size[2],size[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Machined edges','BEVEL'); mod.width=bevel; mod.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 o.data.materials.append(mat); return o
def cyl(name,loc,r,depth,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=depth,location=pos(loc));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 mod=o.modifiers.new('Edge chamfer','BEVEL');mod.width=.025;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def label(name,txt,loc,size,mat):
 bpy.ops.object.text_add(location=pos(loc),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.body=txt;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.002;o.data.materials.append(mat);bpy.ops.object.convert(target='MESH');return o
def cable(name, points, radius=.025, mat=black):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2;curve.bevel_depth=radius;curve.bevel_resolution=2
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for point,co in zip(spline.bezier_points,points):point.co=pos(co);point.handle_left_type='AUTO';point.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def hazard_strip(name, x, y, z, width, count=8):
 box(name,(x,y,z),(width,.18,.035),black,.008)
 cell=width/count
 for i in range(count):
  if i%2==0:
   stripe=box('Hazard stripe',(x-width/2+cell*(i+.5),y,z+.025),(cell*.75,.15,.018),hazard,.004)
   stripe.rotation_euler[2]=-.28
box('floor', (0,-.18,0),(11,.35,7),metal)
for x in range(-5,5):
 for z in range(-3,3): box('Floor inset',(x+.5,.005,z+.5),(.97,.035,.97),panel,.01)
box('garageShell',(0,2.7,-3),(10.8,5.4,.25),black)
for x in [-4.5,-3,-1.5,0,1.5,3,4.5]:
 box('Rear service panel',(x,2.65,-2.82),(1.43,4.9,.15),metal)
 box('Structural rib',(x-.73,2.7,-2.62),(.065,5.1,.2),steel,.01)
 for y in [.45,4.7]:
  for dx in [-.58,.58]:box('Panel fastener',(x+dx,y,-2.71),(.045,.045,.025),steel,.007)
 for y in [1,1.12,1.24]:box('Vent',(x,y,-2.72),(.8,.035,.035),black,.005)
for x in [-5.3,5.3]:
 box('Side bulkhead',(x,2.5,-.8),(.22,5,4.4),metal)
 for z in [-2.6,-1.2,.2,1.3]:
  box('Side frame',(x,2.5,z),(.32,5,.12),steel)
 box('Ceiling rail',(x,5.1,0),(.28,.3,6.2),steel)
for z in [-2.5,0,2.5]:
 box('Overhead crossmember',(0,5.1,z),(10.6,.22,.2),metal)
 for x in [-3,3]:box('neonCeiling',(x,4.96,z),(2.9,.035,.09),white,.01)
box('Identity plaque',(0,4,-2.55),(5.1,1.05,.12),black)
label('blahaLabsSign','BLAHA LABS',(0,3.87,-2.46),.47,white)
label('Bay designation','DESIGN  /  PROTOTYPE  /  BUILD',(0,3.51,-2.44),.105,steel)
box('neonBlue01',(0,3.32,-2.48),(4.7,.022,.035),cyan,.005)
box('Access sign housing',(0,2.97,-2.5),(2.8,.48,.1),black,.025)
box('accessGrantedSign',(0,2.97,-2.425),(2.55,.31,.035),cyan,.015)
label('Access granted label','ACCESS GRANTED',(0,2.9,-2.39),.18,black)
box('Root sign housing',(3.18,4.03,-2.5),(2.05,.53,.1),black,.025)
box('rootOnlineSign',(3.18,4.03,-2.425),(1.82,.34,.035),magenta,.015)
label('Root online label','ROOT // ONLINE',(3.18,3.96,-2.39),.16,black)
for x in [-4.9,4.9]:
 box('Side neon',(x,2.65,-2.39),(.045,3.8,.05),cyan,.008)
hazard_strip('Left hazard rail',-4.35,.2,-2.47,1.35)
hazard_strip('Right hazard rail',4.35,.2,-2.47,1.35)
# Exterior service side, visible during the full 360-degree orbit.
for x in [-4.45,-2.95,-1.45,.05,1.55,3.05,4.45]:
 box('Exterior service panel',(x,2.7,-3.16),(1.38,4.75,.1),panel,.018)
 box('Exterior panel rib',(x-.7,2.7,-3.25),(.055,4.9,.08),steel,.008)
 for y in [.55,4.75]:
  for dx in [-.55,.55]:box('Exterior fastener',(x+dx,y,-3.24),(.04,.04,.025),steel,.006)
 for y in [1.05,1.2,1.35]:box('Exterior vent',(x,y,-3.23),(.78,.045,.035),black,.006)
box('Rear access housing',(0,3.8,-3.25),(4.15,.8,.12),black,.025)
rear_label=label('Rear access label','BLAHA LABS  //  REAR ACCESS',(0,3.68,-3.33),.28,cyan)
rear_label.rotation_euler[2]=math.pi
box('Rear neon rail',(0,3.28,-3.28),(3.75,.035,.045),cyan,.006)
hazard_strip('Rear lower hazard',0,.22,-3.24,7.8,18)
for x in [-3.8,3.8]:
 box('Rear utility box',(x,2.45,-3.32),(1.15,1.65,.22),black,.025)
 for y in [1.95,2.25,2.55,2.85]:box('Rear utility vent',(x,y,-3.46),(.72,.055,.03),steel,.006)
 box('Rear status lamp',(x+.42,3.02,-3.46),(.08,.08,.03),amber,.008)
cable('Rear conduit A',[(-4.25,4.65,-3.35),(-3.2,4.35,-3.4),(-2.7,3.7,-3.42),(-2.7,2.2,-3.42)],.035)
cable('Rear conduit B',[(4.25,4.65,-3.35),(3.2,4.35,-3.4),(2.7,3.7,-3.42),(2.7,2.2,-3.42)],.035)
box('workbench',(0,1.5,.1),(5.5,.2,1.6),steel)
box('Bench surface',(0,1.615,.1),(5.2,.03,1.35),black,.01)
for x in [-2.05,2.05]:
 box('Bench cabinet',(x,.75,.1),(.95,1.4,1.4),metal)
 for y in [.35,.7,1.05]:
  box('Drawer front',(x,y,.825),(.85,.3,.08),panel)
  box('Drawer pull',(x,y,.89),(.4,.035,.065),steel,.01)
box('Bench footrail',(0,.23,.1),(4,.12,.12),steel)
hazard_strip('Bench hazard rail',0,.22,.86,3.8,14)
cyl('hologramProjector',(0,1.7,.1),.69,.13,metal)
cyl('neonProjector',(0,1.78,.1),.59,.02,cyan)
# A modeled turbine rotor becomes the runtime hologram.
rotor=cyl('hologramObject',(0,2.55,.1),.24,.24,steel)
for i in range(12):
 a=i*math.tau/12;o=box('Turbine blade',(math.cos(a)*.48,2.55,.1+math.sin(a)*.48),(.48,.07,.16),steel,.02);o.rotation_euler.z=-a-.4
 o.parent=rotor;o.matrix_parent_inverse=rotor.matrix_world.inverted()
# Project dispenser: an original atomic-age soda machine outside the right wall.
# It is built in front-to-back layers like a real steel appliance, then the
# complete assembly is rotated outward toward the exterior walkway.
machine_start=set(bpy.context.scene.objects)
box('Vending service pad',(6.35,.02,.3),(2.65,.18,2.35),metal,.04)
hazard_strip('Vending pad hazard',6.35,.13,1.43,2.35,12)
for x in [5.7,7.0]:
 for z in [-.18,.72]:box('Vending rubber foot',(x,.25,z),(.22,.28,.22),rubber,.035)

# Yellow enamel vending cabinet, modeled after a classic drink machine.
yellow=material('Vending sunshine enamel',(.95,.76,.12),.16,.38)
teal=material('Vending teal enamel',(.12,.43,.46),.12,.42)
box('projectTerminal',(6.35,2.15,.28),(1.96,3.9,1.5),yellow,.11)
box('Vending lower plinth',(6.35,.29,.28),(1.86,.22,1.42),teal,.045)
box('Vending front door',(6.35,2.15,1.055),(1.83,3.69,.08),yellow,.07)
box('Vending crown',(6.35,4.05,.28),(1.96,.27,1.5),yellow,.08)
label('Vending marquee','BLAHA COLA',(6.35,3.94,1.11),.15,black)
# Recessed display, retaining the runtime's named screen anchor.
box('Terminal screen chrome',(6.35,2.72,1.11),(1.64,2.29,.065),steel,.075)
box('Terminal screen bezel',(6.35,2.72,1.15),(1.5,2.14,.04),rubber,.055)
bpy.ops.object.empty_add(location=pos((6.35,2.72,1.187)));bpy.context.object.name='projectTerminalScreen'
# Large teal lower fascia, silver return controls, and wide pickup hatch.
box('Vending teal fascia',(6.35,1.24,1.104),(1.7,.68,.028),teal,.02)
box('Vending instruction plate',(5.98,1.3,1.14),(.64,.35,.045),steel,.035)
label('Vending instructions','PICK A BUILD',(5.98,1.29,1.17),.074,black)
for name,x,y,r in [('Coin return',6.82,1.36,.18),('Return lever',6.56,1.14,.12)]:
 o=cyl(name,(x,y,1.17),r,.065,steel);o.rotation_euler[0]=math.pi/2
 box(name+' slot',(x,y,1.216),(r*.95,.025,.02),black,.008)
box('Vending reader bezel',(7.0,.98,1.15),(.19,.25,.05),black,.025)
box('Vending reader indicator',(7.0,.98,1.18),(.105,.15,.025),bottle_glass,.012)
box('Vending dispenser frame',(6.25,.68,1.13),(1.4,.45,.08),steel,.045)
box('Vending dispenser opening',(6.25,.68,1.18),(1.26,.32,.055),black,.025)
box('Vending pickup flap',(6.25,.59,1.217),(1.18,.12,.035),panel,.015)
label('Vending delivery label','COLLECT YOUR CURIOSITY',(6.25,.38,1.14),.057,black)
for y in [.75,3.45]:box('Vending door hinge',(7.23,y,1.10),(.07,.21,.09),steel,.02)
cable('Vending power',[(7.12,.28,-.17),(7.5,.18,-.08),(7.55,.1,.55),(7.12,.08,1.1)],.055)
machine_parts=[o for o in bpy.context.scene.objects if o not in machine_start]
bpy.ops.object.empty_add(type='PLAIN_AXES',location=pos((6.35,0,.3)))
vending=bpy.context.object;vending.name='projectDispenser'
for o in machine_parts:
 o.parent=vending;o.matrix_parent_inverse=vending.matrix_world.inverted()
vending.rotation_euler[2]=math.pi/2
# Fabrication station, rail-mounted tool head and fixtures.
box('Fabrication cabinet',(-4,.8,-1.2),(1.5,1.6,1.3),metal)
box('Printer bed',(-4,1.67,-1.2),(1.25,.1,1.1),steel)
for x in [-4.63,-3.37]: box('Printer rail',(x,2.28,-1.65),(.075,1.4,.075),steel)
box('Printer gantry',(-4,2.96,-1.65),(1.35,.09,.1),steel)
box('printer01',(-4,2.67,-1.35),(.3,.25,.35),panel)
box('Printer status',(-4,2.67,-1.16),(.14,.045,.025),amber,.005)
label('Fabrication label','01 / FABRICATION',(-4,1.24,-.52),.1,white)
hazard_strip('Fabrication warning',-4,.16,-.51,1.1,6)
# Right equipment rack and electronics storage.
box('machineRack',(4,1.6,-1.7),(1.5,3.2,.9),black)
for y in [.4,1.1,1.8,2.5]:
 box('Rack module',(4,y,-1.18),(1.32,.58,.15),metal)
 for x in [3.5,3.7,3.9,4.1]:box('Rack vent',(x,y,-1.09),(.055,.32,.025),black,.006)
 box('Rack LED',(4.5,y,-1.07),(.04,.04,.025),cyan,.006)
label('Equipment label','SYSTEMS / 02',(4,3.42,-1.1),.12,white)
label('Rack root label','COMPUTE  /  STORAGE  /  POWER',(4,3.17,-1.09),.075,cyan)
for x in [1.6,2.2]:
 box('Parts tray',(x,1.67,.5),(.4,.08,.3),panel)
 for dx in [-.1,.1]:cyl('Component',(x+dx,1.75,.5),.035,.08,steel)
# Visible infrastructure makes the bay feel operational rather than decorative.
for x in [-4.45,-4.15,3.45,3.75,4.05,4.35]:
 cable('Routed data cable',[(x,4.65,-2.52),(x,4.1,-2.48),(x+.18,3.5,-2.45),(x+.18,2.8,-2.42)],.022)
for x in [-.75,-.4,.4,.75]:
 cable('Bench cable',[(x,1.3,-.12),(x,.72,-.18),(x*.75,.35,-.4),(x*.55,.15,-1.1)],.03)
cable('Rack floor trunk',[(4.55,.25,-1.7),(4.8,.1,-1.25),(4.55,.08,-.2),(3.25,.1,.3)],.045)
for x,y in [(-4.7,3.65),(4.7,3.55)]:
 box('Warning plate',(x,y,-2.38),(.42,.52,.045),hazard,.015)
 label('Warning glyph','!',(x,y-.13,-2.33),.32,black)
# Export modifiers, UVs, names and PBR materials in a compact single file.
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Apply modifiers and batch static geometry by material to reduce draw calls.
keep={'floor','garageShell','workbench','projectTerminal','printer01','machineRack','blahaLabsSign','neonBlue01','hologramProjector','accessGrantedSign','rootOnlineSign'}
batches={}
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' or o.name in keep or o.name=='hologramObject' or o.parent: continue
 batches.setdefault(o.data.materials[0].name,[]).append(o)
for name,objects in batches.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:
  bpy.context.view_layer.objects.active=o
  for modifier in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)
  o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='static_'+name
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'assets/models/garage.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(root,'assets/models/garage.glb'),export_format='GLB',export_apply=True)
