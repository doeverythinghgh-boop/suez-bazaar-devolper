/**
 * @file pages/productAdd/js/add1_ui.js
 * @description Handles UI events, preview generation, and character counters.
 */

// DOM Elements
var add1_fileInput = document.getElementById('add1_file_input_00');
var add1_pickFilesBtn = document.getElementById('add1_pick_files_btn');
var add1_takePhotoBtn = document.getElementById('add1_take_photo_btn');
var add1_previewsEl = document.getElementById('add1_previews');
var add1_uploaderEl = document.getElementById('add1_image_uploader');
var add1_form = document.getElementById('add1_product_form');
var add1_descriptionTextarea = document.getElementById('add1_product_description');
var add1_productNameInput = document.getElementById('add1_product_name');
var add1_sellerMessageTextarea = document.getElementById('add1_seller_message');
var add1_notesInput = document.getElementById('add1_product_notes');
var add1_quantityInput = document.getElementById('add1_product_quantity');
var add1_priceInput = document.getElementById('add1_product_price');
var add1_originalPriceInput = document.getElementById('add1_original_price');
var add1_realPriceInput = document.getElementById('add1_real_price');
var add1_heavyLoadCheckbox = document.getElementById('add1_heavy_load');
var add1_btnSubmit = document.getElementById('add1_btn_submit');


/**
 * @function add1_createPreviewItem
 * @description Creates a visual preview element for an image and appends it to the DOM.
 * @param {Object} state - The image state object (id, file, status, etc.).
 * @param {string} [existingImageUrl=null] - URL for existing image.
 */
function add1_createPreviewItem(state, existingImageUrl = null) {
    try {
        const wrapper = document.createElement('div');
        wrapper.id = `add1_preview_${state.id}`;
        wrapper.className = 'add1_product_modal__preview';
        wrapper.setAttribute('data-id', state.id);

        wrapper.addEventListener('click', (e) => {
            try {
                if (e.target.closest('.add1_product_modal__preview_remove')) return;
                document.querySelectorAll('.add1_product_modal__preview__selected').forEach(p => p.classList.remove('add1_product_modal__preview__selected'));
                wrapper.classList.add('add1_product_modal__preview__selected');
            } catch (error) {
                console.error('[Add1] Error selecting preview:', error);
            }
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = "button";
        removeBtn.id = `add1_preview_remove_${state.id}`;
        removeBtn.className = 'add1_product_modal__preview_remove';
        removeBtn.setAttribute('title', window.langu('gen_tooltip_remove_image'));
        removeBtn.innerHTML = `<i class="fas fa-trash-alt" id="add1_icon_trash_${state.id}"></i>`;
        removeBtn.addEventListener('click', () => add1_removeImage(state.id));

        const img = document.createElement('img');
        img.id = `add1_preview_img_${state.id}`;

        const meta = document.createElement('div');
        meta.id = `add1_preview_meta_${state.id}`;
        meta.className = 'add1_product_modal__preview_meta';
        meta.textContent = window.langu('gen_lbl_processing');

        wrapper.appendChild(removeBtn);
        wrapper.appendChild(img);
        wrapper.appendChild(meta);

        if (existingImageUrl) {
            img.src = existingImageUrl;
            meta.textContent = window.langu('gen_lbl_current_img');
        } else {
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(state.file);
        }

        add1_previewsEl.appendChild(wrapper);
        state._el = wrapper;
        state._metaEl = meta;
    } catch (error) {
        console.error('[Add1] Error in add1_createPreviewItem:', error);
    }
}

/**
 * @function add1_removeImage
 * @description Removes an image from the list and DOM after user confirmation.
 * @param {string} id - The ID of the image to remove.
 */
function add1_removeImage(id) {
    try {
        console.log(`[Add1] محاولة حذف الصورة بالمعرف: ${id}`);
        Swal.fire({
            title: window.langu('gen_swal_title_confirm'),
            text: window.langu('gen_swal_remove_text'),
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm',
                cancelButton: 'swal-modern-mini-cancel'
            },
            confirmButtonText: window.langu('gen_swal_btn_yes_delete'),
            cancelButtonText: window.langu('gen_swal_btn_cancel')
        }).then((result) => {
            if (result.isConfirmed) {
                const idx = add1_images.findIndex(i => i.id === id);
                if (idx > -1) {
                    const state = add1_images[idx];
                    if (state._el) state._el.remove();
                    console.log(`[Add1] تمت إزالة الصورة ${id} من العرض.`);
                    add1_images.splice(idx, 1);
                }
            }
        });
    } catch (error) {
        console.error('[Add1] Error in add1_removeImage:', error);
    }
}


// UI Events
add1_pickFilesBtn.addEventListener('click', () => {
    try {
        add1_fileInput.removeAttribute('capture');
        add1_fileInput.click();
    } catch (error) {
        console.error('[Add1] Error picking files:', error);
    }
});

// Capture photo via camera
add1_takePhotoBtn.addEventListener('click', () => {
    try {
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        tempInput.style.display = 'none';
        tempInput.setAttribute('capture', 'environment');
        document.body.appendChild(tempInput);

        tempInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await add1_handleNewFiles(e.target.files);
            }
            if (tempInput.parentNode) tempInput.parentNode.removeChild(tempInput);
        });

        setTimeout(() => { tempInput.click(); }, 100);
    } catch (error) {
        console.error('[Add1] Error in camera trigger:', error);
    }
});

add1_fileInput.addEventListener('change', async (e) => await add1_handleNewFiles(e.target.files));

// Character counter and error hiding
add1_productNameInput.addEventListener('input', () => {
    try {
        const currentLength = add1_productNameInput.value.length;
        const maxLength = add1_productNameInput.maxLength;
        const counter = document.getElementById('add1_product_name_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_productNameInput);
    } catch (error) {
        console.error('[Add1] Error on product name input:', error);
    }
});

add1_descriptionTextarea.addEventListener('input', () => {
    try {
        const currentLength = add1_descriptionTextarea.value.length;
        const maxLength = add1_descriptionTextarea.maxLength;
        const counter = document.getElementById('add1_description_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_descriptionTextarea);
    } catch (error) {
        console.error('[Add1] Error on description input:', error);
    }
});

add1_sellerMessageTextarea.addEventListener('input', () => {
    try {
        const currentLength = add1_sellerMessageTextarea.value.length;
        const maxLength = add1_sellerMessageTextarea.maxLength;
        const counter = document.getElementById('add1_seller_message_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_sellerMessageTextarea);
    } catch (error) {
        console.error('[Add1] Error on seller message input:', error);
    }
});

add1_notesInput.addEventListener('input', () => {
    try {
        const currentLength = add1_notesInput.value.length;
        const maxLength = add1_notesInput.maxLength;
        const counter = document.getElementById('add1_notes_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) add1_clearError(add1_notesInput);
    } catch (error) {
        console.error('[Add1] Error on notes input:', error);
    }
});

add1_quantityInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_quantityInput.value);
        add1_quantityInput.value = value.replace(/[^0-9]/g, '');
        if (add1_quantityInput.value) add1_clearError(add1_quantityInput);
    } catch (error) {
        console.error('[Add1] Error on quantity input:', error);
    }
});

add1_priceInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_priceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        add1_priceInput.value = value;
        if (add1_priceInput.value) add1_clearError(add1_priceInput);
    } catch (error) {
        console.error('[Add1] Error on price input:', error);
    }
});

add1_originalPriceInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_originalPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        add1_originalPriceInput.value = value;
    } catch (error) {
        console.error('[Add1] Error on original price input:', error);
    }
});

add1_realPriceInput.addEventListener('input', () => {
    try {
        let value = normalizeDigits(add1_realPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        add1_realPriceInput.value = value;
    } catch (error) {
        console.error('[Add1] Error on real price input:', error);
    }
});
// Discard Button Logic
var add1_btnDiscard = document.getElementById('add1_btn_discard');
if (add1_btnDiscard) {
    add1_btnDiscard.addEventListener('click', () => {
        try {
            Swal.fire({
                title: window.langu('gen_swal_discard_title'),
                text: window.langu('gen_swal_discard_text'),
                showCancelButton: true,
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm',
                    cancelButton: 'swal-modern-mini-cancel'
                },
                confirmButtonText: '<i class="fas fa-trash-alt"></i> ' + window.langu('gen_swal_btn_yes_discard'),
                cancelButtonText: window.langu('gen_btn_back')
            }).then((result) => {
                if (result.isConfirmed) {
                    if (window.ProductStateManager) {
                        ProductStateManager.setSelectedCategories(null, null);
                    }
                    const container = document.getElementById('index-productAdd-container');
                    if (container) {
                        container.removeAttribute('data-page-url');
                        container.innerHTML = '';
                    }
                    if (window.containerGoBack) {
                        containerGoBack();
                    }
                }
            });
        } catch (error) {
            console.error('[Add1] Error in discard button logic:', error);
        }
    });
}

// Back Button Logic
var add1_btnBack = document.getElementById('add1_btn_back');
if (add1_btnBack) {
    add1_btnBack.addEventListener('click', () => {
        try {
            if (window.containerGoBack) {
                containerGoBack();
            }
        } catch (error) {
            console.error('[Add1] Error in back button logic:', error);
        }
    });
}

/**
 * @function add1_renderCategories
 * @description Fetches and displays selected category names as badges.
 */
async function add1_renderCategories() {
    try {
        if (!window.ProductStateManager) return;
        const names = await ProductStateManager.resolveCategoryNames();
        const display = document.getElementById('add1_category_display');
        if (!display || !names.main) return;

        display.innerHTML = `
            <div class="add1_category_badge">
                <i class="fas fa-layer-group"></i> ${names.main}
            </div>
            ${names.sub ? `
                <div class="add1_category_badge add1_category_badge_sub">
                    <i class="fas fa-tags"></i> ${names.sub}
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('[Add1] Error rendering categories:', error);
    }
}

// Initial call
add1_renderCategories();
