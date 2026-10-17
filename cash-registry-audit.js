
'use strict';
window.KBRCashRegistryAudit = (() => {
  const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt = value => {
    if(!value) return '—';
    try{return new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});}catch{return value;}
  };
  let shifts=[],events=[],loading=false;

  function eventsFor(shiftId){
    return events.filter(e=>String(e.shift_id)===String(shiftId))
      .sort((a,b)=>new Date(a.recorded_at||0)-new Date(b.recorded_at||0));
  }

  function metrics(shift){
    const rows=eventsFor(shift.id);
    const opening=Number(shift.opening_cash)||0;
    const payments=rows.filter(e=>e.kind==='payment').reduce((n,e)=>n+(Number(e.cash)||0),0);
    const gcash=rows.filter(e=>e.kind==='payment').reduce((n,e)=>n+(Number(e.gcash)||0),0);
    const cashIn=rows.filter(e=>e.kind==='cash-in').reduce((n,e)=>n+(Number(e.cash)||0),0);
    const cashOut=Math.abs(rows.filter(e=>e.kind==='cash-out').reduce((n,e)=>n+(Number(e.cash)||0),0));
    const expected=opening + rows.reduce((n,e)=>n+(Number(e.cash)||0),0);

    const closeRows=rows.filter(e=>e.kind==='close');
    const lastClose=closeRows[closeRows.length-1] || null;
    const counted=lastClose && Number.isFinite(Number(lastClose.counted))
      ? Number(lastClose.counted)
      : Number.isFinite(Number(shift.closing_cash)) ? Number(shift.closing_cash) : null;
    const variance=lastClose && Number.isFinite(Number(lastClose.variance))
      ? Number(lastClose.variance)
      : counted!=null ? counted-expected : null;

    return {rows,opening,payments,gcash,cashIn,cashOut,expected,counted,variance,lastClose};
  }

  function shiftLabel(s){
    const date=dt(s.opened_at);
    const who=s.opened_name||s.staff_name||'Unknown';
    return `${date} · ${who}`;
  }

  function referenceFor(e){
    return e.order_id || e.transaction_id || e.sale_id || e.reference || e.operation || '';
  }

  function noteFor(e){
    const bits=[];
    if(e.note) bits.push(e.note);
    const ref=referenceFor(e);
    if(ref) bits.push(`Ref: ${ref}`);
    if(e.cashier_username) bits.push(`Cashier: @${e.cashier_username}`);
    return bits.join(' · ');
  }

  function rowAmount(e){
    if(e.kind==='payment') return `${peso(e.cash)} cash${Number(e.gcash)?` · ${peso(e.gcash)} GCash`:''}`;
    if(e.kind==='opening') return peso(e.counted);
    if(e.kind==='handover' || e.kind==='close'){
      const counted=Number(e.counted)||0, expected=Number(e.expected)||0, variance=Number(e.variance)||0;
      return `Counted ${peso(counted)} · Expected ${peso(expected)} · Diff ${peso(variance)}`;
    }
    return peso(e.cash);
  }

  function shiftHtml(s,i){
    const m=metrics(s);
    const cls=m.variance==null?'':m.variance<0?'short':m.variance>0?'over':'';
    return `<details class="cash-shift" ${i===0?'open':''}>
      <summary>
        <div class="cash-shift-title"><strong>${esc(shiftLabel(s))}</strong><span>${esc(s.status||'')} ${s.closed_at?'· Closed '+esc(dt(s.closed_at)):''}</span></div>
        <div class="cash-shift-metric"><span>Expected</span><strong>${peso(m.expected)}</strong></div>
        <div class="cash-shift-metric"><span>Counted</span><strong>${m.counted==null?'—':peso(m.counted)}</strong></div>
        <div class="cash-shift-metric"><span>Difference</span><strong class="cash-audit-variance ${cls}">${m.variance==null?'—':peso(m.variance)}</strong></div>
        <div class="cash-shift-metric"><span>Events</span><strong>${m.rows.length}</strong></div>
      </summary>
      <div class="cash-shift-body">
        <div class="cash-breakdown">
          <div><span>Opening cash</span><strong>${peso(m.opening)}</strong></div>
          <div><span>Cash payments</span><strong>${peso(m.payments)}</strong></div>
          <div><span>Cash In</span><strong>${peso(m.cashIn)}</strong></div>
          <div><span>Cash Out</span><strong>${peso(m.cashOut)}</strong></div>
          <div><span>GCash</span><strong>${peso(m.gcash)}</strong></div>
          <div><span>Expected drawer</span><strong>${peso(m.expected)}</strong></div>
        </div>
        ${m.rows.length?`<div style="overflow:auto"><table class="cash-ledger">
          <thead><tr><th>Time</th><th>Type</th><th>Staff</th><th>Details</th><th class="money">Amount / Count</th></tr></thead>
          <tbody>${m.rows.map(e=>`<tr class="${esc(e.kind||'')}">
            <td>${esc(dt(e.recorded_at))}</td>
            <td><span class="cash-kind">${esc(e.kind||'event')}</span></td>
            <td>${esc(e.staff_name||e.cashier_username||'—')}</td>
            <td class="cash-audit-note">${esc(noteFor(e)||'—')}</td>
            <td class="money">${rowAmount(e)}</td>
          </tr>`).join('')}</tbody>
        </table></div>`:'<div class="cash-empty">No registry events recorded for this shift.</div>'}
      </div>
    </details>`;
  }

  function dayKey(value){
    if(!value) return 'unknown';
    const d=new Date(value);
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  }

  function dayLabel(key){
    if(key==='unknown') return 'Unknown date';
    const d=new Date(key+'T12:00:00+08:00');
    return d.toLocaleDateString('en-PH',{timeZone:'Asia/Manila',weekday:'long',year:'numeric',month:'long',day:'numeric'});
  }

  function dayMetrics(dayShifts){
    const list=dayShifts.map(metrics);
    return {
      shifts: dayShifts.length,
      opening: list.reduce((n,m)=>n+m.opening,0),
      payments: list.reduce((n,m)=>n+m.payments,0),
      cashIn: list.reduce((n,m)=>n+m.cashIn,0),
      cashOut: list.reduce((n,m)=>n+m.cashOut,0),
      gcash: list.reduce((n,m)=>n+m.gcash,0),
      expected: list.reduce((n,m)=>n+m.expected,0),
      counted: list.filter(m=>m.counted!=null).reduce((n,m)=>n+m.counted,0),
      variance: list.filter(m=>m.variance!=null).reduce((n,m)=>n+m.variance,0),
      eventCount: list.reduce((n,m)=>n+m.rows.length,0)
    };
  }

  function dayHtml(key,dayShifts,dayIndex){
    const d=dayMetrics(dayShifts);
    const cls=d.variance<0?'short':d.variance>0?'over':'';
    return `<details class="cash-day" ${dayIndex===0?'open':''}>
      <summary>
        <div class="cash-day-title"><strong>${esc(dayLabel(key))}</strong><span>${d.shifts} shift${d.shifts===1?'':'s'} · ${d.eventCount} registry event${d.eventCount===1?'':'s'}</span></div>
        <div class="cash-day-metric"><span>Cash payments</span><strong>${peso(d.payments)}</strong></div>
        <div class="cash-day-metric"><span>Expected</span><strong>${peso(d.expected)}</strong></div>
        <div class="cash-day-metric"><span>Counted</span><strong>${peso(d.counted)}</strong></div>
        <div class="cash-day-metric"><span>Difference</span><strong class="cash-audit-variance ${cls}">${peso(d.variance)}</strong></div>
      </summary>
      <div class="cash-day-body">
        <div class="cash-audit-summary day-summary">
          <div class="cash-audit-stat"><span>Opening cash</span><strong>${peso(d.opening)}</strong></div>
          <div class="cash-audit-stat"><span>Cash payments</span><strong>${peso(d.payments)}</strong></div>
          <div class="cash-audit-stat"><span>Cash In</span><strong>${peso(d.cashIn)}</strong></div>
          <div class="cash-audit-stat"><span>Cash Out</span><strong>${peso(d.cashOut)}</strong></div>
          <div class="cash-audit-stat"><span>GCash</span><strong>${peso(d.gcash)}</strong></div>
          <div class="cash-audit-stat"><span>Expected cash</span><strong>${peso(d.expected)}</strong></div>
          <div class="cash-audit-stat"><span>Counted cash</span><strong>${peso(d.counted)}</strong></div>
          <div class="cash-audit-stat ${cls}"><span>Daily difference</span><strong>${peso(d.variance)}</strong></div>
        </div>
        <h3>Shifts for this day</h3>
        ${dayShifts.map((s,i)=>shiftHtml(s,i)).join('')}
      </div>
    </details>`;
  }

  function render(){
    const summary=document.getElementById('cashAuditSummary');
    const host=document.getElementById('cashAuditShifts');
    if(!summary||!host) return;
    const closed=shifts.filter(s=>s.status!=='open');
    const shiftMetrics=closed.map(metrics).filter(m=>m.counted!=null);
    const totalShort=shiftMetrics.reduce((n,m)=>n+(m.variance<0?Math.abs(m.variance):0),0);
    const totalOver=shiftMetrics.reduce((n,m)=>n+(m.variance>0?m.variance:0),0);
    const groups={};
    shifts.forEach(s=>{const key=dayKey(s.opened_at);(groups[key] ||= []).push(s);});
    const dayEntries=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]));
    const latestDay=dayEntries[0]?dayMetrics(dayEntries[0][1]):null;
    summary.innerHTML=`<div class="cash-audit-summary">
      <div class="cash-audit-stat"><span>Days loaded</span><strong>${dayEntries.length}</strong></div>
      <div class="cash-audit-stat short"><span>Total shortages</span><strong>${peso(totalShort)}</strong></div>
      <div class="cash-audit-stat over"><span>Total overages</span><strong>${peso(totalOver)}</strong></div>
      <div class="cash-audit-stat ${latestDay?.variance<0?'short':latestDay?.variance>0?'over':''}"><span>Latest day difference</span><strong>${latestDay?peso(latestDay.variance):'—'}</strong></div>
      <div class="cash-audit-stat"><span>Latest day events</span><strong>${latestDay?.eventCount||0}</strong></div>
    </div>`;
    host.innerHTML=dayEntries.length?dayEntries.map(([key,dayShifts],i)=>dayHtml(key,dayShifts,i)).join(''):'<div class="cash-empty">No cash registry shifts found.</div>';
  }

  async function refresh(){
    if(loading) return;
    loading=true;
    const summary=document.getElementById('cashAuditSummary');
    if(summary) summary.textContent='Loading cash registry…';
    try{
      shifts=await KBRCloud.rows('/rest/v1/kbr_shifts?select=*&order=opened_at.desc&limit=30');
      events=shifts.length
        ? await KBRCloud.rows('/rest/v1/kbr_shift_events?shift_id=in.('+shifts.map(s=>s.id).join(',')+')&select=*&order=recorded_at.asc')
        : [];
      render();
    }catch(err){
      if(summary) summary.innerHTML=`<p class="cash-empty">Could not load cash registry: ${esc(err.message||err)}</p>`;
      const host=document.getElementById('cashAuditShifts'); if(host) host.innerHTML='';
    }finally{loading=false;}
  }

  function activateCashRegistryPanel(){
    const tab=document.querySelector('[data-manager-tab="cash-registry"]');
    const panel=document.getElementById('panel-cash-registry');
    if(!tab || !panel) return;

    document.querySelectorAll('[data-manager-tab]').forEach(button=>{
      button.setAttribute('aria-selected', button===tab ? 'true' : 'false');
      button.classList.toggle('active', button===tab);
    });

    document.querySelectorAll('.manager-panel').forEach(section=>{
      section.hidden = section!==panel;
    });

    panel.hidden=false;
  }

  function init(){
    const btn=document.getElementById('cashAuditRefresh');
    if(btn) btn.addEventListener('click',refresh);

    const tab=document.querySelector('[data-manager-tab="cash-registry"]');
    if(tab){
      tab.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        activateCashRegistryPanel();
        refresh();
      }, true);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  return {refresh};
})();
