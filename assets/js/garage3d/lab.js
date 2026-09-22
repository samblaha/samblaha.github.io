import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Blender owns geometry; the runtime owns screens, animation and holography. */
export async function loadLab(scene, mobile, status) {
  status.textContent='LOADING GEOMETRY';
  const gltf=await new GLTFLoader().loadAsync('/assets/models/garage.glb?v=yellow-vending-1');
  const world=gltf.scene; scene.add(world);
  const required=name=>{const object=world.getObjectByName(name);if(!object)throw new Error(`Garage asset missing ${name}`);return object;};
  world.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  const accentLights=[
    ['#42f2ff',5.5,[-3.9,3.3,-1.5],5],
    ['#42f2ff',5.0,[3.9,2.6,-1.35],4],
    ['#ff168f',3.2,[3.2,4,-1.9],3],
    ['#ff8a22',2.4,[-4.2,2.2,-1.5],3],
    ['#fff3ba',2.4,[6.9,2.7,.3],4]
  ].map(([color,intensity,position,distance])=>{
    const light=new T.PointLight(color,intensity,distance,2);light.position.set(...position);scene.add(light);return light;
  });
  status.textContent='CALIBRATING SYSTEMS';
  const screenCanvas=document.createElement('canvas');screenCanvas.width=960;screenCanvas.height=1280;
  const texture=new T.CanvasTexture(screenCanvas);texture.colorSpace=T.SRGBColorSpace;
  const screen=new T.Mesh(new T.PlaneGeometry(1.42,1.9),new T.MeshBasicMaterial({map:texture,toneMapped:false}));
  const screenAnchor=required('projectTerminalScreen');
  screenAnchor.getWorldPosition(screen.position);screenAnchor.getWorldQuaternion(screen.quaternion);scene.add(screen);
  screen.userData={action:'arcade-select',label:'Blaha Cola project dispenser'};
  required('projectTerminal').userData={action:'arcade',label:'Blaha Cola project dispenser'};
  required('printer01').userData={action:'delta',label:'Fabrication / Delta printer'};
  const animated=[];
  const printer=required('printer01'), printerX=printer.position.x;
  animated.push(t=>printer.position.x=printerX+Math.sin(t*.5)*.32);
  const rootSign=required('rootOnlineSign');
  const rootMaterial=rootSign.material;
  animated.push(t=>{
    const pulse=.72+.28*Math.sin(t*3.2);
    if('emissiveIntensity' in rootMaterial)rootMaterial.emissiveIntensity=1.5+pulse*1.5;
    accentLights[2].intensity=2.2+pulse*1.4;
  });
  const model=required('hologramObject');
  const uniforms={uTime:{value:0},uColor:{value:new T.Color('#42f2ff')}};
  const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    vertexShader:`varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uTime; uniform vec3 uColor; varying vec3 vPosition;
    void main(){float scan=.45+.55*pow(sin(vPosition.z*110.-uTime*2.)*.5+.5,5.);float band=pow(max(0.,sin(vPosition.z*7.-uTime)),18.);gl_FragColor=vec4(uColor*(1.1+band),scan*.45+.12);}`});
  model.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;o.receiveShadow=false;}});
  animated.push(t=>{uniforms.uTime.value=t;model.rotation.y=t*.18;});
  const grid=new T.Mesh(new T.PlaneGeometry(1.1,1.1),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform vec3 uColor;void main(){vec2 cell=abs(fract(vUv*12.)-.5);float line=step(.46,max(cell.x,cell.y));float edge=1.-smoothstep(.35,.5,distance(vUv,vec2(.5)));gl_FragColor=vec4(uColor,line*edge*.6);}`}));
  grid.rotation.x=-Math.PI/2;grid.position.set(0,1.802,.1);scene.add(grid);
  animated.forEach(fn=>fn(0));
  const screenNormal=new T.Vector3(0,0,mobile?3.7:2.8).applyQuaternion(screen.quaternion);
  return {world,animated,arcade:{canvas:screenCanvas,texture,screen,hits:[],cameraPosition:screen.position.clone().add(screenNormal),lookTarget:screen.position.clone()}};
}
