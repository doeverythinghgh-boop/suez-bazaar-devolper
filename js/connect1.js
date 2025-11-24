/**
 * @file js/connect1.js
 * @description طبقة الاتصال بالواجهة البرمجية (API Service Layer).
 *
 * هذا الملف يحتوي على مجموعة من الدوال غير المتزامنة (async functions) التي تسهل عملية
 * إرسال واستقبال البيانات من نقاط النهاية (API endpoints) الخاصة بالمشروع.
 * كل دالة هنا تتوافق مع عملية محددة مثل جلب المستخدمين، إضافة منتج، أو تحديث البيانات.
 * يعتمد على متغير `baseURL` العام الذي يجب تعريفه في `js/config.js`.
 */

/**
 * @description ينشئ طلبًا جديدًا في قاعدة البيانات عبر واجهة برمجة التطبيقات (API).
 * @function createOrder
 * @param {object} orderData - كائن يحتوي على جميع بيانات الطلب المراد إنشاؤه.
 * @param {string} orderData.order_key - المفتاح الفريد الذي تم إنشاؤه للطلب.
 * @param {string} orderData.user_key - مفتاح المستخدم الذي قام بالطلب.
 * @param {number} orderData.total_amount - المبلغ الإجمالي للطلب.
 * @param {Array<object>} orderData.items - مصفوفة من المنتجات الموجودة في الطلب.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن بيانات الطلب الذي تم إنشاؤه، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function createOrder(orderData) {
  return await apiFetch('/api/orders', {
    method: 'POST',
    body: orderData,
  });
}

/**
 * @description يجلب سجل المشتريات الخاص بمستخدم معين من واجهة برمجة التطبيقات (API).
 *   يضيف تفاصيل حالة الطلب إلى كل عملية شراء قبل إعادتها.
 * @function getUserPurchases
 * @param {string} userKey - المفتاح الفريد للمستخدم (`user_key`) الذي نريد جلب مشترياته.
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات المشتريات المعالجة، أو `null` في حالة حدوث خطأ.
 * @throws {Error} - إذا فشل جلب البيانات من API.
 * @see apiFetch
 * @see ORDER_STATUSES
 */
async function getUserPurchases(userKey) {
  try {
    const purchases = await apiFetch(`/api/purchases?user_key=${userKey}`);
    if (purchases.error) {
      throw new Error(purchases.error);
    }

    console.log(
      "%c[API] getUserPurchases successful. Raw data:",
      "color: green;",
      purchases
    );

    // ✅ تحسين: يتم هنا دمج بيانات حالة الطلب (مثل النص والوصف) مع كل عنصر في المشتريات.
    // هذا يسهل على الواجهة الأمامية عرض حالة الطلب دون الحاجة إلى منطق إضافي.
    // ✅ تحسين: استخدام دالة مساعدة مركزية لمعالجة حالة الطلب لتقليل التكرار.
    const purchasesWithStatus = purchases.map(processOrderStatus);

    // تسجيل البيانات المعالجة وإرجاعها.
    console.log(
      "%c[API] getUserPurchases processed data with status info:",
      "color: darkcyan;",
      purchasesWithStatus
    );
    return purchasesWithStatus;
  } catch (error) {
    // تسجيل أي خطأ وإرجاع `null`.
    console.error("%c[getUserPurchases] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يجلب بيانات حركة المبيعات الكاملة من واجهة برمجة التطبيقات (API).
 *   هذه الدالة مخصصة للمسؤولين والبائعين وخدمات التوصيل، وتستخدم مفتاح المستخدم للتحقق من الصلاحيات.
 * @function getSalesMovement
 * @param {string} userKey - مفتاح المستخدم (`user_key`) الذي يقوم بطلب التقرير.
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من الطلبات المجمعة مع تفاصيلها، أو `null` في حالة الفشل.
 * @throws {Error} - إذا فشل جلب البيانات من API.
 * @see apiFetch
 */
async function getSalesMovement(userKey) {
  try {
    const data = await apiFetch(`/api/sales-movement?user_key=${userKey}`);
    if (!data || data.error) {
      throw new Error(data.error);
    }

    // ✅ تحسين: معالجة البيانات لإضافة تفاصيل الحالة قبل إرجاعها.
    // هذا يضمن أن البيانات تكون منسقة وجاهزة للاستخدام في الواجهة الأمامية.
    // ✅ تحسين: استخدام دالة مساعدة مركزية لمعالجة حالة الطلب لتقليل التكرار.
    const processedOrders = data.map(processOrderStatus);

    console.log(
      "%c[API] getSalesMovement processed data with status info:",
      "color: darkcyan; font-weight: bold;",
      processedOrders
    );

    return processedOrders;
  } catch (error) {
    console.error("%c[getSalesMovement] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يرسل إشعارًا فوريًا (Push Notification) إلى جهاز معين باستخدام توكن Firebase Cloud Messaging (FCM).
 * @function sendNotification
 * @param {string} token - توكن Firebase Cloud Messaging (FCM) الخاص بالجهاز المستهدف.
 * @param {string} title - عنوان الإشعار.
 * @param {string} body - نص الإشعار.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن يحتوي على نتيجة الإرسال من الخادم، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function sendNotification(token, title, body) {
  return await apiFetch('/api/send-notification', {
    method: 'POST',
    body: { token, title, body },
  });
}

/**
 * @description يحدث حالة طلب معين في قاعدة البيانات عبر واجهة برمجة التطبيقات (API).
 * @function updateOrderStatus
 * @param {string} orderKey - المفتاح الفريد للطلب المراد تحديث حالته.
 * @param {number} newStatusId - المعرف الرقمي للحالة الجديدة للطلب.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن الاستجابة من الخادم.
 * @see apiFetch
 */
async function updateOrderStatus(orderKey, newStatusId) {
  // ✅ إصلاح: استخدام دالة المساعدة لدمج الحالة مع التاريخ قبل الإرسال
  const composedStatus = composeOrderStatus(newStatusId);

  return await apiFetch('/api/orders', {
    method: 'PUT',
    body: {
      order_key: orderKey,
      order_status: composedStatus, // إرسال القيمة المدمجة "ID#TIMESTAMP"
    },
  });
}

/**
 * @description يضيف سجلاً جديدًا إلى جدول `updates` في قاعدة البيانات.
 *   يُستخدم هذا لتسجيل وقت آخر تغيير مهم في البيانات (مثل تحديث الإعلانات) للمساعدة في إدارة التخزين المؤقت (Caching).
 * @function addUpdate
 * @param {string} text - النص المراد تسجيله في التحديث.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن الاستجابة من الخادم، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function addUpdate(text) {
  return await apiFetch('/api/updates', {
    method: 'POST',
    body: { txt: text },
  });
}

/**
 * @description يجلب آخر تاريخ تحديث مسجل في جدول `updates` من واجهة برمجة التطبيقات (API).
 * @function getLatestUpdate
 * @returns {Promise<Object|null>} - وعد (Promise) يحتوي على كائن يتضمن تاريخ التحديث (`{ datetime: '...' }`)، أو `null` في حالة الفشل أو عدم وجود تحديثات.
 * @throws {Error} - إذا فشل جلب البيانات من API.
 * @see apiFetch
 */
async function getLatestUpdate() {
  try {
    const data = await apiFetch('/api/updates', {
      specialHandlers: {
        404: () => ({ datetime: null }) // Not a fatal error
      }
    });
    return data;
  } catch (error) {
    console.error("%c[getLatestUpdate] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يجلب قائمة الموزعين النشطين المرتبطين ببائع معين.
 *   يستخدم الفلتر `activeOnly=true` لجلب البيانات بكفاءة من الخادم.
 * @function getActiveDeliveryRelations
 * @param {string} sellerKey - المفتاح الفريد للبائع (`user_key`).
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات الموزعين النشطين، أو `null` في حالة حدوث خطأ.
 * @throws {Error} - إذا فشل جلب البيانات من API.
 * @see apiFetch
 */
async function getActiveDeliveryRelations(sellerKey) {
  try {
    const relations = await apiFetch(`/api/suppliers-deliveries?sellerKey=${sellerKey}&activeOnly=true`);
    if (relations.error) {
      throw new Error(relations.error);
    }
    console.log(`%c[API] getActiveDeliveryRelations successful for seller ${sellerKey}.`, "color: green;", relations);
    return relations;
  } catch (error) {
    console.error(`%c[getActiveDeliveryRelations] for seller ${sellerKey} failed:`, "color: red;", error);
    return null;
  }
}
