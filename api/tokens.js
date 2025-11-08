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

export const config = {
  runtime: "edge",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(request) {
  const db = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (request.method === "POST") {
      console.log("[API: /api/tokens] Received POST request to save token.");
      const { user_key, token } = await request.json();

      if (!user_key || !token) {
        console.error("[API: /api/tokens] Bad Request: user_key or token is missing.");
        return new Response(
          JSON.stringify({ error: "user_key and token are required." }),
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
          sql: "INSERT INTO user_tokens (user_key, fcm_token) VALUES (?, ?)",
          args: [user_key, token],
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