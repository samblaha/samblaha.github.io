import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Reference-authored miniature world. All landmarks remain actual orbitable geometry. */
export async function createPlanetWorld(scene, { mobile = false } = {}) {
  const world = new T.Group(); world.name = 'Little world'; world.scale.x=1.10; scene.add(world);
  let seed = 82741;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const hash=(x,y,z)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295*2-1;};
  function noise(x,y,z=0){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);const mix=(a,b,t)=>a+(b-a)*t;return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy),fz);}
  const height = (x,z) => 2.85 - .019*(x*x+z*z)+noise(x*.8,z*.8)*.12;
  const materials = new Map();
  function mat(color, extra={}) { const key=color+JSON.stringify(extra); if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.84,...extra}));return materials.get(key); }
  function grainTexture(base, range, kind) {
    const c=document.createElement('canvas'); c.width=c.height=512;
    const ctx=c.getContext('2d'),data=ctx.createImageData(512,512),col=new T.Color(base).convertLinearToSRGB();
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const n=noise(x/43,y/43)+noise(x/12,y/12)*.4+(rand()-.5)*.5;
      const grain=kind==='wood'?Math.sin(x*.7+noise(x/32,y/180)*8)*.05:0;
      const f=1+n*range+grain; const i=(y*512+x)*4;
      data.data[i]=Math.min(255,col.r*255*f);data.data[i+1]=Math.min(255,col.g*255*f);data.data[i+2]=Math.min(255,col.b*255*f);data.data[i+3]=255;
    }
    ctx.putImageData(data,0,0); const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.repeat.set(kind==='wood'?1:5,kind==='wood'?1:5);t.anisotropy=4;return t;
  }
  const stoneTex=grainTexture('#d0d0ce',.10,'stone');
  const woodTex=grainTexture('#c5a775',.20,'wood');
  const mossTexture=await new T.TextureLoader().loadAsync('/assets/planet/moss-rock-albedo.png').catch(()=>stoneTex.clone());mossTexture.colorSpace=T.SRGBColorSpace;mossTexture.wrapS=mossTexture.wrapT=T.RepeatWrapping;mossTexture.repeat.set(2.5,2.5);mossTexture.anisotropy=8;
  const grass=mat('#cbd688',{map:mossTexture,bumpMap:mossTexture,bumpScale:.028,emissive:'#2e380c',emissiveIntensity:.17});
  const stone=mat('#727a85',{map:stoneTex,bumpMap:stoneTex,bumpScale:.003,flatShading:false});
  stone.onBeforeCompile=shader=>{shader.uniforms.mossMap={value:mossTexture};shader.vertexShader='varying vec3 vMossNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvMossNormal=normalize(mat3(modelMatrix)*objectNormal);');shader.fragmentShader='uniform sampler2D mossMap;varying vec3 vMossNormal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat mossAmount=smoothstep(.15,.75,vMossNormal.y)*.18;diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(mossMap,vMapUv*.35).rgb*vec3(.85,.98,.65),mossAmount);');};
  const timber=mat('#92704c',{map:woodTex,bumpMap:woodTex,bumpScale:.008});
  const darkWood=mat('#493c2d',{map:woodTex});
  const steel=mat('#59616a',{metalness:.7,roughness:.5});
  const brass=mat('#a57b46',{metalness:.7,roughness:.43});
  const black=mat('#141b23');
  const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,16,12),cylinderGeo=new T.CylinderGeometry(1,1,1,12);
  function mesh(geometry, material, parent=world, position=[0,0,0], scale=[1,1,1]) {const m=new T.Mesh(geometry,typeof material==='string'?mat(material):material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const box=(p,size,m,parent=world)=>mesh(boxGeo,m,parent,p,size);
  const cyl=(p,r,h,m,parent=world)=>mesh(cylinderGeo,m,parent,p,[r,h,r]);
  const ball=(p,r,m,parent=world)=>mesh(sphereGeo,m,parent,p,[r,r,r]);
  function beam(a,b,r,m,parent=world){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const o=cyl(va.add(vb).multiplyScalar(.5).toArray(),r,d.length(),m,parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
  function tube(points,r,material,parent=world){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,Math.max(12,points.length*5),r,5,false),material,parent);}
  function anchor(x,z,name,action){const g=new T.Group();g.position.set(x,height(x,z),z);g.name=name;if(action)g.userData={action,label:name};world.add(g);return g;}
  // One continuous escarpment: a thin summit, fractured walls and an asymmetric root.
  const rimRadius=a=>6.25+.24*Math.sin(a*3+.4)+.15*Math.sin(a*7-1)+.09*Math.cos(a*11);
  function cliffPoint(a,v){
    const rim=rimRadius(a), ca=Math.cos(a), sa=Math.sin(a);
    const taper=Math.pow(Math.max(0,1-Math.pow(v,1.65)),.72);
    const ribs=(noise(ca*13,sa*13,v*.65)*.38+noise(ca*29,sa*29,v*1.2)*.13);
    const ledges=Math.sin(v*36+noise(ca*4,sa*4)*2)*.065;
    const r=(rim+ribs*Math.sin(Math.min(1,v*9)*Math.PI/2)+ledges*Math.sin(v*Math.PI))*taper;
    return [ca*r-.85*v*v,height(ca*rim,sa*rim)-v*6.9,sa*r+.35*v*v];
  }
  function terrain(top){const positions=[],uvs=[],colors=[],indices=[];const rows=top?48:100,cols=192;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=i/cols,v=j/rows,a=u*Math.PI*2,r=v*rimRadius(a);
      const [x,y,z]=top?[Math.cos(a)*r,height(Math.cos(a)*r,Math.sin(a)*r),Math.sin(a)*r]:cliffPoint(a,v);
      positions.push(x,y,z);uvs.push(top?x/6:u*4,top?z/6:v*3);
      const c=new T.Color(top?'#a19f89':'#667b80');
      if(top&&v>.93)c.lerp(new T.Color('#657044'),Math.min(1,(v-.93)/.035)*(.65+noise(x*3,z*3)*.3));
      const grain=noise(x*4,y*1.4,z*4)*.15+noise(x*13,y*2,z*13)*.07;
      const strata=top?0:Math.sin(y*10+noise(x*.8,z*.8)*2)*.035;
      c.multiplyScalar(top?.87+noise(x*1.5,z*1.5)*.15:.82+grain+strata+.18*(1-v));colors.push(c.r,c.g,c.b);
      if(j<rows&&i<cols){const k=j*(cols+1)+i;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    const material=new T.MeshStandardMaterial({color:'#ffffff',map:stoneTex,bumpMap:stoneTex,bumpScale:top?.025:.065,roughness:1,vertexColors:true,side:T.DoubleSide});
    const m=mesh(g,material);m.name=top?'Open rocky summit':'Continuous stratified cliffs';m.userData.occluder=true;return m;
  }
  const summit=terrain(true),globe=terrain(false);
  // Indexed, smoothly shaded stones with broad erosion rather than sharp facets.
  const rockGeo=new T.SphereGeometry(1,24,16);const rp=rockGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const v=new T.Vector3().fromBufferAttribute(rp,i);v.multiplyScalar(1+noise(v.x*1.7,v.y*1.7,v.z*1.7)*.085);rp.setXYZ(i,v.x,v.y,v.z);}rockGeo.computeVertexNormals();
  const rockItems=[],mossItems=[],pebbles=[],treeItems=[],grassItems=[];
  function instance(geometry,material,items,name){const m=new T.InstancedMesh(geometry,material,items.length);m.name=name;const helper=new T.Object3D();items.forEach((o,i)=>{helper.position.set(...o.p);helper.rotation.set(...(o.r||[0,0,0]));helper.scale.set(...(o.s||[1,1,1]));helper.updateMatrix();m.setMatrixAt(i,helper.matrix);if(o.color)m.setColorAt(i,new T.Color(o.color));});m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;world.add(m);return m;}
  function streamX(z){return 2.55+.24*Math.sin(z*1.8);}
  function reserved(x,z){return (Math.abs(x+3.25)<2.1&&Math.abs(z-1.2)<1.5)||(Math.hypot(x-2.6,z+1.85)<1.2)||(Math.abs(x-3.45)<1.3&&Math.abs(z-2.7)<1.2)||(Math.hypot(x+2.65,z+2.65)<1.3)||(Math.abs(x)<.8&&Math.abs(z+4.5)<.9)||(Math.abs(x-streamX(z))<.42&&z>.15)||(Math.abs(x-4.4)<.7&&Math.abs(z-.15)<.7);}

  function pathX(z){return .45+.45*Math.sin(z*1.6);}
  for(let i=0;i<850;i++){const x=(rand()-.5)*12.0,z=(rand()-.5)*12.0;if(x*x+z*z>36||reserved(x,z))continue;
    const s=.028+rand()*.06;pebbles.push({p:[x,height(x,z)+.035,z],s:[s*1.3,s*.7,s],r:[rand(),rand()*6,rand()],color:rand()>.45?'#b7b49b':'#747969'});
    if(i%9===0&&Math.abs(x-pathX(z))>.4){const s=.15+rand()*.30;rockItems.push({p:[x,height(x,z)+s*.28,z],s:[s,s*.9,s*.85],r:[rand()*.2,rand()*6,rand()*.2]});}
  }
  const trailingMoss=[];
  for(let i=0;i<mossItems.length;i++){const patch=mossItems[i];for(let j=0;j<4;j++){const a=rand()*Math.PI*2,r=rand()*.25;trailingMoss.push({p:[patch.p[0]+Math.cos(a)*r,patch.p[1]-.08-rand()*.18,patch.p[2]+Math.sin(a)*r],s:[.04+rand()*.05,.05+rand()*.10,.04+rand()*.04],color:j%3?'#546335':'#788442'});}}
  instance(rockGeo,mat('#879455'),trailingMoss,'Small cliff vegetation');
  instance(rockGeo,stone,rockItems,'Weathered rim and summit rocks');instance(rockGeo,grass,mossItems,'Moss ledges');instance(rockGeo,mat('#bebba8'),pebbles,'Gravel and path stones');
  // Layered fir boughs: shared geometry gives dense foliage without thousands of draw calls.
  const treeParts=[],trunkGeo=new T.CylinderGeometry(.018,.037,1.2,6);trunkGeo.translate(0,.6,0);
  for(let layer=0;layer<7;layer++){
    const y=.25+layer*.13,r=.29*(1-layer/8),h=.31;
    const g=new T.ConeGeometry(r,h,9,1);const p=g.attributes.position;
    for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getZ(j);p.setY(j,p.getY(j)+noise(x*40,z*40,layer)*.045);}g.computeVertexNormals();g.translate(0,y,0);treeParts.push(g);
    for(let k=0;k<5;k++){const a=k/5*Math.PI*2+layer*.8,bough=new T.ConeGeometry(r*.35,.17,5);bough.rotateZ(.85);bough.rotateY(-a);bough.translate(Math.cos(a)*r*.48,y-.045,Math.sin(a)*r*.48);treeParts.push(bough);}
  }
  const treeGeo=mergeGeometries(treeParts,false);treeParts.forEach(g=>g.dispose());
  for(let i=0;i<42;i++){const x=(rand()-.5)*12.0,z=(rand()-.5)*12.0;if(x*x+z*z>36||reserved(x,z)||Math.abs(x-pathX(z))<.55||Math.abs(z-1.2)<.3)continue;const s=.20+rand()*.61;treeItems.push({p:[x,height(x,z),z],s:[s,s*(1+rand()*.25),s],r:[(rand()-.5)*.08,rand()*6,(rand()-.5)*.08],color:['#6d7e32','#526b32','#879044','#3f5b32'][i%4]});}
  instance(treeGeo,mat('#8c9f51',{roughness:1}),treeItems,'Layered evergreen forest');instance(trunkGeo,timber,treeItems,'Tree trunks');
  // Fine tufts fill the moss floor and break up the silhouette.
  const blades=[];for(let i=0;i<3;i++){const g=new T.ConeGeometry(.018,.17,3);g.translate(.022*i,.08,0);g.rotateY(i*2.1);blades.push(g);}const bladeGeo=mergeGeometries(blades,false);blades.forEach(g=>g.dispose());
  for(let i=0;i<(mobile?650:1400);i++){const x=(rand()-.5)*12.2,z=(rand()-.5)*12.2;if(x*x+z*z>37||reserved(x,z)||Math.abs(x-pathX(z))<.22||Math.abs(z-1.22)<.18)continue;const s=.35+rand()*.6;grassItems.push({p:[x,height(x,z),z],s:[s,s,s],r:[0,rand()*6,0],color:i%4===0?'#adb366':'#73853f'});}
  const tufts=instance(bladeGeo,mat('#92a255'),grassItems,'Meadow tufts');tufts.castShadow=false;

  // The garage exterior: timber structure, open bay, warm practical lamps and a full bench interior.
  const garage=anchor(-3.25,1.2,'Enter the workshop','garage');garage.scale.setScalar(.90);garage.rotation.y=.26;garage.rotation.z=.08;
  box([0,.07,0],[3.15,.18,2.35],stone,garage);
  for(let i=0;i<22;i++)box([-1.48+i*.14,.19,.15],[.132,.065,2.65],timber,garage);
  box([0,1.02,-.92],[3,1.7,.12],darkWood,garage);
  for(let i=0;i<20;i++)box([-1.4+i*.145,1.02,-.84],[.125,1.65,.04],timber,garage);
  for(const x of [-1.48,1.48]){
    box([x,1.02,-.03],[.14,1.8,1.86],darkWood,garage);
    for(let z=-.8;z<.9;z+=.16)box([x*1.02,1.05,z],[.055,1.72,.13],timber,garage);
    box([x,1.05,1.06],[.15,1.86,.16],timber,garage);
    beam([x,.95,1.05],[x*.7,1.72,1.05],.047,timber,garage);
  }
  box([0,1.95,.1],[3.35,.18,2.5],darkWood,garage);
  // Pitched corrugated roof, ridge, fascia and solar panel rack.
  for(const side of [-1,1]){
    const slope=box([0,2.15,side*.57],[3.48,.09,1.34],mat('#404d4b',{metalness:.52}),garage);slope.rotation.x=side*.30;
    for(let i=0;i<28;i++){const rib=box([-1.68+i*.125,2.20,side*.57],[.018,.035,1.35],steel,garage);rib.rotation.x=side*.30;}
    const fascia=box([0,1.98,side*1.23],[3.55,.12,.08],timber,garage);
  }
  beam([-1.78,2.36,0],[1.78,2.36,0],.05,steel,garage);
  const panels=new T.Group();panels.position.set(.15,2.30,.5);panels.rotation.x=.30;garage.add(panels);
  for(let k=0;k<3;k++){box([-.94+k*.90,.015,0],[.84,.06,.83],mat('#a1a5a6',{metalness:.8}),panels);box([-.94+k*.90,.053,0],[.77,.02,.76],mat('#1a2d54',{metalness:.45,roughness:.32}),panels);for(let i=1;i<4;i++){box([-.94+k*.90-.385+i*.192,.069,0],[.008,.008,.76],'#697ca6',panels);box([-.94+k*.90,.069,-.38+i*.19],[.77,.008,.008],'#697ca6',panels);}}
  cyl([-1.30,2.52,-.53],.085,.95,steel,garage);cyl([-1.30,3.0,-.53],.12,.07,steel,garage);
  // Workbench, drawers, tools, monitor, shelving, stools and clutter.
  box([0,.78,-.44],[2.7,.10,.66],timber,garage);
  for(const x of [-1.1,1.1])box([x,.45,-.44],[.12,.60,.47],darkWood,garage);
  box([-.82,.46,-.43],[.56,.58,.53],mat('#69716a'),garage);
  for(let i=0;i<3;i++){box([-.82,.28+i*.18,-.14],[.50,.15,.04],steel,garage);box([-.82,.28+i*.18,-.10],[.19,.022,.02],brass,garage);}
  box([.70,1.08,-.56],[.49,.32,.05],black,garage);box([.70,1.08,-.522],[.42,.24,.01],mat('#5dbbd4',{emissive:'#3aa7cf',emissiveIntensity:.8}),garage);beam([.7,.81,-.55],[.7,.95,-.55],.03,steel,garage);
  box([.66,.85,-.22],[.42,.03,.15],black,garage);
  const peg=box([-.35,1.29,-.76],[1.36,.68,.045],mat('#ae9569',{map:woodTex}),garage);
  for(let i=0;i<8;i++){const x=-.91+i*.16;beam([x,1.24,-.718],[x,1.48-(i%3)*.05,-.718],.012,steel,garage);box([x,1.20,-.707],[.038,.12,.028],i%2?'#4c6571':'#a86138',garage);}
  for(const x of [-1.1,1.07]){box([x,1.58,-.55],[.53,.05,.45],timber,garage);for(let j=0;j<4;j++)box([x-.19+j*.125,1.71,-.56],[.09,.20,.18],['#91836a','#67888b','#b49962','#646d5b'][j],garage);}
  for(let i=0;i<7;i++)ball([-.25+rand()*.55,.86,-.25+rand()*.23],.025,brass,garage);
  for(const x of [-.7,.8]){cyl([x,.5,.57],.22,.075,timber,garage);for(let k=0;k<3;k++){const a=k/3*Math.PI*2;beam([x+Math.cos(a)*.15,.48,.57+Math.sin(a)*.15],[x+Math.cos(a)*.20,.20,.57+Math.sin(a)*.20],.022,steel,garage);}}
  for(let i=0;i<6;i++){const paper=box([-.48+i*.15,1.57,-.715],[.11,.14,.006],mat(i%2?'#d8c6a3':'#bcbbaa'),garage);paper.rotation.z=(rand()-.5)*.17;}
  box([-.26,.87,-.27],[.22,.07,.19],steel,garage);
  for(const x of [-.34,-.18])beam([x,.90,-.29],[x,1.14,-.29],.012,steel,garage);
  beam([-.34,1.14,-.29],[-.18,1.14,-.29],.012,steel,garage);
  box([-.26,1.02,-.29],[.04,.04,.04],brass,garage);
  const benchLight=new T.PointLight('#ffc976',3.6,3.2,2);benchLight.position.set(0,1.39,-.10);garage.add(benchLight);
  const rug=box([0,.235,.38],[1.0,.015,.66],mat('#86694c',{map:woodTex}),garage);
  for(const x of [-1.29,1.29]){
    const glow=mat('#ffd59b',{emissive:'#ffad46',emissiveIntensity:3.8});ball([x,1.58,1.02],.065,glow,garage);cyl([x,1.68,1.02],.14,.065,steel,garage);
    const light=new T.PointLight('#ffb957',5,4,2);light.position.set(x,1.5,.74);garage.add(light);
  }
  const strip=box([0,1.72,-.51],[2.55,.035,.08],mat('#ffe4b6',{emissive:'#ffca78',emissiveIntensity:2.3}),garage);
  // Side deck, handrails, barrel, crates, ladder and climbing plants.
  box([-1.91,.1,.61],[.78,.13,1.45],timber,garage);
  // Keep the exhibit frontage open; the cabinet adds handrails at the deck ends.
  for(let i=0;i<3;i++)box([1.47,.12-i*.11,1.27+i*.16],[.65,.10,.24],timber,garage);
  cyl([1.86,.35,.48],.22,.58,mat('#59666a'),garage);for(const y of [.15,.55])cyl([1.86,y,.48],.225,.025,steel,garage);
  box([1.93,.23,-.24],[.50,.45,.48],timber,garage);for(const y of [.10,.37])box([1.93,y,.006],[.52,.045,.018],darkWood,garage);
  for(const x of [-1.18,-.86])beam([x,.25,-.65],[x,1.73,-.69],.018,timber,garage);for(let i=0;i<7;i++)beam([-1.18,.32+i*.20,-.64],[-.86,.32+i*.20,-.64],.013,timber,garage);

  // Observatory with actual segmented dome opening, riveted panels, telescope and door.
  const observatory=anchor(2.6,-1.85,'Research observatory','research');observatory.rotation.y=-.18;observatory.rotation.z=-.06;
  cyl([0,.10,0],.84,.18,stone,observatory);cyl([0,.53,0],.70,.85,mat('#c3b9a6'),observatory);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;box([Math.sin(a)*.705,.55,Math.cos(a)*.705],[.033,.80,.035],steel,observatory);}
  cyl([0,.97,0],.74,.10,steel,observatory);cyl([0,.16,0],.75,.07,steel,observatory);
  const domeMats=['#b7c1c8','#8e9fae','#c8ced2','#b0bcc5'];
  for(let i=0;i<12;i++){if(i===2||i===3)continue;const g=new T.SphereGeometry(.735,6,12,i/12*Math.PI*2,Math.PI*2/12-.018,0,Math.PI/2);mesh(g,mat(domeMats[i%4],{metalness:.45,roughness:.43,side:T.DoubleSide}),observatory,[0,1.0,0]);}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;if(i===3)continue;const pts=[];for(let j=0;j<=12;j++){const t=j/12*Math.PI/2;pts.push([Math.cos(a)*Math.sin(t)*.748,1+Math.cos(t)*.748,Math.sin(a)*Math.sin(t)*.748]);}tube(pts,.013,steel,observatory);}
  box([0,.50,.708],[.29,.58,.055],darkWood,observatory);box([.09,.52,.745],[.026,.05,.018],brass,observatory);
  for(const x of [-.4,.4]){box([x,.57,.59],[.17,.28,.045],steel,observatory);box([x,.57,.62],[.12,.22,.02],mat('#e6bc66',{emissive:'#ffa64f',emissiveIntensity:.45}),observatory);}
  const telescope=new T.Group();telescope.position.set(.09,1.22,.22);telescope.rotation.x=.82;observatory.add(telescope);
  cyl([0,.31,0],.14,.84,brass,telescope);cyl([0,.72,0],.185,.12,steel,telescope);cyl([0,.789,0],.143,.009,mat('#376c88',{metalness:.75,roughness:.15,emissive:'#19627f',emissiveIntensity:.3}),telescope);cyl([0,-.16,0],.09,.19,steel,telescope);
  const observLight=new T.PointLight('#ffc36f',2,2.4,2);observLight.position.set(0,1.1,.3);observatory.add(observLight);

  // Braced communications tower and parabolic dishes.
  const station=anchor(4.4,.15,'Blog · radio station','blog');station.scale.setScalar(.93);
  box([0,.26,0],[.65,.49,.68],mat('#b7b3a1'),station);box([.10,.25,.354],[.21,.34,.026],steel,station);box([-.17,.32,.354],[.17,.13,.025],black,station);
  for(const x of [-.23,.23])for(const z of [-.20,.20])beam([x,.5,z],[x*.35,2.65,z*.35],.018,steel,station);
  for(let i=0;i<6;i++){const y=.53+i*.33,w=.23*(1-(y-.5)/3.2);for(const z of [-1,1]){beam([-w,y,z*w],[w*.85,y+.33,z*w*.85],.012,i%2?steel:mat('#9d5545'),station);beam([w,y,z*w],[-w*.85,y+.33,z*w*.85],.012,steel,station);}}
  beam([0,2.60,0],[0,3.10,0],.018,steel,station);ball([0,3.13,0],.035,mat('#ff7970',{emissive:'#ff3723',emissiveIntensity:4}),station);
  for(const y of [1.22,2.03]){const dish=mesh(new T.SphereGeometry(.23,16,8,0,Math.PI*2,0,Math.PI*.32),mat('#c9c6ba',{side:T.DoubleSide,metalness:.4}),station,[-.25,y,.18],[1,.45,1]);dish.rotation.x=1.3;beam([-.25,y,.18],[-.25,y+.13,.44],.013,steel,station);}
  for(const x of [-.8,.8])beam([0,2.15,0],[x,.02,.6],.006,steel,station);
  const cabin=anchor(0,-4.5,'About Sam','about');box([0,.37,0],[.7,.73,.8],timber,cabin);const cabinRoof=mesh(new T.ConeGeometry(.7,.5,4),darkWood,cabin,[0,.97,0]);cabinRoof.rotation.y=Math.PI/4;box([0,.4,.41],[.22,.4,.03],brass,cabin);

  // Stream drops over the rim in two cascades and then follows the curved cliff.
  const waterUniforms={time:{value:0}};
  const waterMat=new T.ShaderMaterial({uniforms:waterUniforms,side:T.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv; uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec2 flow=vec2(vUv.x*19.,vUv.y*37.-time*1.6);float n=noise(flow)*.65+noise(flow*2.2)*.35;float foam=smoothstep(.57,.88,n);float sheen=noise(vec2(vUv.x*43.,vUv.y*92.-time*3.));float edge=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x);vec3 c=mix(vec3(.025,.20,.24),vec3(.22,.62,.70),n);c=mix(c,vec3(.75,.91,.92),foam*.80+pow(sheen,8.)*.35);gl_FragColor=vec4(c,edge*.90);}`});
  function ribbon(points,width,material=waterMat){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),p=[],uv=[],idx=[];const steps=100;
    for(let i=0;i<=steps;i++){const v=curve.getPoint(i/steps);for(const side of [-1,1]){p.push(v.x+side*width*(.5+.07*Math.sin(i*.7)),v.y,v.z);uv.push((side+1)/2,i/steps);}if(i<steps){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=mesh(g,material);m.castShadow=false;m.name='Flowing waterfall';return curve;
  }
  const streamPoints=[];for(let i=0;i<18;i++){const z=.15+i*.3176;streamPoints.push([streamX(z),height(streamX(z),z)+.06,z]);}
  ribbon(streamPoints.map(p=>[p[0],p[1]-.025,p[2]]),.53,mat('#163735'));
  ribbon(streamPoints,.40);
  const fallAngle=Math.atan2(5.55,streamX(5.55)),fallR=rimRadius(fallAngle);
  const lip=[Math.cos(fallAngle)*fallR,height(Math.cos(fallAngle)*fallR,Math.sin(fallAngle)*fallR)+.045,Math.sin(fallAngle)*fallR];
  const fallPoints=[streamPoints[streamPoints.length-1],lip];
  for(let i=1;i<=30;i++){const t=i/30;fallPoints.push([lip[0]+t*.12,lip[1]-t*7.3,lip[2]+.10+t*.28]);}
  ribbon(fallPoints,.29);
  const foamItems=[];for(let i=0;i<65;i++){const z=.2+rand()*5.3,x=streamX(z)+(rand()-.5)*.35;foamItems.push({p:[x,height(x,z)+.077,z],s:[.008+rand()*.014,.005,.025+rand()*.04]});}instance(sphereGeo,mat('#acdfd9',{emissive:'#368eac',emissiveIntensity:.25}),foamItems,'Stream foam');
  // Wooden suspension footbridge spans the stream; ropes have a real sag.
  const bridge=new T.Group();bridge.position.set(streamX(2.36),height(streamX(2.36),2.36)+.09,2.36);bridge.rotation.y=-.20;world.add(bridge);
  for(let i=0;i<15;i++){const x=-.77+i*.11,y=-.12*Math.sin(i/14*Math.PI);const plank=box([x,y,0],[.10,.065,.47],timber,bridge);plank.rotation.z=-Math.cos(i/14*Math.PI)*.055;}
  for(const x of [-.86,.86])for(const z of [-.25,.25])beam([x,-.15,z],[x,.47,z],.025,timber,bridge);
  for(const z of [-.25,.25]){tube([[-.87,.46,z],[-.43,.30,z],[0,.23,z],[.43,.30,z],[.87,.46,z]],.012,mat('#8c7a4f'),bridge);for(let i=0;i<7;i++){const x=-.66+i*.22;beam([x,-.09,z],[x,.25+Math.abs(x)*.16,z],.007,mat('#8c7a4f'),bridge);}}

  // Freestanding neon arrows have metal housings, physical luminous tubes and double-sided labels.
  const sign=anchor(0,-1.05,'Neon crossroads');sign.scale.setScalar(.68);sign.position.set(.1,height(.1,3.25),3.25);
  cyl([0,1.85,0],.066,3.75,steel,sign);cyl([0,.12,0],.22,.22,steel,sign);
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;beam([Math.cos(a)*.31,.02,Math.sin(a)*.31],[0,.67,0],.04,steel,sign);}
  const destinations=[['projects','#65efff',1],['blog','#ff60b3',-1],['research','#ffbd63',1],['about','#c996ff',-1]];
  destinations.forEach(([name,color,dir],i)=>{
    const group=new T.Group();group.position.set(dir*.23,3.40-i*.67,.055);group.rotation.y=dir*.045;group.rotation.z=dir*.025;group.userData={action:name,label:`Visit ${name}`};sign.add(group);
    const shape=new T.Shape();const pts=dir===1?[[-.98,-.22],[.69,-.22],[1.01,0],[.69,.22],[-.98,.22]]:[[-1.01,0],[-.69,-.22],[.98,-.22],[.98,.22],[-.69,.22]];pts.forEach(([x,y],j)=>j?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const backing=mesh(new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.025,bevelThickness:.015,bevelSegments:2,steps:1}),steel,group,[0,0,-.075]);
    const neon=mat('#141b23',{emissive:color,emissiveIntensity:2.4});
    const outline=[...pts,pts[0]].map(([x,y])=>[x*.955,y*.86,.021]);for(let j=0;j<outline.length-1;j++)beam(outline[j],outline[j+1],.012,neon,group);
    const c=document.createElement('canvas');c.width=1024;c.height=224;const ctx=c.getContext('2d');ctx.clearRect(0,0,1024,224);ctx.font='500 162px "Arial Narrow", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5f0';ctx.shadowColor=color;ctx.shadowBlur=17;ctx.fillText(({projects:'ENGINEERING',blog:'BROADCAST',research:'RESEARCH',about:'HABITAT'})[name],512,120,840);ctx.shadowBlur=0;ctx.fillText(({projects:'ENGINEERING',blog:'BROADCAST',research:'RESEARCH',about:'HABITAT'})[name],512,120,840);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
    const labelMat=new T.MeshBasicMaterial({map:tex,transparent:true,color,side:T.DoubleSide,depthWrite:false,toneMapped:false});
    const label=mesh(new T.PlaneGeometry(1.60,.35),labelMat,group,[dir===1?-.10:.10,0,.035]);label.castShadow=false;
    const backLabel=label.clone();backLabel.position.z=-.10;backLabel.rotation.y=Math.PI;group.add(backLabel);
    for(const x of [-.80,.53]){ball([x,-.155,.035],.016,brass,group);ball([x,.155,.035],.016,brass,group);}
    box([-.22,0,-.13],[.12,.50,.09],brass,group);
    tube([[0,0,-.13],[-.14,-.12,-.2],[0,-.35,-.13]],.012,mat(color,{emissive:color,emissiveIntensity:.2}),group);
  });
  cyl([0,3.95,0],.037,.40,steel,sign);ball([0,4.16,0],.070,mat('#8aecff',{emissive:'#48dfee',emissiveIntensity:3}),sign);
  const signLight=new T.PointLight('#63dbea',1.5,3.6,2);signLight.position.set(0,2,.4);sign.add(signLight);

  // Fine colored stars with a few brighter bloom points, moon craters and ringed planet.
  function starField(count,size){const p=[],c=[];for(let i=0;i<count;i++){const v=new T.Vector3(rand()*2-1,rand()*2-1,rand()*2-1).normalize().multiplyScalar(50+rand()*35);p.push(...v.toArray());const color=new T.Color(['#9ebae1','#dce4ff','#fff2db','#b3caff'][i%4]);color.multiplyScalar(.4+rand()*.6);c.push(color.r,color.g,color.b);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));const stars=new T.Points(geo,new T.PointsMaterial({vertexColors:true,size,sizeAttenuation:true,transparent:true,opacity:.85}));scene.add(stars);}
  starField(5500,.13);starField(180,.21);
  for(let i=0;i<12;i++){const o=mesh(rockGeo,stone,scene,[(rand()-.5)*23,(rand()-.5)*10,-5-rand()*8],[.07+rand()*.23,.12+rand()*.20,.12+rand()*.18]);o.rotation.set(rand()*6,rand()*6,rand()*6);}
  const moon=new T.Group();moon.position.set(-11.8,.1,-6);scene.add(moon);ball([0,0,0],.46,stone,moon);
  for(let i=0;i<28;i++){const n=new T.Vector3(rand()*2-1,rand()*2-1,rand()*2-1).normalize();const crater=mesh(new T.TorusGeometry(.025+rand()*.05,.012,5,12),mat('#767578'),moon,n.clone().multiplyScalar(.453).toArray());crater.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);}
  const saturn=new T.Group();saturn.position.set(12.8,3.5,-12);saturn.rotation.z=-.30;scene.add(saturn);ball([0,0,0],.49,mat('#aa9181'),saturn);
  for(let i=0;i<9;i++){const ring=mesh(new T.RingGeometry(.68+i*.025,.693+i*.025,80),new T.MeshBasicMaterial({color:i%2?'#8b8179':'#b1a194',side:T.DoubleSide,transparent:true,opacity:.42}),saturn);ring.rotation.x=1.13;}
  const galaxyPositions=[],galaxyColors=[];
  for(let i=0;i<650;i++){const r=Math.pow(rand(),1.6)*1.35,a=r*4.7+(i%3)*Math.PI*2/3+(rand()-.5)*.65;galaxyPositions.push(Math.cos(a)*r,Math.sin(a)*r*.30,(rand()-.5)*.09);const c=new T.Color(i%3?'#51577d':'#8c7796');c.multiplyScalar(.2+rand()*.55);galaxyColors.push(c.r,c.g,c.b);}
  const galaxyGeo=new T.BufferGeometry();galaxyGeo.setAttribute('position',new T.Float32BufferAttribute(galaxyPositions,3));galaxyGeo.setAttribute('color',new T.Float32BufferAttribute(galaxyColors,3));const galaxy=new T.Points(galaxyGeo,new T.PointsMaterial({size:.042,vertexColors:true,transparent:true,opacity:.60}));galaxy.position.set(-14,6,-18);galaxy.rotation.z=-.45;scene.add(galaxy);
  for(const [x,y,z] of [[-9,7,-13],[6,-3,-8],[11,2,-16],[-7,-3,-15],[-2,8,-14],[14,-5,-20]]){const star=ball([x,y,z],.024,new T.MeshBasicMaterial({color:new T.Color('#ffe1b9').multiplyScalar(3)}),scene);star.castShadow=false;}
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const glowContext=glowCanvas.getContext('2d'),glowGradient=glowContext.createRadialGradient(64,64,0,64,64,64);glowGradient.addColorStop(0,'rgba(255,201,137,.28)');glowGradient.addColorStop(.10,'rgba(240,165,89,.15)');glowGradient.addColorStop(.4,'rgba(177,108,62,.04)');glowGradient.addColorStop(1,'rgba(0,0,0,0)');glowContext.fillStyle=glowGradient;glowContext.fillRect(0,0,128,128);const glowTexture=new T.CanvasTexture(glowCanvas);glowTexture.colorSpace=T.SRGBColorSpace;const sunGlow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sunGlow.position.set(-21,-14,-16);sunGlow.scale.set(13,13,1);scene.add(sunGlow);
  return {world,globe,summit,garage,observatory,station,cabin,height,tick(seconds){waterUniforms.time.value=seconds;}};
}
