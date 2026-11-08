'use strict';
(()=>{
const root=document.getElementById('panel-settings');
if(!root||!window.KBRCloud)return;
const list=root.querySelector('#kbrPaymentMethods'),notice=root.querySelector('#kbrPaymentStatus');
let methods=[],busy=false;
const say=(s)=>{notice.textContent=s};
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){
 if(busy)return;
 busy=true;say('Loading payment methods…');
 try{const data=await KBRCloud.rpc('kbr_manager_payment_methods_snapshot',{});
  methods=Array.isArray(data)?data:[];render();say('Manage the payment choices shown in Online Ordering.');
 }catch(e){say(e.message||'Could not load payment methods.');}
 finally{busy=false;}
}
function render(){
 list.replaceChildren();
 for(const method of methods){
  const form=document.createElement('form');form.className='kbr-payment-card';
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
  form.append(heading,fields,switches,save);form.onsubmit=async e=>{
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
}
const newForm=root.querySelector('#kbrAddPaymentForm');
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
 newForm.reset();busy=false;await load();say(label+' added successfully.');
 }catch(error){say(error?.message||'Could not add payment method.');}finally{busy=false;}
};
root.querySelector('#kbrPaymentRefresh').onclick=load;
window.KBRPaymentSettings={load};
})();