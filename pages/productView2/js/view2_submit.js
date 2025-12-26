/**
 * @file pages/productView2/js/view2_submit.js
 * @description Order submission logic for Service View (PV2).
 */

async function pv2_sendOrder() {
    if (showLoginAlert()) {
        const dom = pv2_getDomElements();
        const note = dom.note.value.trim();

        if (pv2_orderImages.length === 0 && !note) {
            Swal.fire('تنبيه', 'يرجى إضافة ملاحظة أو صورة واحدة على الأقل', 'warning');
            return;
        }

        const productData = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : (typeof productSession !== 'undefined' ? productSession[0] : null);
        if (!productData) {
            Swal.fire('خطأ', 'لم يتم العثور على بيانات المنتج', 'error');
            return;
        }

        const product_key = productData.product_key;
        const seller_key = productData.user_key;
        const user_key = (typeof userSession !== 'undefined') ? userSession.user_key : null;

        Swal.fire({
            title: 'جاري الإرسال...',
            html: 'يرجى الانتظار بينما نقوم برفع الصور وإنشاء الطلب',
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

            if (!res.ok) throw new Error('فشل إنشاء الطلب');

            localStorage.setItem('showOrderPhotoMessage', 'true');

            if (typeof handlePurchaseNotifications === 'function') {
                const finalOrderForNotify = { ...orderData, id: order_key };
                handlePurchaseNotifications(finalOrderForNotify).catch(err => console.error('[PV2] Notification error:', err));
            }

            Swal.fire({ icon: 'success', title: 'تم الإرسال بنجاح', confirmButtonText: 'حسناً' }).then(() => {
                mainLoader("./pages/home.html", "index-home-container", 0, undefined, "hiddenHomeIcon", false);
            });

        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: error.message });
        }
    }
}
