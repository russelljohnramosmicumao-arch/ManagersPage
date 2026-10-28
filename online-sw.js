
const CACHE='kbr-online-customer-v53';
const ASSETS=[
  './online.html',
  './online-orders.css?v=53',
  './online-orders.js?v=53',
  './online-manifest.webmanifest?v=53'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;

  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{
        if(response.ok){
          caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(saved=>saved||caches.match('./online.html')))
  );
});
