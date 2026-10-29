(()=>{'use strict';
let accounts=[],loaded=false,loading=false,isOwner=false;
const list=()=>document.getElementById('customerAccountsList');
const status=()=>document.getElementById('customerAccountsStatus');
const search=()=>document.getElementById('customerAccountSearch');
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(v){return '₱'+Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:2});}
function date(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'});}
async function call(body){let s=KBRCloud.session();if(!s?.access_token)throw Error('Please sign in again.');if(s.expires_at<Date.now()+60000){await KBRCloud.request('/auth/v1/user');s=KBRCloud.session();}
 const res=await fetch(KBRCloud.config.url+'/functions/v1/kbr-customer-accounts',{method:'POST',headers:{apikey:KBRCloud.config.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await res.text();let data;try{data=text?JSON.parse(text):{};}catch{data={};}if(!res.ok||data.error)throw Error(data.message||data.error||'Customer account request failed.');return data;}
function render(){const q=(search()?.value||'').trim().toLowerCase();const filtered=accounts.filter(a=>[a.name,a.profilePhone,a.loginPhone,a.profileEmail,a.loginEmail].some(v=>String(v||'').toLowerCase().includes(q)));if(!filtered.length){list().innerHTML='<p>No customer accounts match this search.</p>';return;}
 list().innerHTML=filtered.map(a=>{const phone=a.loginPhone||a.profilePhone||'—',email=a.loginEmail||a.profileEmail||'—',last=a.lastOrder;const phoneReset=a.phoneConnected?`<button type="button" data-reset-password="${esc(a.userId)}">Reset KBR Password</button>`:`<button type="button" disabled title="No phone/password login">No Phone Password</button>`;const pointAdjust=isOwner?`<button type="button" class="owner-points-button" data-adjust-points="${esc(a.userId)}">⭐ Adjust Points</button>`:'';return `<article class="customer-account-card" data-customer-id="${esc(a.userId)}"><div><h3>${esc(a.name||'KBR Customer')}</h3><div class="customer-account-badges"><span class="customer-account-badge ${a.phoneConnected?'on':''}">📱 Phone ${a.phoneConnected?'Connected':'Not connected'}</span><span class="customer-account-badge ${a.googleConnected?'google':''}">G Google ${a.googleConnected?'Connected':'Not connected'}</span></div></div><div class="customer-account-meta"><div><strong>Phone</strong><span>${esc(phone)}</span></div><div><strong>Email</strong><span>${esc(email)}</span></div><div><strong>Joined</strong><span>${esc(date(a.joinedAt))}</span></div><div><strong>Last sign-in</strong><span>${esc(date(a.lastSignInAt))}</span></div><div><strong>Orders</strong><span>${Number(a.orderCount||0).toLocaleString()}</span></div><div><strong>Last order</strong><span>${last?`#${esc(last.order_number)} · ${esc(last.status)} · ${money(last.total)} · ${esc(date(last.created_at))}`:'—'}</span></div></div><div class="customer-account-points"><span>⭐ ${Number(a.points||0).toLocaleString()} points</span><span>Lifetime ${Number(a.lifetimePoints||0).toLocaleString()}</span></div><div class="customer-account-actions">${phoneReset}${pointAdjust}</div><p class="customer-reset-note">Passwords are never shown. Google passwords must be reset through Google.</p></article>`;}).join('');
 for(const b of list().querySelectorAll('[data-reset-password]'))b.onclick=()=>resetPassword(b.dataset.resetPassword,b);
 for(const b of list().querySelectorAll('[data-adjust-points]'))b.onclick=()=>adjustPoints(b.dataset.adjustPoints,b);
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
