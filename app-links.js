'use strict';
// Change managerUrl if your new GitHub repository has a different name.
window.KBR_APP_LINKS=Object.freeze({
 orderingUrl:'https://russelljohnramosmicumao-arch.github.io/Kape-Barrio/',
 managerUrl:'https://russelljohnramosmicumao-arch.github.io/Kape-Barrio-Manager/'
});
(()=>{for(const a of document.querySelectorAll('[data-app-link]'))a.href=KBR_APP_LINKS[a.dataset.appLink];})();
