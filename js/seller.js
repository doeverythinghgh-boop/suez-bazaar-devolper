/**
 * @file js/ui/seller.js
 * @description يحتوي على المنطق الخاص بلوحة تحكم البائع (إضافة/تعديل/عرض المنتجات).
 */

/**
 * يعرض نافذة منبثقة لإضافة منتج جديد.
 */
async function showAddProductModal() {
  const addProductModal = document.getElementById("add-product-modal");
  
  // تحميل محتوى نموذج إضافة المنتج
  const response = await fetch("pages/addProduct.html");
  const modalContent = await response.text();
  addProductModal.innerHTML = modalContent;

  // إظهار النافذة المنبثقة
  document.body.classList.add("modal-open");
  addProductModal.style.display = "block";

  // استخراج وتنفيذ السكريبت من المحتوى المحمل
  const scriptElement = addProductModal.querySelector("script");
  if (scriptElement) {
    // الطريقة الأكثر أمانًا وموثوقية: إضافة السكريبت إلى الصفحة
    const newScript = document.createElement("script");
    newScript.innerHTML = scriptElement.innerHTML;
    document.body.appendChild(newScript);
    // استدعاء دالة التهيئة مباشرة بعد إضافة السكريبت
    if (typeof initializeAddProductForm === "function") initializeAddProductForm();
    document.body.removeChild(newScript); // تنظيف
  }

  // وظيفة لإغلاق النافذة
  const closeAddProductModal = () => {
    addProductModal.style.display = "none";
    addProductModal.innerHTML = ""; // تنظيف المحتوى
    document.body.classList.remove("modal-open");
  };

  // إضافة حدث النقر لزر الإغلاق
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeAddProductModal;

  // إغلاق النافذة عند النقر خارجها
  window.addEventListener('click', (event) => {
    if (event.target == addProductModal) closeAddProductModal();
  }, { once: true });
}

/**
 * يعرض نافذة منبثقة لتعديل منتج موجود.
 * @param {object} productData - بيانات المنتج المراد تعديله.
 */
async function showEditProductModal(productData) {
  const addProductModal = document.getElementById("add-product-modal");
  
  // تحميل محتوى نموذج إضافة المنتج
  const response = await fetch("pages/addProduct.html");
  const modalContent = await response.text();
  addProductModal.innerHTML = modalContent;

  // إظهار النافذة المنبثقة
  document.body.classList.add("modal-open");
  addProductModal.style.display = "block";

  // استخراج وتنفيذ السكريبت من المحتوى المحمل
  const scriptElement = addProductModal.querySelector("script");
  if (scriptElement) {
    const newScript = document.createElement("script");
    newScript.innerHTML = scriptElement.innerHTML;
    document.body.appendChild(newScript);
    
    // استدعاء دالة التهيئة وتمرير بيانات المنتج لوضع التعديل
    if (typeof initializeAddProductForm === "function") {
      // ننتظر قليلاً لضمان تحميل كل شيء قبل التعبئة
      setTimeout(() => initializeAddProductForm(productData), 100);
    }
    
    document.body.removeChild(newScript); // تنظيف
  }

  // إضافة وظيفة إغلاق النافذة (كانت مفقودة في وضع التعديل)
  const closeEditModal = () => {
    addProductModal.style.display = "none";
    addProductModal.innerHTML = ""; // تنظيف المحتوى
    document.body.classList.remove("modal-open");
  };

  // إضافة حدث النقر لزر الإغلاق
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeEditModal;

  // إغلاق النافذة عند النقر خارجها
  // استخدام { once: true } يضمن أن المستمع يعمل مرة واحدة ثم يزيل نفسه تلقائيًا
  window.addEventListener('click', (event) => {
    if (event.target == addProductModal) closeEditModal();
  }, { once: true });
}

/**
 * تهيئة لوحة تحكم البائع.
 * @param {object} user - كائن المستخدم.
 */
function initializeSellerPanel(user) {
  if (user.is_seller === 1) {
    const addProductBtn = document.getElementById("add-product-btn");
    addProductBtn.style.display = "inline-flex"; // إظهار الزر
    addProductBtn.addEventListener("click", showAddProductModal); // إضافة حدث النقر

    const viewMyProductsBtn = document.getElementById("view-my-products-btn");
    viewMyProductsBtn.style.display = "inline-flex";
    // ملاحظة: بما أننا حذفنا دالة showMyProducts من هذا الملف،
    // فإن هذا الزر سيقوم الآن باستدعاء الدالة الصحيحة من ملف login-page.js الذي تم تحميله مسبقًا.
    viewMyProductsBtn.addEventListener("click", () => showMyProducts(user.user_key));
  }
}