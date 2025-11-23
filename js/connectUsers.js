/**
 * @file js/connectUsers.js
 * @description طبقة الاتصال بالواجهة البرمجية (API) الخاصة بالمستخدمين.
 *
 * هذا الملف يحتوي على مجموعة من الدوال غير المتزامنة (async functions) التي تسهل
 * التعامل مع بيانات المستخدمين، بما في ذلك جلبهم، إضافتهم، تحديثهم، حذفهم، والتحقق منهم.
 * يعتمد على متغير `baseURL` العام الذي يجب تعريفه في `js/config.js`.
 */

/**
 * @description يجلب قائمة بجميع المستخدمين من قاعدة البيانات عبر واجهة برمجة التطبيقات (API).
 *   تُستخدم هذه الدالة عادةً في لوحات تحكم المسؤولين.
 * @function fetchUsers
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات المستخدمين، أو `null` في حالة حدوث خطأ.
 * @see apiFetch
 */
async function fetchUsers() {
  try {
    const data = await apiFetch('/api/users');
    return data.error ? null : data;
  } catch (error) {
    console.error("%c[fetchUsers] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يضيف مستخدمًا جديدًا إلى قاعدة البيانات عبر واجهة برمجة التطبيقات (API).
 * @function addUser
 * @param {object} userData - كائن يحتوي على جميع بيانات المستخدم المراد إضافته.
 * @param {string} userData.username - اسم المستخدم.
 * @param {string} userData.phone - رقم هاتف المستخدم.
 * @param {string} [userData.password] - كلمة المرور (اختياري).
 * @param {string} [userData.address] - العنوان (اختياري).
 * @param {string} userData.user_key - الرقم التسلسلي الفريد للمستخدم.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على الكائن الذي تم إنشاؤه، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function addUser(userData) {
  return await apiFetch('/api/users', {
    method: 'POST',
    body: userData,
  });
}

/**
 * @description يحدث بيانات مستخدم واحد موجود في قاعدة البيانات عبر واجهة برمجة التطبيقات (API).
 * @function updateUser
 * @param {object} userData - كائن يحتوي على بيانات المستخدم للتحديث. يجب أن يحتوي الكائن على `user_key` لتحديد المستخدم المراد تحديثه.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على الكائن الذي تم تحديثه، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function updateUser(userData) {
  return await apiFetch('/api/users', {
    method: 'PUT',
    body: userData,
  });
}
/**
 * @description يجلب بيانات مستخدم واحد بناءً على رقم هاتفه من واجهة برمجة التطبيقات (API).
 *   تُستخدم هذه الدالة بشكل أساسي عند تسجيل الدخول للتحقق من وجود المستخدم.
 * @function getUserByPhone
 * @param {string} phone - رقم هاتف المستخدم للبحث عنه.
 * @returns {Promise<Object|null>} - وعد (Promise) يحتوي على كائن بيانات المستخدم، أو `null` إذا لم يتم العثور عليه أو في حالة حدوث خطأ.
 * @see apiFetch
 */
async function getUserByPhone(phone) {
  try {
    const data = await apiFetch(`/api/users?phone=${phone}`, {
      specialHandlers: {
        404: () => {
          return null;
        }
      }
    });
    return data.error ? null : data;
  } catch (error) {
    console.error("%c[getUserByPhone] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يجلب قائمة المستخدمين الذين لديهم دور "خدمة توصيل" (is_seller = 2).
 * @async
 * @function getDeliveryUsers
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات مستخدمي التوصيل، أو `null` في حالة حدوث خطأ.
 * @see apiFetch
 */
async function getDeliveryUsers() {
  try {
    // استدعاء نقطة النهاية مع فلتر الدور
    const data = await apiFetch('/api/users?role=2');
    return data.error ? null : data;
  } catch (error) {
    console.error("%c[getDeliveryUsers] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description يحدث بيانات عدة مستخدمين دفعة واحدة عبر واجهة برمجة التطبيقات (API).
 *   تُستخدم هذه الدالة في لوحة تحكم المسؤول لتغيير أدوار عدة مستخدمين (مثلاً، ترقيتهم إلى بائعين).
 * @function updateUsers
 * @param {Array<Object>} updates - مصفوفة من الكائنات تحتوي على بيانات التحديث لكل مستخدم. كل كائن يجب أن يحتوي على `user_key` على الأقل.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن الاستجابة من الخادم، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function updateUsers(updates) {
  return await apiFetch('/api/users', {
    method: 'PUT',
    body: updates,
  });
}

/**
 * @description يتحقق من صحة كلمة المرور لمستخدم معين عبر واجهة برمجة التطبيقات (API).
 * @function verifyUserPassword
 * @param {string} phone - رقم هاتف المستخدم.
 * @param {string} password - كلمة المرور للتحقق منها.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن بيانات المستخدم عند النجاح، أو كائن خطأ عند الفشل.
 * @see apiFetch
 */
async function verifyUserPassword(phone, password) {
  return await apiFetch('/api/users', {
    method: 'POST',
    body: { action: 'verify', phone, password },
  });
}

/**
 * @description يحذف مستخدمًا بشكل نهائي من قاعدة البيانات عبر واجهة برمجة التطبيقات (API).
 * @function deleteUser
 * @param {string} userKey - المفتاح الفريد للمستخدم المراد حذفه.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن الاستجابة من الخادم.
 * @see apiFetch
 */
async function deleteUser(userKey) {
  return await apiFetch('/api/users', {
    method: 'DELETE',
    body: { user_key: userKey },
  });
}
