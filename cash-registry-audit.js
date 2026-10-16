
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

  function render(){
    const summary=document.getElementById('cashAuditSummary');
    const host=document.getElementById('cashAuditShifts');
    if(!summary||!host) return;

    const closed=shifts.filter(s=>s.status!=='open');
    const shiftMetrics=closed.map(metrics).filter(m=>m.counted!=null);
    const totalShort=shiftMetrics.reduce((n,m)=>n+(m.variance<0?Math.abs(m.variance):0),0);
    const totalOver=shiftMetrics.reduce((n,m)=>n+(m.variance>0?m.variance:0),0);
    const latest=closed[0] ? metrics(closed[0]) : null;

    summary.innerHTML=`<div class="cash-audit-summary">
      <div class="cash-audit-stat"><span>Loaded shifts</span><strong>${shifts.length}</strong></div>
      <div class="cash-audit-stat short"><span>Total shortages</span><strong>${peso(totalShort)}</strong></div>
      <div class="cash-audit-stat over"><span>Total overages</span><strong>${peso(totalOver)}</strong></div>
      <div class="cash-audit-stat ${latest?.variance<0?'short':latest?.variance>0?'over':''}"><span>Latest difference</span><strong>${latest?.variance==null?'—':peso(latest.variance)}</strong></div>
      <div class="cash-audit-stat"><span>Latest events</span><strong>${latest?.rows.length||0}</strong></div>
    </div>`;

    host.innerHTML=shifts.length?shifts.map(shiftHtml).join(''):'<div class="cash-empty">No cash registry shifts found.</div>';
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

  function init(){
    const btn=document.getElementById('cashAuditRefresh');
    if(btn) btn.addEventListener('click',refresh);
    const tab=document.querySelector('[data-manager-tab="cash-registry"]');
    if(tab) tab.addEventListener('click',()=>setTimeout(refresh,0));
    refresh();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();

  return {refresh};
})();
