function mountManagerPinKeypad(form){
 const input=form.elements.pin;input.type='hidden';input.readOnly=true;input.inputMode='none';
 const error=form.querySelector('[data-error]');error.className='manager-pin-error';
 const screen=document.createElement('div');screen.className='manager-pin-screen';
 const display=document.createElement('output');display.className='manager-pin-display';display.setAttribute('aria-label','Passcode');display.setAttribute('aria-live','polite');
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='×';cancel.setAttribute('aria-label','Cancel');cancel.onclick=()=>KBRSyncUI.close();screen.append(display,cancel);
 const pad=document.createElement('div');pad.className='manager-pin-pad';pad.setAttribute('aria-label','PIN keypad');
 function update(){display.textContent='*'.repeat(input.value.length);display.setAttribute('aria-label',input.value.length+' PIN digits entered');}
 for(const key of ['1','2','3','4','5','6','7','8','9','⌫','0','✓']){
  const button=document.createElement('button');button.type=key==='✓'?'submit':'button';button.textContent=key;button.setAttribute('aria-label',key==='⌫'?'Delete last PIN digit':key==='✓'?'Submit PIN':key);
  if(key!=='✓')button.onclick=()=>{if(form.querySelector('button[type="submit"]').disabled)return;input.value=key==='⌫'?input.value.slice(0,-1):input.value.length<10?input.value+key:input.value;error.textContent='';screen.classList.remove('invalid');update();};pad.append(button);
 }
 const back=document.createElement('button');back.type='button';back.className='manager-pin-cancel';back.textContent='Cancel';back.onclick=()=>{input.value='';location.assign('https://russelljohnramosmicumao-arch.github.io/KapeBarrioHomeScreen/');};form.className='manager-pin-form';form.replaceChildren(input,screen,pad,back,error);const box=document.querySelector('#cloudScreen .cloud-box');box.classList.add('manager-pin-box');box.replaceChildren(form);
 if(!document.getElementById('managerPinKeypadStyle')){const style=document.createElement('style');style.id='managerPinKeypadStyle';style.textContent='.cloud-box.manager-pin-box{width:min(300px,calc(100vw - 24px));padding:18px;border-radius:20px}.manager-pin-form{display:block}.manager-pin-screen{display:flex;align-items:center;background:#f4ece3;border:2px solid #cbb59d;border-radius:12px;margin-bottom:14px;min-height:62px}.manager-pin-display{display:block;flex:1;min-width:0;text-align:center;font:700 30px monospace;letter-spacing:7px;color:#503827}.manager-pin-screen.invalid{border-color:#b83232}.cloud-box .manager-pin-screen button{background:transparent;color:#80644b;padding:8px;margin:0 6px 0 0;font-size:23px}.manager-pin-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cloud-box .manager-pin-pad button{min-height:52px;padding:8px;margin:0;border:1px solid #80644b;border-radius:10px;background:#6b4328;color:white;font:700 23px system-ui}.cloud-box .manager-pin-pad button[type=submit]{background:#386944;border-color:#386944}.manager-pin-pad button:focus-visible{outline:3px solid #d9a441;outline-offset:2px}.manager-pin-pad button:disabled{opacity:.5}.cloud-box .manager-pin-cancel{display:block;width:100%;margin:14px 0 0;padding:12px;border:1px solid #cbb59d;border-radius:10px;background:#eee5dc;color:#503827;font:700 16px system-ui}.manager-pin-error{display:block;position:static;width:auto;height:auto;overflow:visible;clip-path:none;min-height:1.2em;margin:10px 0 0!important;color:#a62d2d;font:600 13px system-ui;text-align:center;white-space:normal}';document.head.append(style);}
 new MutationObserver(()=>{screen.classList.toggle('invalid',!!error.textContent);update();}).observe(error,{childList:true,characterData:true,subtree:true});
 form.addEventListener('submit',event=>{if(!/^\d{4,10}$/.test(input.value)){event.preventDefault();event.stopImmediatePropagation();error.textContent='Enter your 4–10 digit PIN.';screen.classList.add('invalid');}else queueMicrotask(update);},true);update();
}
(()=>{'use strict';const status=document.getElementById('status');
document.getElementById('backup').onclick=()=>{if(!localStorage.getItem('kbr_before_cloud_v1')){document.getElementById('backupStatus').textContent='No pre-sync backup was saved on this device.';return;}KBRSyncUI.backup();};
let managementUnlocked=false;try{const gate=JSON.parse(sessionStorage.getItem('kbr_management_pin_handoff_v1')||'null');managementUnlocked=!!gate&&gate.userId===KBRCloud.session()?.user?.id&&gate.expires>Date.now();}catch{}
function requestAccess(){KBRSyncUI.screen('Manager access','Enter your OWN Drink PIN from Employee Information (used for Barista Drinks and Clock In/Out). This is NOT the separate Employees section PIN or your account login password.',[['Back',()=>KBRSyncUI.close()]]);const form=document.createElement('form');form.innerHTML='<label>PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,10}" minlength="4" maxlength="10" autocomplete="off" required></label><p data-error role="alert"></p><button type="submit">Open manager page</button>';document.querySelector('#cloudScreen .cloud-box').append(form);mountManagerPinKeypad(form);form.onsubmit=async e=>{e.preventDefault();form.querySelector('button[type="submit"]').disabled=true;try{const result=await KBRCloud.rpc('kbr_open_management',{p_pin:form.elements.pin.value});form.elements.pin.value='';if(result?.error||!(result?.ok===true||(result?.id&&result?.position)))throw Error(result?.error||'Access was not approved.');managementUnlocked=true;try{sessionStorage.setItem('kbr_management_pin_handoff_v1',JSON.stringify({userId:KBRCloud.session()?.user?.id,expires:Date.now()+30*60*1000}));}catch{}KBRSyncUI.close();await start();}catch(error){form.querySelector('[data-error]').textContent=error.message;
if(/Too many incorrect PIN attempts/i.test(error.message||'')){
 const submit=form.querySelector('button[type="submit]');submit.disabled=true;
 const digits=form.querySelectorAll('.manager-pin-pad button');digits.forEach(b=>b.disabled=true);
 form.querySelector('[data-error]').textContent='Too many incorrect PIN attempts. The security lock lasts five minutes. Please return after it expires, and use your own Drink PIN (not the Employees PIN).';
}else{form.querySelector('button[type="submit"]').disabled=false;}}};}

// Employee records require a separate owner password in addition to Manager Page login.
// This is a second on-screen gate; employee data RPCs remain restricted to owner by Supabase.
let employeeUnlocked=false;
let employeeGatePending=null;
async function employeeGate(forceChange=false){
 if(!forceChange&&employeeUnlocked)return true;
 if(employeeGatePending)return employeeGatePending;
 employeeGatePending=(async()=>{
  const state=await KBRCloud.rpc('kbr_employee_lock_status',{});
  return new Promise(resolve=>{
   let settled=false;
   function finish(ok){if(settled)return;settled=true;employeeGatePending=null;resolve(ok);}
   const setup=forceChange||!state?.configured;
   KBRSyncUI.screen(setup?'Set Employee Information PIN':'Employee Information Locked',
    setup?'Owner only. Verify your own Drink PIN, then set a separate 7–10 digit Employee Information PIN.':'Enter your separate 7–10 digit Employee Information PIN.',
    [['Back',()=>{KBRSyncUI.close();finish(false);}]]);
   const form=document.createElement('form');
   form.className='employee-pin-form';
   form.autocomplete='off';
   form.innerHTML=setup?
     '<label>Owner Drink PIN<input name="ownerPin" type="password" inputmode="none" readonly maxlength="10" autocomplete="off" required aria-label="Owner Drink PIN"></label><label>New Employee PIN<input name="password" type="password" inputmode="none" readonly minlength="7" maxlength="10" autocomplete="off" required aria-label="New Employee PIN"></label><label>Confirm Employee PIN<input name="confirm" type="password" inputmode="none" readonly minlength="7" maxlength="10" autocomplete="off" required aria-label="Confirm Employee PIN"></label><p role="alert" data-lock-error></p><button type="submit" class="employee-pin-save">Set PIN & Unlock</button>':
     '<label>Employee Information PIN<input name="password" type="password" inputmode="none" readonly minlength="7" maxlength="10" autocomplete="off" required aria-label="Employee Information PIN"></label><p role="alert" data-lock-error></p><button type="submit" class="employee-pin-save">Unlock Employees</button><button type="button" class="employee-pin-reset">Reset PIN using Owner Drink PIN</button>';
   const fields=setup?['ownerPin','password','confirm']:['password'];
   let focused=fields[0];
   const pad=document.createElement('div');
   pad.className='employee-pin-pad';
   pad.setAttribute('aria-label','Employee PIN numeric keypad');
   function choose(field){
    focused=field;
    for(const name of fields)form.elements[name].classList.toggle('pin-focused',name===field);
   }
   for(const name of fields){
    const input=form.elements[name];
    input.addEventListener('click',()=>choose(name));
    input.addEventListener('focus',()=>choose(name));
   }
   for(const key of ['1','2','3','4','5','6','7','8','9','Clear','0','⌫']){
    const button=document.createElement('button');
    button.type='button';button.textContent=key;
    button.setAttribute('aria-label',key==='⌫'?'Delete last digit':key==='Clear'?'Clear selected PIN':key);
    button.onclick=()=>{
     if(form.querySelector('[type="submit"]').disabled)return;
     const input=form.elements[focused];
     input.value=key==='Clear'?'':key==='⌫'?input.value.slice(0,-1):input.value.length<10?input.value+key:input.value;
     form.querySelector('[data-lock-error]').textContent='';
     input.focus({preventScroll:true});
    };
    pad.append(button);
   }
   form.querySelector('[data-lock-error]').before(pad);
   document.querySelector('#cloudScreen .cloud-box').append(form);
   choose(fields[0]);
   if(!setup)form.querySelector('.employee-pin-reset').onclick=()=>{KBRSyncUI.close();finish(false);employeeGate(true);};
   form.onsubmit=async e=>{
    e.preventDefault();
    const button=form.querySelector('[type="submit"]');
    const error=form.querySelector('[data-lock-error]');
    if(setup&&!/^\d{4,10}$/.test(form.elements.ownerPin.value)){
     error.textContent='Enter your current Owner Drink PIN.';choose('ownerPin');return;
    }
    if(!/^\d{7,10}$/.test(form.elements.password.value)){
     error.textContent='Employee Information PIN must contain 7–10 digits.';choose('password');return;
    }
    if(setup&&form.elements.password.value!==form.elements.confirm.value){
     error.textContent='Employee PINs do not match.';choose('confirm');return;
    }
    button.disabled=true;pad.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
     const reply=await KBRCloud.rpc(setup?'kbr_set_employee_lock':'kbr_verify_employee_lock',setup?{
      p_owner_pin:form.elements.ownerPin.value,p_password:form.elements.password.value
     }:{p_password:form.elements.password.value});
     if(!reply?.ok)throw Error(reply?.error||'Employee PIN was not accepted.');
     employeeUnlocked=true;form.reset();KBRSyncUI.close();
     await KBRStaffManager.load();
     finish(true);
    }catch(err){
     error.textContent=err.message||String(err);button.disabled=false;
     pad.querySelectorAll('button').forEach(b=>b.disabled=false);
    }
   };
  });
 })().catch(e=>{employeeGatePending=null;KBRSyncUI.screen('Employee lock unavailable',e.message||String(e),[['Back',()=>KBRSyncUI.close()]]);return false;});
 return employeeGatePending;
}
window.KBREmployeeGate={require:()=>employeeGate(false),change:()=>employeeGate(true),get unlocked(){return employeeUnlocked;}};

async function start(){if(!KBRCloud.requireLogin())return;try{if(!await KBRCloud.rpc('kbr_management_access',{})){throw Error('Only Owner, Manager and Assistant Manager accounts can access this page.');}if(!managementUnlocked){requestAccess();return;}const permissions=await KBRCloud.rpc('kbr_current_ui_permissions',{});if(!permissions?.management)throw Error('Management access required');window.KBRUIPermissions=permissions;status.textContent=permissions.owner?'Employees, inventory, sales, and backups.':'Inventory, customer accounts, prices, and shop settings.';document.getElementById('denied').hidden=true;window.KBRManagerTabs?.applyPermissions(permissions);document.getElementById('managerContent').hidden=false;}catch(error){status.textContent=error.message;document.getElementById('denied').hidden=false;}}start();
})();
