/** Native canvas artwork and hit regions for the in-world project wall. */
export const COLS = 5;
export const ROWS = 2;
export function shortTitle(title = '') {
  if (/Random/i.test(title)) return 'Quantum RNG';
  if (/Ball Rack/i.test(title)) return 'Ball Rack';
  if (/Golf Ball Printer/i.test(title)) return 'Golf Printer';
  if (/Delta/i.test(title)) return 'Delta Printer';
  if (/MacBook/i.test(title)) return 'Kali MacBook';
  if (/Caesar/i.test(title)) return 'Caesar Cipher';
  if (/Retro Pi/i.test(title)) return 'Retro Pi';
  if (title.includes(':')) return title.split(':')[0].trim();
  if (title.includes(' - ')) return title.split(' - ').pop().trim();
  return title;
}
const C = {
  graphite:'#070d12', panel:'#0b141b', well:'#081015',
  tile:'#0d161d', hot:'#101c24',
  cyan:'#42f2ff', ink:'#e8f4f7', muted:'#7f9aa6',
  hair:'rgba(66,242,255,.22)', dim:'rgba(228,238,242,.08)'
};
function rect(ctx,x,y,w,h,r=0){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function text(ctx,value,x,y,size=24,color=C.ink,font='IBM Plex Mono',weight='400',align='left'){
  ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function fit(ctx,value,x,y,width,size,color,font='Space Grotesk',weight='700',align='center',floor=22){
  while(size>floor){ctx.font=`${weight} ${size}px ${font}`;if(ctx.measureText(value).width<=width)break;size-=1;}
  text(ctx,value,x,y,size,color,font,weight,align);
}
function coverImage(ctx,image,x,y,w,h,pad=0){
  const iw=Math.max(image.width,1),ih=Math.max(image.height,1);
  const scale=Math.max((w-pad*2)/iw,(h-pad*2)/ih);
  const dw=iw*scale,dh=ih*scale;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  const fade=ctx.createLinearGradient(x,y+h*.55,x,y+h);
  fade.addColorStop(0,'rgba(8,16,21,0)');fade.addColorStop(1,'rgba(8,16,21,.55)');
  ctx.fillStyle=fade;ctx.fillRect(x,y,w,h);
  ctx.restore();
}
function containImage(ctx,image,x,y,w,h){
  const iw=Math.max(image.width,1),ih=Math.max(image.height,1);
  const scale=Math.min(w/iw,h/ih);
  const dw=iw*scale,dh=ih*scale;
  ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}
export function paintWallScreen(ctx,{projects,index=0,hover=null,heroes=new Map(),miniatures=new Map()}){
  const hits=[];const hit=(id,x,y,w,h,extra={})=>hits.push({id,x,y,w,h,...extra});
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const pad=Math.round(w*.022);
  const headerH=Math.round(h*.048);
  const footerH=Math.round(h*.04);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=C.graphite;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=C.panel;ctx.fillRect(0,0,w,headerH);
  const titleY=Math.round(headerH*.42);
  const subY=Math.round(headerH*.78);
  text(ctx,'BLAHA LABS',pad,titleY,Math.round(h*.011),C.muted,'IBM Plex Mono','700');
  text(ctx,'PROJECT WALL',pad,subY,Math.round(h*.016),C.ink,'Space Grotesk','700');
  ctx.fillStyle=C.cyan;ctx.fillRect(pad,subY+Math.round(h*.008),Math.round(w*.086),2);
  text(ctx,`${String(projects.length).padStart(2,'0')} BUILDS`,w-pad,titleY,Math.round(h*.011),C.cyan,'IBM Plex Mono','700','right');
  text(ctx,'SELECT A BAY',w-pad,subY,Math.round(h*.01),C.muted,'IBM Plex Mono','400','right');
  const footerY=h-footerH;
  const gridTop=headerH+Math.round(h*.01);
  const gridH=footerY-gridTop-Math.round(h*.008);
  const gapX=Math.round(w*.01),gapY=Math.round(h*.012),cols=COLS,rows=ROWS;
  const cellW=(w-pad*2-gapX*(cols-1))/cols;
  const cellH=(gridH-gapY*(rows-1))/rows;
  const nameBand=Math.round(cellH*.168);
  const nameSize=Math.round(cellH*.058);
  projects.slice(0,cols*rows).forEach((project,itemIndex)=>{
    const col=(cols-1)-(itemIndex%cols),row=Math.floor(itemIndex/cols);
    const x=pad+col*(cellW+gapX),y=gridTop+row*(cellH+gapY);
    const id=`slot-${itemIndex}`;
    const hovered=hover===id;
    const selected=!hover&&itemIndex===index;
    const hot=hovered||selected;
    ctx.fillStyle=hot?C.hot:C.tile;
    rect(ctx,x,y,cellW,cellH,10);ctx.fill();
    const art={x:x+14,y:y+14,w:cellW-28,h:cellH-nameBand-22};
    ctx.fillStyle=C.well;rect(ctx,art.x,art.y,art.w,art.h,7);ctx.fill();
    const miniature=miniatures.get(project.id);
    const hero=heroes.get(project.id);
    if(hero){
      coverImage(ctx,hero,art.x,art.y,art.w,art.h);
    }else if(miniature){
      containImage(ctx,miniature,art.x+8,art.y+8,art.w-16,art.h-16);
    }else{
      text(ctx,'NO SCAN',x+cellW/2,art.y+art.h/2,Math.round(h*.013),C.muted,'IBM Plex Mono','700','center');
    }
    ctx.fillStyle='rgba(5,9,13,.7)';
    text(ctx,`${String(itemIndex+1).padStart(2,'0')}`,art.x+13,art.y+Math.round(art.h*.055)+1,Math.round(nameSize*.68),'rgba(5,9,13,.7)','IBM Plex Mono','700','left');
    text(ctx,`${String(itemIndex+1).padStart(2,'0')}`,art.x+12,art.y+Math.round(art.h*.055),Math.round(nameSize*.68),hot?C.cyan:'#d5e6ec','IBM Plex Mono','700','left');
    if(hovered){
      ctx.strokeStyle='rgba(66,242,255,.7)';ctx.lineWidth=1.25;
      rect(ctx,art.x+1,art.y+1,art.w-2,art.h-2,6);ctx.stroke();
    }else if(selected){
      ctx.strokeStyle=C.hair;ctx.lineWidth=1;
      rect(ctx,art.x+1,art.y+1,art.w-2,art.h-2,6);ctx.stroke();
    }
    fit(ctx,shortTitle(project.title),x+cellW/2,y+cellH-Math.round(nameBand*.36),cellW-28,nameSize,hot?C.cyan:C.ink,'Space Grotesk','700','center',24);
    hit(id,x,y,cellW,cellH,{index:itemIndex});
  });
  if(!projects.length)text(ctx,'More experiments are on the way.',w/2,h/2,Math.round(h*.018),C.muted,'Space Grotesk','500','center');
  const exitHot=hover==='exit';
  ctx.fillStyle=exitHot?'#102028':C.panel;ctx.fillRect(0,footerY,w,footerH);
  ctx.fillStyle=C.dim;ctx.fillRect(pad,footerY,w-pad*2,1);
  text(ctx,'ESC  ·  EXIT TO GARAGE',w/2,footerY+Math.round(footerH*.64),Math.round(h*.012),exitHot?C.cyan:C.muted,'IBM Plex Mono','700','center');
  hit('exit',0,footerY,w,footerH);
  return hits;
}
export const paintVendingScreen = paintWallScreen;
