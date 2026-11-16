'use strict';
// Change managerUrl if your new GitHub repository has a different name.
window.KBR_APP_LINKS=Object.freeze({
 homeUrl:'https://kapebarriohomescreen.pages.dev/',
 orderingUrl:'https://kape-barrio.pages.dev/',
 recipeUrl:'https://recipe-and-costing.pages.dev/',
 managerUrl:'https://managerspage.pages.dev/'
});
(()=>{for(const a of document.querySelectorAll('[data-app-link]'))a.href=KBR_APP_LINKS[a.dataset.appLink];})();
