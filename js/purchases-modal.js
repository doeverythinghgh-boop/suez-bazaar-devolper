/**
 * @file js/purchases-modal.js
 * @description يحتوي على المنطق الخاص بعرض سجل مشتريات المستخدم.
 */

/**
 * @description يعرض نافذة منبثقة (Modal) بسجل مشتريات المستخدم.
 *   يقوم بتحميل قالب المشتريات، ويجلب مشتريات المستخدم من API،
 *   ثم يعرضها في قائمة باستخدام `generatePurchaseItemHTML`.
 * @function showPurchasesModal
 * @param {string} userKey - المفتاح الفريد للمستخدم (`user_key`) الذي سيتم عرض مشترياته.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see getUserPurchases
 * @see generatePurchaseItemHTML
 */
async function showPurchasesModal(userKey) {
  await loadAndShowModal(
    "purchases-modal-container",
    "pages/purchasesModal.html",
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