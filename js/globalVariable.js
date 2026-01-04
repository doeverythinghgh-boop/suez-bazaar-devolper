/**
* @file js/globalVariable.js
* @description Definition of global variables and functions responsible for page routing and layout
*   specific to products (add, view, edit).
*/

/**
 * @description Global list of application categories.
 * Fetched once from shared/list.json on startup.
 * @type {object|null}
 * @global
 */
window.appCategoriesList = null;

/**
 * @description Fetches the application categories list from shared/list.json.
 * Stores the result in window.appCategoriesList for global access.
 * @function fetchAppCategories
 * @async
 * @returns {Promise<object|null>} - The categories data or null on failure.
 */
async function fetchAppCategories() {
    if (window.appCategoriesList) return window.appCategoriesList;
    try {
        const response = await fetch("shared/list.json");
        if (!response.ok) throw new Error("Failed to load list.json");
        window.appCategoriesList = await response.json();
        console.log("✅ [Global] تم تحميل قائمة الفئات بنجاح.");
        return window.appCategoriesList;
    } catch (error) {
        console.error("❌ [Global] خطأ في تحميل قائمة الفئات:", error);
        return null;
    }
}

/**
 * @description Currently logged-in user data.
 * @type {object|null}
 * @global
 */
window.userSession = null;

/**
 * @description Currently displayed product data (for details or editing).
 * @type {Array|object|null}
 * @global
 * @deprecated Use ProductStateManager.getCurrentProduct() instead.
 */
window.productSession = null;

/**
 * @description ID of the main category selected when adding a product.
 * @type {string|number|null}
 * @global
 * @deprecated Use ProductStateManager.getSelectedCategories() instead.
 */
window.mainCategorySelectToAdd = null;

/**
 * @description ID of the sub-category selected when adding a product.
 * @type {string|number|null}
 * @global
 * @deprecated Use ProductStateManager.getSelectedCategories() instead.
 */
window.subCategorySelectToAdd = null;

/**
 * @description Product type selected when adding (0 = default, 2 = service, etc).
 * @type {number|null}
 * @global
 * @deprecated Use serviceCategoryHelper functions instead.
 */
window.productTypeToAdd = null;

/**
 * @description List of current user's products.
 * @type {Array|null}
 * @global
 * @deprecated Local variables in pages should be preferred.
 */
window.myProducts = null;

/**
 * @description Load appropriate product view page based on product data.
 * @function loadProductView
 * @param {object} productData - Product data object containing MainCategory, SubCategory, etc.
 * @param {object|boolean} [options={}] - View options (can be object or boolean for backward compatibility).
 * @returns {void}
 * @see ProductStateManager
 * @see isServiceCategory
 */
function loadProductView(productData, options = {}) {
  // Handle backward compatibility: if options is boolean, convert to object
  const viewOptions = typeof options === 'boolean' ? { showAddToCart: options } : options;

  // Store state
  ProductStateManager.setProductForView(productData, viewOptions);

  // Determine product type using service category helper
  const isService = isServiceCategory(
    productData.MainCategory,
    productData.SubCategory
  );

  // Load appropriate page
  const pagePath = isService
    ? "pages/productView2/productView2.html"
    : "pages/productView/productView.html";

  console.log(`[ProductView] تحميل صفحة ${isService ? 'الخدمة' : 'المنتج'} للفئة ${productData.MainCategory}/${productData.SubCategory}`);

  mainLoader(
    pagePath,
    "index-productView-container",
    0,
    undefined,
    "showHomeIcon",
    true
  );
}

/**
 * @description Load appropriate add/edit page based on selected categories.
... (loadProductForm content is kept as is in replace block)
 */
function loadProductForm(options = {}) {
  const { editMode = false, productData = null } = options;

  // Get selected categories
  const categories = ProductStateManager.getSelectedCategories();
  if (!categories) {
    console.error('[ProductForm] لم يتم تحديد الفئات');
    return;
  }

  // Determine if service using helper function
  const isService = isServiceCategory(categories.mainId, categories.subId);

  // Store product data if edit mode
  if (editMode && productData) {
    ProductStateManager.setProductForView(productData);
  }

  // Determine page path
  let pagePath;
  if (editMode) {
    pagePath = isService ? "./pages/productEdit2/productEdit2.html" : "./pages/productEdit/productEdit.html";
  } else {
    pagePath = isService ? "./pages/productAdd2/productAdd2.html" : "./pages/productAdd/productAdd.html";
  }

  console.log(`[ProductForm] تحميل صفحة ${editMode ? 'تعديل' : 'إضافة'} ${isService ? 'خدمة' : 'منتج'} للفئة ${categories.mainId}/${categories.subId}`);

  // Determine target container
  var targetContainer = editMode ? "index-productEdit-container" : "index-productAdd-container";

  mainLoader(
    pagePath,
    targetContainer,
    0,
    undefined,
    "showHomeIcon",
    editMode ? true : false // Smart Loading: Only reload on Edit mode to fetch fresh data
  );
}

/**
 * @description Displays a modal to select the main and sub-category before adding a new product.
...
 */
async function showAddProductModal() {
  try {
    // [Skip logic] Check if a draft is already active in the add container
    const addContainer = document.getElementById("index-productAdd-container");
    const activeUrl = addContainer ? addContainer.getAttribute("data-page-url") : null;
    const hasCategories = !!ProductStateManager.getSelectedCategories();

    if (activeUrl && hasCategories) {
      console.log("[AddProduct] تم اكتشاف مسودة نشطة، تخطي نافذة اختيار الفئة.");
      loadProductForm({ editMode: false });
      return;
    }

    const result = await CategoryModal.show();
    if (result.status === 'success') {
      console.log('[AddProduct] تم اختيار الفئات:', result.mainId, result.subId);

      // Store in new state manager
      ProductStateManager.setSelectedCategories(result.mainId, result.subId);

      // Use new function
      loadProductForm({ editMode: false });
    }

  } catch (error) {
    console.error("[AddProduct] خطأ في عرض نافذة إضافة المنتج:", error);
  }
}
