(()=>{'use strict';
const $=id=>document.getElementById(id);
const box=$('salesDashboard');
if(!box||!window.KBRCloud)return;
const fmt=n=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(n)||0);
const numeric=n=>Number(n);
let financialToken=0,cashToken=0,latestRange='',cashLoading=false;
const tiles=[
 {id:'gross',name:'Current Gross Profit',symbol:'₱',hint:'Café revenue minus drink and packaging costs',key:'grossProfit'},
 {id:'expenses',name:'Current Expenses',symbol:'▤',hint:'Operating expenses (not including product costs)',key:'expenses'},
 {id:'net',name:'Net Profit',symbol:'↗',hint:'Estimated café profit after known costs',key:'net'},
 {id:'kitchen',name:'Total Market Food',symbol:'♨',hint:'Kitchen-food sales, shown separately',key:'kitchen'},
 {id:'cash',name:'Cash Registry Total',symbol:'▣',hint:'Loading the current cash drawer…',key:'cash'},
 {id:'coins',name:'Total Coins on Hand',symbol:'◉',hint:'Last counted at open, handover, or close',key:'coins'}
];
const labels={
 gross:'Current Gross Profit',expenses:'Current Expenses',net:'Net Profit',
 kitchen:'Total Market Food',cash:'Cash Registry Total',coins:'Total Coins on Hand'
};
box.innerHTML=tiles.map(t=>'<article class="sales-kpi sales-kpi-'+t.id+'" aria-labelledby="sales-kpi-'+t.id+'-title"><div class="sales-kpi-heading"><span class="sales-kpi-symbol" aria-hidden="true">'+t.symbol+'</span><h2 id="sales-kpi-'+t.id+'-title">'+t.name+'</h2></div><div class="sales-kpi-amount" id="sales-kpi-'+t.id+'-value" aria-live="polite">—</div><p class="sales-kpi-detail" id="sales-kpi-'+t.id+'-hint">'+t.hint+'</p></article>').join('');
const set=(id,value,desc,bad=false)=>{
 const amount=$('sales-kpi-'+id+'-value');
 const hint=$('sales-kpi-'+id+'-hint');
 if(!amount||!hint)return;
 amount.textContent=value==null?'—':fmt(value);
 if(desc!=null)hint.textContent=desc;
 amount.classList.toggle('is-negative',!!bad);
};
window.addEventListener('kbr-sales-profit-report',e=>{
 const {r,start,end}=e.detail||{};
 if(!r||!start||!end)return;
 const direct=Number(r.ingredients||0)+Number(r.packaging||0);
 const expenses=Math.max(0,Number(r.costs||0)-direct);
 const gross=Number(r.revenue||0)-direct;
 const net=Number(r.profit||0);
 set('gross',gross,'Café sales minus ingredients and packaging',gross<0);
 set('expenses',expenses,'Wages, allowances, utilities, depreciation and other costs');
 set('net',net,(r.complete?'Estimated net earnings':'Estimate incomplete: check missing costs')+' · '+start+' to '+end,net<0);
 set('kitchen',Number(r.kitchen||0),'Kitchen-food sales excluded from café profit');
});
window.addEventListener('kbr-sales-profit-error',()=>{
 for(const id of ['gross','expenses','net','kitchen'])set(id,null,'Profit figures unavailable; see the detailed report below.');
});
window.addEventListener('kbr-sales-range',e=>{
 const {end,force}=e.detail||{};
 if(!end)return;
 const valid=String(end).match(/^\d{4}-\d{2}-\d{2}$/);
 if(!valid)return;
 if(end===latestRange&&!force)return;
 latestRange=end;
 refreshCash(end);
});
async function refreshCash(end){
 const token=++cashToken;
 set('cash',null,'Loading last saved cash registry…');
 set('coins',null,'Loading latest saved coin count…');
 cashLoading=true;
 try{
  const result=await KBRCloud.rpc('kbr_manager_sales_cash_tiles',{p_through_day:end});
  if(token!==cashToken)return;
  if(!result?.hasShift){
   set('cash',null,'No cash shift recorded by '+end);
   set('coins',null,'No opening, handover or closing count recorded');
   return;
  }
  set('cash',numeric(result.cashRegistry),result.cashBasis||'Recorded drawer total');
  if(result.hasCoinCount){
   const eventLabel={opening:'Opened',handover:'Handed over',close:'Closed'}[result.coinEvent]||'Counted';
   const at=result.coinCountedAt?new Date(result.coinCountedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}):'';
   set('coins',numeric(result.coinsOnHand),eventLabel+(at?' · '+at:'')+' · Not recalculated from sales');
  }else set('coins',null,'No verified denomination count for this shift');
 }catch(err){
  if(token!==cashToken)return;
  set('cash',null,'Cash register unavailable: '+(err.message||'please refresh'));
  set('coins',null,'Coin count unavailable: '+(err.message||'please refresh'));
 }finally{if(token===cashToken)cashLoading=false;}
}
})();