/**
 * @file pages/productEdit/js/edit_ui.js
 * @description Handles UI events, character counters, and preview generation for Product Edit.
 */

// DOM Elements
var EDIT_fileInput = document.getElementById('file-input');
var EDIT_pickFilesBtn = document.getElementById('pick-files-btn');
var EDIT_takePhotoBtn = document.getElementById('take-photo-btn');
var EDIT_previewsEl = document.getElementById('previews');
var EDIT_productNameInput = document.getElementById('product-name');
var EDIT_descriptionTextarea = document.getElementById('product-description');
var EDIT_sellerMessageTextarea = document.getElementById('seller-message');
var EDIT_notesInput = document.getElementById('product-notes');
var EDIT_quantityInput = document.getElementById('product-quantity');
var EDIT_priceInput = document.getElementById('product-price');
var EDIT_originalPriceInput = document.getElementById('original-price');
var EDIT_realPriceInput = document.getElementById('real-price');

/**
 * @function EDIT_createPreviewItem
 * @description Creates a visual preview element for an image and appends it to the DOM.
 * @param {Object} state - The image state object.
 * @param {string} [existingImageUrl=null] - URL for existing image (if applicable).
 */
function EDIT_createPreviewItem(state, existingImageUrl = null) {
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
    removeBtn.setAttribute('title', 'Remove Image');
    removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    removeBtn.addEventListener('click', () => EDIT_removeImage(state.id));

    const img = document.createElement('img');
    const meta = document.createElement('div');
    meta.className = 'edit-product-modal__preview-meta';
    meta.textContent = state.status === 'uploaded' ? 'الصورة الحالية' : 'جاري المعالجة...';

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

    if (EDIT_previewsEl) EDIT_previewsEl.appendChild(wrapper);
    state._el = wrapper;
    state._metaEl = meta;
}

/**
 * @function EDIT_removeImage
 * @description Removes an image from the list and DOM.
 * @param {string} id - The ID of the image to remove.
 */
function EDIT_removeImage(id) {
    console.log(`[ImageUploader] محاولة حذف الصورة بالمعرف: ${id}`);
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "هل تريد حقاً حذف هذه الصورة؟",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذفها!',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            const idx = EDIT_images.findIndex(i => i.id === id);
            if (idx > -1) {
                const state = EDIT_images[idx];
                if (state._el) state._el.remove();
                console.log(`[ImageUploader] تمت إزالة الصورة ${id} من العرض.`);
                EDIT_images.splice(idx, 1);
            }
        }
    });
}

// UI Events
if (EDIT_pickFilesBtn) {
    EDIT_pickFilesBtn.addEventListener('click', () => {
        if (EDIT_fileInput) {
            EDIT_fileInput.removeAttribute('capture');
            EDIT_fileInput.click();
        }
    });
}

if (EDIT_fileInput) {
    EDIT_fileInput.addEventListener('change', (e) => EDIT_handleNewFiles(e.target.files));
}

// Character Counters
if (EDIT_productNameInput) {
    EDIT_productNameInput.addEventListener('input', () => {
        const currentLength = EDIT_productNameInput.value.length;
        const maxLength = EDIT_productNameInput.maxLength;
        const counter = document.getElementById('product-name-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT_clearError(EDIT_productNameInput);
    });
}

if (EDIT_descriptionTextarea) {
    EDIT_descriptionTextarea.addEventListener('input', () => {
        const currentLength = EDIT_descriptionTextarea.value.length;
        const maxLength = EDIT_descriptionTextarea.maxLength;
        const counter = document.getElementById('description-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT_clearError(EDIT_descriptionTextarea);
    });
}

if (EDIT_sellerMessageTextarea) {
    EDIT_sellerMessageTextarea.addEventListener('input', () => {
        const currentLength = EDIT_sellerMessageTextarea.value.length;
        const maxLength = EDIT_sellerMessageTextarea.maxLength;
        const counter = document.getElementById('seller-message-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT_clearError(EDIT_sellerMessageTextarea);
    });
}

if (EDIT_notesInput) {
    EDIT_notesInput.addEventListener('input', () => {
        const currentLength = EDIT_notesInput.value.length;
        const maxLength = EDIT_notesInput.maxLength;
        const counter = document.getElementById('notes-char-counter');
        if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
        if (currentLength > 0) EDIT_clearError(EDIT_notesInput);
    });
}

// Numeric field validation
if (EDIT_quantityInput) {
    EDIT_quantityInput.addEventListener('input', () => {
        let value = normalizeDigits(EDIT_quantityInput.value);
        EDIT_quantityInput.value = value.replace(/[^0-9]/g, '');
        if (EDIT_quantityInput.value) EDIT_clearError(EDIT_quantityInput);
    });
}

if (EDIT_priceInput) {
    EDIT_priceInput.addEventListener('input', () => {
        let value = normalizeDigits(EDIT_priceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        EDIT_priceInput.value = value;
        if (EDIT_priceInput.value) EDIT_clearError(EDIT_priceInput);
    });
}

if (EDIT_originalPriceInput) {
    EDIT_originalPriceInput.addEventListener('input', () => {
        let value = normalizeDigits(EDIT_originalPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        EDIT_originalPriceInput.value = value;
    });
}

if (EDIT_realPriceInput) {
    EDIT_realPriceInput.addEventListener('input', () => {
        let value = normalizeDigits(EDIT_realPriceInput.value);
        value = value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        EDIT_realPriceInput.value = value;
    });
}

// Camera Helper
if (EDIT_takePhotoBtn) {
    EDIT_takePhotoBtn.addEventListener('click', () => {
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        if (isMobile) {
            console.log('[Camera] Mobile device detected. Using capture attribute.');
            if (EDIT_fileInput) {
                EDIT_fileInput.setAttribute('capture', 'environment');
                EDIT_fileInput.click();
            }
        } else {
            console.log('[Camera] Desktop device detected. Using getUserMedia API.');
            EDIT_openDesktopCamera();
        }
    });
}

/**
 * @function EDIT_openDesktopCamera
 * @description Opens a modal to capture a photo using the desktop webcam.
 */
async function EDIT_openDesktopCamera() {
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
                        <button id="capture-photo-btn" class="btn btn-warning"><i class="fas fa-camera"></i> Capture Photo</button>
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
                EDIT_handleNewFiles([blob]);
                closeStream();
            }, 'image/jpeg', 0.9);
        };
    } catch (err) {
        console.error("Error accessing camera: ", err);
        cameraModalContainer.style.display = 'none';
    }
}

// Map to global for compatibility
window.productModule.createPreviewItem = EDIT_createPreviewItem;
