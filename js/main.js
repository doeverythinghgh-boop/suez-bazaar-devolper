document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const animatedTextElement = document.getElementById("animated-text");
  const taglineElement = document.getElementById("tagline");
  const contentPlaceholder = document.getElementById("content-placeholder");

  // --- Animation Configuration ---
  const fullText = "Suez Bazaar";
  const shortText = "SB";
  const letterAppearDelay = 100; // Delay between each letter appearing
  let isAnimationRunning = false; // متغير لتتبع حالة الرسوم المتحركة

  // دالة مساعدة للانتظار، مُحسّنة للرسوم المتحركة
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  // 1. Function to show text with zoom-in letters
  async function showTextWithZoom(text) {
    return new Promise((resolve) => {
      animatedTextElement.innerHTML = ""; // Clear previous content
      animatedTextElement.classList.remove("hidden", "final-text");
      // Align content to the right, same as "SB"
      const container = animatedTextElement.parentElement;
      container.style.justifyContent = "flex-start";
      container.style.direction = "rtl";

      // Split text into letters and wrap each in a span
      text.split("").forEach((char, index) => {
        const span = document.createElement("span");
        // Use &nbsp; for space to make it animatable
        span.innerHTML = char === " " ? "&nbsp;" : char;
        // Stagger the animation start time
        span.style.animationDelay = `${index * letterAppearDelay}ms`;
        animatedTextElement.appendChild(span);
      });

      // Calculate total animation time and then call the resolve callback
      const totalAnimationTime = text.length * letterAppearDelay;
      wait(totalAnimationTime + 2000).then(resolve); // 2s delay after animation
    });
  }

  // 2. Function to hide the text
  async function hideText() {
    return new Promise((resolve) => {
      animatedTextElement.classList.add("hidden");
      wait(500).then(resolve); // Corresponds to fade-out duration
    });
  }

  // 3. Function to show the final "SB" text
  async function showFinalText(text) {
    return new Promise((resolve) => {
      animatedTextElement.innerHTML = text;
      animatedTextElement.classList.remove("hidden");
      animatedTextElement.classList.add("final-text");

      const container = animatedTextElement.parentElement;
      container.style.justifyContent = "flex-start";
      container.style.direction = "rtl"; // Set direction for right-to-left layout

      resolve(); // Signal that this step is done
    });
  }

  // 4. Function for the tagline carousel
  async function startTaglineCarousel() {
    return new Promise(async (resolve) => {
      const sentences = [
        "بازار السويس... فرصة واحدة تجمع كل الفرص",
        "اكتشف آلاف المنتجات من موردين موثوقين في السويس",
        "تابع حالة طلبك لحظة بلحظة حتى يصلك إلى باب منزلك",
        "استفد من العروض والخصومات الحصرية المقدمة من الموردين",
        "نضمن جودة المنتجات وخدمة ما بعد البيع عبر نظام تقييم ومراجعة شفاف",
        "من المورد إلى المستهلك مباشرة — جودة أعلى وسعر أفضل",
        "منتجات مضمونة، موردون موثوقون، تجربة تسوق متكاملة",
      ];

      // التأكد من أن الجملة الأولى تبدأ دائمًا من حالة مخفية
      taglineElement.classList.remove("visible");
      await wait(10); // انتظار قصير لضمان تطبيق التغيير

      for (const sentence of sentences) {
        if (taglineElement.classList.contains("visible")) {
          taglineElement.classList.remove("visible");
          await wait(800); // Wait for fade-out
        }
        taglineElement.textContent = sentence;
        taglineElement.classList.add("visible");
        await wait(5000); // Wait for sentence to be displayed
      }

      // Fade out the last sentence and resolve the promise
      taglineElement.classList.remove("visible");
      await wait(800);
      resolve();
    });
  }

  // 5. Function to load and display content from another page
  async function loadPageContent(url) {
    try {
      const loader = document.getElementById("content-loader");
      if (loader) loader.style.display = "block"; // إظهار مؤشر التحميل

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      if (loader) loader.style.display = "none"; // إخفاء مؤشر التحميل
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      // Get content from the body of the fetched page
      const pageContent = doc.body.innerHTML;

      // Place the content into our placeholder and make it visible
      contentPlaceholder.innerHTML = pageContent;

      // Find and execute scripts from the loaded content.
      // This is necessary for the gallery's interactivity.
      const scripts = doc.body.querySelectorAll("script");
      scripts.forEach((script) => {
        // We create a function to pass parameters (like the base path) to the loaded script.
        // This makes the gallery script more reusable and robust.
        const newScript = document.createElement("script");
        // Pass the base path for images to the gallery script.
        // The path is relative to index.html.
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript).remove(); // A trick to execute the script
      });
    } catch (error) {
      console.error("Could not load page content:", error);
    }
  }

  // --- Product Details Modal ---
  const productModal = document.getElementById("product-details-modal");

  async function showProductDetailsModal(productData) {
    // Load the content of showData.html
    const response = await fetch("pages/showProduct.html");
    const modalContent = await response.text();
    productModal.innerHTML = modalContent;

    // Get elements from the newly loaded content
    const closeBtn = document.getElementById("product-modal-close-btn");
    const modalImage = document.getElementById("product-modal-image");
    const thumbnailsContainer = document.getElementById(
      "product-modal-thumbnails"
    );
    const itemQuantity = document.getElementById("product-modal-quantity");
    const itemPrice = document.getElementById("product-modal-price");
    const sellerMessage = document.getElementById(
      "product-modal-seller-message"
    );
    const productDescription = document.getElementById(
      "product-modal-description"
    ); // ✅ إضافة: الحصول على عنصر الوصف
    const decreaseBtn = document.getElementById(
      "product-modal-decrease-quantity"
    );
    const increaseBtn = document.getElementById(
      "product-modal-increase-quantity"
    );
    const selectedQuantityInput = document.getElementById(
      "product-modal-selected-quantity"
    );
    const totalPriceEl = document.getElementById("product-modal-total-price");
    const addToCartBtn = document.getElementById("product-modal-add-to-cart");

    // Populate the modal with product data
    // ✅ تعديل: التعامل مع صورة واحدة أو عدة صور
    const imageSources = Array.isArray(productData.imageSrc)
      ? productData.imageSrc
      : [productData.imageSrc];

    // عرض الصورة الأولى كصورة رئيسية
    if (imageSources.length > 0) {
      modalImage.src = imageSources[0];
    }

    // مسح الصور المصغرة القديمة
    thumbnailsContainer.innerHTML = "";

    // إذا كان هناك أكثر من صورة، قم بإنشاء الصور المصغرة
    if (imageSources.length > 1) {
      imageSources.forEach((src) => {
        const thumb = document.createElement("img");
        thumb.src = src;
        thumb.alt = "صورة مصغرة للمنتج";
        // إضافة حدث النقر لتبديل الصورة الرئيسية
        thumb.addEventListener("click", () => {
          modalImage.src = src;
        });
        thumbnailsContainer.appendChild(thumb);
      });
    } else {
      // إذا كانت هناك صورة واحدة فقط، أخفِ حاوية الصور المصغرة
      thumbnailsContainer.style.display = "none";
    }

    productDescription.textContent =
      productData.description || "لا يوجد وصف متاح لهذا المنتج."; // ✅ إضافة: تعبئة الوصف
    itemQuantity.textContent = productData.availableQuantity;
    itemPrice.textContent = `${productData.pricePerItem} جنيه`;
    itemPrice.dataset.price = productData.pricePerItem; // Store price as a number
    sellerMessage.textContent = productData.sellerMessage;

    // Set max quantity for the input
    selectedQuantityInput.max = productData.availableQuantity;
    selectedQuantityInput.value = 1; // Reset to 1

    // --- Logic for quantity and total price ---
    function updateTotalPrice() {
      const price = parseFloat(itemPrice.dataset.price);
      const quantity = parseInt(selectedQuantityInput.value, 10);
      const total = price * quantity;
      totalPriceEl.textContent = `${total} جنيه`;
    }

    decreaseBtn.addEventListener("click", () => {
      if (selectedQuantityInput.value > 1) {
        selectedQuantityInput.value--;
        updateTotalPrice();
      }
    });

    increaseBtn.addEventListener("click", () => {
      const max = parseInt(selectedQuantityInput.max, 10);
      if (parseInt(selectedQuantityInput.value, 10) < max) {
        selectedQuantityInput.value++;
        updateTotalPrice();
      }
    });

    selectedQuantityInput.addEventListener("change", updateTotalPrice);
    addToCartBtn.addEventListener("click", () => {
      alert(`تمت إضافة ${selectedQuantityInput.value} قطعة إلى السلة!`);
    });

    // --- Show the modal and handle closing ---
    document.body.classList.add("modal-open"); // Prevent background scrolling
    productModal.style.display = "block";
    updateTotalPrice(); // Initial price calculation

    const closeProductModal = () => {
      productModal.style.display = "none";
      productModal.innerHTML = ""; // Clean up content
      document.body.classList.remove("modal-open"); // Re-enable scrolling
    };

    closeBtn.onclick = closeProductModal;
    window.addEventListener(
      "click",
      (event) => {
        if (event.target == productModal) {
          closeProductModal();
        }
      },
      { once: true }
    ); // Use 'once' to avoid multiple listeners
  }

  // 6. Main animation cycle function
  async function startAnimationCycle() {
    if (isAnimationRunning) return; // منع تشغيل دورات متعددة في نفس الوقت
    isAnimationRunning = true;

    // Hide the tagline at the very beginning of the cycle
    if (taglineElement.classList.contains("visible")) {
      taglineElement.classList.remove("visible");
      await wait(800); // انتظر حتى يختفي تمامًا
    }

    await showTextWithZoom(fullText);
    await hideText();
    await wait(200); // Short delay
    await showFinalText(shortText);
    await startTaglineCarousel();

    // استدعاء الدورة التالية باستخدام requestAnimationFrame لضمان سلاسة الأداء
    requestAnimationFrame(() => {
      isAnimationRunning = false;
      startAnimationCycle();
    });
  }

  // 7. Function to load and display categories
  async function loadCategories() {
    try {
      const response = await fetch("shared/list.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const categoriesGrid = document.getElementById("categories-grid");

      if (categoriesGrid && data.categories) {
        data.categories.forEach((category) => {
          // Create a container for the category and its subcategories
          const categoryItem = document.createElement("div");
          categoryItem.className = "category-item";

          // Create the header for the main category
          const categoryHeader = document.createElement("div");
          categoryHeader.className = "category-header";
          // Add the title and the Font Awesome icon directly
          // The icon will be controlled by CSS
          categoryHeader.innerHTML = `<h3>${category.title}</h3><i class="fas fa-chevron-down category-arrow-icon"></i>`;

          // Create the container for subcategories, initially hidden
          const subcategoryContainer = document.createElement("div");
          subcategoryContainer.className = "subcategory-container";

          // Populate subcategories if they exist
          if (category.subcategories && category.subcategories.length > 0) {
            category.subcategories.forEach((sub) => {
              const subCategoryLink = document.createElement("a");
              subCategoryLink.href = `pages/show.html?category=${category.id}&subcategory=${sub.id}`; // Link to a page with products
              subCategoryLink.className = "subcategory-item";
              subCategoryLink.textContent = sub.title;

              // Add a click event listener to handle navigation manually
              subCategoryLink.addEventListener("click", (event) => {
                // Prevent the link from navigating to a new page
                event.preventDefault();
              });
              subcategoryContainer.appendChild(subCategoryLink);
            });
          }

          // Add click event to the header to toggle subcategories
          categoryHeader.addEventListener("click", () => {
            categoryHeader.classList.toggle("active"); // Toggle active class on header for icon rotation
            // Close any other open subcategory lists
            document
              .querySelectorAll(".subcategory-container.active")
              .forEach((openContainer) => {
                if (openContainer !== subcategoryContainer) {
                  openContainer.classList.remove("active");
                  openContainer.style.maxHeight = null;
                  // قم أيضًا بإزالة الفئة 'active' من الهيدر المقابل له
                  const correspondingHeader =
                    openContainer.previousElementSibling;
                  if (
                    correspondingHeader &&
                    correspondingHeader.classList.contains("category-header")
                  ) {
                    correspondingHeader.classList.remove("active");
                  }
                }
              });

            // Toggle the current one
            subcategoryContainer.classList.toggle("active");
            if (subcategoryContainer.classList.contains("active")) {
              subcategoryContainer.style.maxHeight =
                subcategoryContainer.scrollHeight + "px";
            } else {
              subcategoryContainer.style.maxHeight = null;
            }
          });
          categoryItem.appendChild(categoryHeader);
          categoryItem.appendChild(subcategoryContainer);
          categoriesGrid.appendChild(categoryItem);
        });
      }
    } catch (error) {
      console.error("Could not load categories:", error);
    }
  }

  // --- Page Visibility Handling ---
  // Restart animation when the tab becomes visible again to prevent it from getting stuck.
  document.addEventListener("visibilitychange", () => {
    // Check if the page is visible and not hidden
    if (document.visibilityState === "visible") {
      // Restart the whole animation cycle to ensure it's in a clean state.
      startAnimationCycle();
    }
  });

  // Start the first cycle
  startAnimationCycle();

  // Load the gallery content immediately when the page loads
  loadPageContent("pages/adsPage.html");
  loadCategories(); // Load categories

  // Expose the function to the global scope so it can be called from adsPage.html
  window.showProductDetails = showProductDetailsModal;
});
