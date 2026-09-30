'use strict';
const G=window.Lab;
const propImages={},worldSprites=new Map();
function worldImage(img,sx,sy,sw,sh,x,y,w,h){
 if(img.complete===false)return;
 const key=[img.src,sx,sy,sw,sh,w,h].join('|');let tile=worldSprites.get(key);
 if(!tile){tile=document.createElement('canvas');tile.width=Math.ceil(w);tile.height=Math.ceil(h);const pen=tile.getContext('2d');pen.imageSmoothingEnabled=true;pen.imageSmoothingQuality='high';pen.filter='saturate(0.82) brightness(1.04)';pen.drawImage(img,sx,sy,sw,sh,0,0,w,h);worldSprites.set(key,tile);}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,Math.round(x),Math.round(y),w,h);ctx.restore();
}
function prop(key,x,y,w,h=w){if(artProp(key,x,y,w,h))return;const img=propImages[key];if(img?.naturalWidth)worldImage(img,0,0,img.naturalWidth,img.naturalHeight||img.naturalWidth,x,y,w,h);}

let studentSession=null;
let state=G.newGame(),artReady=false,routeTimer=null,lastStep=0,panel='',returnTimer=null;
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d'),atlas=new Image();
const TILE=48,DIRS=[[1,0],[-1,0],[0,1],[0,-1]],reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const itemCells={water:0,acid:1,base:2,koh:3,wood:4,charcoal:5,copperOre:6,ironOre:7,tinOre:8,zincOre:9,copperMetal:10,ironMetal:11,tinMetal:12,zincMetal:13,shoes:14,bag:15,axe:16,pickaxe:17,gatherer:18,rock:19};
function itemSprite(k){if(['silverMetal','goldMetal'].includes(k))return '<i class="noble-metal '+k+'" aria-hidden="true">'+(k==='silverMetal'?'Ag':'Au')+'</i>';if(['copperSulfate','zincSulfate'].includes(k))return '<i class="salt-icon '+k+'" aria-hidden="true"><span>◆</span></i>';if(['stone','glass'].includes(k))return '<i class="glass-art '+k+'" aria-hidden="true"></i>';const i=itemCells[k]??0;return '<i class="item-art" aria-hidden="true" style="background-position:'+((i%5)/4*100)+'% '+(Math.floor(i/5)/3*100)+'%"></i>';}
function drawItem(k,x,y,size=48){if(['stone','glass','copperSulfate'].includes(k)&&artCell('utility',{stone:3,glass:4,copperSulfate:2}[k],4,2,x,y,size))return;if(k==='rock'&&artProp('rock',x,y,size,size))return;if(k==='copperSulfate'){ctx.save();ctx.translate(x,y);ctx.fillStyle='#4f6567';ctx.beginPath();ctx.moveTo(5,44);ctx.lineTo(9,25);ctx.lineTo(34,20);ctx.lineTo(44,43);ctx.fill();for(const [cx,cy,h] of [[15,12,25],[26,5,31],[35,17,23]]){ctx.fillStyle='#65a9b6';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+5,cy+6);ctx.lineTo(cx+4,cy+h);ctx.lineTo(cx-4,cy+h);ctx.lineTo(cx-5,cy+6);ctx.closePath();ctx.fill();ctx.fillStyle='#a0cacc';ctx.fillRect(cx-2,cy+7,2,h-9);}ctx.restore();return;}if(['stone','glass'].includes(k)){const im=propImages.glasscraft;if(im?.naturalWidth)worldImage(im,k==='stone'?0:im.naturalWidth/2,0,im.naturalWidth/2,im.naturalHeight,x,y,size,size);return;}const img=propImages.items,i=itemCells[k];if(!img?.naturalWidth||i===undefined)return;const w=img.naturalWidth/5,h=img.naturalHeight/4;worldImage(img,(i%5)*w,Math.floor(i/5)*h,w,h,x,y,size,size);}
function spriteStyle(i){return `background-position:${(i%4)/3*100}% ${Math.floor(i/4)/3*100}%`;}
function sprite(i,extra=''){return `<i class="sprite ${extra}" style="${spriteStyle(i)}" aria-hidden="true"></i>`;}
let failureCount=0;
let collisionAnimation=null;
function clearCollisionEffect(){const animation=collisionAnimation;collisionAnimation=null;animation?.cancel();}
function collisionEffect(){
 if(reduced||state.phase!=='morning'||collisionAnimation)return;
 const animation=$('map-frame').animate?.([
  {transform:'translate(0, 0)'},{transform:'translate(-3px, 0)'},
  {transform:'translate(2px, 1px)'},{transform:'translate(-1px, 0)'},{transform:'translate(0, 0)'}
 ],{duration:180,easing:'ease-out'});
 collisionAnimation=animation||null;
 if(animation)animation.onfinish=animation.oncancel=()=>{if(collisionAnimation===animation)collisionAnimation=null;};
}
function failureEffect(){
 const target=$('bench-dialog').open?$('bench-dialog'):$('utility-dialog').open?$('utility-dialog'):$('map-frame').hidden?document.querySelector('.dialogue'):$('map-frame');
 failureCount++;target.classList.remove('fail-a','fail-b');target.classList.add(failureCount%2?'fail-a':'fail-b');
}
function say(text,ok=true,effect=true){if(!ok&&effect)failureEffect();if(!text)return;$('message').textContent=text;$('shop-guide-message').textContent=text;document.querySelector('.dialogue').classList.toggle('error',!ok);if(!ok&&state.phase==='shop'&&guideCollapsed&&!$('utility-dialog').open&&!$('bench-dialog').open){guideCollapsed=false;renderGuide();}}
let guideCollapsed=false;
function renderGuide(){
 $('shop-guide').hidden=guideCollapsed;$('guide-show').hidden=!guideCollapsed;$('shop-stage').dataset.guide=guideCollapsed?'closed':'open';
 if(state.phase!=='morning'&&!$('shop-guide-message').textContent)$('shop-guide-message').textContent='손님의 주문을 확인하고 준비한 재료를 건네 보세요. 시약은 시약 제작소에서 준비할 수 있어요.';
}
$('guide-hide').onclick=()=>{guideCollapsed=true;renderGuide();};
$('guide-show').onclick=()=>{guideCollapsed=false;renderGuide();};
function notify(r){
 if(r.regionChanged)stopRoute();
 if(r.harvestFailed){
  stopRoute();panel='';if($('utility-dialog').open)$('utility-dialog').close();document.body.classList.remove('modal-open');
  say(r.exhausted?'채집에 실패했습니다. · 행동력 −'+r.energyLost:r.message,false,false);if(!r.exhausted)render();showGatherDamage(r);return r;
 }
 if(r.regionChanged||state.phase!=='morning')clearGatherDamage();
 say(r.message,r.ok);render();if(r.exhausted)showExhaustion();else if(r.ok&&r.returned)showBusinessNotice('open');return r;
}
let businessNoticeVersion=0,businessClosingState=null,damageVersion=0,damagePending=false;
function hideBusinessNotice(){businessNoticeVersion++;const notice=$('business-announcement');if(notice.open)notice.close();}
function showBusinessNotice(kind){
 hideDayTransition();const notice=$('business-announcement'),opening=kind==='open',version=++businessNoticeVersion;
 notice.dataset.kind=kind;$('business-day').textContent=state.day+'일차 · 연금술 상점';
 $('business-emblem').textContent=opening?'✦':'☾';$('business-title').textContent=opening?'영업 시작':'영업 종료';
 $('business-subtitle').textContent=opening?'오늘의 손님을 맞이할 시간입니다':'수익을 확인하고 내일을 준비하세요';
 if(!notice.open)notice.showModal();
 setTimeout(()=>{if(version===businessNoticeVersion)hideBusinessNotice();},2100);
}
$('business-announcement').addEventListener('cancel',e=>{e.preventDefault();hideBusinessNotice();});
function clearGatherDamage(){
 clearCollisionEffect();
 damageVersion++;damagePending=false;$('gather-damage').hidden=true;$('gather-hit-lock').hidden=true;$('energy-loss-trail').hidden=true;
 $('map-frame').classList.remove('damage-shock');$('energy-hud').classList.remove('damage-taken');
}
function showGatherDamage(r){
 clearGatherDamage();if(!(r.energyLost>0))return;
 const version=damageVersion,sceneState=state,effect=$('gather-damage'),point=$('damage-point'),max=G.maxEnergy(state);
 failureCount++;damagePending=!!r.exhausted;$('gather-hit-lock').hidden=!damagePending;
 point.style.left=(r.hitPosition.x+.5)/G.W*100+'%';point.style.top=(r.hitPosition.y+.45)/G.H*100+'%';
 $('damage-number').textContent='−'+r.energyLost;
 $('energy').innerHTML=state.energy+' <small>/ '+max+'</small>';$('energy-fill').style.width=state.energy/max*100+'%';
 const trail=$('energy-loss-trail');trail.style.left=state.energy/max*100+'%';trail.style.width=r.energyLost/max*100+'%';trail.hidden=false;
 void effect.offsetWidth;effect.hidden=false;$('map-frame').classList.add('damage-shock');$('energy-hud').classList.add('damage-taken');
 setTimeout(()=>{
  if(version!==damageVersion)return;clearGatherDamage();
  if(sceneState===state&&r.exhausted){render();showExhaustion();}
 },1100);
}
function stopRoute(){if(routeTimer){clearTimeout(routeTimer);routeTimer=null;}}
let dayNoticeVersion=0;
function hideDayTransition(){dayNoticeVersion++;$('day-transition').hidden=true;}
function showDayTransition(){
 hideBusinessNotice();clearGatherDamage();
 const version=++dayNoticeVersion,notice=$('day-transition');
 $('day-transition-number').textContent=state.day+'일차';notice.hidden=false;
 setTimeout(()=>{if(version===dayNoticeVersion)notice.hidden=true;},2400);
}
function modalOpen(){return damagePending||$('business-announcement').open||$('clearance-dialog').open||$('login-dialog').open||!!departingGuest||$('name-dialog').open||$('exhaustion-dialog').open||$('utility-dialog').open||$('bench-dialog').open||$('restart-dialog').open;}
function drawSprite(i,x,y,w=TILE,h=w){if(({2:'tree',6:'mushroom',7:'herb',8:'house'})[i]&&artProp(({2:'tree',6:'mushroom',7:'herb',8:'house'})[i],x,y,w,h))return;if(!artReady)return;const cell=atlas.naturalWidth/4;worldImage(atlas,(i%4)*cell,Math.floor(i/4)*cell,cell,cell,Math.round(x),Math.round(y),w,h);}
function tileSprite(i,x,y,size=TILE){drawSprite(i,x*TILE+(TILE-size)/2,y*TILE+(TILE-size),size,size);}
function label(text,x,y,color='#f4e1b8'){ctx.font='bold 12px monospace';const width=ctx.measureText(text).width+12;ctx.fillStyle='#14271fec';ctx.fillRect(x-width/2,y-12,width,19);ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y+1);}
function drawWellOld(x,y){const px=x*TILE,py=y*TILE;ctx.fillStyle='#9b8d72';ctx.fillRect(px+7,py+20,34,25);ctx.fillStyle='#244f61';ctx.fillRect(px+12,py+23,24,10);ctx.fillStyle='#70482e';ctx.fillRect(px+7,py+6,5,27);ctx.fillRect(px+36,py+6,5,27);ctx.fillRect(px+3,py+4,42,7);ctx.fillStyle='#c6aa76';ctx.fillRect(px+24,py+10,2,18);label('우물',px+24,py-7,'#9dd9e9');}
function drawWell(x,y){groundContact(x*TILE,y*TILE,42);prop('well',x*TILE-7,y*TILE-15,62,62);label('우물',x*TILE+24,y*TILE-17);}
function groundHash(x,y){let n=Math.imul(x+971,374761393)^Math.imul(y+313,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
let forestGroundCache=null;
function drawForestGround(){
 if(forestGroundCache?.maps===state.maps&&forestGroundCache.region===state.region&&forestGroundCache.width===canvas.width){ctx.putImageData(forestGroundCache.data,0,0);return;}
 const region=Number(state.region.slice(-1)),ox=region%3*G.W,oy=Math.floor(region/3)*G.H,lands=Object.fromEntries(Object.entries(state.maps).filter(([k])=>k.startsWith('forest')).map(([k,v])=>[k,new Set(v.floor)])),roads=new Set(state.forestRoads);
 const land=(x,y)=>x>=0&&y>=0&&x<45&&y<30&&lands['forest'+(Math.floor(y/10)*3+Math.floor(x/15))].has((x%15)+','+(y%10));
 const density=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;return +land(ix,iy)*(1-fx)*(1-fy)+(+land(ix+1,iy))*fx*(1-fy)+(+land(ix,iy+1))*(1-fx)*fy+(+land(ix+1,iy+1))*fx*fy;};
 for(let py=0;py<480;py+=2)for(let px=0;px<720;px+=2){
  const wx=ox+(px+1)/48,wy=oy+(py+1)/48,d=density(wx-.5,wy-.5),h=groundHash(ox*24+px/2,oy*24+py/2),clump=groundHash(Math.floor(wx*8),Math.floor(wy*8)),patch=Math.sin(wx*.5+Math.cos(wy*.3))+Math.cos(wy*.48);
  const shade=Math.max(0,Math.min(12,Math.round((patch+2)*3))),grain=h%3-1;
  let c=d<.29?['#34565a','#35575b','#36585c'][h%3]:d<.4?'#4f6c64':d<.49?'#737d62':d<.59?'#969075':d<.68?'#70805a':'rgb('+(77+shade+grain)+','+(97+shade+grain)+','+(62+Math.round(shade*.7)+grain)+')';
  const gx=Math.floor(wx),gy=Math.floor(wy),lx=(wx-gx)*48-24,ly=(wy-gy)*48-24;
  let distance=99;
  if(roads.has(gx+','+gy)){distance=Math.hypot(lx,ly);for(const [dx,dy] of DIRS)if(roads.has((gx+dx)+','+(gy+dy)))distance=Math.min(distance,dx?Math.hypot(Math.max(0,-lx*dx),ly):Math.hypot(lx,Math.max(0,-ly*dy)));}
  const edge=10+(clump%5-2)*.65;
  if(d>.68&&distance<edge+3)c=distance<edge?['#9a8969','#9c8b6b','#9f8e6d','#978667'][h%4]:['#7f815d','#898561','#788058'][h%3];
  if(REDRAW.terrain){const kind=d<.4?2:d<.59?7:d<.68?0:distance<edge?1:0;c=terrainColor(kind,ox*48+px,oy*48+py);}
  ctx.fillStyle=c;ctx.fillRect(px,py,2,2);
  if(!REDRAW.terrain&&d>.72&&distance>edge+3&&h%23===0){ctx.fillStyle=clump%3?'#6a7c50':'#4e6541';ctx.fillRect(px,py-1,1,3);if(h%3===0)ctx.fillRect(px+2,py,1,2);}
  if(d>.72&&distance<edge&&h%79===0){ctx.fillStyle='#a29677';ctx.fillRect(px,py,3,1);ctx.fillStyle='#655f49';ctx.fillRect(px,py+1,2,1);}
  if(d<.29&&h%367===0){ctx.fillStyle='#587170';ctx.fillRect(px,py,5+h%8,1);}
 }
 const data=ctx.getImageData(0,0,canvas.width,canvas.height);if(data)forestGroundCache={maps:state.maps,region:state.region,width:canvas.width,data};
}
function groundContact(x,y,size=34){ctx.save();ctx.fillStyle='#233c3060';ctx.beginPath();ctx.ellipse(x+24,y+42,size/2,5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
let walking=null,walkTimer=null,facing='down',walkStride=0,worldBackdrop=null;
function moveAnimated(dx,dy){
 const from={...state.player},region=state.region;
 if(walking&&walking.region===region){const progress=Math.min(1,Math.max(0,(performance.now()-walking.start)/walking.duration));from.x=walking.from.x+(walking.to.x-walking.from.x)*progress;from.y=walking.from.y+(walking.to.y-walking.from.y)*progress;}
 const result=G.move(state,dx,dy);
 if(result.collision)collisionEffect();else if(result.ok)clearCollisionEffect();
 facing=dx<0?'left':dx>0?'right':dy<0?'up':'down';
 if(walkTimer){clearTimeout(walkTimer);walkTimer=null;}
 walking=result.ok&&!result.regionChanged&&!result.exhausted&&region===state.region&&!reduced?{from,to:{...state.player},region,start:performance.now(),duration:105,stride:walkStride++}:null;
 return result;
}
// Measured neck center and sole anchors in each source cell; no image resampling.
const walkAnchors=[[[178.45,289],[162.84,293],[147.40,293],[137.04,293]],[[176.56,285],[160.27,282],[145.57,282],[135.61,282]],[[171.29,279],[163.99,274],[146.09,279],[138.36,274]],[[176.14,273],[160.79,276],[148.15,276],[137.2,276]]];
const femaleAnchors=[[[176.73,297],[176.58,299],[150.65,299],[142.97,299]],[[182.15,290],[178.69,288],[153.19,288],[149.49,286]],[[172.47,283],[170.63,282],[150.49,283],[138.32,281]],[[177.14,276],[171.41,281],[150.12,281],[141.15,281]]];
function walkFramePlacement(row,frame,x,y){const [center,sole]=(state.character==='female'?femaleAnchors:walkAnchors)[row][frame],scale=64/(1254/4);return {x:Math.round(x*TILE+24-center*scale),y:Math.round(y*TILE+47-sole*scale)};}
// Draw resources on either side of the moving character, ordered by ground contact.
// One hand-drawn pixel pattern shared by the map sprite and reward illustration.
function treasurePixels(opened){
 const body=[[6,25,36,17,'#211c18'],[8,27,32,13,'#65432c'],[9,28,30,3,'#9c713f'],[9,34,30,2,'#432c23'],[10,38,28,2,'#815631'],[11,27,4,13,'#bd9655'],[12,28,1,11,'#e1c17b'],[32,27,4,13,'#bd9655'],[33,28,1,11,'#e1c17b'],[20,28,8,8,'#2e241b'],[21,29,6,6,'#c7a458'],[23,31,2,3,'#4e3825'],[8,41,7,2,'#211c18'],[33,41,7,2,'#211c18']];
 const lid=opened?[[7,8,34,16,'#211c18'],[9,10,30,11,'#60422d'],[11,11,26,3,'#9a7342'],[11,10,4,11,'#c09c5d'],[32,10,4,11,'#c09c5d'],[9,20,30,2,'#dfbd76'],[8,23,32,5,'#231e19'],[13,23,7,3,'#e0b65e'],[22,22,7,4,'#f0cd7e'],[29,24,6,3,'#bc9048']]:[[7,18,34,9,'#211c18'],[10,15,28,3,'#211c18'],[9,19,30,6,'#8b6138'],[11,17,26,3,'#af854b'],[11,17,4,9,'#c09c5d'],[32,17,4,9,'#c09c5d'],[9,25,30,2,'#d0ac66']];
 return [...body,...lid];
}
function drawTreasure(t){groundContact(t.x*TILE,t.y*TILE,35);ctx.save();ctx.translate(t.x*TILE,t.y*TILE);for(const [x,y,w,h,color]of treasurePixels(t.opened)){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}ctx.restore();}
function treasureIllustration(){return '<svg class="treasure-chest-art" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">'+treasurePixels(true).map(([x,y,w,h,c])=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'"/>').join('')+'</svg>';}
function drawResourceLayer(playerFootY,behind){
 for(const n of [...G.activeNodes(state),...G.activeTreasures(state).map(t=>({...t,treasure:true}))].sort((a,b)=>a.y-b.y||a.x-b.x)){if(((n.y*TILE+42)<=playerFootY)!==behind)continue;if(n.treasure){drawTreasure(n);continue;}if(n.used){if(n.item==='wood'){if(!artProp('stump',n.x*TILE+6,n.y*TILE+14,36,34)){ctx.fillStyle='#9a6945';ctx.fillRect(n.x*TILE+14,n.y*TILE+28,22,15);}}continue;}if(n.item==='water')drawWell(n.x,n.y);else if(n.item==='wood'){const variant=groundHash(n.x+Number(state.region.slice(-1))*15,n.y)%3,key=['tree','oak-tall','oak-young'][variant],size=[86,94,68][variant];groundContact(n.x*TILE,n.y*TILE,40);prop(key,n.x*TILE+(TILE-size)/2,n.y*TILE+TILE-size,size,size);}else if(n.area==='mine'){groundContact(n.x*TILE,n.y*TILE,34);drawItem(n.item,n.x*TILE,n.y*TILE,48);}else {groundContact(n.x*TILE,n.y*TILE,30);if(!artProp(n.item==='koh'?'koh':n.item==='acid'?'herb':'mushroom',n.x*TILE+5,n.y*TILE+9,38,38))tileSprite(n.item==='acid'?7:6,n.x,n.y,40);};}
}
function updateMineLight(x=state.player.x,y=state.player.y){
 const light=$('mine-light');light.hidden=state.phase!=='morning'||state.area!=='mine';if(light.hidden)return;
 const box=canvas.getBoundingClientRect(),radius=G.MINE_LIGHT_RADIUS*box.width/G.W,cx=(x+.5)*box.width/G.W,cy=(y+.55)*box.height/G.H;
 light.style.backgroundImage=`radial-gradient(circle ${radius}px at ${cx}px ${cy}px,rgba(249,192,97,.09) 0%,rgba(91,64,32,.04) 36%,rgba(8,14,20,.27) 62%,rgba(3,8,14,.78) 86%,#03080e 100%)`;
}
function drawWalkingPlayer(){
 let x=state.player.x,y=state.player.y,step=0,bob=0;
 if(walking&&walking.region===state.region&&state.phase==='morning'){
  const t=Math.min(1,Math.max(0,(performance.now()-walking.start)/walking.duration));
  x=walking.from.x+(walking.to.x-walking.from.x)*t;y=walking.from.y+(walking.to.y-walking.from.y)*t;
  step=Math.sin(t*Math.PI)*(walking.stride%2?1:-1);bob=Math.sin(t*Math.PI)*1.3;
  if(t>=1)walking=null;
 }else walking=null;
 drawResourceLayer(y*TILE+47,true);
 const sheet=REDRAW.images[state.character==='female'?'walk-female':'walk']?.complete?REDRAW.images[state.character==='female'?'walk-female':'walk']:propImages[state.character==='female'?'walk-female':'walk'];
 if(sheet?.naturalWidth){
  const row={down:0,left:1,right:2,up:3}[facing],t=walking?Math.min(1,(performance.now()-walking.start)/walking.duration):0;
  const frame=walking?(t<.18?0:t<.82?(walking.stride%2?3:1):2):0;
  const sw=sheet.naturalWidth/4,sh=(sheet.naturalHeight||sheet.naturalWidth)/4;
  const fresh=sheet===REDRAW.images[state.character==='female'?'walk-female':'walk'];const anchor=REDRAW.bounds[state.character==='female'?'walk-female':'walk']?.[row*4+frame];const origin=fresh?{x:Math.round(x*TILE+24-(anchor?anchor.center/sw*56:28)),y:Math.round(y*TILE+47-(anchor?anchor.sole/sh*56:51))}:walkFramePlacement(row,frame,x,y);
  ctx.drawImage(sheet,Math.floor(frame*sw),Math.floor(row*sh),Math.floor((frame+1)*sw)-Math.floor(frame*sw),Math.floor((row+1)*sh)-Math.floor(row*sh),origin.x,origin.y,fresh?56:64,fresh?56:64);
 }else drawSprite(9,x*TILE-2,y*TILE-12,52,60);
 drawResourceLayer(y*TILE+47,false);
 updateMineLight(x,y);
 if(walking&&worldBackdrop&&!walkTimer)walkTimer=setTimeout(()=>{walkTimer=null;if(state.phase!=='morning')return;if(worldBackdrop)ctx.putImageData(worldBackdrop,0,0);drawWalkingPlayer();},32);
}

let gatherGlowKey='';
function renderGatherGlow(){
 const rocks=state.equipment.pickaxe?state.maps[state.region].decor.map(([x,y])=>({id:'rock-'+x+'-'+y,x,y})).filter(n=>G.near(state.player,n)):[];
 const nodes=[...G.activeNodes(state).filter(n=>!n.used&&G.near(state.player,n)),...rocks,...G.activeTreasures(state).filter(t=>!t.opened&&G.near(state.player,t))],key=state.region+':'+nodes.map(n=>n.id+'@'+n.x+','+n.y).join('|');
 if(key===gatherGlowKey)return;gatherGlowKey=key;
 $('gather-glow').innerHTML=nodes.map(n=>'<span class="gather-shimmer" style="left:'+((n.x+.5)/G.W*100)+'%;top:'+((n.y+.45)/G.H*100)+'%"><i></i><i></i><i></i></span>').join('');
}

function draw(){if(state.phase!=='morning')return;renderGatherGlow();const resolution=Math.max(2,Math.min(4,(canvas.clientWidth||720)/720*(window.devicePixelRatio||1))),w=Math.round(720*resolution);if(canvas.width!==w){canvas.width=w;canvas.height=Math.round(480*resolution);}ctx.setTransform(canvas.width/720,0,0,canvas.height/480,0,0);ctx.imageSmoothingEnabled=false;const forest=state.area==='forest',map=state.maps[state.region];ctx.fillStyle=forest?'#102c32':'#141b24';ctx.fillRect(0,0,G.W*TILE,G.H*TILE);
 for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){if(!map.floor.includes(x+','+y)){const px=x*TILE,py=y*TILE;if(forest){const lakeTile=state.lake?.includes((Number(state.region.slice(-1))%3*G.W+x)+','+(Math.floor(Number(state.region.slice(-1))/3)*G.H+y));ctx.fillStyle=lakeTile?((x+y)%2?'#355965':'#3b6370'):((x+y)%2?'#203c43':'#243f46');ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle='#3a5960';ctx.fillRect(px+8,py+15,22,2);ctx.fillRect(px+25,py+34,16,2);if(map.floor.includes(x+','+(y-1))){ctx.fillStyle='#72766a';ctx.fillRect(px,py,TILE,5);}}else{ctx.fillStyle='#12181d';ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle='#262a2e';ctx.fillRect(px+4,py,11,TILE);ctx.fillStyle='#333638';ctx.fillRect(px+4,py,5,29);if(map.floor.includes(x+','+(y-1))){ctx.fillStyle='#77716a';ctx.fillRect(px,py,TILE,6);ctx.fillStyle='#494743';ctx.fillRect(px,py+6,TILE,9);}}continue;}const gx=Number(state.region.slice(-1))%3*G.W+x,gy=Math.floor(Number(state.region.slice(-1))/3)*G.H+y,shore=forest&&DIRS.some(([dx,dy])=>!state.maps[state.region].floor.includes((x+dx)+','+(y+dy)))&&x>0&&y>0&&x<G.W-1&&y<G.H-1,patch=Math.sin(gx*.43)+Math.cos(gy*.6);ctx.fillStyle=forest?(shore?'#777e59':patch>1?'#61744f':patch<-.6?'#3e5745':'#4c634a'):'#4b4945';ctx.fillRect(x*TILE,y*TILE,TILE,TILE);ctx.fillStyle=forest?'#65705a':'#605b52';ctx.fillRect(x*TILE+8,y*TILE+13,4,3);ctx.fillRect(x*TILE+31,y*TILE+35,6,2);if(!forest){ctx.fillStyle='#27304477';ctx.fillRect(x*TILE,y*TILE,TILE,TILE);}ctx.strokeStyle='#14231d18';ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);}
 if(forest)drawForestGround();else drawMineArt(map);
 for(const k of map.floor){const [x,y]=k.split(',').map(Number),gx=Number(state.region.slice(-1))%3*G.W+x,gy=Math.floor(Number(state.region.slice(-1))/3)*G.H+y;const noise=(gx*31+gy*17)%13;if(forest){if(!map.trails?.includes(k)&&noise===2&&!G.activeNodes(state).some(n=>n.x===x&&n.y===y))prop('fern',x*TILE+3,y*TILE+14,35,30);}else if(noise===3){ctx.fillStyle='#a08c61';ctx.fillRect(x*TILE+6,y*TILE+12,4,3);}}
 for(const [x,y] of map.decor){groundContact(x*TILE,y*TILE,34);drawItem('rock',x*TILE,y*TILE,48);}
 if(forest){if(state.region==='forest0'){drawSprite(8,3*TILE-20,7*TILE-35,90,90);label('연금술 상점',3*TILE+24,7*TILE-28);}if(state.region===G.GATE_REGION){prop('portal',13*TILE-10,2*TILE-20,68,68);label('광산 입구',13*TILE+24,2*TILE-20);}}else if(state.region===G.EXIT_REGION){prop('portal',2*TILE-8,8*TILE-18,64,64);label('숲으로',2*TILE+24,8*TILE-18);}

 if(typeof sanctuaryDraw==='function')sanctuaryDraw();
 const index=Number(state.region.slice(-1)),col=index%3,row=Math.floor(index/3);for(const [dx,dy,arrow] of [[-1,0,'←'],[1,0,'→'],[0,-1,'↑'],[0,1,'↓']]){if(col+dx<0||col+dx>2||row+dy<0||row+dy>2)continue;const next=state.maps[state.area+((row+dy)*3+col+dx)];for(let lane=1;lane<(dx?G.H:G.W)-1;lane++){const x=dx?(dx<0?0:G.W-1):lane,y=dy?(dy<0?0:G.H-1):lane,ax=dx?(dx<0?G.W-2:1):lane,ay=dy?(dy<0?G.H-2:1):lane;if(map.floor.includes(x+','+y)&&next.floor.includes(ax+','+ay)){label(arrow,x*TILE+24,y*TILE+22);break;}}}worldBackdrop=ctx.getImageData(0,0,canvas.width,canvas.height);drawWalkingPlayer();
}
function contextTarget(){
 if(state.phase==='end')return {type:'summary',text:'마감 내역 보기'};
 if(state.phase==='morning'){

  const sp=state.sanctuary;if(sp?.relics.map&&state.region===sp.region&&sp.portal&&Math.abs(state.player.x-sp.portal.x)+Math.abs(state.player.y-sp.portal.y)<=1)return {type:'sanctuary',text:'성소 조사'};
  if(state.region===G.GATE_REGION&&G.near(state.player,G.MINE_GATE))return {type:'mine',text:'광산 입장'};
  if(state.region===G.EXIT_REGION&&G.near(state.player,G.MINE_EXIT))return {type:'forest',text:'숲으로 나가기'};
  if(state.region==='forest0'&&G.near(state.player,G.HOME))return {type:'home',text:'연금술 상점 입장'};
  const chest=G.activeTreasures(state).find(t=>!t.opened&&G.near(state.player,t));if(chest)return {type:'treasure',chest,text:'보물상자 열기'};
  const n=G.activeNodes(state).find(n=>!n.used&&G.near(state.player,n));if(n)return {type:'inspect',node:n,text:n.item==='water'?'물 긷기':n.item==='wood'?'나무 베기':n.item==='stone'?'곡괭이로 규석 캐기':'미확인 시료 조사'};
  const rock=state.maps[state.region].decor.find(([x,y])=>G.near(state.player,{x,y}));if(rock)return {type:'rock',rock:{x:rock[0],y:rock[1]},text:'곡괭이로 바위 부수기 · 행동력 2'};
 }else{
  if(G.near(state.player,G.WATER_BENCH))return {type:'prep',text:'시약 제작소'};
  const guest=G.currentGuest(state);if(guest)return {type:'order',guest,text:'손님 주문 받기'};
 }
 return {type:'none',text:'조사 / 입장'};
}
function render(){
 if(typeof sanctuarySync==='function')sanctuarySync();
 if(window.Clearance){const teacher=studentSession?.role==='teacher',complete=Clearance.qualified(state,studentSession);$('clearance-open').hidden=!(teacher||complete);$('clearance-open').textContent=teacher?'클리어 코드 미리보기':'클리어 코드';if(complete&&!state.clearancePresented&&!window.sanctuaryCelebrating){state.clearancePresented=true;showClearance();}}

 $('brand-name').textContent=state.shopName?state.shopName+'의 연금술 상점':'숲속 연금술사';
 const morning=state.phase==='morning';$('mine-light').hidden=!morning||state.area!=='mine';$('day').textContent=`${state.day}일차 · ${morning?(state.supplemental?'보충 탐사':'오전 탐사'):state.phase==='shop'?'오후 영업':'하루 마감'}`;
 $('energy-hud').hidden=!morning;$('return-scroll').hidden=!morning;$('field-guide').hidden=!morning;renderGuide();
 $('energy').innerHTML=`${state.energy} <small>/ ${G.maxEnergy(state)}</small>`;$('energy-fill').style.width=state.energy/G.maxEnergy(state)*100+'%';document.querySelector('.energy-hud').classList.toggle('low',state.energy<=16);
 $('bag-count').textContent=morning?`${G.bagCount(state)} / ${state.capacity}`:'연금술 상점 재고';$('wallet').hidden=morning;$('money').textContent=`${state.savings+state.coins-state.cost} C`;
 $('map-title').textContent=morning?state.maps[state.region].name:(state.shopName||'연금술 상점');$('map-hint').textContent=morning?(state.area==='mine'?'등불 시야 · 반경 3칸 · E 가방':'네 방향의 넓은 길: 다음 지역 · E 가방'):state.phase==='shop'?`손님 ${Math.min(3,state.orders.filter(o=>o.served||o.skipped).length+1)} / 3 · 한 명씩 방문`:'오늘 영업을 마쳤어요';
 $('interact').textContent='Space · '+contextTarget().text;$('interact').onclick=interact;$('interact').disabled=false;$('emergency').hidden=true;$('resupply-trip').hidden=state.phase!=='shop';
 $('map-frame').hidden=!morning;$('map-controls').hidden=!morning;$('shop-scene').hidden=morning;
 if(morning)draw();else renderShop();
}
function routeTo(target,adjacent=false){
 const key=p=>p.x+','+p.y,queue=[{...state.player,path:[]}],seen=new Set([key(state.player)]);
 while(queue.length){const p=queue.shift();if(adjacent?Math.abs(p.x-target.x)+Math.abs(p.y-target.y)===1:p.x===target.x&&p.y===target.y)return p.path;
  for(const [dx,dy] of DIRS){const q={x:p.x+dx,y:p.y+dy};if(!seen.has(key(q))&&!G.blocked(state,q.x,q.y)){seen.add(key(q));queue.push({...q,path:[...p.path,[dx,dy]]});}}
 }return null;
}
function approachRock(target){
 stopRoute();
 const direct=routeTo(target,true);
 if(direct!==null){follow(direct,()=>interactRock(target));return;}
 // Connected field boulders can hide every adjacent cell of the clicked rock.
 // Clear one reachable edge of that same cluster, never a separate obstacle.
 const rocks=new Set(state.maps[state.region].decor.map(p=>p.join(','))),queue=[target],seen=new Set([target.x+','+target.y]);
 let closest=null;
 while(queue.length){
  const rock=queue.shift(),path=routeTo(rock,true);
  if(path!==null&&(!closest||path.length<closest.path.length))closest={rock,path};
  for(const [dx,dy]of DIRS){const next={x:rock.x+dx,y:rock.y+dy},key=next.x+','+next.y;if(rocks.has(key)&&!seen.has(key)){seen.add(key);queue.push(next);}}
 }
 if(closest)follow(closest.path,()=>interactRock(closest.rock));
 else collisionEffect();
}
function follow(path,done){stopRoute();if(path===null){collisionEffect();return;}function step(){if(modalOpen()||state.phase==='end')return;if(!path.length){routeTimer=null;done?.();return;}const [dx,dy]=path.shift(),r=moveAnimated(dx,dy);if(r.exhausted||r.regionChanged){notify(r);return;}render();if(!r.ok){if(r.message)say(r.message,false,false);routeTimer=null;return;}routeTimer=setTimeout(step,reduced?65:110);}step();}
function walkToOrder(id){const guest=G.currentGuest(state);if(!guest||guest.id!==id||state.phase!=='shop')return;openBench(id);}
function goHome(){stopRoute();notify(G.returnHome(state));canvas.focus({preventScroll:true});}
function interact(){
 if(modalOpen())return;stopRoute();const t=contextTarget();
 if(t.type==='sanctuary')openSanctuaryPortal();
 else if(t.type==='inspect')interactNode(t.node);
 else if(t.type==='rock')interactRock(t.rock);
 else if(t.type==='treasure')interactTreasure(t.chest);
 else if(t.type==='mine'||t.type==='forest')notify(G.changeArea(state,t.type));
 else if(t.type==='home')goHome();
 else if(t.type==='prep')openPrep();
 else if(t.type==='order')openBench(t.guest.id);
 else if(t.type==='summary')showSummary();
 else say(state.phase==='morning'?'시료나 입구 옆 칸에서 조사해 주세요. 클릭하면 그곳으로 이동합니다.':'시약 제작소나 방문한 손님을 선택하세요.');
}
canvas.addEventListener('click',e=>{
 if(modalOpen()||state.phase!=='morning')return;const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*G.W),y=Math.floor((e.clientY-r.top)/r.height*G.H);canvas.focus({preventScroll:true});
 if(state.phase==='morning'){
  if(!G.fieldVisible(state,x,y)){stopRoute();say('어두워서 잘 보이지 않아요. 조금 더 가까이 가 보세요.',false,false);return;}
  const sp=state.sanctuary;if(sp?.relics.map&&state.region===sp.region&&sp.portal?.x===x&&sp.portal?.y===y){follow(routeTo(sp.portal,true),openSanctuaryPortal);return;}
  const chest=G.activeTreasures(state).find(t=>!t.opened&&t.x===x&&t.y===y);if(chest){follow(routeTo(chest,true),()=>interactTreasure(chest));return;}
  const n=G.activeNodes(state).find(n=>!n.used&&n.x===x&&n.y===y);if(n){follow(routeTo(n,true),()=>interactNode(n));return;}
  const portals=state.area==='forest'?[...(state.region==='forest0'?[{...G.HOME,action:goHome}]:[]),...(state.region===G.GATE_REGION?[{...G.MINE_GATE,action:()=>notify(G.changeArea(state,'mine'))}]:[])]:(state.region===G.EXIT_REGION?[{...G.MINE_EXIT,action:()=>notify(G.changeArea(state,'forest'))}]:[]);
  const portal=portals.find(p=>p.x===x&&p.y===y);if(portal){follow(routeTo(portal,true),portal.action);return;}
  if(state.maps[state.region].decor.some(p=>p[0]===x&&p[1]===y)){approachRock({x,y});return;}
 }else{
  if(Math.abs(x-4)<=1&&(y===2||y===3)){follow(routeTo(G.WATER_BENCH,true),openPrep);return;}
  const guest=G.currentGuest(state);if(guest&&Math.abs(x-guest.x)<=1&&(y===2||y===3)){walkToOrder(guest.id);return;}
 }
 if(!G.blocked(state,x,y))follow(routeTo({x,y}));else collisionEffect();
});
function manualMove(dx,dy){if(modalOpen())return;stopRoute();const r=moveAnimated(dx,dy);if(r.exhausted||r.regionChanged){notify(r);return;}if(!r.ok&&r.message)say(r.message,false,false);render();}
function controlFeedback(b){if(!b||b.disabled||reduced||b.classList?.contains?.('shop-guest'))return;b.animate?.([{transform:'translateY(1px) scale(.98)'},{transform:'translateY(0) scale(1)'}],{duration:180,easing:'ease-out'});}
document.addEventListener('click',e=>controlFeedback(e.target?.closest?.('button')));
const dropSelector='[data-slot],#precip-from,#precip-to';
document.addEventListener('dragenter',e=>{const slot=e.target?.closest?.(dropSelector);if(slot&&!slot.disabled)slot.classList.add('drop-hover');});
document.addEventListener('dragleave',e=>{const slot=e.target?.closest?.(dropSelector);if(slot&&!slot.contains?.(e.relatedTarget))slot.classList.remove('drop-hover');});
document.addEventListener('dragend',()=>document.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover')));
document.addEventListener('drop',()=>document.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover')));
canvas.addEventListener('mousemove',e=>{if(modalOpen()||state.phase!=='morning')return;const box=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-box.left)/box.width*G.W),y=Math.floor((e.clientY-box.top)/box.height*G.H);if(!G.fieldVisible(state,x,y)){canvas.style.cursor='default';return;}canvas.style.cursor=(G.activeTreasures(state).some(t=>!t.opened&&t.x===x&&t.y===y)||G.activeNodes(state).some(n=>!n.used&&n.x===x&&n.y===y)||state.maps[state.region].decor.some(p=>p[0]===x&&p[1]===y))?'pointer':!G.blocked(state,x,y)?'crosshair':'default';});
canvas.addEventListener('mouseleave',()=>{canvas.style.cursor='default';});
window.addEventListener?.('resize',()=>{if(state.phase==='morning')draw();});
const keyDirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
document.addEventListener('keydown',e=>{
 if(damagePending||$('business-announcement').open){if(!damagePending&&e.key==='Escape')hideBusinessNotice();e.preventDefault();return;}
 if($('login-dialog').open||$('clearance-dialog').open)return;
 const k=e.key.length===1?e.key.toLowerCase():e.key;
 if(k==='e'&&!$('name-dialog').open&&!$('exhaustion-dialog').open&&!$('bench-dialog').open&&!$('restart-dialog').open){e.preventDefault();if(e.repeat)return;if($('utility-dialog').open){if(panel==='bag')closeUtility();}else openBag();return;}
 if(modalOpen())return;
 if(e.target?.closest?.('button,input,select,textarea,a,[contenteditable]'))return;
 if(keyDirs[k]){e.preventDefault();const now=performance.now();if(now-lastStep<95&&e.repeat)return;lastStep=now;manualMove(...keyDirs[k]);}
 else if(k===' '){e.preventDefault();if(!e.repeat)interact();}
});
document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>manualMove(...b.dataset.dir.split(',').map(Number)));
$('bag-button').onclick=()=>{if(damagePending||$('business-announcement').open)return;if($('login-dialog').open)return;if($('name-dialog').open)return;if(!$('exhaustion-dialog').open&&!$('bench-dialog').open&&!$('restart-dialog').open){if($('utility-dialog').open&&panel==='bag')closeUtility();else if(!$('utility-dialog').open)openBag();}};
$('return-scroll').onclick=()=>{if(damagePending||$('business-announcement').open)return;stopRoute();notify(G.useReturnScroll(state));};$('emergency').onclick=$('return-scroll').onclick;$('resupply-trip').onclick=()=>{stopRoute();notify(G.resumeExploration(state));};
function utility(kind,title,kicker){if(typeof cancelSanctuaryTransition==='function')cancelSanctuaryTransition();stopRoute();panel=kind;$('utility-dialog').dataset.kind=kind;$('utility-title').textContent=title;$('utility-kicker').textContent=kicker;$('utility-content').scrollTop=0;if(!$('utility-dialog').open){document.body.classList.add('modal-open');$('utility-dialog').showModal();}}
function closeUtility(){if(typeof cancelSanctuaryTransition==='function')cancelSanctuaryTransition();stopForgeTiming();G.cancelInspection(state);G.cancelSmelt(state);panel='';$('utility-dialog').close();document.body.classList.remove('modal-open');render();canvas.focus({preventScroll:true});}
$('close-utility').onclick=closeUtility;$('utility-dialog').addEventListener('cancel',e=>{e.preventDefault();closeUtility();});
function bagItems(values,aqueous=false){const entries=Object.entries(values).filter(([,v])=>v>0);if(!entries.length)return '<p class="empty-bag">아직 보관한 재료가 없어요.</p>';return `<div class="bag-list">${entries.map(([k,v])=>{const item=G.ITEMS[k];return `<div class="bag-item">${itemSprite(k)}<div><b>${item.formula}(${aqueous?'aq':item.form||'s'})</b><small>${item.name}${aqueous?' 수용액':''}</small></div><strong>×${v}${!aqueous&&state.phase!=='morning'&&state.premium[k]?'<small>고순도 '+state.premium[k]+'</small>':''}</strong></div>`;}).join('')}</div>`;}
function openBag(){
 utility('bag',state.phase==='morning'?'채집 가방':'연금술 상점 보관함','INVENTORY / E로 닫기');
 $('utility-content').innerHTML=state.phase==='morning'?`<p class="bag-caption">이번 탐사에서 검증하고 채집한 재료 · ${G.bagCount(state)} / ${state.capacity}</p>${bagItems(state.bag)}<p class="small muted">시료의 정체는 검증을 통과해 채집한 뒤에 공개됩니다.</p>`:`<h3 class="bag-subtitle">재료 보관함</h3>${bagItems(state.stock)}<h3 class="bag-subtitle">사용 가능한 수용액</h3>${bagItems(state.aqueous,true)}`;
 $('utility-content').insertAdjacentHTML('afterbegin','<div class="bag-wallet"><span>현재 소지금</span><strong>'+G.wallet(state)+'C</strong></div>');
}
function harvestEffect(n,qty=1){
 const dialog=$('exhaustion-dialog').open?$('exhaustion-dialog'):$('utility-dialog').open?$('utility-dialog'):null;
 const effect=document.createElement('div'),water=n.item==='water',wood=n.item==='wood';
 effect.className='harvest-effect '+(water?'harvest-water':wood?'harvest-wood':n.area==='mine'?'harvest-rock':'harvest-herb');effect.setAttribute('aria-hidden','true');
 if(dialog){effect.style.left='50%';effect.style.top='42%';dialog.appendChild(effect);}else{const box=canvas.getBoundingClientRect();effect.style.position='fixed';effect.style.left=(box.left+(n.x+.5)/G.W*box.width)+'px';effect.style.top=(box.top+(n.y+.7)/G.H*box.height)+'px';document.body.appendChild(effect);}
 effect.innerHTML=(REDRAW.images.effects?.complete?'<i class="drawn-harvest" style="--effect-row:'+(water?0:wood?1:n.area==='mine'?2:3)+'"></i>':'')+'<i class="harvest-ring"></i>'+Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,reach=28+(i%3)*12;return '<i class="harvest-bit" style="--dx:'+Math.round(Math.cos(a)*reach)+'px;--dy:'+Math.round(Math.sin(a)*reach-30)+'px;--spin:'+(i%2?160:-140)+'deg;--delay:'+(i%3)*35+'ms"></i>';}).join('')+'<b class="harvest-gain">'+G.ITEMS[n.item].name+' +'+qty+'</b>';
 setTimeout(()=>effect.remove(),1100);
}
function interactTreasure(chest){
 const result=G.openTreasure(state,chest.id);notify(result);if(!result.ok)return;
 utility('treasure','숨겨진 보물 발견','광산 탐사');
 $('utility-content').innerHTML='<section class="treasure-reward"><div class="treasure-aura">'+treasureIllustration()+'<i>✦</i><i>✧</i><i>✦</i></div><div class="treasure-payout"><span>금화를 찾았습니다!</span><strong>+'+result.treasureCoins+' C</strong></div><p class="treasure-wallet">현재 소지금 <b>'+G.wallet(state)+' C</b></p><button id="treasure-continue" class="primary">탐사 계속하기</button></section>';
 $('treasure-continue').onclick=closeUtility;
}
function interactRock(rock){
 const r=G.breakRock(state,rock.x,rock.y);notify(r);
 if(!r.rockBroken||r.exhausted||reduced)return;
 const effect=document.createElement('div'),box=canvas.getBoundingClientRect();
 effect.className='harvest-effect harvest-rock rock-break-effect';effect.setAttribute('aria-hidden','true');
 effect.style.position='fixed';effect.style.left=(box.left+(rock.x+.5)/G.W*box.width)+'px';effect.style.top=(box.top+(rock.y+.7)/G.H*box.height)+'px';
 effect.innerHTML='<i class="harvest-ring"></i>'+Array.from({length:10},(_,i)=>{const angle=i*Math.PI/5,reach=24+(i%3)*12;return '<i class="harvest-bit" style="--dx:'+Math.round(Math.cos(angle)*reach)+'px;--dy:'+Math.round(Math.sin(angle)*reach-20)+'px;--spin:'+(i%2?160:-140)+'deg;--delay:'+(i%3)*25+'ms"></i>';}).join('');
 document.body.appendChild(effect);setTimeout(()=>effect.remove(),1100);
}
function interactNode(n){if(['wood','water','stone'].includes(n.item)){const before=state.harvested,amount=state.bag[n.item]+state.stock[n.item],r=G.collectDirect(state,n.id);notify(r);if(state.harvested>before)harvestEffect(n,state.bag[n.item]+state.stock[n.item]-amount);return;}openInspection(n.id);}
function openInspection(id){const r=G.inspect(state,id);if(!r.ok){notify(r);return;}utility('inspection','미확인 시료 검증','FIELD CHECK / 채집 전 관찰');renderInspection();}
function renderInspection(feedback=''){
 const n=G.activeNodes(state).find(n=>n.id===state.inspection);if(!n)return;
 $('utility-content').innerHTML=`<p class="inspection-energy">남은 행동력 ${state.energy} / ${G.maxEnergy(state)}</p><div class="inspection-visual" aria-label="미확인 시료의 실루엣"><div class="inspection-silhouette" aria-hidden="true">${inspectionArt(n)?'<img src="'+inspectionArt(n)+'" alt="">':itemSprite(n.item)}</div><span class="inspection-mark" aria-hidden="true">?</span></div><p class="inspection-question">${n.question}</p><div class="answer-list">${n.choices.map((c,i)=>`<button id="answer-${i}" data-answer="${i}">${i+1}. ${c}</button>`).join('')}</div><p class="answer-result" role="status">${feedback||'관찰 결과를 올바르게 판단하면 채집할 수 있어요.'}</p><p class="small muted">오답 시 행동력 −${G.wrongCost(state)} · 채집 성공 시 −2. 0이 되면 자동 귀환합니다.</p>`;
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{const amount=state.bag[n.item]+state.stock[n.item],r=G.answerInspection(state,+b.dataset.answer);if(r.exhausted){notify(r);const gained=state.bag[n.item]+state.stock[n.item]-amount;if(gained>0)harvestEffect(n,gained);return;}if(!r.ok){if(r.attempted){closeUtility();notify(r);return;}renderInspection(r.message);return;}render();say(r.message);panel='discovery';$('utility-title').textContent='시료의 정체를 알아냈어요';$('utility-content').innerHTML=`<div class="discovery">${itemSprite(n.item)}<h3>${G.ITEMS[n.item].name}</h3><p>${G.ITEMS[n.item].formula}(${G.ITEMS[n.item].form||'s'}) × ${r.qty}를 가방에 넣었습니다.${r.bonus?' 장비 효과로 추가 채집했어요!':''}</p><p class="small muted">이 창을 닫은 뒤 가방 버튼 또는 E로 재료를 확인하세요.</p><button class="primary" id="continue-explore">탐사 계속하기</button></div>`;$('continue-explore').onclick=closeUtility;harvestEffect(n,r.qty);});
}
function openPrep(message=''){
 if(state.phase!=='shop')return;utility('prep','시약 제작소','시약 원료 + 물');renderPrep(message);
}
function renderPrep(feedback=''){
 const shortage=G.missing(state),count=shortage.acid+shortage.base;
 $('utility-content').innerHTML='<div class="prep-intro"><button id="open-precipitation">금속 석출대</button><span>보유한 물 '+state.stock.water+'병</span></div>'+['acid','base','koh'].map(k=>'<div class="prep-row"><div>'+itemSprite(k)+'<strong>'+(G.ITEMS[k].rawFormula||G.ITEMS[k].formula)+'('+(G.ITEMS[k].form||'s')+')</strong><span>원료 '+state.stock[k]+' / 수용액 '+state.aqueous[k]+'</span><button id="dissolve-'+k+'" class="primary" '+(state.stock[k]<1||state.stock.water<1?'disabled':'')+'>물 1병으로 녹이기</button></div></div>').join('')+'<p class="prep-feedback" role="status">'+feedback+'</p><div class="prep-bottom"><button id="supply" class="secondary" '+(!count?'disabled':'')+'>부족한 재료 보급 · '+count*8+'C</button><button id="prep-exit" class="secondary">나가기</button></div>';
 for(const k of ['acid','base','koh'])$('dissolve-'+k).onclick=()=>{const r=G.dissolve(state,k);render();renderPrep(r.message);};$('supply').onclick=()=>{const r=G.supply(state);render();renderPrep(r.message);};$('prep-exit').onclick=closeUtility;$('open-precipitation').onclick=()=>renderPrecipitation();
}

const metalTendency='<aside class="tendency"><strong>이온화 경향 · 전자를 내놓기 쉬운 순서</strong><p>Fe › Cu › Ag › Au</p><small>왼쪽 금속일수록 양이온이 되기 쉽습니다. 이 작업대에는 재련한 구리 또는 철 금속을 사용합니다. 이 게임에서는 Fe → Fe³⁺, Cu → Cu²⁺로 산화된다고 가정합니다.</small></aside>';
function renderPrecipitation(message=''){
 const guest=G.recoveryCurrent(state);
 if(guest){renderRecovery(message);return;}
 renderStockPrecipitation();
}
function particleCount(n){
 if(Math.abs(n)<1e-8)return '0';if(Math.abs(n-1)<1e-8)return 'N';
 if(Math.abs(n-Math.round(n))<1e-8)return Math.round(n)+'N';
 for(let d=2;d<=12;d++){const p=Math.round(n*d);if(Math.abs(n*d-p)<1e-8)return '('+p+'/'+d+')N';}
 return Number(n.toFixed(4))+'N';
}
function renderRecovery(message=''){
 const o=G.recoveryCurrent(state);if(!o){renderStockPrecipitation();return;}
 const b=o.recovery,r=G.RECOVERY[b.kind],count=particleCount;
 panel='precipitation';$('utility-title').textContent='금속 석출대';$('utility-kicker').textContent=o.name+' · 석출 주문';
 let html='<section class="recovery-order-card"><span class="overline">손님의 주문</span><h3>'+r.name+' 원자 수 <strong>'+count(b.target)+'</strong></h3><p>“주문한 양만큼 정확히 석출시켜 주세요.”</p><span class="recovery-pay">보상 '+o.reward+' C</span></section>'+metalTendency;
 html+='<div class="recovery-work target-recovery"><div class="recovery-vessel" style="--solution:'+r.color+';--metal:'+(b.kind==='silver'?'#d9e1e5':'#d8ac3e')+'"><div class="recovery-liquid"></div><span class="recovery-ion">'+r.ions+'</span><div class="recovery-grains '+(b.stage==='result'?'visible':'')+'">✦ · ✦ · ✦</div><b>손님이 가져온 용액</b></div><section class="recovery-task">';
 if(b.stage==='prepare'){
 html+='<h3>무엇을 얼마나 넣을까요?</h3><p>용액에는 주문량보다 많은 '+r.name+'이 들어 있습니다. 석출시킬 양은 투입하는 금속으로 조절하세요.</p>';
 if(b.kind==='gold')html+='<p class="recovery-model">용액 속 금의 산화수는 +3입니다. 다른 반응은 일어나지 않는다고 가정합니다.</p>';
 html+='<div class="recovery-form"><label for="recovery-metal">투입할 금속<select id="recovery-metal">'+Object.entries(G.RECOVERY_METALS).map(([k,m])=>'<option value="'+k+'" '+((state.stock[k]||0)<1?'disabled':'')+'>'+m.symbol+' → '+m.ion+' · 보유 원자 수 '+count(state.stock[k]||0)+'</option>').join('')+'</select></label><label for="recovery-amount">투입할 금속 원자 수<select id="recovery-amount">'+Array.from({length:24},(_,i)=>'<option value="'+(i+1)+'">'+count(i+1)+'</option>').join('')+'</select></label></div><p class="small muted">주괴 한 개의 금속 원자 수를 N으로 정합니다.</p><button id="recovery-run" class="primary">선택한 양으로 석출하기</button>';
 }else if(b.stage==='result'){
 const f=b.final;html+='<h3>석출 결과</h3><dl class="recovery-comparison"><div><dt>주문한 '+r.name+' 원자 수</dt><dd>'+count(b.target)+'</dd></div><div><dt>석출된 '+r.name+' 원자 수</dt><dd>'+count(f.recovered)+'</dd></div><div><dt>반응하지 않은 투입 금속</dt><dd>'+count(f.excess)+'</dd></div></dl>';
 html+=!f.filtered?'<button id="recovery-filter" class="primary">석출된 금속 분리하기</button>':'<button id="recovery-deliver" class="primary">손님에게 전달</button>';
 }
 html+='</section></div><p id="recovery-feedback" class="status-note" role="status">'+message+'</p><div class="dialog-actions"><button id="recovery-exit">나가기</button></div>';$('utility-content').innerHTML=html;
 $('recovery-exit').onclick=closeUtility;
 if($('recovery-run')){const available=Object.keys(G.RECOVERY_METALS).find(k=>(state.stock[k]||0)>=1);if(available)$('recovery-metal').value=available;$('recovery-run').disabled=!available;if(!available)$('recovery-feedback').textContent='구리나 철 주괴를 재련한 뒤 돌아와 주세요.';$('recovery-run').onclick=()=>{const x=G.recoveryRun(state,$('recovery-metal').value,Number($('recovery-amount').value));if(!x.ok){$('recovery-feedback').textContent=x.message;failureEffect();return;}renderRecovery(x.message);render();};}
 if($('recovery-filter'))$('recovery-filter').onclick=()=>{const x=G.recoveryFilter(state);renderRecovery(x.message);render();};
 if($('recovery-deliver'))$('recovery-deliver').onclick=()=>{const x=G.recoveryDeliver(state);if(!showAngryDeparture(x))$('recovery-feedback').textContent=x.message;};
}

function renderStockPrecipitation(){
 panel='precipitation';$('utility-title').textContent='금속 석출대';$('utility-kicker').textContent='은 · 금 회수';
 $('utility-content').innerHTML=metalTendency+'<p>은 또는 금 석출 주문을 받은 뒤 이 작업대를 이용하세요.</p><p>광석을 재련해 얻은 구리나 철 금속이 필요합니다.</p><p>구리 '+(state.stock.copperMetal||0)+'개 · 철 '+(state.stock.ironMetal||0)+'개</p><div class="dialog-actions"><button id="precip-back">나가기</button></div>';
 $('precip-back').onclick=closeUtility;
}

function openBench(id){if(departingGuest)return;if(G.currentGuest(state)?.type==='special'){openRelicQuest(G.currentGuest(state).relicKey);return;}if(G.currentGuest(state)?.type==='recovery'){utility('precipitation','금속 석출대','손님 용액 회수');renderPrecipitation();return;}stopRoute();const r=G.prepare(state,id);if(!r.ok){notify(r);return;}$('bench-content').scrollTop=0;renderBench();document.body.classList.add('modal-open');$('bench-dialog').showModal();}
function closeBench(){G.closeBench(state);$('bench-dialog').close();document.body.classList.remove('modal-open');render();canvas.focus({preventScroll:true});}
$('close-bench').onclick=closeBench;$('bench-dialog').addEventListener('cancel',e=>{e.preventDefault();closeBench();});
function particles(text,n,cls=''){return `<span class="particle ${cls}">${text}</span>`.repeat(n);}
$('bench-skip').onclick=()=>{const r=G.skipGuest(state);if(!r.ok)return; $('bench-dialog').close();document.body.classList.remove('modal-open');notify(r);if(state.phase==='end')showSummary();};
function renderBench(message='',ok=true){$('bench-skip').hidden=false;const o=G.currentOrder(state);if(!o)return;if(o.type==='delivery')renderDelivery(message);else if(o.type==='acid')renderGentle(message,ok);else renderMetalOrder();}

const BTB_COLORS={yellow:{name:'노란색',hex:'#f0ce57'},green:{name:'초록색',hex:'#6ebf87'},blue:{name:'파란색',hex:'#609ce0'}};
function assayView(b){
 const stage=b.acidStage,active=['explore','double'].includes(stage),sample=stage==='explore'?2:10,total=sample+(active?b.doses:0);
 return {stage,sample,total,doses:b.doses||0,fill:.12+total/40*.78,color:G.neutralState(b).color};
}
function assayBeaker(view,motion,previous){
 const pouring=motion==='pouring',moving=pouring||motion==='rewind',before=moving&&previous?.stage===view.stage?previous.fill:view.fill;
 const top=234-144*view.fill,ml=pouring?view.doses-(previous?.doses||0):0;
 return `<svg class="assay-beaker" viewBox="0 0 240 270" role="img" aria-label="비커 속 용액 ${view.total} mL" style="--fill-before:${before};--fill-now:${view.fill}">
 <defs><clipPath id="assay-interior"><rect x="56" y="88" width="128" height="146" rx="9"/></clipPath><linearGradient id="assay-water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#bedbd1" stop-opacity=".8"/><stop offset="1" stop-color="#729f98" stop-opacity=".55"/></linearGradient></defs>
 <ellipse cx="120" cy="248" rx="83" ry="8" fill="#091c16" opacity=".35"/>
 <path d="M52 84V226Q52 238 64 238H176Q188 238 188 226V84" fill="#d8ece0" fill-opacity=".045"/>
 <g clip-path="url(#assay-interior)"><rect class="assay-liquid ${moving?'assay-liquid-moving':''}" x="56" y="90" width="128" height="144" fill="url(#assay-water)"/>
 ${pouring?`<path class="assay-stream" d="M120 65V${top+6}"/><ellipse class="assay-ripple" cx="120" cy="${top+3}" rx="30" ry="5"/>`:''}</g>
 <path class="assay-outline" d="M42 84H52V226Q52 238 64 238H176Q188 238 188 226V84H198"/>
 <path class="assay-glint" d="M64 101V215Q64 226 74 226"/>
 <path class="assay-marks" d="M163 111H178M169 138H178M163 165H178M169 192H178M163 219H178"/>
 ${pouring?`<g class="assay-pour-action"><g transform="translate(153 9) rotate(35)"><path d="M-9 2H9V28L4 37V58H-4V37L-9 28Z" fill="#c9e2d6" fill-opacity=".28" stroke="#c6dbcf" stroke-width="2"/><path d="M-6 13H6V27L2 35V53H-2V35L-6 27Z" fill="#accfc3"/><rect x="-11" y="-3" width="22" height="11" rx="3" fill="#bca776"/></g><path class="assay-stream" d="M120 65V89"/><text x="183" y="49" text-anchor="middle">+${ml} mL</text></g>`:''}
 </svg>`;
}
function renderGentle(message='',ok=true,motion='arrive',previous=null){
 const focused=document.activeElement?.id;
 const b=state.bench,o=G.currentOrder(state),view=assayView(b),stage=b.acidStage,testing=stage==='explore',making=stage==='double',active=testing||making;
 $('bench-title').textContent=o.name;$('bench-kicker').textContent=making?'주문 제작':testing?'중화 비율 확인':'시약 검사';
 let body='<div class="assay-stage"><figure class="assay-vessel">'+assayBeaker(view,motion,previous)+'<figcaption>'+(testing?'시료 2 mL':'손님 용액 10 mL')+(active?'<small>현재 전체 부피 '+view.total+' mL</small>':'')+'</figcaption>'+(['choose','ready'].includes(stage)?'<div class="sample-observation"><span>H⁺</span><span>Cl⁻</span></div>':'')+'</figure>';
 if(testing){const color=BTB_COLORS[view.color],from=previous?.stage==='explore'?previous.color:view.color;body+='<aside class="btb-indicator" data-from="'+from+'" data-color="'+view.color+'" role="status" aria-live="polite"><span class="btb-label">BTB</span><div class="btb-color-disc" aria-hidden="true" style="--btb-from:'+BTB_COLORS[from].hex+';--btb-to:'+color.hex+'"></div><p>현재 색<strong>'+color.name+'</strong></p></aside>';}
 body+='</div>';
 if(stage==='inspect')body+='<button id="inspect-solution" class="primary">용액 검사하기</button>';
 if(['choose','ready'].includes(stage)){
  body+='<h3>내 매대</h3><div class="reagent-shelf">'+Object.entries(G.ITEMS).filter(([k])=>state.stock[k]>0||state.aqueous[k]>0).map(([k,v])=>'<button id="choose-'+k+'" data-reagent="'+k+'" class="reagent-bottle '+(b.reagent===k?'selected':'')+'">'+itemSprite(k)+'<strong>'+v.formula+'</strong><small>'+(G.needsSolution(k)?'수용액 '+state.aqueous[k]+' / 원료 '+state.stock[k]:state.stock[k]+'개')+'</small></button>').join('')+'</div>';
  if(stage==='ready')body+='<button id="start-test" class="primary">중화 비율 확인 시작</button>';
  body+='<button id="visit-prep" class="text-button">시약 제작소</button>';
 }
 if(active){
  if(making)body+='<div class="test-record"><strong>테스트 기록</strong><span>시료 2 mL / '+G.ITEMS[b.reagent].formula+' '+b.testDose+' mL</span><small>당시 관찰한 색: '+BTB_COLORS[b.testColor||'green'].name+'</small></div>';
  body+='<div class="dose-readout">'+G.ITEMS[b.reagent].formula+' <b>'+b.doses+' mL</b></div><div class="button-row">'+(testing?[1,2]:[1,2,5,10]).map(ml=>'<button id="pour-'+ml+'" data-ml="'+ml+'" class="primary" '+(b.doses+ml>30?'disabled':'')+'>+'+ml+' mL</button>').join('')+'<button id="undo" class="secondary" '+(!b.history.length?'disabled':'')+'>되돌리기</button></div>';
  if(testing)body+='<div class="button-row"><button id="change-reagent" class="text-button">재료 다시 고르기</button><button id="double-sample" class="primary">용액 준비하기</button></div>';
  else body+='<button id="serve" class="primary">손님에게 전달 · '+o.reward+'C</button>';
 }
 $('bench-content').innerHTML='<div class="immersive-lab drawn-assay"><p class="customer-request">“'+G.guestQuote(o)+'”</p>'+body+'<p class="bench-feedback '+(ok?'':'error')+'" role="status">'+message+'</p></div>';
 function action(fn,motion){const before=assayView(state.bench),r=fn(state);if(!r.ok)failureEffect();render();renderGentle(r.message,r.ok,r.ok?motion:'shake',before);}
 if($('inspect-solution'))$('inspect-solution').onclick=()=>action(G.inspectSolution,'inspect');
 document.querySelectorAll('[data-reagent]').forEach(el=>el.onclick=()=>action(s=>G.chooseReagent(s,el.dataset.reagent),'select'));
 if($('start-test'))$('start-test').onclick=()=>action(G.startTest,'sample');
 if($('visit-prep'))$('visit-prep').onclick=()=>{closeBench();openPrep();};
 document.querySelectorAll('[data-ml]').forEach(el=>el.onclick=()=>action(s=>G.pour(s,+el.dataset.ml),'pouring'));
 if($('undo'))$('undo').onclick=()=>action(G.undo,'rewind');
 if($('change-reagent'))$('change-reagent').onclick=()=>action(G.changeReagent,'arrive');
 if($('double-sample'))$('double-sample').onclick=()=>action(G.doubleSample,'sample');
 if($('serve'))$('serve').onclick=()=>{const r=G.serve(state);if(showAngryDeparture(r))return;if(!r.ok){failureEffect();render();renderGentle(r.message,false,'shake');return;}closeBench();notify(r);};
 const focusTarget=focused&&$(focused)&&!$(focused).disabled?$(focused):['start-test','inspect-solution','pour-1','serve'].map(id=>$(id)).find(el=>el&&!el.disabled);focusTarget?.focus({preventScroll:true});
}


function renderDelivery(message=''){const o=G.currentOrder(state);$('bench-title').textContent=o.name;$('bench-kicker').textContent='물품 주문';$('bench-content').innerHTML='<p>“'+(o.angryQuote||G.guestQuote(o))+'”</p><div class="reagent-shelf">'+Object.entries(G.ITEMS).filter(([k])=>G.usable(state,k)>0).map(([k,v])=>'<button data-delivery="'+k+'" class="reagent-bottle '+(state.bench.deliveryItem===k?'selected':'')+'">'+itemSprite(k)+'<strong>'+v.formula+(G.needsSolution(k)?'(aq)':'')+'</strong><small>'+G.usable(state,k)+'개</small></button>').join('')+'</div><p role="status">'+message+'</p><div class="button-row"><button id="delivery-prep">시약 제작소</button><button id="delivery-serve" class="primary">전달 · '+o.reward+'C</button></div>';document.querySelectorAll('[data-delivery]').forEach(b=>b.onclick=()=>{G.selectDelivery(state,b.dataset.delivery);renderDelivery();});$('delivery-prep').onclick=()=>{closeBench();openPrep();};$('delivery-serve').onclick=()=>{const r=G.serve(state);if(showAngryDeparture(r))return;if(!r.ok){failureEffect();render();renderDelivery(r.message);return;}$('bench-dialog').close();document.body.classList.remove('modal-open');notify(r);if(state.phase==='end')showSummary();};}

function renderMetalOrder(){const o=G.currentOrder(state);if(!o)return;$('bench-title').textContent=o.name;$('bench-kicker').textContent='금속 납품';$('bench-content').innerHTML='<div class="metal-delivery"><p>“'+G.guestQuote(o)+'”</p>'+Object.entries(o.needs).map(([k,v])=>'<div class="ingot '+k+'">'+G.ITEMS[k].formula+'</div><p>'+G.ITEMS[k].name+' '+v+'개 / 보유 '+state.stock[k]+'개'+(state.premium[k]?' · 고순도 '+state.premium[k]+'개':'')+'</p>').join('')+'<button id="serve" class="primary">주괴 전달 · '+G.saleQuote(state,o)+'C</button></div>';$('serve').onclick=()=>{const r=G.serve(state);if(showAngryDeparture(r))return;if(!r.ok){say(r.message,false);return;}$('bench-dialog').close();document.body.classList.remove('modal-open');notify(r);if(state.phase==='end')showSummary();};}
let forgeSelection=null;
function openForge(message=''){if(state.phase!=='shop')return;utility('forge','숯 가마와 재련로','WORKSHOP');renderForge(message);}
function renderForge(message='',hot=false){
 if(state.smelting){renderSmelt(message);return;}
 $('utility-content').innerHTML='<div class="forge-room '+(hot?'hot':'')+'"><div class="pixel-furnace"><span class="forge-fire"></span></div><div class="charcoal-station"><h3>숯 가마</h3><p>나무 '+state.stock.wood+' · 숯 '+state.stock.charcoal+'</p><button id="carbonize" class="primary" '+(state.stock.wood<1?'disabled':'')+'>나무 1 → 숯 1</button></div></div><div class="forge-recipes">'+Object.entries(G.RECIPES).map(([key,r])=>'<article><h3>'+r.name+'</h3><p>'+G.ITEMS[r.ore].name+' '+r.oreQty+' + 숯 '+r.fuel+'</p><p class="small">보유 광석 '+state.stock[r.ore]+' / 숯 '+state.stock.charcoal+'</p><button id="smelt-'+key+'" class="primary" '+(state.stock[r.ore]<r.oreQty||state.stock.charcoal<r.fuel?'disabled':'')+'>재련하기</button></article>').join('')+'</div><p class="prep-feedback" role="status">'+message+'</p>';
 $('carbonize').onclick=()=>{const r=G.carbonize(state);render();renderForge(r.message,r.ok);};
 for(const key of Object.keys(G.RECIPES))$('smelt-'+key).onclick=()=>{const r=G.startSmelt(state,key);forgeSelection=null;renderForge(r.message);};
}
function renderSmelt(message=''){
 if(state.smelting?.stage==='timing'){renderTiming();return;}
 const f=state.smelting,r=G.RECIPES[f.recipe],roles=f.stage==='roles',tokens=roles?{oxidation:'산화',reduction:'환원'}:{carbon:'숯의 탄소 C',oxide:'광석 속 '+r.ion},slots=roles?{carbon:'C → '+(r.gas||'CO₂'),oxide:G.ITEMS[r.ore].formula+' → '+G.ITEMS[r.product].formula}:{from:'전자를 잃는 물질',to:'전자를 얻는 입자'};
 $('utility-content').innerHTML='<div class="smelting-puzzle"><div class="forge-step">'+(roles?'산화와 환원 · 한 문제':'전자의 이동 · 한 문제')+'</div><div class="forge-equation">'+r.equation+'</div><p class="small muted">전체 반응 모형</p><div class="drag-tray">'+Object.entries(tokens).map(([key,label])=>'<button id="token-'+key+'" draggable="true" data-token="'+key+'" class="drag-token '+(forgeSelection===key?'picked':'')+'">'+label+'</button>').join('')+'</div><div class="drop-grid">'+Object.entries(slots).map(([key,label])=>'<div class="drop-column"><h3>'+label+'</h3><button id="slot-'+key+'" data-slot="'+key+'" class="drop-slot">'+(tokens[f.slots[key]]||'여기에 놓기')+'</button></div>').join(roles?'':'<div class="electron-arrow">e⁻ →</div>')+'</div><p class="small muted">카드를 끌어 놓으세요 · 선택 후 칸을 눌러도 됩니다</p><p class="prep-feedback" role="status">'+message+'</p><div class="button-row"><button id="check-smelt" class="primary">재련 시작</button><button id="cancel-smelt" class="secondary">재련 취소</button></div></div>';
 function place(slot,token){const out=G.assignSmelt(state,slot,token);forgeSelection=null;renderSmelt(out.message);if(out.ok){const target=$('slot-'+slot);target?.classList.add('slot-filled');controlFeedback(target);}}
 document.querySelectorAll('[data-token]').forEach(el=>{
  el.addEventListener('dragstart',e=>{forgeSelection=el.dataset.token;e.dataTransfer.setData('text/plain',forgeSelection);e.dataTransfer.effectAllowed='move';});
  el.onclick=()=>{forgeSelection=el.dataset.token;renderSmelt();};
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;forgeSelection=el.dataset.token;el.setPointerCapture(e.pointerId);e.preventDefault();});
  el.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!forgeSelection)return;el.style.transform='translateY(-6px) scale(1.08)';});
  el.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(target&&forgeSelection)place(target.dataset.slot,forgeSelection);else renderSmelt();});
 });
 document.querySelectorAll('[data-slot]').forEach(el=>{el.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});el.addEventListener('drop',e=>{e.preventDefault();place(el.dataset.slot,e.dataTransfer.getData('text/plain'));});el.onclick=()=>{if(forgeSelection)place(el.dataset.slot,forgeSelection);};});
 $('cancel-smelt').onclick=()=>{G.cancelSmelt(state);forgeSelection=null;renderForge();};
 $('check-smelt').onclick=()=>{const out=G.checkSmelt(state);if(!out.ok)failureEffect();render();if(out.smelted){$('utility-content').innerHTML='<div class="smelt-success"><div class="pixel-furnace hot"><span class="forge-fire"></span></div><div class="oxygen-flight">O → C</div><div class="ingot '+out.product+'">'+G.ITEMS[out.product].formula+'</div><h3>'+out.message+'</h3><button id="forge-continue" class="primary">주괴 보관하기</button></div>';$('forge-continue').onclick=()=>renderForge();}else renderSmelt(out.message);};
}


let forgeStartedAt=null;
function stopForgeTiming(){forgeStartedAt=null;}
function renderTiming(){forgeStartedAt=performance.now();$('utility-content').innerHTML='<div class="timing-game"><h3>불 조절</h3><div class="pixel-furnace hot"><span class="forge-fire"></span></div><p>표식이 황금 구간에 들어오면 멈추세요</p><div class="timing-track"><div class="timing-zone"></div><div id="timing-marker" class="timing-marker"></div></div><button id="hammer-strike" class="primary">지금! · Space</button><p class="small">성공: 고순도 주괴 · 판매가 +50%<br>빗나감: 일반 주괴</p></div>';if(G.RECIPES[state.smelting.recipe].glass){$('utility-content').innerHTML=$('utility-content').innerHTML.replaceAll('주괴','유리');$('utility-content').innerHTML='<p class="glass-note">규석 2개 + 숯 1개 · 숯은 가열 연료로 사용됩니다.</p>'+$('utility-content').innerHTML;}$('hammer-strike').onclick=hammerStrike;$('hammer-strike').focus();}
function hammerStrike(){if(forgeStartedAt===null||state.smelting?.stage!=='timing')return;const progress=$('timing-marker').getAnimations()[0]?.effect?.getComputedTiming().progress;if(!Number.isFinite(progress))return;const position=progress*100;const r=G.finishSmelt(state,position);if(!r.ok||!r.high)failureEffect();stopForgeTiming();render();if(r.completed&&r.failed){$('utility-content').innerHTML='<section class="quiz-outcome"><span class="quiz-outcome-mark" aria-hidden="true">◇</span><h3>재련이 끝났습니다</h3><p>'+r.message+'</p><button id="forge-failure-continue" class="primary">재련로로 돌아가기</button></section>';$('forge-failure-continue').onclick=()=>renderForge();return;}if(!r.ok){renderForge(r.message);return;}$('utility-content').innerHTML='<div class="smelt-success '+(r.high?'perfect':'')+'"><h3>'+(r.high?'PERFECT!':'재련 완료')+'</h3><div class="ingot '+r.product+'">'+G.ITEMS[r.product].formula+'</div><h3>'+r.message+'</h3><p>'+(r.high?'대장장이가 50% 더 비싸게 구매합니다.':'일반 가격으로 납품할 수 있습니다.')+'</p><button id="forge-continue" class="primary">주괴 보관하기</button></div>';$('forge-continue').onclick=()=>renderForge();}

function gearIcon(k){const shapes={axe:'M4 2h3v20H4z M7 3h12v3h3v7h-3v3H7z',shoes:'M4 3h8v11h8v3h3v5H2v-8h2z',gatherer:'M10 8h4v15h-4z M2 2h8v4h4v4H6V6H2z M14 3h8v5h-4v5h-4z',pickaxe:'M10 5h4v18h-4z M2 3h20v5h-5V6H7v5H2z',bag:'M7 1h10v4h4v18H3V5h4z M9 3v3h6V3z'};return '<svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#c5b289" fill-rule="evenodd" d="'+shapes[k]+'"/></svg>';}
function showSummary(feedback=''){
 stopRoute();$('bench-kicker').textContent='AFTER HOURS / 장비 상점';$('bench-title').textContent='영업을 마치고, 내일을 준비해요';
 $('bench-skip').hidden=true;const balance=state.savings+state.coins-state.cost;
 $('bench-content').innerHTML=`<div class="summary"><h3>오늘 주문 ${state.orders.filter(o=>o.served).length}개 완성</h3><div class="receipt"><div><span>이전 소지금</span><b>${state.savings} C</b></div><div><span>오늘 주문 매출</span><b>+${state.coins-(state.treasureCoins||0)} C</b></div>${state.treasureCoins?`<div><span>발견한 보물</span><b>+${state.treasureCoins} C</b></div>`:''}<div><span>재료·탐사·장비 지출</span><b>−${state.cost} C</b></div><div class="total"><span>구매 가능한 소지금</span><b>${balance} C</b></div></div><p>넘긴 주문 ${state.orders.filter(o=>o.skipped).length}개 · 하루 방문 ${state.orders.length}명</p><h3>내일의 탐사 장비</h3><p class="small muted">구입 즉시 보유 · 다음 탐사부터 자동 적용 · 신발·가방 최대 10단계 · 나머지 도구 최대 3단계</p><div class="equipment-grid">${Object.entries(G.EQUIPMENT).map(([k,v])=>`<article class="equipment-card"><span class="equipment-icon" aria-hidden="true">${itemSprite(k)}</span><h4>${v.name} · ${G.gearLevel(state,k)} / ${G.gearMax(k)}</h4><p>${G.gearDescription(state,k)}</p><button id="buy-${k}" data-buy="${k}" class="primary" ${G.gearLevel(state,k)>=G.gearMax(k)||balance<G.gearPrice(state,k)?'disabled':''}>${G.gearLevel(state,k)>=G.gearMax(k)?'최대 단계':G.gearPrice(state,k)+'C · '+(G.gearLevel(state,k)?'강화':'구매')}</button></article>`).join('')}</div><p id="purchase-feedback" class="prep-feedback" role="status">${feedback||'채집량 2배 효과는 가방의 남은 칸까지만 적용됩니다.'}</p><button class="primary" id="next-day">다음 날 탐사 →</button><p class="small muted">장비와 남은 물·고체·수용액은 다음 날로 이어집니다.</p></div>`;
 document.querySelectorAll('[data-buy]').forEach(el=>el.onclick=()=>{const r=G.buyEquipment(state,el.dataset.buy);render();showSummary(r.message);});
 $('next-day').onclick=()=>{if(state.phase!=='end')return;state=G.nextDay(state);$('bench-dialog').close();document.body.classList.remove('modal-open');render();say('새 아침이에요. 숲에서 재료와 물을 채집해 주세요.');showDayTransition();canvas.focus({preventScroll:true});};
 if(!$('bench-dialog').open){document.body.classList.add('modal-open');$('bench-dialog').showModal();}
 if(state.phase==='end'&&businessClosingState!==state){businessClosingState=state;showBusinessNotice('close');}
}

function freshGame(){if(typeof cancelSanctuaryTransition==='function')cancelSanctuaryTransition();hideBusinessNotice();clearGatherDamage();stopForgeTiming();stopRoute();G.cancelSmelt(state);if(returnTimer)clearTimeout(returnTimer);returnTimer=null;const progress=state.sanctuary,day=state.day,integrity=state.integrity;state=G.newGame(1,0,12,undefined,state.treasures);state.sanctuary=progress;if(integrity)state.integrity=integrity;if(progress){if(!progress.finalPassed){progress.relics={};progress.opened=false;}progress.placedDay=0;progress.visitDay=0;progress.lastAttemptDay=progress.lastAttemptDay>=day?1:0;}state.student=studentSession?{...studentSession}:null;panel='';for(const id of ['restart-dialog','bench-dialog','utility-dialog','exhaustion-dialog'])if($(id).open)$(id).close();document.body.classList.remove('modal-open');render();say('처음 보는 시료가 있네요. 옆으로 이동해 조사하거나 시료를 클릭해 보세요.');showNameDialog();}
$('restart').onclick=()=>{stopRoute();$('restart-dialog').showModal();};$('cancel-restart').onclick=()=>$('restart-dialog').close();$('confirm-restart').onclick=freshGame;

function showExhaustion(){
 stopRoute();panel='';if($('utility-dialog').open)$('utility-dialog').close();
 const encounter=state.lastEncounter;
 $('exhaustion-title').textContent=encounter?.event||'오늘 채집 종료';
 $('exhaustion-message').textContent=encounter?'행동력이 바닥나 안전하게 돌아오지 못했습니다. 소지금 '+encounter.lost+'C를 전부 잃었습니다. 채집한 재료는 지켰습니다.':'행동력을 모두 소모해 상점으로 귀환했습니다.';
 document.body.classList.add('modal-open');if(!$('exhaustion-dialog').open)$('exhaustion-dialog').showModal();
 $('exhaustion-continue').onclick=()=>{$('exhaustion-dialog').close();document.body.classList.remove('modal-open');render();say('상점에 도착했습니다. 소지금 '+G.wallet(state)+'C');showBusinessNotice('open');};
}
$('exhaustion-dialog').addEventListener('cancel',e=>e.preventDefault());
let departingGuest=null;
function showAngryDeparture(r){
 if(!r.rejected&&!r.thanked)return false;
 const sceneState=state;departingGuest=r.departingGuest;
 $('bench-dialog').close();$('utility-dialog').close();panel='';document.body.classList.remove('modal-open');render();
 $('guest-dialogue').classList.toggle('angry-dialogue',!!r.rejected);$('shop-portrait').className=r.rejected?'reaction-angry':'reaction-happy';
 setTimeout(()=>{if(state!==sceneState||!departingGuest)return;$('shop-guest').classList.add('guest-leaving');
 setTimeout(()=>{if(state!==sceneState)return;departingGuest=null;$('shop-portrait').className='';$('shop-guest').classList.remove('guest-leaving');$('guest-dialogue').classList.remove('angry-dialogue');render();if(state.phase==='end')showSummary();},reduced?150:650);
 },2200);return true;
}
function renderShop(){
 const guest=departingGuest||(state.phase==='shop'?G.currentGuest(state):null);$('guest-dialogue').classList.toggle('special-visitor',guest?.type==='special');$('shop-guest').classList.toggle('special-visitor',guest?.type==='special');
 $('shop-guest').hidden=!guest;$('guest-dialogue').hidden=!guest;$('shop-order').hidden=!guest;$('shop-empty').hidden=!!guest;
 if(guest){$('guest-reward').textContent='보상 '+guest.reward+'C';$('guest-number').textContent=(guest.type==='special'?'✦ 특별의뢰 · ':'손님 ')+(state.orders.filter(o=>o.served||o.skipped).length+(departingGuest?0:1))+' / 3';$('guest-name').textContent=guest.name;$('guest-quote').textContent='“'+(guest.departureQuote||guest.angryQuote||(guest.type==='special'?Sanctuary.quest(state.sanctuary,guest.relicKey).greeting:G.guestQuote(guest)))+'”';setGuestPortrait(portraitSource(guest.portraitId??guest.id,guest.angryQuote?'angry':guest.departureQuote?'happy':'neutral'));$('shop-portrait').alt=guest.name;if(guest.type==='special')setGuestPortrait(sanctuaryPortrait(guest.relicKey,guest.angryQuote?'angry':guest.departureQuote?'happy':'neutral'));$('shop-guest').onclick=$('shop-order').onclick=()=>openBench(guest.id);}
 $('shop-skip').hidden=!guest;$('shop-skip').onclick=()=>{const r=G.skipGuest(state);notify(r);if(state.phase==='end')showSummary();};
 $('shop-forge').disabled=state.phase!=='shop';$('shop-prep').disabled=state.phase!=='shop';$('shop-resupply').disabled=state.gatheringEnded||state.phase!=='shop';
 for(const id of ['shop-order','shop-guest','shop-skip','shop-close-day','bag-button','restart'])$(id).disabled=!!departingGuest;if(departingGuest){$('shop-forge').disabled=true;$('shop-prep').disabled=true;$('shop-resupply').disabled=true;}
 $('gather-status').textContent=state.gatheringEnded?'오늘 채집 종료 · 내일 다시 탐사':'';
 $('shop-close-day').textContent=state.phase==='end'?'마감 내역 보기':'오늘 영업 마치기';
}
$('shop-prep').onclick=()=>openPrep();$('shop-forge').onclick=()=>openForge();
$('shop-resupply').onclick=()=>notify(G.resumeExploration(state));
$('shop-close-day').onclick=()=>{if(state.phase==='shop')notify(G.closeShop(state));if(state.phase==='end')showSummary();};


function setGuestPortrait(source){
 const img=$('shop-portrait');if(img.dataset.source===source)return;
 img.dataset.source=source;img.style.visibility='hidden';
 img.onload=()=>{if(img.dataset.source===source)img.style.visibility='visible';};
 img.src=source;if(img.complete&&img.naturalWidth)img.style.visibility='visible';
}
function portraitSource(id,mood='neutral'){if(typeof id==='string'&&id.startsWith('recovery-')){if(id==='recovery-copper')return REDRAW.smith?.[{neutral:0,angry:1,happy:2}[mood]??0]||REDRAW.portraits[8]||'';const offset=id==='recovery-silver'?0:3;return REDRAW.nobles?.[offset+({neutral:0,happy:1,angry:2}[mood]??0)]||'';}const index=state.day<=10?([0,1,2,3,4,5,6,7,6,4,8,9][id]??0):([0,8,9][id]??0);const fresh=index===8&&REDRAW.smith?REDRAW.smith[{neutral:0,angry:1,happy:2}[mood]??0]:(REDRAW['guests-'+mood]||REDRAW.portraits)[index];if(fresh)return fresh;
 if(state.day<=10&&id>0){const keys=['','liria','kael','bram','serena','rowan','isil','finley','isil','serena'];const key=keys[id]||'serena';return window.LAB_GUESTS?.[key]||('assets/guest-'+key+'.webp');}
 return (window.LAB_PORTRAITS||['assets/guest-herbalist.webp','assets/guest-blacksmith-man.webp','assets/guest-blacksmith-woman.webp'])[id]||window.LAB_PORTRAITS?.[0];
}
function showNameDialog(){hideBusinessNotice();clearGatherDamage();hideDayTransition();if(!studentSession){$('login-dialog').showModal();$('student-username').focus();return;}state.student={...studentSession};if(window.Sanctuary)Sanctuary.attach(state,studentSession);document.querySelectorAll('[data-character]').forEach(el=>{el.ariaPressed=String(el.dataset.character===(state.character||'male'));});$('workshop-name').value='';$('name-error').textContent='';$('name-dialog').showModal();$('workshop-name').focus();}
function beginNamedGame(){if(!studentSession){showNameDialog();return;}const r=G.setShopName(state,$('workshop-name').value);if(!r.ok){$('name-error').textContent=r.message;return;}$('name-dialog').close();render();showDayTransition();canvas.focus({preventScroll:true});}
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{state.character=b.dataset.character;document.querySelectorAll('[data-character]').forEach(el=>{el.ariaPressed=String(el.dataset.character===state.character);});});
$('name-start').onclick=beginNamedGame;$('name-dialog').addEventListener('cancel',e=>e.preventDefault());$('workshop-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();beginNamedGame();}});

atlas.onload=()=>{artReady=true;$('loading-art').hidden=true;draw();};atlas.onerror=()=>{$('loading-art').hidden=true;say('그림을 불러오지 못했어요. 새로고침해 주세요.',false);};atlas.src='assets/chemistry-atlas.webp';
for(const key of ['glasscraft','items','walk','walk-female','well','tree','oak-tall','oak-young','bottle','portal','furnace','fern']){const img=new Image();propImages[key]=img;img.onload=()=>{if(state.phase==='morning')draw();};img.src=window.LAB_PROPS?.[key]||('assets/prop-'+key+'.webp');document.documentElement?.style?.setProperty('--prop-'+key,'url("'+img.src+'")');}
render();showNameDialog();startRedrawnArt();

$('login-dialog').addEventListener('cancel',e=>e.preventDefault());
$('student-login-form').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('student-login-submit');if(button.disabled)return;
 button.disabled=true;button.textContent='확인 중…';$('login-error').textContent='';
 try{const student=await StudentGate.verify($('student-username').value,$('student-password').value);
 if(!student){$('login-error').textContent='아이디와 학번을 다시 확인해 주세요.';$('student-password').value='';$('student-password').focus();return;}
 if(window.SessionGuard&&!SessionGuard.isAllowed(student)&&(SessionGuard.isClosed(student)||(student.role!=='teacher'&&!SessionGuard.isOpen()))){$('login-error').textContent=SessionGuard.closedMessage();$('student-password').value='';return;}
 const restored=typeof sanctuaryRestore==='function'&&sanctuaryRestore(student);
 if(!restored&&student.role!=='teacher'&&window.Clearance?.clearSaved)await window.Clearance.clearSaved(student);
 studentSession=student;$('student-password').value='';$('login-dialog').close();if(restored){render();canvas.focus({preventScroll:true});}else showNameDialog();
 }catch(error){$('login-error').textContent='로그인을 확인하지 못했습니다. 파일을 다시 열어 주세요.';}
 finally{button.disabled=false;button.textContent='연금술 여정 시작하기 →';}
});

let clearanceBusy=false;
async function showClearance(){
 if(clearanceBusy)return;clearanceBusy=true;
 try{const preview=studentSession?.role==='teacher';const record=preview?Clearance.preview():await Clearance.issue(state,studentSession);
 $('clearance-title').textContent=preview?'클리어 화면 미리보기':'3가지 시련 완수';$('clearance-dialog').classList.add('trial-code-reveal');
 $('clearance-account').textContent='아이디 · '+studentSession.username;
 $('clearance-code').textContent=record.code;
 $('clearance-status').textContent=preview?'교사용 테스트 코드입니다. 수행평가에는 사용할 수 없습니다.':'3가지 시련을 모두 통과했습니다. 체험판 완주 기념 코드이며 수행평가에는 쓰이지 않습니다.';
 const leave=state.integrity||{};$('clearance-status').textContent+=' · 창 이탈 '+(leave.leaves||0)+'회(누적 '+Math.round((leave.awayMs||0)/1000)+'초)';$('clearance-feedback').textContent='';$('clearance-dialog').showModal();
 }catch(e){state.clearancePresented=false;say('클리어 코드를 저장하지 못했습니다. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.',false,false);}
 finally{clearanceBusy=false;}
}
$('clearance-open').onclick=showClearance;
$('clearance-close').onclick=()=>$('clearance-dialog').close();
$('clearance-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('clearance-code').textContent);$('clearance-feedback').textContent='코드를 복사했습니다.';}catch(e){$('clearance-feedback').textContent='코드를 길게 누르거나 드래그해서 복사해 주세요.';}};
