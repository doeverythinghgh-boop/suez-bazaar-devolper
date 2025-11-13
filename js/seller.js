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
 * يعرض جدولاً بمنتجات المستخدم الحالي.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 */
async function showMyProducts(userKey) {
  const container = document.getElementById("my-products-container");
  const usersContainer = document.getElementById("users-table-container"); // الحصول على حاوية المستخدمين
  
  // تبديل العرض: إذا كان الجدول ظاهراً، قم بإخفائه. وإلا، قم بتحميله وإظهاره.
  if (container.style.display === "block") {
    container.style.display = "none";
    return;
  }

  // إخفاء جدول المستخدمين إذا كان ظاهراً
  if (usersContainer.style.display === "block") {
    usersContainer.style.display = "none";
  }

  container.innerHTML = '<div class="loader"></div>'; // إظهار مؤشر التحميل
  container.style.display = "block";

  const products = await getProductsByUser(userKey);

  if (products && products.length > 0) {
    // بناء الجدول
    let tableHTML = `
      <table class="products-table">
        <thead>
          <tr>
            <th>صورة المنتج</th>
            <th>تفاصيل المنتج</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>`;

    products.forEach(p => {
      // بناء HTML لعرض جميع صور المنتج
      let imagesHtml = '';
      if (p.ImageName) {
        const imageNames = p.ImageName.split(',');
        imagesHtml = '<div class="product-images-container">';
        imageNames.forEach(imageName => {
          if (imageName) { // التأكد من أن اسم الصورة ليس فارغًا
            const imageUrl = `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${imageName}`;
            imagesHtml += `<img src="${imageUrl}" alt="صورة منتج" onerror="this.style.display='none'">`;
          }
        });
        imagesHtml += '</div>';
      } else {
        imagesHtml = `<img src="data:image/svg+xml;charset=UTF-8,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'%3e%3crect width='100' height='100' fill='%23e0e0e0'/%3e%3ctext x='50' y='50' font-family='Arial' font-size='12' dy='.3em' fill='%23999' text-anchor='middle'%3eNo Image%3c/text%3e%3c/svg%3e'" alt="لا توجد صورة">`;
      }

      // تحويل كائن المنتج إلى نص JSON لاستخدامه في زر التعديل
      const productJson = JSON.stringify(p);

      // بناء جزء التاريخ فقط إذا كان الحقل موجودًا وصالحًا
      let dateHtml = '';
      if (p.created_at) {
        const date = new Date(p.created_at);
        // التحقق من أن التاريخ صالح قبل عرضه
        if (!isNaN(date.getTime())) {
          dateHtml = `<p><strong>تاريخ الإضافة:</strong> ${date.toLocaleDateString('ar-EG')}</p>`;
        }
      }

      tableHTML += `
        <tr>
          <td>${imagesHtml}</td>
          <td class="product-details">
            <p><strong>الاسم:</strong> ${p.productName || 'لا يوجد'}</p>
            <p><strong>الوصف:</strong> ${p.product_description || 'لا يوجد'}</p>
            <p><strong>رسالة البائع:</strong> ${p.user_message || 'لا يوجد'}</p>
            <p><strong>السعر:</strong> ${p.product_price} جنيه</p>
            <p><strong>الكمية:</strong> ${p.product_quantity}</p>
            <p><strong>ملاحظات خاصة:</strong> ${p.user_note || 'لا يوجد'}</p>
            ${dateHtml}
          </td>
          <td class="actions-cell">
            <button class="button logout-btn-small edit-product-btn" data-product='${productJson}'>
              <i class="fas fa-edit"></i> تعديل
            </button>
          </td>
        </tr>`;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;

    // إضافة مستمعي الأحداث لأزرار التعديل بعد بناء الجدول
    const editButtons = container.querySelectorAll('.edit-product-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const productData = JSON.parse(event.currentTarget.dataset.product);
        showEditProductModal(productData);
      });
    });

  } else if (products) {
    container.innerHTML = "<p>لم تقم بإضافة أي منتجات بعد.</p>";
  } else {
    container.innerHTML = "<p>حدث خطأ أثناء تحميل منتجاتك. يرجى المحاولة مرة أخرى.</p>";
  }
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
    viewMyProductsBtn.addEventListener("click", () => showMyProducts(user.user_key));
  }
}