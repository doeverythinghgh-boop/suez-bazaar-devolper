/**
 * @file cloudFileManager.js
 * @description Client-side Library for interacting with Cloudflare R2 file management service.
 *
 * This file provides three main functions for file handling:
 * - `uploadFile2cf(blob, fileName)`: Uploads a file (Blob) to the cloud.
 * - `downloadFile2cf(fileName)`: Downloads a file from the cloud as a Blob.
 * - `deleteFile2cf(fileName)`: Deletes a file from the cloud.
 *
 * Automatically requests a temporary authentication token and includes it in requests.
 * Primarily used in the "Add Product" form to upload product images.
 *
 * @example
 * const blob = await downloadFile2cf("example.pdf");
 * const url = URL.createObjectURL(blob); // Can be displayed or saved
 */





/**
 * @description Ensures a valid authentication token (X-Auth-Key) exists for Cloudflare Workers interaction.
 *   If a token exists in `localStorage`, it returns it.Otherwise, it fetches a new token from `/login` endpoint
  * and saves it to`localStorage`.
 * @function ensureToken2cf
 * @returns { Promise < string >} - A Promise containing the auth token.
 * @async
  * @throws { Error } - If token fetch fails.
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
 * @description Uploads a Blob file to Cloudflare R2 via `/upload` endpoint.
 *   Uses an auth token to ensure security.
 * @function uploadFile2cf
 * @param {Blob} blob - Blob object representing the file to upload.
 * @param {string} fileName - Name to save the file as in the cloud.
 * @param {function(string): void} [onLog=console.log] - Optional callback for logging messages.
 * @returns {Promise<object>} - A Promise with the upload result object.
 * @throws {Error} - If Blob or fileName is missing, or upload fails.
 * @async
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
 * @description Downloads a file from Cloudflare R2 via `/download` endpoint.
 *   Uses an auth token to ensure security.
 * @function downloadFile2cf
 * @param {string} fileName - Name of the file to download from cloud.
 * @param {function(string): void} [onLog=console.log] - Optional callback for logging messages.
 * @returns {Promise<Blob>} - A Promise containing the downloaded file as a Blob.
 * @throws {Error} - If fileName is missing, or download fails.
 * @async
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
    return blob; // Returns Blob for context usage (display, save, etc.)
  } catch (err) {
    throw new Error("❌ 🛑 خطأ أثناء التحميل: " + err.message);
  }
}

/**
 * @description Deletes a file from Cloudflare R2 via `/delete` endpoint.
 *   Uses an auth token to ensure security.
 * @function deleteFile2cf
 * @param {string} fileName - Name of the file to delete.
 * @param {function(string): void} [onLog=console.log] - Optional callback for logging messages.
 * @returns {Promise<object>} - A Promise with the deletion result object.
 * @throws {Error} - If fileName is missing, or deletion fails.
 * @async
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
