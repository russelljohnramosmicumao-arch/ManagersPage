(()=>{'use strict';let busy=false;const content=document.getElementById('inventoryComparison');const openCategories=new Set();let comparisonData=null;
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
const categoryNames={'packaging':'Packaging','syrups':'Syrups','powders-coffee-beans':'Powders and Coffee Beans','carton-soda-cans-sinkers':'Carton, Soda, Cans, Sinkers','ice-creams':'Ice Creams','sanitation-miscellaneous':'Sanitation and Miscellaneous'};
function renderComparison(){if(!comparisonData)return;const {counts,live,events}=comparisonData;const liveStock=new Map(live.map(i=>[i.id,i]));const groups=new Map();for(const item of counts){const id=item.categoryId||item.category||'other';if(!groups.has(id))groups.set(id,{name:item.category||categoryNames[id]||id,items:[]});groups.get(id).items.push(item);}
 const cell=(v,note='',style='')=>'<td style="padding:10px;border-bottom:1px solid #ddd;'+style+'">'+esc(v)+(note?'<small style="display:block;font-weight:normal">'+esc(note)+'</small>':'')+'</td>';
 content.innerHTML='<p>Previous inventory is the most recent completed physical count. Current expected stock is the live balance after recorded drink deductions, adjustments and cancellation returns. Pending counts and unsynced orders are not included.</p>'+[...groups].map(([id,g])=>'<details data-inventory-category="'+esc(id)+'" '+(openCategories.has(id)?'open':'')+' style="border:1px solid #cad8cd;border-radius:10px;margin:12px 0;padding:12px"><summary style="cursor:pointer;font-weight:700;padding:8px">'+esc(g.name)+' <span style="font-weight:normal">('+g.items.length+')</span></summary><div style="overflow:auto"><table style="width:100%;text-align:left;border-collapse:collapse"><thead><tr>'+['Item','Previous inventory','Current expected stock'].map(v=>'<th style="padding:10px">'+v+'</th>').join('')+'</tr></thead><tbody>'+g.items.map(i=>{
 const previous=completedCount(i.id,events),current=liveStock.get(i.id);
 return '<tr>'+cell(i.name)+cell(displayQuantity(previous?.gross,previous?.item?.unit||i.unit),previous?date(previous.time)+(i.countDirty?' · New count pending':''):'No completed inventory yet')+cell(displayQuantity(current?.stock,current?.unit||i.unit),current?'After recorded deductions':'Live stock unavailable')+'</tr>';
 }).join('')+'</tbody></table></div></details>').join('');
 content.querySelectorAll('[data-inventory-category]').forEach(el=>el.addEventListener('toggle',()=>{if(!el.isConnected)return;const id=el.dataset.inventoryCategory;if(el.open)openCategories.add(id);else openCategories.delete(id);}));

}
async function refresh(){if(busy||document.hidden||document.getElementById('panel-inventory')?.hidden)return;busy=true;try{if(!await KBRCloud.rpc('kbr_management_access',{}))return;
 const [counts,live,events]=await Promise.all([
 KBRCloud.request('/rest/v1/kbr_inventory_counts?id=eq.1&select=*'),KBRCloud.request('/rest/v1/kbr_inventory_state?id=eq.1&select=*'),
 KBRCloud.rows('/rest/v1/kbr_inventory_count_events?kind=eq.complete&select=payload,result,recorded_at,kind&order=recorded_at.desc,operation.desc')]);

 if(!counts[0]||!live[0]){content.textContent='Run the inventory counts SQL first.';return;}
 comparisonData={counts:counts[0].items,live:live[0].items,events};renderComparison();await activity();
 }catch(e){content.textContent='Could not refresh inventory comparison: '+e.message;}finally{busy=false;}}
async function activity(){const host=document.getElementById('inventoryActivity');try{const uses=await KBRCloud.request('/rest/v1/kbr_stock_usage?select=*&order=created_at.desc&limit=30');if(!uses.length){host.textContent='No ingredient deduction records yet.';return;}const ids=uses.map(u=>u.order_id).join(',');const [moves,orders]=await Promise.all([KBRCloud.rows('/rest/v1/kbr_stock_movements?order_id=in.('+ids+')&select=*&order=created_at.desc'),KBRCloud.rows('/rest/v1/kbr_orders?id=in.('+ids+')&select=id,data,status,receipt,created_at')]);const map=new Map(orders.map(o=>[o.id,o]));const live=await KBRCloud.request('/rest/v1/kbr_inventory_state?id=eq.1&select=items'),items=new Map((live[0]?.items||[]).map(i=>[i.id,i]));host.innerHTML=uses.map(u=>{const o=map.get(u.order_id),list=moves.filter(m=>m.order_id===u.order_id),names=(o?.data?.items||o?.receipt?.items||[]).map(i=>(i.qty||1)+' × '+i.name+' '+(i.size||'')).join(', ');return '<details class="activity-card"><summary>'+esc(new Date(u.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'}))+' · '+esc(names||u.order_id.slice(0,8))+' · '+esc(o?.status==='cancelled'?'Cancelled / recorded deductions restored':u.status)+'</summary><p>Order '+esc(u.order_id)+'</p>'+list.map(v=>'<p>'+esc(items.get(v.item_id)?.name||v.item_id)+' · −'+esc(displayQuantity(v.quantity,items.get(v.item_id)?.unit))+' · '+esc(displayQuantity(v.stock_before,items.get(v.item_id)?.unit))+' → '+esc(displayQuantity(v.stock_after,items.get(v.item_id)?.unit))+'</p>').join('')+(u.issues?.length?'<p>Needs attention: '+esc(u.issues.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('; '))+'</p>':'')+'</details>';}).join('');}catch(e){host.textContent='Stock activity unavailable: '+e.message;}}
document.getElementById('refreshInventoryComparison').onclick=refresh;setInterval(refresh,5000);refresh();})();
