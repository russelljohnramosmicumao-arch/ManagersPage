'use strict';
(()=>{
const root=document.getElementById('panel-menu');
if(!root||!window.KBRCloud)return;
const $=id=>root.querySelector('#'+id);
const list=$('menuManageList'),search=$('menuManageSearch'),filter=$('menuManageCategory'),status=$('menuManageStatus');
const edit=$('menuManageEditor'),title=$('menuEditorTitle'),rows=$('menuEditorSizes');
const photo=$('menuEditorPhoto'),imagePreview=$('menuEditorPreview');
let items=[],revision=null,editing=null,busy=false,loaded=false,photoFile=null;
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₱'+Number(v).toLocaleString('en-PH');
const imageURL=v=>!v?'':/^https:\/\//i.test(v)?v:'https://russelljohnramosmicumao-arch.github.io/Kape-Barrio/'+v.replace(/^\.\//,'');
const show=(msg,bad=false)=>{status.textContent=msg;status.classList.toggle('bad',bad)};
const MAIN_CATEGORIES=['Frappe & Smoothies','Coffee Series','Matcha Series','Milk Tea Series','Soda','Floats','Specials','Snackies','Ice Cream'];
const editorCategory=$('menuEditorCategory');
function menuMode(category){return category==='Snackies'||category==='Ice Cream'?'food':'drink';}
function cleanCatList(){
 const categories=[...new Set([...MAIN_CATEGORIES,...items.map(i=>i.category).filter(Boolean)])];
 categories.sort((a,b)=>{
  const ai=MAIN_CATEGORIES.indexOf(a),bi=MAIN_CATEGORIES.indexOf(b);
  return ai>=0&&bi>=0?ai-bi:ai>=0?-1:bi>=0?1:a.localeCompare(b);
 });
 const previous=filter.value;
 filter.replaceChildren(new Option('All categories',''),...categories.map(x=>new Option(x,x)));
 filter.value=categories.includes(previous)?previous:'';
 const current=editorCategory.value;
 editorCategory.replaceChildren(new Option('Select category…',''),...categories.map(x=>new Option(x==='Soda'?'Fruit Soda':x==='Ice Cream'?'Ice Creams':x,x)));
 editorCategory.value=current&&categories.includes(current)?current:'';
}
function allSizes(item){
 return ['standard','premium'].flatMap(type=>{
  const premium=type==='premium',names=premium?item.premiumSizes:item.sizes,prices=premium?item.premium:item.prices;
  return Array.isArray(names)?names.map((name,i)=>({type,name,price:prices?.[i],hidden:(item.sizeUnavailable?.[type]||[]).includes(name)})):[];
 });
}
function render(){
 const q=search.value.toLowerCase().trim(),cat=filter.value;
 const shown=items.filter(x=>(!cat||x.category===cat)&&(!q||[x.name,x.category].join(' ').toLowerCase().includes(q)));
 list.replaceChildren();
 if(!shown.length){list.textContent='No matching menu items.';return;}
 for(const item of shown){
  const card=document.createElement('article');card.className='kbr-menu-card';
  const src=imageURL(item.image);
  const img=document.createElement('img');img.className='kbr-menu-thumb';img.alt=item.name;
  if(src)img.src=src;else img.classList.add('empty');
  img.onerror=()=>{img.removeAttribute('src');img.classList.add('empty')};
  const info=document.createElement('div');info.className='kbr-menu-info';
  const sizes=allSizes(item);
  info.innerHTML='<strong>'+escape(item.name)+'</strong><small>'+escape(item.category)+'</small><small>'+sizes.map(x=>escape(x.name)+' '+money(x.price)+(x.hidden?' (hidden)':'')).join(' · ')+'</small>';
  const actions=document.createElement('div');actions.className='kbr-menu-actions';
  const availability=document.createElement('button');availability.type='button';
  const active=item.availability==='available'||!item.availability;
  availability.className=active?'menu-active':'menu-inactive';
  availability.textContent=active?'Available':'Not Available';
  availability.onclick=()=>toggle(item,active);
  const update=document.createElement('button');update.type='button';update.textContent='Edit';update.onclick=()=>openEditor(item);
  actions.append(availability,update);card.append(img,info,actions);list.append(card);
 }
}
async function load(){
 if(busy)return;busy=true;show('Loading shared menu…');
 try{
  const result=await KBRCloud.rpc('kbr_manager_menu_snapshot',{});
  if(!Array.isArray(result?.items)||!Number.isInteger(Number(result.revision)))throw Error('Invalid shared menu response.');
  items=result.items;revision=Number(result.revision);loaded=true;cleanCatList();render();
  show('Menu revision '+revision+' · Changes sync to ordering and rewards after devices refresh.');
 }catch(err){show(err.message||'Unable to load menu',true);}
 finally{busy=false;}
}
function updateEditorLayout(previousCategory=''){
 const category=editorCategory.value;
 const food=menuMode(category)==='food';
 edit.dataset.menuMode=food?'food':'drink';
 $('menuEditorFood').checked=food;
 $('menuEditorFood').disabled=food;
 const heading=$('menuEditorSizeHeading'),help=$('menuEditorSizeHelp'),add=$('menuEditorAddSize');
 if(category==='Snackies'){
  heading.textContent='Portions and prices';
  help.textContent='Set the price per order or portion. Add options such as Solo, Barkada, 6 pcs or 12 pcs. You can hide individual portions.';
  add.textContent='＋ Add Portion / Serving';
 }else if(category==='Ice Cream'){
  heading.textContent='Ice cream options and prices';
  help.textContent='Set the price for each selling unit, such as 1 piece, 1 scoop or 1.3 L tub. You can add more options.';
  add.textContent='＋ Add Ice Cream Option';
 }else{
  heading.textContent='Sizes, prices, and availability';
  help.textContent='Uncheck Available to hide an individual size without deleting its price. Use × to remove a size.';
  add.textContent='＋ Add Another Size';
 }
 if(food){
  for(const row of rows.children){
   row.querySelector('.kbr-menu-size-kind').value='standard';
   row.querySelector('.kbr-menu-size-label').placeholder=category==='Snackies'?'e.g. Solo, Barkada, 6 pcs':'e.g. 1 piece, 1 tub';
  }
 }
 if(previousCategory && previousCategory!==category && !editing){
  // Replace the initial blank drink template when choosing snacks/ice creams.
  const draft=[...rows.children].map(row=>({
   size:row.querySelector('.kbr-menu-size-label').value.trim(),
   price:row.querySelector('.kbr-menu-size-price').value
  }));
  const untouchedDrinkTemplate=draft.length===3
   && draft.every((x,i)=>x.size===['12 oz','16 oz','22 oz'][i]&&!x.price);
  const untouchedFoodTemplate=draft.length===1&&!draft[0].price
   && ['1 piece','1 order'].includes(draft[0].size);
  if((food && untouchedDrinkTemplate)||(!food && untouchedFoodTemplate)){
   rows.replaceChildren();
   if(food)addSizeRow('standard',category==='Snackies'?'1 order':'1 piece','',true);
   else for(const size of ['12 oz','16 oz','22 oz'])addSizeRow('standard',size,'',true);
  }
 }
}
function addSizeRow(variant='standard',size='',price='',active=true){
 const row=document.createElement('div');row.className='kbr-menu-size-row';row.dataset.variant=variant;
 if(menuMode(editorCategory.value)==='food')variant='standard';
 const kind=document.createElement('select');kind.className='kbr-menu-size-kind';
 kind.append(new Option('Standard','standard'),new Option('Premium','premium'));kind.value=variant;
 const label=document.createElement('input');label.className='kbr-menu-size-label';label.placeholder=menuMode(editorCategory.value)==='food'?'e.g. 1 order':'e.g. 16 oz';label.maxLength=50;label.required=true;label.value=size;
 const value=document.createElement('input');value.type='number';value.className='kbr-menu-size-price';value.placeholder='Price (₱)';value.min='1';value.max='99999';value.step='.01';value.required=true;value.value=String(price);
 const checked=document.createElement('label');checked.className='kbr-menu-size-available';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=active;checked.append(checkbox,document.createTextNode(' Available'));
 const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='×';remove.title='Remove this size';remove.onclick=()=>{if(rows.children.length<=1){show('A product needs at least one size.',true);return;}row.remove();};
 row.append(kind,label,value,checked,remove);rows.append(row);
}
function openEditor(item=null){
 editing=item?structuredClone(item):null;photoFile=null;photo.value='';
 title.textContent=item?'Edit '+item.name:'Add New Menu Item';
 $('menuEditorName').value=item?.name||'';
 if(item?.category&&!Array.from(editorCategory.options).some(x=>x.value===item.category)){
  editorCategory.append(new Option(item.category,item.category));
 }
 editorCategory.value=item?.category||'';
 $('menuEditorAvailability').value=item?.availability==='available'||!item?.availability?'available':'unavailable';
 $('menuEditorFood').checked=!!item?.food;
 updateEditorLayout();
 const src=imageURL(item?.image);imagePreview.hidden=!src;
 if(src)imagePreview.src=src;else imagePreview.removeAttribute('src');
 rows.replaceChildren();
 if(item){
  for(const x of allSizes(item))addSizeRow(x.type,x.name,x.price,!x.hidden);
 }else if(menuMode(editorCategory.value)==='food'){
  addSizeRow('standard',editorCategory.value==='Snackies'?'1 order':'1 piece','',true);
 }else{
  for(const size of ['12 oz','16 oz','22 oz'])addSizeRow('standard',size,'',true);
 }
 show(item?'Edit the product, sizes, availability and picture.':'Enter the new menu item details.');
 editorCategory.dataset.previousCategory=editorCategory.value;
 edit.hidden=false;edit.scrollIntoView({behavior:'smooth',block:'start'});
}
function collect(){
 const name=$('menuEditorName').value.trim(),category=$('menuEditorCategory').value.trim();
 if(name.length<2||category.length<2)throw Error('Enter a valid name and category.');
 const groups={standard:[],premium:[]},hidden={standard:[],premium:[]};
 for(const row of rows.children){
  const type=row.querySelector('select').value;
  const size=row.querySelector('.kbr-menu-size-label').value.trim();
  const price=Number(row.querySelector('.kbr-menu-size-price').value);
  if(!size||!Number.isFinite(price)||price<1||price>99999)throw Error('Every size needs a name and a price between ₱1 and ₱99,999.');
  if(groups[type].some(x=>x.size.toLowerCase()===size.toLowerCase()))throw Error('Duplicate size: '+size);
  groups[type].push({size,price});
  if(!row.querySelector('input[type=checkbox]').checked)hidden[type].push(size);
 }
 if(!groups.standard.length)throw Error('Add at least one standard size.');
 if(groups.standard.every(x=>hidden.standard.includes(x.size))&&groups.premium.every(x=>hidden.premium.includes(x.size))&&$('menuEditorAvailability').value==='available')
   throw Error('Enable at least one size or mark the whole product Not Available.');
 const original=editing||{};
 return {...original,name,category,
  availability:$('menuEditorAvailability').value,
  food:menuMode(category)==='food'||$('menuEditorFood').checked,
  sizes:groups.standard.map(x=>x.size),
  prices:groups.standard.map(x=>x.price),
  premiumSizes:groups.premium.length?groups.premium.map(x=>x.size):null,
  premium:groups.premium.length?groups.premium.map(x=>x.price):null,
  sizeUnavailable:hidden,
  image:original.image||''};
}
async function upload(file){
 if(file.size>10000000)throw Error('Photo is too large (maximum 10 MB original).');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Please select a JPG, PNG or WebP picture.');
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
 if(!blob||blob.size>2097152)throw Error('Could not compress the image.');
 // Trigger token refresh before obtaining the manager's current access token.
 await KBRCloud.rpc('kbr_management_access',{});
 const session=KBRCloud.session();if(!session?.access_token)throw Error('Sign in to upload an image.');
 const path=crypto.randomUUID()+'.jpg';
 const url=KBRCloud.config.url+'/storage/v1/object/kbr-menu-images/'+path;
 const response=await fetch(url,{method:'POST',headers:{
  apikey:KBRCloud.config.key,
  Authorization:'Bearer '+session.access_token,
  'Content-Type':'image/jpeg','Cache-Control':'3600','x-upsert':'false'
 },body:blob});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||data.error||'Photo upload failed.');}
 return KBRCloud.config.url+'/storage/v1/object/public/kbr-menu-images/'+path;
}
async function saveEditor(e){
 e.preventDefault();if(busy)return;
 let data;try{data=collect();}catch(err){show(err.message,true);return;}
 busy=true;$('menuEditorSave').disabled=true;show('Saving menu item…');
 try{
  if(photoFile){show('Uploading and optimizing picture…');data.image=await upload(photoFile);}
  const result=await KBRCloud.rpc('kbr_manager_save_menu_item',{
    p_product_id:editing?.productId||null,
    p_item:data,p_expected_revision:revision
  });
  if(result?.conflict){edit.hidden=true;busy=false;await load();show('Another manager updated the menu. Reloaded latest version; please review your changes.',true);return;}
  if(!result?.ok)throw Error('Menu save was not confirmed.');
  revision=Number(result.revision);
  if(editing?.productId){
    const index=items.findIndex(x=>x.productId===editing.productId);
    if(index>=0)items[index]=result.item;
  }else{items.push(result.item);}
  cleanCatList();render();edit.hidden=true;photoFile=null;show((result.created?'Added ':'Updated ')+result.item.name+'. New orders use the updated menu.');
 }catch(err){show(err.message||'Save failed.',true);}
 finally{busy=false;$('menuEditorSave').disabled=false;}
}
async function toggle(item,currentlyAvailable){
 if(busy)return;busy=true;show('Updating availability…');
 try{
  const result=await KBRCloud.rpc('kbr_manager_save_menu_item',{
    p_product_id:item.productId,
    p_item:{...item,availability:currentlyAvailable?'unavailable':'available'},
    p_expected_revision:revision
  });
  if(result?.conflict){busy=false;await load();show('Menu changed on another device. Please try again.',true);return;}
  if(!result?.ok)throw Error('Unable to save availability.');
  revision=Number(result.revision);Object.assign(item,result.item);render();show('Availability saved for '+item.name+'.');
 }catch(err){show(err.message||'Could not change availability.',true);}
 finally{busy=false;}
}
editorCategory.addEventListener('change',()=>{
 const previous=editorCategory.dataset.previousCategory||'';
 updateEditorLayout(previous);
 editorCategory.dataset.previousCategory=editorCategory.value;
});
$('menuManageNew').addEventListener('click',()=>openEditor());
$('menuManageRefresh').addEventListener('click',load);
$('menuEditorClose').addEventListener('click',()=>{edit.hidden=true;photoFile=null;});
$('menuEditorAddSize').addEventListener('click',()=>addSizeRow('standard','','',true));
$('menuEditorForm').addEventListener('submit',saveEditor);
search.addEventListener('input',render);
filter.addEventListener('change',render);
photo.addEventListener('change',()=>{
 photoFile=photo.files?.[0]||null;
 if(photoFile){const local=URL.createObjectURL(photoFile);imagePreview.src=local;imagePreview.hidden=false;imagePreview.onload=()=>URL.revokeObjectURL(local);}
});
window.KBRMenuManagement={load};
})();
