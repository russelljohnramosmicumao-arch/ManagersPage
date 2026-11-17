(()=>{'use strict';let busy=false;const content=document.getElementById('inventoryComparison');const openCategories=new Set();let comparisonData=null;let ledger=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v==null?'-':Number(v).toLocaleString('en-PH',{maximumFractionDigits:2});
const date=v=>v?new Date(v).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'Date unavailable';
function displayQuantity(value,unit=''){
 if(value==null||!Number.isFinite(Number(value)))return '—';
 let amount=Number(value),u=String(unit).trim();const normalized=u.toLowerCase();
 if(['ml','l','g','kg'].includes(normalized)){
  const liquid=['ml','l'].includes(normalized);const base=amount*(['l','kg'].includes(normalized)?1000:1);
  const large=Math.abs(base)>=1000;amount=large?base/1000:base;u=liquid?(large?'L':'ml'):(large?'kg':'g');
 }
 return amount.toLocaleString('en-PH',{maximumFractionDigits:3})+(u?' '+u:'');
}
function completedCount(id,events){
 const event=events.filter(e=>e.kind==='complete'&&(e.payload||[]).some(v=>v.id===id)).sort((a,b)=>Date.parse(b.recorded_at)-Date.parse(a.recorded_at))[0];
 if(!event)return null;const count=event.payload.find(v=>v.id===id),item=event.result?.items?.find(v=>v.id===id);
 return {...count,item,time:item?.completedAt||event.recorded_at};
}
// Owner-only reference weights saved on this manager device; they do not change inventory.
const tareStorageKey='kbr_manager_container_measures_v2';
let tareWeights={},priorGramWeights={};
try{const saved=JSON.parse(localStorage.getItem('kbr_manager_container_weights_g_v1')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))priorGramWeights=saved;}catch{}
try{const saved=JSON.parse(localStorage.getItem(tareStorageKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))tareWeights=saved;}catch{}
function containerUnit(item){
 const name=String(item.name||'');
 if(/\b(jam|jelly|jellies)\b/i.test(name))return ['ml','l'].includes(String(item.unit||'').toLowerCase())?'ml':'g';
 if(item.categoryId==='syrups')return 'ml';
 if(item.categoryId==='powders-coffee-beans')return 'g';
 return null;
}
function tareColumn(item){
 const unit=containerUnit(item),syrup=unit==='ml',value=tareWeights[item.id]??(!syrup?priorGramWeights[item.id]:undefined);
 const old=SyrupPriorNotice(syrup,item.id,value);
 return '<td style="padding:10px;border-bottom:1px solid #ddd"><label style="font-size:12px">Container ('+unit+')<input type="number" data-container-tare="'+esc(item.id)+'" min="0" max="1000000" step="any" inputmode="decimal" value="'+(Number.isFinite(Number(value))&&value!==undefined?esc(value):'')+'" placeholder="0" aria-label="Container '+(syrup?'volume in milliliters':'weight in grams')+' for '+esc(item.name)+'" style="width:110px;display:block;padding:7px;margin-top:4px"></label>'+old+'</td>';
}
function SyrupPriorNotice(syrup,id,value){
 return syrup&&value===undefined&&priorGramWeights[id]!==undefined?'<small style="display:block;color:#875e26">Previously '+esc(priorGramWeights[id])+' g; enter ml</small>':'';
}
const categoryNames={'packaging':'Packaging','syrups':'Syrups','powders-coffee-beans':'Powders and Coffee Beans','carton-soda-cans-sinkers':'Carton, Soda, Cans, Sinkers','ice-creams':'Ice Creams','sanitation-miscellaneous':'Sanitation and Miscellaneous'};
function renderComparison(){if(!comparisonData)return;const {counts,live,events}=comparisonData;const projection=ledger?window.KBRStockBaselineModel.project({items:live,events,...ledger}):null;const liveStock=new Map(live.map(i=>[i.id,i]));const countedIds=new Set(counts.map(i=>i.id));const visibleRows=[...counts.map(i=>({...i,inventoryHidden:liveStock.get(i.id)?.inventoryHidden??i.inventoryHidden})),...live.filter(i=>!countedIds.has(i.id))];const groups=new Map();for(const item of visibleRows){const id=item.categoryId||item.category||'other';if(!groups.has(id))groups.set(id,{name:item.category||categoryNames[id]||id,items:[]});groups.get(id).items.push(item);}
 const cell=(v,note='',style='')=>'<td style="padding:10px;border-bottom:1px solid #ddd;'+style+'">'+esc(v)+(note?'<small style="display:block;font-weight:normal">'+esc(note)+'</small>':'')+'</td>';
 content.innerHTML='<p>Current stock = latest completed physical count − container amount − sales since the count + received supplies and restored cancellations. The calculation runs only when you open or refresh this view. Container amounts are stored on this manager device.</p>'+(projection?.warnings.length?'<p role="status">Check stock accuracy: '+esc(projection.warnings.join(' · '))+'</p>':'')+[...groups].map(([id,g])=>{
 const showTare=id==='syrups'||id==='powders-coffee-beans'; // Other categories can contain individual jam/jelly items
 return '<details data-inventory-category="'+esc(id)+'" '+(openCategories.has(id)?'open':'')+' style="border:1px solid #cad8cd;border-radius:10px;margin:12px 0;padding:12px"><summary style="cursor:pointer;font-weight:700;padding:8px">'+esc(g.name)+' <span style="font-weight:normal">('+g.items.length+')</span></summary><div style="overflow:auto"><table style="width:100%;text-align:left;border-collapse:collapse"><thead><tr>'+['Order','Ingredient','Latest count',id==='syrups'?'Container (ml)':id==='powders-coffee-beans'?'Container (g)':'Container','Sold since count','Current stock','Barista inventory'].map(v=>'<th style="padding:10px">'+v+'</th>').join('')+'</tr></thead><tbody>'+g.items.map(i=>{
  const previous=completedCount(i.id,events),estimate=projection?.items.get(i.id);const hasContainer=Boolean(containerUnit(i));
  const containerValue=hasContainer?(tareWeights[i.id]??(containerUnit(i)!=='ml'?priorGramWeights[i.id]:undefined)):undefined;
  const container=containerValue===undefined?0:Number(containerValue);
  const validContainer=Number.isFinite(container)&&container>=0;
  const current=estimate?.expected==null||!validContainer?null:Math.max(0,estimate.expected-container);
  const currentNote=estimate?.expected==null?(estimate?.note||'No completed count'):(!validContainer?'Invalid container amount':(i.countDirty?'New count pending upload · showing last completed count':'')+(Number(estimate.received||0)+Number(estimate.restored||0)>0?' · +'+displayQuantity(Number(estimate.received||0)+Number(estimate.restored||0),i.unit)+' received/restored':''));
  return '<tr><td style="padding:10px;border-bottom:1px solid #ddd"><input type="checkbox" data-order-item="'+esc(i.id)+'" aria-label="Add '+esc(i.name)+' to order list" '+(window.KBRInventoryOrderList?.has(i.id)?'checked':'')+'></td>'+cell(i.name)+cell(displayQuantity(previous?.gross,previous?.item?.unit||i.unit),previous?date(previous.time):'No completed count')+(hasContainer?tareColumn(i):cell('—'))+cell(displayQuantity(estimate?.used,i.unit))+cell(current==null?'—':displayQuantity(current,i.unit),currentNote,'font-weight:750')+'<td style="padding:10px;border-bottom:1px solid #ddd"><button type="button" data-inventory-hidden="'+esc(i.id)+'" aria-pressed="'+(!!i.inventoryHidden)+'" style="min-width:118px;padding:8px;border-radius:8px;border:1px solid #a18a72;background:'+(i.inventoryHidden?'#fff0eb':'#e8f5e8')+'">'+(i.inventoryHidden?'Not Available':'Available')+'</button></td></tr>';
 }).join('')+'</tbody></table></div></details>';
 }).join('');
 window.KBRInventoryOrderList?.updateItems([...rememberedItems.values()]);
 content.querySelectorAll('[data-inventory-category]').forEach(el=>el.addEventListener('toggle',()=>{if(!el.isConnected)return;const id=el.dataset.inventoryCategory;if(el.open)openCategories.add(id);else openCategories.delete(id);}));
 content.querySelectorAll('[data-container-tare]').forEach(input=>input.addEventListener('change',()=>{
  const id=input.dataset.containerTare,raw=input.value.trim();
  if(raw===''){delete tareWeights[id];}
  else{
   const n=Number(raw);if(!Number.isFinite(n)||n<0||n>1000000){input.setCustomValidity('Enter a valid container weight from 0 to 1,000,000 in the displayed unit.');input.reportValidity();return;}
   tareWeights[id]=n;
  }
  input.setCustomValidity('');
  try{localStorage.setItem(tareStorageKey,JSON.stringify(tareWeights));renderComparison();}
  catch{input.setCustomValidity('Unable to save in this browser.');input.reportValidity();}
 }));
 content.querySelectorAll('[data-inventory-hidden]').forEach(button=>button.addEventListener('click',async()=>{
  if(busy||button.disabled)return;
  const itemId=button.dataset.inventoryHidden,item=comparisonData?.live?.find(x=>x.id===itemId)||comparisonData?.counts?.find(x=>x.id===itemId);if(!item)return;
  const hidden=!Boolean(item.inventoryHidden);
  button.disabled=true;button.textContent='Saving…';
  try{
    const result=await KBRCloud.rpc('kbr_set_inventory_barista_hidden',{p_item_id:itemId,p_hidden:hidden});
    if(result?.error)throw Error(result.error);
    if(result?.id!==itemId)throw Error('Could not confirm inventory visibility change.');
    item.inventoryHidden=hidden;const counted=comparisonData?.counts?.find(x=>x.id===itemId);if(counted)counted.inventoryHidden=hidden;
    renderComparison();
  }catch(error){button.disabled=false;button.textContent=item.inventoryHidden?'Not Available':'Available';alert('Could not change inventory visibility: '+error.message);}
 }));

}
let selectedCategory='',requestSeq=0;const rememberedItems=new Map();
const categories=[['packaging','Packaging'],['syrups','Syrups'],['powders-coffee-beans','Powders & Coffee Beans'],['ice-creams','Ice Creams'],['carton-soda-cans-sinkers','Cartons, Soda & Sinkers'],['food','Food'],['sanitation-miscellaneous','Sanitation & Miscellaneous']];
const chooser=document.createElement('div');chooser.className='inventory-category-tiles';
const style=document.createElement('style');style.textContent='.inventory-category-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));gap:12px;margin:14px 0 20px}.inventory-category-tiles button{min-height:108px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px solid #d8c6b4;border-radius:14px;background:#fffaf4;color:#5b3825;font-weight:750;padding:14px;white-space:normal;text-align:center}.inventory-category-tiles button[aria-pressed=true]{background:#eadacc;border:2px solid #795337}.inventory-category-tiles .inventory-tile-icon{font-size:30px;line-height:1}.inventory-category-tiles .inventory-add-tile{border:1px dashed #a4876b;background:#f5eee5}.inventory-category-tiles button:focus-visible{outline:3px solid #99744e;outline-offset:2px}';document.head.append(style);
const icons=['🥤','🧴','☕','🍦','🥛','🥟','🧽'];
chooser.innerHTML=categories.map(([id,name],i)=>'<button type="button" data-cat="'+id+'" aria-pressed="false"><span class="inventory-tile-icon" aria-hidden="true">'+icons[i]+'</span><span>'+esc(name)+'</span></button>').join('');
const addTile=document.getElementById('openAddInventoryItem');if(addTile){addTile.classList.add('inventory-add-tile');addTile.innerHTML='<span class="inventory-tile-icon" aria-hidden="true">＋</span><span>Add Ingredient / Supply</span>';chooser.append(addTile);}
const panel=document.getElementById('addInventoryItemPanel');(panel||content).before(chooser);
document.querySelectorAll('[data-inventory-view]').forEach(b=>b.hidden=true);
for(const id of ['refreshInventoryComparison','inventoryBuildOrder']){const b=document.getElementById(id);if(b){b.hidden=true;b.style.display='none';}}
content.textContent='Select an inventory category.';
chooser.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;selectedCategory=b.dataset.cat;chooser.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));openCategories.add(selectedCategory);refresh();});
async function refresh(){if(document.hidden||document.getElementById('panel-inventory')?.hidden||document.getElementById('inventoryCurrentView')?.hidden||!selectedCategory)return;const seq=++requestSeq,category=selectedCategory;busy=true;content.textContent='Loading '+categories.find(x=>x[0]===category)[1]+'…';try{
 const data=await KBRCloud.rpc('kbr_manager_inventory_category',{p_category:category});if(seq!==requestSeq)return;
 const dates=data.events.flatMap(e=>e.result?.items?.map(i=>i?.completedAt||e.recorded_at)||[]).filter(Boolean).map(Date.parse).filter(Number.isFinite);
 const earliest=dates.length?new Date(Math.min(...dates)).toISOString():null;
 let sources=[];
 if(earliest){const since=encodeURIComponent(earliest);sources=await Promise.allSettled([
 KBRCloud.rows('/rest/v1/kbr_stock_usage?select=order_id,status,plan,created_at&created_at=gte.'+since),
 KBRCloud.rows('/rest/v1/kbr_orders?select=id,order_number,status,data,receipt,created_at'),
 KBRCloud.rows('/rest/v1/kbr_supply_orders?status=eq.received&received_at=gte.'+since+'&select=id,status,items,received_at'),
 KBRCloud.rows('/rest/v1/kbr_transaction_cancellations?select=*')]);}
 if(seq!==requestSeq)return;
 ledger={errors:[],uses:[],orders:[],supplies:[],cancellations:[]};const keys=['uses','orders','supplies','cancellations'];sources.forEach((r,i)=>{ledger[keys[i]]=r.status==='fulfilled'?r.value:[];if(r.status==='rejected')ledger.errors.push(keys[i]+' unavailable: '+r.reason.message);});
 if(earliest&&ledger.cancellations.length){const known=new Set(ledger.uses.map(u=>u.order_id));const missing=[...new Set(ledger.cancellations.map(x=>x.order_id).filter(x=>x&&!known.has(x)))];for(let i=0;i<missing.length;i+=50){try{ledger.uses.push(...await KBRCloud.rows('/rest/v1/kbr_stock_usage?select=order_id,status,plan,created_at&order_id=in.('+missing.slice(i,i+50).join(',')+')'));}catch(e){ledger.errors.push('Cancellation usage unavailable: '+e.message);}}}
 if(seq!==requestSeq)return;comparisonData=data;for(const i of data.live)rememberedItems.set(i.id,i);renderComparison();if(!data.counts.length&&!data.live.length)content.textContent='No items in this category.';else content.insertAdjacentHTML('afterbegin','<p style="font-size:12px">Updated '+esc(date(new Date().toISOString()))+'</p>');
 }catch(e){if(seq===requestSeq)content.textContent='Could not refresh inventory: '+e.message+' — press Refresh to retry.';}finally{if(seq===requestSeq)busy=false;}}
async function activity(){const host=document.getElementById('inventoryActivity');try{const uses=await KBRCloud.request('/rest/v1/kbr_stock_usage?select=*&order=created_at.desc&limit=30');if(!uses.length){host.textContent='No ingredient deduction records yet.';return;}const ids=uses.map(u=>u.order_id).join(',');const [moves,orders]=await Promise.all([KBRCloud.rows('/rest/v1/kbr_stock_movements?order_id=in.('+ids+')&select=*&order=created_at.desc'),KBRCloud.rows('/rest/v1/kbr_orders?id=in.('+ids+')&select=id,data,status,receipt,created_at')]);const map=new Map(orders.map(o=>[o.id,o]));const live=await KBRCloud.request('/rest/v1/kbr_inventory_state?id=eq.1&select=items'),items=new Map((live[0]?.items||[]).map(i=>[i.id,i]));host.innerHTML=uses.map(u=>{const o=map.get(u.order_id),list=moves.filter(m=>m.order_id===u.order_id),names=(o?.data?.items||o?.receipt?.items||[]).map(i=>(i.qty||1)+' × '+i.name+' '+(i.size||'')).join(', ');return '<details class="activity-card"><summary>'+esc(new Date(u.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'}))+' · '+esc(names||u.order_id.slice(0,8))+' · '+esc(o?.status==='cancelled'?'Cancelled / recorded deductions restored':u.status)+'</summary><p>Order '+esc(u.order_id)+'</p>'+list.map(v=>'<p>'+esc(items.get(v.item_id)?.name||v.item_id)+' · −'+esc(displayQuantity(v.quantity,items.get(v.item_id)?.unit))+' · '+esc(displayQuantity(v.stock_before,items.get(v.item_id)?.unit))+' → '+esc(displayQuantity(v.stock_after,items.get(v.item_id)?.unit))+'</p>').join('')+(u.issues?.length?'<p>Needs attention: '+esc(u.issues.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('; '))+'</p>':'')+'</details>';}).join('');}catch(e){host.textContent='Stock activity unavailable: '+e.message;}}
// Current stock is calculated only on demand (opening the Inventory view or pressing Refresh).
// New sales remain authoritative in the transaction ledger; do not rewrite stock balances here.
document.getElementById('refreshInventoryComparison').onclick=refresh;
const historyHost=document.getElementById('inventoryActivity');const historyBox=document.createElement('details');historyBox.innerHTML='<summary style="cursor:pointer;font-weight:700;padding:12px">Stock history — open to load</summary>';const heading=historyHost.previousElementSibling?.previousElementSibling;if(heading?.tagName==='H2'){historyHost.previousElementSibling.hidden=true;heading.hidden=true;}historyHost.before(historyBox);historyBox.append(historyHost);historyHost.textContent='Open to load recent stock changes.';historyBox.addEventListener('toggle',()=>{if(historyBox.open)activity();});})();
