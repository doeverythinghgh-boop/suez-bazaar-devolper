/**
 * @file api/tokens.js
 * @description نقطة النهاية (API Endpoint) لإدارة توكنات إشعارات Firebase (FCM).
 *
 * هذا الملف يعمل كواجهة خلفية (Serverless Function على Vercel) ويتولى العمليات المتعلقة بتوكنات FCM:
 * - POST: حفظ أو تحديث توكن FCM لمستخدم معين في جدول `user_tokens` باستخدام `ON CONFLICT`.
 * - DELETE: حذف توكن FCM لمستخدم معين (يُستخدم عند تسجيل الخروج).
 * - OPTIONS: معالجة طلبات CORS Preflight.
 */
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
 * @description ترويسات CORS (Cross-Origin Resource Sharing) للسماح بالطلبات من أي مصدر.
 * @type {object}
 * @const
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * @description نقطة نهاية API لإدارة توكنات Firebase Cloud Messaging (FCM).
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS،
 *   وطلبات `GET` لجلب توكنات المستخدمين بناءً على `user_key`،
 *   وطلبات `POST` لحفظ أو تحديث توكن FCM لمستخدم معين،
 *   وطلبات `DELETE` لحذف توكن FCM لمستخدم.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 405, 500) if validation fails or an unexpected error occurs during database operations.
 * @see createClient
 */
export default async function handler(request) {
  const db = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
// -----------------------------------------------------
    // ✅ الجزء الجديد: معالجة طلب GET لجلب التوكنات
    // -----------------------------------------------------
    if (request.method === "GET") {
      console.log("[API: /api/tokens] Received GET request to fetch tokens.");
      
      // تحليل الـ URL لاستخراج query parameters
      const url = new URL(request.url);
      const userKeysQuery = url.searchParams.get("userKeys"); // جلب المفاتيح المرسلة في الرابط

      if (!userKeysQuery) {
        return new Response(
          JSON.stringify({ error: "userKeys parameter is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // تحويل سلسلة المفاتيح (مفصولة بفواصل) إلى مصفوفة
      const userKeys = userKeysQuery.split(',');
      
      // بناء استعلام SQL لجلب التوكنات للمفاتيح المحددة
      // نستخدم علامات الاستفهام (?) كـ placeholders ونمرر userKeys كمصفوفة للـ args
      const placeholders = userKeys.map(() => '?').join(',');
      const sqlQuery = `SELECT fcm_token FROM user_tokens WHERE user_key IN (${placeholders})`;

      console.log(`[API: /api/tokens] Fetching tokens for ${userKeys.length} users.`);
      
      const result = await db.execute({
        sql: sqlQuery,
        args: userKeys, // تمرير المصفوفة هنا
      });

      // استخلاص التوكنات من نتائج قاعدة البيانات
      const tokens = result.rows.map(row => row.fcm_token);
      
      // إعادة التوكنات كمصفوفة في استجابة JSON
      return new Response(
        JSON.stringify({ success: true, tokens: tokens }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    if (request.method === "POST") {
      console.log("[API: /api/tokens] Received POST request to save token.");
      const { user_key, token, platform } = await request.json();

      if (!user_key || !token || !platform) {
        console.error("[API: /api/tokens] Bad Request: user_key, token, or platform is missing.");
        return new Response(
          JSON.stringify({ error: "user_key, token, and platform are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[API: /api/tokens] Saving token for user_key: ${user_key}`);
      
      // ✅ إصلاح: استخدام معاملة (transaction) لضمان الموثوقية.
      // 1. نحذف أي سجل قديم لهذا المستخدم لضمان عدم وجود توكنات قديمة.
      // 2. نحذف أي سجل قديم لهذا التوكن إذا كان مسجلاً لمستخدم آخر (حالة نادرة).
      // 3. نضيف السجل الجديد.
      // هذا يضمن أن كل مستخدم لديه توكن واحد فقط، وكل توكن مرتبط بمستخدم واحد فقط.
      const tx = await db.transaction("write");
      try {
        await tx.execute({ sql: "DELETE FROM user_tokens WHERE user_key = ?", args: [user_key] });
        await tx.execute({ sql: "DELETE FROM user_tokens WHERE fcm_token = ?", args: [token] });
        await tx.execute({
          sql: "INSERT INTO user_tokens (user_key, fcm_token, platform) VALUES (?, ?, ?)",
          args: [user_key, token, platform],
        });
        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw err; // سيتم التقاط هذا الخطأ في كتلة catch الرئيسية
      }

      console.log(`[API: /api/tokens] Successfully saved token for user_key: ${user_key}`);
      return new Response(
        JSON.stringify({ success: true, message: "Token saved successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.method === "DELETE") {
      const { user_key } = await request.json(); // نكتفي بـ user_key فقط

      if (!user_key) {
        return new Response(
          JSON.stringify({ error: "user_key is required for deletion." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await db.execute({
        sql: "DELETE FROM user_tokens WHERE user_key = ?", // حذف أي توكن مرتبط بهذا المستخدم
        args: [user_key],
      });

      return new Response(
        JSON.stringify({ success: true, message: "Token deleted successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[API: /api/tokens] FATAL ERROR", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}