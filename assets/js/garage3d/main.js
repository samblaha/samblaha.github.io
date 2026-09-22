import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadLab } from './lab.js';
import { paintVendingScreen, PAGE_SIZE, shortTitle, selectionCode } from './vending-screen.js';

const root=document.querySelector('[data-garage]');
const canvas=document.querySelector('[data-three-canvas]');
const stage=document.querySelector('[data-three-stage]');
const status=document.querySelector('[data-scene-status]');
const tooltip=document.querySelector('[data-scene-tooltip]');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer, composer, controls, frame;
async function start(){
  const mobile=matchMedia('(max-width:720px)').matches;
  renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75));
  renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  const scene=new T.Scene();scene.background=new T.Color('#080e13');scene.fog=new T.FogExp2('#080e13',.014);
  const camera=new T.PerspectiveCamera(39,1,.1,180);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.minPolarAngle=.35;controls.maxPolarAngle=1.55;controls.minDistance=2;controls.maxDistance=30;controls.rotateSpeed=.65;controls.zoomSpeed=.7;
  const homeTarget=new T.Vector3(.7,3.0,.4);
  let homePosition=new T.Vector3(), transition=null;
  function setHome(){const aspect=stage.clientWidth/stage.clientHeight;const distance=aspect<.8?31:aspect<1.1?22:18.2;if(aspect<.8){homePosition.set(3,7,distance);homeTarget.set(.7,2.2,.1);}else{homePosition.set(6.1,6.8,distance);homeTarget.set(.7,2.25,.1);}}
  setHome();camera.position.copy(homePosition);controls.target.copy(homeTarget);controls.update();
  scene.add(new T.HemisphereLight('#c7e5f0','#243039',1.5));
  const key=new T.DirectionalLight('#e0f2ff',3.2);key.position.set(-5,10,9);key.castShadow=!mobile;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:10,bottom:-8,near:.5,far:35});key.shadow.bias=-.001;scene.add(key);
  const rim=new T.DirectionalLight('#6ccddd',1.2);rim.position.set(5,7,-6);scene.add(rim);
  const fill=new T.DirectionalLight('#ffd1a1',.6);fill.position.set(-8,3,1);scene.add(fill);
  const {animated,arcade}=await loadLab(scene,mobile,status);
  const projects=(()=>{try{const data=JSON.parse(document.getElementById('garage-projects')?.textContent||'[]');return Array.isArray(data)?data.filter(p=>p&&p.id):[];}catch{return[];}})();
  const hud=document.querySelector('[data-arcade-hud]');
  const hudStatus=document.querySelector('[data-arcade-status]');
  const hudGrid=document.querySelector('[data-arcade-grid]');
  const hudMore=document.querySelector('[data-arcade-select]');
  const heroes=new Map();
  const miniatures=new Map();
  const arcadePageSize=PAGE_SIZE;
  let arcadeActive=false,arcadeView='menu',arcadeIndex=0,arcadeHover=null;
  function currentProject(){return projects[arcadeIndex]||null;}
  function paintArcade(){
    if(!arcade?.canvas)return;
    arcade.hits=paintVendingScreen(arcade.canvas.getContext('2d'),{
      projects,index:arcadeIndex,view:arcadeView,hover:arcadeHover,heroes,miniatures
    });
    arcade.texture.needsUpdate=true;
    const detail=arcadeView==='detail';
    if(hudMore)hudMore.hidden=!detail;
    if(hud)hud.classList.toggle('is-detail',detail);
    if(hudStatus)hudStatus.textContent=detail?currentProject()?.title:'Pick your next rabbit hole.';
    canvas.setAttribute('aria-label',arcadeActive
      ? `Blaha Cola project dispenser. ${detail?currentProject()?.title:'Use arrow keys to choose a miniature, Page Up and Page Down to change shelf page.'} Enter ${detail?'dispenses the build':'previews your selection'}. Escape goes back.`
      : 'Interactive 3D garage. Drag to orbit, scroll to zoom, or click the Blaha Cola machine to browse projects.');
  }
  function regionAt(uv){
    if(!uv||!arcade.hits)return null;
    const x=uv.x*arcade.canvas.width,y=(1-uv.y)*arcade.canvas.height;
    return arcade.hits.find(region=>x>=region.x&&x<=region.x+region.w&&y>=region.y&&y<=region.y+region.h)||null;
  }
  function loadHero(project){
    if(!project?.hero || heroes.has(project.id))return;
    heroes.set(project.id,null);
    const image=new Image();
    image.onload=()=>{heroes.set(project.id,image);paintArcade();};
    image.onerror=()=>{};
    image.src=project.hero;
  }
  function openMiniature(index){
    if(!projects[index])return;
    tooltip.hidden=true;arcadeHover=null;arcadeIndex=index;arcadeView='detail';loadHero(projects[index]);paintArcade();
  }
  function backArcade(){
    if(arcadeView==='detail'){arcadeView='menu';arcadeHover=null;paintArcade();return;}
    exitArcade();
  }
  function changeArcadePage(direction){
    const pageCount=Math.max(1,Math.ceil(projects.length/arcadePageSize));
    const page=Math.floor(arcadeIndex/arcadePageSize);
    const next=(page+direction+pageCount)%pageCount;
    arcadeIndex=Math.min(projects.length-1,next*arcadePageSize);
    arcadeHover=`slot-${arcadeIndex}`;paintArcade();
  }
  function selectArcade(){
    const project=currentProject();
    if(!project||arcadeView!=='detail')return;
    document.dispatchEvent(new CustomEvent('garage:open-project',{detail:{id:project.id}}));
  }
  function handleScreen(uv){
    const region=regionAt(uv);
    if(!region)return;
    if(region.id==='exit')exitArcade();
    else if(region.id==='back')backArcade();
    else if(region.id==='more')selectArcade();
    else if(region.id==='page-prev')changeArcadePage(-1);
    else if(region.id==='page-next')changeArcadePage(1);
    else if(region.index!=null)openMiniature(region.index);
  }
  function enterArcade(){
    arcadeActive=true;arcadeView='menu';arcadeHover=null;canvas.focus({preventScroll:true});root.classList.add('is-arcade','is-entered');
    if(hud)hud.hidden=false;
    controls.enableRotate=false;controls.minDistance=2.1;controls.maxDistance=3.8;
    moveTo(arcade.cameraPosition.clone(),arcade.lookTarget.clone());
    paintArcade();
    document.dispatchEvent(new CustomEvent('garage:enter'));
  }
  function exitArcade(){
    if(!arcadeActive)return;
    arcadeActive=false;arcadeView='menu';root.classList.remove('is-arcade');
    if(hud)hud.hidden=true;
    controls.enableRotate=true;controls.minDistance=2;controls.maxDistance=30;
    moveTo(homePosition.clone(),homeTarget.clone());
    paintArcade();
  }
  if(hudGrid){
    hudGrid.innerHTML=projects.map((project,index)=>`<li><button type="button" data-arcade-slot="${index}">${selectionCode(index)} · ${shortTitle(project.title)}</button></li>`).join('');
    hudGrid.querySelectorAll('[data-arcade-slot]').forEach(button=>button.addEventListener('click',()=>openMiniature(Number(button.dataset.arcadeSlot))));
  }
  projects.forEach(project=>{
    loadHero(project);
    const image=new Image();
    image.onload=()=>{miniatures.set(project.id,image);paintArcade();};
    image.onerror=()=>{};
    image.src=`/assets/models/miniatures/${encodeURIComponent(project.id)}.png`;
  });paintArcade();
  document.fonts.ready.then(paintArcade);
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:mobile?0:4});
  composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new T.Vector2(1,1),.23,.3,1.5));composer.addPass(new OutputPass());
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);setHome();if(!arcadeActive&&!transition){camera.position.copy(homePosition);controls.target.copy(homeTarget);controls.update();}};
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  status.hidden=true;root.classList.add('is-3d-ready');
  const raycaster=new T.Raycaster(), pointer=new T.Vector2();
  let down=null,hovered=null;
  function pick(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(scene.children,true);for(const h of hits){if(h.object.type!=='Mesh')continue;let o=h.object;while(o && !o.userData.action)o=o.parent;if(o)return {object:o,uv:h.uv};if(h.distance>0 && h.object.material?.transparent!==true) return null;}return null;}
  function activate(key,uv){
    const arcadeKeys=key==='arcade'||key==='arcade-select'||key==='arcade-exit'||key==='projects';
    if(arcadeKeys && !arcadeActive){enterArcade();return;}
    if(key==='arcade-select' && arcadeActive){handleScreen(uv);return;}
    if(key==='arcade' && arcadeActive)return;
    if(key==='arcade-exit'){exitArcade();return;}
    if(arcadeActive)exitArcade();
    if(key==='enter'){moveTo(new T.Vector3(.2,2.8,Math.max(7.2,8/camera.aspect)),new T.Vector3(.3,1.7,.45));return;}
    let target;
    if(key==='about')target=root.querySelector('[data-open-about]');
    else if(key==='logs'){location.href='/portfolio/';return;}
    else target=root.querySelector(`[data-slot="${key}"]`);
    target?.click();tooltip.hidden=true;
  }
  canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY,id:event.pointerId};transition=null;});
  canvas.addEventListener('pointermove',event=>{
    if(event.buttons)return;
    hovered=pick(event);
    let label=hovered?.object.userData.label, cursor=hovered?'pointer':'grab';
    if(arcadeActive && hovered?.object.userData.action==='arcade-select'){
      const region=regionAt(hovered.uv);
      const next=region?region.id:null;
      if(next!==arcadeHover){arcadeHover=next;paintArcade();}
      cursor=region?'pointer':'default';
      if(region?.index!=null)label=projects[region.index].title;
      else if(region?.id==='back')label='Back to selection';
      else if(region?.id==='exit')label='Exit to garage';
      else if(region?.id==='more')label='Open this build';
      else if(region?.id==='page-prev')label='Previous project page';
      else if(region?.id==='page-next')label='Next project page';
      else label=null;
    }
    canvas.style.cursor=cursor;tooltip.hidden=!label;if(label)tooltip.textContent=label;
  });
  canvas.addEventListener('pointerleave',()=>{tooltip.hidden=true;if(arcadeHover){arcadeHover=null;paintArcade();}});
  canvas.addEventListener('pointerup',event=>{if(down && down.id===event.pointerId && Math.hypot(event.clientX-down.x,event.clientY-down.y)<7){const found=pick(event);if(found)activate(found.object.userData.action,found.uv);}down=null;});
  canvas.addEventListener('pointercancel',()=>{down=null;});
  function moveTo(position,target){if(reduced.matches){camera.position.copy(position);controls.target.copy(target);controls.update();return;}transition={from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target,start:performance.now()};}
  function rotate(amount){transition=null;const delta=camera.position.clone().sub(controls.target);delta.applyAxisAngle(new T.Vector3(0,1,0),amount);camera.position.copy(controls.target).add(delta);controls.update();}
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.camera;if(action==='reset'){if(arcadeActive)exitArcade();else moveTo(homePosition.clone(),homeTarget.clone());}else if(!arcadeActive)rotate(action==='left'?.3:-.3);}));
  document.querySelectorAll('[data-enter-garage]').forEach(button=>button.addEventListener('click',()=>activate('enter')));
  document.querySelectorAll('[data-enter-arcade]').forEach(button=>button.addEventListener('click',()=>enterArcade()));
  document.querySelectorAll('[data-arcade-select]').forEach(button=>button.addEventListener('click',()=>selectArcade()));
  document.querySelectorAll('[data-arcade-back], [data-arcade-exit]').forEach(button=>button.addEventListener('click',()=>backArcade()));
  canvas.addEventListener('keydown',event=>{
    if(arcadeActive){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Home','Escape','PageUp','PageDown'].includes(event.key))event.preventDefault();
      if(event.key==='Escape'||event.key==='Home'){event.stopPropagation();backArcade();return;}
      if(event.key==='Enter'||event.key===' '){if(arcadeView==='detail')selectArcade();else openMiniature(arcadeIndex);}
      if(arcadeView==='menu'){
        const cols=3;
        if(event.key==='PageUp')changeArcadePage(-1);
        if(event.key==='PageDown')changeArcadePage(1);
        if(event.key==='ArrowLeft')arcadeIndex=Math.max(0,arcadeIndex-1);
        if(event.key==='ArrowRight')arcadeIndex=Math.min(projects.length-1,arcadeIndex+1);
        if(event.key==='ArrowUp')arcadeIndex=Math.max(0,arcadeIndex-cols);
        if(event.key==='ArrowDown')arcadeIndex=Math.min(projects.length-1,arcadeIndex+cols);
        arcadeHover=`slot-${arcadeIndex}`;paintArcade();
      }
      return;
    }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(event.key))event.preventDefault();
    if(event.key==='ArrowLeft')rotate(.15);if(event.key==='ArrowRight')rotate(-.15);
    if(['+','=','-'].includes(event.key)){const v=camera.position.clone().sub(controls.target);v.setLength(T.MathUtils.clamp(v.length()*(event.key==='-'?1.1:.9),7,36));camera.position.copy(controls.target).add(v);controls.update();}
    if(event.key==='ArrowUp'||event.key==='ArrowDown'){const sph=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));sph.phi=T.MathUtils.clamp(sph.phi+(event.key==='ArrowUp'?-.1:.1),.35,1.55);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(sph));controls.update();}
    if(event.key==='Home')moveTo(homePosition.clone(),homeTarget.clone());
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!arcadeActive)return;
    if(document.querySelector('[data-project-panel]:not([hidden]), [data-inventory]:not([hidden]), [data-info-panel]:not([hidden])'))return;
    backArcade();
  });
  let previous=0;
  function render(now){frame=requestAnimationFrame(render);if(document.hidden)return;if(now-previous<1000/(mobile?30:45))return;previous=now;
    if(transition){const t=Math.min(1,(now-transition.start)/1100),ease=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.target,ease);if(t===1)transition=null;}
    controls.update();
    const seconds=now/1000;
    if(!reduced.matches){
      animated.forEach(animate=>animate(seconds));
      
    }
    composer.render();
    // Readable scene state supports diagnostics without exposing renderer internals.
    canvas.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');canvas.dataset.meshes=String(renderer.info.render.calls);
  }
  frame=requestAnimationFrame(render);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);status.hidden=false;status.textContent='The 3D view paused. Reload to restore it, or use Project index.';root.classList.add('scene-unavailable');});
  addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();composer.dispose();renderer.dispose();},{once:true});
}
start().catch(error=>{console.error('Garage 3D:',error);status.textContent='3D is unavailable in this browser. Explore the projects below.';root.classList.add('scene-unavailable');});
