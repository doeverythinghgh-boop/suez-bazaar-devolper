
/**
 <user_rules>
.gemini\GEMINI.md هل تحترمة
 MEMORY[user_global] 
 * 
يضمن حساب الهوامش الداخلية ضمن العرض الكلي للعنصر
 * 
 * @file note/code.js
 * @description A collection of code notes, snippets, and temporary test calls.
 * This file is not structured as a module but contains various JavaScript examples or debug code.
 */

          mainLoader("./pages/home.html","index-home-container",0,undefined,"hiddenHomeIcon");
mainLoader(
    "./pages/login.html",
    "index-user-container",
    0,
    undefined,
    "showHomeIcon",true
  );

/////////////////////////////////////////////////////
/**
 * @constant
 * @type {object|null}
 * @description Stores the logged-in user's data parsed from localStorage.
 */
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

//userSession.user_key != "guest_user" 
//userSession.user_key
//  /////////////////////////////////////////////////////////
/*console.log(
  "%c✔✔✔✔✔✔✔ تم التحميل ✔✔✔✔✔✔✔\n" +
  `pageUrl: ${pageUrl}\n` +
  `containerId: ${containerId}\n` +
  `reload: ${reload}`,
  "color: #0a4902ff; font-size: 12px; font-weight: bold; font-family: 'Tahoma';"
);*/


/*
    <div id="index-home-container"></div>
    <div id="index-search-container"></div>
    <div id="index-user-container"></div>
    <div id="index-product-container"></div>
    <div id="index-cardPackage-container"></div>
    <div id="index-myProducts-container"></div>
<div id="index-contact-container"></div>

*/


