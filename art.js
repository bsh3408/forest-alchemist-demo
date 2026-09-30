// Individually drawn art sheets, sampled and cropped at runtime for the tile game.
const REDRAW={images:{},portraits:[],heroes:[],terrain:null,bounds:{}};
const WORLD_CELLS={tree:0,'oak-tall':1,'oak-young':2,well:3,house:4,portal:5,mushroom:6,herb:7,fern:8,rock:9,stump:10,koh:11};
// Runtime color-key for generated preview mattes; source sheets stay untouched.
function clearPreviewMatte(im){
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const pen=c.getContext('2d');pen.drawImage(im,0,0);const pixels=pen.getImageData(0,0,c.width,c.height);if(!pixels?.data)return null;
 const d=pixels.data,w=c.width,h=c.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 const eligible=p=>{const i=p*4,r=d[i],g=d[i+1],b=d[i+2];return d[i+3]>0&&Math.min(r,g,b)>135&&Math.max(r,g,b)-Math.min(r,g,b)<24;};
 const offer=p=>{if(!seen[p]&&eligible(p)){seen[p]=1;queue[tail++]=p;}};
 // Seed enclosed checkerboard pockets too (for example behind hair).
 for(let y=1;y<h-12;y++)for(let x=1;x<w-12;x++){const p=y*w+x;if(!eligible(p))continue;for(const step of [2,4,6,8,12]){if(eligible(p+step)&&eligible(p+step*w)&&Math.abs(d[p*4]-d[(p+step)*4])>18&&Math.abs(d[p*4]-d[(p+step*w)*4])>18){offer(p);break;}}}
 for(let x=0;x<w;x++){offer(x);offer((h-1)*w+x);}for(let y=0;y<h;y++){offer(y*w);offer(y*w+w-1);}
 while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);d[p*4+3]=0;if(x)offer(p-1);if(x<w-1)offer(p+1);if(y)offer(p-w);if(y<h-1)offer(p+w);}
 if(!tail)return null;pen.putImageData(pixels,0,0);return c.toDataURL('image/png');
}
function artCell(key,index,cols,rows,x,y,w,h=w){
 const img=REDRAW.images[key];if(!img?.complete||!img.naturalWidth)return false;
 let sx=index%cols*img.naturalWidth/cols,sy=Math.floor(index/cols)*img.naturalHeight/rows,sw=img.naturalWidth/cols,sh=img.naturalHeight/rows;
 if(key==='world'){const bands=[0,520,900,1254],r=Math.floor(index/4);sy=bands[r]/1254*img.naturalHeight;sh=(bands[r+1]-bands[r])/1254*img.naturalHeight;}
 const bound=REDRAW.bounds[key]?.[index];if(bound){sx=bound.x;sy=bound.y;sw=bound.w;sh=bound.h;const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;x+=(w-dw)/2;y+=h-dh;w=dw;h=dh;}
 worldImage(img,sx,sy,sw,sh,x,y,w,h);return true;
}
function sheetBounds(im,cols,rows,world=false){
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const pen=c.getContext('2d');pen.drawImage(im,0,0);const data=pen.getImageData(0,0,c.width,c.height)?.data;if(!data)return [];
 return Array.from({length:cols*rows},(_,i)=>{const x=Math.floor(i%cols*c.width/cols),r=Math.floor(i/cols),bands=[0,520,900,1254],y=Math.floor(world?bands[r]/1254*c.height:r*c.height/rows),right=Math.floor((i%cols+1)*c.width/cols),bottom=Math.floor(world?bands[r+1]/1254*c.height:(r+1)*c.height/rows);let l=right,t=bottom,rr=x,b=y;for(let py=y;py<bottom;py++)for(let px=x;px<right;px++)if(data[(py*c.width+px)*4+3]>160){l=Math.min(l,px);t=Math.min(t,py);rr=Math.max(rr,px);b=Math.max(b,py);}return {x:l,y:t,w:Math.max(1,rr-l+1),h:Math.max(1,b-t+1),center:(l+rr)/2-x,sole:b-y};});
}
function artProp(key,x,y,w,h){if(key in WORLD_CELLS)return artCell('world',WORLD_CELLS[key],4,3,x,y,w,h);if(key==='bottle'||key==='furnace')return artCell('utility',key==='bottle'?0:1,4,2,x,y,w,h);return false;}
function artCrop(img,index,cols,rows){const c=document.createElement('canvas');c.width=Math.floor(img.naturalWidth/cols);c.height=Math.floor(img.naturalHeight/rows);c.getContext('2d').drawImage(img,index%cols*img.naturalWidth/cols,Math.floor(index/cols)*img.naturalHeight/rows,img.naturalWidth/cols,img.naturalHeight/rows,0,0,c.width,c.height);return c.toDataURL?.('image/png')||'';}
// Portrait atlases have isolated, padded cells. Keep the whole horizontal frame
// (including disconnected hands/highlights), trimming only the empty bottom.
function portraitCrop(img,index,cols,rows){
 const cw=img.naturalWidth/cols,ch=img.naturalHeight/rows,sx=Math.floor(index%cols*cw),sy=Math.floor(index/cols)*ch;
 const c=document.createElement('canvas'),w=c.width=Math.floor(cw),h=c.height=Math.floor(ch),pen=c.getContext('2d');
 pen.drawImage(img,sx,sy,cw,ch,0,0,w,h);
 const pixels=pen.getImageData(0,0,w,h);if(!pixels?.data)return artCrop(img,index,cols,rows);
 const d=pixels.data;let bottom=0;
 for(let y=h-1;y>=0&&!bottom;y--)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>20){bottom=y+1;break;}
 if(!bottom)return artCrop(img,index,cols,rows);
 const out=document.createElement('canvas');out.width=w;out.height=bottom;out.getContext('2d').drawImage(c,0,0,w,bottom,0,0,w,bottom);return out.toDataURL('image/png');
}
function inspectionArt(n){
 REDRAW.inspection??={};if(REDRAW.inspection[n.item])return REDRAW.inspection[n.item];
 const forest=n.area==='forest',key=forest?'world':n.item==='copperSulfate'?'utility':'items',im=REDRAW.images[key];if(!im?.complete)return '';
 if(!forest)return REDRAW.inspection[n.item]=artCrop(im,n.item==='copperSulfate'?2:itemCells[n.item],key==='utility'?4:5,key==='utility'?2:4);
 const b=REDRAW.bounds.world?.[n.item==='acid'?7:n.item==='koh'?11:6];if(!b)return '';const c=document.createElement('canvas');c.width=c.height=128;const scale=Math.min(112/b.w,112/b.h);c.getContext('2d').drawImage(im,b.x,b.y,b.w,b.h,(128-b.w*scale)/2,(128-b.h*scale)/2,b.w*scale,b.h*scale);return REDRAW.inspection[n.item]=c.toDataURL('image/png');
}
function packItemSheet(im){
 const source=document.createElement('canvas');source.width=im.naturalWidth;source.height=im.naturalHeight;const pen=source.getContext('2d');pen.drawImage(im,0,0);const data=pen.getImageData(0,0,source.width,source.height)?.data;if(!data)return null;
 const out=document.createElement('canvas');out.width=640;out.height=512;const dest=out.getContext('2d'),bands=[0,360,600,840,1122];
 for(let i=0;i<20;i++){const col=i%5,row=Math.floor(i/5),x=Math.floor(col*source.width/5),right=Math.floor((col+1)*source.width/5),y=Math.floor(bands[row]/1122*source.height),bottom=Math.floor(bands[row+1]/1122*source.height);let l=right,t=bottom,r=x,b=y;for(let py=y;py<bottom;py++)for(let px=x;px<right;px++)if(data[(py*source.width+px)*4+3]>160){l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,py);b=Math.max(b,py);}const w=r-l+1,h=b-t+1;if(w<1||h<1)continue;const scale=Math.min(106/w,106/h);dest.drawImage(im,l,t,w,h,col*128+(128-w*scale)/2,row*128+(128-h*scale)/2,w*scale,h*scale);}
 return out.toDataURL('image/png');
}
function terrainColor(index,x,y){const a=REDRAW.terrain;if(!a)return null;const mirror=v=>{v=((Math.floor(v)%288)+288)%288;return v<144?v:287-v;};const p=(mirror(y)*144+mirror(x))*4,d=a[index];return 'rgb('+d[p]+','+d[p+1]+','+d[p+2]+')';}
let mineGroundCache=null;
function drawMineArt(map){
 if(!REDRAW.terrain)return;
 if(mineGroundCache?.map===map&&mineGroundCache.width===canvas.width&&mineGroundCache.terrain===REDRAW.terrain){ctx.putImageData(mineGroundCache.data,0,0);return;}
 const index=Number(state.region.slice(-1)),ox=index%3*G.W,oy=Math.floor(index/3)*G.H,floor=new Set(map.floor);
 const land=(x,y)=>{const gx=ox+x,gy=oy+y;if(gx<0||gy<0||gx>=45||gy>=30)return false;return state.maps['mine'+(Math.floor(gy/G.H)*3+Math.floor(gx/G.W))].floor.includes((gx%G.W)+','+(gy%G.H));};
 for(let y=0;y<480;y+=2)for(let x=0;x<720;x+=2){ctx.fillStyle=terrainColor(floor.has(Math.floor(x/48)+','+Math.floor(y/48))?4:5,ox*48+x,oy*48+y);ctx.fillRect(x,y,2,2);}
 ctx.save();
 for(let y=0;y<G.H;y++)for(let x=0;x<G.W;x++){
  const px=x*48,py=y*48;
  if(floor.has(x+','+y)){
   // Shaded rock faces hug the walkable floor instead of expanding the corridor.
   for(const [dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]])if(!land(x+dx,y+dy))for(let n=0;n<5;n++){
    ctx.globalAlpha=(5-n)*(dy===-1?.055:.03);ctx.fillStyle='#080d14';
    if(dy)ctx.fillRect(px,dy<0?py+n*3:py+46-n*2,48,dy<0?3:2);else ctx.fillRect(dx<0?px+n*2:px+46-n*2,py,2,48);
   }
  }
 }
 ctx.restore();const data=ctx.getImageData(0,0,canvas.width,canvas.height);mineGroundCache={map,width:canvas.width,terrain:REDRAW.terrain,data};
}
function startRedrawnArt(){
 const ready=new Set();
 for(const key of ['world','terrain','items','effects','walk','walk-female','heroes','guests','guests-angry','guests-happy','smith-reactions','noble-guests','shop','utility']){
  const im=new Image();REDRAW.images[key]=im;
  // These atlases already have genuine alpha and safe cell gutters. Never
  // color-key their pale sleeves/hair or reconstruct their connected parts.
  let keyed=['guests','guests-angry','guests-happy','smith-reactions','noble-guests','heroes'].includes(key),packed=false;
  im.onload=()=>{
   if(key==='noble-guests'&&!keyed){keyed=true;const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const pen=c.getContext('2d');pen.drawImage(im,0,0);const p=pen.getImageData(0,0,c.width,c.height);if(p?.data){for(let i=0;i<p.data.length;i+=4){const d=p.data;if(d[i]>130&&d[i+2]>130&&d[i+1]<Math.min(d[i],d[i+2])*.65)d[i+3]=0;}pen.putImageData(p,0,0);im.src=c.toDataURL('image/png');return;}}
   if(!keyed&&!['terrain','shop','utility','heroes'].includes(key)){keyed=true;const clean=clearPreviewMatte(im);if(clean){im.src=clean;return;}}
   if(key==='items'&&!packed){packed=true;const aligned=packItemSheet(im);if(aligned){im.src=aligned;return;}}
   if(key==='world')REDRAW.bounds.world=sheetBounds(im,4,3,true);
   if(key==='walk'||key==='walk-female')REDRAW.bounds[key]=sheetBounds(im,4,4);
   if(key==='terrain'&&document.createElement){const c=document.createElement('canvas');c.width=c.height=144;const pen=c.getContext('2d');REDRAW.terrain=Array.from({length:8},(_,i)=>{pen.clearRect(0,0,144,144);pen.drawImage(im,i%4*im.naturalWidth/4,Math.floor(i/4)*im.naturalHeight/2,im.naturalWidth/4,im.naturalHeight/2,0,0,144,144);return pen.getImageData(0,0,144,144).data;});if(!REDRAW.terrain[0])REDRAW.terrain=null;forestGroundCache=null;}
   if(key==='items'){propImages.items=im;document.documentElement?.style?.setProperty('--prop-items','url("'+im.src+'")');}
   if(key==='noble-guests'){REDRAW.nobles=Array.from({length:6},(_,i)=>portraitCrop(im,i,3,2));}
   if(key==='smith-reactions'){REDRAW.smith=Array.from({length:3},(_,i)=>portraitCrop(im,i,3,1));}
   if(key==='guests-angry'||key==='guests-happy'){REDRAW[key]=Array.from({length:10},(_,i)=>portraitCrop(im,i,5,2));}
   if(key==='guests'){REDRAW.portraits=Array.from({length:10},(_,i)=>portraitCrop(im,i,5,2));}
   if(key==='heroes'){REDRAW.heroes=[portraitCrop(im,0,2,1),portraitCrop(im,1,2,1)];['male','female'].forEach((k,i)=>{const target=$('character-'+k)?.querySelector?.('img');if(target&&REDRAW.heroes[i])target.src=REDRAW.heroes[i];});}
   if(key==='shop')document.querySelectorAll('.shop-background,.counter-mask').forEach(el=>el.src=im.src);
   if(key==='utility'){for(const [name,i] of [['bottle',0],['furnace',1]]){const url=artCrop(im,i,4,2);if(url)document.documentElement?.style?.setProperty('--prop-'+name,'url("'+url+'")');}document.documentElement?.style?.setProperty('--redraw-utility','url("'+im.src+'")');}
   if(key==='effects')document.documentElement?.style?.setProperty('--redraw-effects','url("'+im.src+'")');
   ready.add(key);if(ready.size===14){if(state.phase==='morning')draw();else renderShop();}
  };
  im.src=window.LAB_ART?.[key]||(key==='noble-guests'?'assets/redraw-noble-guests.webp?v=shoulders2':('assets/redraw-'+(key==='guests'?'guests-b':key)+'.webp'));
 }
}
