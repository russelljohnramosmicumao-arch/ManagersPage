'use strict';
(()=> {
 const host=document.getElementById('cancellationHistoryList');
 const refresh=document.getElementById('refreshCancellationHistory');
 const status=document.getElementById('cancellationHistoryStatus');
 if(!host||!refresh||!status)return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let loading=false;
 async function load(){
  if(!window.KBRUIPermissions?.owner||loading)return;
  loading=true;refresh.disabled=true;status.textContent='Loading cancellation history…';
  try{
   const data=await KBRCloud.rpc('kbr_owner_cancellation_history',{p_limit:100});
   if(!Array.isArray(data))throw Error('Unexpected cancellation history response');
   if(!data.length){host.innerHTML='<p>No completed-transaction cancellations recorded yet.</p>';status.textContent='No cancellations.';return;}
   host.innerHTML=data.map(item=>{
    const timestamp=item.cancelled_at?new Date(item.cancelled_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}):'Unknown time';
    const total=item.original_total!==''&&Number.isFinite(Number(item.original_total))?' · ₱'+Number(item.original_total).toLocaleString('en-PH',{maximumFractionDigits:2}):'';
    return '<article class="card" style="padding:16px;margin-bottom:10px;background:#fff">'
      +'<strong>Order #'+esc(item.order_number??item.order_id)+total+'</strong>'
      +'<div style="margin-top:6px">Approved by: <b>'+esc(item.approved_by)+'</b> ('+esc(item.position||'Role not recorded')+')</div>'
      +'<div>Signed-in account: '+esc(item.signed_in_as)+'</div>'
      +'<div>Reason: '+esc(item.reason)+'</div>'
      +'<small>'+esc(timestamp)+' · '+Number(item.inventory_items_restored||0)+' inventory items restored</small>'
      +'</article>';
   }).join('');
   status.textContent=data.length+' most recent recorded cancellations.';
  }catch(e){status.textContent='Unable to load cancellation history: '+(e.message||String(e));host.textContent='Please retry.';}
  finally{loading=false;refresh.disabled=false;}
 }
 refresh.onclick=load;
 window.KBRCancellationHistory={load};
})();
