import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createProjectCabinet } from './project-cabinet.js';
import { createSpaceCamp } from './space-camp.js';
import { createPlanetWorld } from './planet-world.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root=document.querySelector('[data-garage]');
const canvas=document.querySelector('[data-three-canvas]');
const stage=document.querySelector('[data-three-stage]');
const status=document.querySelector('[data-scene-status]');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let dispose=()=>{}, entering=false;
async function enterGarage(){
  if(entering)return;entering=true;dispose();root.classList.remove('is-planet');
  status.hidden=false;status.textContent='ENTERING THE WORKSHOP';
  document.querySelector('[data-back-planet]').hidden=false;
  await import('./main.js');
}
if(new URLSearchParams(location.search).has('garage'))enterGarage();else start().catch(error=>{
  console.error('Planet:',error);status.hidden=false;status.textContent='The 3D world could not load. Use the destinations below.';root.classList.add('scene-unavailable');
});
async function start(){
  root.classList.add('is-planet');
  const abort=new AbortController(),on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
  const mobile=matchMedia('(max-width:720px)').matches;
  const renderer=new T.WebGLRenderer({canvas,antialias:true});
  renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const scene=new T.Scene();scene.background=new T.Color('#020409');
  const camera=new T.PerspectiveCamera(40,1,.1,200);
  const controls=new OrbitControls(camera,canvas);controls.enablePan=true;controls.enableDamping=true;controls.minDistance=.8;controls.maxDistance=44;controls.minPolarAngle=.05;controls.maxPolarAngle=3.05;controls.rotateSpeed=.5;
  const home=new T.Vector3(0,10.5,22),target=new T.Vector3(0,.5,0);
  function reset(){document.querySelector('[data-camp-panel]')?.setAttribute('hidden','');camera.position.copy(home);controls.target.copy(target);controls.update();}
  scene.add(new T.HemisphereLight('#b7c7eb','#24232c',1.2));
  const sun=new T.DirectionalLight('#ffe1a1',3.8);sun.position.set(-7,12,5);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:9,bottom:-7,near:.5,far:40});sun.shadow.normalBias=.025;sun.shadow.bias=-.0003;scene.add(sun);
  const rim=new T.DirectionalLight('#849cdd',1.65);rim.position.set(7,4,-6);scene.add(rim);
  const fill=new T.DirectionalLight('#8bafd0',.65);fill.position.set(0,2,10);scene.add(fill);
  const warmBounce=new T.DirectionalLight('#d5a275',.50);warmBounce.position.set(-8,-2,9);scene.add(warmBounce);
  const {world:planet,globe,summit,garage,observatory,station,cabin,height,tick}=await createPlanetWorld(scene,{mobile});
  const camp=createSpaceCamp({world:planet,height,garage,station,observatory,cabin});
  const stationPanel=document.querySelector('[data-camp-panel]');
  const projects=JSON.parse(document.getElementById('garage-projects')?.textContent||'[]');
  const cabinet=createProjectCabinet(garage,projects);
  const cabinetUI=document.querySelector('[data-cabinet-ui]');
  let cabinetActive=false,selectedProject=0;
  const file=selector=>cabinetUI.querySelector(selector);
  projects.forEach((project,index)=>{const button=document.createElement('button');button.type='button';button.textContent=String(index+1).padStart(2,'0');button.setAttribute('aria-label',project.title);button.dataset.cabinetIndex=index;on(button,'click',()=>selectProject(index));file('[data-cabinet-numbers]').appendChild(button);});
  function selectProject(index){
    if(!projects.length)return;
    selectedProject=T.MathUtils.euclideanModulo(index,projects.length);const project=projects[selectedProject];cabinet.select(selectedProject);
    file('[data-cabinet-number]').textContent=`${String(selectedProject+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`;
    file('[data-cabinet-title]').textContent=project.title;file('[data-cabinet-summary]').textContent=project.summary||'';
    file('[data-cabinet-status]').textContent=project.status||'Build notes';file('[data-cabinet-year]').textContent=project.year||'';
    const picture=file('[data-cabinet-image]');picture.parentElement.hidden=!project.hero;if(project.hero){picture.src=project.hero;picture.alt=project.title;}
    const tags=file('[data-cabinet-tags]');tags.replaceChildren();(project.tags||[]).forEach(tag=>{const li=document.createElement('li');li.textContent=tag;tags.appendChild(li);});
    file('[data-cabinet-read]').href=project.url;file('[data-cabinet-announcement]').textContent=`Project ${selectedProject+1} of ${projects.length}: ${project.title}`;
    cabinetUI.querySelectorAll('[data-cabinet-index]').forEach((b,i)=>{b.setAttribute('aria-current',String(i===selectedProject));});
    canvas.dataset.selectedProject=project.id;
  }
  function enterCabinet(index=selectedProject){
    stationPanel.hidden=true;cabinetActive=true;root.classList.add('is-cabinet');cabinetUI.hidden=false;cabinet.setActive(true);selectProject(index);
    controls.enableRotate=true;controls.enableZoom=true;controls.minDistance=1;controls.maxDistance=44;
    const pose=cabinet.pose(camera.aspect);fly(pose.position,pose.target,()=>{});
    canvas.setAttribute('aria-label','The build cabinet on the left exterior garage wall. Click a miniature, or use arrow keys to choose a project. Enter reads its build log. Escape returns to the planet.');
    file('[data-cabinet-read]').focus({preventScroll:true});
  }
  function exitCabinet(){
    if(!cabinetActive)return;cabinetActive=false;root.classList.remove('is-cabinet');cabinetUI.hidden=true;cabinet.setActive(false);cabinet.hover(-1);
    controls.enableRotate=true;controls.enableZoom=true;controls.minDistance=.8;controls.maxDistance=44;
    fly(home.clone(),target.clone(),()=>{});canvas.focus({preventScroll:true});canvas.setAttribute('aria-label','Space camp. Drag to orbit, right-drag to pan, scroll to zoom. Arrow keys rotate, Home resets. Use the destination buttons to visit each area.');
  }
  function fly(position,lookTarget,finish){if(reduced.matches){camera.position.copy(position);controls.target.copy(lookTarget);controls.update();finish();return;}flight={from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target:lookTarget,start:performance.now(),finish};}
  function readSelected(event){if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return;event?.preventDefault();const project=projects[selectedProject];if(project)document.dispatchEvent(new CustomEvent('garage:read-project',{detail:{id:project.id}}));}
  on(file('[data-cabinet-read]'),'click',readSelected);
  on(file('[data-cabinet-image]'),'error',()=>{file('[data-cabinet-image]').parentElement.hidden=true;});
  on(file('[data-cabinet-previous]'),'click',()=>selectProject(selectedProject-1));on(file('[data-cabinet-next]'),'click',()=>selectProject(selectedProject+1));
  on(file('[data-cabinet-exit]'),'click',exitCabinet);on(document,'planet:open-cabinet',()=>enterCabinet());
  function cabinetKeys(event){if(!cabinetActive)return false;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Escape'].includes(event.key))event.preventDefault();if(event.key==='Escape'||event.key==='Home'){exitCabinet();return true;}if(event.key==='ArrowLeft')selectProject(selectedProject-1);if(event.key==='ArrowRight')selectProject(selectedProject+1);if(event.key==='ArrowUp')selectProject(selectedProject-5);if(event.key==='ArrowDown')selectProject(selectedProject+5);return true;}
  on(cabinetUI,'keydown',cabinetKeys);
  on(file('[data-belt-left]'),'click',()=>selectProject(cabinet.shift(-1)));on(file('[data-belt-right]'),'click',()=>selectProject(cabinet.shift(1)));
  const renderTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:mobile?0:4});
  const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));if(!mobile){const ambientOcclusion=new SSAOPass(scene,camera,1,1,16);ambientOcclusion.kernelRadius=.38;ambientOcclusion.minDistance=.001;ambientOcclusion.maxDistance=.04;composer.addPass(ambientOcclusion);}composer.addPass(new UnrealBloomPass(new T.Vector2(1,1),.32,.65,1.15));composer.addPass(new OutputPass());
  let flight=null,frame;
  const aboutModal=document.querySelector('[data-habitat-modal]');
  const showAbout=()=>{if(!aboutModal.open)aboutModal.showModal();};
  on(stationPanel.querySelector('[data-camp-about]'),'click',showAbout);
  on(aboutModal,'click',e=>{if(e.target===aboutModal){const r=aboutModal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)aboutModal.close();}});
  on(aboutModal,'close',()=>canvas.focus({preventScroll:true}));
  const places={projects:garage,blog:camp.broadcast,research:observatory,about:cabin,reactor:camp.reactor};
  function explore(){flight=null;canvas.setAttribute('aria-label','Space camp. Drag to orbit, right-drag to pan, scroll to zoom. Click a station sign to focus. Home resets the camera.');cabinetActive=false;cabinet.setActive(false);cabinetUI.hidden=true;root.classList.remove('is-cabinet');stationPanel.hidden=true;controls.enableRotate=true;controls.enableZoom=true;controls.minDistance=.8;canvas.focus({preventScroll:true});}
  document.querySelectorAll('[data-camp-free]').forEach(b=>on(b,'click',explore));
  function visit(name){
    if(name==='projects'){enterCabinet();return;}
    if(name.startsWith('cabinet:')){const index=Number(name.split(':')[1]);if(cabinetActive)selectProject(index);else enterCabinet(index);return;}
    if(name==='garage'){enterCabinet();return;}
    const place=places[name];if(!place)return;
    explore();place.updateWorldMatrix(true,false);
    const target=place.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.8,0));
    const distance=camera.aspect<.8?10:6;
    const direction=name==='reactor'?new T.Vector3(-.55,.42,-1):name==='about'?new T.Vector3(.25,.42,-1):new T.Vector3(0,.42,1);
    const to=target.clone().add(direction.multiplyScalar(distance));
    if(camera.aspect<.8)target.y-=distance*.14;
    const details={blog:['Broadcast','Field notes from the camp. Dispatches, ideas, and things learned along the way.'],research:['Research','The observatory: a home for experiments, open questions, and research notes.'],about:['Habitat','Welcome to Sam’s corner of space. A camp for making useful things and following interesting questions.'],reactor:['Camp reactor','The little power plant that keeps Engineering, Broadcast, and the habitat running. Follow the glowing coolant and power lines around camp.']};
    stationPanel.querySelector('h2').textContent=details[name][0];stationPanel.querySelector('[data-camp-copy]').textContent=details[name][1];
    stationPanel.querySelector('[data-broadcast-posts]').hidden=name!=='blog';stationPanel.querySelector('[data-camp-about]').hidden=name!=='about';
    stationPanel.classList.toggle('is-habitat',name==='about');stationPanel.hidden=false;
    fly(to,target,()=>{if(name==='about')showAbout();});
  }
  on(document,'garage:open-hologram',enterGarage);
  document.querySelectorAll('[data-planet-destination]').forEach(b=>on(b,'click',()=>visit(b.dataset.planetDestination)));
  document.querySelectorAll('[data-enter-garage]').forEach(b=>on(b,'click',enterGarage));
  document.querySelectorAll('[data-enter-arcade]').forEach(b=>on(b,'click',()=>enterCabinet()));
  function rotate(angle){if(cabinetActive)return;flight=null;const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();}
  document.querySelectorAll('[data-camera]').forEach(b=>on(b,'click',()=>{flight=null;b.dataset.camera==='reset'?(cabinetActive?exitCabinet():reset()):rotate(b.dataset.camera==='left'?.35:-.35);}));
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();let down;
  function pick(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);if(cabinetActive){const hit=cabinet.pick(raycaster);if(hit)return hit;}for(const hit of raycaster.intersectObjects(planet.children,true)){let o=hit.object;while(o&&!o.userData.action)o=o.parent;if(o)return o;if(hit.object===globe||hit.object===summit||hit.object.userData.occluder)return null;}return null;}
  on(canvas,'pointerdown',e=>{flight=null;down=[e.clientX,e.clientY];});
  on(canvas,'pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const object=pick(e);if(object)visit(object.userData.action);}down=null;});
  on(canvas,'pointercancel',()=>down=null);
  const tooltip=document.querySelector('[data-scene-tooltip]');
  on(canvas,'pointermove',e=>{if(e.buttons)return;const o=pick(e);canvas.style.cursor=o?'pointer':'grab';tooltip.hidden=!o;if(o)tooltip.textContent=o.userData.label;cabinet.hover(o?.userData.action?.startsWith('cabinet:')?Number(o.userData.action.split(':')[1]):-1);});
  on(canvas,'pointerleave',()=>{tooltip.hidden=true;cabinet.hover(-1);});
  on(canvas,'keydown',e=>{if(e.key==='Escape'&&!cabinetActive){explore();reset();return;}if(cabinetActive){if(e.key==='Enter'){readSelected(e);return;}cabinetKeys(e);return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-','='].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')rotate(.2);if(e.key==='ArrowRight')rotate(-.2);if(e.key==='Home'){flight=null;reset();}if(['+','-','='].includes(e.key)){const v=camera.position.clone().sub(controls.target);v.setLength(T.MathUtils.clamp(v.length()*(e.key==='-'?1.1:.9),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(v);}if(['ArrowUp','ArrowDown'].includes(e.key)){const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.phi=T.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.15:.15),.3,2.7);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));}});
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);const narrow=w/h<1.15;home.set(0,narrow?13:10.5,narrow?Math.min(46,25/(w/h)):22);if(cabinetActive){flight=null;const pose=cabinet.pose(camera.aspect);camera.position.copy(pose.position);controls.target.copy(pose.target);controls.update();}else if(window.location.hash==='#about')visit('about');else reset();};const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  status.hidden=true;root.classList.add('is-3d-ready');canvas.setAttribute('aria-label','Space camp. Drag to orbit, right-drag to pan, scroll to zoom. Arrow keys rotate, Home resets. Use the destination buttons to visit each area.');
  function render(now){frame=requestAnimationFrame(render);if(document.hidden)return;if(flight){const p=Math.min(1,(now-flight.start)/1100),t=p*p*(3-2*p);camera.position.lerpVectors(flight.from,flight.to,t);controls.target.lerpVectors(flight.fromTarget,flight.target||new T.Vector3(),t);if(p===1){const finish=flight.finish;flight=null;finish();}}controls.update();tick(reduced.matches?0:now/1000);camp.tick(reduced.matches?0:now/1000);cabinet.tick(reduced.matches?0:now/1000);composer.render();canvas.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');}
  if(window.location.hash==='#about')visit('about');
  on(window,'hashchange',()=>{if(window.location.hash==='#about')visit('about');});
  frame=requestAnimationFrame(render);
  on(canvas,'webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);status.hidden=false;status.textContent='The 3D view paused. Reload or use the destination links.';root.classList.add('scene-unavailable');});
  dispose=()=>{cabinet.dispose();root.classList.remove('is-cabinet');cabinetUI.hidden=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m?.map?.dispose();m?.dispose();});});composer.passes.forEach(pass=>pass.dispose?.());composer.dispose();renderer.dispose();tooltip.hidden=true;};
  on(window,'pagehide',e=>{if(!e.persisted)dispose();});
}
