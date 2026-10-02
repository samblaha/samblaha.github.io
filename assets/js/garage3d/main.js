import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadLab } from './lab.js';
import { paintWallScreen, COLS, shortTitle } from './vending-screen.js';
import { createHologram } from './hologram-screen.js';

function cineEase(t){return t*t*t*(t*(t*6-15)+10);}

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
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
  const scene=new T.Scene();scene.background=new T.Color('#05090d');scene.fog=new T.FogExp2('#071017',.0165);
  const camera=new T.PerspectiveCamera(39,1,.1,180);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.075;controls.enablePan=false;controls.minPolarAngle=.35;controls.maxPolarAngle=1.55;controls.minDistance=2;controls.maxDistance=30;controls.rotateSpeed=.65;controls.zoomSpeed=.7;
  const homeTarget=new T.Vector3(.7,3.0,.4);
  let homePosition=new T.Vector3(), transition=null;
  function setHome(){const aspect=stage.clientWidth/stage.clientHeight;const distance=aspect<.8?31:aspect<1.1?21.4:17.6;if(aspect<.8){homePosition.set(3,6.6,distance);homeTarget.set(.7,2.15,.15);}else{homePosition.set(6.35,5.85,distance);homeTarget.set(.55,2.18,.18);}}
  setHome();camera.position.copy(homePosition);controls.target.copy(homeTarget);controls.update();
  scene.add(new T.HemisphereLight('#9ec6d6','#141c22',.88));
  const key=new T.DirectionalLight('#d7eef8',1.95);key.position.set(-6.2,11.5,9.5);key.castShadow=!mobile;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-9,right:9,top:10,bottom:-8,near:.5,far:35});key.shadow.bias=-.001;scene.add(key);
  const rim=new T.DirectionalLight('#3ad4e6',.95);rim.position.set(8.2,6.4,-4.5);scene.add(rim);
  const fill=new T.DirectionalLight('#ffb07a',.38);fill.position.set(-7.5,2.6,2.4);scene.add(fill);
  const bounce=new T.DirectionalLight('#1c3944',.22);bounce.position.set(1.2,-3.5,3);scene.add(bounce);
  const {animated,arcade}=await loadLab(scene,mobile,status);
  const hologram=createHologram(scene,reduced);
  const projects=(()=>{try{const data=JSON.parse(document.getElementById('garage-projects')?.textContent||'[]');return Array.isArray(data)?data.filter(p=>p&&p.id):[];}catch{return[];}})();
  const hud=document.querySelector('[data-arcade-hud]');
  const hudStatus=document.querySelector('[data-arcade-status]');
  const hudGrid=document.querySelector('[data-arcade-grid]');
  const heroes=new Map();
  const miniatures=new Map();
  const writeups=new Map();
  let arcadeActive=false,arcadeIndex=0,arcadeHover=null;
  function currentProject(){return projects[arcadeIndex]||null;}
  function paintArcade(){
    if(!arcade?.canvas)return;
    arcade.hits=paintWallScreen(arcade.canvas.getContext('2d'),{
      projects,index:arcadeIndex,hover:arcadeHover,heroes,miniatures
    });
    arcade.texture.needsUpdate=true;
    if(hud)hud.classList.toggle('is-holo',hologram.isOpen);
    if(hudStatus)hudStatus.textContent=hologram.isOpen?(currentProject()?.title||'Build file'):'Pick a build on the project wall.';
    canvas.setAttribute('aria-label',hologram.isOpen
      ? `Hologram for ${currentProject()?.title||'a build'}. Scroll to read. Escape closes the hologram.`
      : arcadeActive
        ? 'Project wall. Arrow keys choose a miniature. Enter opens a hologram. Escape returns to the garage.'
        : 'Interactive 3D garage. Drag to orbit, scroll to zoom, or click the project wall to browse builds.');
  }
  function regionAt(uv){
    if(!uv||!arcade.hits)return null;
    const x=uv.x*arcade.canvas.width,y=(1-uv.y)*arcade.canvas.height;
    return arcade.hits.find(region=>x>=region.x&&x<=region.x+region.w&&y>=region.y&&y<=region.y+region.h)||null;
  }
  function heroUrls(project){
    const urls=[];
    const add=url=>{if(url&&!urls.includes(url))urls.push(url);};
    add(project?.hero);
    if(project?.id){
      const base=`/assets/projects/${encodeURIComponent(project.id)}/hero`;
      ['.jpg','.jpeg','.png','.webp','.svg'].forEach(ext=>add(`${base}${ext}`));
    }
    return urls;
  }
  function loadHero(project){
    if(!project||heroes.has(project.id))return;
    const urls=heroUrls(project);
    if(!urls.length)return;
    heroes.set(project.id,null);
    const tryAt=index=>{
      if(index>=urls.length)return;
      const image=new Image();
      image.onload=()=>{heroes.set(project.id,image);paintArcade();if(hologram.project?.id===project.id)hologram.setImages(image,miniatures.get(project.id));};
      image.onerror=()=>tryAt(index+1);
      image.src=urls[index];
    };
    tryAt(0);
  }
  function loadWriteup(project){
    if(!project?.url)return;
    const apply=text=>{if(hologram.project?.id===project.id)hologram.setWriteup(project.id,text);};
    if(writeups.has(project.id)){apply(writeups.get(project.id));return;}
    fetch(project.url).then(response=>{if(!response.ok)throw new Error('unavailable');return response.text();}).then(html=>{
      const page=new DOMParser().parseFromString(html,'text/html');
      const body=page.querySelector('.project__body')||page.querySelector('.project__main');
      const text=(body?.innerText||'').replace(/[ \t]+\n/g,'\n').trim();
      writeups.set(project.id,text);apply(text);
    }).catch(()=>{});
  }
  function tileOrigin(index){
    const region=arcade.hits.find(hit=>hit.index===index);
    const width=arcade.size?.width||4.36,height=arcade.size?.height||4.9;
    const u=region?(region.x+region.w/2)/arcade.canvas.width:.5;
    const v=region?1-(region.y+region.h/2)/arcade.canvas.height:.5;
    arcade.screen.updateMatrixWorld(true);
    return arcade.screen.localToWorld(new T.Vector3((u-.5)*width,(v-.5)*height,.06));
  }
  function wallNormal(){
    return arcade.normal?arcade.normal.clone():new T.Vector3(0,0,1).applyQuaternion(arcade.screen.getWorldQuaternion(new T.Quaternion()));
  }
  function lockWallControls(openHolo){
    controls.enableRotate=false;
    controls.enableZoom=false;
    controls.minDistance=openHolo?2.2:5.2;
    controls.maxDistance=openHolo?5.8:12;
  }
  function enterArcade(opts={}){
    arcadeActive=true;arcadeHover=null;canvas.focus({preventScroll:true});root.classList.add('is-arcade','is-entered');
    if(hud)hud.hidden=false;
    lockWallControls(false);
    if(!opts.skipCamera)moveTo(arcade.cameraPosition.clone(),arcade.lookTarget.clone(),1580);
    paintArcade();
    document.dispatchEvent(new CustomEvent('garage:enter'));
  }
  function closeHologram(instant=false){
    if(!hologram.isOpen)return;
    hologram.close(instant);
    if(arcadeActive){
      lockWallControls(false);
      if(!instant)moveTo(arcade.cameraPosition.clone(),arcade.lookTarget.clone(),1220);
    }
    paintArcade();
  }
  function openHologram(index){
    if(!projects[index])return;
    tooltip.hidden=true;arcadeIndex=index;arcadeHover=`slot-${index}`;
    if(!arcadeActive)enterArcade({skipCamera:true});
    else paintArcade();
    const project=projects[index];
    loadHero(project);loadWriteup(project);
    hologram.open({
      project,origin:tileOrigin(index),
      quaternion:arcade.screen.getWorldQuaternion(new T.Quaternion()),
      normal:wallNormal(),
      hero:heroes.get(project.id),miniature:miniatures.get(project.id)
    });
    lockWallControls(true);
    const pose=hologram.readingPose();
    moveTo(pose.position,pose.target,1180);
    paintArcade();
  }
  function exitArcade(){
    if(!arcadeActive)return;
    closeHologram(true);
    arcadeActive=false;root.classList.remove('is-arcade');
    if(hud)hud.hidden=true;
    controls.enableRotate=true;controls.enableZoom=true;controls.minDistance=2;controls.maxDistance=30;
    moveTo(homePosition.clone(),homeTarget.clone(),1520);
    paintArcade();
  }
  function handleHologram(uv){
    const region=hologram.regionAt(uv);
    if(region?.id==='close')closeHologram();
  }
  function handleScreen(uv){
    const region=regionAt(uv);
    if(!region)return;
    if(region.id==='exit'){if(hologram.isOpen)closeHologram();else exitArcade();}
    else if(region.index!=null)openHologram(region.index);
  }
  if(hudGrid){
    hudGrid.innerHTML=projects.map((project,index)=>`<li><button type="button" data-arcade-slot="${index}">${shortTitle(project.title)}</button></li>`).join('');
    hudGrid.querySelectorAll('[data-arcade-slot]').forEach(button=>button.addEventListener('click',()=>openHologram(Number(button.dataset.arcadeSlot))));
  }
  projects.forEach(project=>{
    loadHero(project);
    const image=new Image();
    image.onload=()=>{miniatures.set(project.id,image);paintArcade();if(hologram.project?.id===project.id)hologram.setImages(heroes.get(project.id),image);};
    image.onerror=()=>{};
    image.src=`/assets/models/miniatures/${encodeURIComponent(project.id)}.png`;
  });paintArcade();
  document.fonts.ready.then(paintArcade);
  document.addEventListener('garage:open-hologram',event=>{
    const id=event.detail?.id;const index=projects.findIndex(project=>project.id===id);
    if(index>=0){delete document.documentElement.dataset.pendingHologram;openHologram(index);}
  });
  const queued=document.documentElement.dataset.pendingHologram;
  if(queued){const index=projects.findIndex(project=>project.id===queued);if(index>=0){delete document.documentElement.dataset.pendingHologram;openHologram(index);}}
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:mobile?0:4});
  composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new T.Vector2(1,1),.2,.52,1.42));
  composer.addPass(new OutputPass());
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);setHome();if(!arcadeActive&&!hologram.isOpen&&!transition){camera.position.copy(homePosition);controls.target.copy(homeTarget);controls.update();}};
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  status.hidden=true;root.classList.add('is-3d-ready');
  const raycaster=new T.Raycaster(), pointer=new T.Vector2();
  let down=null,hovered=null;
  function pick(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(scene.children,true);for(const h of hits){if(h.object.type!=='Mesh')continue;let o=h.object;while(o && !o.userData.action)o=o.parent;if(o)return {object:o,uv:h.uv};if(h.distance>0 && h.object.material?.transparent!==true) return null;}return null;}
  function activate(key,uv){
    if(key==='hologram'){handleHologram(uv);return;}
    if(hologram.isOpen && key!=='arcade-select'){closeHologram();if(key==='arcade'||key==='arcade-select'||key==='arcade-exit'||key==='projects')return;}
    const arcadeKeys=key==='arcade'||key==='arcade-select'||key==='arcade-exit'||key==='projects';
    if(arcadeKeys && !arcadeActive){
      if(key==='arcade-select'){
        const region=regionAt(uv);
        if(region?.index!=null){openHologram(region.index);return;}
        enterArcade();return;
      }
      enterArcade();return;
    }
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
    if(hologram.isOpen && hovered?.object.userData.action==='hologram'){
      const region=hologram.regionAt(hovered.uv);
      hologram.setHover(region?region.id:null);
      cursor=region?'pointer':'default';
      label=region?.id==='close'?'Close hologram':currentProject()?.title;
    }else if(hologram.isOpen){
      hologram.setHover(null);
    }
    if(arcadeActive && hovered?.object.userData.action==='arcade-select' && !hologram.isOpen){
      const region=regionAt(hovered.uv);
      const next=region?region.id:null;
      if(next!==arcadeHover){arcadeHover=next;paintArcade();}
      cursor=region?'pointer':'default';
      if(region?.index!=null)label=projects[region.index].title;
      else if(region?.id==='exit')label='Exit to garage';
      else label=null;
    }
    canvas.style.cursor=cursor;tooltip.hidden=!label;if(label)tooltip.textContent=label;
  });
  canvas.addEventListener('pointerleave',()=>{tooltip.hidden=true;hologram.setHover(null);if(arcadeHover){arcadeHover=null;paintArcade();}});
  canvas.addEventListener('pointerup',event=>{
    if(down && down.id===event.pointerId && Math.hypot(event.clientX-down.x,event.clientY-down.y)<7){
      const found=pick(event);
      if(found)activate(found.object.userData.action,found.uv);
      else if(hologram.isOpen)closeHologram();
    }
    down=null;
  });
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('wheel',event=>{
    if(hologram.isOpen){
      event.preventDefault();
      const found=pick(event);
      if(found?.object.userData.action==='hologram')hologram.scrollBy(event.deltaY);
      return;
    }
    if(arcadeActive)event.preventDefault();
  },{passive:false,capture:true});
  function moveTo(position,target,ms=1480){if(reduced.matches){camera.position.copy(position);controls.target.copy(target);controls.update();return;}transition={from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target,start:performance.now(),ms};}
  function rotate(amount){transition=null;const delta=camera.position.clone().sub(controls.target);delta.applyAxisAngle(new T.Vector3(0,1,0),amount);camera.position.copy(controls.target).add(delta);controls.update();}
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.camera;if(action==='reset'){if(arcadeActive)exitArcade();else moveTo(homePosition.clone(),homeTarget.clone());}else if(!arcadeActive)rotate(action==='left'?.3:-.3);}));
  document.querySelectorAll('[data-enter-garage]').forEach(button=>button.addEventListener('click',()=>activate('enter')));
  document.querySelectorAll('[data-enter-arcade]').forEach(button=>button.addEventListener('click',()=>enterArcade()));
  document.querySelectorAll('[data-arcade-back], [data-arcade-exit]').forEach(button=>button.addEventListener('click',()=>{if(hologram.isOpen)closeHologram();else exitArcade();}));
  canvas.addEventListener('keydown',event=>{
    if(arcadeActive||hologram.isOpen){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Home','Escape'].includes(event.key))event.preventDefault();
      if(event.key==='Escape'||event.key==='Home'){event.stopPropagation();if(hologram.isOpen)closeHologram();else exitArcade();return;}
      if(event.key==='Enter'||event.key===' '){openHologram(arcadeIndex);return;}
      if(!hologram.isOpen){
        if(event.key==='ArrowLeft')arcadeIndex=Math.max(0,arcadeIndex-1);
        if(event.key==='ArrowRight')arcadeIndex=Math.min(projects.length-1,arcadeIndex+1);
        if(event.key==='ArrowUp')arcadeIndex=Math.max(0,arcadeIndex-COLS);
        if(event.key==='ArrowDown')arcadeIndex=Math.min(projects.length-1,arcadeIndex+COLS);
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
    if(event.key!=='Escape')return;
    if(document.querySelector('[data-project-panel]:not([hidden]), [data-inventory]:not([hidden]), [data-info-panel]:not([hidden])'))return;
    if(hologram.isOpen){event.preventDefault();closeHologram();return;}
    if(arcadeActive)exitArcade();
  });
  let previous=0;
  function render(now){frame=requestAnimationFrame(render);if(document.hidden)return;if(now-previous<1000/(mobile?30:45))return;previous=now;
    if(transition){const t=Math.min(1,(now-transition.start)/(transition.ms||1480)),ease=cineEase(t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.target,ease);if(t===1)transition=null;}
    controls.update();
    const seconds=now/1000;
    const wasHolo=hologram.isOpen;
    hologram.tick(now);
    if(wasHolo && !hologram.isOpen)paintArcade();
    if(!reduced.matches){
      animated.forEach(animate=>animate(seconds));
    }
    composer.render();
    canvas.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');canvas.dataset.meshes=String(renderer.info.render.calls);
  }
  frame=requestAnimationFrame(render);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);status.hidden=false;status.textContent='The 3D view paused. Reload to restore it, or use Project index.';root.classList.add('scene-unavailable');});
  addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();composer.dispose();renderer.dispose();},{once:true});
}
start().catch(error=>{console.error('Garage 3D:',error);status.textContent='3D is unavailable in this browser. Explore the projects below.';root.classList.add('scene-unavailable');});
