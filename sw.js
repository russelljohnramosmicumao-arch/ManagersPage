const CACHE="kbr-ordering-v125-served-sync-fix";
const ASSETS=["./turnover-shift.js?v=turnover-v3","./open-end-shift.html","./shift-records.html","./shifts.js?v=turnover-v3","./sync.css?v=turnover-v3","./promo-code.js?v=3","./promo-code.css?v=3","./promo-codes.html","./promo-template.png","./receipt-lines.js","./images/mango-strawberry-smoothie-v2.png","./images/mango-strawberry-smoothie.png","./icons/icon-192.png","./icons/icon-512.png","./manifest.json","./page-tools.js","./page-tools.css",
  "manager-access.js",
  "worker-clock.js",
  "./",
  "./app-links.js",
  "./app-sync.js",
  "./app-update.js",
  "./comp-payments.js",
  "./index.html",
  "./manager.html",
  "./manifest.json",
  "./menu-defaults.js",
  "./menu-store.js",
  "./pay-later.js",
  "./reset-password.html",
  "./reset-password.js",
  "./shift-records.html",
  "./shifts.js",
  "./sync-config.js",
  "./sync-core.js",
  "./sync-login.html",
  "./sync-ui.js",
  "./sync.css"
];
const IMAGE_CACHE='kbr-pos-images-v1';
const IMAGE_REVISIONS={"./images/frappe-de-choco.jpg": "1bb9f98c93cd1ec7", "./images/red-matcha-milk-tea.jpg": "739ac1aac3ff2437", "./images/kbr-shop-background.png": "64c8444f615dfed7", "./images/dirty-taro-milktea.jpg": "3dfc3b25e433b094", "./images/nom-chompoo-thumbnail.png": "d2f5a3eff83ebaa9", "./images/strawberry-milk-tea.jpg": "421132a3699647af", "./images/dirty-matcha.jpg": "b32f0ba5906f34a0", "./images/red-matcha.jpg": "739ac1aac3ff2437", "./images/matcha-latte--premium.jpg": "e610280353c08a11", "./images/gcash-card.jpg": "bd3fdd71ce87f781", "./images/white-bunny-milk-tea.jpg": "4b230eb4fac0983d", "./images/blueberry-milk-tea.jpg": "13739e08b14694f4", "./images/regular-cone-thumbnail.png": "88510592e714cbfe", "./images/americano.jpg": "7f7835fd88befaad", "./images/okinawa-milk-tea.jpg": "eefff6b6eeb67d4e", "./images/oreo-coffee.jpg": "2e38353173f8c8f4", "./images/taro-milk-tea.jpg": "f173393eaf8b5fb3", "./images/oreo-matcha.jpg": "6ca1bbbc0034adc7", "./images/cracking-matcha.jpg": "cbc8040a4b82d638", "./images/mango-smoothie.jpg": "ece2cc55efe2bf3e", "./images/vanilla-latte.jpg": "f2bdc0cef3e0d91f", "./images/blue-lemonade.jpg": "2afe46a7dd5f9af3", "./images/matcha-frappe.jpg": "60f2fbb3203c325b", "./images/nachos.jpg": "5bdb0d4b3559481a", "./images/strawberry.jpg": "a72d7f0ae8d01344", "./images/matcha-latte.jpg": "0d4b7eae2e2bdd47", "./images/frappuccino.jpg": "b981286f3b2af7e1", "./images/wintermelon-milk-tea.jpg": "fd6ccfdfa97a0b35", "./images/blue-ish-red-milktea.jpg": "3c4f6fdad96ed614", "./images/mango-matcha.jpg": "e6b6d07243e384be", "./images/familia-de-verde.jpg": "71101d160cd15bb7", "./images/frappe-de-taro.jpg": "8c6726b382991e2d", "./images/blueberry.jpg": "c806db8ff930336b", "./images/pinipig-thumbnail.png": "0624902d699a87e1", "./images/dirty-matcha-milk-tea.jpg": "87ba09e95a79f62e", "./images/dirty-taro.jpg": "0fe4ced23252dd0a", "./images/shanghai.jpg": "cd04b7a992802417", "./images/caramel-macchiato.jpg": "285d961c047dd45d", "./images/fries.jpg": "3a8fc66b90845014", "./images/cappuccino.jpg": "1c36f313d092b5e1", "./images/cookies-de-crema.jpg": "e7cb41da07437313", "./images/frapmacchiato.jpg": "8001a2b8ff51083e", "./images/black-forest-choco.jpg": "b4a3f86321e2d52e", "./images/caramel-latte.jpg": "cf1f503ed62e1024", "./images/ice-cream-tub-1-3l-thumbnail.png": "9c595e14a4f17fe3", "./images/mekus-de-berries.jpg": "00d0cf75e1a63d3b", "./images/spanish-latte.jpg": "896d06333db047b3", "./images/ice-cream-bilog-thumbnail.png": "8edd38f84bdecc0c", "./images/cookies-and-cream.jpg": "b7e23d53b9258c67", "./images/four-seasons.jpg": "18871717da16b8b6", "./images/matcha-milk-tea.jpg": "0d4b7eae2e2bdd47", "./images/cha-yen-thumbnail.png": "c3542201c8400f28", "./images/jumbo-cone-thumbnail.png": "b90ee3491bdeaeac", "./images/samyang-buldak.jpg": "e385e53ccb068099", "./images/chuckie-float.jpg": "4018e730cc2063f3", "./images/green-taro.jpg": "9e573e4069430be6", "./images/nutella-matcha.jpg": "6e99f30154b58c48", "./images/frappe-macchiato.jpg": "8001a2b8ff51083e", "./images/iced-mocha-latte.jpg": "6adab2b1a652fe9c", "./images/coke-float.jpg": "57b513804cfa67ad", "./images/creambar-thumbnail.png": "5d6f15494bbcef8d", "./images/siomai.jpg": "6f30e97053fce308", "./images/lychee.jpg": "ee46d5285ee9c6aa", "./images/dutchmill-float.jpg": "7450ce5ee6ee3e6c", "./images/green-taro-milktea.jpg": "c2c72bc6a3652fc2", "./images/green-apple.jpg": "c4977104c3ad9aeb", "./images/dirty-matcha--premium.jpg": "04b3ce5d46148526", "./images/caramel-brown-sugar.jpg": "8b1933f267e7df71", "./logo.png": "6bc4b3851ef5f8ca"};
function imageKey(url){const relative='./'+url.pathname.slice(new URL(self.registration.scope).pathname.length);const revision=IMAGE_REVISIONS[relative];if(revision)url.searchParams.set('kbr-image-revision',revision);return url.href;}
async function imageResponse(request){const cache=await caches.open(IMAGE_CACHE),key=imageKey(new URL(request.url));const saved=await cache.match(key);if(saved)return saved;const response=await fetch(request);if(response.ok)await cache.put(key,response.clone());return response;}
async function warmImages(){const entries=Object.keys(IMAGE_REVISIONS);let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<entries.length){const path=entries[cursor++];try{await imageResponse(new Request(new URL(path,self.registration.scope)));}catch{ /* Retry missing pictures on the next warmup or request. */ }}}));}
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll([...new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href))].map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();if(e.data?.type==='WARM_IMAGES')e.waitUntil(warmImages());});
self.addEventListener('activate',e=>e.waitUntil((async()=>{await caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kbr-pos-')&&k!==CACHE&&k!==IMAGE_CACHE).map(k=>caches.delete(k))));await self.clients.claim();await warmImages();})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;if(e.request.destination==='image'||IMAGE_REVISIONS['./'+u.pathname.slice(new URL(self.registration.scope).pathname.length)]){e.respondWith(imageResponse(e.request));return;}e.respondWith(caches.open(CACHE).then(async c=>{const saved=await c.match(e.request);if(saved)return saved;try{const response=await fetch(e.request);if(response.ok)c.put(e.request,response.clone()).catch(()=>{});return response;}catch(error){if(e.request.mode==='navigate')return c.match('./index.html');throw error;}}));});
