'use strict';
(()=>{
 const root=document.getElementById('panel-settings');
 if(!root)return;
 const tabs=[...root.querySelectorAll('[data-settings-tab]')];
 const panels={shop:root.querySelector('#kbrSettingsShop'),payments:root.querySelector('#kbrSettingsPayments')};
 function show(name){
  if(!panels[name])return;
  tabs.forEach(tab=>{const active=tab.dataset.settingsTab===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  for(const [key,panel] of Object.entries(panels))panel.hidden=key!==name;
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>show(tab.dataset.settingsTab)));
 show('shop');
 window.KBRSettingsLayout={show};
})();
