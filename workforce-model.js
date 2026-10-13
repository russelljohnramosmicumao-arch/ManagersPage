(function(root){'use strict';
const dayMs=86400000;
const dateAdd=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*dayMs).toISOString().slice(0,10);
const monday=day=>dateAdd(day,-((new Date(day+'T00:00:00Z').getUTCDay()+6)%7));
const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
const shiftHours=s=>{const a=minutes(s.start),b=minutes(s.end);return ((b-a+1440)%1440)/60;};
const localInput=iso=>new Date(Date.parse(iso)+8*3600000).toISOString().slice(0,16);
const localISO=value=>new Date(value+':00+08:00').toISOString();
function actualHours(records,id,week,now=Date.now()){const start=Date.parse(week+'T00:00:00+08:00'),end=start+7*dayMs;return records.filter(r=>r.barista_id===id).reduce((sum,r)=>sum+Math.max(0,Math.min(Date.parse(r.clocked_out_at)||now,end,now)-Math.max(Date.parse(r.clocked_in_at),start))/3600000,0);}
const api={dateAdd,monday,shiftHours,localInput,localISO,actualHours};root.KBRWorkforceModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
