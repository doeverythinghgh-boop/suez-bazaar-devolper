/**
 * @file js/searchModal.js
 * @description وحدة للتحكم في نافذة البحث المنبثقة، بما في ذلك تحميل محتواها،
 *   معالجة مدخلات البحث والفلاتر، عرض النتائج، وتوفير وظائف الفرز والتصفية.
 */

/**
 * يقوم بتهيئة نافذة البحث المنبثقة.
 * يحمل محتوى النافذة من ملف HTML ويربط الأحداث.
 * @param {string} containerId - معرف الحاوية التي سيتم تحميل النافذة بداخلها.
 * @param {string} openTriggerId - معرف الزر الذي يفتح النافذة.
 */
/**
 * @description يقوم بتهيئة نافذة البحث المنبثقة، ويحمل محتوى النافذة من ملف HTML، ويربط الأحداث
 *   للتحكم في البحث، الفلاتر، والفرز، ويعرض النتائج.
 * @function initSearchModal
 * @param {string} containerId - معرف الحاوية التي سيتم تحميل النافذة بداخلها.
 * @param {string} openTriggerId - معرف الزر الذي يفتح النافذة.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 */
async function initSearchModal(containerId, openTriggerId) {
  const openSearchBtn = document.getElementById(openTriggerId);

  if (!openSearchBtn) {
    console.error('[SearchModal] لم يتم العثور على حاوية النافذة أو زر الفتح.');
    return;
  }

  const openModal = async () => {
    console.log(`%c[SearchModal] بدء عملية فتح نافذة البحث...`, 'color: #0d6efd; font-weight: bold;');
    await loadAndShowModal(containerId, "pages/searchModal.html", async (modal) => {
    const searchModalInput = document.getElementById('search-modal-input');
    const mainCategoryFilter = document.getElementById('main-category-filter');
    const subCategoryFilter = document.getElementById('sub-category-filter');
    const subCategoryFilterGroup = document.getElementById('sub-category-filter-group');
    const searchResultsContainer = document.getElementById('search-results-container');
    const performSearchBtn = document.getElementById('perform-search-btn');
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const filtersContainer = document.getElementById('search-filters-container');
    const sortFilter = document.getElementById('sort-filter');
    let currentResults = [];

    /**
     * @description دالة لتأخير تنفيذ دالة معينة (Debounce) لتحسين أداء البحث أثناء الكتابة.
     * @function debounce
     * @param {function(...any): any} func - الدالة المراد تأخير تنفيذها.
     * @param {number} delay - فترة التأخير بالمللي ثانية.
     * @returns {function(...any): void} - دالة مُعدّلة تنفذ الدالة الأصلية بعد فترة التأخير.
     */
    function debounce(func, delay) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }

    /**
     * @description تنفذ عملية البحث بناءً على معايير البحث الحالية (النص، الفئات الرئيسية والفرعية).
     *   تعرض مؤشر تحميل وتُظهر النتائج أو رسالة خطأ.
     * @function performSearch
     * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
     * @see normalizeArabicText
     * @see displaySearchResults
     */
    async function performSearch() {
      // ✅ جديد: إيقاف حركة الزر بمجرد بدء البحث
      performSearchBtn.classList.remove('is-pulsing');

      // ✅ تحسين: تنقيح النص العربي من التشكيل والهمزات قبل إرساله للبحث
      const searchTerm = normalizeArabicText(searchModalInput.value.trim());
      const mainCategory = mainCategoryFilter.value;
      const subCategory = subCategoryFilter.value;

      // ✅ تحسين: تسجيل معايير البحث (بعد التنقيح) لتسهيل التصحيح
      console.log(`[SearchModal] Starting search with: searchTerm='${searchTerm}', mainCategory='${mainCategory}', subCategory='${subCategory}'`);

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

      const searchURL = `${baseURL}/api/products?${params.toString()}`;
      // ✅ جديد: تسجيل رابط الطلب الكامل قبل إرساله
      console.log(`[SearchModal] Fetching from URL: ${searchURL}`);

      try {
        const response = await fetch(searchURL);
        if (!response.ok) throw new Error('فشل جلب نتائج البحث');
        const results = await response.json();
        currentResults = results; // ✅ جديد: تخزين النتائج الأصلية
        console.log('[SearchModal] Received results from server:', currentResults); // ✅ جديد: تسجيل النتائج المستلمة
        displaySearchResults(results);
      } catch (error) {
        console.error('%c[SearchModal] خطأ في البحث:', 'color: red;', error);
        searchResultsContainer.innerHTML = '<p class="search-error-message">حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.</p>';
      }
    }

    /**
     * @description تعرض نتائج البحث في الواجهة، مع تطبيق خيارات الفرز إن وجدت.
     *   تربط أحداث النقر على بطاقات المنتجات لفتح تفاصيلها في نافذة منبثقة.
     * @function displaySearchResults
     * @param {Array<Object>} results - مصفوفة من كائنات المنتجات التي تمثل نتائج البحث.
     * @returns {void}
     * @see generateProductCardHTML
     * @see showProductDetails
     */
    function displaySearchResults(results) {
      let sortedResults = [...results]; // إنشاء نسخة من النتائج للترتيب
      const sortValue = sortFilter.value;

      // ✅ جديد: تطبيق منطق الترتيب قبل العرض
      if (sortValue === 'price-asc') {
        console.log('[SearchModal] Sorting by price: Low to High');
        sortedResults.sort((a, b) => parseFloat(a.product_price) - parseFloat(b.product_price));
      } else if (sortValue === 'price-desc') {
        console.log('[SearchModal] Sorting by price: High to Low');
        sortedResults.sort((a, b) => parseFloat(b.product_price) - parseFloat(a.product_price));
      }

      // ✅ جديد: تسجيل عدد النتائج قبل عرضها
      console.log(`[SearchModal] Displaying ${sortedResults.length} search results.`);

      if (sortedResults.length === 0) {
        searchResultsContainer.innerHTML = '<p class="no-search-results-message">لم يتم العثور على منتجات تطابق بحثك.</p>';
        return;
      }

      let resultsHTML = '<div class="search-results-grid">';
      sortedResults.forEach(product => { 
        // ✅ استدعاء الدالة الموحدة
        resultsHTML += generateProductCardHTML(product, 'search');
      });
      resultsHTML += '</div>';
      searchResultsContainer.innerHTML = resultsHTML;

      // إضافة حدث النقر على كل نتيجة لفتح تفاصيل المنتج
      document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const productKey = item.dataset.productKey;
          const productData = sortedResults.find(p => p.product_key === productKey);
          // ✅ جديد: إخفاء نافذة البحث وتمرير دالة لإعادة إظهارها عند إغلاق نافذة التفاصيل
          if (productData && typeof window.showProductDetails === 'function') {
            // ✅ إصلاح: إعادة هيكلة بيانات المنتج لتتطابق مع الهيكل الذي تتوقعه دالة showProductDetails
            const productDataForModal = {
              product_key: productData.product_key,
              productName: productData.productName,
              user_key: productData.user_key,
              pricePerItem: productData.product_price, // استخدام product_price
              original_price: productData.original_price,
              imageSrc: productData.ImageName ? productData.ImageName.split(',').map(name => `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${name}`) : [],
              availableQuantity: productData.product_quantity,
              sellerMessage: productData.user_message,
              description: productData.product_description,
              sellerName: productData.seller_username,
              sellerPhone: productData.seller_phone,
              MainCategory: productData.MainCategory, // ✅ إضافة: تمرير ID الفئة الرئيسية
              SubCategory: productData.SubCategory    // ✅ إضافة: تمرير ID الفئة الفرعية
            };

            modal.style.display = 'none';
            window.showProductDetails(productDataForModal, () => {
              modal.style.display = 'block';
            });
          }
        });
      });
    }


    // ✅ جديد: إضافة حدث النقر على رابط التحكم بالفلاتر
    toggleFiltersBtn.addEventListener('click', (e) => {
      e.preventDefault(); // منع السلوك الافتراضي للرابط
      const isVisible = filtersContainer.style.display === 'flex';
      const icon = toggleFiltersBtn.querySelector('i');

      if (isVisible) {
        filtersContainer.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
        // ✅ جديد: إعادة تعيين الفلاتر إلى "الكل" عند إغلاق القسم
        if (mainCategoryFilter.value !== "") {
          mainCategoryFilter.value = "";
          // إعادة تعيين الفلتر الفرعي يدويًا لأن تغيير القيمة برمجيًا لا يطلق حدث 'change'
          subCategoryFilter.innerHTML = '<option value="">كل الاسواق الفرعية</option>';
          subCategoryFilter.disabled = true;
          subCategoryFilterGroup.style.display = 'none';
          // إعادة تنفيذ البحث ليعكس إزالة الفلاتر
          performSearch();
        }
      } else {
        filtersContainer.style.display = 'flex';
        icon.style.transform = 'rotate(180deg)';
      }
    });

    // ✅ جديد: إضافة حدث عند تغيير خيار الترتيب
    sortFilter.addEventListener('change', () => {
      // إعادة عرض النتائج الحالية مع الترتيب الجديد دون استدعاء API
      displaySearchResults(currentResults);
    });
    /**
     * @description تجلب الفئات من ملف `shared/list.json` وتعبئ فلاتر الفئات الرئيسية والفرعية في نافذة البحث.
     *   تقوم أيضًا بإعداد مستمعي الأحداث لتحديث الفلاتر الفرعية عند تغيير الفئة الرئيسية.
     * @function loadCategoryFilters
     * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
     * @throws {Error} - إذا فشل تحميل الفئات.
     */
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
          subCategoryFilter.innerHTML = '<option value="">كل الاسواق الفرعية</option>';
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
            subCategoryFilter.innerHTML = '<option value="">كل الاسواق الفرعية</option>'; // إعادة تعيين الفئات الفرعية
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
    // ✅ إصلاح: التحقق من وجود العناصر قبل ربط الأحداث لتجنب الأخطاء
    if (searchModalInput) searchModalInput.addEventListener('change', performSearch);
    if (mainCategoryFilter) mainCategoryFilter.addEventListener('change', performSearch);
    if (subCategoryFilter) subCategoryFilter.addEventListener('change', performSearch);
    if (performSearchBtn) {
      performSearchBtn.addEventListener('click', performSearch);
    } else {
      // رسالة للمطور في حال عدم العثور على الزر
      console.error('[SearchModal] لم يتم العثور على زر البحث (perform-search-btn) لربط حدث النقر.');
    }
    
    // ✅ جديد: إضافة حدث للتحكم في حركة زر البحث أثناء الكتابة
    searchModalInput.addEventListener('input', () => {
      if (searchModalInput.value.trim() !== '') {
        performSearchBtn.classList.add('is-pulsing');
      } else {
        performSearchBtn.classList.remove('is-pulsing');
      }
    });

    setTimeout(() => searchModalInput.focus(), 50);
    });
  };
  openSearchBtn.addEventListener('click', () => {
    // ✅ جديد: إضافة رسالة تتبع للمطور عند النقر على زر البحث
    console.log(`[SearchModal] تم النقر على زر البحث (ID: ${openTriggerId}).`);
    openModal();
  });
}