const CACHE="kbr-manager-v19-promo-control";
const ASSETS=["./promo-discount-control.js","./page-tools.js","./page-tools.css",
  "./",
  "./app-links.js",
  "./app-update.js",
  "./comp-payments.js",
  "./employee-information.js",
  "./index.html",
  "./manager-backup.js",
  "./manager-icon.svg",
  "./manager-inventory.js",
  "./manager-tabs.css",
  "./manager-tabs.js",
  "./workforce-model.js",
  "./workforce.js",
  "./schedule-view.js",
  "./manager.html",
  "./manager.js",
  "./manifest.json",
  "./menu-defaults.js",
  "./menu-store.js",
  "./menu-sync.js",
  "./menu.html",
  "./menu.js",
  "./reset-password.html",
  "./reset-password.js",
  "./sales-data.js",
  "./sales.html",
  "./sales.js",
  "./staff-manager.js",
  "./sync-config.js",
  "./sync-core.js",
  "./sync-login.html",
  "./sync-ui.js",
  "./sync.css"
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(async c=>{
    await Promise.allSettled(ASSETS.map(async asset=>{
      try{
        const response=await fetch(asset,{cache:'reload'});
        if(response.ok)await c.put(asset,response.clone());
      }catch(_){}
    }));
  })
));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("kbr-manager-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;
  const isCode=e.request.mode==='navigate'||/\.(?:html|js|css)$/.test(u.pathname);
  e.respondWith(caches.open(CACHE).then(async c=>{
    if(isCode){
      try{
        const response=await fetch(e.request,{cache:'no-store'});
        if(response.ok)c.put(e.request,response.clone()).catch(()=>{});
        return response;
      }catch(error){
        const saved=await c.match(e.request,{ignoreSearch:false})||await c.match(u.pathname.replace(self.registration.scope,'./'));
        if(saved)return saved;
        if(e.request.mode==='navigate')return c.match('./index.html');
        throw error;
      }
    }
    const saved=await c.match(e.request);
    if(saved)return saved;
    try{
      const response=await fetch(e.request);
      if(response.ok)c.put(e.request,response.clone()).catch(()=>{});
      return response;
    }catch(error){
      if(e.request.mode==='navigate')return c.match('./index.html');
      throw error;
    }
  }));
});
