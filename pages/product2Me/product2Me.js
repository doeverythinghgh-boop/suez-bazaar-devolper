(function () {
  /**
   * @fileoverview User Products Management Page (product2Me)
   * @description Handles listing, searching, editing, and deleting user's products.
   */

  // Product Data
  var myProducts = []; // To be populated from actual source

  // Main DOM Elements
  var productsGrid = document.getElementById("products-grid");
  var loadingState = document.getElementById("loading-state");
  var emptyState = document.getElementById("empty-state");
  var searchInput = document.getElementById("search-input");
  var mainCategoryFilter = document.getElementById("main-category-filter");
  var subCategoryFilter = document.getElementById("sub-category-filter");

  // Base Image URL
  // const CLOUDFLARE_BASE_URL = "https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/";

  /**
   * @function loadProducts
   * @description Fetches the user's products from server with optional filters.
   * @param {object} [filters={}] - Optional filters object containing searchTerm, MainCategory, SubCategory
   */
  async function loadProducts(filters = {}) {
    console.log("%c[Products] جارٍ تحميل المنتجات بالفلاتر:", "color: blue;", filters);
    // Show loading state
    if (productsGrid) productsGrid.innerHTML = "";
    if (loadingState) loadingState.style.display = "block";
    if (emptyState) emptyState.style.display = "none";

    // Build URL params
    const params = new URLSearchParams();
    params.append("user_key", userSession.user_key || ""); // Filter by current user

    // Normalize Arabic text and use searchTerm
    if (filters.searchTerm) {
      params.append("searchTerm", normalizeArabicText(filters.searchTerm));
    }
    if (filters.MainCategory) params.append("MainCategory", filters.MainCategory);
    if (filters.SubCategory) params.append("SubCategory", filters.SubCategory);

    // Reuse existing API endpoint
    const url = `${baseURL}/api/products?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("فشل جلب المنتجات");
      myProducts = await response.json();

      console.log(`%c[Products] تم تحميل ${myProducts ? myProducts.length : 0} منتجات`, "color: green;");

      // Check if no products found
      if (!myProducts || myProducts.length === 0) {
        showEmptyState();
        return;
      }

      // Render products (already filtered by server)
      renderProducts(myProducts);
      if (loadingState) loadingState.style.display = "none";

    } catch (error) {
      console.error("[Products] خطأ في جلب المنتجات:", error);
      // Hide loader, but show no error to user (as requested)
      if (loadingState) loadingState.style.display = "none";
      // Optionally show empty state if fetch failed to avoid broken UI
      if (productsGrid && productsGrid.innerHTML === "") {
        showEmptyState();
      }
    }
  }

  /**
   * @function showEmptyState
   * @description Displays the empty state UI when no products are found.
   */
  function showEmptyState() {
    if (loadingState) loadingState.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    if (productsGrid) productsGrid.innerHTML = "";
  }

  /**
   * @function renderProducts
   * @description Renders the list of products into the grid with optional sorting.
   * @param {Array} products - Array of product objects.
   */
  function renderProducts(products) {
    if (!productsGrid) return;
    productsGrid.innerHTML = "";

    // Apply sorting based on sort filter
    const sortFilter = document.getElementById("sort-filter");
    const sortValue = sortFilter ? sortFilter.value : "default";
    let sortedProducts = [...products];

    if (sortValue === "price-asc") {
      sortedProducts.sort((a, b) => parseFloat(a.product_price) - parseFloat(b.product_price));
    } else if (sortValue === "price-desc") {
      sortedProducts.sort((a, b) => parseFloat(b.product_price) - parseFloat(a.product_price));
    }

    sortedProducts.forEach((product) => {
      const card = createProductCard(product);
      productsGrid.appendChild(card);
    });
  }

  /**
   * @function createProductCard
   * @description Creates a DOM element for a single product card.
   * @param {object} product - Product data object.
   * @returns {HTMLElement} The product card element.
   */
  function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "p2m-product-card";
    card.setAttribute("data-product-id", product.id);

    // Get the first image
    const firstImage = product.ImageName
      ? product.ImageName.split(",")[0].trim()
      : null;

    const imageUrl = firstImage ? getPublicR2FileUrl(firstImage) : null;

    // Truncate product name if too long
    const displayName =
      product.productName.length > 15
        ? product.productName.substring(0, 15) + "..."
        : product.productName;

    card.innerHTML = `
                  <div class="p2m-product-image">
                      ${imageUrl
        ? `<img src="${imageUrl}" alt="${product.productName}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-box\\'></i>';" />`
        : '<i class="fas fa-box"></i>'
      }
                  </div>
                  <div class="p2m-product-content">
                      <h3 class="p2m-product-name">${displayName}</h3>
                      <div class="p2m-product-actions">
                          <button class="p2m-btn p2m-btn-edit" onclick="editProduct(${product.id})">
                              <i class="fas fa-edit"></i> <span>تعديل</span>
                          </button>
                          <button class="p2m-btn p2m-btn-delete" onclick="deleteProduct(${product.id})">
                              <i class="fas fa-trash"></i> <span>حذف</span>
                          </button>
                      </div>
                  </div>
              `;

    // Add click event to show details
    card.addEventListener("click", (e) => {
      // Check that click was not on edit or delete buttons
      if (!e.target.closest(".p2m-btn")) {
        // Log product data to console instead of showing modal directly (as per logic)
        console.log(
          "%c[Developer] تم النقر على بطاقة المنتج. البيانات:",
          "color: #007bff; font-weight: bold;",
          product
        );
        // Prepare product data for modal/view
        const productDataForModal = mapProductData(product);

        // Use new loadProductView function
        loadProductView(productDataForModal, false);
      }
    });

    return card;
  }

  /**
   * @function editProduct
   * @description Handles product editing logic (Category selection -> Edit Page).
   * @param {number} productId - ID of the product to edit.
   */
  async function editProduct(productId) {
    const product = myProducts.find((p) => p.id === productId);
    if (!product) {
      console.error(
        "%c[Products] المنتج غير موجود:",
        "color: red;",
        productId
      );
      return;
    }

    console.log("%c[Products] تعديل المنتج:", "color: blue;", product);
    const result = await CategoryModal.show(product.MainCategory, product.SubCategory, "السوق الحالي للمنتج");
    if (result.status === 'success') {
      console.log('[EditProduct] تم اختيار الفئات:', result.mainId, result.subId);

      // Update product categories
      product.MainCategory = result.mainId;
      product.SubCategory = result.subId;

      // Store in new state manager
      ProductStateManager.setSelectedCategories(result.mainId, result.subId);

      // Use new function
      loadProductForm({ editMode: true, productData: product });

    }
  }

  /**
   * @function deleteProduct
   * @description Handles product deletion logic with confirmation.
   * @param {number} productId - ID of the product to delete.
   */
  async function deleteProduct(productId) {
    const product = myProducts.find((p) => p.id === productId);
    console.log("%c[Products] حذف المنتج:", "color: red;", product);
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
                deleteFile2cf(name).catch(err => console.error(`[Delete] فشل حذف الصورة ${name}:`, err))
              ));
            }
          }
          const dbResult = await deleteProduct_(product.product_key);
          console.log("%c[Products] حذف المنتج:", "color: red;", dbResult);
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
        // Remove from local array
        const index = myProducts.findIndex((p) => p.id === productId);
        if (index > -1) {
          myProducts.splice(index, 1);
        }

        // Reload display
        loadProducts();

        Swal.fire("تم الحذف!", "تم حذف المنتج بنجاح", "success");

      }
    });
  }
  /**
   * @function loadCategoryFilters
   * @description Fetches categories from `shared/list.json` and populates main/sub category filters.
   *   Sets up event listeners to update sub-categories when main category changes.
   * @returns {Promise<void>}
   * @throws {Error} - If loading categories fails.
   */
  async function loadCategoryFilters() {
    console.log("[Products] بدء تحميل فلاتر الفئات من المتغير العام.");
    try {
      const data = window.appCategoriesList || await fetchAppCategories();
      if (!data) throw new Error("Failed to load global category list");
      const categories = data.categories;

      console.log("[Products] تم تحميل وتحليل 'list.json' بنجاح.", categories);

      // Clear existing options except the first one
      if (mainCategoryFilter) mainCategoryFilter.innerHTML = '<option value="">جميع الفئات</option>';

      // Populate Main Category Filter
      if (categories && mainCategoryFilter) {
        categories.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.id;
          const titleObj = category.title;
          const displayTitle = typeof titleObj === 'object' ? 
              (titleObj[window.app_language] || titleObj['ar']) : titleObj;
          option.textContent = displayTitle;
          // Store subcategories in dataset
          option.dataset.subcategories = JSON.stringify(category.subcategories || []);
          mainCategoryFilter.appendChild(option);
        });
      }

      // Add event on Main Category change
      if (mainCategoryFilter) {
        console.log("[Products] ربط حدث 'change' بفلتر الفئة الرئيسية.");
        mainCategoryFilter.onchange = () => {
          // Reset Sub Categories
          if (subCategoryFilter) {
            subCategoryFilter.innerHTML = '<option value="">جميع الفئات الفرعية</option>';
            const selectedOption = mainCategoryFilter.options[mainCategoryFilter.selectedIndex];

            if (selectedOption.value) {
              const subcategories = JSON.parse(selectedOption.dataset.subcategories);
              if (subcategories.length > 0) {
                subcategories.forEach((sub) => {
                  const subOption = document.createElement("option");
                  subOption.value = sub.id;
                  const subTitleObj = sub.title;
                  const subDisplayTitle = typeof subTitleObj === 'object' ? 
                      (subTitleObj[window.app_language] || subTitleObj['ar']) : subTitleObj;
                  subOption.textContent = subDisplayTitle;
                  subCategoryFilter.appendChild(subOption);
                });
                subCategoryFilter.disabled = false; // Enable sub category filter
              } else {
                subCategoryFilter.disabled = true; // Disable if no sub categories
              }
            } else {
              subCategoryFilter.innerHTML = '<option value="">جميع الفئات الفرعية</option>';
              subCategoryFilter.disabled = true; // Disable
            }
          }
          console.log("[Products] تم تحديث فلتر الفئة الفرعية بناءً على اختيار الفئة الرئيسية.");
        };
      }
    } catch (error) {
      console.error("%c[Products] خطأ في تحميل فلاتر الفئات:", "color: red;", error);
    }
    console.log("[Products] تم تحميل وتكوين فلاتر الفئات بالكامل.");
  }
  /**
   * @function filterProducts
   * @description Collects search criteria and fetches filtered products from server.
   */
  async function filterProducts() {
    // Collect search criteria
    const searchTerm = searchInput ? searchInput.value.trim() : "";
    const mainCategory = mainCategoryFilter ? mainCategoryFilter.value : "";
    const subCategory = subCategoryFilter ? subCategoryFilter.value : "";

    console.log("%c[Products] بحث بالمعايير:", "color: blue;", {
      searchTerm,
      mainCategory,
      subCategory
    });

    // Build filters object (only include non-empty values)
    const filters = {};
    if (searchTerm) filters.searchTerm = searchTerm;
    if (mainCategory) filters.MainCategory = mainCategory;
    if (subCategory) filters.SubCategory = subCategory;

    // Load products with server-side filtering
    await loadProducts(filters);
  }


  // Initialize immediately (not waiting for DOMContentLoaded since page is loaded via mainLoader)
  // Load category filters on page load
  loadCategoryFilters();

  // Sort filter change event
  var sortFilter = document.getElementById("sort-filter");
  if (sortFilter) {
    sortFilter.onchange = () => {
      // Re-render current products with new sort
      if (myProducts && myProducts.length > 0) {
        renderProducts(myProducts);
      }
    };
  }

  // Back Button Logic
  var p2m_btnBack = document.getElementById('p2m-btn-back');
  if (p2m_btnBack) {
    p2m_btnBack.onclick = function () {
      try {
        if (window.containerGoBack) {
          containerGoBack();
        }
      } catch (error) {
        console.error('[P2M] Error in back button logic:', error);
      }
    };
  }

  // Search Event - only load products when search button is clicked
  var searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.onclick = function () {
      filterProducts();
    };
  }

  // Make functions globally available
  window.editProduct = editProduct;
  window.deleteProduct = deleteProduct;
  window.loadProducts = loadProducts; // Also expose if needed
})();
