/**
 * @file js/purchases-modal.js
 * @description يحتوي على المنطق الخاص بعرض سجل مشتريات المستخدم.
 */

/**
 * يعرض نافذة منبثقة بسجل مشتريات المستخدم.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 */
async function showPurchasesModal(userKey) {
  await loadAndShowModal(
    "purchases-modal-container",
    "js/purchasesModal.html",
    async (modal) => {
      const contentWrapper = modal.querySelector("#purchases-content-wrapper");
      contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

      const purchases = await getUserPurchases(userKey);

      if (purchases && purchases.length > 0) {
        contentWrapper.innerHTML = `
          <div id="purchases-list">
            ${purchases.map(generatePurchaseItemHTML).join('')}
          </div>`;
      } else if (purchases) {
        contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0;">لا توجد مشتريات سابقة.</p>';
      } else {
        contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0; color: red;">حدث خطأ أثناء تحميل سجل المشتريات.</p>';
      }
    }
  );
}