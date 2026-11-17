// Retire only the legacy customer worker. Do not clear manager caches.
const TARGET="https://russelljohnramosmicumao-arch.github.io/Kape-Barrio/online.html";
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('kbr-online-customer-'))await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  const path=url.pathname.replace(/\/$/,'');
  if(event.request.mode==='navigate'&&url.origin===self.location.origin&&(path.endsWith('/online')||path.endsWith('/online.html')))event.respondWith(Response.redirect(TARGET,302));
});
