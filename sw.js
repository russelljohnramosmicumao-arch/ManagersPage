const CACHE="kbr-manager-v14-home-separated-pages";
const ASSETS=[
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
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("kbr-manager-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;e.respondWith(caches.open(CACHE).then(async c=>{const saved=await c.match(e.request);if(saved)return saved;try{const response=await fetch(e.request);if(response.ok)c.put(e.request,response.clone()).catch(()=>{});return response;}catch(error){if(e.request.mode==='navigate')return c.match('./index.html');throw error;}}));});
