(() => {
'use strict';
const request=document.getElementById('request'),change=document.getElementById('change'),message=document.getElementById('message');
const cfg=window.KBR_SYNC_CONFIG,fragment=new URLSearchParams(location.hash.slice(1));
let token=fragment.get('type')==='recovery'?fragment.get('access_token'):null;
const linkError=fragment.get('error_description');
history.replaceState(null,'',location.pathname);
if(token){request.hidden=true;change.hidden=false;}
if(linkError) message.textContent='This reset link is expired or invalid. Request a new email below.';
async function api(path,method,body,bearer){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const headers={apikey:cfg.key,'Content-Type':'application/json'};if(bearer)headers.Authorization='Bearer '+bearer;
 const response=await fetch(cfg.url+'/auth/v1/'+path,{method,headers,body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.msg||data.message||data.error_description||'Request failed. Please try again.');return data;
 }finally{clearTimeout(timer);}
}
async function submit(form,action){const button=form.querySelector('button');button.disabled=true;message.textContent='';try{await action();}catch(error){message.textContent=error.name==='AbortError'?'Connection timed out. Please try again.':error.message;}finally{button.disabled=false;}}
request.onsubmit=e=>{e.preventDefault();submit(request,async()=>{
 const redirect=new URL('reset-password.html',location.href).href;
 await api('recover?redirect_to='+encodeURIComponent(redirect),'POST',{email:document.getElementById('email').value.trim()});
 message.textContent='If this email has a staff account, a reset link will be sent. Open the newest email.';
});};
change.onsubmit=e=>{e.preventDefault();submit(change,async()=>{
 const password=document.getElementById('password'),confirm=document.getElementById('confirm');
 if(password.value!==confirm.value)throw new Error('The passwords do not match.');
 if(!token)throw new Error('Request a new reset email.');
 await api('user','PUT',{password:password.value},token);
 password.value='';confirm.value='';token=null;change.hidden=true;
 localStorage.removeItem('kbr_cloud_session_v1');
 message.textContent='Password updated. Choose Back to sign in and use your new password.';
});};
})();