/**
 * @file pages/ADMIN/pendingProducts.js
 * @description Logic for fetching, displaying, and managing products in the Admin Panel.
 * Handles two main views:
 * 1. Pending Products (Cards): Allows Admin to Approve or Reject newly added products.
 * 2. Published Products (Table): Allows Admin to Unpublish or Delete existing products.
 * 
 * Note: This file contains the logic that is also inlined in pendingProducts.html for dynamic loading compatibility.
 */

/**
 * Fetches all product data (both pending and published) and updates the UI.
 * This function is attached to the window object to be accessible from HTML event handlers.
 * @async
 * @function fetchAllData
 * @returns {Promise<void>}
 */
async function fetchAllData() {
    console.log("Fetching all data...");
    fetchPendingItems();
    fetchPublishedItems();
}

// Attach to window to ensure global access for onclick handlers
window.fetchAllData = fetchAllData;

/**
 * Fetches pending products (status = 0) from the API and renders them as cards.
 * @async
 * @function fetchPendingItems
 * @returns {Promise<void>}
 */
async function fetchPendingItems() {
    const container = document.getElementById('pending-list-container');
    container.innerHTML = '<div class="loader"></div>';

    try {
        const response = await fetch(`${baseURL}/api/products?status=0`);
        const products = await response.json();

        if (!products || products.length === 0) {
            container.innerHTML = '<div class="no-data-msg">لا توجد منتجات معلقة حالياً.</div>';
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
                        <div class="pending-product-info"><strong>البائع:</strong> ${p.seller_username || 'غير معروف'} (${p.seller_phone || '-'})</div>
                        <div class="pending-product-info"><strong>السعر:</strong> ${p.product_price} ج.م</div>
                        <div class="pending-product-info">${p.product_description.substring(0, 80)}...</div>
                    </div>
                    <div class="pending-product-actions">
                        <button class="btn-approve" onclick="window.updateStatus('${p.product_key}', '${p.productName}', 1)">
                            <i class="fas fa-check"></i> موافقة
                        </button>
                         <button class="btn-reject" onclick="window.deleteProduct('${p.product_key}', '${p.productName}')">
                            <i class="fas fa-times"></i> رفض
                        </button>
                         <button class="btn-view" onclick="window.previewProduct('${p.product_key}')">
                            <i class="fas fa-eye"></i> معاينة
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="no-data-msg" style="color:red">خطأ في التحميل</div>';
    }
}

/**
 * Fetches published products (status = 1) from the API and renders them as a table.
 * @async
 * @function fetchPublishedItems
 * @returns {Promise<void>}
 */
async function fetchPublishedItems() {
    const container = document.getElementById('published-list-container');
    container.innerHTML = '<div class="loader"></div>';

    try {
        const response = await fetch(`${baseURL}/api/products?status=1`);
        const products = await response.json();

        if (!products || products.length === 0) {
            container.innerHTML = '<div class="no-data-msg">لا توجد منتجات منشورة.</div>';
            return;
        }

        let html = `
            <table class="pending-products-table">
                <thead>
                    <tr>
                        <th>اسم المنتج</th>
                        <th>اسم البائع</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
        `;

        products.forEach(p => {
            html += `
                <tr id="row-${p.product_key}">
                    <td>
                        <strong>${p.productName}</strong><br>
                        <span style="color:#777; font-size:0.85em">${p.product_price} ج.م</span>
                    </td>
                    <td>
                        ${p.seller_username || 'غير معروف'}<br>
                        <span style="color:#777; font-size:0.85em">${p.seller_phone || '-'}</span>
                    </td>
                    <td>
                         <button class="btn-unpublish" onclick="window.updateStatus('${p.product_key}', '${p.productName}', 0)" title="إلغاء النشر">
                            <i class="fas fa-ban"></i> إلغاء النشر
                        </button>
                        <div style="height:5px"></div>
                         <button class="btn-reject" style="width:100%" onclick="window.deleteProduct('${p.product_key}', '${p.productName}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="no-data-msg" style="color:red">خطأ في التحميل</div>';
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
        text: `هل أنت متأكد من ${actionName} للمنتج "${name}"؟`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم',
        cancelButtonText: 'لا',
        confirmButtonColor: color
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

        Swal.fire({
            icon: 'success',
            title: 'تم بنجاح',
            text: `تم ${actionName} بنجاح`,
            timer: 1500,
            showConfirmButton: false
        });

        // Refresh Both Lists
        fetchAllData();

    } catch (e) {
        Swal.fire('خطأ', e.message, 'error');
    }
}

// Attach to window
window.updateStatus = updateStatus;

/**
 * Permanently deletes a product from the database.
 * Used for Rejecting pending products or Deleting published ones.
 * @async
 * @function deleteProduct
 * @param {string} key - The product key.
 * @param {string} name - The product name.
 * @returns {Promise<void>}
 */
async function deleteProduct(key, name) {
    const confirm = await Swal.fire({
        title: 'حذف المنتج',
        text: `هل أنت متأكد من حذف "${name}" نهائياً؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، حذف',
        confirmButtonColor: '#dc3545',
        cancelButtonText: 'إلغاء'
    });

    if (!confirm.isConfirmed) return;

    try {
        Swal.showLoading();
        const res = await fetch(`${baseURL}/api/products?product_key=${key}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('فشل الحذف');

        Swal.fire({
            icon: 'success',
            title: 'تم الحذف',
            text: 'تم حذف المنتج بنجاح',
            timer: 1500,
            showConfirmButton: false
        });

        fetchAllData();

    } catch (e) {
        Swal.fire('خطأ', e.message, 'error');
    }
}
// Attach to window
window.deleteProduct = deleteProduct;

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
        // Fetch product with status=0 or generic to get details
        const response = await fetch(`${baseURL}/api/products?product_key=${key}&status=0`);
        const p = await response.json();

        if (!p) {
            console.error("Product not found");
            return;
        }

        // Map keys exactly as search.html does for compatibility with productViewLayout
        const productDataForModal = {
            product_key: p.product_key,
            productName: p.productName,
            user_key: p.user_key,
            pricePerItem: p.product_price,
            original_price: p.original_price,
            imageSrc: p.ImageName
                ? p.ImageName.split(",").map(
                    (name) =>
                        `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${name}`
                )
                : [],
            availableQuantity: p.product_quantity,
            sellerMessage: p.user_message,
            description: p.product_description,
            sellerName: p.seller_username,
            sellerPhone: p.seller_phone,
            MainCategory: p.MainCategory,
            SubCategory: p.SubCategory,
            realPrice: p.real_price || p.realPrice,
            type: p.serviceType,
            type: p.serviceType,
        };

        // Use modern loadProductView which handles state and layout
        if (typeof loadProductView === 'function') {
            loadProductView(productDataForModal, { showAddToCart: true });
        } else {
            console.error("loadProductView function is missing!");
            // Fallback to simple alert
            Swal.fire({
                title: p.productName,
                text: p.product_description,
                imageUrl: productDataForModal.imageSrc[0]
            });
        }

    } catch (e) { console.error(e); }
}

// Attach to window
window.previewProduct = previewProduct;

// Initialize the view
fetchAllData();
