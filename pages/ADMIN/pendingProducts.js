/**
 * @file pages/ADMIN/pendingProducts.js
 * @description Logic for fetching, displaying, and managing products in the Admin Panel.
 * Handles two main views:
 * 1. Pending Products (Cards): Allows Admin to Approve or Reject newly added products.
 * 2. Published Products (Table): Allows Admin to Unpublish or Delete existing products.
 */

// Pagination for published products
var publishedOffset = 0;
var pendingOffset = 0;
var pageSize = 10;

/**
 * Fetches all product data (both pending and published) and updates the UI.
 * This function is attached to the window object to be accessible from HTML event handlers.
 * @async
 * @function fetchAllData
 * @returns {Promise<void>}
 */
async function fetchAllData() {
    console.log("جاري جلب جميع البيانات الأساسية...");

    // Reset offsets
    publishedOffset = 0;
    pendingOffset = 0;

    // Refresh Pending if open
    const pendingContainer = document.getElementById('pending-list-container');
    if (pendingContainer && pendingContainer.style.display !== 'none') {
        await fetchPendingItems(false);
    }

    // Refresh Published if open
    const publishedContainer = document.getElementById('published-list-container');
    if (publishedContainer && publishedContainer.style.display !== 'none') {
        await fetchPublishedItems(false);
    }
}

// Attach to window to ensure global access for onclick handlers
window.fetchAllData = fetchAllData;
window.adminFetchAllData = fetchAllData;

/**
 * Fetches pending products (status = 0) from the API and renders them as cards.
 * Supports pagination through offset and limit.
 * @async
 * @function fetchPendingItems
 * @param {boolean} [append=false] - Whether to append new items to the existing list or replace it.
 * @returns {Promise<void>}
 */
async function fetchPendingItems(append = false) {
    const container = document.getElementById('pending-list-container');
    const cardsWrapper = document.getElementById('pending-cards-wrapper');
    const loadMoreContainer = document.getElementById('load-more-pending-container');

    if (!container || !cardsWrapper) return;

    // Reset offset if not appending
    if (!append) {
        pendingOffset = 0;
        cardsWrapper.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        console.log("[Admin] جاري تحميل قائمة المنتجات المعلقة الجديدة...");
    }

    try {
        const response = await fetch(`${baseURL}/api/products?status=0&limit=${pageSize}&offset=${pendingOffset}`);
        const products = await response.json();

        if (!products || products.length === 0) {
            if (!append) {
                cardsWrapper.innerHTML = '<div class="no-data-msg">لم يتم العثور على منتجات معلقة.</div>';
            }
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }

        let html = '';
        products.forEach(p => {
            const firstImage = p.ImageName ? p.ImageName.split(',')[0] : null;
            const imgUrl = firstImage ? `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${firstImage}` : 'images/placeholder.png';

            html += `
                <div class="pending-product-card" id="card-${p.product_key}">
                    <img src="${imgUrl}" class="pending-product-image" alt="${p.productName}">
                    <div class="pending-product-details">
                        <div class="pending-product-title">${p.productName}</div>
                        <div class="pending-product-info"><strong>البائع:</strong> ${p.seller_name || 'غير معروف'} (${p.seller_phone || '-'})</div>
                        <div class="pending-product-info"><strong>السعر:</strong> ${p.product_price} جنيه</div>
                        <div class="pending-product-info">${p.product_description.substring(0, 80)}...</div>
                    </div>
                    <div class="pending-product-actions">
                        <button class="btn-approve" onclick="window.adminUpdateStatus('${p.product_key}', '${p.productName}', 1)">
                            <i class="fas fa-check"></i> موافقة
                        </button>
                         <button class="btn-reject" onclick="window.adminDeleteProduct('${p.product_key}', '${p.productName}', '${p.ImageName || ''}')">
                            <i class="fas fa-times"></i> رفض
                        </button>
                         <button class="btn-view" onclick="window.adminPreviewProduct('${p.product_key}')">
                            <i class="fas fa-eye"></i> معاينة
                        </button>
                    </div>
                </div>
            `;
        });

        if (append) {
            cardsWrapper.insertAdjacentHTML('beforeend', html);
        } else {
            cardsWrapper.innerHTML = html;
        }

        // Update offset for next fetch
        pendingOffset += products.length;

        // Handle "Load More" button visibility
        if (loadMoreContainer) {
            if (products.length === pageSize) {
                loadMoreContainer.style.display = 'flex';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

    } catch (e) {
        console.error("خطأ في جلب المنتجات المعلقة:", e);
        if (!append) {
            cardsWrapper.innerHTML = '<div class="no-data-msg" style="color:red">خطأ في تحميل البيانات</div>';
        }
    }
}

/**
 * Fetches published products (status = 1) from the API and renders them as a table.
 * Supports pagination through offset and limit.
 * @async
 * @function fetchPublishedItems
 * @param {boolean} [append=false] - Whether to append new items to the existing list or replace it.
 * @returns {Promise<void>}
 */
async function fetchPublishedItems(append = false) {
    const container = document.getElementById('published-list-container');
    const tableWrapper = document.getElementById('published-table-wrapper');
    const loadMoreContainer = document.getElementById('load-more-published-container');

    if (!container || !tableWrapper) return;

    // Reset offset if not appending
    if (!append) {
        publishedOffset = 0;
        tableWrapper.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        console.log("[Admin] جاري تحميل قائمة المنتجات المنشورة الجديدة...");
    }

    try {
        const response = await fetch(`${baseURL}/api/products?status=1&limit=${pageSize}&offset=${publishedOffset}`);
        const products = await response.json();

        if (!products || products.length === 0) {
            if (!append) {
                tableWrapper.innerHTML = '<div class="no-data-msg">لم يتم العثور على منتجات منشورة.</div>';
            }
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }

        let tableHeader = `
            <table class="pending-products-table">
                <thead>
                    <tr>
                        <th>اسم المنتج</th>
                        <th>البائع</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="published-table-body">
        `;

        let rowsHtml = '';
        products.forEach(p => {
            rowsHtml += `
                <tr id="row-${p.product_key}">
                    <td>
                        <strong>${p.productName}</strong><br>
                        <span style="color:#777; font-size:0.85em">${p.product_price} EGP</span>
                    </td>
                    <td>
                        ${p.seller_name || 'Unknown'}<br>
                        <span style="color:#777; font-size:0.85em">${p.seller_phone || '-'}</span>
                    </td>
                    <td>
                         <button class="btn-unpublish" style="width:100%" onclick="window.adminUpdateStatus('${p.product_key}', '${p.productName}', 0)" title="إلغاء النشر">
                            <i class="fas fa-ban"></i> إلغاء النشر
                        </button>
                        <div style="height:5px"></div>
                         <button class="btn-reject" style="width:100%" onclick="window.adminDeleteProduct('${p.product_key}', '${p.productName}', '${p.ImageName || ''}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `;
        });

        if (append) {
            const tbody = document.getElementById('published-table-body');
            if (tbody) {
                tbody.insertAdjacentHTML('beforeend', rowsHtml);
            }
        } else {
            tableWrapper.innerHTML = tableHeader + rowsHtml + '</tbody></table>';
        }

        // Update offset for next fetch
        publishedOffset += products.length;

        // Handle "Load More" button visibility
        if (loadMoreContainer) {
            // If we got a full page, there might be more
            if (products.length === pageSize) {
                loadMoreContainer.style.display = 'flex';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

    } catch (e) {
        console.error("Error fetching published items:", e);
        if (!append) {
            tableWrapper.innerHTML = '<div class="no-data-msg" style="color:red">Error loading data</div>';
        }
    }
}

/**
 * Updates the approval status of a product.
 * Used for both Approving (0 -> 1) and Unpublishing (1 -> 0).
 * @async
 * @function updateStatus
 * @param {string} key - The product key.
 * @param {string} name - The product name.
 * @param {number} newStatus - The new status (1 for approved, 0 for pending).
 * @returns {Promise<void>}
 */
async function updateStatus(key, name, newStatus) {
    const actionName = newStatus === 1 ? 'موافقة ونشر' : 'إلغاء نشر';
    const color = newStatus === 1 ? '#28a745' : '#ffc107';

    const confirm = await Swal.fire({
        title: `تأكيد ${actionName}`,
        text: `هل أنت متأكد من ${actionName} المنتج "${name}"؟`,
        showCancelButton: true,
        buttonsStyling: false,
        customClass: {
            popup: 'swal-modern-mini-popup',
            title: 'swal-modern-mini-title',
            htmlContainer: 'swal-modern-mini-text',
            confirmButton: 'swal-modern-mini-confirm',
            cancelButton: 'swal-modern-mini-cancel'
        },
        confirmButtonText: 'نعم',
        cancelButtonText: 'لا'
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.showLoading();
        const res = await fetch(`${baseURL}/api/products`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_key: key, is_approved: newStatus })
        });

        if (!res.ok) throw new Error('فشل التحديث');

        // جلب بيانات المنتج كاملة لإرسال الإشعارات (للحصول على user_key)
        if (newStatus === 1 && typeof notifyOnItemAccepted === 'function') {
            try {
                const pRes = await fetch(`${baseURL}/api/products?product_key=${key}`);
                const pData = await pRes.json();
                if (pData) {
                    notifyOnItemAccepted({
                        productName: name,
                        user_key: pData.user_key,
                        isService: pData.serviceType === 2 || pData.serviceType === '2' || pData.isService
                    });
                }
            } catch (e) {
                console.error("[Admin] فشل جلب بيانات الإشعار:", e);
            }
        }

        Swal.fire({
            title: 'تم بنجاح',
            text: `تمت عملية ${actionName} بنجاح`,
            timer: 1500,
            showConfirmButton: false,
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text'
            }
        });

        // Refresh Both Lists
        fetchAllData();

    } catch (e) {
        Swal.fire({
            title: 'Error',
            text: e.message,
            confirmButtonText: 'OK',
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            }
        });
    }
}

// Attach to window
window.updateStatus = updateStatus;
window.adminUpdateStatus = updateStatus;

/**
 * Permanently deletes a product from the database.
 * Used for Rejecting pending products or Deleting published ones.
 * @async
 * @function deleteProduct
 * @param {string} key - The product key.
 * @param {string} name - The product name.
 * @param {string} imageNamesStr - Comma-separated image filenames.
 * @returns {Promise<void>}
 */
async function deleteProduct(key, name, imageNamesStr) {
    const confirm = await Swal.fire({
        title: 'حذف المنتج',
        text: `هل أنت متأكد من حذف "${name}" نهائياً؟ سيتم حذف جميع الصور المرتبطة أيضاً من السحابة.`,
        showCancelButton: true,
        buttonsStyling: false,
        customClass: {
            popup: 'swal-modern-mini-popup',
            title: 'swal-modern-mini-title',
            htmlContainer: 'swal-modern-mini-text',
            confirmButton: 'swal-modern-mini-confirm',
            cancelButton: 'swal-modern-mini-cancel'
        },
        confirmButtonText: 'نعم، احذف نهائياً',
        cancelButtonText: 'إلغاء',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                // 1. Delete images from Cloudflare R2
                if (imageNamesStr) {
                    const imageNames = imageNamesStr.split(',').map(s => s.trim()).filter(s => s);
                    if (imageNames.length > 0) {
                        console.log(`[Admin] Deleting ${imageNames.length} images from R2...`);
                        await Promise.all(imageNames.map(img =>
                            deleteFile2cf(img).catch(err => console.error(`[Delete] Failed to delete image ${img}:`, err))
                        ));
                    }
                }

                // 2. Delete from database
                const res = await fetch(`${baseURL}/api/products?product_key=${key}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete product from database');

                return true;
            } catch (e) {
                Swal.showValidationMessage(`خطأ: ${e.message}`);
                return false;
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    });

    if (confirm.isConfirmed) {
        Swal.fire({
            title: 'تم الحذف',
            text: 'تم حذف المنتج والصور بنجاح',
            timer: 1500,
            showConfirmButton: false,
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text'
            }
        });

        fetchAllData();
    }
}
// Attach to window
window.deleteProduct = deleteProduct;
window.adminDeleteProduct = deleteProduct;

/**
 * Opens a full product preview modal using the same layout as the main product view.
 * Fetches product details and sets the global session variable before calling productViewLayout.
 * @async
 * @function previewProduct
 * @param {string} key - The product key.
 * @returns {Promise<void>}
 */
async function previewProduct(key) {
    try {
        const response = await fetch(`${baseURL}/api/products?product_key=${key}&status=0`);
        const p = await response.json();

        if (!p) {
            console.error("المنتج غير موجود");
            return;
        }

        // Map keys exactly as search.html does for compatibility with productViewLayout
        const productDataForModal = mapProductData(p);

        // Use modern loadProductView which handles state and layout
        if (typeof loadProductView === 'function') {
            loadProductView(productDataForModal, { showAddToCart: false });
        } else {
            console.error("دالة loadProductView مفقودة!");
            Swal.fire({
                title: p.productName,
                text: p.product_description,
                imageUrl: productDataForModal.imageSrc[0]
            });
        }

    } catch (e) {
        console.error("خطأ أثناء معاينة المنتج:", e);
    }
}

// Attach to window
window.previewProduct = previewProduct;

window.adminPreviewProduct = previewProduct;

// Auto-initialize if any of the target containers are present in the DOM
if (document.getElementById('pending-list-container') || document.getElementById('published-list-container')) {
    console.log("[Admin] جاري تشغيل سكربت المنتجات المعلقة تلقائياً...");

    // Initial fetch (only resets offsets, won't load anything because sections are closed)
    fetchAllData();

    // Initialize toggle button for Pending products
    const togglePendingBtn = document.getElementById('toggle-pending-btn');
    const pendingContainer = document.getElementById('pending-list-container');

    if (togglePendingBtn && pendingContainer) {
        togglePendingBtn.addEventListener('click', async () => {
            const isHidden = pendingContainer.style.display === 'none';
            if (isHidden) {
                pendingContainer.style.display = 'block';
                togglePendingBtn.classList.add('active');
                const cardsWrapper = document.getElementById('pending-cards-wrapper');
                if (cardsWrapper && (cardsWrapper.querySelector('.loader-container') || cardsWrapper.innerHTML.trim() === '')) {
                    await fetchPendingItems(false);
                }
            } else {
                pendingContainer.style.display = 'none';
                togglePendingBtn.classList.remove('active');
            }
        });
    }

    // Initialize "Load More" button for Pending
    const loadMorePendingBtn = document.getElementById('btn-load-more-pending');
    if (loadMorePendingBtn) {
        loadMorePendingBtn.addEventListener('click', async () => {
            loadMorePendingBtn.disabled = true;
            const originalIcon = loadMorePendingBtn.querySelector('i');
            const originalText = loadMorePendingBtn.querySelector('span');

            if (originalIcon) originalIcon.className = 'fas fa-spinner fa-spin';
            if (originalText) originalText.innerText = 'جاري التحميل...';

            await fetchPendingItems(true);

            loadMorePendingBtn.disabled = false;
            if (originalIcon) originalIcon.className = 'fas fa-plus-circle';
            if (originalText) originalText.innerText = 'تحميل المزيد';
        });
    }

    // Initialize toggle button for published products
    const toggleBtn = document.getElementById('toggle-published-btn');
    const publishedContainer = document.getElementById('published-list-container');

    if (toggleBtn && publishedContainer) {
        toggleBtn.addEventListener('click', async () => {
            const isHidden = publishedContainer.style.display === 'none';

            if (isHidden) {
                publishedContainer.style.display = 'block';
                toggleBtn.classList.add('active');

                // Load data only if it hasn't been loaded yet or is empty
                const tableWrapper = document.getElementById('published-table-wrapper');
                if (tableWrapper && (tableWrapper.querySelector('.loader-container') || tableWrapper.innerHTML.trim() === '')) {
                    await fetchPublishedItems(false);
                }
            } else {
                publishedContainer.style.display = 'none';
                toggleBtn.classList.remove('active');
            }
        });
    }

    // Initialize "Load More" button
    const loadMoreBtn = document.getElementById('btn-load-more-published');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            loadMoreBtn.disabled = true;
            const originalIcon = loadMoreBtn.querySelector('i');
            const originalText = loadMoreBtn.querySelector('span');

            if (originalIcon) originalIcon.className = 'fas fa-spinner fa-spin';
            if (originalText) originalText.innerText = 'جاري التحميل...';

            await fetchPublishedItems(true);

            loadMoreBtn.disabled = false;
            if (originalIcon) originalIcon.className = 'fas fa-plus-circle';
            if (originalText) originalText.innerText = 'تحميل المزيد';
        });
    }
}
