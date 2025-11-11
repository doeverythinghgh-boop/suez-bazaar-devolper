/**
 * @file searchModal.js
 * @description وحدة للتحكم في نافذة البحث المنبثقة.
 */

/**
 * يقوم بتهيئة نافذة البحث المنبثقة.
 * يحمل محتوى النافذة من ملف HTML ويربط الأحداث.
 * @param {string} containerId - معرف الحاوية التي سيتم تحميل النافذة بداخلها.
 * @param {string} openTriggerId - معرف الزر الذي يفتح النافذة.
 */
async function initSearchModal(containerId, openTriggerId) {
  const modalContainer = document.getElementById(containerId);
  const openSearchBtn = document.getElementById(openTriggerId);

  if (!modalContainer || !openSearchBtn) {
    console.error('[SearchModal] لم يتم العثور على حاوية النافذة أو زر الفتح.');
    return;
  }

  try {
    // تحميل محتوى النافذة من الملف الخارجي
    const response = await fetch('pages/searchModal.html');
    if (!response.ok) throw new Error('فشل تحميل محتوى نافذة البحث');
    modalContainer.innerHTML = await response.text();
    console.log('%c[SearchModal] تم تحميل محتوى نافذة البحث بنجاح.', 'color: #20c997');

    // بعد تحميل المحتوى، يمكننا الوصول للعناصر
    const searchModal = document.getElementById('search-modal');
    const closeSearchBtn = document.getElementById('search-modal-close-btn');
    const searchModalInput = document.getElementById('search-modal-input');
    // ✅ جديد: الوصول إلى عناصر الفلاتر
    const mainCategoryFilter = document.getElementById('main-category-filter');
    const subCategoryFilter = document.getElementById('sub-category-filter');
    // ✅ جديد: الوصول إلى حاوية الفلتر الفرعي للتحكم في إظهارها وإخفائها
    const subCategoryFilterGroup = document.getElementById('sub-category-filter-group');
    // ✅ جديد: الوصول إلى حاوية عرض النتائج
    const searchResultsContainer = document.getElementById('search-results-container');
    // ✅ جديد: الوصول إلى زر البحث الجديد
    const performSearchBtn = document.getElementById('perform-search-btn');

    // ✅ جديد: دالة لتأخير التنفيذ (Debounce) لتحسين أداء البحث أثناء الكتابة
    function debounce(func, delay) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }

    // ✅ جديد: دالة لتنفيذ البحث وإظهار النتائج
    async function performSearch() {
      const searchTerm = searchModalInput.value.trim();
      const mainCategory = mainCategoryFilter.value;
      const subCategory = subCategoryFilter.value;

      // لا تقم بالبحث إذا كان حقل البحث فارغًا ولم يتم تحديد أي فئة
      if (!searchTerm && !mainCategory) {
        searchResultsContainer.innerHTML = ''; // مسح النتائج
        return;
      }

      // إظهار مؤشر التحميل
      searchResultsContainer.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

      const params = new URLSearchParams();
      if (searchTerm) params.append('searchTerm', searchTerm);
      if (mainCategory) params.append('MainCategory', mainCategory);
      if (subCategory) params.append('SubCategory', subCategory);

      try {
        const response = await fetch(`${baseURL}/api/products?${params.toString()}`);
        if (!response.ok) throw new Error('فشل جلب نتائج البحث');
        const results = await response.json();
        displaySearchResults(results);
      } catch (error) {
        console.error('%c[SearchModal] خطأ في البحث:', 'color: red;', error);
        searchResultsContainer.innerHTML = '<p class="search-error-message">حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.</p>';
      }
    }

    // ✅ جديد: دالة لعرض نتائج البحث
    function displaySearchResults(results) {
      if (results.length === 0) {
        searchResultsContainer.innerHTML = '<p class="no-search-results-message">لم يتم العثور على منتجات تطابق بحثك.</p>';
        return;
      }

      let resultsHTML = '<div class="search-results-grid">';
      results.forEach(product => {
        const firstImage = product.ImageName ? product.ImageName.split(',')[0] : 'images/placeholder.png';
        const imageUrl = firstImage.startsWith('http') ? firstImage : `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${firstImage}`;
        
        resultsHTML += `
          <div class="search-result-item" data-product-key="${product.product_key}">
            <img src="${imageUrl}" alt="${product.productName}" class="search-result-image">
            <div class="search-result-details">
              <h4 class="search-result-title">${product.productName}</h4>
              <p class="search-result-price">${product.product_price} جنيه</p>
              <span class="search-result-seller">بواسطة: ${product.seller_username}</span>
            </div>
          </div>
        `;
      });
      resultsHTML += '</div>';
      searchResultsContainer.innerHTML = resultsHTML;

      // إضافة حدث النقر على كل نتيجة لفتح تفاصيل المنتج
      document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const productKey = item.dataset.productKey;
          const productData = results.find(p => p.product_key === productKey);
          if (productData && typeof window.showProductDetails === 'function') {
            window.showProductDetails(productData);
          }
        });
      });
    }

    const openModal = () => {
      searchModal.style.display = 'block';
      document.body.classList.add('modal-open');
      setTimeout(() => searchModalInput.focus(), 50); // التركيز على حقل البحث
    };

    const closeModal = () => {
      searchModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    };

    openSearchBtn.addEventListener('click', openModal);
    closeSearchBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
      if (event.target === searchModal) {
        closeModal();
      }
    });

    // ✅ جديد: دالة لجلب الفئات وتعبئة الفلاتر
    async function loadCategoryFilters() {
      try {
        const response = await fetch('shared/list.json');
        if (!response.ok) throw new Error('فشل تحميل الفئات للفلاتر');
        const data = await response.json();
        const categories = data.categories;

        // 1. تعبئة فلتر الفئات الرئيسية
        categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.title;
          // تخزين الفئات الفرعية في بيانات العنصر للوصول إليها لاحقًا
          option.dataset.subcategories = JSON.stringify(category.subcategories || []);
          mainCategoryFilter.appendChild(option);
        });

        // 2. إضافة حدث عند تغيير الفئة الرئيسية
        mainCategoryFilter.addEventListener('change', () => {
          // مسح وتحديث الفئات الفرعية
          subCategoryFilter.innerHTML = '<option value="">كل الفئات الفرعية</option>';
          const selectedOption = mainCategoryFilter.options[mainCategoryFilter.selectedIndex];
          
          if (selectedOption.value) {
            const subcategories = JSON.parse(selectedOption.dataset.subcategories);
            if (subcategories.length > 0) {
              subcategories.forEach(sub => {
                const subOption = document.createElement('option');
                subOption.value = sub.id;
                subOption.textContent = sub.title;
                subCategoryFilter.appendChild(subOption);
              });
              subCategoryFilterGroup.style.display = 'flex'; // ✅ جديد: إظهار حاوية الفلتر الفرعي
              subCategoryFilter.disabled = false; // تفعيل فلتر الفئات الفرعية
            } else {
              subCategoryFilterGroup.style.display = 'none'; // ✅ جديد: إخفاء الحاوية إذا لم تكن هناك فئات فرعية
              subCategoryFilter.disabled = true; // تعطيل إذا لم تكن هناك فئات فرعية
            }
          } else {
            subCategoryFilter.innerHTML = '<option value="">كل الفئات الفرعية</option>'; // إعادة تعيين الفئات الفرعية
            subCategoryFilterGroup.style.display = 'none'; // ✅ جديد: إخفاء الحاوية إذا تم اختيار "كل الفئات"
            subCategoryFilter.disabled = true; // تعطيل إذا تم اختيار "كل الفئات"
          }
        });
      } catch (error) {
        console.error('%c[SearchModal] خطأ في تحميل فلاتر الفئات:', 'color: red;', error);
      }
    }

    // استدعاء الدالة لتحميل الفلاتر
    loadCategoryFilters();

    // ✅ جديد: ربط أحداث البحث
    // ✅ تعديل: تغيير الحدث من 'input' إلى 'change' لتنفيذ البحث عند الانتهاء من الكتابة فقط
    searchModalInput.addEventListener('change', performSearch);
    mainCategoryFilter.addEventListener('change', performSearch);
    subCategoryFilter.addEventListener('change', performSearch);
    // ✅ جديد: ربط حدث النقر على زر البحث لتنفيذ البحث فورًا
    performSearchBtn.addEventListener('click', performSearch);

  } catch (error) {
    console.error('%c[SearchModal] خطأ في تهيئة نافذة البحث:', 'color: red;', error);
  }
}