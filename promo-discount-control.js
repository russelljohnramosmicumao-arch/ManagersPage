
(()=>{
const $=id=>document.getElementById(id);
let loading=false;
function setStatus(text,cls=''){
  const el=$('promoDiscountStatus'); if(!el)return;
  el.textContent=text; el.className='promo-control-status '+cls;
}
function show(data){
  const enabled=!!data.enabled;
  const pct=Number(data.percent)===50?50:100;
  $('promoDiscountEnabled').checked=enabled;
  $('promoDiscountPercent').value=String(pct);
  setStatus(enabled?`Promo is ON · ${pct===100?'100% FREE':'50% OFF'}`:'Promo is OFF',enabled?'on':'off');
}
async function load(){
  if(loading||!$('promoDiscountEnabled'))return;
  loading=true;
  try{
    const data=await KBRCloud.rpc('kbr_get_promo_discount_setting',{});
    if(data?.error)throw Error(data.error);
    show(data||{});
  }catch(e){setStatus('Could not load promo setting: '+e.message,'error')}
  finally{loading=false}
}
async function save(){
  const btn=$('savePromoDiscount'); if(!btn||loading)return;
  loading=true; btn.disabled=true; setStatus('Saving…');
  try{
    const data=await KBRCloud.rpc('kbr_set_promo_discount_setting',{
      p_enabled:$('promoDiscountEnabled').checked,
      p_percent:Number($('promoDiscountPercent').value)
    });
    if(data?.error)throw Error(data.error);
    show(data);
  }catch(e){setStatus('Could not save promo setting: '+e.message,'error')}
  finally{loading=false;btn.disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{
  $('savePromoDiscount')?.addEventListener('click',save);
  document.querySelector('[data-manager-tab="sales"]')?.addEventListener('click',load);
  load();
});
})();
