/**
 * @file pages/productAdd2/js/add2_ui.js
 * @description Handles UI events, preview generation, and character counters for Product Add 2.
 */

// DOM Elements
var add2_fileInput = document.getElementById('add2_file_input_00');
var add2_pickFilesBtn = document.getElementById('add2_pick_files_btn');
var add2_takePhotoBtn = document.getElementById('add2_take_photo_btn');
var add2_previewsEl = document.getElementById('add2_previews');
var add2_uploaderEl = document.getElementById('add2_image_uploader');
var add2_form = document.getElementById('add2_product_form');
var add2_descriptionTextarea = document.getElementById('add2_product_description');
var add2_productNameInput = document.getElementById('add2_product_name');
var add2_sellerMessageTextarea = document.getElementById('add2_seller_message');
var add2_notesInput = document.getElementById('add2_product_notes');


/**
 * @function add2_createPreviewItem
 * @description Creates a visual preview element for an image and appends it to the DOM.
 * @param {Object} state - The image state object (id, file, status, etc.).
 * @param {string} [existingImageUrl=null] - URL for existing image.
 */
function add2_createPreviewItem(state, existingImageUrl = null) {
    try {
        const wrapper = document.createElement('div');
        wrapper.id = `add2_preview_${state.id}`;
        wrapper.className = 'add2_product_modal__preview';
        wrapper.setAttribute('data-id', state.id);

        // On click, select image and show remove button
        wrapper.addEventListener('click', (e) => {
            try {
                // Do nothing if clicking remove button
                if (e.target.closest('.add2_product_modal__preview_remove')) return;

                // Deselect others
                document.querySelectorAll('.add2_product_modal__preview__selected').forEach(p => p.classList.remove('add2_product_modal__preview__selected'));
                // Select current
                wrapper.classList.add('add2_product_modal__preview__selected');
            } catch (error) {
                console.error('[Add2] Error selecting preview:', error);
            }
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = "button";
        removeBtn.id = `add2_preview_remove_${state.id}`;
        removeBtn.className = 'add2_product_modal__preview_remove';
        removeBtn.setAttribute('title', window.langu('gen_tooltip_remove_image'));
        removeBtn.innerHTML = `<i class="fas fa-trash-alt" id="add2_icon_trash_${state.id}"></i>`;
        removeBtn.addEventListener('click', () => add2_removeImage(state.id));

        const img = document.createElement('img');
        img.id = `add2_preview_img_${state.id}`;

        const meta = document.createElement('div');
        meta.id = `add2_preview_meta_${state.id}`;
        meta.className = 'add2_product_modal__preview_meta';
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

        add2_previewsEl.appendChild(wrapper);
        state._el = wrapper;
        state._metaEl = meta;
    } catch (error) {
        console.error('[Add2] Error in add2_createPreviewItem:', error);
    }
}

/**
 * @function add2_removeImage
 * @description Removes an image from the list and DOM after user confirmation.
 * @param {string} id - The ID of the image to remove.
 */
function add2_removeImage(id) {
    try {
        console.log(`[Add2] محاولة حذف الصورة بالمعرف: ${id}`);
        Swal.fire({
            title: window.langu('gen_swal_title_confirm'),
            text: window.langu('gen_swal_remove_text'),
            showCancelButton: true,
            confirmButtonText: window.langu('gen_swal_btn_yes_delete'),
            cancelButtonText: window.langu('gen_swal_btn_cancel'),
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm',
                cancelButton: 'swal-modern-mini-cancel'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const idx = add2_images.findIndex(i => i.id === id);
                if (idx > -1) {
                    const state = add2_images[idx];
                    if (state._el) state._el.remove();
                    console.log(`[Add2] تمت إزالة الصورة ${id} من العرض.`);
                    add2_images.splice(idx, 1);
                }
            }
        });
    } catch (error) {
        console.error('[Add2] Error in add2_removeImage:', error);
    }
}

// UI Events
add2_pickFilesBtn.addEventListener('click', () => {
    try {
        add2_fileInput.removeAttribute('capture');
        add2_fileInput.click();
    } catch (error) {
        console.error('[Add2] Error picking files:', error);
    }
});

add2_fileInput.addEventListener('change', async (e) => await add2_handleNewFiles(e.target.files));

// Capture photo via camera
add2_takePhotoBtn.addEventListener('click', () => {
    try {
        console.log('[Add2] Take photo button clicked');
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        tempInput.style.display = 'none';
        tempInput.setAttribute('capture', 'environment');
        document.body.appendChild(tempInput);

        tempInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await add2_handleNewFiles(e.target.files);
            }
            if (tempInput.parentNode) {
                tempInput.parentNode.removeChild(tempInput);
            }
        });

        tempInput.addEventListener('error', (e) => {
            console.error('[Add2] Error with camera input:', e);
            if (tempInput.parentNode) {
                tempInput.parentNode.removeChild(tempInput);
            }
            Swal.fire({
                title: window.langu('gen_cam_error_title'),
                text: window.langu('gen_cam_error_text'),
                showCancelButton: true,
                confirmButtonText: window.langu('gen_cam_use_gallery'),
                cancelButtonText: window.langu('add2_swal_cancel_delete'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm',
                    cancelButton: 'swal-modern-mini-cancel'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    add2_pickFilesBtn.click();
                }
            });
        });

        setTimeout(() => { tempInput.click(); }, 100);
    } catch (error) {
        console.error('[Add2] Error in camera trigger:', error);
    }
});

// Character counter and error hiding for Product Name
add2_productNameInput.addEventListener('input', () => {
    try {
        const currentLength = add2_productNameInput.value.length;
        const maxLength = add2_productNameInput.maxLength;
        const counter = document.getElementById('add2_product_name_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_productNameInput);
    } catch (error) {
        console.error('[Add2] Error on product name input:', error);
    }
});

// Character counter and error hiding for Description
add2_descriptionTextarea.addEventListener('input', () => {
    try {
        const currentLength = add2_descriptionTextarea.value.length;
        const maxLength = add2_descriptionTextarea.maxLength;
        const counter = document.getElementById('add2_description_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_descriptionTextarea);
    } catch (error) {
        console.error('[Add2] Error on description input:', error);
    }
});

// Character counter and error hiding for Seller Message
add2_sellerMessageTextarea.addEventListener('input', () => {
    try {
        const currentLength = add2_sellerMessageTextarea.value.length;
        const maxLength = add2_sellerMessageTextarea.maxLength;
        const counter = document.getElementById('add2_seller_message_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_sellerMessageTextarea);
    } catch (error) {
        console.error('[Add2] Error on seller message input:', error);
    }
});

// Character counter for Notes field
add2_notesInput.addEventListener('input', () => {
    try {
        const currentLength = add2_notesInput.value.length;
        const maxLength = add2_notesInput.maxLength;
        const counter = document.getElementById('add2_notes_char_counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;

        if (currentLength > 0) add2_clearError(add2_notesInput);
    } catch (error) {
        console.error('[Add2] Error on notes input:', error);
    }
});


/**
 * @function add2_openDesktopCamera
 * @description Opens the webcam modal for desktop devices.
 */
async function add2_openDesktopCamera() {
    const cameraModalContainer = document.getElementById('add2_camera_modal_container');
    if (!cameraModalContainer) {
        console.error('[Add2] Camera modal container not found!');
        return;
    }

    try {
        cameraModalContainer.innerHTML = `
                <div class="modal-content add2_camera_modal_content" id="add2_camera_modal_content_div">
                    <button class="add2_close_button" id="add2_camera_modal_close_btn" aria-label="Close"><i class="fas fa-times" id="add2_icon_camera_close"></i></button>
                    <video id="add2_camera_preview" autoplay playsinline></video>
                    <canvas id="add2_camera_canvas" style="display:none;"></canvas>
                    <div class="add2_camera_controls" id="add2_camera_controls_div">
                        <button id="add2_capture_photo_btn" class="add2_btn add2_btn_primary"><i class="fas fa-camera" id="add2_icon_camera_capture"></i> Capture Photo</button>
                    </div>
                </div>
            `;
        cameraModalContainer.style.display = 'flex';

        const video = document.getElementById('add2_camera_preview');
        const captureBtn = document.getElementById('add2_capture_photo_btn');
        const closeBtn = document.getElementById('add2_camera_modal_close_btn');

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;

        const closeStream = () => {
            stream.getTracks().forEach(track => track.stop());
            cameraModalContainer.style.display = 'none';
            cameraModalContainer.innerHTML = '';
        };

        closeBtn.onclick = closeStream;

        captureBtn.onclick = () => {
            const canvas = document.getElementById('add2_camera_canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            canvas.toBlob(blob => {
                const file = new File([blob], `add2_camera_${Date.now()}.jpg`, { type: "image/jpeg" });
                add2_handleNewFiles([file]);
                closeStream();
            }, 'image/jpeg', 0.9);
        };
    } catch (err) {
        console.error("[Add2] Error accessing camera: ", err);
        cameraModalContainer.style.display = 'none';
    }
}
// Discard Button Logic
var add2_btnDiscard = document.getElementById('add2_btn_discard');
if (add2_btnDiscard) {
    add2_btnDiscard.addEventListener('click', () => {
        try {
            Swal.fire({
                title: window.langu('gen_swal_discard_title'),
                text: window.langu('gen_swal_discard_text'),
                showCancelButton: true,
                confirmButtonText: `<i class="fas fa-trash-alt"></i> ${window.langu('gen_swal_btn_yes_discard')}`,
                cancelButtonText: window.langu('gen_swal_btn_back'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm',
                    cancelButton: 'swal-modern-mini-cancel'
                }
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
            console.error('[Add2] Error in discard button logic:', error);
        }
    });
}

// Back Button Logic
var add2_btnBack = document.getElementById('add2_btn_back');
if (add2_btnBack) {
    add2_btnBack.addEventListener('click', () => {
        try {
            if (window.containerGoBack) {
                containerGoBack();
            }
        } catch (error) {
            console.error('[Add2] Error in back button logic:', error);
        }
    });
}

/**
 * @function add2_renderCategories
 * @description Fetches and displays selected category names as badges.
 */
async function add2_renderCategories() {
    try {
        if (!window.ProductStateManager) return;
        const names = await ProductStateManager.resolveCategoryNames();
        const display = document.getElementById('add2_category_display');
        if (!display || !names.main) return;

        display.innerHTML = `
            <div class="add2_category_badge">
                <i class="fas fa-layer-group"></i> ${names.main}
            </div>
            ${names.sub ? `
                <div class="add2_category_badge add2_category_badge_sub">
                    <i class="fas fa-tags"></i> ${names.sub}
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('[Add2] Error rendering categories:', error);
    }
}

// Initial call
add2_renderCategories();
