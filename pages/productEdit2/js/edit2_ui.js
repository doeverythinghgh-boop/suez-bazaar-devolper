/**
 * @file pages/productEdit2/js/edit2_ui.js
 * @description Handles UI events, character counters, and preview generation for Service Edit.
 */

// DOM Elements
var EDIT2_fileInput = document.getElementById('file-input');
var EDIT2_pickFilesBtn = document.getElementById('pick-files-btn');
var EDIT2_takePhotoBtn = document.getElementById('take-photo-btn');
var EDIT2_previewsEl = document.getElementById('previews');
var EDIT2_productNameInput = document.getElementById('product-name');
var EDIT2_descriptionTextarea = document.getElementById('product-description');
var EDIT2_sellerMessageTextarea = document.getElementById('seller-message');
var EDIT2_notesInput = document.getElementById('product-notes');

/**
 * @function EDIT2_createPreviewItem
 * @description Creates a visual preview element for an image and appends it to the DOM.
 * @param {Object} state - The image state object.
 * @param {string} [existingImageUrl=null] - URL for existing image.
 */
function EDIT2_createPreviewItem(state, existingImageUrl = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'edit-product-modal__preview';
    wrapper.setAttribute('data-id', state.id);

    wrapper.addEventListener('click', (e) => {
        if (e.target.closest('.edit-product-modal__preview-remove')) return;
        document.querySelectorAll('.edit-product-modal__preview--selected').forEach(p => p.classList.remove('edit-product-modal__preview--selected'));
        wrapper.classList.add('edit-product-modal__preview--selected');
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = "button";
    removeBtn.className = 'edit-product-modal__preview-remove';
    removeBtn.setAttribute('title', window.langu('gen_tooltip_remove_image'));
    removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    removeBtn.addEventListener('click', () => EDIT2_removeImage(state.id));

    const img = document.createElement('img');
    const meta = document.createElement('div');
    meta.className = 'edit-product-modal__preview-meta';
    meta.textContent = state.status === 'uploaded' ? window.langu('gen_lbl_current_img') : window.langu('gen_lbl_processing');

    wrapper.appendChild(removeBtn);
    wrapper.appendChild(img);
    wrapper.appendChild(meta);

    if (existingImageUrl) {
        img.src = existingImageUrl;
    } else {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(state.file);
    }

    if (EDIT2_previewsEl) EDIT2_previewsEl.appendChild(wrapper);
    state._el = wrapper;
    state._metaEl = meta;
}

/**
 * @function EDIT2_removeImage
 * @description Removes an image from the list and DOM with user confirmation.
 * @param {string} id - The ID of the image to remove.
 */
function EDIT2_removeImage(id) {
    console.log(`[ImageUploader] محاولة حذف الصورة بالمعرف: ${id}`);
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
            const idx = EDIT2_images.findIndex(i => i.id === id);
            if (idx > -1) {
                const state = EDIT2_images[idx];
                if (state._el) state._el.remove();
                console.log(`[ImageUploader] تمت إزالة الصورة ${id} من العرض.`);
                EDIT2_images.splice(idx, 1);
            }
        }
    });
}

// UI Events
if (EDIT2_pickFilesBtn) {
    EDIT2_pickFilesBtn.addEventListener('click', () => {
        if (EDIT2_fileInput) {
            EDIT2_fileInput.removeAttribute('capture');
            EDIT2_fileInput.click();
        }
    });
}

if (EDIT2_fileInput) {
    EDIT2_fileInput.addEventListener('change', (e) => EDIT2_handleNewFiles(e.target.files));
}

// Character Counters
if (EDIT2_productNameInput) {
    EDIT2_productNameInput.addEventListener('input', () => {
        const currentLength = EDIT2_productNameInput.value.length;
        const maxLength = EDIT2_productNameInput.maxLength;
        const counter = document.getElementById('product-name-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT2_clearError(EDIT2_productNameInput);
    });
}

if (EDIT2_descriptionTextarea) {
    EDIT2_descriptionTextarea.addEventListener('input', () => {
        const currentLength = EDIT2_descriptionTextarea.value.length;
        const maxLength = EDIT2_descriptionTextarea.maxLength;
        const counter = document.getElementById('description-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT2_clearError(EDIT2_descriptionTextarea);
    });
}

if (EDIT2_sellerMessageTextarea) {
    EDIT2_sellerMessageTextarea.addEventListener('input', () => {
        const currentLength = EDIT2_sellerMessageTextarea.value.length;
        const maxLength = EDIT2_sellerMessageTextarea.maxLength;
        const counter = document.getElementById('seller-message-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT2_clearError(EDIT2_sellerMessageTextarea);
    });
}

if (EDIT2_notesInput) {
    EDIT2_notesInput.addEventListener('input', () => {
        const currentLength = EDIT2_notesInput.value.length;
        const maxLength = EDIT2_notesInput.maxLength;
        const counter = document.getElementById('notes-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT2_clearError(EDIT2_notesInput);
    });
}

// Camera Trigger
if (EDIT2_takePhotoBtn) {
    EDIT2_takePhotoBtn.addEventListener('click', () => {
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        if (isMobile) {
            console.log('[Camera] Mobile device detected. Using capture attribute.');
            if (EDIT2_fileInput) {
                EDIT2_fileInput.setAttribute('capture', 'environment');
                EDIT2_fileInput.click();
            }
        } else {
            console.log('[Camera] Desktop device detected. Using getUserMedia API.');
            EDIT2_openDesktopCamera();
        }
    });
}

// Discard Button Logic
var edit2_btnDiscard = document.getElementById('edit2_btn_discard');
if (edit2_btnDiscard) {
    edit2_btnDiscard.addEventListener('click', () => {
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
                confirmButtonText: `<i class="fas fa-trash-alt"></i> ${window.langu('gen_swal_btn_yes_discard')}`,
                cancelButtonText: window.langu('gen_swal_btn_back'),
            }).then((result) => {
                if (result.isConfirmed) {
                    if (window.ProductStateManager) {
                        ProductStateManager.setSelectedCategories(null, null);
                    }
                    const container = document.getElementById('index-productEdit-container');
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
            console.error('[Edit2] Error in discard button logic:', error);
        }
    });
}

/**
 * @function EDIT2_openDesktopCamera
 * @description Opens a modal to capture a photo using the desktop webcam.
 */
async function EDIT2_openDesktopCamera() {
    const cameraModalContainer = document.getElementById('camera-modal-container');
    if (!cameraModalContainer) {
        console.error('Camera modal container not found!');
        return;
    }

    cameraModalContainer.innerHTML = `
        <div class="modal-content camera-modal-content">
            <button class="close-button" id="camera-modal-close-btn" aria-label="Close"><i class="fas fa-times"></i></button>
            <video id="camera-preview" autoplay playsinline></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>
            <div class="camera-controls">
                <button id="capture-photo-btn" class="btn btn-warning"><i class="fas fa-camera"></i> ${window.langu('gen_btn_capture_photo')}</button>
            </div>
        </div>
    `;
    cameraModalContainer.style.display = 'flex';

    const video = document.getElementById('camera-preview');
    const captureBtn = document.getElementById('capture-photo-btn');
    const closeBtn = document.getElementById('camera-modal-close-btn');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;

        const closeStream = () => {
            stream.getTracks().forEach(track => track.stop());
            cameraModalContainer.style.display = 'none';
            cameraModalContainer.innerHTML = '';
        };

        closeBtn.onclick = closeStream;

        captureBtn.onclick = () => {
            const canvas = document.getElementById('camera-canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            canvas.toBlob(blob => {
                EDIT2_handleNewFiles([blob]);
                closeStream();
            }, 'image/jpeg', 0.9);
        };
    } catch (err) {
        console.error("Error accessing camera: ", err);
        cameraModalContainer.style.display = 'none';
    }
}

// Map to global for compatibility
window.productModule.createPreviewItem = EDIT2_createPreviewItem;

/**
 * @function EDIT2_renderCategories
 * @description Fetches and displays selected category names as badges.
 */
async function EDIT2_renderCategories() {
    try {
        if (!window.ProductStateManager) return;
        const names = await ProductStateManager.resolveCategoryNames();
        const display = document.getElementById('edit2_category_display');
        if (!display || !names.main) return;

        display.innerHTML = `
            <div class="edit2_category_badge">
                <i class="fas fa-layer-group"></i> ${names.main}
            </div>
            ${names.sub ? `
                <div class="edit2_category_badge edit2_category_badge_sub">
                    <i class="fas fa-tags"></i> ${names.sub}
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('[Edit2] Error rendering categories:', error);
    }
}

// Initial call
EDIT2_renderCategories();
