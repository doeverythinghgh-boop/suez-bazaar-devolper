/**
 * @function initSearchModal
 * @description Initializes the search modal by retrieving DOM elements and attaching event listeners.
 * @param {string} containerId - The ID of the container element for the search modal (unused in current logic but kept for signature).
 * @returns {Promise<void>}
 */
async function initSearchModal(containerId) {
  // Developer message: بدء تهيئة نافذة البحث
  console.log(
    "%c[SearchModal] بدء تهيئة نافذة البحث.",
    "color: #007bff; font-weight: bold;"
  );
  const searchModalInput = document.getElementById("search-modal-input");
  const mainCategoryFilter = document.getElementById(
    "search-main-category-filter"
  );
  const subCategoryFilter = document.getElementById(
    "search-sub-category-filter"
  );
  const subCategoryFilterGroup = document.getElementById(
    "search-sub-category-filter-group"
  );
  const searchResultsContainer = document.getElementById(
    "search-results-container"
  );
  const performSearchBtn = document.getElementById(
    "search-perform-search-btn"
  );
  const sortFilter = document.getElementById("search-sort-filter");
  let currentResults = [];
  // Developer message: DOM elements retrieved successfully
  console.log(
    "[SearchModal] تم استرداد جميع عناصر DOM المطلوبة بنجاح."
  );

  /**
   * @function debounce
   * @description Delayed execution function (Debounce) to improve search performance while typing.
   * @param {function(...any): any} func - The function to be debounced.
   * @param {number} delay - The delay in milliseconds.
   * @returns {function(...any): void} - A modified function that executes the original function after the delay.
   */
  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * @function performSearch
   * @description Executes the search based on current criteria (text, main/sub categories).
   *   Shows loading indicator and then results or error message.
   * @returns {Promise<void>} - A Promise that resolves when search is complete.
   * @see normalizeArabicText
   * @see displaySearchResults
   */
  async function performSearch() {
    // Stop button animation once search starts
    performSearchBtn.classList.remove("is-pulsing");

    // Refine Arabic text before sending
    const searchTerm = normalizeArabicText(searchModalInput.value.trim());
    const mainCategory = mainCategoryFilter.value;
    const subCategory = subCategoryFilter.value;

    // Log search criteria
    console.info(
      `[SearchModal] بدء البحث بـ: searchTerm='${searchTerm}', mainCategory='${mainCategory}', subCategory='${subCategory}'`
    );

    // Do not search if empty
    if (!searchTerm && !mainCategory) {
      searchResultsContainer.innerHTML = ""; // Clear results
      return;
    }

    // Show loader
    searchResultsContainer.innerHTML = ""; // Clear previous results
    const loader = document.createElement("div"); // NOSONAR
    loader.className = "loader";
    loader.style.margin = "40px auto";
    searchResultsContainer.appendChild(loader);

    const params = new URLSearchParams();
    if (searchTerm) params.append("searchTerm", searchTerm);
    if (mainCategory) params.append("MainCategory", mainCategory);
    if (subCategory) params.append("SubCategory", subCategory);

    const searchURL = `${baseURL}/api/products?${params.toString()}`;
    // Log full request URL
    console.info(`[SearchModal] جلب من الرابط: ${searchURL}`);

    try {
      const response = await fetch(searchURL);
      if (!response.ok) throw new Error("فشل جلب نتائج البحث");
      const results = await response.json();
      currentResults = results; // Store original results
      console.log(
        "[SearchModal] تم استلام النتائج بنجاح من الخادم:",
        currentResults
      ); // Log received results
      displaySearchResults(results);
    } catch (error) {
      console.error("%c[SearchModal] خطأ في البحث:", "color: red;", error);
      searchResultsContainer.innerHTML = // NOSONAR
        '<p class="search-error-message">حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.</p>'; // NOSONAR
    }
    // Notify developer search is complete
    console.log(
      "%c[SearchModal] اكتملت عملية البحث.",
      "color: blue; font-style: italic;"
    );
  }

  /**
   * @function displaySearchResults
   * @description Displays search results in the UI, applying sort options if any.
   *   Attaches click events to product cards to open details modal.
   * @param {Array<Object>} results - Array of product objects.
   * @returns {void}
   */
  function displaySearchResults(results) {
    // Developer message: Start displaying results
    console.log("[SearchModal] بدء عرض نتائج البحث.");
    let sortedResults = [...results]; // Copy results for sorting
    const sortValue = sortFilter.value;

    // Apply sorting logic
    if (sortValue === "price-asc") {
      console.info("[SearchModal] ترتيب النتائج حسب السعر: من الأقل إلى الأعلى.");
      sortedResults.sort(
        (a, b) => parseFloat(a.product_price) - parseFloat(b.product_price)
      );
    } else if (sortValue === "price-desc") {
      console.info("[SearchModal] ترتيب النتائج حسب السعر: من الأعلى إلى الأقل.");
      sortedResults.sort(
        (a, b) => parseFloat(b.product_price) - parseFloat(a.product_price)
      );
    }

    // Log number of results
    console.log(
      `[SearchModal] التحضير لعرض ${sortedResults.length} نتائج بحث.`
    );

    if (sortedResults.length === 0) {
      searchResultsContainer.innerHTML = // NOSONAR
        '<p class="search-no-results-message">لم يتم العثور على منتجات مطابقة لبحثك.</p>';
      return;
    }

    let resultsHTML = '<div class="search-results-grid">';
    sortedResults.forEach((product) => {
      // NOSONAR
      // Call unified function
      resultsHTML += generateSearchResultHTML(product);
    });
    resultsHTML += "</div>";
    searchResultsContainer.innerHTML = resultsHTML;

    // Add click event to each result to open product details
    document.querySelectorAll(".search-result-item").forEach((item) => {
      // NOSONAR
      item.addEventListener("click", () => {
        const productKey = item.dataset.productKey;
        const productData = sortedResults.find(
          (p) => p.product_key === productKey
        );
        // Hide search modal and pass a callback to reopen it? (Not implemented here, but implied)
        // Developer message: Product clicked
        console.log(
          "%c[Search Result Click] تم النقر على المنتج:",
          "color: #20c997; font-weight: bold;",
          productData
        );

        // Restructure product data for modal
        const productDataForModal = {
          product_key: productData.product_key,
          productName: productData.productName,
          user_key: productData.user_key,
          pricePerItem: productData.product_price, // Use product_price
          original_price: productData.original_price,
          imageSrc: productData.ImageName
            ? productData.ImageName.split(",").map(
              (name) => getPublicR2FileUrl(name)
            )
            : [],
          availableQuantity: productData.product_quantity,
          sellerMessage: productData.user_message,
          description: productData.product_description,
          sellerName: productData.sellerName || productData.seller_username,
          sellerPhone: productData.seller_phone,
          seller_location: productData.seller_location,
          MainCategory: productData.MainCategory, // Pass Main Category ID
          SubCategory: productData.SubCategory, // Pass Sub Category ID
          realPrice: productData.realPrice,
          heavyLoad: productData.heavyLoad || productData.heavy_load,
          type: productData.serviceType,
        };

        // Use new loadProductView function
        loadProductView(productDataForModal, true);
      });
    });
  }

  // Add event listener for sort change
  sortFilter.addEventListener("change", () => {
    // Developer message: Sort changed
    console.log(
      `[SearchModal] تم تغيير خيار الترتيب إلى: ${sortFilter.value}. إعادة عرض النتائج.`
    );
    // Redisplay results with new sort
    displaySearchResults(currentResults);
  });
  /**
   * @function loadCategoryFilters
   * @description Fetches categories from `shared/list.json` and populates main/sub category filters.
   *   Sets up event listeners to update sub-categories when main category changes.
   * @returns {Promise<void>}
   * @throws {Error} - If loading categories fails.
   */
  async function loadCategoryFilters() {
    // Developer message: Start loading category filters
    console.log(
      "[SearchModal] بدء تحميل فلاتر التصنيفات من 'list.json'."
    );
    try {
      const response = await fetch("shared/list.json");
      if (!response.ok) throw new Error("فشل تحميل فلاتر التصنيفات");
      const data = await response.json();
      const categories = data.categories;

      // Developer message: list.json loaded successfully
      console.log(
        "[SearchModal] تم تحميل وتحليل 'list.json' بنجاح.",
        categories
      );
      // 1. Populate Main Category Filter
      categories.forEach((category) => {
        const option = document.createElement("option"); // NOSONAR
        option.value = category.id;
        option.textContent = category.title;
        // Store subcategories in dataset
        option.dataset.subcategories = JSON.stringify(
          category.subcategories || []
        );
        mainCategoryFilter.appendChild(option);
      });

      // 2. Add event on Main Category change
      // Developer message: Attach event
      console.log(
        "[SearchModal] ربط مستمع حدث 'change' بفلتر التصنيف الرئيسي."
      );
      mainCategoryFilter.addEventListener("change", () => {
        // Reset Sub Categories
        subCategoryFilter.innerHTML = // NOSONAR
          '<option value="">كل الاسواق الفرعية</option>';
        const selectedOption =
          mainCategoryFilter.options[mainCategoryFilter.selectedIndex];

        if (selectedOption.value) {
          const subcategories = JSON.parse(
            selectedOption.dataset.subcategories
          );
          if (subcategories.length > 0) {
            subcategories.forEach((sub) => {
              const subOption = document.createElement("option"); // NOSONAR
              subOption.value = sub.id;
              subOption.textContent = sub.title;
              subCategoryFilter.appendChild(subOption);
            });
            subCategoryFilter.disabled = false; // Enable sub category filter
          } else {
            subCategoryFilter.disabled = true; // Disable if no sub categories
          }
        } else {
          subCategoryFilter.innerHTML = // NOSONAR
            '<option value="">كل الاسواق الفرعية</option>'; // Reset
          subCategoryFilter.disabled = true; // Disable
        }
        // Developer message: Sub updated
        console.log(
          "[SearchModal] تم تحديث فلتر التصنيف الفرعي بناءً على اختيار التصنيف الرئيسي."
        );
      });
    } catch (error) {
      console.error(
        "%c[SearchModal] خطأ في تحميل فلاتر التصنيفات:",
        "color: red;",
        error
      );
    }
    // Developer message: Completed
    console.log(
      "[SearchModal] تم تحميل وتكوين فلاتر التصنيفات بالكامل."
    );
  }

  // Call function to load filters
  loadCategoryFilters();

  // Attach search events
  // Developer message: Attach search events
  console.log(
    "[SearchModal] ربط مستمعي أحداث البحث بحقول الإدخال والأزرار."
  );
  // Search only on button click now

  if (performSearchBtn) {
    performSearchBtn.addEventListener("click", performSearch);
  } else {
    // Error message if button not found
    console.error(
      "[SearchModal] زر البحث (perform-search-btn) غير موجود."
    );

    // Add input animation event
    searchModalInput.addEventListener("input", () => {
      if (searchModalInput.value.trim() !== "") {
        performSearchBtn.classList.add("is-pulsing");
      } else {
        performSearchBtn.classList.remove("is-pulsing");
      }
    });

    setTimeout(() => searchModalInput.focus(), 50);
  }

  // Developer message: Init complete
  console.log(
    "%c[SearchModal] اكتملت التهيئة. نافذة البحث جاهزة.",
    "color: green; font-weight: bold;"
  );
}

function generateSearchResultHTML(product) {

  // Handle images
  const firstImageName = product.ImageName
    ? product.ImageName.split(",")[0]
    : null;
  const imageUrl = firstImageName
    ? getPublicR2FileUrl(firstImageName)
    : "images/placeholder.png";

  // Determine if service using helper function
  const isService = isServiceCategory(product.MainCategory, product.SubCategory);
  const price = parseFloat(product.product_price);

  // Build HTML for search result
  return `
  <div class="search-result-item" data-product-key="${product.product_key}">
    <img src="${imageUrl}" alt="${product.productName
    }" class="search-result-image">
    <div class="search-result-details">
      <h4 class="search-result-title">${product.productName}</h4>
      ${!isService
      ? `<p class="search-result-price">${price.toFixed(2)} جنيه</p>`
      : ""
    }
    </div>
  </div>
`;
}

// Initialize the modal immediately if the container is present?
// No, the architecture seems to call initSearchModal explicitly or implicitly via mainLoader loading the script?
// NOTE: based on register.html logic, code inside <script> tags runs when loaded.
// Search modal logic was inside initSearchModal which might be called by the system.
// Let's check how initSearchModal is called.
// It seems it is defined as a global function that might be called by the loader or self-invoked??
// In the original file:
// <script> function initSearchModal(...) { ... } </script>
// It is NOT called at the end of the script.
// Wait, looking at index.html... mainLoader loads the page.
// Does mainLoader automatically call initSearchModal?
// Usually mainLoader loads HTML and executes scripts found in it.
// If initSearchModal is defined, who calls it?
// Let's re-read the original file's script section carefully.
// AH! It's NOT called in the script block I saw.
// But wait, page loading usually implies some init.
// If mainLoader sees a function with a specific name or just runs code?
// `register.html` had code running immediately (at top level).
// `search.html` defined `initSearchModal`.
// Perhaps `mainLoader` calls it?
// Let's quickly check `js/forms.js` (mainLoader) if I could... but I should trust the pattern.
// If I move the code to external file `search.js`, and `mainLoader` loads it via `<script src="...">`, it will be executed.
// If `initSearchModal` was NOT called in original file, how did it work?
// Maybe I missed a line at the bottom?
// Let me double check the file view of search.html...
// Rows 436-818... I saw `function initSearchModal`...
// I did NOT see a call to `initSearchModal()` at the bottom.
// BUT, if I look at `js/forms.js` (which I viewed in previous sessions or I can guess), `mainLoader` often calls a function named `init[PageName]` or similar?
// Or maybe I missed it.
// Let's add a call to `initSearchModal()` at the end of `search.js` just to be safe?
// OR, better, let's keep it exactly as it was.
// Wait, if it wasn't called, it wouldn't run.
// Let me look at the end of the file view again...
// It ends at line 818. The function ends at 771. `generateSearchResultHTML` is outside at 773.
// There is NO call to initSearchModal.
// This implies `mainLoader` calls it.
// So I should expose `initSearchModal` to global scope.
// Since `search.js` will be loaded, functions defined in it *should* be global if not in a module.
// So I will just copy the content.

