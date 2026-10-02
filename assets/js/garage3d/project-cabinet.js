import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { shortTitle } from './vending-screen.js';

const MODEL_IDS=new Set(['virtual-ball-rack','pi-pentester','quantum-random-number-generator','guppy','caesar-cipher','golf-ball-printer','kali-macbook','delta-3d-printer','retro-pi','laser-timing-gates']);

/** A real specimen cabinet fixed to the garage's local -X exterior wall. */
export function createProjectCabinet(garage,projects){
  const group=new T.Group();group.name='Exterior left · build cabinet';group.position.set(-1.62,1.12,.02);group.rotation.y=-Math.PI/2;group.userData={action:'projects',label:'The build cabinet · explore projects'};garage.add(group);
  let disposed=false,selected=0,hovered=-1,active=false,offset=0,travel=0,lastTime=null;
  const loaded=new Set();
  const models=[],slots=[],lamps=[],hitTargets=[],treads=[],rollers=[],portals=[];
  const clipPlanes=[new T.Plane(),new T.Plane()];
  const steel=new T.MeshStandardMaterial({color:0x283b3d,metalness:.7,roughness:.38});
  const loader=new GLTFLoader(),geometry=new T.BoxGeometry(1,1,1);
  const wood=new T.MeshStandardMaterial({color:'#57402e',roughness:.87});
  const brass=new T.MeshStandardMaterial({color:'#af8a50',metalness:.65,roughness:.45});
  const ink=new T.MeshStandardMaterial({color:'#122022',roughness:.7});
  const lightMaterial=new T.MeshStandardMaterial({color:'#fff0cb',emissive:'#ffca83',emissiveIntensity:2.2});
  function box(x,y,z,w,h,d,material,parent=group){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function label(text,w,h,{paper=false,font=42,sub=''}={}){
    const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');
    ctx.fillStyle=paper?'#d9c393':'#142020';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=paper?'#aa8b57':'#a78955';ctx.lineWidth=5;ctx.strokeRect(6,6,c.width-12,c.height-12);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=paper?'#38291c':'#f4e3bc';ctx.font=`600 ${font}px ${paper?'Georgia':'monospace'}`;ctx.fillText(text,c.width/2,c.height*(sub?.38:.52),c.width-46);
    if(sub){ctx.font='25px monospace';ctx.fillStyle='#c4b598';ctx.fillText(sub,c.width/2,c.height*.77,c.width-46);}
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
    return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,toneMapped:false}));
  }
  // A fixed walnut-and-enamel machine surrounds two independent return belts.
  box(0,0,-.08,3.04,1.76,.14,wood);
  for(const y of [-.88,.86])box(0,y,.13,3.10,.10,.48,steel);
  for(const x of [-1.44,1.44]){
    box(x,0,.22,.23,1.76,.55,steel);
    box(x,0,.505,.12,1.64,.018,brass);
    for(const y of [-.72,.72]){const bolt=new T.Mesh(new T.SphereGeometry(.022,10,8),brass);bolt.position.set(x,y,.525);group.add(bolt);}
    for(let i=0;i<7;i++)box(x,-.35+i*.09,.52,.085,.012,.008,ink);
  }
  const heading=label('THE BUILD CONVEYOR',2.70,.27,{font:56,sub:'A moving collection of things I make.'});heading.position.set(0,1.035,.46);group.add(heading);
  for(const [row,y] of [[0,.10],[1,-.74]]){
    box(0,y-.045,.18,2.78,.12,.47,steel);
    box(0,y+.016,.16,2.74,.035,.39,ink);
    box(0,y-.047,.43,2.76,.055,.028,brass);
    // Fine transverse ribs, rather than oversized gold stripes.
    for(let i=0;i<56;i++){const tread=box(-1.375+i*.05,y+.037,.16,.012,.008,.37,steel);tread.userData={baseX:tread.position.x,row};treads.push(tread);}
    for(const x of [-1.34,1.34]){
      const roller=new T.Mesh(new T.CylinderGeometry(.072,.072,.42,24),brass);roller.rotation.x=Math.PI/2;roller.position.set(x,y-.035,.18);group.add(roller);rollers.push(roller);
      const hub=new T.Mesh(new T.CylinderGeometry(.025,.025,.435,16),ink);hub.rotation.x=Math.PI/2;hub.position.copy(roller.position);group.add(hub);
    }
    box(0,y+.68,.12,2.62,.038,.24,steel);
    box(0,y+.657,.17,2.47,.012,.10,lightMaterial);
    const badge=label(row===0?'01  /  IDEAS IN MOTION  →':'02  /  THE RETURN JOURNEY  ←',1.0,.055,{font:34});badge.position.set(-.75,y-.047,.45);group.add(badge);
  }
  // Vertical energy rifts conceal the exact clipping boundary at each belt end.
  for(const [row,y] of [[0,.42],[1,-.42]])for(const side of [-1,1]){
    const entry=(row===0&&side===-1)||(row===1&&side===1);
    const color=new T.Color(entry?'#54ffe0':'#ad80ff');
    const portal=new T.Group();portal.position.set(side*1.31,y,.36);group.add(portal);
    const rimMaterial=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:3,metalness:.4,roughness:.2});
    const rim=new T.Mesh(new T.TorusGeometry(1,.035,10,72),rimMaterial);rim.scale.set(.14,.32,.14);portal.add(rim);
    const outer=new T.Mesh(new T.TorusGeometry(1,.016,8,72),rimMaterial);outer.scale.set(.17,.35,.14);portal.add(outer);
    const fieldMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0},tint:{value:color}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 tint;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);float swirl=.5+.5*sin(a*4.-r*15.+time*1.6);float edge=pow(r,4.);float alpha=(.11+swirl*.20+edge*.50)*(1.-smoothstep(.90,1.,r));gl_FragColor=vec4(tint*(.65+swirl*.6),alpha);}`});
    const field=new T.Mesh(new T.CircleGeometry(1,64),fieldMaterial);field.scale.set(.14,.32,1);field.position.z=.012;portal.add(field);
    const sparks=[];
    for(let i=0;i<12;i++){const spark=new T.Mesh(new T.SphereGeometry(.009,6,4),rimMaterial);portal.add(spark);sparks.push(spark);}
    const glow=new T.PointLight(color,.40,.9,2);glow.position.z=.13;portal.add(glow);
    const caption=label(entry?'ARRIVAL':'RETURN',.27,.05,{font:100});caption.position.set(0,-.37,.025);portal.add(caption);
    portals.push({fieldMaterial,sparks,rimMaterial,entry});
  }
  projects.forEach((project,index)=>{
    const col=index%5,row=Math.floor((index%10)/5),x=-1.12+col*.56,y=.42-row*.84;
    const slot=new T.Group();slot.position.set(x,y,.035);slot.userData={action:`cabinet:${index}`,label:`${String(index+1).padStart(2,'0')} · ${project.title}`};group.add(slot);slots.push(slot);slot.visible=index<10;slot.userData.targetX=x;slot.userData.targetY=y;
    const hit=new T.Mesh(new T.PlaneGeometry(.51,.77),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));hit.position.set(0,-.005,.39);slot.add(hit);hitTargets.push(hit);
    // Only the tray and its object move. Lamps and cabinet walls stay fixed.
    box(0,-.275,.16,.45,.045,.32,steel,slot);
    box(0,-.247,.16,.41,.012,.28,wood,slot);
    for(const x of [-.21,.21])box(x,-.233,.16,.012,.035,.32,brass,slot);
    const number=label(`${String(index+1).padStart(2,'0')}  ${shortTitle(project.title)}`,.57,.115,{paper:true,font:72});number.position.set(0,-.288,.49);slot.add(number);
    const frameMaterial=new T.MeshBasicMaterial({color:'#83e8df',transparent:true,opacity:.16,toneMapped:false});
    box(0,-.244,.322,.40,.009,.009,frameMaterial,slot);lamps.push(frameMaterial);
    const pivot=new T.Group();pivot.position.set(0,0,.16);slot.add(pivot);models.push(pivot);
    // A dimensional e-reader for the one build without an authored miniature.
    if(!MODEL_IDS.has(project.id)){
      box(0,-.065,0,.235,.34,.025,ink,pivot);const page=label(shortTitle(project.title),.198,.274,{paper:true,font:70,sub:'BUILD NOTES'});page.position.set(0,-.065,.016);pivot.add(page);box(0,-.215,.016,.026,.012,.003,brass,pivot);
    }
    clip(slot);lamps[index]=slot.children.find(o=>o.material?.color?.getHexString()==='83e8df')?.material||frameMaterial;
  });
  // Front-facing trail marker makes the exterior cabinet discoverable from the home orbit.
  const marker=label('PROJECTS  ←',.64,.14,{font:99});marker.position.set(-1.90,.89,1.33);marker.userData={action:'projects',label:'Projects · outside left of the garage'};garage.add(marker);
  const wash=new T.PointLight('#ffcd8b',1.4,3.5,2);wash.position.set(0,1.1,.9);group.add(wash);
  const foot=label('PICK A MINIATURE TO OPEN ITS STORY',2.55,.14,{font:39});foot.position.set(0,-1.04,.17);group.add(foot);
  // Extend the existing small side deck just enough to stand in front of the exhibit.
  for(let i=0;i<19;i++)box(-2.06,.14,-1.12+i*.13,.82,.06,.12,wood,garage);
  for(const z of [-1.17,1.23]){box(-2.42,.42,z,.035,.56,.035,brass,garage);box(-2.06,.65,z,.75,.026,.026,brass,garage);}
  function clip(object){object.traverse(o=>{if(!o.isMesh)return;const original=Array.isArray(o.material)?o.material:[o.material];const materials=original.map(m=>{const copy=m.clone();copy.clippingPlanes=clipPlanes;copy.clipShadows=true;return copy;});o.material=Array.isArray(o.material)?materials:materials[0];});}
  function cleanup(object){object.traverse(o=>{o.geometry?.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!m)return;for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();});});}
  function load(){if(disposed)return;
    projects.forEach((project,index)=>{if(!MODEL_IDS.has(project.id)||loaded.has(index)||!slots[index].visible)return;loaded.add(index);
      loader.load(`/assets/models/miniatures/${encodeURIComponent(project.id)}.glb`,gltf=>{
        if(disposed){cleanup(gltf.scene);return;}
        const model=gltf.scene;model.rotation.y=-.10;model.updateMatrixWorld(true);
        const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
        const scale=Math.min(.38/Math.max(size.x,.01),.43/Math.max(size.y,.01),.27/Math.max(size.z,.01));
        model.scale.setScalar(scale);model.position.set(-center.x*scale,-.24-bounds.min.y*scale,-center.z*scale);
        model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});clip(model);models[index].add(model);
      },undefined,()=>{
        if(disposed)return;const fallback=label(shortTitle(project.title),.34,.27,{paper:true,font:65,sub:'Open build notes'});fallback.position.z=.02;clip(fallback);models[index].add(fallback);
      });
    });
  }
  function arrange(){
    group.updateWorldMatrix(true,false);
    clipPlanes[0].set(new T.Vector3(1,0,0),1.33).applyMatrix4(group.matrixWorld);
    clipPlanes[1].set(new T.Vector3(-1,0,0),1.33).applyMatrix4(group.matrixWorld);
    slots.forEach((slot,i)=>{
      const row=i%2,count=Math.max(5,Math.ceil((projects.length-row)/2));
      const phase=T.MathUtils.euclideanModulo(Math.floor(i/2)-offset+travel,count);
      const x=-1.6+phase*.64;
      slot.visible=x<1.6;
      slot.position.set(row===0?x:-x,row===0?.40:-.44,.035);
      slot.scale.setScalar(1);
    });
    if(active)load();
  }
  function shift(direction){offset+=direction*2;travel=0;arrange();const visible=slots.findIndex(s=>s.visible&&Math.abs(s.position.x)<.8);return Math.max(0,visible);}
  function select(index){selected=T.MathUtils.euclideanModulo(index,projects.length||1);if(slots[selected]&&(!slots[selected].visible||Math.abs(slots[selected].position.x)>1.1)){offset=Math.floor(selected/2);travel=2.5;arrange();}updateLights();}
  function pick(raycaster){group.updateWorldMatrix(true,true);const hits=raycaster.intersectObjects(hitTargets.filter(hit=>hit.parent.visible),false);for(const hit of hits){if(Math.abs(group.worldToLocal(hit.point.clone()).x)<1.32)return hit.object.parent;}return null;}
  function updateLights(){lamps.forEach((m,i)=>{m.opacity=i===selected?.95:i===hovered?.6:.12;});}
  function pose(aspect){group.updateWorldMatrix(true,false);const center=group.localToWorld(new T.Vector3(0,.08,.18));const q=group.getWorldQuaternion(new T.Quaternion());const normal=new T.Vector3(0,0,1).applyQuaternion(q),right=new T.Vector3(1,0,0).applyQuaternion(q),up=new T.Vector3(0,1,0).applyQuaternion(q);
    const phone=aspect<.8,distance=phone?2.70/(2*Math.tan(T.MathUtils.degToRad(20))*aspect*.88):4.3;
    const target=center.clone().addScaledVector(right,phone?0:.68).addScaledVector(up,phone?-distance*.12:0);
    return {target,position:target.clone().addScaledVector(normal,distance).addScaledVector(up,.10).addScaledVector(right,phone?0:.08)};
  }
  arrange();updateLights();
  return {group,load,select,pose,pick,shift,setActive(value){active=value;if(value)load();},hover(index){hovered=index;updateLights();},tick(time){
    const dt=lastTime===null?0:Math.min(.1,Math.max(0,time-lastTime));lastTime=time;
    travel+=dt*.055;
    arrange();
    treads.forEach(t=>{t.position.x=-1.375+T.MathUtils.euclideanModulo(t.userData.baseX+(t.userData.row===0?1:-1)*travel*.64+1.375,2.75);});
    portals.forEach((portal,index)=>{portal.fieldMaterial.uniforms.time.value=time;portal.rimMaterial.emissiveIntensity=2.5+Math.sin(time*1.4+index)*.35;portal.sparks.forEach((spark,i)=>{const a=i/12*Math.PI*2+time*.35*(portal.entry?1:-1);spark.position.set(Math.cos(a)*.155,Math.sin(a)*.335,.025+Math.sin(a*3+time)*.025);});});
    rollers.forEach(r=>{r.rotation.y=travel*.64/.072;});},dispose(){disposed=true;}};
}
