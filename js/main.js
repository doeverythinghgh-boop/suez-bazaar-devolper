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
      // ✅ إصلاح: إعادة تعيين كاملة للحالة الأصلية
      animatedTextElement.innerHTML = ""; // مسح المحتوى السابق
      animatedTextElement.classList.remove("final-text"); // إزالة الـ class الخاص بالحالة النهائية

      const container = animatedTextElement.parentElement;
      container.style.justifyContent = "center"; // إعادة المحاذاة إلى الوسط
      container.style.direction = "ltr"; // إعادة اتجاه النص إلى LTR لاسم "Suez Bazaar"

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
      wait(500).then(resolve); // يتوافق مع مدة تأثير الاختفاء
    });
  }

  // 3. Function to show the final "SB" text
  async function showFinalText(text) {
    return new Promise((resolve) => {
      animatedTextElement.innerHTML = text;
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

      // ✅ إصلاح: إعادة إظهار العنصر قبل بدء عرض الجمل
      taglineElement.style.display = 'block'; // أو 'inline' حسب التصميم

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

  // 6. Main animation cycle function
  async function startAnimationCycle() {
    if (isAnimationRunning) return; // منع تشغيل دورات متعددة في نفس الوقت
    isAnimationRunning = true;

    // ✅ إصلاح: إخفاء الشعار بالكامل (وليس فقط جعله شفافًا)
    // هذا يمنع العنصر من التأثير على محاذاة العنوان الرئيسي في الدورة الجديدة
    if (taglineElement.classList.contains("visible")) {
      taglineElement.classList.remove("visible"); // إزالة الشفافية
    }
    taglineElement.style.display = 'none'; // إخفاء العنصر تمامًا
    await wait(800); // انتظار حتى يكتمل تأثير الاختفاء إذا كان موجودًا

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

  // The `window.showProductDetails` function is already defined globally in `js/turo.js`.
  // We don't need to redefine it here.
});
