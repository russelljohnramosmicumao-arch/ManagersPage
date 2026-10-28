
const SUPABASE_URL='https://wkyyuyyfauyhpivebrdg.supabase.co';
const SUPABASE_KEY='sb_publishable_AXZtXN81wyM_W7tVZuJ-zw_ohoaj-1M';
const authClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});

let session=null;
const $=id=>document.getElementById(id);
const money=v=>`₱${Number(v||0).toLocaleString('en-PH',{maximumFractionDigits:2})}`;

function esc(value=''){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function attr(value=''){return esc(value)}

function resolveImage(raw=''){
  raw=String(raw||'').trim();
  if(!raw)return '';
  if(/^https?:\/\//i.test(raw)||raw.startsWith('data:'))return raw;
  if(raw.startsWith('./')||raw.startsWith('images/'))return raw;
  if(raw.startsWith('/'))return '.'+raw;
  return `images/${raw}`;
}

async function rpc(name,args={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:`Bearer ${session?.access_token||SUPABASE_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(args)
  });
  const text=await response.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!response.ok)throw new Error(data?.message||data?.details||'Request failed.');
  return data;
}

function toast(message){
  const el=$('toast');
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>el.classList.remove('show'),2200);
}

function renderRewards(snapshot){
  $('pointsBalance').textContent=Number(snapshot?.points||0).toLocaleString('en-PH');
  $('rewardValue').textContent=money(snapshot?.rewardValue||0);

  const eligible=Array.isArray(snapshot?.eligible)?snapshot.eligible:[];
  $('rewardEmpty').classList.toggle('hidden',eligible.length>0);

  $('rewardGrid').innerHTML=eligible.map(item=>`
    <article class="reward-card">
      <img src="${attr(resolveImage(item.image))}" alt="${attr(item.name)}" loading="lazy"
           onerror="this.style.visibility='hidden'">
      <div class="reward-card-body">
        <h3>${esc(item.name)}</h3>
        <div class="reward-meta">${esc(item.size)} · ${esc(item.category)}</div>
        <div class="reward-price">${money(item.price)}</div>
        <span class="eligible-badge">Eligible reward</span>
      </div>
    </article>
  `).join('');
}

async function loadRewards(){
  const {data}=await authClient.auth.getSession();
  session=data?.session||null;

  if(!session?.user){
    window.location.href='./online.html';
    return;
  }

  try{
    const snapshot=await rpc('kbr_customer_rewards_snapshot',{});
    renderRewards(snapshot);
  }catch(error){
    toast(error.message||'Could not load rewards.');
  }
}

$('backButton').addEventListener('click',()=>window.location.href='./online.html');
loadRewards();
