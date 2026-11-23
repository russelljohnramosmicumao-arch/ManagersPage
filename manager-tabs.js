(()=>{'use strict';
const names=['employees','schedule','attendance','customers','prices','settings','inventory','supplies','sales','review','backup'];
const buttons=[...document.querySelectorAll('[data-manager-tab]')];
const ownerTabs=new Set(['employees','schedule','attendance','sales','backup']);
let permissions=null,opened=null,selecting=false;
function allowed(name){return !!permissions?.management&&names.includes(name)&&(permissions.owner||!ownerTabs.has(name));}
function render(){
 for(const b of buttons){
  const name=b.dataset.managerTab,visible=allowed(name),active=visible&&opened===name;
  b.hidden=!visible;b.style.display=visible?'':'none';
  b.setAttribute('aria-expanded',String(active));
  b.setAttribute('aria-selected',String(active));
  b.classList.toggle('is-open',active);
  b.tabIndex=visible?0:-1;
  const panel=document.getElementById('panel-'+name);
  if(panel)panel.hidden=!active;
 }
 const hint=document.getElementById('managerDashboardHint');
 if(hint)hint.hidden=!!opened;
}
async function toggle(name){
 if(!permissions||selecting||!allowed(name))return;
 if(opened===name){opened=null;render();return;}
 selecting=true;
 const tile=buttons.find(b=>b.dataset.managerTab===name);
 if(tile)tile.classList.add('is-loading');
 try{
  if(name==='employees'&&permissions.owner){
   const ok=await window.KBREmployeeGate.require();
   if(!ok)return; // A cancelled PIN request never silently opens another section.
  }
  opened=name;render();
  if(['schedule','attendance'].includes(name))KBRWorkforce.open();
  if(name==='supplies')KBRSupplyOrders.load(document.getElementById('managerSupplyOrders'));
  if(name==='review')KBRCashReview.open();
  if(name==='sales'){loadFrame('salesFrame','sales.html');if(permissions.owner)window.KBRCancellationHistory?.load();}
  if(name==='inventory')document.getElementById('refreshInventoryComparison')?.click();
  if(name==='customers')KBRCustomerAccounts.load();
  if(name==='prices')window.KBRPriceManager?.load();
  if(name==='settings'){if(permissions.owner)window.KBRPaymentSettings?.load();window.KBRShopHours?.load();}
 }finally{
  selecting=false;
  if(tile)tile.classList.remove('is-loading');
 }
}
window.KBRManagerTabs={applyPermissions(p){
 permissions=p;opened=null;
 const paymentTab=document.querySelector('[data-settings-tab="payments"]');
 if(paymentTab){paymentTab.hidden=!p.owner;paymentTab.style.display=p.owner?'':'none';}
 if(!p.owner)window.KBRSettingsLayout?.show('shop');
 // Opening the Manager Page always starts as a closed tile dashboard.
 // Ignore a stale URL hash; only a real tile click may prompt for the Employees PIN.
 if(location.hash)history.replaceState(null,'',location.pathname+location.search);
 render();
},close(){opened=null;render();}};
function loadFrame(id,url){const frame=document.getElementById(id);if(frame&&!frame.getAttribute('src'))frame.src=url;}
for(const b of buttons){
 b.type='button';
 b.onclick=()=>toggle(b.dataset.managerTab);
 b.onkeydown=e=>{
  const visible=buttons.filter(x=>!x.hidden),i=visible.indexOf(b);
  if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
   e.preventDefault();
   const next=e.key==='Home'?0:e.key==='End'?visible.length-1:(i+(e.key==='ArrowRight'?1:-1)+visible.length)%visible.length;
   visible[next]?.focus();
  }
 };
}
})();