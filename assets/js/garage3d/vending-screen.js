/** Native 960 × 1280 artwork and hit regions for the in-world dispenser. */
export const PAGE_SIZE = 6;
export const selectionCode = index => `${String.fromCharCode(65 + Math.floor(index / PAGE_SIZE))}${index % PAGE_SIZE + 1}`;
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
const C = { cream:'#f5edda', red:'#b92f32', ink:'#252b27', olive:'#646a42', line:'#b4ad91' };
function rect(ctx,x,y,w,h,r=0) { ctx.beginPath();ctx.roundRect(x,y,w,h,r); }
function text(ctx,value,x,y,size=28,color=C.ink,font='Arial',weight='400',align='left') {
  ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function fit(ctx,value,x,y,width,size,color,font='Georgia',weight='700') {
  while(size>20){ctx.font=`${weight} ${size}px ${font}`;if(ctx.measureText(value).width<=width)break;size-=2;}
  text(ctx,value,x,y,size,color,font,weight);
}
function wrapped(ctx,value,x,y,width,size,lineHeight,maxLines,font='Georgia',color=C.ink,weight='400') {
  ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign='left';
  const words=String(value||'').split(/\s+/);let line='',lines=[];
  for(const word of words){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>width&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);
  const shown=lines.slice(0,maxLines);
  if(lines.length>maxLines){let last=shown[maxLines-1];while(ctx.measureText(last+'…').width>width)last=last.slice(0,-1);shown[maxLines-1]=last+'…';}
  shown.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));return y+shown.length*lineHeight;
}
function arrow(ctx,x,y,color,reverse=false) {
  ctx.save();ctx.translate(x,y);if(reverse)ctx.scale(-1,1);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(20,0);ctx.moveTo(7,-13);ctx.lineTo(20,0);ctx.lineTo(7,13);ctx.stroke();ctx.restore();
}
function star(ctx,x,y) {
  ctx.fillStyle=C.olive;ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,r=i%2?6:(i%4?23:38);const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();
}
export function paintVendingScreen(ctx,{projects,index=0,view='menu',hover=null,heroes=new Map(),miniatures=new Map()}) {
  const hits=[];const hit=(id,x,y,w,h,extra={})=>hits.push({id,x,y,w,h,...extra});
  const w=960,h=1280,pad=48,inner=w-pad*2;
  ctx.clearRect(0,0,w,h);ctx.fillStyle=C.cream;ctx.fillRect(0,0,w,h);
  ctx.fillStyle=C.red;ctx.fillRect(0,0,w,164);
  text(ctx,'BLAHA COLA',48,104,92,C.cream,'Arial','italic 900');
  text(ctx,'IDEAS, FRESHLY BUILT.',52,143,23,C.cream,'Arial','700');
  ctx.fillStyle=C.cream;ctx.fillRect(0,153,w,3);ctx.fillRect(0,160,w,2);
  function button(id,label,x,y,width,height,primary=false) {
    const hot=hover===id;
    ctx.fillStyle=primary||hot?C.red:C.cream;rect(ctx,x,y,width,height,12);ctx.fill();ctx.strokeStyle=C.red;ctx.lineWidth=2;ctx.stroke();
    text(ctx,label,x+width/2,y+height/2+10,28,primary||hot?C.cream:C.ink,'Arial','700','center');hit(id,x,y,width,height);
  }
  const project=projects[index];
  if(view==='detail'&&project){
    text(ctx,selectionCode(index),pad,229,52,C.red,'Arial','900');
    fit(ctx,`${(project.tags?.[0]||'BUILD').toUpperCase()} · ${project.year||'—'}`,pad+120,219,inner-120,23,C.olive,'Arial','700');
    ctx.fillStyle=C.line;ctx.fillRect(pad,247,inner,2);
    wrapped(ctx,project.title,pad,323,inner-80,76,76,2,'Georgia',C.ink,'700');
    const hero=heroes.get(project.id),box={x:pad,y:415,w:inner,h:325};
    ctx.fillStyle='#e1d8bd';rect(ctx,box.x,box.y,box.w,box.h,14);ctx.fill();
    if(hero){
      ctx.save();rect(ctx,box.x,box.y,box.w,box.h,14);ctx.clip();
      const scale=Math.min(box.w/hero.width,box.h/hero.height);
      ctx.drawImage(hero,box.x+(box.w-hero.width*scale)/2,box.y+(box.h-hero.height*scale)/2,hero.width*scale,hero.height*scale);ctx.restore();
    }else{
      text(ctx,selectionCode(index),w/2,615,160,C.red,'Georgia','700','center');
      text(ctx,'BUILT FROM CURIOSITY',w/2,688,23,C.olive,'Arial','700','center');
    }
    wrapped(ctx,project.summary,pad,785,inner,31,39,5);
    ctx.fillStyle=C.line;ctx.fillRect(pad,981,inner,2);
    text(ctx,(project.status||'BUILD NOTES').toUpperCase(),pad,1022,23,C.olive,'Arial','700');
    fit(ctx,(project.tags||[]).join(' / '),pad+260,1022,inner-260,23,C.olive,'Arial','400');
    button('more','DISPENSE BUILD',pad,1050,inner,76,true);arrow(ctx,w-104,1088,C.cream);
    button('back','BACK TO SELECTION',pad,1140,inner,64);
  }else{
    ctx.fillStyle='#efd875';ctx.fillRect(0,0,w,h);
    text(ctx,'BLAHA COLA',w/2,93,78,C.ink,'Arial','italic 900','center');
    text(ctx,'PICK A BUILD · FEED YOUR CURIOSITY',w/2,143,23,C.ink,'Arial','700','center');
    // One glass display with two continuous shelves, not individual cards.
    ctx.fillStyle='#a9d8dc';rect(ctx,32,180,896,884,24);ctx.fill();
    ctx.strokeStyle='#263f43';ctx.lineWidth=8;ctx.stroke();
    ctx.save();rect(ctx,36,184,888,876,20);ctx.clip();
    ctx.fillStyle='#d2ecdf';ctx.beginPath();ctx.moveTo(60,184);ctx.lineTo(200,184);ctx.lineTo(750,1060);ctx.lineTo(610,1060);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffffff38';ctx.beginPath();ctx.moveTo(660,184);ctx.lineTo(820,184);ctx.lineTo(240,1060);ctx.lineTo(80,1060);ctx.closePath();ctx.fill();ctx.restore();
    const page=Math.floor(index/PAGE_SIZE),start=page*PAGE_SIZE,pageCount=Math.max(1,Math.ceil(projects.length/PAGE_SIZE));
    for(let row=0;row<2;row++){
      const sy=520+row*410;
      ctx.fillStyle='#667e83';ctx.fillRect(40,sy,880,22);
      ctx.fillStyle='#d0d6c8';ctx.fillRect(40,sy+22,880,108);
      ctx.strokeStyle='#344c50';ctx.lineWidth=3;ctx.strokeRect(40,sy+22,880,108);
    }
    projects.slice(start,start+PAGE_SIZE).forEach((project,local)=>{
      const itemIndex=start+local,col=local%3,row=Math.floor(local/3),cx=184+col*296,sy=520+row*410;
      const hot=hover===`slot-${itemIndex}`||(!hover&&itemIndex===index);
      const miniature=miniatures.get(project.id);
      ctx.fillStyle=hot?'#f5eddaaa':'#263f4320';ctx.beginPath();ctx.ellipse(cx,sy-14,114,18,0,0,Math.PI*2);ctx.fill();
      if(miniature){
        const scale=hot?1.05:1,side=298*scale;
        ctx.drawImage(miniature,cx-side/2,sy-side+(hot?-6:0),side,side);
      }else{
        // Keep selection usable while a render loads or if an asset is missing.
        const fallback=heroes.get(project.id);
        if(fallback){const scale=Math.min(232/fallback.width,250/fallback.height);ctx.drawImage(fallback,cx-fallback.width*scale/2,sy-30-fallback.height*scale,fallback.width*scale,fallback.height*scale);}
        else text(ctx,selectionCode(itemIndex),cx,sy-140,68,C.ink,'Arial','700','center');
      }
      // Project name and a real circular selection button on the shelf rail.
      ctx.fillStyle=hot?'#f16b87':'#529fc7';ctx.strokeStyle='#263f43';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx-99,sy+70,23,0,Math.PI*2);ctx.fill();ctx.stroke();
      text(ctx,selectionCode(itemIndex),cx-99,sy+78,16,hot?'#fff':C.ink,'Arial','700','center');
      fit(ctx,shortTitle(project.title),cx-63,sy+68,204,27,C.ink,'Arial','700');
      text(ctx,String(project.year||''),cx-63,sy+96,18,'#4c6466','Arial','400');
      hit(`slot-${itemIndex}`,cx-137,sy-300,274,410,{index:itemIndex});
    });
    if(!projects.length)text(ctx,'More experiments are on the way.',w/2,640,34,C.olive,'Georgia','400','center');
    button('page-prev','PREV',pad,1108,205,70);arrow(ctx,pad+35,1143,hover==='page-prev'?C.cream:C.red,true);
    text(ctx,`${String(page+1).padStart(2,'0')} — ${String(pageCount).padStart(2,'0')}`,w/2,1153,25,C.ink,'Arial','700','center');
    button('page-next','NEXT',w-pad-205,1108,205,70);arrow(ctx,w-pad-35,1143,hover==='page-next'?C.cream:C.red);
  }
  ctx.fillStyle=hover==='exit'?'#952225':C.red;ctx.fillRect(0,1228,w,52);
  text(ctx,'EXIT TO GARAGE',w/2,1263,23,C.cream,'Arial','700','center');hit('exit',0,1228,w,52);
  return hits;
}
