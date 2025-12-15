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
 * @description Directs the user to the add new product page, setting the product type based on the selected category.
 * @function productAddSetType
 * @param {boolean} [editMode=false] - Is it edit existing product mode? (Currently not fully used in this logic).
 * @returns {void}
 * @see mainLoader
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
        "./pages/productAdd2.html",
        "index-product-container",
        0,
        undefined,
        "showHomeIcon",
        true
      );
    } else if (productTypeToAdd == 0) {
      mainLoader(
        "./pages/productAdd.html",
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
 * @description Directs the user to the edit product page, setting the product type based on the selected category.
 * @function productEditLayout
 * @returns {void}
 * @see mainLoader
 */
function productEditLayout() {
  if (mainCategorySelectToAdd == 6) {
    productTypeToAdd = 2; // Product type: Service
  } else {
    // Product type: Default
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

/**
 * @description Displays a modal to select the main and sub-category before adding a new product.
 * @async
 * @function showAddProductModal
 * @returns {Promise<void>}
 * @throws {Error} - If there's an error displaying the category modal or setting product layout.
 * @see CategoryModal.show
 * @see productAddSetType
 */
async function showAddProductModal() {
  try {

    const result = await CategoryModal.show();
    if (result.status === 'success') {
      console.log('تم الاختيار:', result.mainId, result.subId);
      mainCategorySelectToAdd = result.mainId; // Main category selected when adding product
      subCategorySelectToAdd = result.subId; // Sub category selected when adding product
      productAddSetType(true);
    }


  } catch (error) {
    console.error("خطأ في عرض نافذة إضافة المنتج:", error);

  }
}
