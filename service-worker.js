const CACHE_NAME='kape-barrio-inventory-v34-end-shift-checklist-ui6-units-live-stock-v1-supply-orders-v4-payments-receipts-ops-v8-no-area-buttons';
const APP_FILES=["./page-tools.js","./page-tools.css",'./','./index.html','./style.css','./data.js','./app.js','./manifest.json','./sync.css','./sync-config.js','./sync-core.js','./sync-login.html','./inventory-cloud.js','./inventory-update.js','./supply-orders.js','./supply-orders.css','./supply-tabs.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kape-barrio-inventory-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(error=>{if(event.request.mode==='navigate')return caches.match('./index.html');throw error;})));});

// Inventory discontinue update: 2026-10-16
