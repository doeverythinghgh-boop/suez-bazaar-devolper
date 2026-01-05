/**
 * @file pages/productView2/js/view2_init.js
 * @description Entry point for initializing Service View.
 */

function pv2_viewDetails(productData, options = {}) {
    try {
        console.log("[pv2_] عرض تفاصيل الخدمة مع السلايدر...");
        const dom = pv2_getDomElements();
        const showAddToCart = options.showAddToCart !== false;

        if (!showAddToCart && dom.orderBox) {
            dom.orderBox.style.display = "none";
        }

        if (dom.name) dom.name.textContent = productData.productName || window.langu('gen_lbl_unavailable');
        if (dom.description) dom.description.textContent = productData.description || window.langu('view2_no_desc');
        if (dom.sellerMessage) dom.sellerMessage.textContent = productData.sellerMessage || window.langu('view2_no_seller_msg');

        const images = productData.imageSrc || [];
        pv2_buildSlider(images, dom);

    } catch (error) {
        console.error("pv2_viewDetails - خطأ:", error);
    }
}

function pv2_initOrderLogic() {
    const dom = pv2_getDomElements();
    pv2_orderImages = [];
    if (dom.note) dom.note.value = '';
    if (dom.previews) dom.previews.innerHTML = '';
    if (dom.fileInput) dom.fileInput.value = '';

    if (dom.pickBtn) dom.pickBtn.onclick = () => dom.fileInput.click();

    if (dom.fileInput) {
        dom.fileInput.onchange = (e) => pv2_handleFiles(Array.from(e.target.files), dom);
    }

    if (dom.camBtn) {
        dom.camBtn.onclick = () => {
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                dom.fileInput.setAttribute('capture', 'environment');
                dom.fileInput.click();
            } else {
                Swal.fire(window.langu('alert_title_info'), window.langu('view2_swal_pc_upload_hint'), 'info');
            }
        };
    }

    if (dom.sendBtn) dom.sendBtn.onclick = pv2_sendOrder;

    if (dom.uploader) {
        dom.uploader.ondragover = (e) => { e.preventDefault(); dom.uploader.style.borderColor = 'var(--primary-color)'; };
        dom.uploader.ondragleave = (e) => { e.preventDefault(); dom.uploader.style.borderColor = '#dee2e6'; };
        dom.uploader.ondrop = (e) => {
            e.preventDefault();
            dom.uploader.style.borderColor = '#dee2e6';
            pv2_handleFiles(Array.from(e.dataTransfer.files), dom);
        };
    }
}

// Entry Point
(function () {
    try {
        console.log("تهيئة عرض الخدمة سلايدر ثلاثي الأبعاد...");

        if (typeof pv2_sliderState !== 'undefined' && pv2_sliderState.autoPlayInterval) {
            clearInterval(pv2_sliderState.autoPlayInterval);
        }

        const productData = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getCurrentProduct() : null;
        const viewOptions = (typeof ProductStateManager !== 'undefined') ? ProductStateManager.getViewOptions() : {};

        if (productData) {
            pv2_viewDetails(productData, viewOptions);
        } else {
            console.warn("[PV2] لا توجد بيانات خدمة في مدير الحالة");
        }

        pv2_initOrderLogic();

    } catch (error) {
        console.error("خطأ في تهيئة عرض الخدمة:", error);
    }
})();
