(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Lab=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const W=15,H=10,MINE_LIGHT_RADIUS=3;
const fieldVisible=(s,x,y)=>s.area!=='mine'||Math.hypot(x-s.player.x,y-s.player.y)<=MINE_LIGHT_RADIUS;
const ITEMS={
 silverMetal:{name:"은",formula:"Ag",sprite:4,color:"#d4dee2",form:"s"},
 goldMetal:{name:"금",formula:"Au",sprite:4,color:"#ddba52",form:"s"},
 stone:{name:'규석',formula:'SiO₂',sprite:5,form:'s',color:'#c4c4ad'},
 glass:{name:'유리',formula:'유리',sprite:14,form:'s',color:'#b9d9db'},
 koh:{name:'수산화칼륨',formula:'KOH',sprite:6,color:'#bdb2cf',ionic:true,equation:'KOH(s) → K⁺(aq) + OH⁻(aq)'},
 water:{name:'물',formula:'H₂O',sprite:14,color:'#82dbff',form:'l'},
 acid:{name:'염화수소',formula:'HCl',sprite:7,color:'#f39fab',form:'g',requiresSolution:true},
 base:{name:'수산화나트륨',formula:'NaOH',sprite:6,color:'#8fdec4',ionic:true,equation:'NaOH(s) → Na⁺(aq) + OH⁻(aq)'},
 wood:{name:'나무',formula:'나무',sprite:2,color:'#cba178',form:'s'},
 charcoal:{name:'숯',formula:'C',sprite:3,color:'#747985',form:'s'},
 copperOre:{name:'산화 구리 광석',formula:'CuO',sprite:4,color:'#d6a27a',form:'s',oxide:true},
 ironOre:{name:'산화 철 광석',formula:'Fe₂O₃',sprite:5,color:'#ca8669',form:'s',oxide:true},
 copperMetal:{name:'구리 주괴',formula:'Cu',sprite:4,color:'#e9a268',form:'s'},
 ironMetal:{name:'철 주괴',formula:'Fe',sprite:5,color:'#b9c9d8',form:'s'}
};
const GATE_REGION='forest1',EXIT_REGION='mine0',WELLS={forest0:{x:4,y:3},forest7:{x:10,y:6}};
const HOME={x:3,y:7},MINE_GATE={x:13,y:2},MINE_EXIT={x:2,y:8},WATER_BENCH={x:4,y:3};
const DECOR={forest:[[1,2],[4,1],[7,1],[1,5],[4,5],[7,8],[8,1],[11,1],[14,5],[11,8],[1,8],[10,4],[10,6]],mine:[[4,1],[7,1],[13,1],[2,3],[7,4],[12,4],[3,6],[10,8]]};
const EQUIPMENT={axe:{name:'벌목 도끼',price:25,description:'숲의 나무 채집 해금'},shoes:{name:'탐사 신발',price:60,description:'최대 행동력 +20 (80 → 100)'},gatherer:{name:'숲 채집기',price:70,description:'숲 오답 −15 → −8 · 25% 확률로 채집량 2배'},pickaxe:{name:'광산 곡괭이',price:70,description:'광산 오답 −15 → −8 · 25% 확률로 채집량 2배'},bag:{name:'확장 가방',price:80,description:'인벤토리 12 → 18칸'}};
const gearLevel=(s,k)=>Number(s.equipment?.[k]||0);
const gearMax=k=>['shoes','bag'].includes(k)?10:3;
const gearPrice=(s,k)=>EQUIPMENT[k].price*(gearLevel(s,k)+1);
const gearDescription=(s,k)=>{const l=Math.min(gearMax(k),gearLevel(s,k)+1);return k==='shoes'?'최대 행동력 '+(80+20*l):k==='bag'?'가방 '+(12+6*l)+'칸':k==='axe'?'나무 채집 · 추가 수확 '+(l*25)+'%': '오답 행동력 −'+[15,8,5,3][l]+' · 추가 수확 '+(l*25)+'%';};
const maxEnergy=s=>80+20*gearLevel(s,'shoes');
const wrongCost=s=>s.phase==='morning'?[15,8,5,3][gearLevel(s,s.area==='forest'?'gatherer':'pickaxe')]:15;
const empty=()=>Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0]));
function newGame(day=1,savings=0,capacity=12,seed=Math.floor(Math.random()*2147483647),previousTreasures=[]){const s={
 day,savings,capacity,shopName:'',region:'forest0',premium:{glass:0,copperMetal:0,ironMetal:0},equipment:{axe:false,shoes:false,gatherer:false,pickaxe:false,bag:capacity>=18},phase:'morning',area:'forest',supplemental:false,gatheringEnded:false,player:{x:3,y:8},energy:80,steps:0,bag:empty(),aqueous:empty(),
 stock:{...empty(),acid:1,base:1},coins:0,cost:0,mistakes:0,bench:null,smelting:null,inspection:null,harvested:0,
 nodes:[
  {id:'flowers',area:'forest',x:2,y:3,item:'acid',qty:2,sprite:7,question:'시료의 추출액에 푸른 리트머스 종이를 넣었더니 붉게 변했습니다. 이 추출액의 성질은?',choices:['산성','중성','염기성'],correct:0,hint:'산성 용액은 푸른 리트머스 종이를 붉게 변화시켜요.'},
  {id:'mushroom',area:'forest',x:5,y:2,item:'base',qty:3,sprite:6,question:'시료의 용액에서 OH⁻가 H⁺보다 많다는 관찰 결과를 얻었습니다. 용액의 성질은?',choices:['산성','염기성','중성'],correct:1,hint:'OH⁻가 상대적으로 많은 수용액은 염기성을 나타내요.'},
  {id:'mushroom2',area:'forest',x:6,y:6,item:'base',qty:2,sprite:6,question:'산성 용액의 H⁺와 반응하여 물을 만드는 이온은?',choices:['Na⁺','Cl⁻','OH⁻'],correct:2,hint:'H⁺와 OH⁻가 1 : 1로 반응해 물을 만듭니다.'},
  {id:'spring',area:'forest',x:8,y:7,item:'water',qty:3,sprite:14,question:'고체 이온 결합 물질을 수용액으로 만들 때, 물의 역할은?',choices:['용매','금속','전자'],correct:0,hint:'다른 물질을 녹이는 물질을 용매라고 해요.'},
  {id:'spring2',area:'forest',x:12,y:6,item:'water',qty:3,sprite:14,question:'물에 녹아 자유롭게 움직이는 이온이 생기면, 용액에 나타날 수 있는 성질은?',choices:['전류가 흐른다','이온이 모두 없어진다','반드시 중성이 된다'],correct:0,hint:'수용액 속 이온이 이동하며 전하를 운반할 수 있어요.'},
  {id:'tree',area:'forest',x:4,y:6,item:'wood',qty:3,sprite:2,question:'나무로 만든 숯에 풍부하게 들어 있는 원소는?',choices:['탄소','구리','철'],correct:0,hint:'숯은 탄소가 풍부한 재료예요.'},
  {id:'tree2',area:'forest',x:9,y:3,item:'wood',qty:3,sprite:2,question:'숯의 탄소가 산소와 결합하는 변화는?',choices:['산화','환원','중화'],correct:0,hint:'산소와 결합하는 변화는 산화예요.'},
  {id:'copper-ore',area:'mine',x:5,y:2,item:'copperOre',qty:2,sprite:4,question:'이 광석에는 구리와 산소가 결합해 있습니다. 이 물질은?',choices:['구리 금속','산화 구리','순수한 탄소'],correct:1,hint:'구리가 산소와 결합한 물질은 산화 구리예요.'},
  {id:'iron-ore',area:'mine',x:10,y:2,item:'ironOre',qty:2,sprite:5,question:'산화 철에서 산소를 제거해 철을 얻는 변화는?',choices:['산화','환원','중화'],correct:1,hint:'산소를 잃는 변화는 환원이에요.'},
  {id:'copper-ore2',area:'mine',x:11,y:6,item:'copperOre',qty:2,sprite:4,question:'산화 구리 속 구리 이온이 전자를 얻어 구리가 됩니다. 구리 이온의 변화는?',choices:['산화','환원','증발'],correct:1,hint:'전자를 얻는 변화는 환원이에요.'},
  {id:'iron-ore2',area:'mine',x:6,y:6,item:'ironOre',qty:2,sprite:5,question:'금속 산화물에서 산소를 떼어 내는 재료는 그 산소와 결합합니다. 이 재료의 변화는?',choices:['환원','산화','중화'],correct:1,hint:'산소를 얻는 재료는 산화돼요.'}
 ],orders:[
  {id:0,name:'약초사 엘로웬',portrait:10,title:'딱 중성으로',quote:'제가 가진 이 용액을 딱 중성으로 맞춰 주세요.',type:'acid',needs:{base:3},reward:45,served:false,x:10,y:3},
  {id:1,name:'대장장이 토린',portrait:11,title:'구리 주괴 주문',quote:'장식 손잡이를 만들 구리 주괴 두 개가 필요해요.',type:'metal',needs:{copperMetal:2},reward:65,served:false,x:10,y:3},
  {id:2,name:'대장장이 아스트리드',portrait:10,title:'철 주괴 주문',quote:'새 도구에 쓸 철 주괴 네 개를 부탁해요.',type:'metal',needs:{ironMetal:4},reward:85,served:false,x:10,y:3}
 ]};if(day<=10)s.orders=earlyOrders(day);if(day>=14){const kind=day>=18&&(day===18||day%2===0)?'gold':'silver';s.orders[2]=recoveryOrder(kind,2);}
 if(day>10){for(let i=s.orders.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s.orders[i],s.orders[j]]=[s.orders[j],s.orders[i]];}}s.orders.forEach(o=>o.quote=guestQuote(o));generateWorld(s,seed,previousTreasures);return s;}
const near=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<=1;
const result=(ok,message)=>({ok,message});
const activeNodes=s=>s.phase==='morning'?s.nodes.filter(n=>n.region===s.region):[];
const activeTreasures=s=>s.phase==='morning'&&s.area==='mine'?(s.treasures||[]).filter(t=>t.region===s.region&&t.revealed):[];
const currentGuest=s=>s.orders.find(o=>!o.served&&!o.skipped);
function blocked(s,x,y){if(x<0||y<0||x>=W||y>=H)return true;if(s.phase!=='morning')return true;const map=s.maps[s.region];if(!map.floor.includes(x+','+y))return true;const portals=s.area==='forest'?[...(s.region===GATE_REGION?[MINE_GATE]:[]),...(s.region==='forest0'?[HOME]:[])]:(s.region===EXIT_REGION?[MINE_EXIT]:[]);return activeTreasures(s).some(t=>!t.opened&&t.x===x&&t.y===y)||map.decor.some(p=>p[0]===x&&p[1]===y)||portals.some(p=>p.x===x&&p.y===y)||activeNodes(s).some(n=>n.x===x&&n.y===y&&!n.used);}
const bagCount=s=>Object.values(s.bag).reduce((a,b)=>a+b,0);
const WRONG_COST=15;
const wallet=s=>Math.max(0,s.savings+s.coins-s.cost);
function exhaustion(s){
 if(s.phase!=='morning'||s.energy>0)return null;
 const lost=wallet(s),event=Math.random()<.5?'귀환 중에 산적을 만났다!':'몬스터의 습격을 당했다!';
 s.cost+=lost;s.lastEncounter={event,lost,day:s.day};s.energy=0;s.gatheringEnded=true;returnHome(s,true);
 return {ok:true,exhausted:true,message:event+' 소지금 '+lost+'C를 전부 잃고 상점으로 귀환했습니다.'};
}
function useReturnScroll(s){
 if(s.phase!=='morning'||s.inspection)return result(false,'탐사 중에 사용할 수 있습니다.');
 if(s.energy<=0)return exhaustion(s);
 if(wallet(s)<20)return result(false,'귀환서 사용에는 20C가 필요합니다.');
 s.cost+=20;s.gatheringEnded=true;const r=returnHome(s,true);
 return {...r,message:'귀환서 사용 · 20C를 지불하고 안전하게 귀환했습니다.'};
}
function wrong(s,message){
 const penalty=wrongCost(s);s.mistakes++;s.energy=Math.max(0,s.energy-penalty);
 const ended=exhaustion(s);return ended||result(false,message+' · 행동력 −'+penalty);
}
function move(s,dx,dy){
 if(s.bench||s.inspection||s.phase!=='morning'||Math.abs(dx)+Math.abs(dy)!==1)return result(false,'');
 const x=s.player.x+dx,y=s.player.y+dy;
 // Doorways stay blocked to pathfinding so routes cannot pass through another map.
 // A deliberate step onto the entrance uses the same transition as clicking it.
 if(s.area==='forest'&&s.region===GATE_REGION&&x===MINE_GATE.x&&y===MINE_GATE.y)return changeArea(s,'mine');
 if(s.area==='mine'&&s.region===EXIT_REGION&&x===MINE_EXIT.x&&y===MINE_EXIT.y)return changeArea(s,'forest');
 if(!blocked(s,x,y)){if(x===0||x===W-1)return travelRegion(s,x===0?-1:1,0);if(y===0||y===9)return travelRegion(s,0,y===0?-1:1);}
 if(blocked(s,x,y))return {ok:false,collision:true,message:''};
 if(s.phase==='morning'&&s.energy<=0)return result(false,'행동력을 모두 썼어요. 긴급 귀환을 이용하세요.');
 s.player={x,y};if(s.phase==='morning'){s.energy--;s.steps++;}return exhaustion(s)||result(true,'');
}
function changeArea(s,destination){
 if(s.phase!=='morning'||s.bench||s.inspection)return result(false,'지금은 이동할 수 없어요.');
 const entering=s.area==='forest'&&destination==='mine',leaving=s.area==='mine'&&destination==='forest';
 if(!entering&&!leaving)return result(false,'');
 if(s.region!==(entering?GATE_REGION:EXIT_REGION)||!near(s.player,entering?MINE_GATE:MINE_EXIT))return result(false,'입구 옆으로 이동해 주세요.');
 if(s.energy<1)return result(false,'행동력이 없어요. 긴급 귀환을 이용하세요.');
 s.area=destination;s.region=entering?EXIT_REGION:GATE_REGION;s.player=entering?{x:2,y:7}:{x:13,y:3};s.energy--;s.steps++;
 return exhaustion(s)||{ok:true,regionChanged:true,message:entering?'새벽 광산에 들어왔어요. 시료를 조사해 정체를 확인하세요.':'안개 계곡으로 돌아왔어요. 연금술 상점 입구에서 오후 영업을 시작할 수 있습니다.'};
}
const REAGENT_QUESTIONS=[["푸른 리트머스 종이를 붉게 바꾸는 용액의 성질은?","산성","중성","염기성"],["붉은 리트머스 종이를 푸르게 바꾸는 용액의 성질은?","염기성","산성","중성"],["BTB 지시약을 넣었더니 노란색이 되었습니다. 이 용액의 성질은?","산성","중성","염기성"],["BTB 지시약을 넣었더니 파란색이 되었습니다. 이 용액의 성질은?","염기성","산성","중성"],["중성 수용액에 BTB 용액을 넣었을 때 나타나는 색은?","초록색","노란색","파란색"],["산성 수용액의 공통적인 성질과 관련된 이온은?","H⁺","Na⁺","Cl⁻"],["염기성 수용액의 공통적인 성질과 관련된 이온은?","OH⁻","Na⁺","Cl⁻"],["수용액에서 H⁺와 반응하여 물을 만드는 이온은?","OH⁻","Cl⁻","Na⁺"],["H⁺와 OH⁻가 물을 만들 때 반응하는 입자 수의 비는?","1 : 1","1 : 2","2 : 1"],["염산과 수산화나트륨 수용액의 중화에서 직접 물을 만드는 이온 쌍은?","H⁺와 OH⁻","Na⁺와 Cl⁻","H⁺와 Na⁺"],["염산과 수산화나트륨 수용액을 섞을 때 Na⁺와 Cl⁻는 어떻게 되나요?","수용액에 이온으로 남는다","모두 물로 바뀐다","모두 기체로 사라진다"],["염산과 수산화나트륨 수용액이 반응하여 물을 만드는 반응은?","중화 반응","증발","융해"],["순수한 물에 소금을 녹여 소금물을 만들 때 물의 역할은?","용매","용질","침전물"],["순수한 물에 소금을 녹여 소금물을 만들 때 소금의 역할은?","용질","용매","지시약"],["이온이 들어 있는 수용액에 전류가 흐를 때 전하를 운반하는 입자는?","이동하는 이온","물 위의 기름방울","가라앉은 나무 조각"],["고체 염화나트륨과 달리 염화나트륨 수용액에 전류가 흐르는 까닭은?","이온이 자유롭게 이동하기 때문","이온의 전하가 없어지기 때문","물 전체가 금속이 되기 때문"],["NaOH가 물에 녹을 때 생기는 주요 이온 쌍은?","Na⁺와 OH⁻","Na⁻와 H⁺","Na⁺와 Cl⁻"],["KOH가 물에 녹을 때 생기는 주요 이온 쌍은?","K⁺와 OH⁻","K⁻와 H⁺","K⁺와 Cl⁻"],["염화수소(HCl)가 물에 녹을 때 생성되는 이온은?","H⁺와 Cl⁻","Na⁺와 OH⁻","K⁺와 OH⁻"],["NaOH와 KOH 수용액이 공통으로 염기성을 나타내는 까닭은?","OH⁻가 있기 때문","같은 금속 이온이 있기 때문","Cl⁻가 있기 때문"],["같은 온도에서 H⁺의 수가 OH⁻의 수보다 많은 수용액의 성질은?","산성","중성","염기성"],["같은 온도에서 OH⁻의 수가 H⁺의 수보다 많은 수용액의 성질은?","염기성","산성","중성"],["H⁺와 OH⁻의 농도가 같은 수용액의 성질은?","중성","산성","염기성"],["묽은 염산과 묽은 수산화나트륨 수용액이 중화 반응을 할 때 열의 출입으로 옳은 것은?","주변으로 방출된다","반드시 주변에서 흡수된다","열의 출입이 전혀 없다"],["중화 반응에서 온도 상승량을 비교할 때 생성된 물 분자 수 외에 고려해야 할 조건은?","전체 용액의 양과 열손실 등","시약병 마개의 색만","손님의 이름만"],["산성 수용액과 염기성 수용액을 같은 부피로 혼합하였다. 혼합 용액이 항상 중성인지에 대한 설명으로 옳은 것은?","아니다. H⁺와 OH⁻의 수도 비교해야 한다","항상 도달한다","두 용액은 절대 반응하지 않는다"],["중성인 염화나트륨 수용액에 존재하는 이온으로 옳은 것은?","Na⁺와 Cl⁻가 있다","중성이므로 이온이 전혀 없다","전자만 있다"],["미확인 용액의 산성·염기성을 알아보는 적절한 방법은?","지시약의 색 변화를 관찰한다","직접 맛을 본다","맨손으로 만져 본다"],["H⁺의 수가 3N인 산성 수용액과 OH⁻의 수가 3N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","H⁺와 OH⁻가 모두 남지 않는다","H⁺ 3N","OH⁻ 3N"],["H⁺의 수가 4N인 산성 수용액과 OH⁻의 수가 2N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","H⁺ 2N","OH⁻ 2N","H⁺와 OH⁻가 모두 남지 않는다"],["H⁺의 수가 2N인 산성 수용액과 OH⁻의 수가 5N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","OH⁻ 3N","H⁺ 3N","H⁺와 OH⁻가 모두 남지 않는다"],["H⁺의 수가 6N인 산성 수용액과 OH⁻의 수가 4N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","H⁺ 2N","OH⁻ 2N","H⁺와 OH⁻가 모두 남지 않는다"],["H⁺의 수가 5N인 산성 수용액과 OH⁻의 수가 8N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","OH⁻ 3N","H⁺ 3N","H⁺와 OH⁻가 모두 남지 않는다"],["H⁺의 수가 7N인 산성 수용액과 OH⁻의 수가 7N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","H⁺와 OH⁻가 모두 남지 않는다","H⁺ 7N","OH⁻ 7N"],["H⁺의 수가 8N인 산성 수용액과 OH⁻의 수가 3N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","H⁺ 5N","OH⁻ 5N","H⁺와 OH⁻가 모두 남지 않는다"],["H⁺의 수가 4N인 산성 수용액과 OH⁻의 수가 7N인 염기성 수용액을 혼합하였다. 반응 후 남는 H⁺ 또는 OH⁻의 종류와 수로 옳은 것은? (단, N은 입자 수를 나타내는 기준값이며, 물의 자동 이온화는 무시한다.)","OH⁻ 3N","H⁺ 3N","H⁺와 OH⁻가 모두 남지 않는다"],["각 실험에서 사용하는 HCl 수용액과 NaOH 수용액의 농도는 각각 일정하다. 염산 2 mL를 중화하는 데 NaOH 수용액 1 mL가 필요하다. 염산 4 mL를 중화하는 데 필요한 NaOH 수용액의 부피는?","2 mL","3 mL","5 mL"],["각 실험에서 사용하는 HCl 수용액과 NaOH 수용액의 농도는 각각 일정하다. 염산 3 mL를 중화하는 데 NaOH 수용액 2 mL가 필요하다. 염산 6 mL를 중화하는 데 필요한 NaOH 수용액의 부피는?","4 mL","5 mL","7 mL"],["각 실험에서 사용하는 HCl 수용액과 NaOH 수용액의 농도는 각각 일정하다. 염산 4 mL를 중화하는 데 NaOH 수용액 6 mL가 필요하다. 염산 2 mL를 중화하는 데 필요한 NaOH 수용액의 부피는?","3 mL","4 mL","6 mL"],["각 실험에서 사용하는 HCl 수용액과 NaOH 수용액의 농도는 각각 일정하다. 염산 5 mL를 중화하는 데 NaOH 수용액 2 mL가 필요하다. 염산 10 mL를 중화하는 데 필요한 NaOH 수용액의 부피는?","4 mL","5 mL","7 mL"]];
const MINE_QUESTIONS=[["어떤 입자가 전자를 잃는 변화는?", "산화", "환원", "응고"], ["어떤 입자가 전자를 얻는 변화는?", "환원", "산화", "융해"], ["금속이 산소와 결합하여 금속 산화물이 되는 변화는?", "산화", "환원", "중화"], ["금속 산화물에서 산소가 제거되어 금속이 되는 변화는?", "환원", "산화", "용해"], ["Cu²⁺ + 2e⁻ → Cu에서 구리 이온의 변화는?", "환원", "산화", "중화"], ["구리 이온 Cu²⁺ 한 개가 구리 원자 Cu가 되려면?", "전자 2개를 얻는다", "전자 2개를 잃는다", "양성자 2개를 얻는다"], ["산화·환원 반응에서 잃은 전자 수와 얻은 전자 수는?", "같다", "항상 잃은 수가 더 많다", "서로 관계없다"], ["2CuO + C → 2Cu + CO₂에서 산소와 결합하는 탄소의 변화는?", "산화", "환원", "중화"], ["2CuO + C → 2Cu + CO₂에서 산화 구리 속 구리의 변화는?", "환원", "산화", "증발"], ["산화 구리 CuO와 금속 구리 Cu는 같은 물질인가요?", "아니다. CuO에는 산소도 결합해 있다", "같다. 색만 다르다", "같다. 이름만 다르다"]];
function chooseReagentQuestion(s,n){
 const mining=n.area==='mine';if(!mining&&!['acid','base','koh'].includes(n.item))return;
 const bank=mining?MINE_QUESTIONS:REAGENT_QUESTIONS,qkey=mining?'mineQuestionQueue':'questionQueue',lastkey=mining?'lastMineQuestion':'lastQuestion';
 if(!s[qkey]?.length){s[qkey]=bank.map((_,i)=>i);for(let i=s[qkey].length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[qkey][i],s[qkey][j]]=[s[qkey][j],s[qkey][i]];}if(s[qkey][0]===s[lastkey])[s[qkey][0],s[qkey][1]]=[s[qkey][1],s[qkey][0]];}
 const id=s[qkey].shift(),[question,answer,...others]=bank[id],choices=[answer,...others];s[lastkey]=id;
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 Object.assign(n,{question,choices,correct:choices.indexOf(answer),hint:'다시 관찰해 보세요.'});
}
function inspect(s,id){
 const n=activeNodes(s).find(n=>n.id===id&&!n.used);
 if(!n||!near(s.player,n))return result(false,'시료 옆 칸에서 조사해 주세요.');
 if(n.area==='mine'&&!s.equipment.pickaxe)return result(false,'광물을 캐려면 곡괭이가 필요합니다.');
 if(n.item==='wood'&&!s.equipment.axe)return result(false,'나무를 베려면 도끼가 필요합니다. 영업 후 장비 상점에서 구입하세요.');
 if(s.energy<2)return result(false,'채집에는 행동력 2가 필요해요. 귀환서를 사용하거나 상점으로 돌아가세요.');
 chooseReagentQuestion(s,n);s.inspection=id;return result(true,'관찰 결과를 검증하면 시료를 채집할 수 있어요.');
}
function harvest(s,id,rng=Math.random){
 const n=activeNodes(s).find(n=>n.id===id&&!n.used);
 if(!n||!near(s.player,n)||!n.verified)return result(false,'먼저 시료의 관찰 결과를 검증해 주세요.');
 if(n.area==='mine'&&!s.equipment.pickaxe)return result(false,'광물을 캐려면 곡괭이가 필요합니다.');
 if(n.item==='wood'&&!s.equipment.axe)return result(false,'도끼가 필요합니다.');
 if(s.energy<2)return result(false,'행동력이 부족해요.');
 if(bagCount(s)+n.qty>s.capacity)return result(false,'가방이 가득 찼어요. 연금술 상점으로 돌아가 주세요.');
 const bonus=rng()<.25*gearLevel(s,n.item==='wood'?'axe':s.area==='forest'?'gatherer':'pickaxe');
 const qty=Math.min(n.qty*(bonus?2:1),s.capacity-bagCount(s));
 s.bag[n.item]+=qty;n.used=true;s.energy-=2;s.harvested++;s.inspection=null;
 return exhaustion(s)||{ok:true,qty,bonus:qty>n.qty,message:`검증 성공! ${ITEMS[n.item].name} · ${ITEMS[n.item].formula} × ${qty} 채집${qty>n.qty?' · 장비 추가 채집!':''}`};
}
function answerInspection(s,answer,rng=Math.random){
 const n=activeNodes(s).find(n=>n.id===s.inspection&&!n.used);
 if(!n||!near(s.player,n))return result(false,'');
 if(!Number.isInteger(answer)||answer<0||answer>=n.choices.length)return result(false,'답을 골라 주세요.');
 if(answer!==n.correct){const before=s.energy,hitPosition={...s.player,region:s.region};n.verified=false;s.inspection=null;const out=wrong(s,'채집에 실패했습니다.');return {...out,attempted:true,harvestFailed:true,energyLost:before-s.energy,hitPosition};}
 n.verified=true;const out=harvest(s,n.id,rng);s.inspection=null;return {...out,attempted:true};
}
function cancelInspection(s){s.inspection=null;}
function returnHome(s,forced=false){
 if(s.phase!=='morning')return result(false,'이미 연금술 상점에 도착했어요.');
 if(!forced&&(s.region!=='forest0'||!near(s.player,HOME)))return result(false,'숲의 연금술 상점 입구로 이동해 주세요.');
 for(const k in s.bag){s.stock[k]+=s.bag[k];s.bag[k]=0;}
 s.phase='shop';s.area='workshop';s.inspection=null;s.player={x:7,y:7};
 return {...result(true,'연금술 상점에 도착했어요. 시약 제작소에서 HCl, NaOH, KOH를 물에 녹여 수용액으로 준비하세요.'),returned:true};
}
function skipGuest(s){if(s.phase!=='shop'||s.smelting)return result(false,'작업을 먼저 마쳐 주세요.');const o=currentGuest(s);if(!o)return result(false,'');o.skipped=true;s.bench=null;if(s.orders.every(o=>o.served||o.skipped))s.phase='end';return result(true,o.name+'의 주문을 넘겼습니다. 보상과 재료 소모는 없습니다.');}
function missing(s){const need=empty();for(const o of s.orders)if(!o.served&&!o.skipped)for(const k in o.needs)need[k]+=o.needs[k];return Object.fromEntries(Object.entries(need).map(([k,v])=>[k,Math.max(0,v-s.stock[k]-s.aqueous[k])]));}
function supply(s){
 if(s.phase!=='shop'||s.bench||s.smelting)return result(false,'진행 중인 작업을 닫고 시약 제작소를 이용하세요.');
 const need=missing(s),m={acid:need.acid,base:need.base},n=m.acid+m.base;if(!n)return result(false,'보급 가능한 재료가 충분해요. 광산 재료는 보충 탐사로 구해 주세요.');
 for(const k in m)s.stock[k]+=m[k];s.cost+=n*8;
 return result(true,`재료 ${n}개를 받았어요. ${n*8}C 차감 예정 · 이온 결합 물질은 아직 고체입니다.`);
}
const needsSolution=k=>!!(ITEMS[k]?.ionic||ITEMS[k]?.requiresSolution);
function dissolve(s,k,qty=1){
 if(s.phase!=='shop'||s.bench||!needsSolution(k))return result(false,'시약 제작소에서는 시약을 물에 녹여 수용액으로 만듭니다.');
 if(!Number.isInteger(qty)||qty<1||s.stock[k]<qty)return result(false,'녹일 원료가 부족해요.');
 if(s.stock.water<qty)return result(false,'물이 부족해요. 숲의 우물에서 물을 길어 오세요. 시약 수용액 한 병을 만들 때 물 한 병이 필요합니다.');
 s.stock.water-=qty;s.stock[k]-=qty;s.aqueous[k]+=qty;
 return result(true,`${ITEMS[k].formula}(${ITEMS[k].form||'s'}) ${qty}개를 물에 녹여 수용액 ${qty}개를 준비했어요.`);
}
// Customer-owned recovery: conserved electron equivalents, independent of shop stock solutions.
const RECOVERY={
 silver:{name:'은',symbol:'Ag',ion:'Ag⁺',charge:1,rank:4,solution:'질산은 수용액',ions:'Ag⁺ · NO₃⁻',color:'#c5dce0',guest:'장신구 장인 에이라',portrait:'recovery-silver',reward:90},
 gold:{name:'금',symbol:'Au',ion:'AuCl₄⁻ 속 금(산화수 +3)',charge:3,rank:5,solution:'금(III) 착이온 수용액',ions:'AuCl₄⁻ · 동반 이온',color:'#c9ab54',guest:'왕실 세공사 발테르',portrait:'recovery-gold',reward:140}
};
const RECOVERY_METALS={ironMetal:{symbol:'Fe',ion:'Fe³⁺',charge:3,rank:1},copperMetal:{symbol:'Cu',ion:'Cu²⁺',charge:2,rank:3}};
function recoveryOrder(kind,id=2,rng=Math.random){
 const r=RECOVERY[kind];if(!r)return null;const factor=1+Math.floor(rng()*3),target=(kind==='silver'?6:2)*factor;
 const order={id,name:r.guest,portraitId:r.portrait,type:'recovery',title:r.name+' 석출 주문',needs:{},reward:r.reward,served:false,recovery:{version:2,kind,stage:'prepare',target,available:target*2}};order.quote=guestQuote(order);return order;
}
function migrateRecoveryOrder(s,o){
 const old=o.recovery;
 if(o.type!=='recovery'||!RECOVERY[old?.kind]||o.served||o.skipped||old.stage==='done')return;
 const validTarget=Number.isFinite(old.target)&&old.target>0;
 if(old.version===2&&validTarget&&Number.isFinite(old.available)&&old.available>=old.target)return;
 // Move unfinished legacy work to the quantity order before any dialogue is rendered.
 // Resetting the work refunds only metal still invested in that unfinished order.
 const refund=(metal,amount)=>{if(RECOVERY_METALS[metal]&&Number.isFinite(amount)&&amount>0)s.stock[metal]=(s.stock[metal]||0)+amount;};
 for(const h of old.history||[])refund(h.metal,(h.added||0)-(h.left||0));
 if(old.final)refund(old.final.metal,old.final.filtered?old.final.used:old.final.amount);
 const fresh=recoveryOrder(old.kind,o.id,()=>0);
 if(old.version===2&&validTarget){fresh.recovery.target=old.target;fresh.recovery.available=old.target*2;}
 o.recovery=fresh.recovery;o.quote=guestQuote(o);o.title=fresh.title;
}
function recoveryCurrent(s){
 const o=currentGuest(s);if(s.phase!=='shop'||o?.type!=='recovery'||s.bench||s.smelting)return null;
 migrateRecoveryOrder(s,o);return o;
}
function recoveryInspect(s){return result(!!recoveryCurrent(s),'투입할 금속과 금속 원자 수를 정해 주세요.');}
function recoveryTest(){return result(false,'손님의 주문에 맞춰 금속과 투입량을 선택해 주세요.');}
function recoveryPrepare(s){return recoveryInspect(s);}
function recoveryCalculate(kind,metal,amount,target){const r=RECOVERY[kind],m=RECOVERY_METALS[metal];if(!r||!m||m.rank>=r.rank)return {recovered:0,used:0,left:target,excess:amount,reacts:false};const recovered=Math.min(target,amount*m.charge/r.charge),used=recovered*r.charge/m.charge;return {recovered,used,left:Math.max(0,target-recovered),excess:Math.max(0,amount-used),reacts:true};}
function recoveryRun(s,metal,amount){
 const b=recoveryCurrent(s)?.recovery;if(!b||b.stage!=='prepare')return result(false,'이미 석출 작업을 진행했습니다.');
 if(!RECOVERY_METALS[metal]||!Number.isInteger(amount)||amount<1||amount>24)return result(false,'금속과 투입할 원자 수를 선택하세요.');
 if((s.stock[metal]||0)<amount)return result(false,'선택한 금속의 재고가 부족합니다.');
 const r=recoveryCalculate(b.kind,metal,amount,b.available);s.stock[metal]-=amount;b.final={...r,metal,amount,filtered:false};b.stage='result';return result(true,'석출이 끝났습니다. 주문량과 결과를 비교하세요.');
}
function recoveryFilter(s){const b=recoveryCurrent(s)?.recovery;if(!b||b.stage!=='result'||b.final.filtered)return result(false,'이미 분리했습니다.');s.stock[b.final.metal]+=b.final.excess;b.final.filtered=true;return result(true,'석출된 금속을 분리했습니다. 반응하지 않고 남은 투입 금속은 재고로 돌아갑니다.');}
function recoveryDeliver(s){const o=recoveryCurrent(s),b=o?.recovery;if(!b||b.stage!=='result'||!b.final.filtered)return result(false,'석출된 금속을 먼저 분리해 주세요.');const good=Math.abs(b.final.recovered-b.target)<1e-8;b.stage='done';if(good){o.served=true;s.coins+=o.reward;}else{o.skipped=true;o.rejected=true;s.mistakes++;}if(s.orders.every(x=>x.served||x.skipped))s.phase='end';return {ok:good,thanked:good,rejected:!good,departingGuest:{...o,departureQuote:good?thankGuest(o):null,angryQuote:good?null:ANGRY_LINES[b.kind==='silver'?'에이라':'발테르']},message:good?'석출 주문 완료':'주문한 금속 원자 수와 다릅니다.'};}

function usable(s,k){return needsSolution(k)?s.aqueous[k]:s.stock[k];}

function earlyOrders(day){
 const pool=[['약초사 엘로웬','acid',28],['비누 장인 리리아','base',28],['방랑자 카엘','water',18],['제빵사 브램','charcoal',32],['연금상 세레나','base',30],['목공 로완','wood',24],['유리 장인 이실','acid',30],['탐험가 핀리','charcoal',32],['유리 장인 이실','glass',48],['연금상 세레나','koh',32],['대장장이 토린','charcoal',32],['대장장이 아스트리드','water',18]];
 const candidates=pool.map((_,i)=>i);for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const seen=new Set(),indices=candidates.filter(i=>{if(seen.has(pool[i][0]))return false;seen.add(pool[i][0]);return true;}).slice(0,3);
 return indices.map((p,id)=>{const [name,item,reward]=pool[p],o={id,name,title:'물품 주문',type:'delivery',needs:{[item]:1},reward,served:false,portraitId:p};o.quote=guestQuote(o);return o;});
}
function selectDelivery(s,k){const o=currentOrder(s);if(o?.type!=='delivery'||!ITEMS[k]||usable(s,k)<1)return result(false,'준비된 재료가 없습니다.');s.bench.deliveryItem=k;return result(true,'');}

function prepare(s,id){
 if(s.smelting)return result(false,'재련로를 먼저 닫아 주세요.');
 if(s.phase!=='shop')return result(false,'오후 영업에서 주문을 받을 수 있어요.');
 const o=currentGuest(s);if(!o||o.id!==id)return result(false,'지금 방문한 손님의 주문부터 완성해 주세요.');
 if(o.type==='recovery')return result(false,'금속 석출대를 이용해 주세요.');
 const lack=Object.keys(o.needs).filter(k=>usable(s,k)<o.needs[k]);
 if(lack.length&&o.type==='metal')return result(false,'납품할 금속이 부족합니다. 재련로에서 광석을 재련해 주세요.');
 if(lack.length&&!['acid','delivery'].includes(o.type))return result(false,`${lack.map(k=>ITEMS[k].formula+(needsSolution(k)?'(aq)':'')).join(', ')} 준비가 부족해요. 왼쪽 시약 제작소에서 확인하세요.`);
 s.bench={orderId:id,acidStage:'inspect',prediction:null,doses:0,selected:[],reacted:false,history:[]};return result(true,'반응을 맞춘 다음 완성품을 전달하세요.');
}
function currentOrder(s){return s.bench?s.orders.find(o=>o.id===s.bench.orderId):null;}
function neutralState(b){const volume=b?.acidStage==='double'?10:2,h=volume*2+(b?.reagent==='acid'?(b.doses||0)*2:0),oh=['base','koh'].includes(b?.reagent)?(b.doses||0):0,water=Math.min(h,oh);return {h:h-water,oh:oh-water,water,na:b?.reagent==='base'?oh:0,k:b?.reagent==='koh'?oh:0,cl:h,kind:h===oh?'중성':h>oh?'산성':'염기성',color:h===oh?'green':h>oh?'yellow':'blue'};}
function snapshot(b){return {doses:b.doses,selected:[...b.selected],reacted:b.reacted};}
function inspectSolution(s){const b=s.bench;if(currentOrder(s)?.type!=='acid'||b.acidStage!=='inspect')return result(false,'');b.acidStage='choose';return result(true,'');}
function chooseReagent(s,k){const b=s.bench;if(currentOrder(s)?.type!=='acid'||!['choose','ready'].includes(b.acidStage))return result(false,'');if(!ITEMS[k]||usable(s,k)<1)return result(false,'준비된 재료가 없습니다.');if(!['base','koh','acid','water'].includes(k))return result(false,'이 시약은 이 계량기에 사용할 수 없습니다.');if(['base','koh'].includes(k)&&usable(s,k)<currentOrder(s).needs.base)return result(false,'이 시약은 시험과 주문 제작에 총 세 병이 필요합니다. 시약 제작소에서 수용액을 준비하세요.');b.reagent=k;b.acidStage='ready';return result(true,'');}
function startTest(s){const b=s.bench;if(currentOrder(s)?.type!=='acid'||b.acidStage!=='ready')return result(false,'');b.acidStage='explore';b.doses=0;b.history=[];return result(true,'먼저 농도 테스트를 진행합니다.');}
function doubleSample(s){const b=s.bench;if(currentOrder(s)?.type!=='acid'||b.acidStage!=='explore')return result(false,'먼저 시약 테스트를 시작해 주세요.');b.testDose=b.doses;b.testColor=neutralState(b).color;b.acidStage='double';b.doses=0;b.history=[];return result(true,'');}
function predictDrops(){return result(false,'');}
function changeReagent(s){const b=s.bench;if(currentOrder(s)?.type!=='acid'||!['explore','ready'].includes(b.acidStage))return result(false,'');b.acidStage='choose';b.doses=0;b.history=[];return result(true,'');}
function pour(s,ml=1){const o=currentOrder(s),b=s.bench;if(!o||o.type!=='acid'||!['explore','double'].includes(b.acidStage)||![1,2,5,10].includes(ml))return result(false,'');if(b.doses+ml>30)return result(false,'계량 한도에 도달했습니다.');b.history.push(snapshot(b));b.doses+=ml;return result(true,'');}
function undo(s){const b=s.bench;if(!b||!b.history.length)return result(false,'되돌릴 조작이 없어요.');Object.assign(b,b.history.pop());return result(true,'직전 조작을 되돌렸어요.');}
function closeBench(s){s.bench=null;return result(true,'조리를 멈췄어요. 재료는 소모되지 않았습니다.');}
const ANGRY_LINES={"엘로웬":"부탁한 것과 다르잖아요. 약초를 다루는 일인데… 이렇게 주시면 곤란해요. 돌아갈게요.","리리아":"잠깐, 이건 아니잖아요! 비누 한 솥을 망칠 뻔했네. 오늘 거래는 취소할게요!","카엘":"이건 부탁한 물건이 아니에요. 길 떠날 시간이 다 됐는데… 다른 곳으로 갈게요.","브램":"이런, 주문한 게 아니잖나! 화덕은 기다려 주지 않아. 오늘은 이만 가겠네.","세레나":"주문 내용과 다릅니다. 확인 없이 건네신 건가요? 이번 거래는 취소하겠습니다.","로완":"이런! 이걸로는 작업을 못 하잖나. 손님과 약속한 시간이 있으니 이만 가겠네.","이실":"이런, 부탁한 재료가 아니구나. 작품을 망칠 뻔했어. 오늘은 여기까지 하세.","핀리":"앗, 이건 아니에요! 이러다 원정대를 놓치겠어요. 그냥 갈게요!","토린":"주문과 다르잖나! 화로만 식었군. 거래는 취소하겠네.","아스트리드":"잠깐! 부탁한 재료가 아니잖아. 이걸로는 못 만들어. 오늘 거래는 취소야!","에이라":"이런, 부탁드린 양과 다르잖아요! 이대로는 장신구를 완성할 수 없어요. 취소할게요.","발테르":"주문한 양과 다르군요. 왕실에 올릴 물건입니다. 이 상태로는 받을 수 없습니다."};
function rejectDelivery(s,o,k,qty){
 const inventory=needsSolution(k)?s.aqueous:s.stock;
 if(!ITEMS[k]||!(qty>0)||inventory[k]<qty)return result(false,'건넬 재료가 부족해요.');
 inventory[k]-=qty;if(s.premium[k])s.premium[k]=Math.max(0,s.premium[k]-qty);
 const lines=['이건 제가 부탁한 물건이 아니잖아요! 기분이 상했네요. 그냥 가겠습니다!','이걸 쓰라는 건가요? 더는 기다릴 수 없어요. 그냥 가겠습니다!','주문과 다르잖아요! 다시는 이렇게 주지 마세요! 전 이만 갈게요!'];
 o.angryQuote=Object.entries(ANGRY_LINES).find(([name])=>o.name.includes(name))?.[1]||lines[(o.complaints||0)%lines.length];o.complaints=(o.complaints||0)+1;s.mistakes++;
 o.skipped=true;o.rejected=true;s.bench=null;if(s.orders.every(order=>order.served||order.skipped))s.phase='end';
 return {...result(false,'“'+o.angryQuote+'” · '+ITEMS[k].name+' '+qty+'개 소모'),rejected:true,departingGuest:{...o}};
}
const THANKS={"엘로웬":"세심하게 준비해 주셨네요. 덕분에 약초를 돌볼 수 있겠어요. 고마워요.","리리아":"좋아요, 딱 찾던 재료예요! 비누가 완성되면 한 조각 가져올게요. 고마워요!","카엘":"고마워요. 덕분에 다음 마을까지 든든하겠어요. 길에서 또 만나요!","브램":"허허, 고맙네! 오늘도 빵 냄새로 골목을 채울 수 있겠군.","세레나":"주문대로 준비해 주셨군요. 좋은 거래였습니다. 다음에도 부탁드리겠습니다.","로완":"좋은 재료로군! 이제 밀린 작업을 끝내겠어. 고맙네.","이실":"잘 준비했구나. 덕분에 작품을 마무리할 수 있겠어. 고맙네.","핀리":"야호, 준비 끝! 고마워요! 돌아오면 탐험 이야기도 들려줄게요!","토린":"좋군. 이제 망치를 들 차례야. 고맙네.","아스트리드":"좋아, 바로 이거야! 오늘은 제대로 만들어 보겠어. 고마워!","에이라":"주문한 만큼 꼭 맞네요! 이 은으로 고운 장신구를 만들게요. 고마워요.","발테르":"정확하게 맞춰 주셨군요. 왕실의 세공에 손색이 없겠습니다. 감사합니다."};
function guestQuote(o){
 if(o.type==='special')return o.quote;
 if(o.type==='recovery'){const b=o.recovery;if(!Number.isFinite(b?.target)||b.target<=0)return b?.kind==='gold'?'왕실 세공에 쓸 금이 필요합니다. 석출대에서 주문량을 확인해 주십시오.':'새 장신구를 만들려고 해요. 석출대에서 은의 주문량을 확인해 주세요.';return b.kind==='gold'?'왕실 세공에 쓸 금이 필요합니다. 금 원자 수가 정확히 '+b.target+'N이 되도록 석출해 주십시오.':'새 장신구를 만들려고 해요. 은 원자 수가 정확히 '+b.target+'N이 되도록 석출해 주세요.';}
 const lines={
  엘로웬:o.type==='acid'?'약초를 돌보는 데 쓸 용액이에요. 이 용액을 딱 중성으로 맞춰 주실래요?':'안녕하세요. 약초를 손질할 산성 용액 한 병 부탁드려요.',
  리리아:'새 비누를 만들려고요. 염기성 용액 한 병 부탁해요!',
  카엘:'다음 마을까지 길이 꽤 멀어요. 마실 물 한 병 주실래요?',
  브램:'허허, 빵 굽는 시간이 다 됐군. 화덕에 쓸 숯 한 개 주겠나?',
  세레나:o.needs?.koh?'거래용 시약을 보충하려 합니다. 수산화칼륨 수용액 한 병 부탁드립니다.':'거래용 시약을 보충하려 합니다. 수산화나트륨 수용액 한 병 부탁드립니다.',
  로완:'새 의자를 짜는 중이라네. 작업에 쓸 나무 한 개 부탁하네.',
  이실:o.needs?.glass?'이번 작품에 쓸 유리 한 장 부탁하네. 빛이 곱게 들면 좋겠구나.':'세공 준비를 해야겠구나. 염산 한 병 구해 주겠니?',
  핀리:'오늘은 숲 너머까지 가 볼 거예요! 모닥불에 쓸 숯 한 개 주세요!',
  토린:o.type==='metal'?'손잡이를 벼려야 해. 구리 주괴 두 개 부탁하네.':'화로를 달굴 숯 한 개 주게. 쇠가 식기 전에 돌아가야 해.',
  아스트리드:o.type==='metal'?'새 도구를 만들 거야! 철 주괴 네 개 준비해 줘.':'오늘도 쇠를 두드려야지! 작업에 쓸 물 한 병 부탁해.'
 };
 return Object.entries(lines).find(([name])=>o.name?.includes(name))?.[1]||o.quote;
}
function thankGuest(o){return Object.entries(THANKS).find(([name])=>o.name.includes(name))?.[1]||'주문대로 준비해 주셨네요. 고맙습니다!';}
function serve(s){
 const o=currentOrder(s),b=s.bench;if(!o||o.served||o!==currentGuest(s))return result(false,'');
 if(o.type==='recovery')return result(false,'금속 석출대에서 여과를 마친 뒤 전달해 주세요.');
 if(o.type==='acid'&&b.acidStage!=='double')return result(false,'용액 준비를 완료해 주세요.');
 if(o.type==='acid'&&neutralState(b).kind!=='중성'){const r=rejectDelivery(s,o,b.reagent,Math.min(3,usable(s,b.reagent)));if(r.rejected){b.acidStage='choose';b.reagent=null;b.doses=0;b.history=[];}return r;}
 const needs=(o.type==='acid'&&b.reagent==='koh')||(o.type==='delivery'&&o.quote.includes('염기성 용액')&&b.deliveryItem==='koh')?{koh:3*(o.type==='acid')||1}:o.needs;
 if(o.type==='delivery'&&!Object.keys(needs).includes(b.deliveryItem)){if(!b.deliveryItem)return result(false,'건넬 물건을 골라 주세요.');const r=rejectDelivery(s,o,b.deliveryItem,1);if(r.rejected)b.deliveryItem=null;return r;}
 if(Object.keys(needs).some(k=>usable(s,k)<needs[k]))return result(false,'준비된 재료가 부족해요.');const payout=saleQuote(s,o);for(const k in needs){if(s.premium[k])s.premium[k]-=Math.min(s.premium[k],needs[k]);if(needsSolution(k))s.aqueous[k]-=needs[k];else s.stock[k]-=needs[k];}
 o.served=true;s.coins+=payout;s.bench=null;if(s.orders.every(o=>o.served||o.skipped))s.phase='end';
 return {...result(true,`${o.name}에게 전달 완료! +${payout}C`),thanked:true,departingGuest:{...o,angryQuote:null,departureQuote:thankGuest(o)}};
}
function resumeExploration(s){
 if(s.gatheringEnded)return result(false,'오늘 채집은 종료됐어요. 영업을 마치고 다음 날 다시 탐사하세요.');
 if(s.phase!=='shop'||s.bench||s.smelting)return result(false,'조리대를 닫고 나가 주세요.');
 s.phase='morning';s.area='forest';s.region='forest0';s.player={x:3,y:8};s.energy=maxEnergy(s);s.steps=0;s.supplemental=true;s.cost+=10;
 return result(true,'보충 탐사를 시작합니다. 행동력 회복 · 마감 시 10C 차감. 손님과 재고는 그대로 기다립니다.');
}
function closeShop(s){if(s.phase!=='shop'||s.bench||s.smelting)return result(false,'');s.phase='end';return result(true,'오늘의 영업을 마쳤어요.');}
function nextDay(s){if(s.phase!=='end')return s;const next=newGame(s.day+1,s.savings+s.coins-s.cost,s.capacity,undefined,s.treasures);next.stock={...s.stock};next.aqueous={...s.aqueous};next.equipment={...s.equipment};next.premium={...s.premium};next.shopName=s.shopName;next.character=s.character;next.teacherSupplyVersion=s.teacherSupplyVersion;next.student=s.student?{...s.student}:null;next.sanctuary=s.sanctuary;next.clearancePresented=s.clearancePresented;next.questionQueue=s.questionQueue;next.lastQuestion=s.lastQuestion;next.mineQuestionQueue=s.mineQuestionQueue;next.lastMineQuestion=s.lastMineQuestion;next.energy=maxEnergy(next);return next;}
function buyEquipment(s,key){
 const item=EQUIPMENT[key];if(s.phase!=='end'||!item)return result(false,'장비는 영업을 마친 후 구입할 수 있어요.');
 if(gearLevel(s,key)>=gearMax(key))return result(false,'최대 단계입니다.');const price=gearPrice(s,key);
 if(s.savings+s.coins-s.cost<price)return result(false,'소지금이 부족해요. '+price+'C가 필요합니다.');
 s.cost+=price;s.equipment[key]=gearLevel(s,key)+1;if(key==='bag')s.capacity=12+6*gearLevel(s,key);
 return result(true,item.name+' '+gearLevel(s,key)+'단계 강화 완료! 다음 탐사부터 자동 적용됩니다.');
}
function upgrade(s){return buyEquipment(s,'bag');}


const RECIPES={
 glass:{name:'유리 용융',ore:'stone',oreQty:2,fuel:1,product:'glass',yield:1,glass:true},
 copper:{name:'구리 재련',ore:'copperOre',oreQty:2,fuel:1,product:'copperMetal',yield:2,equation:'2CuO + C → 2Cu + CO₂',ion:'Cu²⁺',electrons:4},
 iron:{name:'철 재련',ore:'ironOre',oreQty:2,fuel:3,product:'ironMetal',yield:4,equation:'2Fe₂O₃ + 3C → 4Fe + 3CO₂',ion:'Fe³⁺',electrons:12}
};
function carbonize(s){if(s.phase!=='shop'||s.bench||s.smelting)return result(false,'작업대를 먼저 닫아 주세요.');if(s.stock.wood<1)return result(false,'나무가 없습니다. 도끼로 숲에서 채집하세요.');s.stock.wood--;s.stock.charcoal++;return result(true,'숯 1개 완성');}
function startSmelt(s,key,rng=Math.random){const r=RECIPES[key];if(s.phase!=='shop'||s.bench||s.smelting||!r)return result(false,'다른 작업을 먼저 마쳐 주세요.');if(s.stock[r.ore]<r.oreQty||s.stock.charcoal<r.fuel)return result(false,'광석 또는 숯이 부족합니다.');s.smelting={recipe:key,stage:r.glass?'timing':rng()<.5?'roles':'electrons',slots:{}};return result(true,'');}
function assignSmelt(s,slot,token){const f=s.smelting;if(!f||s.phase!=='shop'||f.stage==='timing')return result(false,'');const slots=f.stage==='roles'?['carbon','oxide']:['from','to'],tokens=f.stage==='roles'?['oxidation','reduction']:['carbon','oxide'];if(!slots.includes(slot)||!tokens.includes(token))return result(false,'');for(const k of slots)if(f.slots[k]===token)delete f.slots[k];f.slots[slot]=token;return result(true,'');}
function checkSmelt(s){const f=s.smelting;if(!f||s.phase!=='shop'||f.stage==='timing')return result(false,'');
 if(f.stage==='roles'){if(!f.slots.carbon||!f.slots.oxide)return result(false,'두 칸에 카드를 놓아 주세요.');f.quizCorrect=f.slots.carbon==='oxidation'&&f.slots.oxide==='reduction';}
 else{if(!f.slots.from||!f.slots.to)return result(false,'전자 이동의 출발과 도착을 연결해 주세요.');f.quizCorrect=f.slots.from==='carbon'&&f.slots.to==='oxide';}
 f.stage='timing';f.slots={};return {ok:true,timing:true,message:''};
}
function cancelSmelt(s){s.smelting=null;return result(true,'');}


function saleQuote(s,o){if(!o)return 0;let total=0,high=0;for(const [k,v] of Object.entries(o.needs)){total+=v;high+=Math.min(s.premium[k]||0,v);}return o.reward+Math.round(o.reward*.5*high/Math.max(1,total));}
function finishSmelt(s,position){const f=s.smelting;if(s.phase!=='shop'||!f||f.stage!=='timing'||!Number.isFinite(position)||position<0||position>100)return result(false,'');const r=RECIPES[f.recipe];if(s.stock[r.ore]<r.oreQty||s.stock.charcoal<r.fuel)return result(false,'재료가 부족합니다.');const high=position>=42&&position<=58;s.stock[r.ore]-=r.oreQty;s.stock.charcoal-=r.fuel;s.smelting=null;
 if(f.quizCorrect===false)return {...wrong(s,'재련에 실패했습니다. 투입한 광석과 숯은 소모되었습니다.'),completed:true,failed:true,qty:0};
 s.stock[r.product]+=r.yield;if(high)s.premium[r.product]+=r.yield;return {ok:true,completed:true,smelted:true,high,product:r.product,qty:r.yield,message:(high?'고순도 ':'일반 ')+ITEMS[r.product].name+' '+r.yield+'개 완성'};}
function setShopName(s,name){if(typeof name!=='string'||!name.trim()||[...name.trim()].length>14)return result(false,'연금술 상점 이름을 1~14자로 적어 주세요.');s.shopName=name.trim();return result(true,'');}
function travelRegion(s,dx,dy=0){if(s.phase!=='morning'||s.inspection||s.bench||Math.abs(dx)+Math.abs(dy)!==1)return result(false,'');const p=s.player,x=p.x+dx,y=p.y+dy;if(!((dx<0&&p.x===1)||(dx>0&&p.x===W-2)||(dy<0&&p.y===1)||(dy>0&&p.y===8))||blocked(s,x,y))return result(false,'지역 경계로 이동해 주세요.');if(s.energy<1)return exhaustion(s);const index=Number(s.region.slice(-1)),col=index%3,row=Math.floor(index/3);if(col+dx<0||col+dx>2||row+dy<0||row+dy>2)return result(false,'더 이상 이어지는 길이 없습니다.');const destination=s.area+((row+dy)*3+col+dx),arrival={x:dx?dx>0?1:W-2:p.x,y:dy?dy>0?1:8:p.y};if(!s.maps[destination].floor.includes(arrival.x+','+arrival.y))return result(false,'갱도 벽이 막고 있습니다.');s.region=destination;s.player={x:dx?dx>0?1:W-2:p.x,y:dy?dy>0?1:8:p.y};s.energy--;s.steps++;return exhaustion(s)||{ok:true,regionChanged:true,message:s.maps[s.region].name+'에 도착했습니다.'};}
const treasureSpot=t=>t.region+':'+t.x+','+t.y;
// Use a separate traversal state so placement follows the actual map transitions.
function reachableMine(s,excavated=false){
 const probe={...s,phase:'morning',area:'mine',bench:null,inspection:null},queue=[{region:'mine0',x:2,y:7}],seen=new Set(['mine0:2,7']);
 // Placement may use routes opened by mining, but never solid cave walls.
 if(excavated){probe.maps=Object.fromEntries(Object.entries(s.maps).map(([id,map])=>[id,{...map,decor:[]}]));probe.nodes=s.nodes.map(n=>({...n,used:true}));probe.treasures=[];}
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
  probe.area='mine';probe.region=p.region;probe.player={x:p.x,y:p.y};probe.energy=100000;
  // Walking through the exit is valid for players, not for mine-only placement.
  if(!move(probe,dx,dy).ok||probe.area!=='mine')continue;
  const next={region:probe.region,...probe.player},key=treasureSpot(next);if(!seen.has(key)){seen.add(key);queue.push(next);}
 }}return seen;
}
function placeMineTreasures(s,previous=[]){
 s.treasures=[];s.treasureCoins=0;
 let seed=((s.worldSeed||0)^Math.imul(s.day,2654435761)^0x7ac431)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},avoid=new Set((previous||[]).map(treasureSpot));
 const reachable=reachableMine(s,true);
 const candidates=[...reachable].map(key=>{const [region,xy]=key.split(':'),[x,y]=xy.split(',').map(Number);return {region,x,y};}).filter(t=>t.region!=='mine0'&&t.x>1&&t.x<W-2&&t.y>1&&t.y<H-2&&!avoid.has(treasureSpot(t))&&!(s.region===t.region&&s.player.x===t.x&&s.player.y===t.y)&&!s.nodes.some(n=>n.region===t.region&&n.x===t.x&&n.y===t.y));
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 // Prefer narrow recesses. The cover looks and behaves like every other rock.
 const degree=t=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>s.maps[t.region].floor.includes((t.x+dx)+','+(t.y+dy))).length;
 candidates.sort((a,b)=>degree(a)-degree(b));
 for(const candidate of candidates){
  if(s.treasures.some(t=>t.region===candidate.region))continue;
  const chest={...candidate,id:'treasure-'+s.day+'-'+s.treasures.length,coins:20+Math.floor(random()*7)*5,opened:false,revealed:false};s.treasures.push(chest);
  const rocks=s.maps[chest.region].decor;if(!rocks.some(([x,y])=>x===chest.x&&y===chest.y))rocks.push([chest.x,chest.y]);
  if(s.treasures.length===2)break;
 }
}
function openTreasure(s,id){
 if(s.phase!=='morning'||s.area!=='mine'||s.bench||s.inspection||s.energy<=0)return result(false,'탐사 중에 상자를 열 수 있어요.');
 const chest=activeTreasures(s).find(t=>t.id===id);
 if(!chest||!near(s.player,chest))return result(false,'보물상자 옆으로 이동해 주세요.');
 if(chest.opened)return result(false,'이미 열어 본 상자입니다.');
 chest.opened=true;s.coins+=chest.coins;s.treasureCoins=(s.treasureCoins||0)+chest.coins;
 return {ok:true,treasureOpened:true,treasureCoins:chest.coins,message:'보물상자에서 '+chest.coins+'C를 찾았습니다!'};
}
function breakRock(s,x,y){
 if(s.phase!=='morning'||s.inspection||s.bench)return result(false,'지금은 바위를 부술 수 없어요.');
 const map=s.maps[s.region],index=map.decor.findIndex(p=>p[0]===x&&p[1]===y);
 if(index<0||!near(s.player,{x,y}))return result(false,'바위 옆 칸으로 이동해 주세요.');
 if(!s.equipment.pickaxe)return result(false,'바위를 부수려면 곡괭이가 필요합니다.');
 if(s.energy<2)return result(false,'바위를 부수려면 행동력 2가 필요합니다.');
 map.decor.splice(index,1);s.energy-=2;
 const treasure=(s.treasures||[]).find(t=>t.region===s.region&&t.x===x&&t.y===y&&!t.revealed);
 if(treasure)treasure.revealed=true;
 return {...(exhaustion(s)||result(true,treasure?'바위 뒤에서 보물상자가 드러났습니다! · 행동력 −2':'바위를 부숴 길을 열었습니다. · 행동력 −2')),rockBroken:true,treasureRevealed:!!treasure};
}
function collectDirect(s,id){const n=activeNodes(s).find(n=>n.id===id&&!n.used);if(!n||!near(s.player,n)||!['wood','water','stone'].includes(n.item))return result(false,'가까이 이동해 주세요.');if(n.item==='stone'){if(!s.equipment.pickaxe)return result(false,'규석을 캐려면 곡괭이가 필요합니다.');n.verified=true;return harvest(s,id);}if(n.item==='wood'){if(!s.equipment.axe)return result(false,'도끼가 필요합니다.');n.verified=true;return harvest(s,id);}if(s.energy<1)return exhaustion(s);if(bagCount(s)>=s.capacity)return result(false,'가방이 가득 찼어요.');s.bag.water++;s.energy--;s.harvested++;return exhaustion(s)||{ok:true,message:'우물에서 물 1병을 길었습니다.',water:true};}
function generateWorld(s,seed,previousTreasures=[]){s.worldSeed=seed;let n=seed>>>0;const rng=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};const blueprints=s.nodes.filter(n=>n.item!=='water'),names={forest:['이슬 숲','안개 계곡','참나무 숲','버들 강변','이끼 숲','고요한 여울','고목 숲','달빛 숲','깊은 숲'],mine:['새벽 광산','붉은 암맥','깊은 동굴','수정 갱도','구리 절벽','철빛 회랑','그늘 갱도','지하 협곡','오래된 채굴장']};s.maps={};s.nodes=[];

 const terrain={forest:new Set(),mine:new Set()};const put=(area,x,y)=>{if(x>0&&y>0&&x<44&&y<29)terrain[area].add(x+','+y);};
 for(let y=1;y<29;y++)for(let x=1;x<44;x++)if(((x-22)/22)**2+((y-15)/15)**2<1)put('forest',x,y);
 // Authored as one cave: bent passages, small chambers, alternate loops and blind veins.
 // Bends stay away from screen seams so all four region transitions remain continuous.
 const passages=[
  [[2,7],[5,7],[5,4],[10,4],[10,7],[17,7],[17,4],[21,4],[21,6],[26,6],[26,3],[33,3],[33,6],[40,6],[40,12],[37,12],[37,15],[41,15],[41,17],[35,17],[35,23],[40,23],[40,27],[33,27],[33,25],[27,25],[27,22],[23,22],[23,26],[17,26],[17,23],[11,23],[11,26],[6,26],[6,22],[3,22],[3,16],[8,16],[8,12],[5,12],[5,7]],
  [[8,16],[12,16],[12,13],[17,13],[17,16],[23,16],[23,12],[27,12],[27,15],[32,15],[32,12],[37,12]],
  [[17,7],[17,12],[20,12],[20,14],[17,14]],
  [[26,6],[26,12]],
  [[23,16],[23,17],[20,17],[20,22],[23,22]],
  [[11,23],[11,22],[9,22]],
  [[35,17],[32,17],[32,22],[29,22]],
  [[10,4],[10,2],[12,2]],[[21,4],[21,2],[23,2]],
  [[40,6],[42,6],[42,3]],[[8,16],[8,18]],
  [[23,12],[23,11]],[[41,17],[42,17]],[[6,26],[3,26]]
 ];
 for(const points of passages){let [x,y]=points[0];put('mine',x,y);for(const [tx,ty]of points.slice(1)){while(x!==tx||y!==ty){if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);put('mine',x,y);}}}
 for(const [cx,cy]of [[5,7],[10,4],[21,6],[33,6],[40,15],[35,23],[23,26],[6,24],[8,16],[17,16],[27,12]]){
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(Math.abs(dx)+Math.abs(dy)<2)put('mine',cx+dx,cy+dy);
 }
 // Fixed facilities have a connected approach in both layers.
 for(let i=0;i<9;i++){const ox=i%3*W,oy=Math.floor(i/3)*H;for(const area of ['forest','mine'])for(const p of area==='forest'?[HOME,MINE_GATE,...(WELLS['forest'+i]?[WELLS['forest'+i]]:[]),{x:3,y:8},{x:13,y:3}]:(i===0?[MINE_EXIT,{x:2,y:7}]:[])){const x=ox+p.x,y=oy+p.y;let nearest=[...terrain[area]].map(k=>k.split(',').map(Number)).sort((a,b)=>Math.abs(a[0]-x)+Math.abs(a[1]-y)-Math.abs(b[0]-x)-Math.abs(b[1]-y))[0];let xx=x,yy=y;while(xx!==nearest[0]||yy!==nearest[1]){put(area,xx,yy);put(area,xx-1,yy);if(xx!==nearest[0])xx+=Math.sign(nearest[0]-xx);else yy+=Math.sign(nearest[1]-yy);}for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])put(area,x+dx,y+dy);}}

 const lake=new Set(),rockMass=new Set();for(let y=1;y<29;y++)for(let x=1;x<44;x++){if(((x-27)/4.5)**2+((y-14)/3.2)**2<1){lake.add(x+','+y);terrain.forest.delete(x+','+y);}if((((x-10)/2)**2+((y-13)/2.4)**2<1)||(((x-35)/2.2)**2+((y-23)/1.8)**2<1)){rockMass.add(x+','+y);terrain.forest.delete(x+','+y);}}
 const forestRoads=new Set(),roadTargets=[{x:HOME.x,y:HOME.y},...Object.entries(WELLS).map(([id,p])=>({x:Number(id.slice(-1))%3*W+p.x,y:Math.floor(Number(id.slice(-1))/3)*H+p.y})),{x:Number(GATE_REGION.slice(-1))%3*W+MINE_GATE.x,y:Math.floor(Number(GATE_REGION.slice(-1))/3)*H+MINE_GATE.y},...Array.from({length:9},(_,i)=>({x:i%3*W+7,y:Math.floor(i/3)*H+5}))];
 for(const target of roadTargets){const desired=target.x+','+target.y;const origin=terrain.forest.has(desired)?desired:[...terrain.forest].sort((a,b)=>{const dist=k=>{const [x,y]=k.split(',').map(Number);return Math.abs(x-target.x)+Math.abs(y-target.y);};return dist(a)-dist(b);})[0];const goal='22,18',queue=[origin],parents=new Map([[origin,null]]);while(queue.length&&!parents.has(goal)){const k=queue.shift(),[x,y]=k.split(',').map(Number);for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const next=(x+dx)+','+(y+dy);if(terrain.forest.has(next)&&!parents.has(next)){parents.set(next,k);queue.push(next);}}}for(let k=parents.has(goal)?goal:null;k!==null;k=parents.get(k))forestRoads.add(k);}
 s.forestRoads=[...forestRoads];s.lake=[...lake];
 for(const area of ['forest','mine'])for(let index=0;index<9;index++){

 const id=area+index,floor=new Set(),reserved=new Set(),ox=index%3*W,oy=Math.floor(index/3)*H;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(terrain[area].has((ox+x)+','+(oy+y)))floor.add(x+','+y);
 for(const p of area==='forest'?[...(id==='forest0'?[HOME,{x:3,y:8}]:[]),...(id===GATE_REGION?[MINE_GATE,{x:13,y:3}]:[]),...(WELLS[id]?[WELLS[id]]:[])]:(id===EXIT_REGION?[MINE_EXIT,{x:2,y:7}]:[]))for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])reserved.add((p.x+dx)+','+(p.y+dy));
 const trails=[];for(const k of floor){const [x,y]=k.split(',').map(Number),gx=ox+x,gy=oy+y;if(area==='forest'&&(forestRoads.has(gx+','+gy))){trails.push(k);reserved.add(k);}}
 const positions=[];
 for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const k=x+','+y;if(reserved.has(k))continue;if(area==='forest'){if([[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>floor.has((x+dx)+','+(y+dy))))positions.push([x,y]);}else if(floor.has(k))positions.push([x,y]);}
 for(let i=positions.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
 const templates=blueprints.filter(n=>n.area===area).map(n=>({...n}));if(area==='forest'){templates.splice(3,0,{...templates[1],id:'koh-herb',item:'koh',qty:2});if(index>0){for(let i=0;i<3;i++)templates[i]={...templates[i],item:['acid','base','koh'][Math.floor(rng()*3)]};}for(let i=0;i<5+Math.floor(rng()*8);i++)templates.push({...templates.find(n=>n.item==='wood'),id:'tree-extra'+i});}
 if(area==='mine')templates.push({id:'silica-rock',area,item:'stone',qty:2,sprite:5});
 const occupied=new Set();const fixed=area==='forest'?[...(id==='forest0'?[HOME]:[]),...(id===GATE_REGION?[MINE_GATE]:[]),...(WELLS[id]?[WELLS[id]]:[])]:[];for(const p of fixed)occupied.add(p.x+','+p.y);
 function safe(pos){if(area==='mine')return true;const occupiedNext=new Set([...occupied,pos.join(',')]),free=[...floor].filter(k=>!occupiedNext.has(k));if(!free.length)return false;const origin=free.includes('8,5')?'8,5':free[Math.floor(free.length/2)];const seen=new Set([origin]),q=[origin];while(q.length){const [x,y]=q.pop().split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(y+dy);if(floor.has(k)&&!occupiedNext.has(k)&&!seen.has(k)){seen.add(k);q.push(k);}}}const baseSeen=new Set([origin]),baseQ=[origin];while(baseQ.length){const [x,y]=baseQ.pop().split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(y+dy);if(floor.has(k)&&!occupied.has(k)&&!baseSeen.has(k)){baseSeen.add(k);baseQ.push(k);}}}return seen.size===baseSeen.size-1&&[...occupiedNext].every(k=>{const [x,y]=k.split(',').map(Number);return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((x+dx)+','+(y+dy)));});}
 const rim=positions.filter(([x,y])=>x<=3||x>=W-4||y<=2||y>=H-3);const centers=[rim[0]||[2,2],rim[Math.floor(rim.length*.65)]||[12,7]];
 for(const t of templates){if(t.item==='wood')positions.sort((a,b)=>{const score=p=>Math.min(...centers.map(c=>Math.abs(c[0]-p[0])+Math.abs(c[1]-p[1])));return score(b)-score(a);});let pos;while(positions.length){const p=positions.pop();if(safe(p)){pos=p;occupied.add(p.join(','));break;}}if(!pos)break;s.nodes.push({...t,id:index===0?t.id:id+'-'+t.id,region:id,x:pos[0],y:pos[1],qty:index===0?t.qty:1+Math.floor(rng()*3),used:false,verified:false});}
 if(WELLS[id]){s.nodes.push({id:index===0?'well':id+'-well',region:id,area,item:'water',qty:1,sprite:14,...WELLS[id],used:false,verified:false});}
 const rocks=area==='forest'?[...rockMass].map(k=>k.split(',').map(Number)).filter(([x,y])=>Math.floor(x/W)===index%3&&Math.floor(y/H)===Math.floor(index/3)).map(([x,y])=>[x-ox,y-oy]):[];for(const [x,y] of rocks)floor.add(x+','+y);
 const decor=area==='forest'?rocks:positions.filter(p=>floor.has(p.join(','))).slice(0,3);s.maps[id]={name:names[area][index],floor:[...floor],decor,trails};
 }
 s.mineLayoutVersion=3;
 placeMineTreasures(s,previousTreasures);
}

function grantTeacherSupplies(s,account){
 if(account?.role!=='teacher'||account.username!=='변석환5'||s.teacherSupplyVersion===1)return false;
 s.savings+=100000;
 for(const key of Object.keys(ITEMS)){s.stock[key]=Math.max(s.stock[key]||0,999);if(needsSolution(key))s.aqueous[key]=Math.max(s.aqueous[key]||0,999);}
 for(const key of Object.keys(EQUIPMENT))s.equipment[key]=gearMax(key);
 for(const key of Object.keys(s.premium))s.premium[key]=Math.max(s.premium[key]||0,99);
 s.capacity=12+6*gearMax('bag');s.energy=maxEnergy(s);
 s.teacherSupplyVersion=1;return true;
}

function migrateMineLayout(s){
 if(s.mineLayoutVersion===3)return;
 const rebuilt=newGame(s.day,0,s.capacity,s.worldSeed??s.day*7919),oldNodes=new Map(s.nodes.filter(n=>n.area==='mine').map(n=>[n.id,n])),oldTreasures=s.treasures||[];
 for(let i=0;i<9;i++)s.maps['mine'+i]=rebuilt.maps['mine'+i];
 s.nodes=[...s.nodes.filter(n=>n.area!=='mine'),...rebuilt.nodes.filter(n=>n.area==='mine').map(n=>({...n,used:!!oldNodes.get(n.id)?.used}))];
 s.treasures=rebuilt.treasures.map((t,i)=>({...t,opened:!!oldTreasures[i]?.opened,revealed:!!oldTreasures[i]?.opened,coins:oldTreasures[i]?.coins??t.coins}));
 for(const t of s.treasures)if(t.opened)s.maps[t.region].decor=s.maps[t.region].decor.filter(([x,y])=>x!==t.x||y!==t.y);
 s.mineLayoutVersion=3;
 if(s.phase==='morning'&&s.area==='mine'){
  const positions=[...reachableMine(s)].filter(k=>k.startsWith(s.region+':')).map(k=>{const [x,y]=k.split(':')[1].split(',').map(Number);return {x,y};});
  if(!positions.some(p=>p.x===s.player.x&&p.y===s.player.y)){positions.sort((a,b)=>Math.abs(a.x-s.player.x)+Math.abs(a.y-s.player.y)-Math.abs(b.x-s.player.x)-Math.abs(b.y-s.player.y));s.player=positions[0]||{x:2,y:7};if(!positions.length)s.region=EXIT_REGION;}
 }
}
function migrateMetals(s){
 for(const field of ['stock','bag','aqueous','premium']){if(!s[field])continue;for(const k of Object.keys(s[field]))if(!ITEMS[k])delete s[field][k];}
 s.nodes=(s.nodes||[]).filter(n=>ITEMS[n.item]);
 s.orders=(s.orders||[]).map(o=>{const obsolete=Object.keys(o.needs||{}).some(k=>!ITEMS[k])||o.type==='recovery'&&(!RECOVERY[o.recovery?.kind]||[o.recovery?.metal,...(o.recovery?.history||[]).map(h=>h.metal)].some(k=>k&&!RECOVERY_METALS[k]));if(!obsolete)return o;return {...o,type:'metal',title:'구리 주괴 주문',quote:'구리 주괴 두 개를 부탁해요.',needs:{copperMetal:2},reward:65,recovery:undefined};});
 for(const o of s.orders)migrateRecoveryOrder(s,o);
 migrateMineLayout(s);
 if(!Array.isArray(s.treasures))placeMineTreasures(s);
 s.treasureCoins??=0;
 return s;
}
return {MINE_LIGHT_RADIUS,fieldVisible,activeTreasures,openTreasure,guestQuote,wallet,useReturnScroll,migrateMetals,grantTeacherSupplies,RECOVERY,RECOVERY_METALS,recoveryOrder,recoveryCurrent,recoveryInspect,recoveryCalculate,recoveryTest,recoveryPrepare,recoveryRun,recoveryFilter,recoveryDeliver,REAGENT_QUESTIONS,MINE_QUESTIONS,gearMax,skipGuest,earlyOrders,selectDelivery,GATE_REGION,EXIT_REGION,WELLS,gearLevel,gearPrice,gearDescription,saleQuote,finishSmelt,setShopName,travelRegion,breakRock,collectDirect,generateWorld,RECIPES,carbonize,startSmelt,assignSmelt,checkSmelt,cancelSmelt,W,H,ITEMS,EQUIPMENT,maxEnergy,wrongCost,buyEquipment,DECOR,HOME,MINE_GATE,MINE_EXIT,WATER_BENCH,newGame,blocked,near,activeNodes,currentGuest,bagCount,move,changeArea,inspect,harvest,answerInspection,cancelInspection,returnHome,missing,supply,dissolve,needsSolution,usable,prepare,currentOrder,neutralState,inspectSolution,chooseReagent,startTest,changeReagent,doubleSample,predictDrops,pour,undo,closeBench,serve,closeShop,WRONG_COST,resumeExploration,nextDay,upgrade};
});
