(function(root){
'use strict';
function guest(){
 let id=null,index=NaN;
 try{id=localStorage.getItem('alchemy.demo.id');index=Number(localStorage.getItem('alchemy.demo.index'));}catch(e){}
 if(!id){id='체험'+Math.floor(1000+Math.random()*9000);index=Math.floor(Math.random()*40);
  try{localStorage.setItem('alchemy.demo.id',id);localStorage.setItem('alchemy.demo.index',String(index));}catch(e){}}
 return {username:id,role:'student',assignmentIndex:Number.isInteger(index)?index:0,studentId:null,grade:null,classNumber:null};
}
root.StudentGate={verify:async()=>guest()};
})(typeof window==='undefined'?globalThis:window);
