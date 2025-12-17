/**
 * @file pages/cardPackage/cardPackage.js
 * @description Shopping cart page functionality.
 * Handles cart display, item management, and checkout process.
 */

/**
 * @description Creates a new order in the database via the API.
 * @function createOrder
 * @param {object} orderData - An object containing all the data for the order to be created.
 * @param {string} orderData.order_key - The unique key generated for the order.
 * @param {string} orderData.user_key - The key of the user who placed the order.
 * @param {number} orderData.total_amount - The total amount of the order.
 * @param {Array<object>} orderData.items - An array of products included in the order.
 * @returns {Promise<Object>} - A Promise that resolves with the created order data object, or an error object if it fails.
 * @see apiFetch
 */
async function createOrder(orderData) {
    return await apiFetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: orderData,
    });
}

/**
 * @description Sends the order to execution.
 * @function sendOrder2Excution
 * @returns {Promise<Object>} - A Promise that resolves with the created order data object, or an error object if it fails.
 * @see createOrder
 */
async function sendOrder2Excution() {

    // 1. Check Session (Fix inverted condition)
    if (showLoginAlert()) {
        // 2. Fetch Data
        const cart = getCart();
        // 3. Check Cart
        if (cart.length === 0) {
            Swal.fire("السلة فارغة", "لا توجد منتجات في السلة لإتمام الشراء.", "info");
            return;
        }

        // 4. Calculate Total Amount and Generate Order Key
        const totalAmount = cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        const orderKey = generateSerial();

        // 5. Build Order Data (Remove Duplication)
        const orderData = {
            order_key: orderKey,
            user_key: userSession.user_key,
            total_amount: totalAmount,
            items: cart.map((item) => ({
                product_key: item.product_key,
                quantity: item.quantity,
                seller_key: item.seller_key,
                note: item.note || "",
            })),
        };
        console.log("[Checkout] جاري إرسال بيانات الطلب:", orderData);

        // 6. Show Confirmation Message
        const result = await Swal.fire({
            title: "تأكيد الطلب",
            text: `المبلغ الإجمالي هو ${totalAmount.toFixed(2)} جنيه. هل تريد المتابعة؟`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "نعم، أرسل الطلب!",
            cancelButtonText: "إلغاء",
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const response = await createOrder(orderData);
                    console.log("[Checkout] الاستجابة من الخادم:", response);
                    return response;
                } catch (error) {
                    Swal.showValidationMessage(`فشل الطلب: ${error.message || error}`);
                    return null;
                }
            },
            allowOutsideClick: () => !Swal.isLoading(),
        });

        // 7. Process Result
        if (result.isConfirmed && result.value && !result.value.error) {
            const createdOrderKey = result.value.order_key;
            console.log(`[Checkout] تم إنشاء الطلب بنجاح: ${createdOrderKey}`);

            // 8. Send Notifications using the new function
            if (typeof handlePurchaseNotifications === 'function') {
                const finalOrderForNotify = { ...orderData, id: createdOrderKey };
                handlePurchaseNotifications(finalOrderForNotify)
                    .catch(err => console.error('[Checkout] خطأ في إرسال الإشعارات:', err));
            } else {
                console.warn('[Checkout] دالة handlePurchaseNotifications غير متوفرة');
            }

            // 9. Clear Cart and Show Success Message
            clearCart();
            await Swal.fire({
                title: "تم إتمام طلبك بنجاح! 🎉",
                text: `رقم الطلب: #${createdOrderKey}`,
                icon: "success",
                confirmButtonText: "حسناً"
            });

        } else if (result.value && result.value.error) {
            console.error("حدث خطأ", `فشل إرسال الطلب: ${result.value.error}`, "error");
        }
    }
}

// Global Variables
let cartPage_currentProductKeyForNote = '';

// Page Initialization
try {
    cartPage_loadCart();
    cartPage_setupEventListeners();
} catch (error) {
    console.error('حدث خطأ أثناء تهيئة الصفحة:', error);
}

/**
 * @description Loads the cart items from local storage and renders them in the cart page.
 *   Updates the cart summary and handles empty cart state.
 * @function cartPage_loadCart
 * @returns {void}
 */
function cartPage_loadCart() {
    try {
        const cartPage_cart = getCart();
        const cartPage_cartItemsContainer = document.getElementById('cartPage_cartItemsContainer');
        const cartPage_emptyCart = document.getElementById('cartPage_emptyCart');
        const cartPage_cartSummary = document.getElementById('cartPage_cartSummary');

        if (cartPage_cart.length === 0) {
            cartPage_cartItemsContainer.innerHTML = '';
            cartPage_emptyCart.style.display = 'block';
            cartPage_cartSummary.style.display = 'none';
            return;
        }

        cartPage_emptyCart.style.display = 'none';
        cartPage_cartSummary.style.display = 'block';

        let cartPage_cartItemsHTML = '';

        cartPage_cart.forEach(cartPage_item => {
            const cartPage_discount = cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price
                ? Math.round(((cartPage_item.original_price - cartPage_item.price) / cartPage_item.original_price) * 100)
                : 0;

            const cartPage_savings = cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price
                ? (cartPage_item.original_price - cartPage_item.price) * cartPage_item.quantity
                : 0;

            cartPage_cartItemsHTML += `
                <table class="cartPage_cart-item" id="cartPage_cartItem-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">
                    <tbody>
                        <tr>
                            <td style="width: 120px;" id="cartPage_cartItemImage-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-image">
                                    <img id="cartPage_cartItemImg-${cartPage_item.product_key}" src="${cartPage_item.image || 'https://via.placeholder.com/120x120?text=No+Image'}" 
                                         alt="${cartPage_item.productName}">
                                </div>
                            </td>
                            <td id="cartPage_cartItemInfo-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-info">
                                    <h3 class="cartPage_cart-item-title" id="cartPage_cartItemTitle-${cartPage_item.product_key}">${cartPage_item.productName}</h3>
                                    <div class="cartPage_cart-item-price" id="cartPage_cartItemPriceContainer-${cartPage_item.product_key}">
                                        <span class="cartPage_current-price" id="cartPage_currentPrice-${cartPage_item.product_key}">${cartPage_item.price.toFixed(2)} ج.م</span>
                                        ${cartPage_item.original_price && cartPage_item.original_price > cartPage_item.price ?
                    `<span class="cartPage_original-price" id="cartPage_originalPrice-${cartPage_item.product_key}">${cartPage_item.original_price.toFixed(2)} ج.م</span>` : ''}
                                        ${cartPage_discount > 0 ?
                    `<span class="cartPage_discount-badge" id="cartPage_discountBadge-${cartPage_item.product_key}">توفير ${cartPage_discount}%</span>` : ''}
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" id="cartPage_cartItemNoteContainer-${cartPage_item.product_key}">
                                <div class="cartPage_cart-item-note">
                                    <div class="cartPage_note-label" id="cartPage_noteLabel-${cartPage_item.product_key}">
                                        <i class="fas fa-sticky-note"></i>
                                        <span>ملاحظاتك:</span>
                                    </div>
                                    <div class="cartPage_note-text ${cartPage_item.note ? '' : 'empty'}" id="cartPage_noteText-${cartPage_item.product_key}">
                                        ${cartPage_item.note || 'لا توجد ملاحظات'}
                                        <button class="cartPage_edit-note-btn" id="cartPage_editNoteBtn-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td id="cartPage_quantityControls-${cartPage_item.product_key}">
                                <div class="cartPage_quantity-controls">
                                    <button class="cartPage_quantity-btn cartPage_minus" id="cartPage_decreaseQtyBtn-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">-</button>
                                    <input type="number" class="cartPage_quantity-input" id="cartPage_quantityInput-${cartPage_item.product_key}"
                                           value="${cartPage_item.quantity}" min="1" 
                                           data-product-key="${cartPage_item.product_key}">
                                    <button class="cartPage_quantity-btn cartPage_plus" id="cartPage_increaseQtyBtn-${cartPage_item.product_key}" data-product-key="${cartPage_item.product_key}">+</button>
                                </div>
                            </td>
                            <td id="cartPage_removeBtn-${cartPage_item.product_key}">
                                <button class="cartPage_remove-btn" data-product-key="${cartPage_item.product_key}">
                                    <i class="fas fa-trash"></i> حذف
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;
        });

        cartPage_cartItemsContainer.innerHTML = cartPage_cartItemsHTML;
        cartPage_updateCartSummary();
    } catch (error) {
        console.error('حدث خطأ أثناء تحميل السلة:', error);
    }
}

/**
 * @description Updates the cart summary section with the total item count, subtotal, savings, and final total.
 * @function cartPage_updateCartSummary
 * @returns {void}
 */
function cartPage_updateCartSummary() {
    try {
        const cartPage_itemCount = getCartItemCount();
        const cartPage_subtotal = getCartTotalPrice();
        const cartPage_savings = getCartTotalSavings();
        const cartPage_total = cartPage_subtotal;

        document.getElementById('cartPage_itemCount').textContent = cartPage_itemCount;
        document.getElementById('cartPage_subtotal').textContent = cartPage_subtotal.toFixed(2) + ' ج.م';
        document.getElementById('cartPage_savings').textContent = cartPage_savings.toFixed(2) + ' ج.م';
        document.getElementById('cartPage_total').textContent = cartPage_total.toFixed(2) + ' ج.م';
    } catch (error) {
        console.error('حدث خطأ أثناء تحديث ملخص السلة:', error);
    }
}

/**
 * @description Sets up all event listeners for the cart page, including cart updates, 
 *   quantity changes, item removal, and checkout actions.
 * @function cartPage_setupEventListeners
 * @returns {void}
 */
function cartPage_setupEventListeners() {
    try {
        // Cart Updated Event
        window.addEventListener('cartUpdated', function () {
            try {
                cartPage_loadCart();
            } catch (error) {
                console.error('حدث خطأ أثناء معالجة حدث تحديث السلة:', error);
            }
        });

        // Event Listener for Dynamic Elements
        document.addEventListener('click', function (e) {
            try {
                const cartPage_target = e.target;

                // Increase Quantity
                if (cartPage_target.classList.contains('cartPage_plus')) {
                    const cartPage_productKey = cartPage_target.dataset.productKey;
                    const cartPage_cart = getCart();
                    const cartPage_product = cartPage_cart.find(item => item.product_key === cartPage_productKey);

                    if (cartPage_product) {
                        updateCartQuantity(cartPage_productKey, cartPage_product.quantity + 1);
                    }
                }

                // Decrease Quantity
                if (cartPage_target.classList.contains('cartPage_minus')) {
                    const cartPage_productKey = cartPage_target.dataset.productKey;
                    const cartPage_cart = getCart();
                    const cartPage_product = cartPage_cart.find(item => item.product_key === cartPage_productKey);

                    if (cartPage_product && cartPage_product.quantity > 1) {
                        updateCartQuantity(cartPage_productKey, cartPage_product.quantity - 1);
                    }
                }

                // Remove Product
                if (cartPage_target.classList.contains('cartPage_remove-btn') || cartPage_target.closest('.cartPage_remove-btn')) {
                    const cartPage_productKey = (cartPage_target.closest('.cartPage_remove-btn') || cartPage_target).dataset.productKey;
                    const cartPage_cart = getCart();
                    const cartPage_product = cartPage_cart.find(item => item.product_key === cartPage_productKey);

                    if (cartPage_product) {
                        Swal.fire({
                            title: 'هل أنت متأكد؟',
                            text: `سيتم حذف المنتج "${cartPage_product.productName}" من سلة المشتريات.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            cancelButtonColor: '#3085d6',
                            confirmButtonText: 'نعم، احذفه!',
                            cancelButtonText: 'إلغاء'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                removeFromCart(cartPage_productKey);
                                Swal.fire('تم الحذف!', 'تم حذف المنتج من السلة بنجاح.', 'success');
                            }
                        });
                    }
                }

                // Edit Note
                if (cartPage_target.classList.contains('cartPage_edit-note-btn') || cartPage_target.closest('.cartPage_edit-note-btn')) {
                    const cartPage_productKey = (cartPage_target.closest('.cartPage_edit-note-btn') || cartPage_target).dataset.productKey;
                    const cartPage_cart = getCart();
                    const cartPage_product = cartPage_cart.find(item => item.product_key === cartPage_productKey);

                    if (cartPage_product) {
                        cartPage_openNoteModal(cartPage_productKey, cartPage_product.note || '');
                    }
                }
            } catch (error) {
                console.error('حدث خطأ أثناء معالجة النقر:', error);
            }
        });

        // Update Quantity on Input Change
        document.addEventListener('blur', function (e) {
            try {
                if (e.target.classList.contains('cartPage_quantity-input')) {
                    const cartPage_productKey = e.target.dataset.productKey;
                    const cartPage_newQuantity = parseInt(e.target.value);

                    if (cartPage_newQuantity > 0) {
                        updateCartQuantity(cartPage_productKey, cartPage_newQuantity);
                    } else if (cartPage_newQuantity <= 0) {
                        const cartPage_cart = getCart();
                        const cartPage_product = cartPage_cart.find(item => item.product_key === cartPage_productKey);

                        if (cartPage_product && confirm(`هل أنت متأكد من حذف "${cartPage_product.productName}" من السلة؟`)) {
                            removeFromCart(cartPage_productKey);
                        } else {
                            // Reset value to 1
                            e.target.value = 1;
                            updateCartQuantity(cartPage_productKey, 1);
                        }
                    }
                }
            } catch (error) {
                console.error('حدث خطأ أثناء تغيير الكمية:', error);
            }
        }, true); // Use true to enable "event capturing"

        // Clear Cart
        document.getElementById('cartPage_clearCartBtn').addEventListener('click', function () {
            Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "سيتم تفريغ سلة المشتريات بالكامل!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'نعم، قم بالتفريغ!',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (result.isConfirmed) {
                    clearCart();
                    // Show success message after clearing
                    Swal.fire('تم التفريغ!', 'تم تفريغ سلة المشتريات .', 'success');
                }
            });
        });

        // Checkout
        document.getElementById('cartPage_checkoutBtn').addEventListener('click', async function () {
            try {
                const cartPage_cart = getCart();
                if (cartPage_cart.length === 0) {
                    return;
                }
                // Checkout Logic Here
                await sendOrder2Excution();
            } catch (error) {
                console.error('حدث خطأ أثناء إتمام الشراء:', error);
            }
        });

        // Manage Note Modal
        document.getElementById('cartPage_closeNoteModal').addEventListener('click', cartPage_closeNoteModal);
        document.getElementById('cartPage_cancelNoteBtn').addEventListener('click', cartPage_closeNoteModal);
        document.getElementById('cartPage_saveNoteBtn').addEventListener('click', cartPage_saveNote);

        // Close Note Modal on Click Outside
        document.getElementById('cartPage_noteModal').addEventListener('click', function (e) {
            try {
                if (e.target === this) {
                    cartPage_closeNoteModal();
                }
            } catch (error) {
                console.error('حدث خطأ أثناء إغلاق النافذة:', error);
            }
        });
    } catch (error) {
        console.error('حدث خطأ أثناء إعداد مستمعي الأحداث:', error);
    }
}

/**
 * @description Opens the modal to add or edit a note for a specific cart item.
 * @function cartPage_openNoteModal
 * @param {string} cartPage_productKey - The unique key of the product to edit the note for.
 * @param {string} cartPage_currentNote - The current note content (if any).
 * @returns {void}
 */
function cartPage_openNoteModal(cartPage_productKey, cartPage_currentNote) {
    try {
        cartPage_currentProductKeyForNote = cartPage_productKey;
        document.getElementById('cartPage_noteTextarea').value = cartPage_currentNote;
        document.getElementById('cartPage_noteModal').style.display = 'flex';
    } catch (error) {
        console.error('حدث خطأ أثناء فتح نافذة الملاحظة:', error);
    }
}

/**
 * @description Closes the note editing modal and resets the current product key.
 * @function cartPage_closeNoteModal
 * @returns {void}
 */
function cartPage_closeNoteModal() {
    try {
        document.getElementById('cartPage_noteModal').style.display = 'none';
        cartPage_currentProductKeyForNote = '';
    } catch (error) {
        console.error('حدث خطأ أثناء إغلاق نافذة الملاحظة:', error);
    }
}

/**
 * @description Saves the note entered in the modal to the corresponding cart item and updates the cart.
 * @function cartPage_saveNote
 * @returns {void}
 */
function cartPage_saveNote() {
    try {
        const cartPage_note = document.getElementById('cartPage_noteTextarea').value.trim();
        updateCartItemNote(cartPage_currentProductKeyForNote, cartPage_note);
        cartPage_closeNoteModal();
    } catch (error) {
        console.error('حدث خطأ أثناء حفظ الملاحظة:', error);
    }
}

insertUniqueSnapshot("../pages/header.html", "header-container10", 100);
