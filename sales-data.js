'use strict';
window.KBRSales=(()=>{
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'});
function day(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const parts=Object.fromEntries(dateFormat.formatToParts(d).map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
function normalize(row){const r=row.receipt||row;const when=row.created_at||r.orderedAt;return {...r,_cloudId:row.id||r._cloudId,orderedAt:when||null,completedAt:row.updated_at||null,day:when?day(when):(r.dayKey||day(`${r.date||''} ${r.time||''}`))};}
function aggregate(rows,start,end){const selected=rows.filter(r=>!r.cancelled&&r.day&&r.day>=start&&r.day<=end),byDrink={},bySize={},byDay={},byHour={},byCategory={},byService={},consumptionBySize={},freeByBarista={};let sales=0,drinks=0,food=0,consumptionDrinks=0,consumptionFood=0,freeDrinkValue=0,ownerChargeValue=0,freeDrinks=0;
const add=(o,k,q)=>o[k||'Unspecified']=(o[k||'Unspecified']||0)+q;
for(const r of selected){const nonSale=KBRPayments.isNonSale(r);sales+=KBRPayments.sales(r);add(byDay,r.day,1);add(byService,r.serviceType,1);
if(r.payment==='barista-drink'){freeDrinkValue+=KBRPayments.value(r);add(freeByBarista,r.baristaName||r.compRecord?.person,1);freeDrinks++;}if(r.payment==='kuya-john')ownerChargeValue+=KBRPayments.value(r);
let hour='Unknown';if(r.orderedAt)hour=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',hour:'2-digit',hourCycle:'h23'}).format(new Date(r.orderedAt))+':00';else{const match=String(r.time||'').match(/(\d{1,2}):\d{2}\s*(AM|PM)?/i);if(match){let h=Number(match[1]);if(match[2])h=h%12+(/pm/i.test(match[2])?12:0);hour=String(h).padStart(2,'0')+':00';}}add(byHour,hour,1);
for(const item of r.items||[]){const q=Number(item.qty)||0;if(item.food){consumptionFood+=q;if(!nonSale)food+=q;}else{consumptionDrinks+=q;const physicalSize=String(item.size||'').match(/\b(12|16|22)\s*oz\b/i);add(consumptionBySize,physicalSize?physicalSize[1]+' oz':item.size,q);if(!nonSale){drinks+=q;add(byDrink,[item.name,item.type==='premium'?'Premium':''].filter(Boolean).join(' · '),q);add(bySize,item.size,q);}}if(!nonSale)add(byCategory,item.category,q);}}
const days=Math.max(1,Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1);
return {selected,sales,drinks,food,days,byDrink,bySize,byDay,byHour,byCategory,byService,consumptionBySize,consumptionDrinks,consumptionFood,freeDrinkValue,ownerChargeValue,freeDrinks,freeByBarista};}
return {day,normalize,aggregate};})();
