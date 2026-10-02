import * as T from 'three';

export const HOLO_CANVAS = { width: 1920, height: 1080 };
export const HOLO_SIZE = { width: 2.48, height: 1.4 };
const POP_DISTANCE = 1.18;
const READ_DISTANCE = 2.55;
const TILE_SCALE = 0.28;

const C = {
  paper:'#f3e8d0', paperDeep:'#e4d4b4', paperEdge:'#d7c39a',
  grain:'rgba(92,72,48,.055)',
  ink:'#1a1510', notesInk:'#14110d', muted:'#5a5348', rule:'#c4b48e',
  teal:'#1a6f78',
  close:'#1a1510', closeInk:'#f3e8d0'
};
const FONT_MONO="'IBM Plex Mono', ui-monospace, monospace";
const FONT_DISPLAY="'Space Grotesk', sans-serif";
const NOTE={size:26,line:42,gap:38,indent:28,gutter:22,rule:3,tracking:'0.4px',weight:'400'};
const HOLO_VERT=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const PAPER_FRAG=`uniform sampler2D uMap;uniform float uOpacity;varying vec2 vUv;
void main(){vec4 tex=texture2D(uMap,vUv);
float edge=smoothstep(0.,.028,vUv.x)*smoothstep(0.,.028,vUv.y)*smoothstep(1.,.972,vUv.x)*smoothstep(1.,.972,vUv.y);
float shade=mix(.9,1.,edge);
gl_FragColor=vec4(tex.rgb*shade,tex.a*uOpacity);}`;

function holoDpr(){
  return Math.min(typeof devicePixelRatio==='number'&&devicePixelRatio>0?devicePixelRatio:1,2);
}
function setTracking(ctx,value){
  if(ctx.letterSpacing!==undefined)ctx.letterSpacing=value||'0px';
}
function text(ctx,value,x,y,size=22,color=C.ink,font=FONT_MONO,weight='400',align='left'){
  ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function fit(ctx,value,x,y,width,size,color,font=FONT_DISPLAY,weight='700',align='left',floor=28){
  while(size>floor){ctx.font=`${weight} ${size}px ${font}`;if(ctx.measureText(value).width<=width)break;size-=2;}
  text(ctx,value,x,y,size,color,font,weight,align);
}
function wrapLines(ctx,value,width){
  const words=String(value||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  const lines=[];let line='';
  for(const word of words){
    const next=line?`${line} ${word}`:word;
    if(ctx.measureText(next).width>width&&line){lines.push(line);line=word;}
    else line=next;
  }
  if(line)lines.push(line);
  return lines;
}
function wrapped(ctx,value,x,y,width,size,lineHeight,maxLines,font=FONT_DISPLAY,color=C.ink,weight='500'){
  ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign='left';
  const lines=wrapLines(ctx,value,width);
  const shown=lines.slice(0,maxLines);
  if(lines.length>maxLines){let last=shown[maxLines-1]||'';while(ctx.measureText(last+'…').width>width)last=last.slice(0,-1);shown[maxLines-1]=`${last}…`;}
  shown.forEach((item,i)=>ctx.fillText(item,x,y+i*lineHeight));
  return y+shown.length*lineHeight;
}
function htmlToParagraphs(value){
  const raw=String(value||'').trim();
  if(!raw)return[];
  let source=raw;
  if(/<[a-z][\s\S]*>/i.test(raw)){
    source=raw
      .replace(/<script[\s\S]*?<\/script>/gi,'')
      .replace(/<style[\s\S]*?<\/style>/gi,'')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|tr|pre)>/gi,'\n\n')
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<\/?(ul|ol|table|thead|tbody|hr)>/gi,'\n\n')
      .replace(/<[^>]+>/g,'')
      .replace(/&nbsp;/gi,' ')
      .replace(/&amp;/g,'&')
      .replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"')
      .replace(/&#39;|&apos;/g,"'");
  }
  return source.split(/\n+/).map(block=>block.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
}
function paintNotes(ctx,writeup,x,y,width){
  const blocks=htmlToParagraphs(writeup);
  if(!blocks.length)return y;
  ctx.save();
  setTracking(ctx,NOTE.tracking);
  ctx.font=`${NOTE.weight} ${NOTE.size}px ${FONT_MONO}`;
  ctx.fillStyle=C.notesInk;
  ctx.textAlign='left';
  ctx.textBaseline='alphabetic';
  const textX=x+NOTE.gutter;
  const textW=width-NOTE.gutter;
  blocks.forEach(block=>{
    const firstWidth=Math.max(80,textW-NOTE.indent);
    const words=block.split(' ');
    const lines=[];let line='',first=true;
    for(const word of words){
      const next=line?`${line} ${word}`:word;
      const maxW=first?firstWidth:textW;
      if(ctx.measureText(next).width>maxW&&line){lines.push({text:line,indent:first});first=false;line=word;}
      else line=next;
    }
    if(line)lines.push({text:line,indent:first});
    const top=y-NOTE.size+6;
    const blockH=lines.length*NOTE.line+10;
    ctx.fillStyle=C.notesInk;
    ctx.fillRect(x,top,NOTE.rule,blockH);
    ctx.fillStyle=C.notesInk;
    lines.forEach((item,i)=>{
      ctx.fillText(item.text,textX+(item.indent?NOTE.indent:0),y+i*NOTE.line);
    });
    y+=lines.length*NOTE.line+NOTE.gap;
  });
  ctx.restore();
  setTracking(ctx,'0px');
  return y;
}
function loadHoloFonts(){
  if(typeof document==='undefined'||!document.fonts)return Promise.resolve();
  const specs=[
    `400 ${NOTE.size}px ${FONT_MONO}`,
    `500 ${NOTE.size}px ${FONT_MONO}`,
    `700 22px ${FONT_MONO}`,
    `700 58px ${FONT_DISPLAY}`
  ];
  return Promise.all([
    document.fonts.ready,
    ...specs.map(spec=>document.fonts.load(spec).catch(()=>[]))
  ]);
}
function coverImage(ctx,image,x,y,w,h){
  const scale=Math.max(w/Math.max(image.width,1),h/Math.max(image.height,1));
  const dw=image.width*scale,dh=image.height*scale;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();
}
let grainCanvas=null;
function grainPattern(){
  if(grainCanvas)return grainCanvas;
  grainCanvas=document.createElement('canvas');
  grainCanvas.width=256;grainCanvas.height=256;
  const g=grainCanvas.getContext('2d');
  let s=8021;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  g.fillStyle='#f3e8d0';g.fillRect(0,0,256,256);
  for(let i=0;i<11000;i++){
    const x=rnd()*256,y=rnd()*256,a=.03+rnd()*.05;
    g.fillStyle=rnd()>.48?`rgba(78,58,36,${a})`:`rgba(255,248,230,${a*.8})`;
    g.fillRect(x,y,1+rnd()*1.4,1);
  }
  g.strokeStyle='rgba(110,86,54,.05)';
  for(let i=0;i<48;i++){
    g.beginPath();g.moveTo(rnd()*256,rnd()*256);g.lineTo(rnd()*256,rnd()*256);g.lineWidth=.45;g.stroke();
  }
  return grainCanvas;
}
function paperGround(ctx,w,h){
  ctx.fillStyle=C.paper;ctx.fillRect(0,0,w,h);
  const pattern=ctx.createPattern(grainPattern(),'repeat');
  if(pattern){ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);ctx.restore();}
  ctx.fillStyle=C.paperDeep;ctx.fillRect(0,0,w,10);ctx.fillRect(0,h-10,w,10);
  ctx.strokeStyle=C.grain;ctx.lineWidth=1;
  for(let y=22;y<h-22;y+=9){ctx.beginPath();ctx.moveTo(18,y);ctx.lineTo(w-18,y);ctx.stroke();}
}

function cineEase(t){return t*t*t*(t*(t*6-15)+10);}

export function paintHologram(ctx,{project,hero,miniature,writeup='',hover=null,scroll=0}){
  const hits=[];const hit=(id,x,y,w,h)=>hits.push({id,x,y,w,h});
  const w=HOLO_CANVAS.width,h=HOLO_CANVAS.height,pad=56;
  const titleBar=96,footerH=56,viewTop=titleBar,viewH=h-titleBar-footerH;
  ctx.clearRect(0,0,w,h);
  paperGround(ctx,w,h);

  ctx.fillStyle=C.paperDeep;ctx.fillRect(0,0,w,titleBar);
  ctx.fillStyle=C.rule;ctx.fillRect(pad,titleBar-1,w-pad*2,1);
  ctx.fillStyle=C.ink;ctx.fillRect(0,0,8,h);
  text(ctx,'BLAHA LABS  ·  PROJECT FILE',pad,40,20,C.ink,FONT_MONO,'700');
  text(ctx,(project.status||'BUILD').toString().toUpperCase(),pad,72,17,C.muted,FONT_MONO,'400');
  const closeW=228,closeH=58,closeX=w-pad-closeW,closeY=19;
  const closeHot=hover==='close';
  ctx.fillStyle=closeHot?C.paper:C.close;
  ctx.beginPath();ctx.roundRect(closeX,closeY,closeW,closeH,5);ctx.fill();
  ctx.strokeStyle=C.ink;ctx.lineWidth=closeHot?3:2;ctx.stroke();
  text(ctx,'×  CLOSE',closeX+closeW/2,closeY+39,23,closeHot?C.ink:C.closeInk,FONT_MONO,'700','center');
  hit('close',closeX,closeY,closeW,closeH);

  ctx.save();ctx.beginPath();ctx.rect(0,viewTop,w,viewH);ctx.clip();
  let y=viewTop+30-scroll;
  const image=hero||miniature;
  const photo={x:pad,y,w:w-pad*2,h:Math.round(viewH*.5)};
  ctx.fillStyle=C.paperEdge;ctx.fillRect(photo.x,photo.y,photo.w,photo.h);
  if(image){
    coverImage(ctx,image,photo.x+6,photo.y+6,photo.w-12,photo.h-12);
  }else{
    text(ctx,'NO PROJECT PHOTO',w/2,photo.y+photo.h/2,28,C.muted,FONT_MONO,'700','center');
  }
  ctx.strokeStyle=C.rule;ctx.lineWidth=1.5;ctx.strokeRect(photo.x+.75,photo.y+.75,photo.w-1.5,photo.h-1.5);
  y=photo.y+photo.h+52;
  fit(ctx,project.title||'Untitled build',pad,y,w-pad*2,60,C.ink,FONT_DISPLAY,'700','left',32);
  y+=44;
  text(ctx,[project.year,project.status].filter(Boolean).join('   ·   ').toUpperCase(),pad,y,19,C.teal,FONT_MONO,'700');
  y+=38;
  const tags=(project.tags||[]).slice(0,6);
  let tagX=pad;
  tags.forEach(tag=>{
    const label=String(tag).toUpperCase();
    ctx.font=`700 17px ${FONT_MONO}`;
    const tw=ctx.measureText(label).width+28;
    ctx.strokeStyle=C.ink;ctx.lineWidth=1.5;ctx.strokeRect(tagX+.75,y-21,tw,34);
    text(ctx,label,tagX+14,y+3,17,C.ink,FONT_MONO,'700');
    tagX+=tw+12;
  });
  y+=54;
  y=wrapped(ctx,project.summary,pad,y,w-pad*2,26,40,6,FONT_MONO,C.notesInk,'400')+30;
  const specs=project.specs&&typeof project.specs==='object'?Object.entries(project.specs):[];
  if(specs.length){
    text(ctx,'SPECS',pad,y,17,C.teal,FONT_MONO,'700');y+=30;
    specs.forEach(([key,value])=>{
      text(ctx,String(key).toUpperCase(),pad,y,18,C.muted,FONT_MONO,'400');
      fit(ctx,String(value),pad+260,y,w-pad*2-260,22,C.ink,FONT_DISPLAY,'600','left',18);
      y+=32;
    });
    y+=12;
  }
  if(writeup){
    text(ctx,'FIELD NOTES',pad,y,20,C.teal,FONT_MONO,'700');y+=40;
    y=paintNotes(ctx,writeup,pad,y,w-pad*2);
  }
  ctx.restore();
  const contentBottom=y+scroll;
  const maxScroll=Math.max(0,contentBottom-(viewTop+viewH)-16);
  ctx.fillStyle=C.paperDeep;ctx.fillRect(0,h-footerH,w,footerH);
  ctx.fillStyle=C.rule;ctx.fillRect(pad,h-footerH,w-pad*2,1);
  text(ctx,maxScroll?'SCROLL FOR NOTES  ·  ESC CLOSES':'ESC CLOSES',w/2,h-20,17,C.muted,FONT_MONO,'700','center');
  if(maxScroll){
    const track=viewH-16,thumb=Math.max(28,track*(viewH/(viewH+maxScroll)));
    const t=scroll/maxScroll;
    ctx.fillStyle='#1a151018';ctx.fillRect(w-22,viewTop+8,5,track);
    ctx.fillStyle=C.ink;ctx.fillRect(w-22,viewTop+8+t*(track-thumb),5,thumb);
  }
  return {hits,maxScroll};
}

export function createHologram(scene, reduced){
  const dpr=holoDpr();
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(HOLO_CANVAS.width*dpr);canvas.height=Math.round(HOLO_CANVAS.height*dpr);
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.generateMipmaps=false;
  texture.minFilter=T.LinearFilter;
  texture.magFilter=T.LinearFilter;
  texture.anisotropy=1;
  const uniforms={uOpacity:{value:0},uMap:{value:texture}};
  const group=new T.Group();group.visible=false;scene.add(group);
  const sw=HOLO_SIZE.width,sh=HOLO_SIZE.height;
  const paperMat=new T.MeshBasicMaterial({
    color:'#e7d6b4',transparent:true,opacity:0,side:T.BackSide,toneMapped:true
  });
  const backing=new T.Mesh(new T.BoxGeometry(sw+.03,sh+.03,.018),paperMat);
  backing.position.z=-.012;backing.castShadow=false;backing.raycast=()=>{};group.add(backing);
  const panel=new T.Mesh(
    new T.PlaneGeometry(sw,sh),
    new T.ShaderMaterial({
      uniforms,transparent:true,depthWrite:true,side:T.FrontSide,toneMapped:true,
      vertexShader:HOLO_VERT,fragmentShader:PAPER_FRAG
    })
  );
  panel.position.z=.01;
  panel.userData={action:'hologram',label:'Project file'};
  group.add(panel);
  const state={
    open:false,closing:false,start:0,duration:860,
    origin:new T.Vector3(),rest:new T.Vector3(),
    originQuat:new T.Quaternion(),restQuat:new T.Quaternion(),
    normal:new T.Vector3(1,0,0),project:null,hover:null,scroll:0,maxScroll:0,hits:[],
    writeup:'',hero:null,miniature:null
  };
  function paint(){
    if(!state.project)return;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    const painted=paintHologram(ctx,{
      project:state.project,hero:state.hero,miniature:state.miniature,
      writeup:state.writeup,hover:state.hover,scroll:state.scroll
    });
    state.hits=painted.hits;state.maxScroll=painted.maxScroll;
    state.scroll=Math.min(state.scroll,state.maxScroll);
    texture.needsUpdate=true;
  }
  loadHoloFonts().then(()=>{if(state.project)paint();});
  function setOpacity(value){
    uniforms.uOpacity.value=value;
    paperMat.opacity=value;
  }
  function poseAt(t){
    const ease=cineEase(t);
    group.position.lerpVectors(state.origin,state.rest,ease);
    group.quaternion.slerpQuaternions(state.originQuat,state.restQuat,ease);
    const overshoot=ease+Math.sin(ease*Math.PI)*.035;
    group.scale.setScalar(TILE_SCALE+(1-TILE_SCALE)*Math.min(overshoot,1.035));
    setOpacity(.1+.9*ease);
  }
  return {
    group,panel,canvas,texture,
    get isOpen(){return state.open;},
    get project(){return state.project;},
    regionAt(uv){
      if(!uv||!state.hits.length)return null;
      const x=uv.x*HOLO_CANVAS.width,y=(1-uv.y)*HOLO_CANVAS.height;
      return state.hits.find(region=>x>=region.x&&x<=region.x+region.w&&y>=region.y&&y<=region.y+region.h)||null;
    },
    setHover(id){if(state.hover===id)return;state.hover=id;paint();},
    setWriteup(id,text){if(!state.project||state.project.id!==id)return;state.writeup=text||'';paint();},
    setImages(hero,miniature){state.hero=hero||null;state.miniature=miniature||null;paint();},
    scrollBy(delta){
      if(!state.open||!state.maxScroll)return;
      state.scroll=Math.min(state.maxScroll,Math.max(0,state.scroll+delta*.65));
      paint();
    },
    readingPose(){
      const target=state.rest.clone();
      const position=target.clone().add(state.normal.clone().multiplyScalar(READ_DISTANCE)).add(new T.Vector3(0,.06,0));
      return {position,target};
    },
    wallPose(arcade){return {position:arcade.cameraPosition.clone(),target:arcade.lookTarget.clone()};},
    open({project,origin,quaternion,normal,hero,miniature}){
      state.project=project;state.hero=hero||null;state.miniature=miniature||null;
      state.writeup='';state.scroll=0;state.hover=null;state.closing=false;state.open=true;
      state.origin.copy(origin);state.originQuat.copy(quaternion);
      const wallNormal=normal?normal.clone().normalize():new T.Vector3(0,0,1).applyQuaternion(quaternion);
      state.normal.copy(wallNormal);
      state.rest.copy(origin).add(wallNormal.multiplyScalar(POP_DISTANCE));
      state.restQuat.copy(quaternion);
      group.quaternion.copy(quaternion);group.visible=true;group.position.copy(origin);
      panel.userData.label=project.title;
      paint();
      if(reduced.matches){poseAt(1);state.start=0;return;}
      state.start=performance.now();poseAt(0);
    },
    close(instant=false){
      if(!state.open)return;
      state.closing=true;state.hover=null;
      if(instant||reduced.matches){
        state.open=false;state.closing=false;group.visible=false;setOpacity(0);return;
      }
      state.start=performance.now();
    },
    tick(now){
      if(!state.open)return;
      if(!state.start)return;
      const t=Math.min(1,(now-state.start)/state.duration);
      if(state.closing){
        poseAt(1-t);
        if(t===1){state.open=false;state.closing=false;state.start=0;group.visible=false;}
        return;
      }
      poseAt(t);
      if(t===1)state.start=0;
    }
  };
}
