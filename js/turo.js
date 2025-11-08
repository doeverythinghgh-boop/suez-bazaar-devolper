
/**
 * @file js/turo.js
 * @description طبقة الاتصال بالواجهة البرمجية (API Service Layer).
 * 
 * هذا الملف يحتوي على مجموعة من الدوال غير المتزامنة (async functions) التي تسهل عملية
 * إرسال واستقبال البيانات من نقاط النهاية (API endpoints) الخاصة بالمشروع.
 * كل دالة هنا تتوافق مع عملية محددة مثل جلب المستخدمين، إضافة منتج، أو تحديث البيانات.
 * يعتمد على متغير `baseURL` العام الذي يجب تعريفه في `js/config.js`.
 */
/**
 * يجلب بيانات المستخدمين من واجهة برمجة التطبيقات (API).
 * ملاحظة: هذه الدالة تعتمد على متغير عام `baseURL` يجب تعريفه في ملف آخر مثل `config.js`.
 * @returns {Promise<Object|null>} كائن يحتوي على بيانات المستخدمين أو null في حالة حدوث خطأ
 */
async function fetchUsers() {
  try {
    // إرسال طلب لجلب البيانات من الرابط المحدد
    const response = await fetch(`${baseURL}/api/users`);

    // التحقق مما إذا كان الطلب ناجحًا (status code in the range 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // تحويل الاستجابة إلى كائن JSON وإرجاعها
    const data = await response.json();
    console.log("تم جلب بيانات المستخدمين بنجاح.", data);
    return data;

  } catch (error) {
    // في حالة حدوث أي خطأ أثناء جلب البيانات، يتم طباعته هنا
    console.error("فشل جلب بيانات المستخدمين:", error);
    return null; // إرجاع null للإشارة إلى فشل العملية
  }
}

/**
 * يضيف مستخدمًا جديدًا عبر واجهة برمجة التطبيقات (API).
 * @param {object} userData - بيانات المستخدم المراد إضافته.
 * @param {string} userData.username - اسم المستخدم.
 * @param {string} userData.phone - رقم هاتف المستخدم.
 * @param {string} [userData.password] - كلمة المرور (اختياري).
 * @param {string} [userData.address] - العنوان (اختياري).
 * @param {string} userData.user_key - الرقم التسلسلي الفريد للمستخدم.
 * @returns {Promise<Object|null>} الكائن الذي تم إنشاؤه أو null في حالة الفشل.
 */
async function addUser(userData) {
  try {
    const response = await fetch(`${baseURL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    // قراءة الاستجابة كـ JSON بغض النظر عن حالة النجاح
    const data = await response.json();

    if (!response.ok) {
      // إذا كان هناك خطأ، استخدم رسالة الخطأ من الخادم
      // وقم بإرجاعها ليتم التعامل معها في الواجهة الأمامية
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log("تمت إضافة المستخدم بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في إضافة المستخدم:", error);
    // إرجاع كائن خطأ عام في حالة فشل الشبكة أو أخطاء أخرى
    return { error: "فشل الاتصال بالخادم." };
  }
}

/**
 * يضيف منتجًا جديدًا إلى قاعدة البيانات عبر واجهة برمجة التطبيقات.
 * @param {object} productData - بيانات المنتج المراد إضافته.
 * @returns {Promise<Object|null>} الكائن الذي تم إنشاؤه أو null في حالة الفشل.
 */
async function addProduct(productData) {
  try {
    const response = await fetch(`${baseURL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log("تمت إضافة المنتج بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في إضافة المنتج:", error);
    return { error: "فشل الاتصال بالخادم عند إضافة المنتج." };
  }
}

/**
 * يحدث بيانات منتج موجود عبر واجهة برمجة التطبيقات.
 * @param {object} productData - بيانات المنتج المحدثة.
 * @returns {Promise<Object|null>} الكائن الذي تم تحديثه أو null في حالة الفشل.
 */
async function updateProduct(productData) {
  try {
    const response = await fetch(`${baseURL}/api/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log("تم تحديث المنتج بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في تحديث المنتج:", error);
    return { error: "فشل الاتصال بالخادم عند تحديث المنتج." };
  }
}

/**
 * يجلب المنتجات بناءً على الفئة الرئيسية والفرعية.
 * @param {string} mainCatId - معرف الفئة الرئيسية.
 * @param {string} subCatId - معرف الفئة الفرعية.
 * @returns {Promise<Array|null>} مصفوفة من المنتجات أو null في حالة الفشل.
 */
async function getProductsByCategory(mainCatId, subCatId) {
  try {
    const response = await fetch(`${baseURL}/api/products?MainCategory=${mainCatId}&SubCategory=${subCatId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("فشل في جلب المنتجات حسب الفئة:", error);
    return null;
  }
}

/**
 * يجلب جميع المنتجات الخاصة بمستخدم معين عبر واجهة برمجة التطبيقات.
 * @param {string} userKey - المفتاح الفريد للمستخدم (user_key).
 * @returns {Promise<Array|null>} مصفوفة من المنتجات أو null في حالة الفشل.
 */
async function getProductsByUser(userKey) {
  try {
    const response = await fetch(`${baseURL}/api/products?user_key=${userKey}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("تم جلب منتجات المستخدم بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في جلب منتجات المستخدم:", error);
    return null;
  }
}

/**
 * تحديث بيانات عدة مستخدمين (مثل حالة البائع).
 * @param {Array<Object>} updates - مصفوفة من الكائنات تحتوي على بيانات التحديث.
 * @returns {Promise<Object|null>}
 */
async function updateUsers(updates) {
  try {
    const response = await fetch(`${baseURL}/api/users`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log("تم تحديث المستخدمين بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في تحديث المستخدمين:", error);
    return { error: "فشل الاتصال بالخادم." };
  }
}

/**
 * يحدث بيانات مستخدم واحد.
 * @param {object} userData - بيانات المستخدم للتحديث (يجب أن تحتوي على user_key).
 * @returns {Promise<Object>}
 */
async function updateUser(userData) {
  try {
    const response = await fetch(`${baseURL}/api/users`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log("تم تحديث المستخدم بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في تحديث المستخدم:", error);
    return { error: "فشل الاتصال بالخادم." };
  }
}
/**
 * يجلب بيانات مستخدم معين عن طريق رقم الهاتف.
 * @param {string} phone - رقم هاتف المستخدم للبحث عنه.
 * @returns {Promise<Object|null>} كائن يحتوي على بيانات المستخدم (الاسم، الهاتف، user_key، حالة البائع) أو null إذا لم يتم العثور عليه أو في حالة حدوث خطأ.
 */
async function getUserByPhone(phone) {
  try {
    // بناء الرابط مع رقم الهاتف كمعامل استعلام
    const response = await fetch(`${baseURL}/api/users?phone=${phone}`);

    // إذا كان المستخدم غير موجود (404)، لا تعتبره خطأ فادحًا، بل أرجع null
    if (response.status === 404) {
      console.log("المستخدم غير موجود.");
      return null;
    }

    // التحقق من نجاح الطلب
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // تحويل الاستجابة إلى JSON وإرجاعها
    return await response.json();
  } catch (error) {
    console.error("فشل في جلب المستخدم عن طريق رقم الهاتف:", error);
    return null; // إرجاع null للإشارة إلى فشل العملية
  }
}

/**
 * يتحقق من صحة كلمة المرور للمستخدم.
 * @param {string} phone - رقم هاتف المستخدم.
 * @param {string} password - كلمة المرور للتحقق منها.
 * @returns {Promise<Object|null>} كائن بيانات المستخدم عند النجاح، أو كائن خطأ عند الفشل.
 */
async function verifyUserPassword(phone, password) {
  try {
    const response = await fetch(`${baseURL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: 'verify', phone, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // إذا كان هناك خطأ، استخدم رسالة الخطأ من الخادم
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log("تم التحقق من المستخدم بنجاح:", data);
    return data;
  } catch (error) {
    console.error("فشل في التحقق من المستخدم:", error);
    return { error: "فشل الاتصال بالخادم." };
  }
}

/**
 * جديد: ينشئ طلبًا جديدًا في قاعدة البيانات.
 * @param {object} orderData - بيانات الطلب.
 * @param {string} orderData.order_key - المفتاح الفريد للطلب.
 * @param {string} orderData.user_key - مفتاح المستخدم.
 * @param {number} orderData.total_amount - المبلغ الإجمالي.
 * @param {Array<object>} orderData.items - مصفوفة عناصر السلة.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function createOrder(orderData) {
  try {
    const response = await fetch(`${baseURL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    return data;
  } catch (error) {
    console.error("فشل في إنشاء الطلب (مشكلة في الاتصال أو CORS):", error);
    return { error: "فشل الاتصال بالخادم عند إنشاء الطلب." };
  }
}

/**
 * جديد: يجلب سجل مشتريات المستخدم.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 * @returns {Promise<Array|null>} مصفوفة من عناصر المشتريات أو null في حالة الفشل.
 */
async function getUserPurchases(userKey) {
  try {
    const response = await fetch(`${baseURL}/api/purchases?user_key=${userKey}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("تم جلب سجل المشتريات بنجاح:", data);
    return data;

  } catch (error) {
    console.error("فشل في جلب سجل المشتريات:", error);
    return null;
  }
}

/**
 * يرسل إشعارًا إلى توكن جهاز معين.
 * @param {string} token - توكن FCM الخاص بالجهاز.
 * @param {string} title - عنوان الإشعار.
 * @param {string} body - نص الإشعار.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function sendNotification(token, title, body) {
  try {
    const response = await fetch(`${baseURL}/api/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title, body }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    return data;
  } catch (error) {
    console.error("فشل في إرسال الإشعار (مشكلة في الاتصال):", error);
    return { error: "فشل الاتصال بخادم الإشعارات." };
  }
}

/**
 * @file js/turo.js
 * @description ... (بقية الوصف كما هو)
 * ... (بقية الدوال كما هي)
 */

// ... (الكود السابق للدوال الأخرى)

/**
 * يعرض نافذة منبثقة تحتوي على تفاصيل المنتج.
 * @param {object} productData - بيانات المنتج الكاملة.
 */
window.showProductDetails = async function(productData) {
  const modal = document.getElementById("product-details-modal");

  // تحميل محتوى النافذة من الملف
  const response = await fetch("pages/showProduct.html");
  modal.innerHTML = await response.text();

  // تعبئة البيانات
  document.getElementById("product-modal-name").textContent = productData.productName || "تفاصيل المنتج";
  document.getElementById("product-modal-quantity").textContent = productData.availableQuantity;
  // ✅ تعديل: التعامل مع السعر قبل الخصم
  document.getElementById("product-modal-price").textContent = `${productData.pricePerItem} جنيه`;
  document.getElementById("product-modal-description").textContent = productData.description || "لا يوجد وصف متاح.";
  document.getElementById("product-modal-seller-message").textContent = productData.sellerMessage || "لا توجد رسالة من البائع.";

  // تعبئة معرض الصور
  const mainImage = document.getElementById("product-modal-image");
  const thumbnailsContainer = document.getElementById("product-modal-thumbnails");
  mainImage.src = productData.imageSrc[0]; // عرض الصورة الأولى
  thumbnailsContainer.innerHTML = ''; // مسح الصور المصغرة القديمة
  productData.imageSrc.forEach(src => {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.onclick = () => { mainImage.src = src; };
    thumbnailsContainer.appendChild(thumb);
  });

  // ✅ إضافة: عرض السعر قبل الخصم إذا كان موجودًا ومختلفًا عن السعر الحالي
  const originalPriceContainer = document.getElementById("product-modal-original-price-container");
  const originalPriceEl = document.getElementById("product-modal-original-price");
  // ✅ تحسين: التحقق من وجود القيم قبل المقارنة لتجنب الأخطاء
  const originalPrice = productData.original_price ? parseFloat(productData.original_price) : 0;
  const currentPrice = productData.pricePerItem ? parseFloat(productData.pricePerItem) : 0;

  if (originalPrice > 0 && originalPrice !== currentPrice) {
    originalPriceEl.textContent = `${originalPrice.toFixed(2)} جنيه`;
    originalPriceContainer.style.display = 'block'; // إظهار الحاوية بأكملها
  } else {
    // ✅ إصلاح: إفراغ المحتوى بالإضافة إلى الإخفاء لمنع ظهور "undefined"
    originalPriceContainer.style.display = 'none'; // إخفاء الحاوية بأكملها
    originalPriceEl.textContent = '';
  }


  // إظهار النافذة
  modal.style.display = "block";
  document.body.classList.add("modal-open");

  // وظيفة الإغلاق
  const closeModal = () => {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  };
  document.getElementById("product-modal-close-btn").onclick = closeModal;
  window.onclick = (event) => {
    if (event.target == modal) closeModal();
  };

  // --- ✅ إصلاح: إضافة منطق التحكم بالكمية والسعر الإجمالي ---
  const decreaseBtn = document.getElementById('product-modal-decrease-quantity');
  const increaseBtn = document.getElementById('product-modal-increase-quantity');
  const selectedQuantityInput = document.getElementById('product-modal-selected-quantity');
  const totalPriceEl = document.getElementById('product-modal-total-price');

  // تعيين الحد الأقصى للكمية
  selectedQuantityInput.max = productData.availableQuantity;

  // دالة لتحديث السعر الإجمالي
  function updateTotalPrice() {
    const price = parseFloat(productData.pricePerItem);
    const quantity = parseInt(selectedQuantityInput.value, 10);
    const total = price * quantity;
    totalPriceEl.textContent = `${total.toFixed(2)} جنيه`;
  }

  // إضافة الأحداث للأزرار
  decreaseBtn.addEventListener('click', () => {
    if (selectedQuantityInput.value > 1) {
      selectedQuantityInput.value--;
      updateTotalPrice();
    }
  });

  increaseBtn.addEventListener('click', () => {
    const max = parseInt(selectedQuantityInput.max, 10);
    if (parseInt(selectedQuantityInput.value, 10) < max) {
      selectedQuantityInput.value++;
      updateTotalPrice();
    }
  });

  selectedQuantityInput.addEventListener('change', updateTotalPrice);
  updateTotalPrice(); // حساب السعر المبدئي عند فتح النافذة

  // --- جديد: منطق إضافة المنتج إلى السلة ---
  const addToCartBtn = document.getElementById('product-modal-add-to-cart');
  addToCartBtn.addEventListener('click', () => {
    // ✅ إضافة: التحقق مما إذا كان المستخدم قد سجل دخوله
    const loggedInUser = localStorage.getItem("loggedInUser");

    if (loggedInUser) {
      // إذا كان المستخدم مسجلاً، استمر في عملية الإضافة للسلة
      const quantity = parseInt(document.getElementById('product-modal-selected-quantity').value, 10);
      const productInfoForCart = {
        product_key: productData.product_key,
        productName: productData.productName, // اسم المنتج
        price: productData.pricePerItem,      // ✅ إصلاح: استخدام السعر الصحيح (pricePerItem)
        original_price: productData.original_price, // ✅ إضافة: تمرير السعر قبل الخصم
        image: productData.imageSrc[0],       // ✅ إصلاح: استخدام الصورة الأولى كصورة للسلة
        seller_key: productData.user_key      // ✅ إضافة: تضمين مفتاح البائع
      };
      addToCart(productInfoForCart, quantity);
    } else {
      // إذا لم يكن المستخدم مسجلاً، أظهر رسالة تنبيه
      Swal.fire({
        icon: 'warning',
        title: 'يجب تسجيل الدخول',
        text: 'لإضافة منتجات إلى السلة، يرجى تسجيل الدخول أولاً.',
        showCancelButton: true,
        confirmButtonText: 'تسجيل الدخول',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = 'login.html'; // توجيه المستخدم لصفحة تسجيل الدخول
        }
      });
    }
  });
};
