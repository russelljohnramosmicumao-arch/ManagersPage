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

 function checkFile(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP photo.');
  if(file.size>12*1024*1024)throw Error('Choose a photo smaller than 12 MB.');
 }
 async function upload(id,blob){
  if(!(blob instanceof Blob)||!blob.size||blob.size>2097152||blob.type!=='image/jpeg')throw Error('Adjusted photo is invalid or exceeds 2 MB.');
  if(!window.KBREmployeeGate?.unlocked)throw Error('Unlock Employee Information before uploading photos.');
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
 // The preview and saved image share the exact same crop coordinates.
 function cropDialog(source,name){
  return new Promise((resolve,reject)=>{
   let image=null,closed=false,zoom=1,offsetX=0,offsetY=0,drag=null;
   const modal=document.createElement('div');
   modal.className='employee-crop-overlay';
   modal.setAttribute('role','dialog');
   modal.setAttribute('aria-modal','true');
   modal.setAttribute('aria-label','Adjust profile photo of '+name);
   modal.innerHTML='<section class="employee-crop-panel"><div class="employee-crop-heading"><strong>Crop & Center Photo</strong><button type="button" data-crop-cancel aria-label="Cancel photo edit">✕</button></div><p>Drag to center the face. Zoom until the photo fits the circle.</p><div class="employee-crop-stage"><canvas width="640" height="640" aria-label="Circular profile photo preview"></canvas></div><label class="employee-crop-zoom">Zoom <input type="range" min="1" max="3" step="0.01" value="1"></label><div class="employee-crop-tools"><button type="button" data-crop-minus aria-label="Zoom out">−</button><button type="button" data-crop-center>Reset position</button><button type="button" data-crop-plus aria-label="Zoom in">+</button></div><p class="employee-crop-feedback" role="status"></p><div class="employee-crop-actions"><button type="button" data-crop-back>Cancel</button><button type="button" data-crop-save>Save Cropped Photo</button></div></section>';
   const canvas=modal.querySelector('canvas'),ctx=canvas.getContext('2d');
   const slider=modal.querySelector('input[type="range"]'),save=modal.querySelector('[data-crop-save]');
   const feedback=modal.querySelector('.employee-crop-feedback');
   const previousFocus=document.activeElement;
   const escListener=e=>{if(e.key==='Escape'){e.preventDefault();finish(null);}};
   function finish(value,error){
    if(closed)return;closed=true;window.removeEventListener('keydown',escListener);
    if(image?.close)image.close();modal.remove();previousFocus?.focus?.();
    if(error)reject(error);else resolve(value);
   }
   const size=640;
   function dimensions(){
    const scale=Math.max(size/image.width,size/image.height)*zoom;
    return {w:image.width*scale,h:image.height*scale};
   }
   function clamp(){
    if(!image)return;
    const {w,h}=dimensions();
    offsetX=Math.max((size-w)/2,Math.min((w-size)/2,offsetX));
    offsetY=Math.max((size-h)/2,Math.min((h-size)/2,offsetY));
   }
   function draw(){
    if(!image)return;clamp();
    const {w,h}=dimensions();
    ctx.clearRect(0,0,size,size);
    ctx.save();ctx.beginPath();ctx.arc(size/2,size/2,size/2,0,2*Math.PI);ctx.clip();
    ctx.fillStyle='#eee4d7';ctx.fillRect(0,0,size,size);
    ctx.drawImage(image,(size-w)/2+offsetX,(size-h)/2+offsetY,w,h);
    ctx.restore();
    ctx.beginPath();ctx.arc(size/2,size/2,size/2-2,0,2*Math.PI);
    ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=5;ctx.stroke();
   }
   function setZoom(value){zoom=Math.max(1,Math.min(3,Number(value)||1));slider.value=zoom;draw();}
   slider.oninput=()=>setZoom(slider.value);
   modal.querySelector('[data-crop-minus]').onclick=()=>setZoom(zoom-.15);
   modal.querySelector('[data-crop-plus]').onclick=()=>setZoom(zoom+.15);
   modal.querySelector('[data-crop-center]').onclick=()=>{zoom=1;offsetX=offsetY=0;slider.value='1';draw();};
   modal.querySelector('[data-crop-cancel]').onclick=()=>finish(null);
   modal.querySelector('[data-crop-back]').onclick=()=>finish(null);
   modal.onclick=e=>{if(e.target===modal)finish(null);};
   canvas.addEventListener('pointerdown',e=>{
    if(!image||save.disabled)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY};
    canvas.setPointerCapture(e.pointerId);
   });
   canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const rect=canvas.getBoundingClientRect(),scale=size/rect.width;
    offsetX=drag.ox+(e.clientX-drag.x)*scale;offsetY=drag.oy+(e.clientY-drag.y)*scale;
    draw();
   });
   for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
   canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom+(e.deltaY>0?-.06:.06));},{passive:false});
   // Export square JPEG with the exact circle content centered inside it.
   // Outside the circle remains neutral white and is cropped by the profile avatar.
   save.onclick=async()=>{
    if(!image)return;
    save.disabled=true;feedback.textContent='Preparing cropped photo…';
    try{
     const output=document.createElement('canvas');output.width=output.height=size;
     const out=output.getContext('2d');out.fillStyle='#fff';out.fillRect(0,0,size,size);
     const {w,h}=dimensions();clamp();
     out.drawImage(image,(size-w)/2+offsetX,(size-h)/2+offsetY,w,h);
     const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.88));
     if(!blob||blob.size>2097152)throw Error('Could not prepare a photo under 2 MB.');
     finish(blob);
    }catch(err){save.disabled=false;feedback.textContent=err.message||String(err);}
   };
   document.body.append(modal);
   modal.querySelector('[data-crop-back]').focus();
   window.addEventListener('keydown',escListener);
   (async()=>{
    try{
     image=await createImageBitmap(source);
     if(closed){image.close();return;}
     draw();
    }catch(e){finish(null,Error('Could not open this photo for cropping. Please choose another.'));}
   })();
  });
 }
 function editor(id,name,current,onSaved){
  const section=document.createElement('section');section.className='employee-photo-editor';
  let url=current||null;
  function render(){
   section.innerHTML='<div class="employee-photo-preview">'+avatar(url,name)+'</div><div class="employee-photo-editor-actions"><strong>Profile photo</strong><small>Shown when this employee clocks in or out. Use a clear photo with permission.</small><label class="employee-photo-upload">Upload / Change Photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label><button type="button" class="employee-photo-remove" '+(!url?'disabled':'')+'>Remove Photo</button><p role="status" class="employee-photo-status"></p></div>';
   const input=section.querySelector('input'),remove=section.querySelector('.employee-photo-remove'),msg=section.querySelector('.employee-photo-status'),label=section.querySelector('.employee-photo-upload');
   input.onchange=async()=>{
    const file=input.files?.[0];if(!file)return;
    input.disabled=true;remove.disabled=true;label.classList.add('busy');msg.textContent='Opening photo editor…';
    try{
     checkFile(file);
     const blob=await cropDialog(file,name);
     if(!blob){msg.textContent='Photo edit cancelled. No changes saved.';return;}
     msg.textContent='Uploading cropped photo…';
     url=await upload(id,blob);onSaved?.(url);render();
     section.querySelector('.employee-photo-status').textContent='Centered photo saved and synced to Clock In/Out.';
    }catch(e){msg.textContent=e.message||String(e);}
    finally{if(input.isConnected){input.value='';input.disabled=false;remove.disabled=!url;label.classList.remove('busy');}}
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