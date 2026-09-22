import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

// World units are metres. Every visible prop is a mesh with depth.
export function buildWorkshop(scene, font, mobile) {
  const world = new T.Group(); scene.add(world);
  const interactives = [], animated = [];
  const materials = {};
  const mat = (color, metalness=.25, roughness=.48) => {
    const key = `${color}-${metalness}-${roughness}`;
    return materials[key] ||= new T.MeshStandardMaterial({color,metalness,roughness});
  };
  const purple=mat('#37304e'), dark=mat('#17182b'), steel=mat('#677389',.72,.3), wood=mat('#886344',.1,.8), black=mat('#080c18'), pink=new T.MeshStandardMaterial({color:'#ff66d9',emissive:'#ff20be',emissiveIntensity:3}), cyan=new T.MeshStandardMaterial({color:'#9cfaff',emissive:'#21dfff',emissiveIntensity:3}), amber=new T.MeshStandardMaterial({color:'#fff0b1',emissive:'#ffaa40',emissiveIntensity:2});
  function mesh(geo, material, pos, parent=world) { const m=new T.Mesh(geo,material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  function box(w,h,d,x,y,z,m=purple,parent=world,bevel=.03){return mesh(bevel?new RoundedBoxGeometry(w,h,d,1,Math.min(bevel,w/4,h/4,d/4)):new T.BoxGeometry(w,h,d),m,[x,y,z],parent);}
  function cylinder(r,h,x,y,z,m=steel,parent=world,r2=r){return mesh(new T.CylinderGeometry(r2,r,h,12),m,[x,y,z],parent);}
  function ball(r,x,y,z,m=amber,parent=world){return mesh(new T.IcosahedronGeometry(r,2),m,[x,y,z],parent);}
  function tube(points,r,m=dark,parent=world){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,24,r,6,false),m,[0,0,0],parent);}
  function rod(a,b,r,m=steel,parent=world){const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);const o=cylinder(r,av.distanceTo(bv),...mid.toArray(),m,parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;}
  function text(str,size,x,y,z,m=cyan,parent=world){const geo=new TextGeometry(str,{font,size,depth:.016,curveSegments:3,bevelEnabled:false});geo.computeBoundingBox();const width=geo.boundingBox.max.x;const o=mesh(geo,m,[x-width/2,y,z],parent);o.castShadow=false;return o;}
  function neonText(str,size,x,y,z,material){
    const shapes=font.generateShapes(str,size);const flat=new T.ShapeGeometry(shapes);flat.computeBoundingBox();const offset=flat.boundingBox.max.x/2;
    for(const shape of shapes)for(const contour of [shape,...shape.holes]){
      const pts=contour.getPoints(5);const curve=new T.CurvePath();
      for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if(a.distanceTo(b)<.0001)continue;curve.add(new T.LineCurve3(new T.Vector3(a.x-offset+x,a.y+y,z),new T.Vector3(b.x-offset+x,b.y+y,z)));}
      mesh(new T.TubeGeometry(curve,Math.max(30,pts.length*2),.009,5,false),material,[0,0,0]);
    }flat.dispose();
  }
  function action(object, label, key){object.userData.action=key;object.userData.label=label;interactives.push(object);return object;}
  function light(color,intensity,pos,distance){const l=new T.PointLight(color,intensity,distance,2);l.position.set(...pos);world.add(l);return l;}

  // Plinth and polished pavement with a real planar reflection.
  box(10.6,.24,6.7,-.7,-.08,.3,mat('#222033',.55,.38));
  const floor=new Reflector(new T.PlaneGeometry(140,140),{color:0x17131d,textureWidth:mobile?512:1024,textureHeight:mobile?512:1024,clipBias:.003});floor.rotation.x=-Math.PI/2;floor.position.y=-.22;scene.add(floor);
  for(let x=-5;x<=4;x+=1.05) for(let z=-2.5;z<3.7;z+=1.1) box(1.025,.018,1.075,x,.05,z,mat((Math.floor(x+z)*3)%2?'#302c42':'#292639',.35,.6),world,0);
  // Building shell, open front at z=2.1, detailed on all sides.
  box(6.8,4.4,.22,.4,2.3,-1.8,purple);
  box(.28,4.4,4,-2.95,2.3,.1,purple);
  box(.28,4.4,4,3.75,2.3,.1,purple);
  box(7.05,.23,4.3,.4,4.52,.1,dark);
  box(7.05,.18,4.3,.4,4.68,.1,steel);
  for(let x=-2.65;x<3.7;x+=.36) box(.28,3.1,.055,x,1.75,-1.64,wood,world,.01);
  for(let x of [-2.88,3.69]) {box(.38,4.5,.48,x,2.3,2.1,steel);box(.065,3.25,.06,x,1.8,2.36,x<0?pink:cyan);for(let y=.3;y<4.4;y+=.43) cylinder(.035,.06,x,y,2.39,dark).rotation.x=Math.PI/2;}
  // Raised roller shutter, header, and illuminated sign frame.
  for(let y=3.2;y<3.94;y+=.12) box(6.25,.095,.13,.4,y,2.18,mat('#626279',.65,.38));
  box(6.9,.23,.7,.4,3.08,2.14,dark);
  box(6.55,1.07,.32,.4,4.02,2.24,dark);
  box(6.3,.035,.05,.4,4.51,2.43,cyan);box(6.3,.035,.05,.4,3.51,2.43,pink);
  box(.035,1,.05,-2.77,4.01,2.43,pink);box(.035,1,.05,3.57,4.01,2.43,cyan);
  neonText('BLAHA',.55,-1.15,3.8,2.44,pink);neonText('LABS',.55,1.68,3.8,2.44,cyan);
  // Warm under-header lighting and ceiling beams.
  for(let z of [-1.25,.15,1.45]){box(6.3,.13,.13,.4,3.05,z,dark);box(1.6,.035,.05,.4,2.96,z,amber);}
  light('#ffbd78',28,[.4,2.65,1.1],7);light('#fd6afa',18,[-3.8,3.8,2.8],9);light('#45baff',23,[4.5,4.5,.4],10);
  // Central bench, trestles, drawers, and lower shelf.
  box(5.7,.16,1.1,.4,1.18,.7,wood);
  box(5.75,.055,.1,.4,1.26,1.25,mat('#ad825f'));
  for(let x of [-2.15,2.95]){box(.55,1,.9,x,.6,.7,dark);for(let y of [.3,.56,.82]){box(.51,.22,.035,x,y,1.17,steel);box(.22,.035,.06,x,y,1.22,dark);}}
  box(4.4,.08,.75,.4,.28,.6,wood);
  for(let i=0;i<6;i++){box(.42,.24,.4,-1.65+i*.63,.43,.6,mat(['#53617c','#bb7b3c','#394d56'][i%3]));box(.16,.055,.02,-1.65+i*.63,.43,.82,amber);}
  // Real delta printer with triangular frame and animated effector.
  const printer=new T.Group();printer.position.set(.2,1.27,.72);world.add(printer);
  const vertices=[[-.47,0,.3],[.47,0,.3],[0,0,-.47]];
  cylinder(.58,.1,0,.08,0,dark,printer);cylinder(.44,.055,0,.15,0,steel,printer);
  vertices.forEach(([x,,z],i)=>{rod([x,.1,z],[x,1.43,z],.035,steel,printer);rod([x+.07,.1,z],[x+.07,1.43,z],.026,dark,printer);const n=vertices[(i+1)%3];rod([x,1.45,z],[n[0],1.45,n[2]],.08,dark,printer);box(.12,.18,.12,x,1,z,purple,printer);rod([x,1,z],[0,.65,0],.018,steel,printer);});
  const head=cylinder(.1,.11,0,.65,0,cyan,printer);animated.push(t=>head.position.y=.63+Math.sin(t*.7)*.1);
  mesh(new T.TorusKnotGeometry(.13,.035,40,6),mat('#fd86d9'),[0,.32,0],printer);
  const printerHit=box(1.15,1.55,1.1,0,.75,0,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),printer);printerHit.castShadow=false;printerHit.receiveShadow=false;action(printer,'Delta 3D printer','delta');
  // Laptop, e-reader, circuit kit and AI companion, each independently selectable.
  const laptop=new T.Group();laptop.position.set(1.7,1.3,.85);world.add(laptop);
  box(.85,.05,.58,0,0,0,steel,laptop);const screen=box(.83,.5,.045,0,.25,-.23,dark,laptop);screen.rotation.x=-.13;box(.7,.37,.02,0,.27,-.194,mat('#103b50'),laptop);text('OPENPAGE',.065,0,.27,-.172,cyan,laptop);action(laptop,'OpenPage e-reader','openpage');
  const tin=new T.Group();tin.position.set(-1.5,1.3,.95);world.add(tin);box(.58,.11,.39,0,.035,0,steel,tin);box(.49,.035,.3,0,.11,0,mat('#26725b'),tin);box(.15,.035,.12,0,.14,0,black,tin);for(let i=0;i<5;i++)box(.035,.05,.04,-.19+i*.08,.15,.11,amber,tin);action(tin,'Pi-Pentester','pentest');
  const robot=new T.Group();robot.position.set(-1.95,1.28,.05);world.add(robot);box(.5,.45,.4,0,.3,0,mat('#476483'),robot);box(.43,.25,.035,0,.33,.22,black,robot);for(let x of [-.11,.11])ball(.037,x,.35,.247,cyan,robot);tube([[-.1,.24,.25],[0,.2,.25],[.1,.24,.25]],.015,cyan,robot);cylinder(.16,.14,0,.03,0,dark,robot);action(robot,'Guppy AI assistant','guppy');animated.push(t=>robot.rotation.y=Math.sin(t*.6)*.1);
  // Golf display, actual spheres sitting on shelves.
  const rack=new T.Group();rack.position.set(2.48,2.0,-1.4);world.add(rack);box(1.5,1.4,.16,0,0,0,wood,rack);for(let y of [-.46,0,.46]){box(1.43,.06,.28,0,y-.12,.16,dark,rack);for(let x of [-.48,-.16,.16,.48]){ball(.115,x,y,.19,mat('#eee4ce',.05,.65),rack);ball(.025,x,y,.305,mat('#4c547b'),rack);}}action(rack,'Golf Ball Printer','golf');
  // Pegboard, hanging tools, side shelves, notebooks and jars.
  for(let x=-2.4;x<1.4;x+=.2)for(let y=1.55;y<2.8;y+=.22)box(.025,.025,.025,x,y,-1.595,black,world,0);
  for(let i=0;i<9;i++){const x=-2.35+i*.39;rod([x,2.5,-1.51],[x,2.12,-1.51],.025,steel);box(.07,.2,.07,x,2.13,-1.5,mat(i%2?'#e8a24e':'#405875'));}
  box(2.3,.12,.5,-1.43,2.78,-1.35,wood);for(let i=0;i<7;i++){box(.19,.34+(i%3)*.09,.24,-2.35+i*.27,3.01,-1.34,mat(['#a87658','#4e698b','#886281'][i%3]));}
  for(let i=0;i<5;i++){cylinder(.08,.22,2.3+i*.14,1.4,.5,mat(['#ac8b5b','#697f76'][i%2]));}
  // Stool, cabinets, side posters and plants.
  for(let x of [-.9,1.55]){cylinder(.29,.1,x,.74,1.9,wood);cylinder(.035,.64,x,.39,1.9,steel);for(let dx of [-.23,.23])for(let dz of [-.2,.2])rod([x,.25,1.9],[x+dx,.1,1.9+dz],.025,dark);}
  box(.72,1.17,.75,-2.38,.65,-.85,mat('#934056'));for(let y=.25;y<1.1;y+=.22){box(.62,.16,.05,-2.38,y,-.45,mat('#b24f69'));box(.3,.025,.04,-2.38,y,-.415,steel);}
  const poster=box(.95,1.25,.045,3.04,1.92,-1.63,mat('#dfc9a3'));text('MAKE',.15,3.04,2.17,-1.595,dark);text('TINKER',.13,3.04,1.94,-1.595,dark);text('REPEAT',.13,3.04,1.7,-1.595,dark);
  function plant(x,y,z,s=1){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(s);world.add(g);cylinder(.23,.4,0,.2,0,mat('#63536d'),g,.19);for(let i=0;i<9;i++){const a=i*2.4;const leaf=mesh(new T.SphereGeometry(.12,5,3),mat(i%2?'#497d68':'#7e9660'),[Math.cos(a)*.22,.5+(i%3)*.13,Math.sin(a)*.22],g);leaf.scale.set(.55,2.6,.75);leaf.rotation.z=Math.cos(a)*.7;}return g;}
  plant(-3.4,.12,2.5,1.3);plant(3.85,.12,3.55,1.1);plant(2.9,1.28,.15,.55);
  // Street-facing ship terminal — dark hull, HUD glass, pick a build.
  const cab=new T.Group();cab.position.set(5.2,0,2.72);cab.rotation.y=-.1;world.add(cab);
  const hull=mat('#141820',.55,.38), hullDeep=mat('#07090e',.4,.32), plate=mat('#232833',.48,.42);
  box(1.28,.22,1.02,0,.11,0,hullDeep,cab);box(1.18,.18,.92,0,.28,.02,hull,cab);
  box(1.08,2.18,.7,0,1.42,-.08,hull,cab);box(1.2,.14,.78,0,2.56,-.04,hullDeep,cab);
  for(const x of [-.56,.56]) box(.08,2.05,.62,x,1.4,-.06,plate,cab,.01);
  for(let i=0;i<5;i++) box(.06,.04,.52,-.56,.55+i*.38,.26,i%2?pink:cyan,cab,0);
  box(.98,1.18,.12,0,1.62,.3,hullDeep,cab);box(.9,.06,.08,0,2.22,.36,cyan,cab,0);box(.9,.06,.08,0,1.02,.36,pink,cab,0);
  const screenCanvas=document.createElement('canvas');screenCanvas.width=960;screenCanvas.height=1280;
  const screenTexture=new T.CanvasTexture(screenCanvas);screenTexture.colorSpace=T.SRGBColorSpace;screenTexture.anisotropy=8;
  const crt=mesh(new T.PlaneGeometry(.78,1.04),new T.MeshBasicMaterial({map:screenTexture,toneMapped:false}),[0,1.62,.375],cab);crt.castShadow=false;crt.receiveShadow=false;
  action(crt,'Ship terminal','arcade-select');
  box(.7,.08,.28,0,.42,.42,hullDeep,cab);box(.22,.03,.08,0,.48,.54,cyan,cab,0);
  cylinder(.03,.55,.48,2.86,.1,steel,cab);ball(.07,.48,3.16,.1,pink,cab);
  const lamp=new T.MeshStandardMaterial({color:'#ff66d9',emissive:'#ff20be',emissiveIntensity:2.4});
  const beacon=box(.08,.05,.08,0,2.64,.4,lamp,cab,0);animated.push(t=>{beacon.material.emissiveIntensity=1.4+Math.sin(t*7)*1.3;});
  const glow=new T.PointLight('#5cf0ff',4.5,3,2);glow.position.set(0,1.7,.82);cab.add(glow);
  cab.updateMatrixWorld(true);action(cab,'Ship terminal','arcade');
  const arcade={
    canvas:screenCanvas,texture:screenTexture,screen:crt,hits:[],
    cameraPosition:cab.localToWorld(new T.Vector3(0,1.64,2.55)),
    lookTarget:cab.localToWorld(new T.Vector3(0,1.58,.28))
  };
  // Signpost physically protrudes into the foreground; text is extruded geometry.
  const post=new T.Group();post.position.set(-4.3,.1,2.35);post.rotation.y=.08;world.add(post);
  box(.85,.15,.7,0,.02,0,dark,post);box(.18,4.9,.18,0,2.5,0,steel,post);box(.55,.22,.43,0,.25,0,purple,post);
  function sign(label,y,color,key){const g=new T.Group();g.position.set(.05,y,.12);g.rotation.z=-.045;post.add(g);box(2.05,.55,.17,0,0,0,dark,g);const face=color.clone();face.emissiveIntensity=.45;box(1.91,.43,.025,0,0,.1,face,g);text(label,.19,0,-.075,.126,new T.MeshBasicMaterial({color:'#121022'}),g);action(g,label,key);return g;}
  sign('Projects',3.15,pink,'arcade');sign('About Sam',2.43,cyan,'about');sign('Build logs',1.71,amber,'logs');
  box(.8,.94,.08,0,.83,.12,purple,post);text('IDEAS',.12,0,1.03,.18,mat('#e2b7f5'),post);text('INTO',.12,0,.81,.18,mat('#e2b7f5'),post);text('THINGS',.1,0,.59,.18,mat('#e2b7f5'),post);
  rod([0,4.8,0],[-1.05,4.8,0],.065,steel,post);rod([-1.05,4.8,0],[-1.05,4.2,0],.04,dark,post);ball(.43,-1.05,3.9,0,pink,post);light('#ff42df',16,[-5.35,4,2.35],8);
  // Small CRT mounted above the signs.
  box(.51,.52,.4,.22,3.96,0,purple,post);box(.41,.33,.025,.22,3.99,.22,black,post);text(':)',.19,.22,3.91,.25,cyan,post);
  // Ground welcome sign is also an actual raycast target.
  const entry=new T.Group();entry.position.set(.55,.09,3.0);entry.rotation.x=-Math.PI/2;world.add(entry);box(3.75,.53,.055,0,0,0,dark,entry);for(let y of [-.25,.25])box(3.75,.025,.035,0,y,.04,cyan,entry);for(let x of [-1.86,1.86])box(.025,.5,.035,x,0,.04,cyan,entry);text('EXPLORE THE LAB',.18,0,-.08,.05,cyan,entry);action(entry,'Explore the lab','enter');
  // Rooftop utility shack, AC units, illuminated vent, dish, aerials and cables.
  box(2.3,1.05,1.6,-1.55,5.27,-.45,purple);box(2.5,.14,1.8,-1.55,5.84,-.45,steel);
  box(.85,.65,.04,-1.8,5.28,.38,amber);box(.04,.65,.06,-1.8,5.28,.42,dark);box(.85,.04,.06,-1.8,5.28,.42,dark);
  for(let x of [1.3,2.55]){box(.85,.83,.84,x,5.18,-.7,steel);for(let y=4.92;y<5.48;y+=.1)box(.63,.025,.045,x,y,-.25,dark);}
  cylinder(.075,1.3,-1.65,6.45,-.8,dark);
  const dish=mesh(new T.SphereGeometry(.72,20,12,0,Math.PI*2,0,.55),steel,[-1.65,6.65,-.8]);dish.rotation.z=.65;dish.rotation.x=.2;
  rod([-1.65,6.6,-.8],[-1.2,7.2,-.5],.025,steel);
  for(let [x,z,h] of [[-3,-1.5,6.4],[3.7,-1.5,7.1],[3.7,1.8,6.5]]){cylinder(.055,h-4.7,x,(h+4.7)/2,z,steel);box(.2,.4,.2,x,h,z,dark);box(.06,.15,.025,x,h,z+.12,cyan);}
  tube([[-3,6.3,-1.5],[-.2,5.75,-1.5],[3.7,7,-1.5]],.035,dark);tube([[-3,6.1,-1.45],[-.2,5.5,-1.4],[3.7,6.8,-1.5]],.022,mat('#938ba4'));
  tube([[3.7,7,-1.5],[3.7,5.9,.2],[3.7,6.4,1.8]],.035,dark);
  box(.6,1,.6,2.75,5.55,1.15,dark);box(.5,.83,.025,2.75,5.55,1.47,cyan);text('SB',.23,2.75,5.47,1.49,dark);
  ball(.36,3.55,5.05,1.3,mat('#b3d8ff',.6,.2));
  const turbine=new T.Group();turbine.position.set(4.1,5.3,-.65);world.add(turbine);rod([0,-.7,0],[0,0,0],.04,steel,turbine);const blades=new T.Group();turbine.add(blades);for(let i=0;i<3;i++){const blade=box(.12,.95,.05,0,.48,0,purple,blades);const pivot=new T.Group();blades.remove(blade);pivot.add(blade);pivot.rotation.z=i*Math.PI*2/3;blades.add(pivot);}ball(.1,0,0,.04,cyan,blades);animated.push(t=>blades.rotation.z=t*.35);
  // Exterior cladding is modeled on sides/back so orbiting never reveals a flat facade.
  for(let side of [-1,1])for(let y=.6;y<4.4;y+=.55){box(.04,.48,3.3,side<0?-3.11:3.91,y,-.05,mat('#43405c'));}
  for(let i=0;i<3;i++){box(.45,.7,.6,4.05,1.3+i*.88,-.8,steel);box(.03,.35,.38,4.3,1.3+i*.88,-.8,dark);}
  tube([[4,3,-1.2],[4.35,2.4,-1.2],[4.35,.7,-.6],[3.9,.4,1]],.045,dark);
  for(let x=-2.5;x<3.7;x+=.55)box(.45,3.9,.06,x,2.15,-1.95,mat('#35364b'));
  text('BLAHA LABS',.37,.4,2.5,-2.0,cyan).rotation.y=Math.PI;
  return {world,interactives,animated,arcade};
}
