/**
 * @file pages/productEdit/js/edit_ui.js
 * @description Handles UI events, character counters, and preview generation for Product Edit.
 */

// DOM Elements Cache
var EDIT_dom = {};

/**
 * @function EDIT_getDomElements
 * @description Retrieves and caches DOM elements for the edit form.
 * @returns {Object} Object containing DOM elements.
 */
function EDIT_getDomElements() {
    EDIT_dom = {
        fileInput: document.getElementById('file-input'),
        pickFilesBtn: document.getElementById('pick-files-btn'),
        takePhotoBtn: document.getElementById('take-photo-btn'),
        previewsEl: document.getElementById('previews'),
        productNameInput: document.getElementById('product-name'),
        descriptionTextarea: document.getElementById('product-description'),
        sellerMessageTextarea: document.getElementById('seller-message'),
        notesInput: document.getElementById('product-notes'),
        quantityInput: document.getElementById('product-quantity'),
        priceInput: document.getElementById('product-price'),
        originalPriceInput: document.getElementById('original-price'),
        realPriceInput: document.getElementById('real-price'),
        heavyLoadCheckbox: document.getElementById('heavy-load'),
        form: document.getElementById('edit-product-form'),
        imagesLoading: document.getElementById('images-loading')
    };
    return EDIT_dom;
}

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

    const dom = EDIT_getDomElements();
    if (dom.previewsEl) dom.previewsEl.appendChild(wrapper);
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

// UI Events - Attached via function to ensure DOM is ready
/**
 * @function EDIT_attachEventListeners
 * @description Attaches event listeners to DOM elements after they are available.
 */
function EDIT_attachEventListeners() {
    const dom = EDIT_getDomElements();

    if (dom.pickFilesBtn) {
        dom.pickFilesBtn.onclick = () => {
            if (dom.fileInput) {
                dom.fileInput.removeAttribute('capture');
                dom.fileInput.click();
            }
        };
    }

    if (dom.fileInput) {
        dom.fileInput.onchange = (e) => EDIT_handleNewFiles(e.target.files);
    }

    // Character Counters
    if (dom.productNameInput) {
        dom.productNameInput.oninput = () => {
            const currentLength = dom.productNameInput.value.length;
            const maxLength = dom.productNameInput.maxLength;
            const counter = document.getElementById('product-name-char-counter');
            if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
            if (currentLength > 0) EDIT_clearError(dom.productNameInput);
        };
    }

    if (dom.descriptionTextarea) {
        dom.descriptionTextarea.oninput = () => {
            const currentLength = dom.descriptionTextarea.value.length;
            const maxLength = dom.descriptionTextarea.maxLength;
            const counter = document.getElementById('description-char-counter');
            if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
            if (currentLength > 0) EDIT_clearError(dom.descriptionTextarea);
        };
    }

    if (dom.sellerMessageTextarea) {
        dom.sellerMessageTextarea.oninput = () => {
            const currentLength = dom.sellerMessageTextarea.value.length;
            const maxLength = dom.sellerMessageTextarea.maxLength;
            const counter = document.getElementById('seller-message-char-counter');
            if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
            if (currentLength > 0) EDIT_clearError(dom.sellerMessageTextarea);
        };
    }

    if (dom.notesInput) {
        dom.notesInput.oninput = () => {
            const currentLength = dom.notesInput.value.length;
            const maxLength = dom.notesInput.maxLength;
            const counter = document.getElementById('notes-char-counter');
            if (counter) counter.textContent = `${currentLength} / ${maxLength}`;
            if (currentLength > 0) EDIT_clearError(dom.notesInput);
        };
    }

    // Numeric field validation
    if (dom.quantityInput) {
        dom.quantityInput.oninput = () => {
            let value = normalizeDigits(dom.quantityInput.value);
            dom.quantityInput.value = value.replace(/[^0-9]/g, '');
            if (dom.quantityInput.value) EDIT_clearError(dom.quantityInput);
        };
    }

    if (dom.priceInput) {
        dom.priceInput.oninput = () => {
            let value = normalizeDigits(dom.priceInput.value);
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            dom.priceInput.value = value;
            if (dom.priceInput.value) EDIT_clearError(dom.priceInput);
        };
    }

    if (dom.originalPriceInput) {
        dom.originalPriceInput.oninput = () => {
            let value = normalizeDigits(dom.originalPriceInput.value);
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            dom.originalPriceInput.value = value;
        };
    }

    if (dom.realPriceInput) {
        dom.realPriceInput.oninput = () => {
            let value = normalizeDigits(dom.realPriceInput.value);
            value = value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            dom.realPriceInput.value = value;
        };
    }

    // Camera Helper
    if (dom.takePhotoBtn) {
        dom.takePhotoBtn.onclick = () => {
            const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
            if (isMobile) {
                console.log('[Camera] Mobile device detected. Using capture attribute.');
                if (dom.fileInput) {
                    dom.fileInput.setAttribute('capture', 'environment');
                    dom.fileInput.click();
                }
            } else {
                console.log('[Camera] Desktop device detected. Using getUserMedia API.');
                EDIT_openDesktopCamera();
            }
        };
    }
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
