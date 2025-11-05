
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
