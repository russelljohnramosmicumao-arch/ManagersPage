'use strict';
(()=>{
const panel=document.getElementById('drawerCoinAudit');
if(!panel||!window.KBRCloud)return;
const body=panel.querySelector('#drawerCoinAuditRows');
const status=panel.querySelector('#drawerCoinAuditStatus');
const csvButton=panel.querySelector('#drawerCoinAuditCSV');
const refreshButton=panel.querySelector('#drawerCoinAuditRefresh');
let shifts=[],loading=false,ready=false;
const counts=[1,5,10,20,50,100,500,1000];
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=t=>t?new Date(t).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'—';
const q=(v,n)=>Number(v?.[n]||0);
const coins=d=>[1,5,10,20].reduce((t,n)=>t+q(d,n)*n,0);
function denominationTable(entry){
 const previous=entry.priorClosing||{},opening=entry.opening||{},closing=entry.closing||{};
 const hasOpening=Object.keys(opening).length>0;
 const hasPrior=Object.keys(previous).length>0;
 const hasClosing=Object.keys(closing).length>0;
 const status=hasPrior&&hasOpening
   ?entry.coinMatch?'MATCH: opening coins match last closing':'MISMATCH: opening coin count differs'
   :!hasPrior?'No previous closing count available':'Opening denomination count missing';
 const diffs=counts.filter(n=>n<=20&&hasPrior&&hasOpening&&q(opening,n)!==q(previous,n));
 const totals='<div class="drawer-audit-totals"><div>Coins carried overnight<strong>'+money(entry.closingCoins)+'</strong></div>'+
 '<div>₱50–₱1,000 bills taken out<strong>'+money(entry.billsTaken)+'</strong></div>'+
 '<div>Cash paid to kitchen<strong>'+money(entry.kitchenPayout)+'</strong></div>'+
 '<div>Closing cash counted<strong>'+money(entry.closingCount)+'</strong></div></div>';
 const rows=counts.map(n=>'<tr><td>₱'+n.toLocaleString('en-PH')+'</td><td>'+ (hasPrior?q(previous,n):'—')+
 '</td><td>'+ (hasOpening?q(opening,n):'—')+
 '</td><td>'+ (hasClosing?q(closing,n):'—')+'</td><td>'+
 (hasPrior&&hasOpening&&n<=20?(q(opening,n)-q(previous,n)).toLocaleString('en-PH',{signDisplay:'exceptZero'}):'—')+'</td></tr>').join('');
 const note='<p class="'+(entry.coinMatch===false?'drawer-audit-warning':'drawer-audit-note')+'">'+esc(status)+
 (diffs.length?' · '+diffs.map(n=>'₱'+n+' ('+q(previous,n)+' → '+q(opening,n)+')').join(', '):'')+'</p>';
 return '<div class="drawer-audit-header"><span>Opening: '+esc(when(entry.openedAt))+' · '+esc(entry.openedBy||'—')+
 '</span><span>Closing: '+esc(when(entry.closedAt))+' · '+esc(entry.closedBy||'—')+'</span></div>'+
 note+'<p>Previous closing coins: <b>'+money(coins(previous))+'</b> · Actual opening coins: <b>'+money(entry.openingCoins)+'</b></p>'+
 '<div class="scroll"><table><thead><tr><th>Denomination</th><th>Previous closing (pcs)</th><th>Staff opening (pcs)</th><th>Staff closing (pcs)</th><th>Opening variance (pcs)</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+totals+
 '<p>Cash variance against expected drawer: <strong>'+money(entry.cashVariance)+'</strong>. The denominations are the actual numbers typed by the cashier and saved with the opening/closing events.</p>';
}
function draw(){
 body.replaceChildren();
 if(!shifts.length){body.textContent='No cash shifts recorded yet.';return;}
 for(const entry of shifts){
  const detail=document.createElement('details');detail.className='drawer-audit-shift';
  const label=document.createElement('summary');
  label.textContent=when(entry.openedAt)+' · '+(entry.status==='open'?'OPEN': 'CLOSED')+' · '+(entry.coinMatch===true?'Coins matched':entry.coinMatch===false?'COIN DIFFERENCE':'Not compared')+' · Bills '+money(entry.billsTaken);
  detail.append(label);
  const inside=document.createElement('div');inside.innerHTML=denominationTable(entry);detail.append(inside);body.append(detail);
 }
}
async function load(){
 if(loading)return;loading=true;refreshButton.disabled=true;status.textContent='Loading manager-only denomination records…';
 try{
  const result=await KBRCloud.rpc('kbr_manager_drawer_denominations_report',{p_limit:90});
  if(!Array.isArray(result))throw Error('Invalid denomination report.');
  shifts=result;ready=true;draw();status.textContent='Showing '+result.length+' shop shifts. This report is manager-only; cashier opening screens never display the previous count.';
  csvButton.disabled=false;
 }catch(e){status.textContent='Unable to load denomination report: '+(e.message||e);}
 finally{loading=false;refreshButton.disabled=false;}
}
panel.addEventListener('toggle',()=>{if(panel.open&&!ready)load();});
refreshButton.addEventListener('click',load);
csvButton.addEventListener('click',()=>{
 const headers=['Opened at','Closed at','Opened by','Closed by','Coin match','Opening coins','Closing coins','Bills withdrawn','Kitchen payout','Closing count','Cash variance'];
 for(const phase of ['previous','opening','closing'])for(const n of counts)headers.push(phase+' ₱'+n+' pieces');
 const rows=[headers,...shifts.map(s=>[s.openedAt,s.closedAt,s.openedBy,s.closedBy,s.coinMatch,s.openingCoins,s.closingCoins,s.billsTaken,s.kitchenPayout,s.closingCount,s.cashVariance,...['priorClosing','opening','closing'].flatMap(phase=>counts.map(n=>q(s[phase],n)))])];
 const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
 const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='KBR-coin-and-bill-audit.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
})();