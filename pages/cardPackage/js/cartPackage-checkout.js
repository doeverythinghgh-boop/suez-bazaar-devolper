/**
 * @file pages/cardPackage/js/cartPackage-checkout.js
 * @description Checkout logic for cart package.
 * Handles order execution and confirmation process.
 */

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
            Swal.fire(window.langu('cart_empty_checkout_title'), window.langu('cart_empty_checkout_text'), "info");
            return;
        }

        // 4. Group by Seller and check limitPackage
        const sellerGroups = {};
        cart.forEach(item => {
            if (!sellerGroups[item.seller_key]) {
                sellerGroups[item.seller_key] = {
                    sellerName: item.sellerName || "بائع غير معروف",
                    total: 0,
                    limit: parseFloat(item.sellerLimitPackage) || 0
                };
            }
            sellerGroups[item.seller_key].total += item.price * item.quantity;
        });

        // Validate each seller's limit
        for (const sellerKey in sellerGroups) {
            const group = sellerGroups[sellerKey];
            if (group.total < group.limit) {
                Swal.fire({
                    title: window.langu('cart_limit_title'),
                    text: window.langu('cart_limit_text')
                        .replace('{limit}', group.limit.toFixed(2))
                        .replace('{total}', group.total.toFixed(2))
                        .replace(/{currency}/g, window.langu('cart_currency')),
                    icon: "warning",
                    confirmButtonText: window.langu('alert_confirm_btn')
                });
                return; // Stop execution
            }
        }

        // 5. Calculate Total Amount and Generate Order Key
        const cartPage_subtotal = cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        const deliveryFee = 40.00;
        const totalAmount = cartPage_subtotal + deliveryFee;
        const orderKey = generateSerial();

        // 5. Build Order Data (Remove Duplication)
        const orderData = {
            order_key: orderKey,
            user_key: userSession.user_key,
            total_amount: totalAmount,
            orderType: 0, // 0 = Product
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
            title: window.langu('cart_confirm_order_title'),
            text: window.langu('cart_total_confirm')
                .replace('{amount}', totalAmount.toFixed(2))
                .replace('{currency}', window.langu('cart_currency')),
            icon: "question",
            showCancelButton: true,
            confirmButtonText: window.langu('alert_confirm_yes'),
            cancelButtonText: window.langu('alert_cancel_btn'),
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
                title: window.langu('cart_checkout_success_title'),
                text: window.langu('cart_order_id').replace('{id}', createdOrderKey),
                icon: "success",
                confirmButtonText: window.langu('cart_success_ok')
            });

        } else if (result.value && result.value.error) {
            console.error("حدث خطأ", `فشل إرسال الطلب: ${result.value.error}`, "error");
        }
    }
}
