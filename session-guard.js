(function(root){
'use strict';
root.SessionGuard={isOpen:()=>true,scheduleOpen:()=>true,isClosed:()=>false,isAllowed:()=>true,closedMessage:()=>'',CLOSED_MESSAGE:''};
root.LeaveGuard={registerLeave(){},registerReturn(){},updateBadge(){}};
})(typeof window==='undefined'?globalThis:window);
