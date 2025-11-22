/**
 * @file cloudflare-workers/cloudFileManager.js
 * @description مكتبة من جهة العميل (Client-side Library) للتفاعل مع خدمة إدارة الملفات على Cloudflare R2.
 * 
 * يوفر هذا الملف ثلاث دوال رئيسية للتعامل مع الملفات:
 * - `uploadFile2cf(blob, fileName)`: لرفع ملف (Blob) إلى السحابة.
 * - `downloadFile2cf(fileName)`: لتحميل ملف من السحابة كـ Blob.
 * - `deleteFile2cf(fileName)`: لحذف ملف من السحابة.
 * 
 * يقوم تلقائيًا بطلب توكن مصادقة مؤقت وتضمينه في الطلبات.
 * يتم استخدامه بشكل أساسي في نموذج إضافة منتج جديد لرفع صور المنتجات.
 * 
 * @example
 * const blob = await downloadFile2cf("example.pdf");
 * const url = URL.createObjectURL(blob); // يمكن عرضه أو حفظه
 */

/**
 * @description العنوان الأساسي (Base URL) لنقطة نهاية خدمة Cloudflare Worker المسؤولة عن إدارة الملفات.
 * @type {string}
 * @const
 */
const baseUrl = "https://bidstory-files.bidsstories.workers.dev";

/**
 * @description يضمن وجود توكن مصادقة (X-Auth-Key) صالح للتفاعل مع خدمة Cloudflare Workers.
 *   إذا كان التوكن موجودًا في `localStorage`، يتم إعادته. وإلا، يتم جلب توكن جديد من نقطة نهاية `/login`
 *   وحفظه في `localStorage`.
 * @function ensureToken2cf
 * @returns {Promise<string>} - وعد (Promise) يحتوي على توكن المصادقة.
 * @throws {Error} - إذا فشل جلب التوكن.
 */
async function ensureToken2cf() {
  const existing = localStorage.getItem("X-Auth-Key");
  if (existing) return existing;

  try {
    const res = await fetch(baseUrl + "/login");
    const { token } = await res.json();
    localStorage.setItem("X-Auth-Key", token);
    return token;
  } catch (err) {
    throw new Error("فشل في جلب التوكن: " + err.message);
  }
}

/**
 * @description يقوم برفع ملف من نوع Blob إلى خدمة Cloudflare R2 عبر نقطة نهاية `/upload`.
 *   يستخدم توكن مصادقة لضمان الأمان.
 * @function uploadFile2cf
 * @param {Blob} blob - كائن Blob يمثل الملف المراد رفعه.
 * @param {string} fileName - اسم الملف الذي سيتم حفظه به في السحابة.
 * @param {function(string): void} [onLog=console.log] - دالة رد اتصال اختيارية لتسجيل الرسائل.
 * @returns {Promise<object>} - وعد (Promise) يحتوي على كائن يوضح نتيجة عملية الرفع.
 * @throws {Error} - إذا لم يتم توفير Blob أو اسم الملف، أو فشل الرفع.
 * @see ensureToken2cf
 */
async function uploadFile2cf(blob, fileName, onLog = console.log) {
  
  if (!(blob instanceof Blob) || !fileName) {
    throw new Error("❌ يجب توفير ملف Blob واسم الملف.");
  }

  const token = await ensureToken2cf();
  const formData = new FormData();
  formData.append("file", blob, fileName);

  onLog("🟢 🚀 بدء رفع الملف...");

  try {
    const res = await fetch(baseUrl + "/upload", {
      method: "POST",
      headers: { "X-Auth-Key": token },
      body: formData
    });

    const result = await res.json();
    if (res.ok) {
      onLog("✅ تم رفع الملف: " + (result.file || fileName));
      localStorage.removeItem("X-Auth-Key");
      return result;
    } else {
      throw new Error("❌ فشل الرفع: " + result.error);
    }
  } catch (err) {
    throw new Error("❌ 🛑 فشل الاتصال أثناء رفع الملف: " + err.message);
  }
}

/**
 * @description يقوم بتحميل ملف من خدمة Cloudflare R2 عبر نقطة نهاية `/download`.
 *   يستخدم توكن مصادقة لضمان الأمان.
 * @function downloadFile2cf
 * @param {string} fileName - اسم الملف المراد تحميله من السحابة.
 * @param {function(string): void} [onLog=console.log] - دالة رد اتصال اختيارية لتسجيل الرسائل.
 * @returns {Promise<Blob>} - وعد (Promise) يحتوي على كائن Blob يمثل محتوى الملف المحمل.
 * @throws {Error} - إذا لم يتم توفير اسم الملف، أو فشل التحميل.
 * @see ensureToken2cf
 */
async function downloadFile2cf(fileName, onLog = console.log) {
 
  if (!fileName) {
    throw new Error("❌ يجب توفير اسم الملف.");
  }

  const token = await ensureToken2cf();
  const url = `${baseUrl}/download?file=${encodeURIComponent(fileName)}`;

  onLog("🔄 بدء تحميل الملف...");

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-Auth-Key": token }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error("❌ فشل التحميل: " + err.error);
    }

    const blob = await res.blob();
    localStorage.removeItem("X-Auth-Key");

    onLog("✅ تم تحميل الملف بنجاح.");
    return blob; // تُعيد Blob ليُستخدم حسب السياق (عرض، حفظ، إلخ)
  } catch (err) {
    throw new Error("❌ 🛑 خطأ أثناء التحميل: " + err.message);
  }
}

/**
 * @description يقوم بحذف ملف من خدمة Cloudflare R2 عبر نقطة نهاية `/delete`.
 *   يستخدم توكن مصادقة لضمان الأمان.
 * @function deleteFile2cf
 * @param {string} fileName - اسم الملف المراد حذفه من السحابة.
 * @param {function(string): void} [onLog=console.log] - دالة رد اتصال اختيارية لتسجيل الرسائل.
 * @returns {Promise<object>} - وعد (Promise) يحتوي على كائن يوضح نتيجة عملية الحذف.
 * @throws {Error} - إذا لم يتم توفير اسم الملف، أو فشل الحذف.
 * @see ensureToken2cf
 */
async function deleteFile2cf(fileName, onLog = console.log) {

  if (!fileName) {
    throw new Error("❌ يجب توفير اسم الملف.");
  }

  const token = await ensureToken2cf();
  const url = `${baseUrl}/delete?file=${encodeURIComponent(fileName)}`;

  onLog("⚠️ جاري حذف الملف...");

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "X-Auth-Key": token }
    });

    const result = await res.json();
    if (res.ok) {
      localStorage.removeItem("X-Auth-Key");
      onLog("✅ تم حذف الملف: " + result.file);
      return result;
    } else {
      throw new Error("❌ فشل الحذف: " + result.error);
    }
  } catch (err) {
    throw new Error("❌ 🛑 خطأ أثناء الحذف: " + err.message);
  }
}
