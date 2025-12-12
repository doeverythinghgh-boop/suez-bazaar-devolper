import { createClient } from "@libsql/client/web";

/**
 * @file api/purchases.js
 * @description نقطة نهاية API لجلب سجل مشتريات المستخدم.
 * 
 * تعالج هذه الدالة طلبات GET لجلب جميع المنتجات التي قام مستخدم معين بشرائها.
 * تتطلب `user_key` كمعامل استعلام (query parameter).
 * تقوم بتنفيذ استعلام يربط بين جداول `orders`, `order_items`, و `marketplace_products`
 * لإرجاع قائمة مفصلة بالمشتريات مرتبة حسب تاريخ الشراء.
 */

/**
 * @description إعدادات تهيئة الوظيفة كـ Edge Function لـ Vercel.
 * @type {object}
 * @const
 */
export const config = {
  runtime: 'edge',
};

/**
 * @description نقطة نهاية API لجلب سجل مشتريات المستخدم.
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS، وطلبات `GET`
 *   لجلب تفاصيل جميع المنتجات التي قام مستخدم معين بشرائها،
 *   مرتبة حسب تاريخ الشراء.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 405, 500) if validation fails or an unexpected error occurs during database operations.
 * @see createClient
 */
export default async function handler(request) {
  // ترويسات CORS للسماح بالطلبات
  /**
   * @description ترويسات CORS (Cross-Origin Resource Sharing) للسماح بالطلبات من أي مصدر.
   * @type {object}
   * @const
   */
/**
 * @description ترويسات CORS (Cross-Origin Resource Sharing) للسماح بالطلبات من أي مصدر.
 * @type {object}
 * @const
 */
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const user_key = searchParams.get('user_key');

    if (!user_key) {
      return new Response(JSON.stringify({ error: 'معرّف المستخدم (user_key) مطلوب.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // استعلام معقد لجلب تفاصيل المشتريات
    const { rows } = await db.execute({
      sql: `
        SELECT
          p.productName,
          p.product_price,
          p.ImageName,
          oi.quantity,
          o.created_at,
          o.order_status,
          o.order_key
        FROM orders AS o
        JOIN order_items AS oi ON o.order_key = oi.order_key
        JOIN marketplace_products AS p ON oi.product_key = p.product_key
        WHERE o.user_key = ?
        ORDER BY o.created_at DESC;
      `,
      args: [user_key],
    });

    return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[API: /api/purchases] فشل فادح في جلب المشتريات:', error);
    return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء جلب المشتريات.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}