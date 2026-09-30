function relicImage(k){return window.LAB_RELICS?.[k]||('assets/relic-'+k+'.webp');}
function relicIonLabel(c){return {'Ag+':'Ag⁺','Au3+':'Au³⁺'}[c]||c;}
'use strict';
// Teacher-requested one-time reset. New progress keeps this revision on later logins.
const STUDENT_RESET_VERSION=2026092701;
function sanctuarySave(){if(!studentSession||!state.shopName)return;try{if(studentSession.role!=='teacher')state.studentResetVersion=STUDENT_RESET_VERSION;localStorage.setItem('alchemy.run.v2.'+studentSession.username,JSON.stringify(state));}catch(e){$('sanctuary-open').title='진행 저장에 실패했습니다. 저장 공간을 확인해 주세요.';}}
function sanctuaryRestore(account){try{const slot='alchemy.run.v2.'+account.username,raw=localStorage.getItem(slot);if(!raw)return false;const saved=JSON.parse(raw);if(account.role!=='teacher'&&saved.studentResetVersion!==STUDENT_RESET_VERSION){localStorage.removeItem(slot);state=G.newGame();state.student={...account};return false;}if(saved.student?.username!==account.username||!saved.maps||!saved.stock||!Number.isInteger(saved.day)||saved.day<1)return false;state=G.migrateMetals(saved);state.student={...account};state.bench=null;state.smelting=null;state.inspection=null;Sanctuary.attach(state,account);return !!state.shopName;}catch(e){return false;}}
function sanctuarySync(){if(!studentSession)return;Sanctuary.attach(state,studentSession);G.grantTeacherSupplies(state,studentSession);Sanctuary.scheduleVisit(state);$('sanctuary-open').hidden=false;sanctuarySave();}
function sanctuaryDraw(){const p=state.sanctuary;if(!p?.relics.map||state.region!==p.region||!p.portal)return;const x=p.portal.x*TILE,y=p.portal.y*TILE;ctx.save();ctx.globalAlpha=p.relics.lens?1:.6;prop('portal',x-9,y-23,66,72);ctx.restore();label(p.opened?'균형의 성소':p.relics.lens?'문양이 새겨진 폐허':'지도 속 폐허',x+24,y-25);}
function sanctuaryPortrait(key,mood='neutral'){return key==='key'?REDRAW.smith?.[mood==='angry'?1:mood==='happy'?2:0]:key==='seal'?REDRAW.nobles?.[mood==='angry'?2:mood==='happy'?1:0]:(REDRAW['guests-'+mood]||REDRAW.portraits)?.[key==='map'?0:6];}
function openSanctuaryJournal(){if(!studentSession)return;stopRoute();Sanctuary.attach(state,studentSession);utility('sanctuary','특별의뢰','손님들의 특별한 부탁');const p=state.sanctuary,i=Number(p.region.slice(-1));$('utility-content').innerHTML=`<p>특별 의뢰를 해결하면 손님이 금화와 성소의 단서를 건넵니다. 퀘스트 물품은 가방 칸을 차지하지 않습니다.</p><div class="sanctuary-grid">${Sanctuary.relics.map(k=>`<article class="relic-card ${p.relics[k]?'obtained':''}"><img class="relic-image" src="${relicImage(k)}" alt="${Sanctuary.names[k]}"><h3>${Sanctuary.names[k]}</h3><p>${Sanctuary.quest(p,k).guest}</p><p>${p.relics[k]?'획득 완료':Sanctuary.quest(p,k).reward+'C + 단서'}</p><button data-relic="${k}" ${p.relics[k]||!Sanctuary.canQuest(state,k)?'disabled':''}>${p.relics[k]?'보관 중':'손님 특별 의뢰'}</button></article>`).join('')}</div><div class="sanctuary-note">${p.relics.map?`<h3>지도가 가리키는 곳</h3><div class="sanctuary-map">${Array.from({length:9},(_,n)=>`<span class="${n===i?'target':''}">${n===i?'✧':'·'}</span>`).join('')}</div><p>전체 숲 지도에서 위에서 ${Math.floor(i/3)+1}번째 줄, 왼쪽에서 ${i%3+1}번째 구역 · ${state.maps[p.region].name}</p>`:'지도 조각을 얻으면 목적지를 확인할 수 있습니다.'}${p.relics.lens?`<p>나의 렌즈 각인: <b>${p.lens}</b></p>`:''}<p>${Sanctuary.allRelics(p)?'단서가 모두 모였습니다. 목적지의 폐허로 걸어가 렌즈와 열쇠를 사용하세요.':'네 손님의 의뢰를 해결해 주세요. 특별 손님은 6일차부터 방문합니다. 방문 중인 손님의 의뢰만 받을 수 있습니다.'}</p></div>${p.lastAttemptDay===state.day&&!p.finalPassed?'<p class="sanctuary-locked">게임 속 '+state.day+'일차의 최종 도전은 끝났어요. 영업을 마치고 '+(state.day+1)+'일차가 되면 다시 도전할 수 있어요.</p>':''}<button id="sanctuary-journal-exit">나가기</button>`;document.querySelectorAll('[data-relic]').forEach(b=>b.onclick=()=>openRelicQuest(b.dataset.relic));$('sanctuary-journal-exit').onclick=closeUtility;}
function openRelicQuest(key){const p=state.sanctuary,q=Sanctuary.quest(p,key);if(!q||state.phase!=='shop'||p.relics[key]||!Sanctuary.canQuest(state,key))return;window.activeQuestKey=key;utility('sanctuary',q.title,q.guest+' · 특별 의뢰');const portrait=sanctuaryPortrait(key);$('utility-content').innerHTML=`<div class="relic-customer">${portrait?'<img src="'+portrait+'" alt="'+q.guest+'">':''}<div><h3>${q.guest}</h3><p>“${q.greeting}”</p><div class="relic-reward"><img class="relic-image" src="${relicImage(key)}" alt="${Sanctuary.names[key]}"><b>${q.reward}C + ${Sanctuary.names[key]}</b></div></div></div><p class="sanctuary-note">${q.intro}</p><aside class="quest-conditions">${q.conditions}</aside><p class="quest-prompt">${q.prompt}</p><p class="leave-warning">⚠ 풀이 중 창을 벗어나면 오답 처리됩니다.</p>${q.cards?'<div class="electron-cards">'+q.cards.map(c=>'<button draggable="true" data-electron-card="'+c+'">'+relicIonLabel(c)+'</button>').join('')+'</div><div class="electron-slots"><button id="quest-from">전자 출발</button><span>→</span><button id="quest-to">전자 도착</button></div>':typeof q.answer==='string'?'<label>이온 <select id="quest-answer"><option value="">선택</option><option value="H+">H⁺</option><option value="Na+">Na⁺</option><option value="Cl-">Cl⁻</option><option value="OH-">OH⁻</option></select></label>':'<label>답 <input id="quest-answer" inputmode="text" autocomplete="off" placeholder="숫자 또는 분수"></label>'}<p id="quest-feedback" role="status"></p><div class="button-row"><button id="quest-submit" class="primary">답안 제출</button><button id="quest-exit">특별의뢰 목록으로</button></div>`;let picked='',from='',to='';if(q.cards){document.querySelectorAll('[data-electron-card]').forEach(b=>{b.onclick=()=>{picked=b.dataset.electronCard;};b.ondragstart=e=>{picked=b.dataset.electronCard;e.dataTransfer.setData('text/plain',picked);};});for(const slot of ['from','to']){const el=$('quest-'+slot),set=()=>{if(!picked)return;if(slot==='from')from=picked;else to=picked;el.textContent=relicIonLabel(picked);};el.onclick=set;el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();set();};}}
 $('quest-submit').onclick=()=>{const result=Sanctuary.submitQuest(state,key,q.cards?from+'>'+to:$('quest-answer').value);$('quest-feedback').textContent=result.message;if(!result.attempted)return;$('quest-submit').disabled=true;sanctuarySave();if(result.rejected){if(result.departingGuest&&typeof showAngryDeparture==='function'){showAngryDeparture(result);return;}render();$('utility-content').innerHTML='<section class="quiz-outcome"><span class="quiz-outcome-mark" aria-hidden="true">◇</span><h3>'+q.guest+'</h3><p>“'+result.message+'”</p><button id="quest-result-exit" class="primary">돌아가기</button></section>';$('quest-result-exit').onclick=closeUtility;return;}render();showRelicReward(key,q.reward);};$('quest-exit').onclick=openSanctuaryJournal;}
function showRelicReward(key,reward){
 utility('relic-reward','특별의뢰 완료','손님이 건넨 성소의 단서');
 const giver=Sanctuary.quest(state.sanctuary,key);
 const captions={map:'숲 어딘가의 폐허가 지도 위에서 빛납니다.',lens:'렌즈 속에 나만의 문양이 새겨졌습니다.',key:'오래된 성소의 문을 열 열쇠입니다.',seal:'성소의 봉인을 풀 은빛 인장입니다.'};
 $('utility-content').innerHTML='<section class="relic-reveal" role="status"><div class="relic-rays" aria-hidden="true"></div><span class="relic-spark spark-one" aria-hidden="true">✦</span><span class="relic-spark spark-two" aria-hidden="true">✧</span><span class="relic-spark spark-three" aria-hidden="true">✦</span><p class="overline">새로운 보물 획득</p><img class="relic-prize" src="'+relicImage(key)+'" alt="'+Sanctuary.names[key]+'"><h3>'+Sanctuary.names[key]+'</h3><p>'+captions[key]+'</p><div class="relic-coins">+'+reward+' C</div><blockquote class="relic-thanks">“'+giver.thanks+'”<cite>— '+giver.guest+'</cite></blockquote></section><div class="dialog-actions"><button id="relic-reward-continue" class="primary">보관하고 돌아가기</button></div>';
 $('relic-reward-continue').onclick=()=>{closeUtility();if(state.phase==='end'&&typeof showSummary==='function')showSummary();};
}
function sanctuaryVisual(q){
 const v=q.visual;if(!v)return '';
 if(v.kind==='pies'){
  return '<div class="trial-pies" aria-label="'+v.scope+'">'+v.groups.map(g=>{
   let angle=-Math.PI/2;
   const slices=g.parts.map(([n,d])=>{const end=angle+2*Math.PI*n/d,mid=(angle+end)/2,x1=100+78*Math.cos(angle),y1=100+78*Math.sin(angle),x2=100+78*Math.cos(end),y2=100+78*Math.sin(end);angle=end;return '<path d="M100 100L'+x1+' '+y1+'A78 78 0 '+(n/d>.5?1:0)+' 1 '+x2+' '+y2+'Z" fill="#eee5cf" stroke="#6c705e" stroke-width="1.5"/><text x="'+(100+52*Math.cos(mid))+'" y="'+(105+52*Math.sin(mid))+'" text-anchor="middle" fill="#273a2f">'+n+'/'+d+'</text>';}).join('');
   return '<figure><figcaption>'+g.label+'</figcaption><svg viewBox="0 0 200 200" role="img" aria-label="'+g.label+' '+v.scope+': '+g.parts.map(([n,d])=>n+'/'+d).join(', ')+'">'+slices+'</svg></figure>';
  }).join('')+'<p>'+v.scope+' · 각 영역은 서로 다른 이온을 나타냅니다.</p></div>';
 }
 if(v.kind==='particles')return '<div class="trial-model" role="img" aria-label="'+(v.scope||'이온 수 모형')+'">'+v.groups.map(([name,text])=>'<div><strong>'+name+'</strong><p>'+text+'</p></div>').join('')+'<small>'+v.caption+'</small></div>';
 if(v.kind==='pie'){
  let angle=-Math.PI/2;const colors=['#94b3a1','#b7a5c3','#d6bb7a','#93b5cb'];
  const slices=v.parts.map(([name,n,d],i)=>{const end=angle+2*Math.PI*n/d,x1=100+76*Math.cos(angle),y1=100+76*Math.sin(angle),x2=100+76*Math.cos(end),y2=100+76*Math.sin(end),mid=(angle+end)/2;angle=end;return '<path d="M100 100L'+x1+' '+y1+'A76 76 0 '+(n/d>.5?1:0)+' 1 '+x2+' '+y2+'Z" fill="'+colors[i]+'" stroke="#3d493e"/><text x="'+(100+49*Math.cos(mid))+'" y="'+(105+49*Math.sin(mid))+'" text-anchor="middle" fill="#16241d">'+(n===1?'1/'+d:n+'/'+d)+'</text>';}).join('');
  return '<div class="trial-pie"><svg viewBox="0 0 200 200" role="img" aria-label="가의 전체 이온 수 비율">'+slices+'</svg><ul>'+v.parts.map(([name,n,d],i)=>'<li><span style="background:'+colors[i]+'"></span>'+name+' : '+n+'/'+d+'</li>').join('')+'</ul></div>';
 }
 const maxX=v.points.at(-1)[0],maxY=Math.max(...v.points.map(p=>p[1])),X=x=>48+300*x/maxX,Y=y=>160-105*y/maxY;
 return '<svg class="sanctuary-chart" viewBox="0 0 410 215" role="img" aria-label="'+v.x+'에 따른 '+v.y+'"><path d="M48 34V160H370" fill="none" stroke="currentColor"/><polyline points="'+v.points.map(([x,y])=>X(x)+','+Y(y)).join(' ')+'" fill="none" stroke="#bfa774" stroke-width="3"/>'+v.points.map(([x,y])=>'<circle cx="'+X(x)+'" cy="'+Y(y)+'" r="4" fill="#eee1bb"/><text x="'+X(x)+'" y="179" text-anchor="middle">'+x+'</text><text x="'+X(x)+'" y="'+(Y(y)-10)+'" text-anchor="middle">'+y+'</text>').join('')+'<text x="45" y="22">'+v.y+'</text><text x="90" y="205">'+v.x+'</text></svg>';
}

function sanctuarySheet(q,p){return `<article class="trial-sheet">${sanctuaryProgress(p)}<header class="trial-header"><span class="trial-badge">시련 ${q.trialNumber} / 3 · 기록 ${String(q.setNumber).padStart(2,'0')}</span><h3>${q.title}</h3></header><section class="trial-description"><p>${q.intro}</p></section><section class="trial-data" aria-label="실험 자료">${sanctuaryVisual(q)}<div class="trial-table-wrap"><table class="trial-table"><thead><tr>${q.headers.map(x=>'<th>'+x+'</th>').join('')}</tr></thead><tbody>${q.rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')}</tbody></table></div></section><aside class="trial-conditions"><strong>공통 조건</strong><p>물의 자동 이온화는 무시한다. HCl, NaOH, KOH는 수용액에서 완전히 이온화하며, H⁺와 OH⁻는 1 : 1로 반응한다. 혼합 용액의 부피는 혼합 전 각 수용액의 부피의 합과 같다. N은 입자 수를 나타내는 기준값이다.</p><p>${q.conditions||'온도는 일정하다.'}</p></aside><section class="trial-response"><h4>${q.prompt}</h4><label for="trial-answer">답안</label><input id="trial-answer" aria-describedby="trial-input-help" inputmode="text" autocomplete="off" placeholder="숫자 또는 분수 입력"><p id="trial-input-help">단위 없이 입력하세요. 예: 3, 2/3</p><p class="leave-warning">⚠ 풀이 중 창을 벗어나면 오늘의 도전이 오답 처리됩니다.</p><p id="trial-feedback" role="status"></p></section><footer class="trial-actions"><button id="trial-submit" class="primary">답안 제출</button><button id="trial-reset" ${p.resetUsed?'disabled':''}>${p.resetUsed?'변경 사용 완료':'문제 변경 · 1회'}</button><button id="trial-exit">나중에 도전</button></footer></article>`;}

function sanctuaryProgress(p){
 const done=Sanctuary.completedTrials(p);
 return '<ol class="trial-progress" aria-label="3가지 시련 · '+done+'개 통과">'+[1,2,3].map(n=>'<li class="'+(n<=done?'passed':n===done+1?'current':'sealed')+'"'+(n===done+1?' aria-current="step"':'')+'><span class="trial-progress-gem" aria-hidden="true">'+(n<=done?'✦':n)+'</span><span>시련 '+n+'<small>'+(n<=done?'통과':n===done+1?'도전 중':'봉인됨')+'</small></span></li>').join('')+'</ol>';
}
function sanctuaryVerdict(r,p,settled=false){
 const win=r.ok,complete=r.cleared,done=Sanctuary.completedTrials(p);
 const title=complete?'3가지 시련 완수':win?'시련 '+r.trialNumber+' 통과':(typeof state!=='undefined'&&state.day?'게임 속 '+state.day+'일차 도전은 끝났습니다':'오늘의 도전은 끝났습니다');
 const detail=complete?'세 봉인이 풀리고, 당신의 증표가 모습을 드러냅니다.':win?'봉인이 풀렸습니다. 다음 시련으로 이동합니다.':'봉인이 다시 닫혔습니다. 게임 속 하루가 지나면('+(typeof state!=='undefined'&&state.day?'오늘 영업을 마치고 '+(state.day+1)+'일차':'영업을 마치고 다음 날')+') 새로운 문제로 도전할 수 있어요.';
 return '<section class="trial-verdict '+(win?'success':'failure')+(complete?' complete':'')+(settled?' settled':'')+'" role="status" aria-live="polite">'+sanctuaryProgress(p)+'<div class="trial-seal" aria-hidden="true"><i class="trial-aura"></i><i class="trial-wave"></i><svg viewBox="0 0 240 240"><g class="trial-orbit"><circle cx="120" cy="120" r="97"/><path d="M120 16L210 68V172L120 224L30 172V68Z"/></g><circle cx="120" cy="120" r="76"/><path class="trial-triangle" d="M120 58L176 155H64Z"/><path class="trial-rune" d="M120 85L147 120L120 155L93 120Z"/><circle class="trial-center" cx="120" cy="120" r="8"/>'+(!win?'<path class="trial-crack" d="M127 25L103 73L134 93L100 139L130 156L109 218"/>':'')+'</svg>'+Array.from({length:12},(_,i)=>'<i class="trial-spark" style="--angle:'+i*30+'deg;--reach:'+(105+i%3*20)+'px;--delay:'+i%4*65+'ms"></i>').join('')+'</div><p class="trial-verdict-kicker">'+(complete?'균형의 연금술사':win?'봉인 해제':'봉인 유지')+'</p><h3>'+title+'</h3><p>'+detail+'</p>'+(!win&&done?'<p class="trial-kept">통과한 '+done+'가지 시련은 저장되었습니다.</p>':'')+(settled&&complete?'<button id="trial-code-open" class="primary">내 클리어 코드 확인</button>':!win?'<button id="trial-exit" class="secondary">탐사 계속하기</button>':'<div class="trial-transition-track" aria-hidden="true"><i></i></div>')+'</section>';
}
let sanctuaryEffectTimer=null,sanctuaryEffectToken=0;
function cancelSanctuaryTransition(){if(sanctuaryEffectTimer!==null)clearTimeout(sanctuaryEffectTimer);sanctuaryEffectTimer=null;sanctuaryEffectToken++;window.sanctuaryCelebrating=false;}
function showSanctuaryResult(r,after){
 cancelSanctuaryTransition();const token=sanctuaryEffectToken,current=state,owner=studentSession?.username;
 window.sanctuaryCelebrating=true;
 $('utility-content').innerHTML=sanctuaryVerdict(r,state.sanctuary);
 $('utility-dialog').scrollTop=0;
 $('utility-content').scrollTop=0;
 if(!r.ok)$('trial-exit').onclick=closeUtility;
 const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 sanctuaryEffectTimer=setTimeout(()=>{
  if(token!==sanctuaryEffectToken||state!==current||studentSession?.username!==owner||!$('utility-dialog').open)return;
  sanctuaryEffectTimer=null;window.sanctuaryCelebrating=false;after();
 },reducedMotion?180:r.cleared?1900:r.ok?1300:1100);
}

function openSanctuaryPortal(){const p=state.sanctuary;if(!p?.relics.map)return;stopRoute();utility('sanctuary','균형의 성소','폐허에 남겨진 문양');if(p.finalPassed){$('utility-content').innerHTML='<p>이미 3가지 시련을 통과했습니다.</p><button id="sanctuary-code">내 코드 확인</button>';$('sanctuary-code').onclick=()=>{closeUtility();showClearance();};return;}
 if(!p.opened){$('utility-content').innerHTML=`<p>지도 조각이 가리킨 폐허입니다. 나의 렌즈를 장착하고 성소 열쇠와 은빛 인장을 결합하세요.</p><p>${Sanctuary.relics.map(k=>Sanctuary.names[k]+': '+(p.relics[k]?'보유':'미보유')).join(' · ')}</p><label>렌즈 각인 <select id="sanctuary-lens"><option value="">렌즈 선택</option>${p.relics.lens?'<option value="'+p.lens+'">'+p.lens+'</option>':''}</select></label><p id="sanctuary-feedback" role="status"></p><button id="sanctuary-unlock" class="primary">렌즈 장착 · 열쇠 결합</button>`;$('sanctuary-unlock').onclick=()=>{const r=Sanctuary.enter(state,$('sanctuary-lens').value);$('sanctuary-feedback').textContent=r.message||'성소가 열렸습니다.';if(r.ok){sanctuarySave();renderFinalTrial();render();}};return;}renderFinalTrial();}
function renderFinalTrial(){
 const p=state.sanctuary;
 utility('sanctuary','3가지 시련','균형의 성소 · 세 봉인을 해제하세요');
 if(p.finalPassed){$('utility-content').innerHTML=sanctuaryVerdict({ok:true,cleared:true,completed:3},p,true);$('trial-code-open').onclick=()=>{state.clearancePresented=true;closeUtility();showClearance();};return;}
 if(p.lastAttemptDay>=state.day){$('utility-content').innerHTML=sanctuaryVerdict({ok:false,completed:Sanctuary.completedTrials(p)},p,true);$('trial-exit').onclick=closeUtility;return;}
 const q=Sanctuary.question(p);$('utility-content').innerHTML=sanctuarySheet(q,p);
 $('utility-dialog').scrollTop=0;
 $('utility-content').scrollTop=0;
 $('trial-exit').onclick=closeUtility;
 $('trial-reset').onclick=()=>{const r=Sanctuary.resetQuestion(state);if(r.ok){sanctuarySave();renderFinalTrial();}$('trial-feedback').textContent=r.message;};
 let submitted=false;
 $('trial-submit').onclick=()=>{
  if(submitted)return;
  const r=Sanctuary.submit(state,$('trial-answer').value,q.id);
  if(!r.attempted){$('trial-feedback').textContent=r.message;return;}
  submitted=true;sanctuarySave();
  showSanctuaryResult(r,()=>{
   if(r.cleared){state.clearancePresented=true;closeUtility();showClearance();}
   else{render();renderFinalTrial();}
  });
 };
}
$('sanctuary-open').onclick=openSanctuaryJournal;
window.addEventListener?.('pagehide',sanctuarySave);
