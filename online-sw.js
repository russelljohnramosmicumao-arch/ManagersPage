// Retire only the legacy customer worker. Do not clear manager caches.
const TARGET="https://kape-barrio.pages.dev/online";
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('kbr-online-customer-'))await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'&&url.origin===self.location.origin&&/\\/online(?:\\.html)?\\/?$/.test(url.pathname))event.respondWith(Response.redirect(TARGET,302));
});
