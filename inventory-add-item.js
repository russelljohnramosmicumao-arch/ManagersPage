
(()=>{
const $=id=>document.getElementById(id);
let saving=false;

function status(text,kind=''){
  const el=$('addInventoryItemStatus');
  if(!el)return;
  el.textContent=text;
  el.className='add-inventory-status '+kind;
}

function openPanel(){
  $('addInventoryItemPanel').hidden=false;
  $('newInventoryName').focus();
  status('');
}
function closePanel(){
  $('addInventoryItemPanel').hidden=true;
  status('');
}

async function refreshInventoryViews(){
  $('refreshInventoryComparison')?.click();
  // Supply Orders script reloads on its tab click. Trigger a view change if possible.
  const ordersTab=document.querySelector('[data-inventory-view="orders"]');
  if(ordersTab && !document.getElementById('inventorySupplyOrders')?.hidden){
    ordersTab.click();
  }
}

async function save(){
  if(saving)return;
  const name=$('newInventoryName').value.trim();
  const unit=$('newInventoryUnit').value;
  const category=$('newInventoryCategory').value;
  if(!name){status('Enter an item name.','error');$('newInventoryName').focus();return;}

  saving=true;
  const btn=$('saveNewInventoryItem');
  btn.disabled=true;
  status('Adding item…');
  try{
    const result=await KBRCloud.rpc('kbr_add_inventory_item_v2',{
      p_name:name,
      p_unit:unit,
      p_category_id:category
    });
    if(result?.error)throw Error(result.error);
    const existed=!!result?.alreadyExists;
    status(existed?`${result.name} already exists in inventory.`:`${result.name} added to inventory. You can now use it in Supply Orders.`,'ok');
    if(!existed)$('newInventoryName').value='';
    await refreshInventoryViews();
  }catch(e){
    status('Could not add item: '+e.message,'error');
  }finally{
    saving=false;
    btn.disabled=false;
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  $('openAddInventoryItem')?.addEventListener('click',openPanel);
  $('closeAddInventoryItem')?.addEventListener('click',closePanel);
  $('saveNewInventoryItem')?.addEventListener('click',save);
  $('newInventoryName')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}});
});
})();
