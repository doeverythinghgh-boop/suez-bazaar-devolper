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

const baseUrl = "https://bidstory-files.bidsstories.workers.dev";

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
