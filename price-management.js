'use strict';
(()=>{
const panel=document.getElementById('panel-prices');
if(!panel||!window.KBRCloud)return;
const search=panel.querySelector('#priceSearch');
const category=panel.querySelector('#priceCategory');
const refresh=panel.querySelector('#refreshPrices');
const list=panel.querySelector('#priceList');
const status=panel.querySelector('#priceStatus');
const revisionLabel=panel.querySelector('#priceRevision');
let items=[],revision=null,busy=false,loaded=false;
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:0});
function points(price,item,size){
  if(item.food||/ice cream/i.test(item.category||''))return null;
  const p=Number(price);
  let amount=p<=49?1000:p<=79?1500:p<=99?2000:p<=129?2500:p<=139?3000:3500;
  if(String(item.category||'').toLowerCase()==='frappe & smoothies'&&String(size).toLowerCase().startsWith('22 oz'))amount=Math.max(3000,amount);
  return amount;
}
function label(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
function variants(item){
 const result=[];
 for(const [variant,sizeKey,priceKey] of [['standard','sizes','prices'],['premium','premiumSizes','premium']]){
  const sizes=Array.isArray(item[sizeKey])?item[sizeKey]:[];
  const prices=Array.isArray(item[priceKey])?item[priceKey]:[];
  sizes.forEach((size,i)=>{if(i<prices.length)result.push({variant,size,price:Number(prices[i])});});
 }
 return result;
}
function render(){
 const q=search.value.trim().toLowerCase(),cat=category.value;
 const shown=items.filter(item=>(!cat||item.category===cat)&&(!q||(item.name+' '+item.category).toLowerCase().includes(q)));
 revisionLabel.textContent=revision==null?'':('Shared menu revision '+revision);
 list.replaceChildren();
 if(!shown.length){list.textContent='No menu items found.';return;}
 const fragment=document.createDocumentFragment();
 for(const item of shown){
  const card=document.createElement('section');card.className='kbr-price-card';
  const h=document.createElement('div');h.className='kbr-price-heading';
  h.innerHTML='<div><strong>'+esc(item.name)+'</strong><small>'+esc(item.category)+'</small></div><span class="kbr-price-availability">'+esc(item.availability||'available')+'</span>';
  card.append(h);
  for(const variant of variants(item)){
   const row=document.createElement('div');row.className='kbr-price-row';
   const detail=document.createElement('div');detail.className='kbr-price-detail';
   const tier=points(variant.price,item,variant.size);
   detail.innerHTML='<b>'+esc(variant.size)+(variant.variant==='premium'?' · Premium':'')+'</b><small>Current: '+money(variant.price)+(tier?' · '+tier.toLocaleString('en-PH')+' points':' · No points redemption')+'</small>';
   const form=document.createElement('form');form.className='kbr-price-form';
   form.dataset.product=item.productId||'';form.dataset.variant=variant.variant;form.dataset.size=variant.size;
   const field=document.createElement('input');field.type='number';field.min='1';field.max='99999';field.step='1';field.required=true;field.value=String(variant.price);
   field.setAttribute('aria-label','New price for '+item.name+' '+variant.size);
   const preview=document.createElement('small');preview.className='kbr-price-preview';
   const setPreview=()=>{const n=Number(field.value);const t=Number.isSafeInteger(n)&&n>=1&&n<=99999?points(n,item,variant.size):null;preview.textContent=t?'New reward tier: '+t.toLocaleString('en-PH')+' points':t===null&&item.food?'Food — no points':t===null&&/ice cream/i.test(item.category||'')?'Ice cream — no points':' ';};
   field.addEventListener('input',setPreview);setPreview();
   const save=document.createElement('button');save.type='submit';save.textContent='Save';save.disabled=busy;
   form.append(field,save,preview);form.addEventListener('submit',event=>savePrice(event,item,variant,field,save));
   row.append(detail,form);card.append(row);
  }
  fragment.append(card);
 }
 list.append(fragment);
}
async function load(){
 if(busy)return;
 busy=true;refresh.disabled=true;label('Loading current shared prices…');
 try{
  const data=await KBRCloud.rpc('kbr_manager_menu_snapshot',{});
  if(!Array.isArray(data?.items)||!Number.isInteger(Number(data.revision)))throw Error('Shared menu response is invalid.');
  items=data.items;revision=Number(data.revision);loaded=true;
  const categories=['',...new Set(items.map(x=>x.category).filter(Boolean))].sort((a,b)=>!a?-1:!b?1:a.localeCompare(b));
  const previous=category.value;
  category.innerHTML=categories.map(c=>'<option value="'+esc(c)+'">'+esc(c||'All categories')+'</option>').join('');
  category.value=categories.includes(previous)?previous:'';
  render();label('Edit a price and press Save. New orders and point tiers use the updated shared menu.');
 }catch(e){label(e?.message||'Could not load prices.',true);if(!loaded)list.textContent='Unable to load the shared menu.';}
 finally{busy=false;refresh.disabled=false;}
}
async function savePrice(event,item,variant,field,button){
 event.preventDefault();if(busy)return;
 const price=Number(field.value);
 if(!Number.isSafeInteger(price)||price<1||price>99999){label('Price must be a whole-peso amount from ₱1 to ₱99,999.',true);return;}
 if(price===variant.price){label('No price change to save.');return;}
 const reward=points(price,item,variant.size);
 if(!confirm('Update '+item.name+' · '+variant.size+(variant.variant==='premium'?' Premium':'')+' from '+money(variant.price)+' to '+money(price)+'?'+(reward?' New points requirement: '+reward.toLocaleString('en-PH')+' points.':'')))return;
 busy=true;button.disabled=true;refresh.disabled=true;label('Saving '+item.name+'…');
 try{
  const result=await KBRCloud.rpc('kbr_manager_update_menu_price',{
   p_product_id:item.productId,p_variant:variant.variant,p_size:variant.size,
   p_new_price:price,p_expected_revision:revision
  });
  if(result?.conflict){
   label('Another device changed the menu. Reloading before another price can be saved.',true);
   busy=false;await load();return;
  }
  if(!result?.ok)throw Error('Price was not confirmed by the server.');
  revision=Number(result.revision);
  const updated=items.find(x=>x.productId===item.productId);
  if(updated&&result.item)Object.assign(updated,result.item);
  render();label('Saved '+item.name+' · '+variant.size+' at '+money(price)+'. All new orders and rewards use the shared price.');
 }catch(e){label(e?.message||'Price update failed. Please retry.',true);field.value=String(variant.price);}
 finally{busy=false;button.disabled=false;refresh.disabled=false;}
}
search.addEventListener('input',render);
category.addEventListener('change',render);
refresh.addEventListener('click',load);
window.KBRPriceManager={load};
})();
