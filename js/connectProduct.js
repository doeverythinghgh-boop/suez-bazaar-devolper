/**
 * @file js/connectProduct.js
 * @description طبقة الاتصال بالواجهة البرمجية (API) الخاصة بالمنتجات، ومنطق عرض تفاصيل المنتج.
 *
 * هذا الملف يحتوي على مجموعة من الدوال غير المتزامنة (async functions) التي تسهل عملية
 * التعامل مع المنتجات، بما في ذلك إضافتها، تحديثها، حذفها، وجلبها من قاعدة البيانات.
 * كما يحتوي على المنطق الخاص بعرض نافذة تفاصيل المنتج المنبثقة وتعبئتها بالبيانات.
 * يعتمد على متغير `baseURL` العام الذي يجب تعريفه في `js/config.js`.
 */

/**
 * @description يضيف منتجًا جديدًا إلى قاعدة البيانات عبر استدعاء الواجهة البرمجية (API).
 * @function addProduct
 * @param {object} productData - كائن يحتوي على جميع بيانات المنتج المراد إضافته.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن بيانات المنتج الذي تم إنشاؤه، أو كائن خطأ في حالة الفشل.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function addProduct(productData) {
  return await apiFetch('/api/products', {
    method: 'POST',
    body: productData,
  });
}

/**
 * @description يحدث بيانات منتج موجود في قاعدة البيانات عبر الواجهة البرمجية (API).
 * @function updateProduct
 * @param {object} productData - كائن يحتوي على بيانات المنتج المحدثة. يجب أن يحتوي الكائن على `product_key` لتحديد المنتج المراد تحديثه.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على الكائن الذي تم تحديثه، أو كائن خطأ في حالة الفشل.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function updateProduct(productData) {
  return await apiFetch('/api/products', {
    method: 'PUT',
    body: productData,
  });
}

/**
 * @description يحذف منتجًا موجودًا من قاعدة البيانات عبر الواجهة البرمجية (API).
 * @function deleteProduct
 * @param {string} productKey - المفتاح الفريد للمنتج المراد حذفه.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن الاستجابة من الخادم.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function deleteProduct_(productKey) {
  return await apiFetch(`/api/products?product_key=${productKey}`, {
    method: 'DELETE',
  });
}

/**
 * @description يجلب قائمة المنتجات بناءً على الفئة الرئيسية والفرعية المحددة من واجهة برمجة التطبيقات (API).
 * @function getProductsByCategory
 * @param {string} mainCatId - معرف الفئة الرئيسية للمنتجات المراد جلبها.
 * @param {string} subCatId - معرف الفئة الفرعية للمنتجات المراد جلبها.
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات المنتجات، أو `null` في حالة الفشل.
 * @throws {Error} - إذا كان `baseURL` غير معرف، أو فشل جلب البيانات من API.
 * @see apiFetch
 * @see baseURL
 */
async function getProductsByCategory(mainCatId, subCatId) {
  try {
    // التحقق من وجود متغير baseURL لضمان أن الإعدادات تم تحميلها بشكل صحيح.
    if (typeof baseURL === "undefined" || !baseURL) {
      console.error(
        "%c[API-Debug] متغير baseURL غير معرف أو فارغ!",
        "color: red; font-weight: bold;"
      );
      throw new Error("baseURL is not defined"); // إيقاف التنفيذ إذا كان المتغير غير موجود.
    }
    // استخدام URLSearchParams لإنشاء رابط الاستعلام بطريقة آمنة وصحيحة.
    // هذا يضمن عدم إرسال قيم 'null' أو 'undefined' كجزء من الرابط.
    const params = new URLSearchParams();
    if (mainCatId) {
      params.append("MainCategory", mainCatId);
    }
    if (subCatId) {
      params.append("SubCategory", subCatId);
    }
    const data = await apiFetch(`/api/products?${params.toString()}`);
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    // تسجيل أي خطأ وإرجاع `null`.
    console.error(
      "%c[getProductsByCategory] failed:",
      "color: red;",
      error
    );
    return null;
  }
}

/**
 * @description يجلب جميع المنتجات التي أضافها مستخدم معين (بائع) من واجهة برمجة التطبيقات (API).
 * @function getProductsByUser
 * @param {string} userKey - المفتاح الفريد للمستخدم (`user_key`) البائع الذي نريد جلب منتجاته.
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات المنتجات، أو `null` في حالة الفشل.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function getProductsByUser(userKey) {
  try {
    const data = await apiFetch(`/api/products?user_key=${userKey}`);
    return data.error ? null : data;
  } catch (error) {
    console.error("%c[getProductsByUser] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يجلب بيانات منتج واحد بناءً على مفتاحه الفريد من واجهة برمجة التطبيقات (API).
 * @function getProductByKey
 * @param {string} productKey - المفتاح الفريد للمنتج المراد جلبه.
 * @returns {Promise<Object|null>} - وعد (Promise) يحتوي على كائن المنتج، أو `null` إذا لم يتم العثور على المنتج أو حدث خطأ.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function getProductByKey(productKey) {
  try {
    const data = await apiFetch(`/api/products?product_key=${productKey}&single=true`, {
      specialHandlers: {
        404: () => {
          console.warn("[API] getProductByKey: Product not found (404).");
          return null;
        }
      }
    });
    return data;
  } catch (error) {
    console.error("%c[getProductByKey] failed:", "color: red;", error);
    return null;
  }
}
 
/**
 * @description يعرض نافذة منبثقة (Modal) تحتوي على تفاصيل المنتج.
 *   يتحقق من بيانات الفئة الأساسية للمنتج قبل العرض ويقوم بتحميل قالب عرض المنتج.
 * @function showProductDetails
 * @param {object} productData - كائن يحتوي على جميع بيانات المنتج الكاملة لعرضها.
 * @param {function(): void} [onCloseCallback] - دالة رد اتصال اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @param {object} [options={}] - خيارات إضافية للتحكم في عرض النافذة، مثل `showAddToCart`.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @async
 * @throws {Error} - If `productData` is missing category information, or `loadAndShowModal` fails.
 * @see loadAndShowModal
 * @see populateProductDetails
 */
async function showProductDetails(productData, onCloseCallback, options = {}) {
  // التحقق من وجود بيانات الفئة الرئيسية والفرعية، وهي ضرورية لعرض التفاصيل بشكل صحيح.
  if (!productData.MainCategory || !productData.SubCategory) {
    console.error(
      "[Modal] Missing category data. Cannot open product details.",
      productData
    );
    Swal.fire(
      "خطأ في البيانات",
      "لا يمكن عرض تفاصيل المنتج لعدم توفر معلومات الفئة.",
      "error"
    );
    // استدعاء دالة رد الاتصال (إذا كانت موجودة) لإعلام الجزء الذي استدعى الدالة بأن العملية فشلت.
    if (typeof onCloseCallback === "function") onCloseCallback();
    return; // إيقاف التنفيذ
  }

  console.log(
    "%c[Modal] Opening product details modal for:",
    "color: darkcyan",
    productData.productName
  );
  const modal = document.getElementById("product-details-modal");
  await loadAndShowModal(
    "product-details-modal",
    "pages/showProduct.html",
    () => {
      populateProductDetails(productData, onCloseCallback, options);
      document.getElementById("product-modal-name").textContent = productData.productName || "تفاصيل المنتج";
    },
    onCloseCallback
  );
}

/**
 * @description يملأ تفاصيل المنتج في النافذة المنبثقة ويربط الأحداث اللازمة للتحكم في الكمية والإضافة إلى السلة.
 *   تتعامل مع عرض الصور، الأسعار، رسائل البائع، وتظهر أو تخفي حقول معينة بناءً على نوع المنتج وخيارات العرض.
 * @function populateProductDetails
 * @param {object} productData - كائن يحتوي على جميع بيانات المنتج الكاملة لملء تفاصيل النافذة.
 * @param {function(): void} [onCloseCallback] - دالة رد اتصال اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @param {object} [options={}] - خيارات إضافية للتحكم في عرض النافذة، مثل `showAddToCart`.
 * @returns {void}
 * @see SERVICE_CATEGORY_NoPrice_ID
 * @see getCurrentUser
 * @see addToCart
 */
function populateProductDetails(productData, onCloseCallback, options = {}) {
  // تعبئة الوصف ورسالة البائع.
  document.getElementById("product-modal-description").textContent =
    productData.description || "لا يوجد وصف متاح.";
  document.getElementById("product-modal-seller-message").textContent =
    productData.sellerMessage || "لا توجد رسالة من البائع.";

  // ✅ جديد: إخفاء حقول السعر والكمية إذا كانت الفئة هي "الخدمات العامة" (id=6)
  const isServiceCategory =
    productData.MainCategory == SERVICE_CATEGORY_NoPrice_ID; // `SERVICE_CATEGORY_NoPrice_ID` معرف في utils.js
  // الوصول إلى عناصر DOM التي قد يتم إخفاؤها.
  const quantityContainer = document.getElementById(
    "product-modal-quantity-container"
  );
  const priceContainer = document.getElementById(
    "product-modal-price-container"
  );
  const cartActionsContainer = document.getElementById(
    "product-modal-cart-actions"
  );

  // التحقق مما إذا كان يجب إظهار زر "إضافة إلى السلة". يكون ظاهرًا افتراضيًا.
  const showAddToCart = options.showAddToCart !== false; // يكون true افتراضيًا

  // منطق إظهار أو إخفاء الأقسام بناءً على نوع المنتج والخيارات.
  if (isServiceCategory) {
    // إذا كان المنتج خدمة، أخفِ كل ما يتعلق بالسعر والكمية والسلة.
    quantityContainer.style.display = "none";
    priceContainer.style.display = "none";
    cartActionsContainer.style.display = "none";
  } else if (!showAddToCart) {
    // إذا كان الخيار `showAddToCart` هو `false`، أخفِ قسم السلة فقط.
    cartActionsContainer.style.display = "none";
  } else {
    quantityContainer.style.display = "block";
    priceContainer.style.display = "block";
    // تأكد من إظهار حاوية السلة إذا لم تكن هناك إشارة لإخفائها.
    cartActionsContainer.style.display = "block";
    document.getElementById("product-modal-quantity").textContent =
      productData.availableQuantity;
    document.getElementById(
      "product-modal-price"
    ).textContent = `${productData.pricePerItem} جنيه`;
  }

  // تعبئة معرض الصور (الصورة الرئيسية والصور المصغرة).
  const mainImage = document.getElementById("product-modal-image");
  const thumbnailsContainer = document.getElementById(
    "product-modal-thumbnails"
  );
  console.log("[Modal] Populating product data and images.");
  mainImage.src = productData.imageSrc[0]; // عرض الصورة الأولى كصورة رئيسية.
  thumbnailsContainer.innerHTML = ""; // مسح الصور المصغرة القديمة
  productData.imageSrc.forEach((src) => {
    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.onclick = () => { // عند النقر على صورة مصغرة، يتم تحديث الصورة الرئيسية.
      mainImage.src = src;
    };
    // ✅ إصلاح: التعامل مع فشل تحميل الصور بسبب مشاكل الشبكة
    thumb.onerror = () => {
      console.warn("[Modal] Thumbnail image failed to load:", src);
      // استبدال الصورة الفاشلة بعنصر نائب مع زر إعادة المحاولة
      const placeholder = document.createElement("div");
      placeholder.className = "image-load-error-placeholder";
      placeholder.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>فشل تحميل الصورة</span>
      `;
      thumb.replaceWith(placeholder);
    };
    thumbnailsContainer.appendChild(thumb);
  });

  // عرض السعر قبل الخصم إذا كان موجودًا وأكبر من السعر الحالي.
  const originalPriceContainer = document.getElementById(
    "product-modal-original-price-container"
  );
  const originalPriceEl = document.getElementById(
    "product-modal-original-price"
  );
  // التحقق من وجود القيم قبل المقارنة لتجنب الأخطاء.
  const originalPrice = productData.original_price
    ? parseFloat(productData.original_price)
    : 0;
  // إظهار السعر الأصلي فقط إذا لم تكن خدمة.
  if (!isServiceCategory) {
    const currentPrice = productData.pricePerItem
      ? parseFloat(productData.pricePerItem)
      : 0;
    if (originalPrice > 0 && originalPrice !== currentPrice) {
      console.log("[Modal] Displaying original price.");
      originalPriceEl.textContent = `${originalPrice.toFixed(2)} جنيه`;
      originalPriceContainer.style.display = "block"; // إظهار الحاوية بأكملها
    } else {
      console.log("[Modal] Hiding original price.");
      originalPriceContainer.style.display = "none"; // إخفاء الحاوية بأكملها
      originalPriceEl.textContent = "";
    }
  }

  const modal = document.getElementById("product-details-modal");
  // وظيفة لإغلاق النافذة المنبثقة.
  const closeModal = () => {
    console.log("[Modal] Closing product details modal.");
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    // استدعاء دالة رد الاتصال عند الإغلاق (إذا تم تمريرها).
    if (typeof onCloseCallback === "function") { 
      onCloseCallback();
    }
  };
  document.getElementById("product-modal-close-btn").onclick = closeModal;
  window.onclick = (event) => {
    if (event.target == modal) closeModal();
  };

  // --- منطق التحكم بالكمية والسعر الإجمالي ---
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

  // لا تقم بتهيئة عناصر التحكم بالكمية إذا كانت من فئة الخدمات أو إذا كان زر السلة مخفيًا.
  if (isServiceCategory || !showAddToCart) {
    // لا تفعل شيئًا، فقد تم إخفاء الحاوية بالفعل
    return;
  }

  console.log("[Modal] Initializing quantity controls.");
  // تعيين الحد الأقصى للكمية
  selectedQuantityInput.max = productData.availableQuantity;

  // دالة لتحديث السعر الإجمالي بناءً على الكمية المحددة.
  function updateTotalPrice() {
    const price = parseFloat(productData.pricePerItem);
    const quantity = parseInt(selectedQuantityInput.value, 10);
    const total = price * quantity;
    totalPriceEl.textContent = `${total.toFixed(2)} جنيه`;
  }

  // إضافة الأحداث لأزرار زيادة وإنقاص الكمية.
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
  updateTotalPrice(); // حساب السعر المبدئي عند فتح النافذة لأول مرة.

  // --- منطق إضافة المنتج إلى السلة ---
  const addToCartBtn = document.getElementById("product-modal-add-to-cart");
  addToCartBtn.addEventListener("click", () => {
    // التحقق مما إذا كان المستخدم قد سجل دخوله (وليس ضيفًا).
    const loggedInUser = getCurrentUser();

    if (loggedInUser && !loggedInUser.is_guest) {
      console.log("[Modal] Add to cart button clicked by a registered user.");
      // إذا كان المستخدم مسجلاً، استمر في عملية الإضافة للسلة.
      const quantity = parseInt(
        document.getElementById("product-modal-selected-quantity").value,
        10
      );
      const productInfoForCart = {
        product_key: productData.product_key,
        productName: productData.productName, // اسم المنتج
        price: productData.pricePerItem, // استخدام السعر الصحيح (pricePerItem)
        original_price: productData.original_price, // تمرير السعر قبل الخصم
        image: productData.imageSrc[0], // استخدام الصورة الأولى كصورة للسلة
        seller_key: productData.user_key, // تضمين مفتاح البائع لإرسال الإشعارات لاحقًا
      };
      addToCart(productInfoForCart, quantity);
    } else {
      // هذا الشرط سيتحقق إذا كان المستخدم ضيفًا أو لم يسجل دخوله على الإطلاق.
      console.warn(
        "[Modal] Add to cart button clicked by guest or non-logged-in user. Prompting for login/registration."
      );
      // إذا لم يكن المستخدم مسجلاً، أظهر رسالة تنبيه تدعوه لتسجيل الدخول.
      Swal.fire({
        icon: "info",
        title: "يجب تسجيل الدخول",
        text: "لإضافة منتجات إلى السلة، يرجى تسجيل الدخول أولاً.",
        showCancelButton: true,
        confirmButtonText: "تسجيل الدخول",
        cancelButtonText: "إلغاء",
      }).then((result) => {
        if (result.isConfirmed) {
          console.log("[Modal] User chose to log in. Redirecting...");
                    mainLoader("./pages/login.html","index-user-container",0,undefined,"hiddenLoginIcon",true  );

        }
      });
    }
  });
}
