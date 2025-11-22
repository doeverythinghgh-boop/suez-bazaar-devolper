/**
 * @file js/main.js
 * @description هذا الملف هو نقطة الدخول الرئيسية للتطبيق ويحتوي على المنطق العام الذي يتم تنفيذه
 *   عند تحميل الصفحة. يتضمن ذلك:
 *   - تشغيل الرسوم المتحركة الافتتاحية للنص.
 *   - تحميل وعرض الفئات.
 *   - تهيئة حالة تسجيل الدخول والإشعارات.
 *   - تهيئة موديول الإعلانات وموديول البحث.
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const animatedTextElement = document.getElementById("animated-text");
  const taglineElement = document.getElementById("tagline");

  // --- Animation Configuration ---
  const fullText = "Suez Bazaar";
  const shortText = "SB";
  const letterAppearDelay = 100; // Delay between each letter appearing
  let isAnimationRunning = false; // متغير لتتبع حالة الرسوم المتحركة

  // دالة مساعدة للانتظار، مُحسّنة للرسوم المتحركة
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  /**
   * @description تعرض نصًا محددًا بحركة تكبير تدريجية لكل حرف.
   *   تُستخدم للرسوم المتحركة الافتتاحية للنص.
   * @function showTextWithZoom
   * @param {string} text - النص المراد عرضه بالرسوم المتحركة.
   * @returns {Promise<void>} - وعد (Promise) يتم حله بعد اكتمال الرسوم المتحركة ووقت الانتظار الإضافي.
   */
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

  /**
   * @description تخفي النص المعروض حاليًا.
   * @function hideText
   * @returns {Promise<void>} - وعد (Promise) يتم حله بعد فترة تأخير تتوافق مع مدة تأثير الاختفاء.
   */
  async function hideText() {
    return new Promise((resolve) => {
      wait(500).then(resolve); // يتوافق مع مدة تأثير الاختفاء
    });
  }

  /**
   * @description تعرض النص النهائي (مثل "SB") وتطبق التنسيقات النهائية عليه.
   * @function showFinalText
   * @param {string} text - النص النهائي المراد عرضه.
   * @returns {Promise<void>} - وعد (Promise) يتم حله فور عرض النص النهائي.
   */
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

  /**
   * @description تبدأ عرضًا متسلسلاً (carousel) للجمل التسويقية (taglines)،
   *   حيث يتم التبديل بينها بتأثيرات تلاشي وظهور.
   * @function startTaglineCarousel
   * @returns {Promise<void>} - وعد (Promise) يتم حله بعد انتهاء عرض جميع الجمل وتلاشي الجملة الأخيرة.
   */
  async function startTaglineCarousel() {
    return new Promise(async (resolve) => {
      const sentences = [
        "بازار السويس... فرصة واحدة تجمع كل الفرص",
        "اكتشف آلاف المنتجات من موردين موثوقين في السويس",
        "تابع طلبك حتى باب منزلك",
        "عروض وخصومات حصرية من الموردين",
        "جودة مضمونة وتقييم شفاف من المشترين",
        "من المورد للمستهلك مباشرة جودة وسعر أفضل",
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

  /**
   * @description تقوم بتحميل محتوى صفحة HTML من عنوان URL محدد وتعرضه داخل عنصر نائب (`contentPlaceholder`).
   *   تنفذ أي سكربتات مضمنة في المحتوى المحمل بطريقة آمنة.
   * @function loadPageContent
   * @param {string} url - عنوان URL لصفحة HTML المراد تحميلها.
   * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
   * @throws {Error} - إذا فشل تحميل المحتوى من عنوان URL.
   */
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
  
      // Place the content into our placeholder and make it visible
      contentPlaceholder.innerHTML = text;
  
      // ✅ تحسين: تنفيذ السكريبتات المضمنة بطريقة أكثر أمانًا
      const scripts = contentPlaceholder.querySelectorAll("script");
      scripts.forEach(script => {
        const newScript = document.createElement("script");
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript).remove(); // A trick to execute the script
      });
    } catch (error) {
      console.error("Could not load page content:", error);
    }
  }

  /**
   * @description تبدأ دورة الرسوم المتحركة الرئيسية للنص، بما في ذلك عرض النص الكامل، إخفائه،
   *   عرض النص النهائي، وبدء عرض الجمل التسويقية المتسلسل.
   * @function startAnimationCycle
   * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال، ولكنه يعيد تشغيل الدورة بشكل متكرر.
   * @see showTextWithZoom
   * @see hideText
   * @see showFinalText
   * @see startTaglineCarousel
   */
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

  /**
   * @description تقوم بتحميل بيانات الفئات من ملف `shared/list.json` وتعرضها في واجهة المستخدم
   *   على شكل قائمة قابلة للطي تحتوي على فئات رئيسية وفئات فرعية.
   * @function loadCategories
   * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
   * @throws {Error} - إذا فشل تحميل بيانات الفئات.
   */
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
    if (document.visibilityState === "visible") {
      startAnimationCycle();
    }
  });

  // ✅ جديد: تهيئة المكونات الرئيسية بعد تحميل الصفحة
  console.log('%c[DOM] اكتمل تحميل محتوى الصفحة (DOMContentLoaded).', 'color: green; font-weight: bold;');
  startAnimationCycle(); // تشغيل الأنيميشن
  checkLoginStatus();
  initializeNotifications();
  loadCategoriesAsTable(); // ✅ جديد: استدعاء دالة تحميل الفئات من index.html
  updateCartBadge(); // تحديث شارة السلة
  window.addEventListener('cartUpdated', updateCartBadge); // الاستماع لتحديثات السلة
  if (typeof initSearchModal === 'function') {
    console.log('[DOM] جاري تهيئة نافذة البحث...');
    initSearchModal('search-modal-container', 'search-icon-btn');
  }
  if (typeof initAdverModule === 'function') {
    initAdverModule('advertisement-section');
  }
});
