(function(root){
'use strict';
const fixedCodes={};// FIXED_CODES
const mission='alchemy-2026-term1',areas=['identification','neutralization','redox','recovery'];
function qualified(state,account){const p=state?.sanctuary;const trialsReady=p?.trialVersion!==1||(p.trials?.length===3&&new Set(p.trials.map(t=>t.questionId)).size===3&&p.trials.every(t=>p.history?.some(h=>h.passed===true&&h.questionId===t.questionId)));return trialsReady&&account?.role==='student'&&p?.version===2&&p.owner===account.username&&p.opened===true&&['map','lens','key','seal'].every(k=>p.relics?.[k]===true)&&p.finalPassed===true&&p.history?.some(h=>h.passed===true);}
function randomCode(preview=false){const a='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';const values=new Uint8Array(20);root.crypto.getRandomValues(values);const chars=Array.from(values,x=>a[x%a.length]).join('');return (preview?'TEST':'ALC1')+'-'+chars.match(/.{5}/g).join('-');}
async function accountKey(account){if(!account?.username)throw Error('로그인이 필요합니다.');const digest=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(mission+'\0'+account.username));return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');}
async function clearSaved(account,storage=root.localStorage){if(!account||account.role==='teacher')return;storage.removeItem('alchemy.clearance.v1.'+await accountKey(account));}
async function issue(state,account,storage=root.localStorage){
 if(!qualified(state,account))throw Error('최종 시련을 모두 통과해야 합니다.');
 const key=await accountKey(account),slot='alchemy.clearance.v1.'+key;
 const code='DEMO-'+key.slice(0,20).toUpperCase().match(/.{5}/g).join('-');
 
 let saved=null;try{saved=JSON.parse(storage.getItem(slot)||'null');}catch{}
 const record={mission,accountKey:key,code,studentResetVersion:state.studentResetVersion,issuedAt:saved?.accountKey===key&&saved?.mission===mission&&saved?.code===code&&saved?.studentResetVersion===state.studentResetVersion&&saved?.issuedAt?saved.issuedAt:new Date().toISOString(),status:'local-unverified',version:3};
 storage.setItem(slot,JSON.stringify(record));return record;
}
root.Clearance={qualified,issue,clearSaved,preview:()=>({code:"TEST-SN6DN-82YVH-DS93E-CUHCU",status:'teacher-preview'})};
})(typeof window==='undefined'?globalThis:window);
