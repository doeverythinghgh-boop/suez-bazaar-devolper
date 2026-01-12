/**
 * @file pages/productView2/js/view2_ui.js
 * @description UI management and order photo previews for ProductView2.
 */

/**
 * @function pv2_getDomElements
 */
function pv2_getDomElements() {
    return {
        name: document.getElementById("pv2_name"),
        description: document.getElementById("pv2_description_text"),
        sellerMessage: document.getElementById("pv2_seller_message_text"),
        sliderContainer: document.getElementById("pv2_slider"),
        sliderTrack: document.getElementById("pv2_slider_track"),
        sliderDots: document.getElementById("pv2_slider_dots"),
        prevBtn: document.getElementById("pv2_slider_prev"),
        nextBtn: document.getElementById("pv2_slider_next"),
        orderBox: document.getElementById("pv2_order_box"),
        note: document.getElementById('pv2_note'),
        uploader: document.getElementById('pv2_uploader_area'),
        fileInput: document.getElementById('pv2_fileInput'),
        pickBtn: document.getElementById('pv2_pickImgBtn'),
        camBtn: document.getElementById('pv2_camBtn'),
        previews: document.getElementById('pv2_previews'),
        sendBtn: document.getElementById('pv2_sendBtn')
    };
}

/**
 * @function pv2_createPreview
 */
function pv2_createPreview(file, previewsEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'pv2_preview_item';
        div.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <button class="pv2_preview_remove">
                <i class="fas fa-times"></i>
            </button>
        `;
        div.fileRef = file;

        div.querySelector('.pv2_preview_remove').onclick = () => {
            pv2_orderImages = pv2_orderImages.filter(f => f !== file);
            div.remove();
        };

        previewsEl.appendChild(div);
    };
    reader.readAsDataURL(file);
}

/**
 * @function pv2_handleFiles
 */
async function pv2_handleFiles(files, dom) {
    if (pv2_orderImages.length + files.length > PV2_MAX_ORDER_IMAGES) {
        Swal.fire({
            title: window.langu('alert_title_info'),
            text: window.langu('gen_err_max_files', { n: PV2_MAX_ORDER_IMAGES }),
            confirmButtonText: window.langu('alert_confirm_btn'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm'
            }
        });
        return;
    }

    Swal.fire({
        title: window.langu('gen_lbl_processing'),
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        buttonsStyling: false,
        customClass: {
            popup: 'swal-modern-mini-popup',
            title: 'swal-modern-mini-title',
            htmlContainer: 'swal-modern-mini-text'
        }
    });

    for (const file of files) {
        if (file.type.indexOf('image') === -1 && !file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|tif|tiff)$/i)) {
            continue;
        }

        try {
            const processedBlob = await pv2_compressImage(file);
            if (!processedBlob.name) processedBlob.name = file.name;
            pv2_orderImages.push(processedBlob);
            pv2_createPreview(processedBlob, dom.previews);
        } catch (err) {
            console.error("خطأ في معالجة الملف", file.name, err);
        }
    }

    Swal.close();
    dom.fileInput.value = '';
}
