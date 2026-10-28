
(()=>{
  const root=document.getElementById('menuAvailabilityManager');
  if(!root||!window.KBRCloud)return;

  const list=document.getElementById('menuAvailabilityList');
  const search=document.getElementById('menuAvailabilitySearch');
  const category=document.getElementById('menuAvailabilityCategory');
  const refresh=document.getElementById('refreshMenuAvailability');
  let items=[];
  let busy=false;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  async function rpc(name,args={}){
    return await KBRCloud.rpc(name,args);
  }

  function render(){
    const q=(search.value||'').trim().toLowerCase();
    const cat=category.value||'All';
    const filtered=items.filter(item=>{
      const matchesCat=cat==='All'||item.category===cat;
      const matchesSearch=!q||`${item.name||''} ${item.category||''}`.toLowerCase().includes(q);
      return matchesCat&&matchesSearch;
    });

    if(!filtered.length){
      list.innerHTML='<p>No menu items found.</p>';
      return;
    }

    list.innerHTML=`
      <div style="display:grid;gap:8px">
        ${filtered.map(item=>{
          const available=(item.availability||'available')==='available';
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #ddd;border-radius:12px;background:#fff">
              <div style="min-width:0">
                <strong>${esc(item.name||'')}</strong>
                <div style="font-size:.82rem;opacity:.72">${esc(item.category||'')}</div>
              </div>
              <button
                type="button"
                data-product="${esc(item.productId||'')}"
                data-next="${available?'false':'true'}"
                style="white-space:nowrap;background:${available?'#2f7d4f':'#a13c32'};color:white;border:0;border-radius:10px;padding:9px 12px;font-weight:800">
                ${available?'Available':'Not Available'}
              </button>
            </div>`;
        }).join('')}
      </div>`;

    list.querySelectorAll('[data-product]').forEach(button=>{
      button.addEventListener('click',()=>toggle(button));
    });
  }

  async function load(){
    if(busy)return;
    busy=true;
    list.textContent='Loading menu…';
    try{
      const snapshot=await rpc('kbr_manager_menu_snapshot',{});
      items=Array.isArray(snapshot?.items)?snapshot.items:[];
      const cats=['All',...new Set(items.map(x=>x.category).filter(Boolean))];
      const current=category.value||'All';
      category.innerHTML=cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
      category.value=cats.includes(current)?current:'All';
      render();
    }catch(error){
      list.textContent=error?.message||'Unable to load menu.';
    }finally{
      busy=false;
    }
  }

  async function toggle(button){
    if(busy)return;
    const productId=button.dataset.product;
    const next=button.dataset.next==='true';
    const item=items.find(x=>x.productId===productId);
    if(!item)return;

    busy=true;
    button.disabled=true;
    button.textContent='Saving…';

    try{
      await rpc('kbr_set_menu_item_availability',{
        p_product_id:productId,
        p_available:next
      });
      item.availability=next?'available':'unavailable';
      render();
    }catch(error){
      alert(error?.message||'Could not update menu availability.');
      render();
    }finally{
      busy=false;
    }
  }

  search.addEventListener('input',render);
  category.addEventListener('change',render);
  refresh.addEventListener('click',load);

  const observer=new MutationObserver(()=>{
    const inventory=document.getElementById('panel-inventory');
    if(inventory && !inventory.hidden && !items.length)load();
  });
  observer.observe(document.getElementById('managerContent')||document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});

  setTimeout(load,600);
})();
