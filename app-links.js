'use strict';
// Change managerUrl if your new GitHub repository has a different name.
window.KBR_APP_LINKS=Object.freeze({
 homeUrl:'https://russelljohnramosmicumao-arch.github.io/KapeBarrioHomeScreen/',
 orderingUrl:'https://russelljohnramosmicumao-arch.github.io/Kape-Barrio/',
 recipeUrl:'https://russelljohnramosmicumao-arch.github.io/recipe-and-costing/',
 managerUrl:'https://russelljohnramosmicumao-arch.github.io/ManagersPage/'
});
(()=>{for(const a of document.querySelectorAll('[data-app-link]'))a.href=KBR_APP_LINKS[a.dataset.appLink];})();
