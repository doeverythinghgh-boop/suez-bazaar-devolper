/**
 * @file pages/cardPackage/js/cartPackage-init.js
 * @description Initialization and global variables for cart package.
 * Handles page initialization and header loading.
 */

// Global Variables
var cartPage_currentProductKeyForNote = '';

// Page Initialization
(async () => {
    try {
        await cartPage_loadCart();
        cartPage_setupEventListeners();
    } catch (error) {
        console.error('حدث خطأ أثناء تهيئة الصفحة:', error);
    }
})();

insertUniqueSnapshot("../pages/header.html", "header-container10", 100);
