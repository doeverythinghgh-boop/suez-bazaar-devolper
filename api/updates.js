import { createClient } from "@libsql/client/web";

export const config = {
  runtime: "edge",
};

/**
 * @file api/updates.js
 * @description نقطة نهاية لإدارة جدول التحديثات (updates).
 *
 * - POST: لإضافة سجل تحديث جديد.
 */
export default async function handler(request) {
  // إعداد CORS للسماح بالطلبات من أي مصدر
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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