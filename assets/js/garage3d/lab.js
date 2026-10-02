import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Right exterior bulkhead is 4.4 × 5.0 m at (5.3, 2.5, −0.8). The board covers
// that face with a few centimetres of edge inset so the bezel does not z-fight.
export const WALL_SIZE = { width: 4.36, height: 4.90 };
export const WALL_CANVAS = { width: 2560, height: 2880 };

const NEON_NAMES = ['rootOnlineSign','accessGrantedSign','blahaLabsSign','neonBlue01'];

function contactApron(scene){
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;void main(){
      float d=distance(vUv,vec2(.5));
      float apron=smoothstep(.5,.18,d);
      float contact=pow(clamp(1.-d/.22,0.,1.),1.8)*.62;
      vec3 col=mix(vec3(.018,.04,.055),vec3(.004,.01,.016),smoothstep(.08,.46,d));
      gl_FragColor=vec4(col,apron*.5+contact);
    }`
  });
  const mesh=new T.Mesh(new T.CircleGeometry(38,64),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-.05;mesh.renderOrder=-2;
  mesh.raycast=()=>{};scene.add(mesh);
}

function boostNeon(world){
  NEON_NAMES.forEach(name=>{
    const object=world.getObjectByName(name);
    if(!object)return;
    object.traverse(child=>{
      if(!child.isMesh||!child.material||!('emissive' in child.material))return;
      child.material.emissiveIntensity=Math.max(child.material.emissiveIntensity||0,2.35);
      child.castShadow=false;
    });
  });
}

function metal(color,metalness,roughness,emissive='#000000',emissiveIntensity=0){
  return new T.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
}

/** Blender owns geometry; the runtime owns screens, animation and holography. */
export async function loadLab(scene, mobile, status) {
  status.textContent='LOADING GEOMETRY';
  const gltf=await new GLTFLoader().loadAsync('/assets/models/garage.glb?v=yellow-vending-1');
  const world=gltf.scene; scene.add(world);
  const required=name=>{const object=world.getObjectByName(name);if(!object)throw new Error(`Garage asset missing ${name}`);return object;};
  world.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=true;object.receiveShadow=true;
    const mat=object.material;
    if(mat && mat.roughness!=null)mat.roughness=Math.min(Math.max(mat.roughness,.28),.92);
  });
  const floor=world.getObjectByName('floor');
  if(floor)floor.traverse(object=>{
    if(!object.isMesh||!object.material)return;
    object.receiveShadow=true;
    object.material.roughness=Math.min(object.material.roughness??.85,.7);
    object.material.metalness=Math.max(object.material.metalness??0,.12);
    if(object.material.color&&object.material.color.offsetHSL)object.material.color.offsetHSL(0,-.04,-.06);
  });
  boostNeon(world);
  contactApron(scene);
  const dispenser=required('projectDispenser');
  dispenser.visible=false;
  dispenser.traverse(object=>{object.raycast=()=>{};});
  required('projectTerminal').visible=false;
  const accentLights=[
    ['#42f2ff',4.6,[-3.9,3.35,-1.45],5.4],
    ['#3ad8ea',3.2,[3.85,2.7,-1.3],4.4],
    ['#ff168f',2.6,[3.2,4,-1.9],3.1],
    ['#ff9a3c',1.9,[-4.15,2.15,-1.35],3.2],
    ['#ffe7b0',1.7,[6.7,2.55,.35],3.8]
  ].map(([color,intensity,position,distance])=>{
    const light=new T.PointLight(color,intensity,distance,2);light.position.set(...position);scene.add(light);return light;
  });
  status.textContent='CALIBRATING SYSTEMS';
  const screenCanvas=document.createElement('canvas');
  screenCanvas.width=WALL_CANVAS.width;screenCanvas.height=WALL_CANVAS.height;
  const texture=new T.CanvasTexture(screenCanvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  const wall=new T.Group();
  // Full +X exterior bulkhead, facing the walkway / orbit camera — not the interior rack.
  wall.position.set(5.58,2.5,-.8);
  wall.rotation.y=Math.PI/2;
  scene.add(wall);
  const chassis=new T.Mesh(
    new T.BoxGeometry(WALL_SIZE.width+.16,WALL_SIZE.height+.18,.11),
    metal('#0a1118',.42,.58,'#071018',.22)
  );
  chassis.position.z=-.07;
  chassis.userData={action:'arcade',label:'Project wall'};
  wall.add(chassis);
  const lip=new T.Mesh(
    new T.BoxGeometry(WALL_SIZE.width+.05,WALL_SIZE.height+.05,.04),
    metal('#141c24',.28,.4)
  );
  lip.position.z=-.018;lip.raycast=()=>{};wall.add(lip);
  const screen=new T.Mesh(
    new T.PlaneGeometry(WALL_SIZE.width,WALL_SIZE.height),
    new T.MeshBasicMaterial({map:texture,toneMapped:false,side:T.DoubleSide})
  );
  screen.position.z=.016;
  screen.userData={action:'arcade-select',label:'Project wall'};
  wall.add(screen);
  const led=new T.Mesh(
    new T.BoxGeometry(WALL_SIZE.width*.92,.016,.03),
    metal('#9ff7ff',.08,.22,'#42f2ff',1.35)
  );
  led.position.set(0,WALL_SIZE.height*.5+.095,-.045);led.raycast=()=>{};wall.add(led);
  const wash=new T.PointLight('#42f2ff',.75,4.6,2);
  wash.position.set(0,WALL_SIZE.height*.42,.55);
  wall.add(wash);
  wall.updateMatrixWorld(true);
  required('printer01').userData={action:'delta',label:'Fabrication / Delta printer'};
  const animated=[];
  const printer=required('printer01'), printerX=printer.position.x;
  animated.push(t=>printer.position.x=printerX+Math.sin(t*.5)*.32);
  const rootSign=required('rootOnlineSign');
  const rootMaterial=rootSign.material;
  animated.push(t=>{
    const pulse=.72+.28*Math.sin(t*3.2);
    if('emissiveIntensity' in rootMaterial)rootMaterial.emissiveIntensity=1.8+pulse*1.7;
    accentLights[2].intensity=1.8+pulse*1.15;
    led.material.emissiveIntensity=1.35+.28*Math.sin(t*2.1);
  });
  const model=required('hologramObject');
  const uniforms={uTime:{value:0},uColor:{value:new T.Color('#42f2ff')}};
  const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    vertexShader:`varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime; uniform vec3 uColor; varying vec3 vPosition;
    void main(){float scan=.38+.62*pow(sin(vPosition.z*96.-uTime*1.7)*.5+.5,4.2);float band=pow(max(0.,sin(vPosition.z*6.2-uTime*.85)),16.);float fres=pow(1.-abs(normalize(vPosition).z),.55);gl_FragColor=vec4(uColor*(.95+band*1.1+fres*.35),scan*.42+.1);}`});
  model.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;o.receiveShadow=false;}});
  animated.push(t=>{uniforms.uTime.value=t;model.rotation.y=t*.18;});
  const grid=new T.Mesh(new T.PlaneGeometry(1.18,1.18),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uTime;void main(){vec2 cell=abs(fract(vUv*14.-uTime*.03)-.5);float line=step(.47,max(cell.x,cell.y));float edge=1.-smoothstep(.32,.5,distance(vUv,vec2(.5)));gl_FragColor=vec4(uColor,line*edge*.48);}`}));
  grid.rotation.x=-Math.PI/2;grid.position.set(0,1.802,.1);scene.add(grid);
  animated.forEach(fn=>fn(0));
  const lookTarget=new T.Vector3();
  screen.getWorldPosition(lookTarget);
  const wallFacing=screen.getWorldQuaternion(new T.Quaternion());
  const screenNormal=new T.Vector3(0,0,1).applyQuaternion(wallFacing.clone());
  const halfH=WALL_SIZE.height*.5;
  const fitDistance=(halfH/Math.tan((39*Math.PI/180)/2))*(mobile?1.22:1.14);
  const cameraPosition=lookTarget.clone()
    .add(screenNormal.clone().multiplyScalar(fitDistance))
    .add(new T.Vector3(0,mobile?.1:.04,mobile?1.2:.65));
  return {world,animated,arcade:{canvas:screenCanvas,texture,screen,hits:[],size:WALL_SIZE,cameraPosition,lookTarget,normal:screenNormal}};
}
