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
        const gridContainer = document.getElementById("categories_grid");
        if (!gridContainer) return;

        // 1. Fetch data
        const categories = await categories_fetchCategories(
            "shared/list.json"
        );

        // 2. Build grid
        gridContainer.innerHTML = ""; // Clear old content
        categories_buildCategoryGrid(gridContainer, categories);
    } catch (error) {
        console.error(
            "%c[Categories] خطأ فادح في عرض الفئات:",
            "color: red; font-weight: bold;",
            error
        );
        const gridContainer = document.getElementById("categories_grid");
        if (gridContainer) {
            gridContainer.innerHTML = `<div class="error-message">${window.langu('cat_empty_list_error')}</div>`;
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
 * @description Builds category grid and adds event listeners (SRP).
 * @function categories_buildCategoryGrid
 * @param {HTMLElement} gridContainer - container element to insert items into.
 * @param {Array<Object>} categories - Array of main categories.
 * @returns {void}
 */
function categories_buildCategoryGrid(gridContainer, categories) {
    try {
        categories.forEach((category) => {
            const item = categories_createCategoryItemGrid(
                category,
                gridContainer,
                categories
            );
            gridContainer.appendChild(item);
        });
    } catch (error) {
        console.error(
            "%c[categories_buildCategoryGrid] خطأ في بناء شبكة الفئات:",
            "color: red;",
            error
        );
    }
}

/**
 * @description Creates main category grid item and adds click handler (SRP).
 * @function categories_createCategoryItemGrid
 * @param {Object} category - Category object.
 * @param {HTMLElement} gridContainer - Parent grid container.
 * @param {Array<Object>} allCategories - All categories.
 * @returns {HTMLElement} The created grid item.
 */
function categories_createCategoryItemGrid(category, gridContainer, allCategories) {
    try {
        const item = document.createElement("div");
        item.className = "categories_grid_item";
        item.dataset.categoryId = category.id;

        // Determine if image is available
        const isHomePage = document.getElementById("categories00") !== null;
        const categoryImage = category.image;

        let iconHtml;
        const titleObj = category.title;
        const displayTitle = typeof titleObj === 'object' ?
            (titleObj[window.app_language] || titleObj['ar']) : titleObj;

        if (isHomePage && categoryImage) {
            const imagePath = `images/mainCategories/${categoryImage}`;
            iconHtml = `<div class="categories_cell_media"><img src="${imagePath}" class="categories_cell_content__image" alt="${displayTitle}"></div>`;
        } else {
            const iconClass = category.icon || "fas fa-store";
            iconHtml = `<div class="categories_cell_media"><i class="categories_cell_content__icon ${iconClass}"></i></div>`;
        }

        item.innerHTML = `
            <div class="categories_cell_content">
                ${iconHtml}
                <span class="categories_cell_content__text">${displayTitle}</span>
            </div>
        `;

        if (category.subcategories && category.subcategories.length > 0) {
            item.classList.add("categories_grid_item--has-subcategories");
            item.addEventListener("click", () => {
                categories_toggleSubcategoriesGrid(gridContainer, category, item);
            });
        }
        return item;
    } catch (error) {
        console.error(
            "%c[categories_createCategoryItemGrid] خطأ في إنشاء عنصر الفئة:",
            "color: red;",
            error
        );
        const item = document.createElement("div");
        item.className = "categories_grid_item";
        item.innerHTML = `<span class="error-message">Error</span>`;
        return item;
    }
}

/**
 * @description Toggles display of subcategories grid and product gallery.
 * @function categories_toggleSubcategoriesGrid
 * @param {HTMLElement} gridContainer - The grid container.
 * @param {Object} mainCategory - The clicked main category object.
 * @param {HTMLElement} clickedItem - The clicked grid item.
 * @returns {void}
 */
function categories_toggleSubcategoriesGrid(gridContainer, mainCategory, clickedItem) {
    try {
        console.log(`%c[Grid] Toggling category (ID: ${mainCategory.id})`, "color: purple;");

        const currentlyActiveItem = gridContainer.querySelector(".categories_grid_item--active");
        const existingDetails = gridContainer.querySelector(".categories_details_container");
        const isClickingSameItem = currentlyActiveItem === clickedItem;

        // Cleanup existing
        if (existingDetails) {
            // Note: We need a way to find subRow equivalent for cleanup logic
            // In grid, details container handles it.
            existingDetails.remove();
        }
        if (currentlyActiveItem) {
            currentlyActiveItem.classList.remove("categories_grid_item--active");
        }

        if (!isClickingSameItem) {
            clickedItem.classList.add("categories_grid_item--active");

            // Build details container (subcategories + products)
            const detailsContainer = categories_createDetailsContainer(
                mainCategory.subcategories,
                mainCategory.id
            );

            // Correct Positioning in Grid:
            // To prevent shifting other items in the same row, we must insert 
            // the full-width details container AFTER the last item of the CURRENT row.
            const items = Array.from(gridContainer.querySelectorAll(".categories_grid_item"));
            const clickedIndex = items.indexOf(clickedItem);

            // Dynamically detect column count from computed CSS to ensure 100% accuracy with media queries
            const gridStyle = window.getComputedStyle(gridContainer);
            const gridTemplateColumns = gridStyle.getPropertyValue('grid-template-columns');
            // split(' ') will give an array of calculated widths, e.g. ["200px", "200px", "200px"]
            // filter(Boolean) handles cases where browser might return extra spaces
            const columns = gridTemplateColumns.split(' ').filter(v => v.trim() !== '').length || 1;

            console.log(`[Grid] Detected columns: ${columns} | Clicked index: ${clickedIndex}`);

            const rowIndex = Math.floor(clickedIndex / columns);
            const lastItemIndexInRow = Math.min(items.length - 1, (rowIndex * columns) + (columns - 1));

            const insertionTarget = items[lastItemIndexInRow];

            // Safety check: ensure we found a target
            if (insertionTarget) {
                insertionTarget.after(detailsContainer);
            } else {
                gridContainer.appendChild(detailsContainer);
            }
        }
    } catch (error) {
        console.error("%c[categories_toggleSubcategoriesGrid] Error:", "color: red;", error);
    }
}

/**
 * @description Creates details container for subcategories and products.
 * @function categories_createDetailsContainer
 * @param {Array<Object>} subcategories - Array of subcategories.
 * @param {string} mainCatId - Main category ID.
 * @returns {HTMLElement} The created container.
 */
function categories_createDetailsContainer(subcategories, mainCatId) {
    try {
        const container = document.createElement("div");
        container.className = "categories_details_container";
        container.style.animation = "categories_slide_fade_in 0.8s ease-out forwards";

        const subcategoriesContainer = document.createElement("div");
        const subCount = subcategories.length;

        if (subCount <= 5) {
            subcategoriesContainer.className = "categories_subcategories_container categories_sub_one_row";
        } else {
            subcategoriesContainer.className = "categories_subcategories_container categories_sub_two_row";
        }

        subcategories.forEach((sub, index) => {
            const subItem = categories_createSubcategoryItemDiv(
                sub,
                container,
                mainCatId,
                index // Pass index for animation stagger
            );
            subcategoriesContainer.appendChild(subItem);
        });

        container.appendChild(subcategoriesContainer);
        return container;
    } catch (error) {
        console.error("%c[categories_createDetailsContainer] Error:", "color: red;", error);
        const container = document.createElement("div");
        container.className = "categories_details_container";
        container.innerHTML = `<p class="error-message">Error loading subcategories.</p>`;
        return container;
    }
}

/**
 * @description Creates subcategory element for grid structure.
 * @function categories_createSubcategoryItemDiv
 * @param {Object} sub - Subcategory object.
 * @param {HTMLElement} detailsContainer - Parent container.
 * @param {string} mainCatId - Main category ID.
 * @param {number} index - Index of the item for animation delay.
 * @returns {HTMLAnchorElement} The created element.
 */
function categories_createSubcategoryItemDiv(sub, detailsContainer, mainCatId, index = 0) {
    try {
        const subItem = document.createElement("a");
        subItem.href = `#`;
        subItem.className = "categories_subcategory_item";
        subItem.dataset.subcategoryId = sub.id;

        // Apply staggered animation delay
        // Delay = index * 50ms (allows for quick sequential pop-in)
        subItem.style.animationDelay = `${index * 0.05}s`;

        // Check if subcategory has an image, if so use it instead of icon
        let mediaHtml;
        if (sub.image) {
            const imagePath = `images/subCategories/${sub.image}`;
            mediaHtml = `<img src="${imagePath}" class="categories_subcategory_item__image" alt="${sub.title[window.app_language] || sub.title['ar']}" />`;
        } else {
            const iconClass = sub.icon || 'fas fa-tag';
            mediaHtml = `<i class="categories_subcategory_item__icon ${iconClass}"></i>`;
        }

        const subTitleObj = sub.title;
        const subDisplayTitle = typeof subTitleObj === 'object' ?
            (subTitleObj[window.app_language] || subTitleObj['ar']) : subTitleObj;

        subItem.innerHTML = `${mediaHtml} <span class="categories_subcategory_title">${subDisplayTitle}</span>`.trim();

        subItem.addEventListener("click", (e) => {
            try {
                e.preventDefault();
                detailsContainer.querySelectorAll(".categories_subcategory_item--active")
                    .forEach((item) => item.classList.remove("categories_subcategory_item--active"));

                subItem.classList.add("categories_subcategory_item--active");
                categories_showProductGalleryGrid(detailsContainer, mainCatId, sub.id);
            } catch (error) {
                console.error("%c[categories_createSubcategoryItemDiv.click] Error:", "color: red;", error);
            }
        });

        return subItem;
    } catch (error) {
        console.error("%c[categories_createSubcategoryItemDiv] Error:", "color: red;", error);
        return document.createElement("a");
    }
}

// **********************************************
// ** Product Gallery Functions **
// **********************************************

/**
 * @description Displays product gallery below subcategory row.
 * @async
 * @function categories_showProductGallery
 * @description Displays product gallery inside internal wrapper.
 * @async
 * @function categories_showProductGalleryGrid
 * @param {HTMLElement} detailsContainer - The details container (subRow equivalent).
 * @param {string} mainCatId - Main category ID.
 * @param {string} subCatId - Subcategory ID.
 * @returns {Promise<void>}
 */
async function categories_showProductGalleryGrid(detailsContainer, mainCatId, subCatId) {
    try {
        let galleryWrapper = detailsContainer.querySelector(".categories_gallery_internal_wrapper");
        if (!galleryWrapper) {
            galleryWrapper = document.createElement("div");
            galleryWrapper.className = "categories_gallery_internal_wrapper";
            detailsContainer.appendChild(galleryWrapper);
        }

        galleryWrapper.innerHTML = `<div class="loader" style="margin: 20px auto;"></div>`;

        const products = await getProductsByCategory(mainCatId, subCatId);

        // Fetch subcategory for title (if needed in future, currently arrow is enough)
        const allCategories = await categories_fetchCategories();
        const mainCategory = allCategories.find(c => String(c.id) === String(mainCatId));
        const subcategory = mainCategory ? mainCategory.subcategories.find(s => String(s.id) === String(subCatId)) : null;

        if (products && products.length > 0) {
            await categories_renderProductGallery(galleryWrapper, products, subcategory);
        } else {
            galleryWrapper.innerHTML = `<p class="no-products-message" style="text-align:center; padding: 30px; color: var(--text-color-light); font-size: 0.9rem;">${window.langu('cat_no_products_message')}</p>`;
        }
    } catch (error) {
        console.error("%c[categories_showProductGalleryGrid] Error:", "color: red;", error);
    }
}

/**
 * @description Removes internal gallery from specified subcategory row.
 * @function categories_removeInternalGallery
 * @param {HTMLTableRowElement} subRow - The subcategory row with gallery.
 */
/**
 * @description Placeholder for cleanup (already handled by removal of detailsContainer in Grid).
 * @function categories_removeInternalGallery
 */
function categories_removeInternalGallery() { }

/**
 * @description Renders products in the gallery sequentially with lazy loading for images (SRP).
 * @async
 * @function categories_renderProductGallery
 * @param {HTMLElement} galleryWrapper - The container to populate with gallery.
 * @param {Array<Object>} products - Array of products.
 * @param {Object} subcategory - Subcategory object for context.
 * @returns {Promise<void>}
 */
async function categories_renderProductGallery(galleryWrapper, products, subcategory) {
    try {
        console.log(
            `[Products] تم العثور على ${products.length} منتج للفئة "${subcategory ? subcategory.title[window.app_language] || subcategory.title['ar'] : ''}". جاري بناء المعرض...`
        );

        // 1. Create Control Header
        const controlsHeader = document.createElement("div");
        controlsHeader.className = "categories_gallery_controls";

        // Toggle Button
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "categories_view_toggle";
        toggleBtn.type = "button";
        toggleBtn.title = window.langu('cat_view_toggle_title');
        // Now it starts as Grid, so icon should be "List" to toggle back
        toggleBtn.innerHTML = '<i class="fas fa-list"></i>';

        controlsHeader.appendChild(toggleBtn);

        // 2. Create Gallery Container
        const galleryContainer = document.createElement("div");
        // Default to grid-view as requested
        galleryContainer.className = "categories_products_gallery_container grid-view";

        // 3. Assemble
        galleryWrapper.innerHTML = "";
        galleryWrapper.appendChild(controlsHeader);
        galleryWrapper.appendChild(galleryContainer);

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
        // Inline styles removed to rely on CSS pop-in animation

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

        // Price Container
        const priceContainer = document.createElement("div");
        priceContainer.className = "categories_product_item__prices";
        const currency = window.app_language === 'ar' ? 'ج.م' : 'EGP';

        // Current Price
        if (product.product_price) {
            const priceSpan = document.createElement("span");
            priceSpan.className = "categories_product_item__price";
            priceSpan.textContent = `${product.product_price} ${currency}`;
            priceContainer.appendChild(priceSpan);
        }

        // Original Price
        if (product.original_price && Number(product.original_price) > Number(product.product_price)) {
            const originalPriceSpan = document.createElement("span");
            originalPriceSpan.className = "categories_product_item__original-price";
            originalPriceSpan.textContent = `${product.original_price} ${currency}`;
            priceContainer.appendChild(originalPriceSpan);
        }

        productItem.appendChild(priceContainer);
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
        // Delay to allow frame to transition smoothly before next item
        setTimeout(() => {
            resolve();
        }, 80);
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
