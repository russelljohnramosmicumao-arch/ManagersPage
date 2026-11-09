'use strict';
(()=>{
 const host=document.getElementById('kbrShopHours');
 if(!host||!window.KBRCloud)return;
 const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const $=id=>host.querySelector('#'+id);
 let revision=null,settings=null,busy=false,loaded=false;
 const text=(v)=>String(v??'');
 const msg=(m,error=false)=>{$('shopHoursStatus').textContent=m;$('shopHoursStatus').classList.toggle('error',error);};
 host.innerHTML=`
 <header class="kbr-shop-head"><div><h3>Shop & Operating Hours</h3>
 <p>One schedule for customer ordering, separate from cashier shifts. Changing hours never opens or closes a cash register.</p></div>
 <button id="shopHoursRefresh" type="button">Refresh</button></header>
 <p id="shopHoursStatus" role="status">Open Settings to load your current hours.</p>
 <form id="shopHoursForm" hidden>
 <div class="kbr-shop-card"><h4>Shop mode</h4>
 <label>Mode <select id="shopHoursMode">
 <option value="automatic">Automatic — follow schedule and real shop status</option>
 <option value="closed">Temporarily Closed — pause orders</option>
 <option value="open">Force Open — allow orders outside posted hours, if the shop shift is open</option>
 </select></label>
 <label id="shopHoursExpiryWrap" hidden>Manual override expires <input type="datetime-local" id="shopHoursExpiry"></label>
 <small>Temporary modes require an expiry. They revert to Automatic when the expiry passes.</small></div>
 <div class="kbr-shop-card"><h4>Weekly hours (Philippines)</h4><div id="shopHoursDays"></div>
 <small>Each day can be closed. Closing times are normally later than opening times.</small></div>
 <div class="kbr-shop-card"><h4>Online Ordering — Service Availability</h4>
 <p>Turn Delivery or Pickup on or off independently. Disabling Delivery does not close the online ordering app or stop Pickup orders. Customers will see which option is unavailable. Existing submitted orders are not cancelled.</p>
 <label class="kbr-shop-switch"><span><b>Online Ordering</b><small>Emergency pause immediately stops new online submissions</small></span><input type="checkbox" id="shopHoursOnline"></label>
 <label class="kbr-shop-switch"><span><b>Accept Pickup Orders</b><small>Customers can choose Pickup at checkout when enabled</small></span><input type="checkbox" id="shopHoursPickup"></label>
 <label class="kbr-shop-switch"><span><b>Accept Delivery Orders</b><small>When disabled, customers see: Delivery is currently unavailable. Pickup is still available if enabled.</small></span><input type="checkbox" id="shopHoursDelivery"></label>
 <label class="kbr-shop-switch"><span><b>Advance orders</b><small>Allow scheduling for a future open period</small></span><input type="checkbox" id="shopHoursAdvance"></label></div>
 <div class="kbr-shop-card"><h4>Order timing</h4><div class="kbr-shop-grid">
 <label>Advance notice (minutes)<input id="shopHoursNotice" type="number" min="0" max="180" step="5"></label>
 <label>Days available for scheduling<input id="shopHoursAdvanceDays" type="number" min="1" max="30"></label>
 <label>Pickup available after opening (minutes)<input id="shopHoursPickupOffset" type="number" min="0" max="180" step="5"></label>
 <label>Delivery available after opening (minutes)<input id="shopHoursDeliveryOffset" type="number" min="0" max="180" step="5"></label>
 <label>Weekend delivery available after opening (minutes)<input id="shopHoursWeekendDeliveryOffset" type="number" min="0" max="180" step="5"></label>
 <label>Pickup cutoff before closing (minutes)<input id="shopHoursPickupCutoff" type="number" min="0" max="180" step="5"></label>
 <label>Delivery cutoff before closing (minutes)<input id="shopHoursDeliveryCutoff" type="number" min="0" max="180" step="5"></label>
 </div></div>
 <div class="kbr-shop-card"><div class="kbr-shop-split"><h4>Special dates</h4><button id="shopHoursAddDate" type="button">+ Add date</button></div>
 <p>Use for holidays, maintenance, special events and private bookings.</p>
 <div id="shopHoursDates"></div></div>
 <div class="kbr-shop-footer"><button type="submit" id="shopHoursSave">Save Shop Settings</button>
 <span id="shopHoursVersion"></span></div>
 </form>
 <details class="kbr-shop-card"><summary>Shop Settings Change History (Manager Only)</summary><button id="shopHoursHistoryRefresh" type="button">Load history</button><div id="shopHoursHistory"></div></details>
 `;
 // Reorganize the existing live settings form into two expandable tiles.
 // Keeping all controls in the same form preserves the existing save/revision workflow.
 const form=$('shopHoursForm');
 const cards=[...form.querySelectorAll(':scope > .kbr-shop-card')];
 if(cards.length!==5)throw Error('Unexpected Shop & Hours layout');
 const grid=document.createElement('div');
 grid.className='kbr-settings-tiles';
 const details=document.createElement('div');
 const makePanel=(key,label,emoji,description)=>{
  const tile=document.createElement('button');tile.type='button';tile.className='kbr-settings-tile';
  tile.setAttribute('aria-pressed','false');tile.dataset.shopTile=key;
  tile.innerHTML='<span class="tile-emoji" aria-hidden="true">'+emoji+'</span><strong>'+label+'</strong><small>'+description+'</small>';
  grid.append(tile);
  const pane=document.createElement('section');pane.className='kbr-settings-detail';pane.hidden=true;
  pane.id='kbr-shop-pane-'+key;pane.setAttribute('aria-label',label);details.append(pane);
  tile.onclick=()=>{
   for(const button of grid.querySelectorAll('[data-shop-tile]'))button.setAttribute('aria-pressed',String(button===tile));
   for(const section of details.children)section.hidden=section!==pane;
   form.querySelector('.kbr-shop-footer').hidden=false;
  };
  return pane;
 };
 const schedulePane=makePanel('schedule','Shop Schedule','🕒','Hours, temporary closures and special dates');
 const onlinePane=makePanel('online','Online Orders','🛵','Delivery, pickup and advance ordering');
 schedulePane.append(cards[0],cards[1],cards[4]);
 onlinePane.append(cards[2],cards[3]);
 // Move the owner-only audit trail with the schedule details.
 const historySection=host.querySelector('details.kbr-shop-card');
 if(historySection)schedulePane.append(historySection);
 form.prepend(grid,details);
 form.querySelector('.kbr-shop-footer').hidden=true;
 function row(day){
  const line=document.createElement('div');line.className='kbr-shop-day';line.dataset.day=day.day;
  const dayLabel=document.createElement('strong');dayLabel.textContent=weekdays[day.day-1];
  const opened=document.createElement('input');opened.type='time';opened.value=day.open;opened.className='shop-day-open';opened.setAttribute('aria-label',weekdays[day.day-1]+' opening');
  const closed=document.createElement('input');closed.type='time';closed.value=day.close;closed.className='shop-day-close';closed.setAttribute('aria-label',weekdays[day.day-1]+' closing');
  const check=document.createElement('label');check.className='kbr-shop-checkbox';const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=!!day.closed;toggle.className='shop-day-closed';
  check.append(toggle,document.createTextNode('Closed'));const update=()=>{opened.disabled=toggle.checked;closed.disabled=toggle.checked};toggle.addEventListener('change',update);
  line.append(dayLabel,opened,closed,check);update();return line;
 }
 function addSpecial(s={date:'',closed:true,open:'11:00',close:'23:00',reason:''}){
  const el=document.createElement('div');el.className='kbr-shop-special';
  const d=document.createElement('input');d.type='date';d.value=s.date;d.className='special-date';d.required=true;
  const reason=document.createElement('input');reason.maxLength=100;reason.placeholder='Reason (optional)';reason.value=s.reason||'';reason.className='special-reason';
  const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=!!s.closed;check.className='special-closed';label.append(check,document.createTextNode('Closed'));
  const open=document.createElement('input');open.type='time';open.value=s.open||'11:00';open.className='special-open';
  const close=document.createElement('input');close.type='time';close.value=s.close||'23:00';close.className='special-close';
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.onclick=()=>el.remove();
  const refresh=()=>{open.disabled=check.checked;close.disabled=check.checked};check.addEventListener('change',refresh);
  el.append(d,reason,label,open,close,remove);$('shopHoursDates').append(el);refresh();
 }
 const timezoneLocal=timestamp=>{
  if(!timestamp)return '';
  const d=new Date(timestamp);
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return obj.year+'-'+obj.month+'-'+obj.day+'T'+obj.hour+':'+obj.minute;
 };
 const toIso=local=>local?new Date(local+':00+08:00').toISOString():null;
 function display(){
  if(!settings)return;
  $('shopHoursForm').hidden=false;
  $('shopHoursMode').value=settings.mode||'automatic';
  $('shopHoursExpiry').value=timezoneLocal(settings.override_until);
  $('shopHoursExpiryWrap').hidden=settings.mode==='automatic';
  $('shopHoursOnline').checked=!!settings.online_enabled;
  $('shopHoursPickup').checked=!!settings.pickup_enabled;
  $('shopHoursDelivery').checked=!!settings.delivery_enabled;
  $('shopHoursAdvance').checked=!!settings.advance_enabled;
  const vals={shopHoursNotice:'advance_notice_minutes',shopHoursAdvanceDays:'advance_days',
   shopHoursPickupOffset:'pickup_start_offset_minutes',shopHoursDeliveryOffset:'delivery_start_offset_minutes',
   shopHoursWeekendDeliveryOffset:'weekend_delivery_start_offset_minutes',
   shopHoursPickupCutoff:'pickup_cutoff_minutes',shopHoursDeliveryCutoff:'delivery_cutoff_minutes'};
  for(const [id,key] of Object.entries(vals))$(id).value=String(settings[key]??0);
  $('shopHoursDays').replaceChildren(...(settings.schedule||[]).map(row));
  $('shopHoursDates').replaceChildren();
  (settings.special_dates||[]).forEach(addSpecial);
  $('shopHoursVersion').textContent='Revision '+revision;
 }
 async function load(){
  if(busy)return;busy=true;msg('Loading shared shop settings…');
  try{
   const result=await KBRCloud.rpc('kbr_shop_hours_snapshot',{});
   if(!result?.settings||!Number.isSafeInteger(Number(result.revision)))throw Error('Shared shop settings unavailable.');
   settings=result.settings;revision=Number(result.revision);loaded=true;display();
   msg('Settings loaded · Revision '+revision+'. Cash shift opening remains separate.');
  }catch(e){msg(e.message||'Unable to load settings.',true);}finally{busy=false;}
 }
 const times=/^([01][0-9]|2[0-3]):[0-5][0-9]$/;
 function gather(){
  const mode=$('shopHoursMode').value;
  const override=mode==='automatic'?null:toIso($('shopHoursExpiry').value);
  if(mode!=='automatic'&&(!override||new Date(override)<=new Date()||new Date(override)>new Date(Date.now()+7*86400000)))
   throw Error('Set a future expiry within 7 days for temporary shop modes.');
  const days=[...$('shopHoursDays').children].map(el=>({
   day:Number(el.dataset.day),open:el.querySelector('.shop-day-open').value,
   close:el.querySelector('.shop-day-close').value,closed:el.querySelector('.shop-day-closed').checked
  }));
  for(const d of days){
   if(!times.test(d.open)||!times.test(d.close))throw Error('Enter valid hours for '+weekdays[d.day-1]+'.');
   if(!d.closed&&d.open===d.close)throw Error('Opening and closing cannot match for '+weekdays[d.day-1]+'.');
  }
  const special_dates=[...$('shopHoursDates').children].map(el=>({
   date:el.querySelector('.special-date').value,
   reason:el.querySelector('.special-reason').value.trim(),
   closed:el.querySelector('.special-closed').checked,
   open:el.querySelector('.special-open').value,
   close:el.querySelector('.special-close').value
  }));
  if(special_dates.some(x=>!x.date||(!x.closed&&(!times.test(x.open)||!times.test(x.close)))))
   throw Error('Complete each special date and its opening hours.');
  if(new Set(special_dates.map(x=>x.date)).size!==special_dates.length)throw Error('Duplicate special date.');
  const vals={advance_notice_minutes:'shopHoursNotice',advance_days:'shopHoursAdvanceDays',
   pickup_start_offset_minutes:'shopHoursPickupOffset',delivery_start_offset_minutes:'shopHoursDeliveryOffset',
   weekend_delivery_start_offset_minutes:'shopHoursWeekendDeliveryOffset',
   pickup_cutoff_minutes:'shopHoursPickupCutoff',delivery_cutoff_minutes:'shopHoursDeliveryCutoff'};
  const next={...settings,timezone:'Asia/Manila',mode,override_until:override,
   online_enabled:$('shopHoursOnline').checked,pickup_enabled:$('shopHoursPickup').checked,
   delivery_enabled:$('shopHoursDelivery').checked,advance_enabled:$('shopHoursAdvance').checked,
   schedule:days,special_dates};
  for(const [k,id] of Object.entries(vals)){
   const value=Number($(id).value);
   if(!Number.isInteger(value)||value<0||value>180)throw Error('Invalid timing field: '+k);
   next[k]=value;
  }
  if(next.advance_days<1||next.advance_days>30)throw Error('Advance days must be 1–30.');
  // Both services may be paused while leaving the online menu visible. Checkout stays blocked server-side.
  return next;
 }
 async function save(ev){
  ev.preventDefault();if(busy||!loaded)return;
  let next;try{next=gather();}catch(e){msg(e.message,true);return;}
  if(!confirm('Save Shop & Hours settings for all connected ordering apps?'))return;
  busy=true;$('shopHoursSave').disabled=true;msg('Saving central shop settings…');
  try{
   const result=await KBRCloud.rpc('kbr_manager_save_shop_hours',{p_settings:next,p_expected_revision:revision});
   if(result?.conflict){busy=false;await load();msg('Settings changed on another device. Review the latest version and try again.',true);return;}
   if(!result?.ok)throw Error('Server did not confirm your settings update.');
   settings=next;revision=Number(result.revision);display();
   msg('Saved shared shop settings · Revision '+revision+'. New online orders now follow these rules.');
  }catch(e){msg(e.message||'Unable to save',true);}
  finally{busy=false;$('shopHoursSave').disabled=false;}
 }
 async function history(){
  const el=$('shopHoursHistory');el.textContent='Loading change history…';
  try{
   const rows=await KBRCloud.rpc('kbr_manager_shop_hours_history',{p_limit:25});
   el.replaceChildren();
   if(!rows?.length){el.textContent='No changes recorded yet.';return;}
   for(const r of rows){
    const d=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');
    summary.textContent='Revision '+r.revision+' · '+new Date(r.changedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' · '+String(r.changedBy||'');
    pre.textContent='Before: '+JSON.stringify(r.previous,null,2)+'\nAfter: '+JSON.stringify(r.next,null,2);
    d.append(summary,pre);el.append(d);
   }
  }catch(e){el.textContent='History unavailable: '+(e.message||e);}
 }
 $('shopHoursMode').addEventListener('change',()=>{$('shopHoursExpiryWrap').hidden=$('shopHoursMode').value==='automatic';});
 $('shopHoursAddDate').addEventListener('click',()=>addSpecial());
 $('shopHoursForm').addEventListener('submit',save);
 $('shopHoursRefresh').addEventListener('click',load);
 $('shopHoursHistoryRefresh').addEventListener('click',history);
 window.KBRShopHours={load};
})();
