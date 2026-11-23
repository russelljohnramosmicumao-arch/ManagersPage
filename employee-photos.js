'use strict';
window.KBREmployeePhotos=(()=>{
 const bucket='kbr-employee-photos';
 const base=KBRCloud.config.url+'/storage/v1/object/public/'+bucket+'/';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const trusted=url=>typeof url==='string'&&url.startsWith(base)&&!/[<>"'\s]/.test(url);
 function avatar(url,name,cls='employee-photo'){
  const safe=trusted(url);
  return '<span class="'+cls+'">'+(safe?'<img src="'+esc(url)+'" alt="Photo of '+esc(name)+'" loading="lazy" referrerpolicy="no-referrer">':'<span class="employee-photo-initials" aria-hidden="true">'+esc(String(name||'?').trim().split(/\s+/).slice(0,2).map(v=>v[0]||'').join('').toUpperCase())+'</span>')+'</span>';
 }
 async function optimized(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
  if(file.size>12*1024*1024)throw Error('Choose a photo smaller than 12 MB.');
  const image=await createImageBitmap(file);
  try{
   const ratio=Math.min(1,800/Math.max(image.width,image.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
   if(!blob||blob.size>2097152)throw Error('Photo is too large to upload.');
   return blob;
  }finally{image.close();}
 }
 async function upload(id,file){
  const blob=await optimized(file);
  if(!(await KBRCloud.rpc('kbr_employee_lock_status',{}))?.configured)throw Error('Unlock Employee Information first.');
  const session=KBRCloud.session();
  if(!session?.access_token)throw Error('Please sign in again before uploading.');
  const object=id+'/'+crypto.randomUUID()+'.jpg';
  const response=await fetch(KBRCloud.config.url+'/storage/v1/object/'+bucket+'/'+object,{
   method:'POST',headers:{apikey:KBRCloud.config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'image/jpeg','Cache-Control':'3600','x-upsert':'false'},body:blob
  });
  if(!response.ok){
   const problem=await response.json().catch(()=>({}));
   throw Error(problem.message||problem.error||'Photo upload failed.');
  }
  const url=base+object;
  const linked=await KBRCloud.rpc('kbr_set_employee_photo',{p_barista:id,p_photo_url:url});
  if(!linked?.ok)throw Error('Photo uploaded, but could not be linked to this employee.');
  return url;
 }
 function editor(id,name,current,onSaved){
  const section=document.createElement('section');section.className='employee-photo-editor';
  let url=current||null;
  function render(){
   section.innerHTML='<div class="employee-photo-preview">'+avatar(url,name)+'</div><div class="employee-photo-editor-actions"><strong>Profile photo</strong><small>Shown when this employee clocks in or out. Use a clear photo with permission.</small><label class="employee-photo-upload">Upload / Change Photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label><button type="button" class="employee-photo-remove" '+(!url?'disabled':'')+'>Remove Photo</button><p role="status" class="employee-photo-status"></p></div>';
   const input=section.querySelector('input'),remove=section.querySelector('.employee-photo-remove'),msg=section.querySelector('.employee-photo-status'),label=section.querySelector('.employee-photo-upload');
   input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    input.disabled=true;remove.disabled=true;label.classList.add('busy');msg.textContent='Uploading photo…';
    try{url=await upload(id,file);onSaved?.(url);render();section.querySelector('.employee-photo-status').textContent='Photo saved and synced to Clock In/Out.';}
    catch(e){msg.textContent=e.message||String(e);input.disabled=false;remove.disabled=!url;label.classList.remove('busy');}
   };
   remove.onclick=async()=>{
    if(!confirm('Remove the profile picture of '+name+'?'))return;
    remove.disabled=true;input.disabled=true;msg.textContent='Removing photo…';
    try{const r=await KBRCloud.rpc('kbr_set_employee_photo',{p_barista:id,p_photo_url:null});if(!r?.ok)throw Error('Photo removal not confirmed.');url=null;onSaved?.(null);render();section.querySelector('.employee-photo-status').textContent='Profile photo removed.';}
    catch(e){msg.textContent=e.message||String(e);remove.disabled=false;input.disabled=false;}
   };
  }
  render();return section;
 }
 return {avatar,editor};
})();