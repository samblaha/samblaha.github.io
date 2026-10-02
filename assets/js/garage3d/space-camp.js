import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Orbitable camp architecture and a small crew following terrain-aware routes. */
export function createSpaceCamp({world,height,garage,station,observatory,cabin}){
  const cream=new T.MeshStandardMaterial({color:'#e3dfcd',metalness:.25,roughness:.58});
  const orange=new T.MeshStandardMaterial({color:'#dc6a32',roughness:.5});
  const metal=new T.MeshStandardMaterial({color:'#33444d',metalness:.65,roughness:.4});
  const visor=new T.MeshStandardMaterial({color:'#59482c',metalness:.92,roughness:.16});
  const glow=new T.MeshStandardMaterial({color:'#68e6de',emissive:'#3ae7d4',emissiveIntensity:1.8});
  const warm=new T.MeshStandardMaterial({color:'#fff1b8',emissive:'#ffcc75',emissiveIntensity:1.4});
  const boxGeo=new RoundedBoxGeometry(1,1,1,3,.065),ballGeo=new T.SphereGeometry(1,16,12);
  function mesh(g,m,parent,p,scale=[1,1,1]){const o=new T.Mesh(g,m);o.position.set(...p);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  const box=(p,s,m,parent)=>mesh(boxGeo,m,parent,p,s);
  const ball=(p,s,m,parent)=>mesh(ballGeo,m,parent,p,typeof s==='number'?[s,s,s]:s);
  const cyl=(p,r,h,m,parent)=>mesh(new T.CylinderGeometry(r,r,h,24),m,parent,p);
  function plaque(text,w,parent,p,color='#e8dfc9'){
    const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1024,160);ctx.fillStyle='#203039';ctx.font='bold 92px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,83,970);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,w*.156),new T.MeshBasicMaterial({map,side:T.DoubleSide}),parent,p);
  }
  function anchor(x,z,action){const g=new T.Group();g.position.set(x,height(x,z),z);g.userData={action,label:action};world.add(g);return g;}
  // The original open workshop becomes a pressure-module engineering bay.
  garage.children.forEach(o=>{if(o.position.y>1.9||(Math.abs(o.position.x)<1.4&&o.position.y>.24&&o.position.z<.95))o.visible=false;});
  garage.userData={action:'projects',label:'Engineering · project workshop'};
  for(const x of [-1.49,1.49]){box([x,1.02,0],[.13,1.82,2.04],cream,garage);box([x*1.045,1.05,.75],[.04,1.62,.22],orange,garage);}
  box([0,1.83,1.18],[3.18,.34,.19],cream,garage);
  plaque('ENGINEERING',2.52,garage,[0,1.88,1.48]);
  for(const x of [-1.35,1.35]){box([x,1.01,1.14],[.18,1.85,.20],cream,garage);box([x,1.15,1.255],[.07,.44,.028],warm,garage);}
  // Rounded pressure-hull shell, open at both ends, with raised transverse ribs.
  const hull=new T.Shape();hull.moveTo(-1.68,.17);hull.lineTo(-1.68,1.67);hull.quadraticCurveTo(-1.68,2.40,-.98,2.40);hull.lineTo(.98,2.40);hull.quadraticCurveTo(1.68,2.40,1.68,1.67);hull.lineTo(1.68,.17);hull.lineTo(1.42,.17);hull.lineTo(1.42,1.62);hull.quadraticCurveTo(1.42,2.07,.98,2.07);hull.lineTo(-.98,2.07);hull.quadraticCurveTo(-1.42,2.07,-1.42,1.62);hull.lineTo(-1.42,.17);hull.closePath();
  mesh(new T.ExtrudeGeometry(hull,{depth:2.5,bevelEnabled:true,bevelSegments:3,bevelSize:.045,bevelThickness:.035,steps:1}),cream,garage,[0,0,-1.12]);
  for(const z of [-.92,-.22,.48,1.29]){
    const rib=mesh(new T.ExtrudeGeometry(hull,{depth:z===-.22?.22:.045,bevelEnabled:false}),z===-.22?orange:metal,garage,[0,0,z]);rib.scale.set(1.037,1.035,1);
    for(const x of [-1.48,1.48])ball([x,1.90,z+.03],.028,metal,garage);
  }
  box([.60,2.47,-.10],[.69,.15,.64],metal,garage);
  for(let i=0;i<6;i++)box([.33+i*.10,2.555,-.10],[.035,.025,.48],cream,garage);
  cyl([-1.03,2.50,-.52],.085,.40,metal,garage);cyl([-1.03,2.72,-.52],.12,.07,orange,garage);

  for(let i=0;i<10;i++){const mark=box([-1.35+i*.29,.23,1.46],[.14,.014,.23],i%2?metal:orange,garage);mark.rotation.y=.3;}
  plaque('RESEARCH',1.06,observatory,[0,.86,.78]);
  // A separate broadcast studio beside the existing transmission mast.
  const broadcast=anchor(3.45,2.7,'blog');broadcast.userData.label='Broadcast · field notes';broadcast.rotation.y=-.20;
  box([0,.1,0],[2.1,.20,1.7],metal,broadcast);box([0,.70,0],[1.94,1.12,1.42],cream,broadcast);box([0,1.30,0],[2.04,.12,1.54],cream,broadcast);
  box([-.67,.66,.735],[.37,.91,.07],orange,broadcast);ball([-.57,.66,.79],.024,metal,broadcast);
  box([.31,.77,.736],[1.15,.49,.035],metal,broadcast);box([.31,.77,.759],[1.01,.37,.012],metal,broadcast);
  for(const x of [-.04,.34,.69])box([x,.77,.78],[.025,.40,.025],cream,broadcast);
  box([.31,.61,.795],[1.02,.035,.06],orange,broadcast);
  for(const x of [0,.36,.69]){box([x,.77,.79],[.20,.14,.025],glow,broadcast);box([x,.67,.81],[.24,.025,.055],cream,broadcast);}
  const studioLight=new T.PointLight('#ffd49a',.6,2,2);studioLight.position.set(.3,.94,1.0);broadcast.add(studioLight);
  plaque('BROADCAST',1.68,broadcast,[0,1.17,.785]);
  box([-.45,1.38,0],[.25,.035,1.48],orange,broadcast);
  box([.63,1.46,-.25],[.43,.21,.41],metal,broadcast);
  for(let i=0;i<5;i++)box([.63,1.46,-.46+i*.075],[.32,.11,.017],cream,broadcast);
  const dish=new T.Group();dish.position.set(.38,1.63,-.05);dish.rotation.x=-1.1;broadcast.add(dish);
  mesh(new T.SphereGeometry(.57,32,18,0,Math.PI*2,0,Math.PI*.40),new T.MeshStandardMaterial({color:'#dedbc8',side:T.DoubleSide,metalness:.45,roughness:.35}),dish,[0,.27,0]);cyl([0,.19,0],.035,.42,metal,dish);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,points=[];for(let j=0;j<=16;j++){const t=j/16*Math.PI*.40;points.push(new T.Vector3(Math.sin(t)*.568*Math.cos(a),.27+Math.cos(t)*.568,Math.sin(t)*.568*Math.sin(a)));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.007,5,false),metal,dish,[0,0,0]);}
  const dishRim=mesh(new T.TorusGeometry(.57*Math.sin(Math.PI*.4),.016,8,56),cream,dish,[0,.27+.57*Math.cos(Math.PI*.4),0]);dishRim.rotation.x=Math.PI/2;

  cyl([0,.11,0],.10,.25,metal,dish);ball([0,-.10,0],.047,orange,dish);
  plaque('ON AIR',.49,broadcast,[.42,.34,.765],'#ffb885');
  station.userData={action:'blog',label:'Broadcast · antenna array'};
  // Compact fictional reactor: shielded housing, exposed glowing core and coolant ring.
  const reactor=anchor(-2.65,-2.65,'reactor');reactor.userData.label='Reactor · camp power';
  cyl([0,.12,0],.95,.22,metal,reactor);cyl([0,.31,0],.79,.15,cream,reactor);
  cyl([0,.93,0],.19,1.15,metal,reactor);cyl([0,.98,0],.28,.84,glow,reactor);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box([Math.cos(a)*.47,.94,Math.sin(a)*.47],[.075,1.15,.075],cream,reactor);}
  cyl([0,1.57,0],.72,.28,cream,reactor);cyl([0,1.74,0],.61,.09,orange,reactor);cyl([0,1.86,0],.39,.18,metal,reactor);
  for(const y of [.44,1.37]){const ring=mesh(new T.TorusGeometry(.53,.027,8,48),glow,reactor,[0,y,0]);ring.rotation.x=Math.PI/2;}
  plaque('REACTOR',.95,reactor,[0,1.60,.725]);const rearLabel=plaque('REACTOR',.95,reactor,[0,1.60,-.725]);rearLabel.rotation.y=Math.PI;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const stripe=box([Math.cos(a)*.78,.24,Math.sin(a)*.78],[.14,.12,.12],i%2?orange:metal,reactor);stripe.rotation.y=-a;}
  const coreLight=new T.PointLight('#51edd7',1.8,4,2);coreLight.position.y=1;reactor.add(coreLight);
  // Service catwalks, pipework, pressure tanks and handrails make the camp habitable.
  function pipe(points,r,material,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),40,r,8,false),material,parent,[0,0,0]);}
  function rail(parent,r,y,start,end){const pts=[];for(let i=0;i<=32;i++){const a=start+(end-start)*i/32;pts.push([Math.sin(a)*r,y,Math.cos(a)*r]);if(i%4===0)cyl([Math.sin(a)*r,y-.18,Math.cos(a)*r],.016,.36,metal,parent);}pipe(pts,.015,orange,parent);}
  cyl([0,.22,0],1.05,.08,metal,reactor);rail(reactor,1.01,.57,.30,Math.PI*1.85);
  rail(observatory,.91,.44,.45,Math.PI*1.85);
  for(const side of [-1,1]){
    cyl([side*.70,.88,-.12],.13,.95,cream,reactor);for(const y of [.48,1.23])cyl([side*.70,y,-.12],.14,.07,orange,reactor);
    pipe([[side*.71,1.25,-.12],[side*.82,1.39,-.12],[side*.55,1.5,0]],.033,metal,reactor);
    box([side*.48,1.82,0],[.12,.08,.35],cream,reactor);
  }
  for(const y of [.64,.86,1.08]){const ring=mesh(new T.TorusGeometry(.295,.014,8,40),cream,reactor,[0,y,0]);ring.rotation.x=Math.PI/2;}
  for(const parent of [garage,broadcast]){
    const x=parent===garage?1.73:1.10;
    for(let i=0;i<2;i++){cyl([x,.48,-.45+i*.34],.12,.70,cream,parent);cyl([x,.50,-.45+i*.34],.126,.08,orange,parent);ball([x,.85,-.45+i*.34],.05,metal,parent);}
    pipe([[x,.84,-.40],[x+.13,1.0,-.4],[x+.12,1.20,.20]],.018,metal,parent);
    for(let i=0;i<3;i++){box([x,.13+i*.16,.48],[.30,.15,.27],metal,parent);box([x,.13+i*.16,.625],[.19,.025,.012],orange,parent);}
  }
  // Riveted roof plates and a guarded broadcast deck.
  box([0,.075,.24],[2.34,.07,2.06],metal,broadcast);
  for(const x of [-1.10,1.10]){for(const z of [-.6,0,.65])cyl([x,.31,z],.016,.43,metal,broadcast);pipe([[x,.53,-.6],[x,.53,.65]],.014,orange,broadcast);}
  for(const x of [-.83,.83])for(const z of [-.57,0,.57])ball([x,1.375,z],.021,metal,broadcast);
  // Utility lines follow the actual terrain instead of floating across the camp.
  const routes=[ [[-2.65,-2.65],[-4,-1.4],[-4.4,.6]], [[-2.65,-2.65],[-.5,-2.6],[2.6,-2.8],[4.6,-.6],[4.5,2.7]], [[-2.65,-2.65],[-1.3,-4],[0,-4.5]] ];
  const pulses=[];
  routes.forEach(points=>{const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,height(x,z)+.12,z)));mesh(new T.TubeGeometry(curve,64,.042,7,false),metal,world,[0,0,0]);mesh(new T.TubeGeometry(curve,64,.013,6,false),glow,world,[0,.033,0]);const pulse=ball([0,0,0],.045,glow,world);pulses.push({curve,pulse});});
  // A small habitat pod replaces the back-camp wooden hut.
  cabin.children.forEach(c=>c.visible=false);box([0,.43,0],[.92,.83,1.03],cream,cabin);box([0,.85,0],[1.03,.14,1.13],orange,cabin);box([0,.40,.53],[.33,.58,.03],metal,cabin);plaque('HABITAT',.78,cabin,[0,.73,.56]);
  const paths=[ [[-3.0,2.8],[-1.6,2.6],[0,1.7],[1.8,2.9],[3.2,3.65]], [[0,1.7],[.6,.2],[1.7,-.6],[2.6,-.95]], [[0,1.7],[-.6,.1],[-1.5,-1.1],[-2.65,-1.55]], [[-.6,.1],[0,-1.4],[.35,-2.8],[0,-3.85]] ];
  paths.forEach(points=>{const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,height(x,z)+.05,z)));for(let i=0;i<28;i++){const p=curve.getPoint(i/27);const tile=box(p.toArray(),[.25,.035,.23],cream,world);tile.rotation.y=i*.1;}for(let i=0;i<5;i++){const p=curve.getPoint(i/4);p.x+=.23;cyl([p.x,p.y+.15,p.z],.025,.3,metal,world);ball([p.x,p.y+.31,p.z],.045,warm,world);}});
  // Suited crew, each with articulated legs, arms, life-support pack and gold visor.
  function astronaut(accent){const g=new T.Group(),accentMat=new T.MeshStandardMaterial({color:accent,roughness:.65});
    ball([0,.30,0],[.105,.15,.075],cream,g);ball([0,.50,0],.12,cream,g);ball([0,.505,.074],[.092,.073,.062],visor,g);
    box([0,.31,-.09],[.15,.21,.075],accentMat,g);box([0,.32,.075],[.10,.065,.025],metal,g);box([.025,.33,.091],[.016,.012,.005],glow,g);
    const limbs=[];for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.057,.20,0);g.add(leg);box([0,-.075,0],[.068,.15,.069],cream,leg);box([0,-.15,.022],[.08,.045,.115],metal,leg);limbs.push(leg);const arm=new T.Group();arm.position.set(side*.12,.39,0);g.add(arm);box([0,-.07,0],[.05,.14,.055],cream,arm);ball([0,-.145,0],.034,accentMat,arm);limbs.push(arm);}
    world.add(g);return {g,limbs};}
  // UFO assembly bay: recessed instruments surround a levitating test article.
  box([0,.245,.22],[2.76,.055,2.35],metal,garage);
  box([0,1.10,-.78],[2.74,1.64,.10],metal,garage);
  for(const x of [-1.22,1.22])box([x,1.72,.12],[.035,.035,1.8],glow,garage);
  function terminal(x,y,z,w){
    box([x,y,z],[w,.35,.07],cream,garage);box([x,y,z+.042],[w-.045,.29,.014],metal,garage);
    for(let i=0;i<5;i++){box([x-w*.35+(i%2)*.04,y+.09-i*.045,z+.054],[w*(.36+(i%3)*.12),.012,.008],i%3?glow:orange,garage);}
  }
  terminal(-.72,1.31,-.69,.65);terminal(.08,1.31,-.69,.65);
  plaque('ORBITAL / PROTOTYPE 01',1.65,garage,[-.25,1.72,-.71],'#84dfdb');
  for(const x of [-1.04,1.04]){
    box([x,.57,-.37],[.52,.65,.61],metal,garage);
    box([x,.92,-.30],[.58,.055,.67],cream,garage);
    for(let i=0;i<4;i++){box([x,.36+i*.12,-.05],[.44,.085,.025],cream,garage);box([x,.36+i*.12,-.029],[.18,.017,.012],orange,garage);}
    for(let i=0;i<3;i++)cyl([x-.15+i*.15,1.01,-.38],.039,.14,i%2?glow:orange,garage);
  }
  // Server rack and a diagnostic console with illuminated status bars.
  box([1.05,1.25,-.68],[.45,.83,.19],metal,garage);
  for(let i=0;i<6;i++){box([1.04,.96+i*.12,-.56],[.36,.067,.04],cream,garage);ball([1.16,.96+i*.12,-.533],.014,glow,garage);}
  const saucer=new T.Group();saucer.position.set(0,.91,.65);garage.add(saucer);
  const silver=new T.MeshStandardMaterial({color:'#b9ccd1',metalness:.78,roughness:.28});
  ball([0,0,0],[.79,.17,.66],silver,saucer);
  cyl([0,-.06,0],.52,.12,metal,saucer);
  const ring=mesh(new T.TorusGeometry(.70,.026,10,64),glow,saucer,[0,.005,0]);ring.rotation.x=Math.PI/2;ring.scale.y=.86;
  mesh(new T.SphereGeometry(.32,32,16,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:'#277984',metalness:.6,roughness:.16,emissive:'#103f49',emissiveIntensity:.5}),saucer,[0,.12,0],[1,.78,1]);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;ball([Math.cos(a)*.65,.095,Math.sin(a)*.54],.027,i%3?warm:glow,saucer);}
  for(const x of [-.44,.44]){box([x,.43,.65],[.065,.36,.10],orange,garage);box([x,.27,.65],[.30,.045,.37],metal,garage);}
  const bayLight=new T.PointLight('#72e9ff',2.4,3.7,2);bayLight.position.set(0,1.48,.55);garage.add(bayLight);
  // Two articulated industrial arms reach toward the saucer from the side benches.
  const arms=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*1.04,.98,-.13);garage.add(arm);
    cyl([0,0,0],.12,.11,metal,arm);ball([0,.10,0],.085,orange,arm);
    pipe([[0,.1,0],[-side*.13,.39,.16],[-side*.31,.40,.41],[-side*.40,.20,.53]],.042,cream,arm);
    for(const p of [[-side*.13,.39,.16],[-side*.31,.40,.41]])ball(p,.066,orange,arm);
    ball([-side*.40,.20,.53],.04,glow,arm);arms.push(arm);
  }
  const builders=[[-.94,1.12,1.05],[.96,1.23,-1.08],[.50,-.23,0]].map(([x,z,angle],i)=>{
    const a=astronaut(i===1?'#59c9d2':'#ec743a');garage.add(a.g);a.g.position.set(x,.28,z);a.g.rotation.y=angle;a.g.scale.setScalar(1.14);
    box([0,-.12,.065],[.065,.055,.16],metal,a.limbs[3]);ball([0,-.12,.15],.025,glow,a.limbs[3]);return a;
  });
  cabin.rotation.y=Math.PI;
  const resident=astronaut('#ec874a');cabin.add(resident.g);resident.g.position.set(-.63,.03,.64);resident.g.scale.setScalar(1.4);resident.g.userData={action:'about',label:'Meet Sam · resident builder'};
  box([-.65,.04,.70],[1.1,.08,.75],metal,cabin);
  plaque('SAM / HABITAT 01',1.05,cabin,[0,1.07,.56]);
  const crew=[];
  paths.forEach((points,i)=>{const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,height(x,z)+.07,z)));for(let j=0;j<2;j++)crew.push({...astronaut(i%2?'#e99741':'#5bafbd'),curve,phase:j*.5+i*.13});});
  for(const [x,z] of [[-2.05,2.90],[3.15,3.74],[-2.95,-1.28]]){
    const work=anchor(x,z);box([0,.27,0],[.48,.07,.25],metal,work);for(const side of [-1,1])box([side*.19,.13,0],[.035,.26,.20],cream,work);box([-.10,.34,0],[.12,.075,.11],orange,work);box([.10,.32,.02],[.12,.025,.09],glow,work);
  }
  const workers=[[-2.05,2.67,.8],[3.19,3.52,-.3],[-3.10,-1.48,-1.0]] .map(([x,z,angle])=>{const a=astronaut('#ec743a');a.g.position.set(x,height(x,z)+.07,z);a.g.rotation.y=angle;return a;});
  return {reactor,broadcast,tick(t){
    pulses.forEach(({curve,pulse},i)=>pulse.position.copy(curve.getPoint((t*.08+i*.28)%1)).add(new T.Vector3(0,.04,0)));
    resident.limbs[3].rotation.x=-2.4+Math.sin(t*2)*.18;
    saucer.position.y=.91+Math.sin(t*1.6)*.025;
    arms.forEach((a,i)=>a.rotation.y=Math.sin(t*.8+i*2)*.06);
    builders.forEach(({limbs},i)=>{limbs[1].rotation.x=-1.1+Math.sin(t*2+i)*.13;limbs[3].rotation.x=-1.35+Math.sin(t*3+i)*.18;});
    coreLight.intensity=1.6+Math.sin(t*1.3)*.2;
    crew.forEach(({g,limbs,curve,phase})=>{const cycle=(t*.035+phase)%2,forward=cycle<1;const progress=forward?cycle:2-cycle;g.position.copy(curve.getPoint(progress));g.position.y=height(g.position.x,g.position.z)+.07;const direction=curve.getTangent(progress).multiplyScalar(forward?1:-1);g.rotation.y=Math.atan2(direction.x,direction.z);g.position.y+=Math.abs(Math.sin(t*8+phase))*.018;limbs.forEach((l,i)=>l.rotation.x=Math.sin(t*8+phase+(i<2?0:Math.PI))*.48);});
    workers.forEach(({limbs},i)=>{limbs[1].rotation.x=-.9+Math.sin(t*3+i)*.3;limbs[3].rotation.x=-.7+Math.cos(t*3+i)*.25;});
  }};
}
