(()=>{'use strict';
let accounts=[],loaded=false,loading=false,isOwner=false,selectedCustomerId=null;
const list=()=>document.getElementById('customerAccountsList');
const status=()=>document.getElementById('customerAccountsStatus');
const search=()=>document.getElementById('customerAccountSearch');
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(v){return '₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:2});}
function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'});}
async function call(body){let s=KBRCloud.session();if(!s?.access_token)throw Error('Please sign in again.');if(s.expires_at<Date.now()+60000){await KBRCloud.request('/auth/v1/user');s=KBRCloud.session();}
 const res=await fetch(KBRCloud.config.url+'/functions/v1/kbr-customer-accounts',{method:'POST',headers:{apikey:KBRCloud.config.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await res.text();let data;try{data=text?JSON.parse(text):{};}catch{data={};}if(!res.ok||data.error)throw Error(data.message||data.error||'Customer account request failed.');return data;}
function render(){
 const q=(search()?.value||'').trim().toLowerCase();
 const filtered=accounts.filter(a=>[a.name,a.profilePhone,a.loginPhone,a.profileEmail,a.loginEmail].some(v=>String(v||'').toLowerCase().includes(q)));
 if(!filtered.length){list().innerHTML='<p>No customer accounts match this search.</p>';return;}
 list().innerHTML=filtered.map(a=>{
  const active=selectedCustomerId===a.userId;
  const phone=a.loginPhone||a.profilePhone||'—',email=a.loginEmail||a.profileEmail||'—',last=a.lastOrder;
  const reset=a.phoneConnected
   ?'<button type="button" data-reset-password="'+esc(a.userId)+'">Reset KBR Password</button>'
   :'<p class="customer-reset-note">No KBR phone/password login. '+(a.googleConnected?'This customer signs in through Google and must reset their Google password with Google.':'A KBR password reset is unavailable for this login.')+'</p>';
  const pointAdjust=isOwner?'<button type="button" class="owner-points-button" data-adjust-points="'+esc(a.userId)+'">⭐ Adjust Points</button>':'';
  return '<article class="customer-account-card'+(active?' selected':'')+'" data-customer-id="'+esc(a.userId)+'">'+
   '<button type="button" class="customer-name-tile" data-open-customer="'+esc(a.userId)+'" aria-expanded="'+active+'" aria-controls="customer-details-'+esc(a.userId)+'">'+
   '<span class="customer-avatar" aria-hidden="true">👤</span><span class="customer-tile-title">'+esc(a.name||'KBR Customer')+'</span><span class="customer-tile-arrow" aria-hidden="true">'+(active?'▴':'▾')+'</span></button>'+
   '<div id="customer-details-'+esc(a.userId)+'" class="customer-details" '+(active?'':'hidden')+'>'+
    '<div class="customer-account-badges"><span class="customer-account-badge '+(a.phoneConnected?'on':'')+'">📱 KBR Phone '+(a.phoneConnected?'Connected':'Not connected')+'</span><span class="customer-account-badge '+(a.googleConnected?'google':'')+'">G Google '+(a.googleConnected?'Connected':'Not connected')+'</span></div>'+
    '<div class="customer-account-meta">'+
     '<div><strong>Login phone</strong><span>'+esc(a.loginPhone||'—')+'</span></div>'+
     '<div><strong>Contact phone</strong><span>'+esc(a.profilePhone||'—')+'</span></div>'+
     '<div><strong>Contact email</strong><span>'+esc(a.profileEmail||'—')+'</span></div>'+
     '<div><strong>Account email</strong><span>'+esc(email)+'</span></div>'+
     '<div><strong>Joined</strong><span>'+esc(date(a.joinedAt))+'</span></div>'+
     '<div><strong>Last sign-in</strong><span>'+esc(date(a.lastSignInAt))+'</span></div>'+
     '<div><strong>Orders</strong><span>'+Number(a.orderCount||0).toLocaleString()+'</span></div>'+
     '<div><strong>Last order</strong><span>'+(last?'#'+esc(last.order_number)+' · '+esc(last.status)+' · '+money(last.total)+' · '+esc(date(last.created_at)):'—')+'</span></div>'+
    '</div>'+
    '<div class="customer-account-points"><span>⭐ '+Number(a.points||0).toLocaleString()+' points</span><span>Lifetime '+Number(a.lifetimePoints||0).toLocaleString()+'</span></div>'+
    '<div class="customer-account-actions"><button type="button" data-edit-profile="'+esc(a.userId)+'">Edit Customer Information</button>'+ (a.phoneConnected?reset:'')+pointAdjust+'</div>'+
    (!a.phoneConnected?reset:'')+
    '<p class="customer-reset-note">Changes to contact details do not change the customer’s sign-in phone or Google account. Existing passwords cannot be viewed.</p>'+
   '</div></article>';
 }).join('');
 for(const b of list().querySelectorAll('[data-open-customer]'))b.onclick=()=>{selectedCustomerId=selectedCustomerId===b.dataset.openCustomer?null:b.dataset.openCustomer;render();};
 for(const b of list().querySelectorAll('[data-edit-profile]'))b.onclick=()=>editProfile(b.dataset.editProfile);
 for(const b of list().querySelectorAll('[data-reset-password]'))b.onclick=()=>resetPassword(b.dataset.resetPassword,b);
 for(const b of list().querySelectorAll('[data-adjust-points]'))b.onclick=()=>adjustPoints(b.dataset.adjustPoints,b);
}
async function editProfile(userId){
 const account=accounts.find(a=>a.userId===userId);if(!account)return;
 document.getElementById('customerEditProfileScreen')?.remove();
 const wrap=document.createElement('div');wrap.id='customerEditProfileScreen';wrap.className='cloud-screen';
 const panel=document.createElement('div');panel.className='cloud-box customer-edit-box';
 const h=document.createElement('h2');h.textContent='Edit Customer Information';
 const note=document.createElement('p');note.textContent='Update the customer’s display name and contact details. Login phone, email sign-in and passwords are not changed.';
 const form=document.createElement('form');form.className='customer-edit-form';
 const fields=[['name','Customer name',account.name||'',90],['phone','Contact phone (not login phone)',account.profilePhone||'',30],['email','Contact email (not login email)',account.profileEmail||'',160]];
 for(const [key,title,value,max] of fields){
  const label=document.createElement('label');label.textContent=title;
  const input=document.createElement('input');input.name=key;input.type=key==='email'?'email':'text';input.value=value;input.maxLength=max;input.required=key==='name';
  label.append(input);form.append(label);
 }
 const actions=document.createElement('div');actions.className='customer-account-actions';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>wrap.remove();
 const save=document.createElement('button');save.type='submit';save.textContent='Save Customer';
 const error=document.createElement('p');error.setAttribute('role','alert');
 actions.append(cancel,save);form.append(error,actions);panel.append(h,note,form);wrap.append(panel);document.body.append(wrap);
 form.onsubmit=async e=>{
  e.preventDefault();if(!form.reportValidity())return;
  save.disabled=true;error.textContent='';
  try{
   const name=form.elements.name.value.trim(),phone=form.elements.phone.value.trim(),email=form.elements.email.value.trim();
   if(!name)throw Error('Customer name is required.');
   const result=await call({action:'update_profile',userId,name,phone,email});
   Object.assign(account,{name:result.profile.name,profilePhone:result.profile.phone,profileEmail:result.profile.email});
   wrap.remove();render();status().textContent='Customer information saved.';
  }catch(ex){error.textContent=ex.message||'Could not save changes.';}
  finally{save.disabled=false;}
 };
}
async function resetPassword(userId,button){const account=accounts.find(a=>a.userId===userId);if(!account)return;if(!confirm(`Reset the KBR phone password for ${account.name||'this customer'}?\n\nTheir old password cannot be recovered. A new temporary password will replace it.`))return;button.disabled=true;const old=button.textContent;button.textContent='Resetting…';try{const r=await call({action:'reset_password',userId});showTemporary(account,r.temporaryPassword,r.phone);}catch(e){alert(e.message);}finally{button.disabled=false;button.textContent=old;}}
async function adjustPoints(userId,button){
 const account=accounts.find(a=>a.userId===userId);
 if(!account||!isOwner)return;
 const current=Number(account.points||0);
 const value=prompt(`Set the exact KBR Points balance for ${account.name||'this customer'}.\n\nCurrent balance: ${current.toLocaleString()} points\n\nFor redemption testing, enter 2000.`,String(current));
 if(value===null)return;
 const points=Number(value);
 if(!Number.isInteger(points)||points<0||points>1000000){
   alert('Enter a whole-number points balance from 0 to 1,000,000.');
   return;
 }
 const reason=prompt('Reason for this Owner adjustment:','Redemption testing');
 if(reason===null)return;
 if(!confirm(`Change ${account.name||'customer'} from ${current.toLocaleString()} to ${points.toLocaleString()} points?\n\nThis action will be logged.`))return;
 button.disabled=true;
 const old=button.textContent;
 button.textContent='Saving…';
 try{
   const r=await call({action:'adjust_points',userId,points,reason:reason.trim()||'Owner adjustment'});
   account.points=Number(r.newBalance||0);
   status().textContent=`${account.name||'Customer'} now has ${account.points.toLocaleString()} points.`;
   render();
   alert(`Points updated.\n\nOld balance: ${Number(r.oldBalance||0).toLocaleString()}\nNew balance: ${Number(r.newBalance||0).toLocaleString()}\nChange: ${Number(r.delta||0).toLocaleString()} points`);
 }catch(e){
   alert(e.message);
 }finally{
   button.disabled=false;
   button.textContent=old;
 }
}

function showTemporary(account,password,phone){const wrap=document.createElement('div');wrap.className='cloud-screen';wrap.id='customerPasswordResetScreen';wrap.innerHTML=`<div class="cloud-box"><h2>Password Reset</h2><p><strong>${esc(account.name||'Customer')}</strong></p><p>${esc(phone||account.loginPhone||account.profilePhone||'')}</p><p>Give this temporary password directly to the customer:</p><div class="temporary-password-box">${esc(password)}</div><p class="temporary-password-warning">This is the only time the temporary password is shown here. The previous password cannot be viewed or recovered.</p><button type="button" id="closeCustomerPasswordReset">Close</button></div>`;document.body.append(wrap);document.getElementById('closeCustomerPasswordReset').onclick=()=>wrap.remove();}
async function load(force=false){if(loading||loaded&&!force)return;loading=true;status().classList.remove('error');status().textContent='Loading customer accounts…';try{const r=await call({action:'list'});accounts=Array.isArray(r.accounts)?r.accounts:[];isOwner=r.isOwner===true;loaded=true;status().textContent=`${accounts.length} customer account${accounts.length===1?'':'s'} loaded.`;render();}catch(e){status().textContent=e.message;status().classList.add('error');list().innerHTML='';}finally{loading=false;}}
function init(){document.getElementById('refreshCustomerAccounts')?.addEventListener('click',()=>load(true));search()?.addEventListener('input',render);}
window.KBRCustomerAccounts={load};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
