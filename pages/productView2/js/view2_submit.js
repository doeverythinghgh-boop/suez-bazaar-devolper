/**
 * @file pages/productView2/js/view2_submit.js
 * @description Order submission logic for Service View (PV2).
 */

async function pv2_sendOrder() {
    if (showLoginAlert()) {
        const dom = pv2_getDomElements();
        const note = dom.note.value.trim();

        if (pv2_orderImages.length === 0 && !note) {
            Swal.fire(window.langu('alert_title_info'), window.langu('view2_warn_no_content'), 'warning');
            return;
        }

        const productData = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;
        if (!productData) {
            Swal.fire(window.langu('gen_swal_error_title'), window.langu('view2_err_no_product'), 'error');
            return;
        }

        const product_key = productData.product_key;
        const seller_key = productData.user_key;
        const user_key = (typeof userSession !== 'undefined') ? userSession.user_key : null;

        Swal.fire({
            title: window.langu('gen_lbl_sending'),
            html: window.langu('view2_swal_sending_text'),
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const order_key = generateSerial();
            const uploadedFileNames = [];

            for (let i = 0; i < pv2_orderImages.length; i++) {
                const file = pv2_orderImages[i];
                const index = i + 1;
                const ext = (file.extension || file.name.split('.').pop() || 'jpg').toLowerCase();
                const finalName = `${user_key}_${seller_key}_${product_key}_${order_key}_${index}.${ext}`;

                const uploadResult = await uploadFile2cf(file, finalName);
                uploadedFileNames.push(uploadResult.file || finalName);
            }

            const orderData = {
                order_key: order_key,
                user_key: user_key,
                total_amount: 0,
                orderType: 1, // 1 = Service
                items: [
                    {
                        product_key: product_key,
                        quantity: 1,
                        seller_key: seller_key,
                        note: note
                    }
                ]
            };

            const res = await fetch(`${baseURL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!res.ok) throw new Error(window.langu('view2_err_create_order'));

            localStorage.setItem('showOrderPhotoMessage', 'true');

            if (typeof handlePurchaseNotifications === 'function') {
                const finalOrderForNotify = { ...orderData, id: order_key };
                handlePurchaseNotifications(finalOrderForNotify).catch(err => console.error('[PV2] Notification error:', err));
            }

            Swal.fire({ icon: 'success', title: window.langu('gen_swal_success_title'), confirmButtonText: window.langu('alert_confirm_btn') }).then(() => {
                mainLoader("./pages/home.html", "index-home-container", 0, undefined, "hiddenHomeIcon", false);
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: window.langu('gen_swal_error_title'), text: error.message });
        }
    }
}
