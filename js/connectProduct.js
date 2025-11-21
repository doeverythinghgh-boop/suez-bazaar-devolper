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
 * يضيف منتجًا جديدًا إلى قاعدة البيانات عبر استدعاء الواجهة البرمجية (API).
 * @param {object} productData - كائن يحتوي على جميع بيانات المنتج المراد إضافته.
 * @returns {Promise<Object>} كائن يحتوي على بيانات المنتج الذي تم إنشاؤه، أو كائن خطأ في حالة الفشل.
 */
async function addProduct(productData) {
  return await apiFetch('/api/products', {
    method: 'POST',
    body: productData,
  });
}

/**
 * يحدث بيانات منتج موجود في قاعدة البيانات عبر الواجهة البرمجية.
 * @param {object} productData - بيانات المنتج المحدثة. يجب أن يحتوي الكائن على `product_key`.
 * @returns {Promise<Object>} الكائن الذي تم تحديثه، أو كائن خطأ في حالة الفشل.
 */
async function updateProduct(productData) {
  return await apiFetch('/api/products', {
    method: 'PUT',
    body: productData,
  });
}

/**
 * يحذف منتجًا موجودًا من قاعدة البيانات عبر الواجهة البرمجية.
 * @param {string} productKey - المفتاح الفريد للمنتج المراد حذفه.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function deleteProduct(productKey) {
  return await apiFetch(`/api/products?product_key=${productKey}`, {
    method: 'DELETE',
  });
}

/**
 * يجلب قائمة المنتجات بناءً على الفئة الرئيسية والفرعية المحددة.
 * @param {string} mainCatId - معرف الفئة الرئيسية.
 * @param {string} subCatId - معرف الفئة الفرعية.
 * @returns {Promise<Array|null>} مصفوفة من المنتجات أو null في حالة الفشل.
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
 * يجلب جميع المنتجات التي أضافها مستخدم معين (بائع).
 * @param {string} userKey - المفتاح الفريد للمستخدم (user_key).
 * @returns {Promise<Array|null>} مصفوفة من المنتجات أو null في حالة الفشل.
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
 * يجلب بيانات منتج واحد بناءً على مفتاحه الفريد.
 * @param {string} productKey - المفتاح الفريد للمنتج.
 * @returns {Promise<Object|null>} كائن المنتج أو null في حالة الفشل.
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
 * يعرض نافذة منبثقة (Modal) تحتوي على تفاصيل المنتج.
 * @param {object} productData - بيانات المنتج الكاملة.
 * @param {function} [onCloseCallback] - دالة اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @param {object} [options] - خيارات إضافية للتحكم في عرض النافذة.
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

  // تحميل محتوى النافذة المنبثقة من ملف HTML خارجي.
  try {
    console.log("[Modal] Fetching showProduct.html content...");
    const response = await fetch("pages/showProduct.html");
    if (!response.ok)
      throw new Error(`فشل تحميل محتوى النافذة (status: ${response.status})`);
    modal.innerHTML = await response.text();
    // بعد تحميل المحتوى بنجاح، يتم استدعاء دالة `populateProductDetails`
    // لتعبئة البيانات وربط الأحداث بالعناصر الجديدة.
    populateProductDetails(productData, onCloseCallback, options);
  } catch (error) {
    console.error("[Modal] Failed to fetch or render showProduct.html:", error);
    Swal.fire(
      "خطأ في التحميل",
      "حدث خطأ أثناء محاولة تحميل تفاصيل المنتج. يرجى المحاولة مرة أخرى.",
      "error"
    ).then(() => {
      // استدعاء دالة رد الاتصال إذا فشل تحميل محتوى النافذة.
      if (typeof onCloseCallback === "function") onCloseCallback();
    });
    return; // إيقاف التنفيذ
  }

  // تعبئة اسم المنتج في عنوان النافذة.
  document.getElementById("product-modal-name").textContent =
    productData.productName || "تفاصيل المنتج";

  // إظهار النافذة المنبثقة وإضافة فئة للجسم لمنع التمرير في الخلفية.
  modal.style.display = "block";
  document.body.classList.add("modal-open");
}

/**
 * يملأ تفاصيل المنتج في النافذة المنبثقة ويربط الأحداث اللازمة.
 * @param {object} productData - بيانات المنتج الكاملة.
 * @param {function} [onCloseCallback] - دالة اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @param {object} [options] - خيارات إضافية مثل إخفاء زر "إضافة للسلة".
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
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

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
          window.location.href = "login.html"; // توجيه المستخدم لصفحة تسجيل الدخول
        }
      });
    }
  });
}
