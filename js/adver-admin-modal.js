/**
 * @file adver-admin-modal.js
 * @description Provides functionality for the advertisement management modal in the admin panel.
 *
 * This module handles:
 * - Loading the modal content.
 * - Displaying existing advertisement images.
 * - Handling image uploads, previews, and removals.
 * - Saving changes to the advertisement data.
 */

/**
 * Initializes and shows the advertisement management modal.
 * @param {string} modalId - The ID of the modal container element.
 */
async function showAdverModal(modalId) {
  console.log('[AdverModal] Initializing advertisement management modal.');
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`[AdverModal] Modal element with ID '${modalId}' not found.`);
    return;
  }

  // 1. Load modal content
  modal.innerHTML = `
    <div class="modal-content adver-modal-content">
      <div class="modal-header">
        <h2>إدارة صور الإعلانات</h2>
        <span class="close-btn">&times;</span>
      </div>
      <div class="modal-body">
        <div id="ad-image-preview-container" class="ad-image-preview-container">
          <!-- Images will be loaded here -->
        </div>
        <div class="ad-upload-area">
          <input type="file" id="ad-image-upload" multiple accept="image/*" style="display: none;">
          <button id="ad-upload-btn" class="button"><i class="fas fa-upload"></i> اختر صورًا جديدة</button>
          <p class="form-hint">يمكنك اختيار صور متعددة. سيتم عرضها بالتناوب في الشريط الإعلاني.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button id="save-ad-changes" class="button login-btn">حفظ التغييرات</button>
      </div>
    </div>
  `;

  // 2. Get references to elements
  const closeBtn = modal.querySelector('.close-btn');
  const imagePreviewContainer = modal.querySelector('#ad-image-preview-container');
  const uploadInput = modal.querySelector('#ad-image-upload');
  const uploadBtn = modal.querySelector('#ad-upload-btn');
  const saveBtn = modal.querySelector('#save-ad-changes');

  // 3. Event Listeners
  closeBtn.onclick = () => modal.style.display = 'none';
  uploadBtn.onclick = () => uploadInput.click();
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

  // --- ✅ FIX: Use Event Delegation for dynamically created remove buttons ---
  // Instead of adding a listener to each button, we add one to the container.
  imagePreviewContainer.addEventListener('click', async (event) => {
    // Check if a remove button was clicked
    if (event.target.classList.contains('remove-ad-image-btn')) {
      event.stopPropagation(); // Prevent the click from bubbling up to the image wrapper
      const imageWrapper = event.target.closest('.ad-image-wrapper');
      if (imageWrapper) {
        const imageName = imageWrapper.dataset.imageName;
        console.log(`[AdverModal] Remove button clicked for image: ${imageName}`);

        const result = await Swal.fire({
          title: 'هل أنت متأكد؟',
          text: `سيتم حذف الصورة "${imageName}" نهائيًا.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'نعم، احذفها!',
          cancelButtonText: 'إلغاء'
        });

        if (result.isConfirmed) {
          try {
            // Here you would call the function to delete the file from your cloud storage
            // For example: await deleteFile(imageName);
            console.log(`[AdverModal] Simulating deletion of ${imageName} from cloud.`);

            // Remove the image from the DOM
            imageWrapper.style.transition = 'opacity 0.3s, transform 0.3s';
            imageWrapper.style.opacity = '0';
            imageWrapper.style.transform = 'scale(0.8)';
            setTimeout(() => imageWrapper.remove(), 300);

            Swal.fire('تم الحذف!', 'تمت إزالة الصورة بنجاح.', 'success');
            // Note: You'll need to update the 'advertisement.json' or database entry upon saving.
          } catch (error) {
            console.error(`[AdverModal] Error deleting image:`, error);
            Swal.fire('خطأ!', 'حدث خطأ أثناء محاولة حذف الصورة.', 'error');
          }
        }
      }
    }
    // Logic for showing the remove button when an image is clicked
    else if (event.target.closest('.ad-image-wrapper')) {
        const clickedWrapper = event.target.closest('.ad-image-wrapper');
        
        // Hide all other remove buttons
        imagePreviewContainer.querySelectorAll('.remove-ad-image-btn').forEach(btn => {
            if (btn.parentElement !== clickedWrapper) {
                btn.style.display = 'none';
            }
        });

        // Toggle the button on the clicked image
        const removeBtn = clickedWrapper.querySelector('.remove-ad-image-btn');
        if (removeBtn) {
            const isVisible = removeBtn.style.display === 'block';
            removeBtn.style.display = isVisible ? 'none' : 'block';
        }
    }
  });

  // Handle file selection
  uploadInput.onchange = (event) => {
    const files = event.target.files;
    if (!files.length) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Create a preview for the new image
        const wrapper = document.createElement('div');
        wrapper.className = 'ad-image-wrapper is-new'; // Mark as new
        wrapper.dataset.imageName = file.name; // Store file name
        wrapper.innerHTML = `
          <img src="${e.target.result}" alt="معاينة الإعلان">
          <button class="remove-ad-image-btn" style="display: none;" title="إزالة هذه الصورة"><i class="fas fa-trash-alt"></i></button>
        `;
        imagePreviewContainer.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    }
  };

  // 4. Load existing images
  await loadExistingAdImages(imagePreviewContainer);

  // 5. Show the modal
  modal.style.display = 'flex';
}

/**
 * Loads and displays existing advertisement images from the server.
 * @param {HTMLElement} container - The container to append the images to.
 */
async function loadExistingAdImages(container) {
  container.innerHTML = '<div class="loader"></div>'; // Show loader
  try {
    // In a real scenario, you'd fetch a list of image names from a config file or API
    // For this example, we'll assume we get them from `getAdverConfig`
    const adConfig = await getAdverConfig(); // Assuming this function exists in adverModule.js
    const images = adConfig.images || [];

    container.innerHTML = ''; // Clear loader

    if (images.length === 0) {
      container.innerHTML = '<p>لا توجد صور إعلانية حاليًا.</p>';
      return;
    }

    images.forEach(imageName => {
      const imageUrl = `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${imageName}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'ad-image-wrapper';
      wrapper.dataset.imageName = imageName;
      wrapper.innerHTML = `
        <img src="${imageUrl}" alt="صورة إعلان">
        <button class="remove-ad-image-btn" style="display: none;" title="إزالة هذه الصورة"><i class="fas fa-trash-alt"></i></button>
      `;
      container.appendChild(wrapper);
    });

  } catch (error) {
    console.error('[AdverModal] Failed to load existing ad images:', error);
    container.innerHTML = '<p class="error-message">فشل تحميل الصور الإعلانية.</p>';
  }
}

// Note: The `save-ad-changes` button logic is not implemented here.
// It would need to collect the `data-image-name` from all `.ad-image-wrapper` elements,
// upload any new files, and then save the final list of image names to the server.

// We need a placeholder for getAdverConfig if it's not globally available
if (typeof getAdverConfig === 'undefined') {
    async function getAdverConfig() {
        console.warn("Using placeholder for getAdverConfig");
        // This should be replaced by the actual implementation from adverModule.js
        return { images: ["ad1.jpg", "ad2.png"] };
    }
}