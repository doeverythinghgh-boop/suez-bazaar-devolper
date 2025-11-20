
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
  
  console.log('%c[API] Starting fetchUsers...', 'color: blue;');
  try {
    // إرسال طلب لجلب البيانات من الرابط المحدد
    const response = await fetch(`${baseURL}/api/users`);

    // التحقق مما إذا كان الطلب ناجحًا (status code in the range 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // تحويل الاستجابة إلى كائن JSON وإرجاعها
    const data = await response.json();
    console.log('%c[API] fetchUsers successful.', 'color: green;', data);
    return data;

  } catch (error) {
    // في حالة حدوث أي خطأ أثناء جلب البيانات، يتم طباعته هنا
    console.error('%c[API] fetchUsers failed:', 'color: red;', error);
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
 
  console.log('%c[API] Starting addUser with data:', 'color: blue;', userData);
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

    console.log('%c[API] addUser successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] addUser failed:', 'color: red;', error);
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
 
  console.log('%c[API] Starting addProduct with data:', 'color: blue;', productData);
  try {
    const response = await fetch(`${baseURL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      // ✅ جديد: إضافة رسالة تسجيل مفصلة للمطور عند حدوث خطأ 400
      console.error('%c[API Error] addProduct failed with status:', 'color: red; font-weight: bold;', response.status);
      console.error('%c[API Error] Server Response:', 'color: red;', data);
      console.error('%c[API Error] Sent Payload:', 'color: red;', productData);
      return { error: data.error || `فشل الاتصال بالخادم (Status: ${response.status})` };
    }

    console.log('%c[API] addProduct successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] addProduct failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند إضافة المنتج." };
  }
}

/**
 * يحدث بيانات منتج موجود عبر واجهة برمجة التطبيقات.
 * @param {object} productData - بيانات المنتج المحدثة.
 * @returns {Promise<Object|null>} الكائن الذي تم تحديثه أو null في حالة الفشل.
 */
async function updateProduct(productData) {
 
  console.log('%c[API] Starting updateProduct with data:', 'color: blue;', productData);
  try {
    const response = await fetch(`${baseURL}/api/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      // ✅ جديد: إضافة رسالة تسجيل مفصلة للمطور عند حدوث خطأ 400
      console.error('%c[API Error] updateProduct failed with status:', 'color: red; font-weight: bold;', response.status);
      console.error('%c[API Error] Server Response:', 'color: red;', data);
      console.error('%c[API Error] Sent Payload:', 'color: red;', productData);
      return { error: data.error || `فشل الاتصال بالخادم (Status: ${response.status})` };
    }

    console.log('%c[API] updateProduct successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] updateProduct failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند تحديث المنتج." };
  }
}

/**
 * جديد: يحذف منتجًا موجودًا عبر واجهة برمجة التطبيقات.
 * @param {string} productKey - المفتاح الفريد للمنتج المراد حذفه.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function deleteProduct(productKey) {
 
  console.log(`%c[API] Starting deleteProduct for product_key: ${productKey}`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/products?product_key=${productKey}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log('%c[API] deleteProduct successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] deleteProduct failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند حذف المنتج." };
  }
}

/**
 * يجلب المنتجات بناءً على الفئة الرئيسية والفرعية.
 * @param {string} mainCatId - معرف الفئة الرئيسية.
 * @param {string} subCatId - معرف الفئة الفرعية.
 * @returns {Promise<Array|null>} مصفوفة من المنتجات أو null في حالة الفشل.
 */
async function getProductsByCategory(mainCatId, subCatId) {
  
  console.log(`%c[API] Starting getProductsByCategory (Main: ${mainCatId}, Sub: ${subCatId})`, 'color: blue;');
  try {
    // --- جديد: إضافة تسجيلات تشخيصية لتحديد المشكلة بدقة ---
    // 1. التحقق من وجود متغير baseURL
    if (typeof baseURL === 'undefined' || !baseURL) {
      console.error('%c[API-Debug] متغير baseURL غير معرف أو فارغ! هذا هو سبب فشل fetch.', 'color: red; font-weight: bold;');
      throw new Error('baseURL is not defined');
    }
    // ✅ إصلاح: استخدام URLSearchParams لضمان عدم إرسال قيم 'null' كسلاسل نصية.
    const params = new URLSearchParams();
    if (mainCatId) {
      params.append('MainCategory', mainCatId);
    }
    if (subCatId) {
      params.append('SubCategory', subCatId);
    }
    const requestURL = `${baseURL}/api/products?${params.toString()}`;
    console.log(`%c[API-Debug] Preparing to fetch from URL: ${requestURL}`, 'color: magenta;');
    const response = await fetch(requestURL);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('%c[API] getProductsByCategory successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] getProductsByCategory failed:', 'color: red;', error);
    return null;
  }
}

/**
 * يجلب جميع المنتجات الخاصة بمستخدم معين عبر واجهة برمجة التطبيقات.
 * @param {string} userKey - المفتاح الفريد للمستخدم (user_key).
 * @returns {Promise<Array|null>} مصفوفة من المنتجات أو null في حالة الفشل.
 */
async function getProductsByUser(userKey) {
  
  console.log(`%c[API] Starting getProductsByUser for user_key: ${userKey}`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/products?user_key=${userKey}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('%c[API] getProductsByUser successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] getProductsByUser failed:', 'color: red;', error);
    return null;
  }
}

/**
 * ✅ جديد: يجلب منتجًا واحدًا بناءً على مفتاحه الفريد.
 * @param {string} productKey - المفتاح الفريد للمنتج.
 * @returns {Promise<Object|null>} كائن المنتج أو null في حالة الفشل.
 */
async function getProductByKey(productKey) {
 
  console.log(`%c[API] Starting getProductByKey for product_key: ${productKey}`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/products?product_key=${productKey}&single=true`);

    if (response.status === 404) {
      console.warn('[API] getProductByKey: Product not found (404).');
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('%c[API] getProductByKey successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] getProductByKey failed:', 'color: red;', error);
    return null;
  }
}
/**
 * تحديث بيانات عدة مستخدمين (مثل حالة البائع).
 * @param {Array<Object>} updates - مصفوفة من الكائنات تحتوي على بيانات التحديث.
 * @returns {Promise<Object|null>}
 */
async function updateUsers(updates) {
 
  console.log('%c[API] Starting updateUsers with data:', 'color: blue;', updates);
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

    console.log('%c[API] updateUsers successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] updateUsers failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم." };
  }
}

/**
 * يحدث بيانات مستخدم واحد.
 * @param {object} userData - بيانات المستخدم للتحديث (يجب أن تحتوي على user_key).
 * @returns {Promise<Object>}
 */
async function updateUser(userData) {
 
  console.log('%c[API] Starting updateUser with data:', 'color: blue;', userData);
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

    console.log('%c[API] updateUser successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] updateUser failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم." };
  }
}
/**
 * يجلب بيانات مستخدم معين عن طريق رقم الهاتف.
 * @param {string} phone - رقم هاتف المستخدم للبحث عنه.
 * @returns {Promise<Object|null>} كائن يحتوي على بيانات المستخدم (الاسم، الهاتف، user_key، حالة البائع) أو null إذا لم يتم العثور عليه أو في حالة حدوث خطأ.
 */
async function getUserByPhone(phone) {
  
  console.log(`%c[API] Starting getUserByPhone for phone: ${phone}`, 'color: blue;');
  try {
    // بناء الرابط مع رقم الهاتف كمعامل استعلام
    const response = await fetch(`${baseURL}/api/users?phone=${phone}`);

    // إذا كان المستخدم غير موجود (404)، لا تعتبره خطأ فادحًا، بل أرجع null
    if (response.status === 404) {
      console.warn('[API] getUserByPhone: User not found (404).');
      return null;
    }

    // التحقق من نجاح الطلب
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // تحويل الاستجابة إلى JSON وإرجاعها
    const data = await response.json();
    console.log('%c[API] getUserByPhone successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] getUserByPhone failed:', 'color: red;', error);
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
 
  console.log(`%c[API] Starting verifyUserPassword for phone: ${phone}`, 'color: blue;');
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

    console.log('%c[API] verifyUserPassword successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] verifyUserPassword failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم." };
  }
}

/**
 * ✅ جديد: يحذف مستخدمًا بشكل نهائي عبر واجهة برمجة التطبيقات.
 * @param {string} userKey - المفتاح الفريد للمستخدم المراد حذفه.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function deleteUser(userKey) {
 
  console.log(`%c[API] Starting deleteUser for user_key: ${userKey}`, 'color: #e74c3c; font-weight: bold;');
  try {
    const response = await fetch(`${baseURL}/api/users`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_key: userKey }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log('%c[API] deleteUser successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] deleteUser failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند حذف المستخدم." };
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
  
  console.log('%c[API] Starting createOrder with data:', 'color: blue;', orderData);
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

    console.log('%c[API] createOrder successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] createOrder failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند إنشاء الطلب." };
  }
}

/**
 * جديد: يجلب سجل مشتريات المستخدم.
 * @param {string} userKey - المفتاح الفريد للمستخدم.
 * @returns {Promise<Array|null>} مصفوفة من عناصر المشتريات أو null في حالة الفشل.
 */
async function getUserPurchases(userKey) {
  
  console.log(`%c[API] Starting getUserPurchases for user_key: ${userKey}`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/purchases?user_key=${userKey}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const purchases = await response.json();
    console.log('%c[API] getUserPurchases successful. Raw data:', 'color: green;', purchases);

    // ✅ تحسين: دمج بيانات حالة الطلب مع النتائج
    // هذا يجعل الواجهة الأمامية أسهل في التعامل مع البيانات
    const purchasesWithStatus = purchases.map(purchase => {
      const statusInfo = ORDER_STATUSES.find(s => s.id === purchase.order_status) || { state: 'غير معروف', description: 'حالة الطلب غير معروفة.' };
      return {
        ...purchase,
        status_details: statusInfo // إضافة كائن يحتوي على (id, state, description)
      };
    });

    console.log('%c[API] getUserPurchases processed data with status info:', 'color: darkcyan;', purchasesWithStatus);
    return purchasesWithStatus;

  } catch (error) {
    console.error('%c[API] getUserPurchases failed:', 'color: red;', error);
    return null;
  }
}

/**
 * ✅ جديد: يجلب بيانات حركة المشتريات الكاملة (للمسؤولين والبائعين).
 * @param {string} userKey - مفتاح المستخدم الذي يطلب التقرير.
 * @returns {Promise<Array|null>} مصفوفة من الطلبات المجمعة أو null في حالة الفشل.
 */
window.getSalesMovement = async function(userKey) {
 
  console.log(`%c[API] Starting getSalesMovement for user_key: ${userKey}`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/sales-movement?user_key=${userKey}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('%c[API] getSalesMovement successful.', 'color: green;', data);
    return data;

  } catch (error) {
    console.error('%c[API] getSalesMovement failed:', 'color: red;', error);
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
 
  console.log(`%c[API] Starting sendNotification to token: ${token.substring(0, 10)}...`, 'color: blue;');
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

    console.log('%c[API] sendNotification successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] sendNotification failed:', 'color: red;', error);
    return { error: "فشل الاتصال بخادم الإشعارات." };
  }
}

/**
 * ✅ جديد: يحدث حالة طلب معين عبر واجهة برمجة التطبيقات.
 * @param {string} orderKey - المفتاح الفريد للطلب.
 * @param {number} newStatusId - المعرف الرقمي للحالة الجديدة.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function updateOrderStatus(orderKey, newStatusId) {
  console.log(`%c[API] Starting updateOrderStatus for order_key: ${orderKey} to status: ${newStatusId}`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/orders`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_key: orderKey,
        order_status: newStatusId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log('%c[API] updateOrderStatus successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] updateOrderStatus failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند تحديث حالة الطلب." };
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
window.showProductDetails = async function(productData, onCloseCallback, options = {}) {
  // ✅ جديد: التحقق من وجود بيانات الفئة قبل فتح النافذة
  if (!productData.MainCategory || !productData.SubCategory) {
    console.error('[Modal] Missing category data. Cannot open product details.', productData);
    Swal.fire(
      'خطأ في البيانات',
      'لا يمكن عرض تفاصيل المنتج لعدم توفر معلومات الفئة.',
      'error'
    );
    // استدعاء دالة رد الاتصال إذا فشل الفتح
    if (typeof onCloseCallback === 'function') onCloseCallback();
    return; // إيقاف التنفيذ
  }
  

  console.log('%c[Modal] Opening product details modal for:', 'color: darkcyan', productData.productName);
  const modal = document.getElementById("product-details-modal");
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
window.showProductDetails = async function(productData, onCloseCallback, options = {}) {
  // ✅ جديد: التحقق من وجود بيانات الفئة قبل فتح النافذة
  if (!productData.MainCategory || !productData.SubCategory) {
    console.error('[Modal] Missing category data. Cannot open product details.', productData);
    Swal.fire(
      'خطأ في البيانات',
      'لا يمكن عرض تفاصيل المنتج لعدم توفر معلومات الفئة.',
      'error'
    );
    // استدعاء دالة رد الاتصال إذا فشل الفتح
    if (typeof onCloseCallback === 'function') onCloseCallback();
    return; // إيقاف التنفيذ
  }
  

  console.log('%c[Modal] Opening product details modal for:', 'color: darkcyan', productData.productName);
  const modal = document.getElementById("product-details-modal");

  // تحميل محتوى النافذة من الملف
  try {
    console.log('[Modal] Fetching showProduct.html content...');
    const response = await fetch("pages/showProduct.html");
    if (!response.ok) throw new Error(`فشل تحميل محتوى النافذة (status: ${response.status})`);
    modal.innerHTML = await response.text();
    // ✅ **الإصلاح الرئيسي**: يجب أن يتم استدعاء الدوال التي تعتمد على محتوى النافذة
    // **بعد** تحميل المحتوى بنجاح.
    populateProductDetails(productData, onCloseCallback, options);
  } catch (error) {
    console.error('[Modal] Failed to fetch or render showProduct.html:', error);
    Swal.fire('خطأ في التحميل', 'حدث خطأ أثناء محاولة تحميل تفاصيل المنتج. يرجى المحاولة مرة أخرى.', 'error').then(() => {
      // ✅ إصلاح: استدعاء دالة رد الاتصال إذا فشل تحميل محتوى النافذة
      if (typeof onCloseCallback === 'function') onCloseCallback();
    });
    return; // إيقاف التنفيذ
  }

  // تعبئة البيانات
  document.getElementById("product-modal-name").textContent = productData.productName || "تفاصيل المنتج";
  
  // إظهار النافذة
  modal.style.display = "block";
  document.body.classList.add("modal-open");
};

/**
 * @description يملأ تفاصيل المنتج ويربط الأحداث بعد تحميل محتوى النافذة المنبثقة.
 */
function populateProductDetails(productData, onCloseCallback, options = {}) {
  document.getElementById("product-modal-description").textContent = productData.description || "لا يوجد وصف متاح.";
  document.getElementById("product-modal-seller-message").textContent = productData.sellerMessage || "لا توجد رسالة من البائع.";

  // ✅ جديد: إخفاء حقول السعر والكمية إذا كانت الفئة هي "الخدمات العامة" (id=6)
  const isServiceCategory = productData.MainCategory == SERVICE_CATEGORY_NoPrice_ID;
  const quantityContainer = document.getElementById("product-modal-quantity-container");
  const priceContainer = document.getElementById("product-modal-price-container");
  const cartActionsContainer = document.getElementById("product-modal-cart-actions");

  // ✅ جديد: إخفاء قسم السلة بناءً على الخيار القادم من استدعاء الدالة
  const showAddToCart = options.showAddToCart !== false; // يكون true افتراضيًا

  if (isServiceCategory) {
    quantityContainer.style.display = 'none';
    priceContainer.style.display = 'none';
    cartActionsContainer.style.display = 'none';
  } else if (!showAddToCart) {
    // إذا كانت الإشارة موجودة لإخفاء السلة
    cartActionsContainer.style.display = 'none';
  } else {
    quantityContainer.style.display = 'block';
    priceContainer.style.display = 'block';
    // تأكد من إظهار الحاوية إذا لم تكن هناك إشارة لإخفائها
    cartActionsContainer.style.display = 'block';
    document.getElementById("product-modal-quantity").textContent = productData.availableQuantity;
    document.getElementById("product-modal-price").textContent = `${productData.pricePerItem} جنيه`;
  }


  // تعبئة معرض الصور
  const mainImage = document.getElementById("product-modal-image");
  const thumbnailsContainer = document.getElementById("product-modal-thumbnails");
  console.log('[Modal] Populating product data and images.');
  mainImage.src = productData.imageSrc[0]; // عرض الصورة الأولى
  thumbnailsContainer.innerHTML = ''; // مسح الصور المصغرة القديمة
  productData.imageSrc.forEach(src => {
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.onclick = () => { mainImage.src = src; };
    // ✅ إصلاح: التعامل مع فشل تحميل الصور بسبب مشاكل الشبكة
    thumb.onerror = () => {
      console.warn('[Modal] Thumbnail image failed to load:', src);
      // استبدال الصورة الفاشلة بعنصر نائب مع زر إعادة المحاولة
      const placeholder = document.createElement('div');
      placeholder.className = 'image-load-error-placeholder';
      placeholder.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>فشل تحميل الصورة</span>
      `;
      thumb.replaceWith(placeholder);
    };
    thumbnailsContainer.appendChild(thumb);
  });

  // ✅ إضافة: عرض السعر قبل الخصم إذا كان موجودًا ومختلفًا عن السعر الحالي
  const originalPriceContainer = document.getElementById("product-modal-original-price-container");
  const originalPriceEl = document.getElementById("product-modal-original-price");
  // ✅ تحسين: التحقق من وجود القيم قبل المقارنة لتجنب الأخطاء
  const originalPrice = productData.original_price ? parseFloat(productData.original_price) : 0;
  // ✅ تعديل: إظهار السعر الأصلي فقط إذا لم تكن خدمة
  if (!isServiceCategory) {
    const currentPrice = productData.pricePerItem ? parseFloat(productData.pricePerItem) : 0;
    if (originalPrice > 0 && originalPrice !== currentPrice) {
      console.log('[Modal] Displaying original price.');
      originalPriceEl.textContent = `${originalPrice.toFixed(2)} جنيه`;
      originalPriceContainer.style.display = 'block'; // إظهار الحاوية بأكملها
    } else {
      console.log('[Modal] Hiding original price.');
      originalPriceContainer.style.display = 'none'; // إخفاء الحاوية بأكملها
      originalPriceEl.textContent = '';
    }
  }


  const modal = document.getElementById("product-details-modal");
  // وظيفة الإغلاق
  const closeModal = () => {
    console.log('[Modal] Closing product details modal.');
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    // ✅ جديد: استدعاء دالة رد الاتصال عند الإغلاق إذا كانت موجودة
    if (typeof onCloseCallback === 'function') {
      onCloseCallback();
    }
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

  // ✅ جديد: لا تقم بتهيئة عناصر التحكم بالكمية إذا كانت من فئة الخدمات
  if (isServiceCategory || !showAddToCart) {
    // لا تفعل شيئًا، فقد تم إخفاء الحاوية بالفعل
    return;
  }

  console.log('[Modal] Initializing quantity controls.');
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
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    if (loggedInUser && !loggedInUser.is_guest) {
      console.log('[Modal] Add to cart button clicked by a registered user.');
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
    } else { // هذا الشرط سيتحقق إذا كان المستخدم ضيفًا أو لم يسجل دخوله على الإطلاق
      console.warn('[Modal] Add to cart button clicked by guest or non-logged-in user. Prompting for login/registration.');
      // إذا لم يكن المستخدم مسجلاً، أظهر رسالة تنبيه
      Swal.fire({
        icon: 'info',
        title: 'يجب تسجيل الدخول',
        text: 'لإضافة منتجات إلى السلة، يرجى تسجيل الدخول أولاً.',
        showCancelButton: true,
        confirmButtonText: 'تسجيل الدخول',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          console.log('[Modal] User chose to log in. Redirecting...');
          window.location.href = 'login.html'; // توجيه المستخدم لصفحة تسجيل الدخول
        }
      });
    }
  });
}

/**
 * يضيف سجلاً جديدًا إلى جدول التحديثات.
 * @param {string} text - النص المراد تسجيله في التحديث.
 * @returns {Promise<Object>} كائن الاستجابة من الخادم.
 */
async function addUpdate(text) {
 
  console.log(`%c[API] Starting addUpdate with text: "${text}"`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txt: text }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }

    console.log('%c[API] addUpdate successful.', 'color: green;', data);
    return data;
  } catch (error) {
    console.error('%c[API] addUpdate failed:', 'color: red;', error);
    return { error: "فشل الاتصال بالخادم عند تسجيل التحديث." };
  }
}

/**
 * يجلب آخر تاريخ تحديث من جدول updates.
 * @returns {Promise<Object|null>} كائن يحتوي على تاريخ التحديث أو null في حالة الفشل.
 */
async function getLatestUpdate() {
 
  console.log(`%c[API] Starting getLatestUpdate...`, 'color: blue;');
  try {
    const response = await fetch(`${baseURL}/api/updates`);

    if (!response.ok) {
      const errorData = await response.json();
      // لا نعتبر 404 خطأ فادحًا، بل يعني عدم وجود تحديثات بعد
      if (response.status === 404) return { datetime: null };
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('%c[API] getLatestUpdate successful.', 'color: green;', data);
    return data;

  } catch (error) {
    console.error('%c[API] getLatestUpdate failed:', 'color: red;', error);
    return null;
  }
}}
