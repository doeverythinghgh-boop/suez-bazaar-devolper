/**
 * @file js/seller.js
 * @description يحتوي على المنطق الخاص بلوحة تحكم البائع (إضافة/تعديل/عرض المنتجات).
 */



/**
 * @description يعرض نافذة منبثقة (Modal) لتعديل منتج موجود.
 *   يقوم بتحميل قالب إضافة المنتج من `pages/addProduct.html` ويهيئ النموذج مع بيانات المنتج
 *   للسماح بالتعديل.
 * @function showEditProductModal
 * @param {object} productData - كائن يحتوي على بيانات المنتج المراد تعديله.
 * @param {function(): void} [onCloseCallback] - دالة رد اتصال اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see initializeAddProductForm
 */
async function showEditProductModal(productData, onCloseCallback) {
  await loadAndShowModal(
    "add-product-modal",
    "pages/addProduct.html",
    () => {
      // Reset the form in case it was initialized before.
      if (typeof window.productResetAddProductForm === "function") {
        window.productResetAddProductForm();
      }
      if (typeof productInitializeAddProductForm === "function") {
        // Use setTimeout with 0ms delay to ensure the DOM is ready.
        // This pushes the initialization to the next tick of the event loop,
        // allowing the browser to render the modal's content first.
        setTimeout(() => window.productInitializeAddProductForm(productData), 0);
      }
    },
    onCloseCallback
  );
}

/**
 * @description يعرض نافذة منبثقة (Modal) تحتوي على قائمة بمنتجات المستخدم الحالي (البائع)،
 *   مع إمكانيات التعديل والحذف والتصفية.
 * @function showMyProducts
 * @param {string} userKey - المفتاح الفريد للمستخدم الذي سيتم عرض منتجاته.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see getProductsByUser
 * @see generateProductCardHTML
 * @see showEditProductModal
 * @see deleteProductAndImages
 */
async function showMyProducts(userKey) {
  await loadAndShowModal("my-products-modal-container", "pages/myProductsModal.html", async (modal) => {
    const contentWrapper = modal.querySelector("#my-products-content-wrapper");
    contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

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
        modal.style.display = "none"; // إخفاء النافذة الحالية
        showEditProductModal(productData, () => {
          modal.style.display = "block"; // إعادة إظهارها عند إغلاق نافذة التعديل
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

    /**
     * @description تقوم بتصفية وعرض بطاقات المنتجات بناءً على معايير البحث (النص، الفئة الرئيسية، والفئة الفرعية).
     * @function filterMyProducts
     * @returns {void}
     */
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
  });
}

/**
 * @description يتعامل مع عملية حذف منتج وصوره المرتبطة به.
 *   يعرض رسالة تأكيد للمستخدم قبل الحذف، ثم يقوم بحذف الصور من التخزين السحابي
 *   وحذف المنتج من قاعدة البيانات، ثم يُحدث عرض المنتجات.
 * @function deleteProductAndImages
 * @param {object} product - كائن يحتوي على بيانات المنتج المراد حذفه، بما في ذلك `productName` و`ImageName` و`product_key`.
 * @param {string} userKey - مفتاح المستخدم الحالي لتحديث العرض بعد الحذف.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see deleteFile2cf
 * @see deleteProduct
 * @see showMyProducts
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