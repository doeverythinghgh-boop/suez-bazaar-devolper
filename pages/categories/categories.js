/**
 * @file pages/categories/categories.js
 * @description Manage category display (main and sub) and product gallery, with page state saving/restoring.
 * @author Hisham
 * @project BidStory
 * @version 1.0
 */

// **********************************************
// ** Core Functions **
// **********************************************

/**
 * @description Fetches categories from list.json and dynamically builds the categories table.
 * @async
 * @function categories_loadCategoriesAsTable
 * @returns {Promise<void>} Promise that resolves when categories are successfully loaded and displayed.
 * @throws {Error} If fetching or parsing the category file fails.
 */
async function categories_loadCategoriesAsTable() {
    try {
        const tbody = document.getElementById("categories_tbody");
        if (!tbody) return;

        // 1. Fetch data
        const categories = await categories_fetchCategories(
            "shared/list.json"
        );

        // 2. Build table
        tbody.innerHTML = ""; // Clear old content
        categories_buildCategoryTable(tbody, categories);
    } catch (error) {
        console.error(
            "%c[Categories] خطأ فادح في عرض الفئات:",
            "color: red; font-weight: bold;",
            error
        );
        const tbody = document.getElementById("categories_tbody");
        if (tbody) {
            // Show error message to user
            tbody.innerHTML = `<tr><td colspan="4">${window.langu('cat_empty_list_error')}</td></tr>`;
        }
    }
}

/**
 * @description Helper function to fetch and parse category file (SRP).
 * @async
 * @function categories_fetchCategories
 * @param {string} url - JSON file path.
 * @returns {Promise<Array<Object>>} Array of categories.
 * @throws {Error} If fetch fails or HTTP response status is not successful.
 */
async function categories_fetchCategories(url) {
    try {
        // Use global categories list if available, otherwise fetch
        const data = window.appCategoriesList || await fetchAppCategories();

        if (!data || !data.categories || !Array.isArray(data.categories)) {
            throw new Error("تنسيق ملف الفئات غير صحيح أو تعذر التحميل.");
        }

        return data.categories;
    } catch (error) {
        console.error("%c[Categories] خطأ في جلب الفئات:", "color: red;", error);
        throw error; // Rethrow error to be handled in categories_loadCategoriesAsTable
    }
}

/**
 * @description Builds category table rows and adds event listeners (SRP).
 * @function categories_buildCategoryTable
 * @param {HTMLElement} tbody - <tbody> element to insert rows into.
 * @param {Array<Object>} categories - Array of main categories.
 * @returns {void}
 */
function categories_buildCategoryTable(tbody, categories) {
    try {
        // Group categories in batches of 4 to display four columns
        for (let i = 0; i < categories.length; i += 4) {
            const chunk = categories.slice(i, i + 4);
            const mainRow = document.createElement("tr");
            mainRow.className = "categories_main_row";

            chunk.forEach((category) => {
                const cell = categories_createCategoryCell(
                    category,
                    mainRow,
                    categories
                );
                mainRow.appendChild(cell);
            });

            // Fill the row with empty cells if number of categories is less than 4
            while (mainRow.cells.length < 4) {
                mainRow.appendChild(document.createElement("td"));
            }

            tbody.appendChild(mainRow);
        }
    } catch (error) {
        console.error(
            "%c[categories_buildCategoryTable] خطأ في بناء جدول الفئات:",
            "color: red;",
            error
        );
    }
}

/**
 * @description Creates main category cell and adds click handler (SRP).
 * @function categories_createCategoryCell
 * @param {Object} category - Category object.
 * @param {HTMLTableRowElement} mainRow - Parent table row.
 * @param {Array<Object>} allCategories - All categories to pass to categories_toggleSubcategories.
 * @returns {HTMLTableCellElement} The created cell.
 */
function categories_createCategoryCell(category, mainRow, allCategories) {
    try {
        const cell = document.createElement("td");
        cell.className = "categories_main_cell";
        cell.dataset.categoryId = category.id;

        // Determine if it's the home page and if an image is available
        const isHomePage = document.getElementById("categories00") !== null;
        const categoryImage = category.image;

        let iconHtml;
        const titleObj = category.title;
        const displayTitle = typeof titleObj === 'object' ?
            (titleObj[window.app_language] || titleObj['ar']) : titleObj;

        if (isHomePage && categoryImage) {
            // Display image for main categories on home page
            const imagePath = `images/mainCategories/${categoryImage}`;
            iconHtml = `<img src="${imagePath}" class="categories_cell_content__image" alt="${displayTitle}">`;
        } else {
            // Fallback to FontAwesome icon
            const iconClass = category.icon || "fas fa-store";
            iconHtml = `<i class="categories_cell_content__icon ${iconClass}"></i>`;
        }

        cell.innerHTML = `
            <div class="categories_cell_content">
                ${iconHtml}
                <span class="categories_cell_content__text">${displayTitle}</span>
            </div>`;

        if (category.subcategories && category.subcategories.length > 0) {
            cell.classList.add("categories_main_cell--has-subcategories");
            // Pass all categories to enable categories_toggleSubcategories to access the clicked category
            cell.addEventListener("click", () => {
                // Pass the category itself instead of searching for it later, for efficiency
                categories_toggleSubcategories(mainRow, category, cell);
            });
        }
        return cell;
    } catch (error) {
        console.error(
            "%c[categories_createCategoryCell] خطأ في إنشاء خلية الفئة:",
            "color: red;",
            error
        );
        // Return empty cell in case of error to ensure table building continues
        const cell = document.createElement("td");
        cell.className = "categories_main_cell";
        cell.innerHTML = `<div><span class="error-message">خطأ في عرض الفئة</span></div>`;
        return cell;
    }
}

/**
 * @description Toggles display of subcategories row and product gallery.
 * @function categories_toggleSubcategories
 * @param {HTMLTableRowElement} mainRow - The clicked main category row.
 * @param {Object} mainCategory - The clicked main category object (contains subcategories).
 * @param {HTMLTableCellElement} clickedCell - The clicked main category cell.
 * @returns {void}
 */
function categories_toggleSubcategories(mainRow, mainCategory, clickedCell) {
    try {
        console.log(
            `%c[Subcategories] تم النقر على الفئة الرئيسية (ID: ${mainCategory.id})`,
            "color: purple;"
        );
        const tbody = mainRow.parentNode;
        // Find elements using new selectors
        const currentlyActiveCell = tbody.querySelector(
            "td.categories_main_cell--active"
        );
        const existingProductsRow = tbody.querySelector(
            ".categories_products_gallery_row"
        );
        const existingSubRow = tbody.querySelector(".categories_sub_row");
        const isClickingSameCell = currentlyActiveCell === clickedCell;

        // 1. Remove any currently open rows (sub or products)
        if (existingSubRow) existingSubRow.remove();
        if (existingProductsRow) existingProductsRow.remove();

        // 2. Update highlighting and toggle open/close
        if (!isClickingSameCell) {
            console.log("%c[DevLog] الحالة: فتح قسم جديد.", "color: green;");

            // Remove old highlighting and apply new
            if (currentlyActiveCell) {
                currentlyActiveCell.classList.remove("categories_main_cell--active");
            }
            clickedCell.classList.add("categories_main_cell--active");

            // Build and insert subcategory row
            const subRow = categories_createSubcategoryRow(
                mainRow,
                mainCategory.subcategories,
                mainCategory.id
            );
            mainRow.parentNode.insertBefore(subRow, mainRow.nextSibling);
        } else {
            console.log("%c[DevLog] الحالة: إغلاق القسم الحالي.", "color: red;");
            if (currentlyActiveCell)
                currentlyActiveCell.classList.remove("categories_main_cell--active");
        }
    } catch (error) {
        console.error(
            "%c[categories_toggleSubcategories] خطأ:",
            "color: red;",
            error
        );
        // No critical user interaction here, just log error
    }
}

/**
 * @description Creates subcategory row and adds click handlers (SRP).
 * @function categories_createSubcategoryRow
 * @param {HTMLTableRowElement} mainRow - The row following the subcategory row.
 * @param {Array<Object>} subcategories - Array of subcategories.
 * @param {string} mainCatId - Main category ID.
 * @returns {HTMLTableRowElement} The created subcategory row.
 */
function categories_createSubcategoryRow(mainRow, subcategories, mainCatId) {
    try {
        const subRow = document.createElement("tr");
        subRow.className = "categories_sub_row";
        subRow.style.animation =
            "categories_slide_fade_in 1.5s ease-out forwards";

        const subCell = document.createElement("td");
        subCell.colSpan = 4;

        const subcategoriesContainer = document.createElement("div");
        subcategoriesContainer.className = "categories_subcategories_container";

        subcategories.forEach((sub) => {
            const subItem = categories_createSubcategoryItem(
                sub,
                subRow,
                mainCatId
            );
            subcategoriesContainer.appendChild(subItem);
        });

        subCell.appendChild(subcategoriesContainer);
        subRow.appendChild(subCell);

        return subRow;
    } catch (error) {
        console.error(
            "%c[categories_createSubcategoryRow] خطأ في إنشاء صف الفئات الفرعية:",
            "color: red;",
            error
        );
        const subRow = document.createElement("tr");
        subRow.innerHTML = `<td><p class="error-message">فشل في إنشاء قسم الفئات الفرعية.</p></td>`;
        return subRow;
    }
}

/**
 * @description Creates subcategory item and adds click handler (SRP).
 * @function categories_createSubcategoryItem
 * @param {Object} sub - Subcategory object.
 * @param {HTMLTableRowElement} subRow - Subcategory row.
 * @param {string} mainCatId - Main category ID.
 * @returns {HTMLAnchorElement} The created subcategory element.
 */
function categories_createSubcategoryItem(sub, subRow, mainCatId) {
    try {
        const subItem = document.createElement("a");
        subItem.href = `#`;
        subItem.className = "categories_subcategory_item";
        subItem.dataset.subcategoryId = sub.id;

        const iconHtml = sub.icon
            ? `<i class="categories_subcategory_item__icon ${sub.icon}"></i>`
            : '<i class="categories_subcategory_item__icon fas fa-tag"></i>';
        const subTitleObj = sub.title;
        const subDisplayTitle = typeof subTitleObj === 'object' ?
            (subTitleObj[window.app_language] || subTitleObj['ar']) : subTitleObj;

        subItem.innerHTML = `${iconHtml} ${subDisplayTitle}`.trim();

        subItem.addEventListener("click", (e) => {
            try {
                e.preventDefault();

                // Remove old highlighting and apply new
                document
                    .querySelectorAll(".categories_subcategory_item--active")
                    .forEach((item) =>
                        item.classList.remove("categories_subcategory_item--active")
                    );

                console.log(
                    `[Subcategories] تم النقر على الفئة الفرعية (ID: ${sub.id})`
                );
                subItem.classList.add("categories_subcategory_item--active");

                // Show product gallery
                categories_showProductGallery(subRow, mainCatId, sub.id);
            } catch (error) {
                console.error(
                    "%c[categories_createSubcategoryItem.click] خطأ في معالج النقر:",
                    "color: red;",
                    error
                );
            }
        });

        return subItem;
    } catch (error) {
        console.error(
            "%c[categories_createSubcategoryItem] خطأ في إنشاء عنصر الفئة الفرعية:",
            "color: red;",
            error
        );
        const subItem = document.createElement("a");
        subItem.textContent = "خطأ";
        subItem.className = "categories_subcategory_item";
        return subItem;
    }
}

// **********************************************
// ** Product Gallery Functions **
// **********************************************

/**
 * @description Displays product gallery below subcategory row.
 * @async
 * @function categories_showProductGallery
 * @param {HTMLTableRowElement} subRow - Subcategory row.
 * @param {string} mainCatId - Main category ID.
 * @param {string} subCatId - Subcategory ID.
 * @returns {Promise<void>} Promise that resolves when gallery is displayed.
 */
async function categories_showProductGallery(subRow, mainCatId, subCatId) {
    try {
        console.log(
            `%c[Products] بدء عرض معرض المنتجات للفئة (${mainCatId} / ${subCatId})`,
            "color: #fd7e14;"
        );

        // Remove any previously open product gallery
        const existingGallery = document.querySelector(
            ".categories_products_gallery_row"
        );
        if (existingGallery) existingGallery.remove();

        // 1. Create empty row and add loading indicator
        const galleryRow = categories_createGalleryRow(subRow);
        const galleryCell = galleryRow.querySelector("td");
        galleryCell.innerHTML = `<div class="loader" style="margin: 20px auto;"></div>`;

        // 2. Fetch products (External function getProductsByCategory name remains unchanged)
        const products = await getProductsByCategory(mainCatId, subCatId);

        // 3. Check if row persists (category was not closed)
        const currentRow = subRow.nextElementSibling;
        const isGalleryStillNeeded =
            currentRow &&
            currentRow.classList.contains("categories_products_gallery_row");

        if (!isGalleryStillNeeded) {
            console.warn(
                "[Products] تم إغلاق القسم قبل اكتمال تحميل المنتجات. تتوقف العملية."
            );
            return;
        }

        // 4. Display results
        if (products && products.length > 0) {
            await categories_renderProductGallery(galleryCell, products);
        } else {
            console.log("[Products] لا توجد منتجات في هذه الفئة.");
            galleryCell.innerHTML = `<p class="no-products-message">${window.langu('cat_no_products_message')}</p>`;
        }
    } catch (error) {
        console.error(
            `%c[categories_showProductGallery] فشل في عرض معرض المنتجات للفئة (${mainCatId} / ${subCatId}):`,
            "color: red; font-weight: bold;",
            error
        );
        const galleryCell = subRow.nextElementSibling
            ? subRow.nextElementSibling.querySelector("td")
            : null;
        if (galleryCell) {
            galleryCell.innerHTML = `<p class="error-message">${window.langu('cat_fetch_products_error')}</p>`;
        }
    }
}

/**
 * @description Creates product gallery row and inserts to DOM (SRP).
 * @function categories_createGalleryRow
 * @param {HTMLTableRowElement} subRow - The row following the gallery row.
 * @returns {HTMLTableRowElement} The created gallery row.
 */
function categories_createGalleryRow(subRow) {
    try {
        const galleryRow = document.createElement("tr");
        galleryRow.className = "categories_products_gallery_row";
        const galleryCell = document.createElement("td");
        galleryCell.colSpan = 4;
        galleryRow.appendChild(galleryCell);
        subRow.parentNode.insertBefore(galleryRow, subRow.nextSibling);
        return galleryRow;
    } catch (error) {
        console.error(
            "%c[categories_createGalleryRow] خطأ في إنشاء صف المعرض:",
            "color: red;",
            error
        );
        const galleryRow = document.createElement("tr");
        galleryRow.innerHTML = `<td><p class="error-message">فشل في إنشاء صف المعرض.</p></td>`;
        return galleryRow;
    }
}

/**
 * @description Renders products in the gallery sequentially with lazy loading for images (SRP).
 * @async
 * @function categories_renderProductGallery
 * @param {HTMLTableCellElement} galleryCell - The cell to populate with gallery.
 * @param {Array<Object>} products - Array of products.
 * @returns {Promise<void>}
 */
async function categories_renderProductGallery(galleryCell, products) {
    try {
        console.log(
            `[Products] تم العثور على ${products.length} منتج. جاري بناء المعرض...`
        );

        // 1. Create Control Header
        const controlsHeader = document.createElement("div");
        controlsHeader.className = "categories_gallery_controls";

        // Toggle Button
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "categories_view_toggle";
        toggleBtn.type = "button";
        toggleBtn.title = window.langu('cat_view_toggle_title');
        toggleBtn.innerHTML = '<i class="fas fa-th"></i>'; // Default to Grid icon

        controlsHeader.appendChild(toggleBtn);

        // 2. Create Gallery Container
        const galleryContainer = document.createElement("div");
        galleryContainer.className = "categories_products_gallery_container";

        // 3. Assemble
        galleryCell.innerHTML = "";
        galleryCell.appendChild(controlsHeader);
        galleryCell.appendChild(galleryContainer);

        // 4. Toggle Logic
        toggleBtn.addEventListener('click', () => {
            galleryContainer.classList.toggle('grid-view');
            const isGrid = galleryContainer.classList.contains('grid-view');

            // Switch Icon
            toggleBtn.innerHTML = isGrid ? '<i class="fas fa-list"></i>' : '<i class="fas fa-th"></i>';


        });

        for (const product of products) {
            // Wait until each item is loaded and displayed before moving to the next to ensure sequence
            await categories_loadProductItem(product, galleryContainer);
        }
    } catch (error) {
        console.error(
            "%c[categories_renderProductGallery] خطأ في عرض المنتجات:",
            "color: red;",
            error
        );
    }
}

/**
 * @description Creates a single product item and adds click handler (SRP).
 * @async
 * @function categories_loadProductItem
 * @param {Object} product - Product object.
 * @param {HTMLElement} galleryContainer - Container to add product to.
 * @returns {Promise<void>} Promise that resolves after product is displayed.
 */
function categories_loadProductItem(product, galleryContainer) {
    return new Promise((resolve) => {
        try {
            // Check if image exists
            const firstImage = product.ImageName
                ? product.ImageName.split(",")[0]
                : null;

            if (!firstImage) {
                // Case: No image
                const productItem = categories_createProductElement(product, null);
                galleryContainer.appendChild(productItem);
                categories_animateProductIn(productItem, resolve);
                return;
            }

            // Case: Image exists
            const imageUrl = getPublicR2FileUrl(firstImage);
            const img = document.createElement("img");
            img.className = "categories_product_item__image";
            img.alt = product.product_description;
            img.title = product.product_description;

            const productItem = categories_createProductElement(product, img);

            // Image load handler
            img.onload = () => {
                galleryContainer.appendChild(productItem);
                categories_animateProductIn(productItem, resolve);
                // Add click handler after adding element to DOM
                productItem.addEventListener("click", () =>
                    categories_handleProductClick(product, firstImage)
                );
            };

            // Image load error handler
            img.onerror = () => {
                console.warn(`[Products] فشل تحميل الصورة: ${imageUrl}`);
                productItem.classList.add("no-image");
                if (productItem.querySelector("img"))
                    productItem.querySelector("img").remove(); // Remove failed image element
                galleryContainer.appendChild(productItem);
                categories_animateProductIn(productItem, resolve);
                productItem.addEventListener("click", () =>
                    categories_handleProductClick(product, firstImage)
                );
            };

            img.src = imageUrl;
        } catch (error) {
            console.error(
                "%c[categories_loadProductItem] خطأ في عرض المنتج:",
                "color: red;",
                error
            );
            resolve(); // Must complete even in case of error to not stop the loop
        }
    });
}

/**
 * @description Creates basic product element (SRP).
 * @function categories_createProductElement
 * @param {Object} product - Product object.
 * @param {HTMLImageElement|null} imgElement - Image element if exists.
 * @returns {HTMLDivElement} The created product element.
 */
function categories_createProductElement(product, imgElement) {
    try {
        const productItem = document.createElement("div");
        productItem.className = "categories_product_item";
        productItem.style.opacity = "0";
        productItem.style.transform = "translateY(20px)";
        productItem.style.transition = "opacity 0.5s ease, transform 0.5s ease";

        const productName = document.createElement("p");
        productName.className = "categories_product_item__name";
        // Product ID is not changed because it might be used elsewhere outside the category context
        productName.id = `product-name-${product.product_key}`;
        productName.textContent = product.productName || "منتج غير مسمى";

        if (imgElement) {
            productItem.appendChild(imgElement);
        } else {
            productItem.classList.add("no-image");
        }

        productItem.appendChild(productName);
        return productItem;
    } catch (error) {
        console.error(
            "%c[categories_createProductElement] خطأ في إنشاء عنصر المنتج:",
            "color: red;",
            error
        );
        const productItem = document.createElement("div");
        productItem.className = "categories_product_item";
        productItem.textContent = "فشل التحميل";
        return productItem;
    }
}

/**
 * @description Applies introductory animation to product item (SRP).
 * @function categories_animateProductIn
 * @param {HTMLElement} productItem - Product item element.
 * @param {Function} resolve - Promise resolve function.
 * @returns {void}
 */
function categories_animateProductIn(productItem, resolve) {
    try {
        setTimeout(() => {
            productItem.style.opacity = "1";
            productItem.style.transform = "translateY(0)";
            resolve();
        }, 50);
    } catch (error) {
        console.error(
            "%c[categories_animateProductIn] خطأ في تطبيق الحركة:",
            "color: red;",
            error
        );
        resolve(); // Must continue even in case of error
    }
}

/**
 * @description Product click handler (SRP).
 * @function categories_handleProductClick
 * @param {Object} product - Product data object.
 * @param {string} firstImageName - Name of first image.
 * @returns {void}
 * @see mainLoader
 */
function categories_handleProductClick(product, firstImageName) {
    try {
        console.log(
            `%c[Products] تم النقر على المنتج: ${product.productName}`,
            "color: darkcyan"
        );

        // 🔍 RAW Debug Log
        console.log("%c[Debug RAW Product] البيانات الخام من الـ API:", "color: #8e44ad;", product);

        const productDataForModal = mapProductData(product);

        // Use new loadProductView function
        loadProductView(productDataForModal, true);
    } catch (error) {
        console.error(
            "%c[categories_handleProductClick] خطأ في معالجة النقر على المنتج:",
            "color: red;",
            error
        );
    }
}

/**
 * @description Fetches product list based on main and sub category from API.
 * @async
 * @function getProductsByCategory
 * @param {string} mainCatId - Main category ID.
 * @param {string} subCatId - Subcategory ID.
 * @returns {Promise<Array<Object>|null>} - Promise containing array of product objects, or `null` on failure.
 * @throws {Error} - If `baseURL` is undefined, or API fetch fails.
 * @remarks Function name left as is because it's a helper function (assumed) called from outside, not internal to the page.
 */
async function getProductsByCategory(mainCatId, subCatId) {
    try {
        if (typeof baseURL === "undefined" || !baseURL) {
            throw new Error("baseURL is not defined");
        }

        if (typeof apiFetch === "undefined") {
            throw new Error("apiFetch is not defined");
        }

        const params = new URLSearchParams();
        if (mainCatId) {
            params.append("MainCategory", mainCatId);
        }
        if (subCatId) {
            params.append("SubCategory", subCatId);
        }

        const data = await apiFetch(`/api/products?${params.toString()}`);
        if (data && data.error) throw new Error(data.error);

        // Check if result is an array of products
        return Array.isArray(data)
            ? data
            : data && Array.isArray(data.products)
                ? data.products
                : [];
    } catch (error) {
        console.error(
            "%c[getProductsByCategory] فشل جلب المنتجات:",
            "color: red;",
            error
        );
        // On failure, return empty array instead of null to facilitate product processing in calling function
        return [];
    }
}

// **********************************************
// ** Page Event Listeners **
// **********************************************
// (User did not request adding code here, left for external implementation)
