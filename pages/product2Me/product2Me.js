
/**
 * @fileoverview User Products Management Page (product2Me)
 * @description Handles listing, searching, editing, and deleting user's products.
 */

// Product Data
var myProducts = []; // To be populated from actual source

// Main DOM Elements
const productsGrid = document.getElementById("products-grid");
const loadingState = document.getElementById("loading-state");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const mainCategoryFilter = document.getElementById("main-category-filter");
const subCategoryFilter = document.getElementById("sub-category-filter");

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
  productsGrid.innerHTML = "";
  loadingState.style.display = "block";
  emptyState.style.display = "none";

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
    loadingState.style.display = "none";

  } catch (error) {
    console.error("[Products] خطأ في جلب المنتجات:", error);
    // Hide loader, but show no error to user (as requested)
    loadingState.style.display = "none";
    // Optionally show empty state if fetch failed to avoid broken UI
    if (productsGrid.innerHTML === "") {
      showEmptyState();
    }
  }
}

/**
 * @function showEmptyState
 * @description Displays the empty state UI when no products are found.
 */
function showEmptyState() {
  loadingState.style.display = "none";
  emptyState.style.display = "block";
  productsGrid.innerHTML = "";
}

/**
 * @function renderProducts
 * @description Renders the list of products into the grid with optional sorting.
 * @param {Array} products - Array of product objects.
 */
function renderProducts(products) {
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
      const productDataForModal = {
        product_key: product.product_key,
        productName: product.productName,
        user_key: product.user_key,
        pricePerItem: product.product_price,
        original_price: product.original_price,
        imageSrc: product.ImageName
          ? product.ImageName.split(",").map(
            (name) => getPublicR2FileUrl(name.trim())
          )
          : [],
        availableQuantity: product.product_quantity,
        sellerMessage: product.user_message,
        description: product.product_description,
        serviceType: product.serviceType,
        MainCategory: product.MainCategory,
        SubCategory: product.SubCategory,
        realPrice: product.realPrice,
        heavyLoad: product.heavyLoad || product.heavy_load,
      };

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
  console.log("[Products] بدء تحميل فلاتر الفئات من 'list.json'.");
  try {
    // Changed path from "../shared/list.json" to "shared/list.json" for SPA compatibility
    const response = await fetch("shared/list.json");
    if (!response.ok) throw new Error("Failed to load category filters");
    const data = await response.json();
    const categories = data.categories;

    console.log("[Products] تم تحميل وتحليل 'list.json' بنجاح.", categories);

    // Clear existing options except the first one
    mainCategoryFilter.innerHTML = '<option value="">جميع الفئات</option>';

    // Populate Main Category Filter
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.title;
      // Store subcategories in dataset
      option.dataset.subcategories = JSON.stringify(category.subcategories || []);
      mainCategoryFilter.appendChild(option);
    });

    // Add event on Main Category change
    console.log("[Products] ربط حدث 'change' بفلتر الفئة الرئيسية.");
    mainCategoryFilter.addEventListener("change", () => {
      // Reset Sub Categories
      subCategoryFilter.innerHTML = '<option value="">جميع الفئات الفرعية</option>';
      const selectedOption = mainCategoryFilter.options[mainCategoryFilter.selectedIndex];

      if (selectedOption.value) {
        const subcategories = JSON.parse(selectedOption.dataset.subcategories);
        if (subcategories.length > 0) {
          subcategories.forEach((sub) => {
            const subOption = document.createElement("option");
            subOption.value = sub.id;
            subOption.textContent = sub.title;
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
      console.log("[Products] تم تحديث فلتر الفئة الفرعية بناءً على اختيار الفئة الرئيسية.");
    });
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
  const searchTerm = searchInput.value.trim();
  const mainCategory = mainCategoryFilter.value;
  const subCategory = subCategoryFilter.value;

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
const sortFilter = document.getElementById("sort-filter");
if (sortFilter) {
  sortFilter.addEventListener("change", () => {
    // Re-render current products with new sort
    if (myProducts && myProducts.length > 0) {
      renderProducts(myProducts);
    }
  });
}

// Search Event - only load products when search button is clicked
const searchBtn = document.getElementById("search-btn");
if (searchBtn) {
  searchBtn.addEventListener("click", function () {
    filterProducts();
  });
}

// Make functions globally available
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
