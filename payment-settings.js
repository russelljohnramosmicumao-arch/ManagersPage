'use strict';
(()=>{
const root=document.getElementById('panel-settings');
if(!root||!window.KBRCloud)return;
const list=root.querySelector('#kbrPaymentMethods'),notice=root.querySelector('#kbrPaymentStatus');
let methods=[],busy=false,selectedPaymentTile=null;
const say=(s)=>{notice.textContent=s};
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SUPABASE='https://wkyyuyyfauyhpivebrdg.supabase.co';
async function saveQR(code,file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG or WebP QR image.');
 if(file.size>8000000)throw Error('QR file is too large (8 MB maximum).');
 const img=await createImageBitmap(file);
 const scale=Math.min(1,1100/Math.max(img.width,img.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,canvas.width,canvas.height);img.close();
 let blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
 let contentType='image/png',extension='png';
 if(!blob||blob.size>2097152){blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.94));contentType='image/jpeg';extension='jpg';}
 if(!blob||blob.size>2097152)throw Error('QR picture is too large after optimizing.');
 await KBRCloud.rpc('kbr_management_access',{});
 const session=KBRCloud.session();
 if(!session?.access_token)throw Error('Sign in again as manager to upload payment QR.');
 const filename=crypto.randomUUID()+'.'+extension;
 const response=await fetch(SUPABASE+'/storage/v1/object/kbr-payment-qrs/'+filename,{
 method:'POST',headers:{
  apikey:KBRCloud.config.key,
  Authorization:'Bearer '+session.access_token,
  'Content-Type':contentType,'Cache-Control':'3600','x-upsert':'false'
 },body:blob});
 if(!response.ok){const problem=await response.json().catch(()=>({}));throw Error(problem.message||problem.error||'Could not upload QR image.');}
 const url=SUPABASE+'/storage/v1/object/public/kbr-payment-qrs/'+filename;
 const linked=await KBRCloud.rpc('kbr_manager_set_payment_qr',{p_code:code,p_qr_url:url});
 if(!linked?.ok)throw Error('QR uploaded, but could not link it to the payment method.');
 return url;
}
function paymentQRControls(method){
 const wrap=document.createElement('div');wrap.className='kbr-payment-qr-editor';
 const title=document.createElement('strong');title.textContent='Payment QR picture';
 const preview=document.createElement('img');preview.alt='QR code for '+method.label;preview.className='kbr-payment-qr-preview';
 const imageUrl=method.qrUrl||'';
 if(imageUrl)preview.src=imageUrl;else preview.hidden=true;
 const field=document.createElement('input');field.type='file';field.accept='image/png,image/jpeg,image/webp';field.setAttribute('aria-label','Upload QR picture for '+method.label);
 const upload=document.createElement('button');upload.type='button';upload.textContent='Upload / Replace QR';
 const remove=document.createElement('button');remove.type='button';remove.textContent='Remove QR';remove.disabled=!imageUrl;
 const actions=document.createElement('div');actions.className='kbr-payment-qr-actions';actions.append(field,upload,remove);
 wrap.append(title,preview,actions);
 field.addEventListener('change',()=>{
  const file=field.files?.[0];if(!file)return;
  const local=URL.createObjectURL(file);
  preview.src=local;preview.hidden=false;preview.onload=()=>URL.revokeObjectURL(local);
 });
 upload.onclick=async()=>{
  if(busy)return;
  const file=field.files?.[0];if(!file){say('Choose a QR picture first.');return;}
  busy=true;upload.disabled=true;say('Saving QR for '+method.label+'…');
  try{await saveQR(method.code,file);busy=false;await load();say(method.label+' QR saved and shared with both ordering apps.');}
  catch(e){say('QR upload failed: '+(e.message||e));}finally{busy=false;upload.disabled=false;}
 };
 remove.onclick=async()=>{
  if(busy||!confirm('Remove the QR image for '+method.label+'?'))return;
  busy=true;remove.disabled=true;
  try{await KBRCloud.rpc('kbr_manager_set_payment_qr',{p_code:method.code,p_qr_url:''});busy=false;await load();say('QR removed.');}
  catch(e){say(e.message||'Unable to remove QR.');}finally{busy=false;remove.disabled=false;}
 };
 return wrap;
}
async function load(){
 if(busy)return;
 busy=true;say('Loading payment methods…');
 try{const data=await KBRCloud.rpc('kbr_manager_payment_methods_snapshot',{});
  methods=Array.isArray(data)?data:[];render();say('Manage the payment choices shown in Online Ordering and Barista checkout.');
 }catch(e){say(e.message||'Could not load payment methods.');}
 finally{busy=false;}
}
function render(){
 list.replaceChildren();
 const tiles=root.querySelector('#kbrPaymentTiles');
 const detail=root.querySelector('#kbrPaymentDetails');
 const addDetail=root.querySelector('#kbrPaymentAddDetails');
 tiles.replaceChildren();
 // Only the selected payment's editor becomes visible; no settings are modified until saved.
 const selectTile=(code)=>{
  selectedPaymentTile=code;
  for(const tile of tiles.querySelectorAll('[data-payment-tile]'))tile.setAttribute('aria-pressed',String(tile.dataset.paymentTile===code));
  detail.hidden=code==='add'||!code;
  addDetail.hidden=code!=='add';
  for(const form of list.querySelectorAll('[data-payment-form]'))form.hidden=form.dataset.paymentForm!==code;
 };
 const tile=(code,label,emoji,subtitle)=>{
  const button=document.createElement('button');button.type='button';button.className='kbr-settings-tile';
  button.dataset.paymentTile=code;button.setAttribute('aria-pressed','false');
  const picture=document.createElement('span');picture.className='tile-emoji';picture.textContent=emoji;
  const title=document.createElement('strong');title.textContent=label;
  const sub=document.createElement('small');sub.textContent=subtitle;
  button.append(picture,title,sub);
  button.onclick=()=>selectTile(code);
  tiles.append(button);
 };
 for(const method of methods){
  tile(method.code,method.code==='cash'?'Cash':method.code==='gcash'?'GCash':method.label,
   method.code==='cash'?'💵':method.code==='gcash'?'📱':'💳',
   method.code==='cash'?'Cash drawer and settings':method.type==='digital'?'Account and QR settings':'Payment settings');
 }
 tile('add','Add Payment Method','➕','Maya, bank transfer or another option');
 for(const method of methods){
  const form=document.createElement('form');form.className='kbr-payment-card';form.dataset.paymentForm=method.code;
  const heading=document.createElement('h3');heading.textContent=method.label+' ('+method.code+')';
  const fields=document.createElement('div');fields.className='kbr-payment-fields';
  const make=(label,value,kind='text',max=80)=>{
   const container=document.createElement('label');container.textContent=label;
   const input=document.createElement('input');input.type=kind;input.value=value||'';input.maxLength=max;input.required=label==='Payment label';container.append(input);fields.append(container);return input;
  };
  const label=make('Payment label',method.label,'text',48);
  const account=make('Receiving account / number',method.accountNumber,'text',80);
  const instructions=make('Customer payment instructions',method.instructions,'text',300);
  const kind=document.createElement('label');kind.textContent='Payment type';
  const select=document.createElement('select');select.append(new Option('Cash','cash'),new Option('Digital / transfer','digital'));select.value=method.type;select.disabled=method.code==='cash'||method.code==='gcash';kind.append(select);fields.append(kind);
  const switches=document.createElement('div');switches.className='kbr-payment-switches';
  const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=method.enabled;enabled.disabled=method.code==='cash';
  const online=document.createElement('input');online.type='checkbox';online.checked=method.onlineEnabled;
  const enabledLabel=document.createElement('label');enabledLabel.append(enabled,document.createTextNode(' Enabled'));
  const onlineLabel=document.createElement('label');onlineLabel.append(online,document.createTextNode(' Show in Online Ordering'));
  switches.append(enabledLabel,onlineLabel);
  const save=document.createElement('button');save.type='submit';save.textContent='Save '+method.label;
  form.append(heading,fields,switches,...(method.type==='digital'?[paymentQRControls(method)]:[]),save);form.onsubmit=async e=>{
   e.preventDefault();if(busy)return;
   busy=true;save.disabled=true;say('Saving '+method.label+'…');
   try{const result=await KBRCloud.rpc('kbr_manager_upsert_payment_method',{
    p_code:method.code,p_label:label.value.trim(),p_enabled:enabled.checked,p_online_enabled:online.checked,
    p_type:select.value,p_instructions:instructions.value.trim(),p_account_number:account.value.trim()
   });if(!result?.ok)throw Error('Server did not confirm the payment method.');
    busy=false;await load();say('Payment method saved. Customers will see the change on refresh.');
   }catch(error){say(error?.message||'Save failed.');}finally{busy=false;save.disabled=false;}
  };
  list.append(form);
 }
 if(selectedPaymentTile && !methods.some(x=>x.code===selectedPaymentTile) && selectedPaymentTile!=='add')selectedPaymentTile=null;
 selectTile(selectedPaymentTile);
}
const newForm=root.querySelector('#kbrAddPaymentForm');
const addQR=document.createElement('label');addQR.className='kbr-add-payment-qr';addQR.textContent='Payment QR picture (optional)';
const addQRInput=document.createElement('input');addQRInput.type='file';addQRInput.accept='image/png,image/jpeg,image/webp';addQR.append(addQRInput);
newForm.querySelector('.kbr-payment-fields')?.append(addQR);
newForm.onsubmit=async e=>{
 e.preventDefault();if(busy)return;
 const label=newForm.elements.label.value.trim(),type=newForm.elements.type.value;
 const slug=label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32);
 if(slug.length<2||!slug.match(/^[a-z][a-z0-9-]{1,31}$/)){say('Enter a name using letters and numbers.');return;}
 if(methods.some(x=>x.code===slug)){say('A payment method with this name already exists. Edit its card above.');return;}
 busy=true;say('Adding '+label+'…');
 try{const result=await KBRCloud.rpc('kbr_manager_upsert_payment_method',{
 p_code:slug,p_label:label,p_enabled:true,p_online_enabled:true,p_type:type,
 p_instructions:newForm.elements.instructions.value.trim(),
 p_account_number:newForm.elements.account.value.trim()
 });if(!result?.ok)throw Error('Save was not confirmed.');
 const photo=addQRInput.files?.[0]||null;
 let qrError=null;
 if(photo)try{await saveQR(slug,photo);}catch(error){qrError=error;}
 newForm.reset();busy=false;await load();
 say(qrError?label+' was added, but its QR image could not be saved: '+(qrError.message||qrError)+'. Use its card above to retry.':label+' added successfully'+(photo?' with QR':'')+'.');
 }catch(error){say(error?.message||'Could not add payment method.');}finally{busy=false;}
};
root.querySelector('#kbrPaymentRefresh').onclick=load;
window.KBRPaymentSettings={load};
})();