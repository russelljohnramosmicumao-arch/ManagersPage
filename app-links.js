'use strict';
const isCloudflare=location.hostname.endsWith('.pages.dev');
function validatedCloudflareHome(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='kapebarriohomescreen.pages.dev'&&!u.username&&!u.password?u.origin+'/':null;}catch{return null}}
function cloudflareHome(){
 const p=validatedCloudflareHome(new URL(location.href).searchParams.get('kbrHome'));
 if(p){try{sessionStorage.setItem('kbr_cloudflare_home_url',p);}catch{}return p;}
 const saved=(()=>{try{return validatedCloudflareHome(sessionStorage.getItem('kbr_cloudflare_home_url'))}catch{return null}})();
 if(saved)return saved;
 const referring=validatedCloudflareHome(document.referrer);
 if(referring&&referring!==location.origin+'/')return referring;
 return 'https://kapebarriohomescreen.pages.dev/';
}
const github='https://russelljohnramosmicumao-arch.github.io/';
window.KBR_APP_LINKS=Object.freeze(isCloudflare?{
 homeUrl:cloudflareHome(),
 orderingUrl:'https://kape-barrio.pages.dev/',
 recipeUrl:'https://recipe-and-costing.pages.dev/',
 managerUrl:'https://managerspage.pages.dev/'
}:{
 homeUrl:github+'KapeBarrioHomeScreen/',
 orderingUrl:github+'Kape-Barrio/',
 recipeUrl:github+'recipe-and-costing/',
 managerUrl:github+'ManagersPage/'
});
(()=>{for(const a of document.querySelectorAll('[data-app-link]')){const next=KBR_APP_LINKS[a.dataset.appLink];if(next)a.href=next;}})();
