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
 * @param {function} [onCloseCallback] - دالة اختيارية يتم استدعاؤها عند إغلاق النافذة.
 */
async function showEditProductModal(productData, onCloseCallback) {
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
      // ننتظر قليلاً لضمان تحميل كل شيء قبل التعبئة.
      setTimeout(() => initializeAddProductForm(productData), 100);
    }
    
    document.body.removeChild(newScript); // تنظيف
  }

  // وظيفة لإغلاق النافذة
  const closeEditModal = () => {
    addProductModal.style.display = "none";
    addProductModal.innerHTML = ""; // تنظيف المحتوى
    document.body.classList.remove("modal-open");
    // استدعاء دالة رد الاتصال إذا كانت موجودة
    if (typeof onCloseCallback === 'function') {
      onCloseCallback();
    }
  };

  // إضافة حدث النقر لزر الإغلاق
  const closeBtn = document.getElementById("add-product-modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeEditModal;

  // إغلاق النافذة عند النقر خارجها.
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
  const modalContainer = document.getElementById("my-products-modal-container");

  // 1. تحميل هيكل النافذة المنبثقة وعرضها مع مؤشر تحميل
  const response = await fetch("pages/myProductsModal.html");
  modalContainer.innerHTML = await response.text();
  const contentWrapper = modalContainer.querySelector("#my-products-content-wrapper");
  contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

  document.body.classList.add("modal-open");
  modalContainer.style.display = "block";

  // 2. إعداد وظيفة الإغلاق
  const closeModal = () => {
    modalContainer.style.display = "none";
    modalContainer.innerHTML = ""; // تنظيف المحتوى عند الإغلاق
    document.body.classList.remove("modal-open");
  };

  modalContainer.querySelector("#my-products-modal-close-btn").onclick = closeModal;
  window.addEventListener('click', (event) => {
    if (event.target == modalContainer) closeModal();
  }, { once: true });

  // 3. جلب بيانات المنتجات
  const products = await getProductsByUser(userKey);

  let allCategories = [];
  try {
    const catResponse = await fetch('../shared/list.json');
    const catData = await catResponse.json();
    allCategories = catData.categories;
  } catch (error) {
    console.error("Failed to load category names:", error);
  }

  // 4. بناء وعرض الجدول داخل النافذة المنبثقة
  if (products && products.length > 0) {
    let cardsHTML = `<div class="my-products-cards-container">`;

    products.forEach(product => { 
      cardsHTML += generateProductCardHTML(product, 'seller');
    });

    cardsHTML += `</div>`;
    contentWrapper.innerHTML = cardsHTML;

    // 5. ربط الأحداث بأزرار التعديل
    contentWrapper.querySelectorAll('.my-products-edit-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        const productData = JSON.parse(event.currentTarget.dataset.product);
        modalContainer.style.display = "none";
        showEditProductModal(productData, () => {
          modalContainer.style.display = "block";
        });
      });
    });

    // 6. ربط الأحداث بأزرار الحذف
    contentWrapper.querySelectorAll('.my-products-delete-btn').forEach(button => {
      button.addEventListener('click', (event) => {
        const productData = JSON.parse(event.currentTarget.dataset.product);
        deleteProductAndImages(productData, userKey);
      });
    });

    // 7. إعداد الفلاتر
    const mainCategoryFilter = document.getElementById('my-products-main-category');
    const subCategoryFilter = document.getElementById('my-products-sub-category');
    const subCategoryGroup = document.getElementById('my-products-sub-category-group');
    const searchInput = document.getElementById('my-products-search-input');
    const productCards = contentWrapper.querySelectorAll('.my-products-card');
    const noResultsContainer = document.createElement('div');
    noResultsContainer.innerHTML = `<p class="no-results-message" style="text-align: center; padding: 2rem 0; display: none;"></p>`;
    contentWrapper.appendChild(noResultsContainer);
    const noResultsMsg = noResultsContainer.querySelector('.no-results-message');

    allCategories.forEach(category => {
      mainCategoryFilter.add(new Option(category.title, category.id));
    });

    const filterMyProducts = () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const selectedMainCat = mainCategoryFilter.value;
      const selectedSubCat = subCategoryFilter.value;
      let visibleCount = 0;

      productCards.forEach(card => {
        const productName = card.querySelector('h4').textContent.toLowerCase();
        const mainCat = card.dataset.mainCategory;
        const subCat = card.dataset.subCategory;

        const matchesSearch = productName.includes(searchTerm);
        const matchesMainCat = !selectedMainCat || mainCat === selectedMainCat;
        const matchesSubCat = !selectedSubCat || subCat === selectedSubCat;

        if (matchesSearch && matchesMainCat && matchesSubCat) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
      
      noResultsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
      noResultsMsg.textContent = `لا توجد منتجات تطابق معايير البحث.`;
    };

    searchInput.addEventListener('input', filterMyProducts);
    mainCategoryFilter.addEventListener('change', () => {
      const selectedMainCat = mainCategoryFilter.value;
      subCategoryFilter.innerHTML = '<option value="">الكل</option>';
      if (selectedMainCat) {
        const selectedCategoryData = allCategories.find(cat => cat.id == selectedMainCat);
        const subCategories = selectedCategoryData ? selectedCategoryData.subcategories : [];
        if (subCategories && subCategories.length > 0) {
          subCategories.forEach(subCat => subCategoryFilter.add(new Option(subCat.title, subCat.id)));
          subCategoryGroup.style.display = 'flex';
        } else {
          subCategoryGroup.style.display = 'none';
        }
      } else {
        subCategoryGroup.style.display = 'none';
      }
      filterMyProducts();
    });
    subCategoryFilter.addEventListener('change', filterMyProducts);

  } else if (products) {
    contentWrapper.innerHTML = "<p style='text-align: center; padding: 2rem 0;'>لم تقم بإضافة أي منتجات بعد.</p>";
  } else {
    contentWrapper.innerHTML = "<p style='text-align: center; padding: 2rem 0; color: red;'>حدث خطأ أثناء تحميل منتجاتك.</p>";
  }
}

/**
 * يتعامل مع عملية حذف منتج وصوره المرتبطة به.
 * @param {object} product - كائن المنتج المراد حذفه.
 * @param {string} userKey - مفتاح المستخدم الحالي لتحديث العرض بعد الحذف.
 */
async function deleteProductAndImages(product, userKey) {
  Swal.fire({
    title: 'هل أنت متأكد؟',
    text: `سيتم حذف المنتج "${product.productName}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'نعم، احذفه!',
    cancelButtonText: 'إلغاء',
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      try {
        if (product.ImageName) {
          const imageNames = product.ImageName.split(',').filter(name => name);
          if (imageNames.length > 0) {
            await Promise.all(imageNames.map(name =>
              deleteFile2cf(name).catch(err => console.error(`[Delete] Failed to delete image ${name}:`, err))
            ));
          }
        }
        const dbResult = await deleteProduct(product.product_key);
        if (dbResult && dbResult.error) throw new Error(dbResult.error);
        return true;
      } catch (error) {
        Swal.showValidationMessage(`فشل الحذف: ${error.message}`);
        return false;
      }
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire('تم الحذف!', 'تم حذف المنتج بنجاح ✅.', 'success');
      showMyProducts(userKey);
    }
  });
}