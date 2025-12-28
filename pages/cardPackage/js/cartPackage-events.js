/**
 * @file pages/cardPackage/js/cartPackage-events.js
 * @description Event handling logic for cart package.
 * Sets up all event listeners for cart interactions.
 */

/**
 * @description Sets up all event listeners for the cart page, including cart updates, 
 *   quantity changes, item removal, and checkout actions.
 * @function cartPage_setupEventListeners
 * @returns {void}
 */
function cartPage_setupEventListeners() {
    try {
        // Cart Updated Event
        window.addEventListener('cartUpdated', async function () {
            try {
                // loadCart calls updateCartSummary which is now async
                await cartPage_loadCart();
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
