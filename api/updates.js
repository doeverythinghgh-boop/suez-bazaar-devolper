import { createClient } from "@libsql/client/web";

/**
 * @description إعدادات تهيئة الوظيفة كـ Edge Function لـ Vercel.
 * @type {object}
 * @const
 */
export const config = {
  runtime: "edge",
};

/**
 * @file api/updates.js
 * @description نقطة نهاية لإدارة جدول التحديثات (updates).
 *
 * - POST: لإضافة سجل تحديث جديد.
 */
/**
 * @description نقطة نهاية API لإدارة جدول التحديثات.
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS،
 *   وطلبات `GET` لجلب آخر سجل تحديث،
 *   وطلبات `POST` لتحديث تاريخ آخر سجل تحديث.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @see createClient
 */
export default async function handler(request) {
  // إعداد CORS للسماح بالطلبات من أي مصدر
/**
 * @description ترويسات CORS (Cross-Origin Resource Sharing) للسماح بالطلبات من أي مصدر، بالإضافة إلى نوع المحتوى.
 * @type {object}
 * @const
 */
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const db = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  if (request.method === "GET") {
    try {
      // جلب آخر سجل تحديث (نفترض أننا نهتم بالسجل ذو المعرف 1)
      const { rows } = await db.execute({
        sql: "SELECT datetime FROM updates WHERE Id = ? LIMIT 1",
        args: [1],
      });

      if (rows.length === 0) {
        return new Response(JSON.stringify({ error: "لم يتم العثور على سجل التحديث." }), { status: 404, headers });
      }

      return new Response(JSON.stringify(rows[0]), { status: 200, headers });
    } catch (error) {
      console.error("API Error in GET /api/updates:", error);
      return new Response(JSON.stringify({ error: "فشل في جلب تاريخ التحديث.", details: error.message }), { status: 500, headers });
    }
  }

  if (request.method === "POST") {
    try {
      // ✅ تعديل: بدلاً من إضافة سجل جديد، سنقوم بتحديث السجل الذي يحمل Id = 1.
      // يتم تحديث حقل datetime إلى الوقت الحالي.
      // النص (txt) الذي يتم إرساله من الواجهة الأمامية لم يعد مستخدماً هنا،
      // لأننا نفترض أن النص في الصف الأول ثابت.

      const result = await db.execute({
        sql: "UPDATE updates SET datetime = CURRENT_TIMESTAMP WHERE Id = ?",
        args: [1],
      });

      const message = result.rowsAffected > 0 ? "تم تحديث تاريخ الإعلانات بنجاح." : "لم يتم العثور على سجل التحديث (Id=1).";

      return new Response(JSON.stringify({ message }), { status: 200, headers });
    } catch (error) {
      console.error("API Error in /api/updates:", error);
      return new Response(JSON.stringify({ error: "فشل في تحديث التاريخ.", details: error.message }), { status: 500, headers });
    }
  }

  return new Response(JSON.stringify({ error: `Method ${request.method} Not Allowed` }), { status: 405, headers });
}