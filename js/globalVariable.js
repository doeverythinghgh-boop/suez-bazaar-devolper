/**
* @file js/globalVariable.js
* @description Definition of global variables and functions responsible for page routing and layout
*   specific to products (add, view, edit).
*/

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
 */
window.productSession = null;

/**
 * @description ID of the main category selected when adding a product.
 * @type {string|number|null}
 * @global
 */
window.mainCategorySelectToAdd = null;

/**
 * @description ID of the sub-category selected when adding a product.
 * @type {string|number|null}
 * @global
 */
window.subCategorySelectToAdd = null;

/**
 * @description Product type selected when adding (0 = default, 2 = service, etc).
 * @type {number|null}
 * @global
 */
window.productTypeToAdd = null;

/**
 * @description List of current user's products (for display in "My Products" page).
 * @type {Array|null}
 * @global
 */
window.myProducts = null;

/**
 * @description Loads and displays the product details page based on the requested view type.
 * @function productViewLayout
 * @param {string} View - View type ('0' for normal view, '2' for alternate view).
 * @returns {void}
 * @see mainLoader
 * @deprecated Use loadProductView() instead for better flexibility.
 */
function productViewLayout(View) {
  console.log('-----------نوع الخدمه-----------', View);
  //In sending
  //productSession = [productDataForModal,{showAddToCart:true}];
  //In receiving
  //(productSession[0],  productSession[1] )
  //function productView_viewDetails(productData, options = {})--->options.showAddToCart
  if (View == '0') {
    //option = t/f ==> view or hidden pasket option
    mainLoader(
      "pages/productView.html",
      "index-product-container",
      0,
      undefined,
      "showHomeIcon",
      true
    );
  }
  if (View == '2') {
    mainLoader(
      "pages/productView2.html",
      "index-product-container",
      0,
      undefined,
      "showHomeIcon",
      true
    );
  }
}

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
    ? "pages/productView2.html"
    : "pages/productView.html";

  console.log(`[ProductView] تحميل صفحة ${isService ? 'الخدمة' : 'المنتج'} للفئة ${productData.MainCategory}/${productData.SubCategory}`);

  mainLoader(
    pagePath,
    "index-product-container",
    0,
    undefined,
    "showHomeIcon",
    true
  );
}


/**
 * @description Directs the user to the add new product page, setting the product type based on the selected category.
 * @function productAddSetType
 * @param {boolean} [editMode=false] - Is it edit existing product mode? (Currently not fully used in this logic).
 * @returns {void}
 * @see mainLoader
 * @deprecated Use loadProductForm() instead for better flexibility.
 */
function productAddSetType(editMode = false) {
  if (mainCategorySelectToAdd == 6) {
    productTypeToAdd = 2; // Product type: Service
  } else {
    productTypeToAdd = 0; // Product type: Default
  }
  if (editMode == false) {
    if (productTypeToAdd == 2) {
      mainLoader(
        "./pages/productAdd2/productAdd2.html",
        "index-product-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    } else if (productTypeToAdd == 0) {
      mainLoader(
        "./pages/productAdd/productAdd.html",
        "index-product-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    }

  } else {
    if (productTypeToAdd == 2) {
      mainLoader(
        "./pages/productEdit2.html",
        "index-product-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    } else if (productTypeToAdd == 0) {
      mainLoader(
        "./pages/productEdit.html",
        "index-product-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    }
  }

}

/**
 * @description Load appropriate add/edit page based on selected categories.
 * @function loadProductForm
 * @param {object} [options={}] - Options object.
 * @param {boolean} [options.editMode=false] - Is edit mode?
 * @param {object} [options.productData=null] - Product data (for edit mode).
 * @returns {void}
 * @see ProductStateManager
 * @see isServiceCategory
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
    pagePath = isService ? "./pages/productEdit2.html" : "./pages/productEdit.html";
  } else {
    pagePath = isService ? "./pages/productAdd2/productAdd2.html" : "./pages/productAdd/productAdd.html";
  }

  console.log(`[ProductForm] تحميل صفحة ${editMode ? 'تعديل' : 'إضافة'} ${isService ? 'خدمة' : 'منتج'} للفئة ${categories.mainId}/${categories.subId}`);

  mainLoader(
    pagePath,
    "index-product-container",
    0,
    undefined,
    "showHomeIcon",
    true
  );
}




/**
 * @description Displays a modal to select the main and sub-category before adding a new product.
 * @async
 * @function showAddProductModal
 * @returns {Promise<void>}
 * @throws {Error} - If there's an error displaying the category modal or setting product layout.
 * @see CategoryModal.show
 * @see ProductStateManager
 * @see loadProductForm
 */
async function showAddProductModal() {
  try {

    const result = await CategoryModal.show();
    if (result.status === 'success') {
      console.log('[AddProduct] تم اختيار الفئات:', result.mainId, result.subId);

      // Store in new state manager
      ProductStateManager.setSelectedCategories(result.mainId, result.subId);

      // Also update old global variables for backward compatibility
      mainCategorySelectToAdd = result.mainId;
      subCategorySelectToAdd = result.subId;

      // Use new function
      loadProductForm({ editMode: false });
    }


  } catch (error) {
    console.error("[AddProduct] خطأ في عرض نافذة إضافة المنتج:", error);

  }
}
