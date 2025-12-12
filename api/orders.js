import { createClient } from "@libsql/client/web";

/**
 * @file api/orders.js
 * @description نقطة نهاية API لإنشاء طلبات جديدة.
 * 
 * تعالج هذه الدالة طلبات POST لإنشاء طلب جديد في قاعدة البيانات.
 * تستقبل بيانات الطلب (المستخدم، المبلغ الإجمالي، العناصر) وتقوم بتنفيذ
 * عملية إدخال مجمعة (batch) في جدولي `orders` و `order_items`.
 * هذا يضمن أن يتم إنشاء الطلب وعناصره معًا أو لا يتم إنشاؤها على الإطلاق.
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
 * @description نقطة نهاية API لإنشاء وتحديث الطلبات في قاعدة البيانات.
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS،
 *   وتطلبات `PUT` لتحديث حالة الطلبات،
 *   وطلبات `POST` لإنشاء طلبات جديدة وعناصرها.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 405, 500) if validation fails or an unexpected error occurs during database operations.
 * @see createClient
 */
export default async function handler(request) {
  /**
   * @const {object} corsHeaders - ترويسات CORS للسماح بالطلبات من أي مصدر.
   * @property {string} Access-Control-Allow-Origin - يسمح بالوصول من أي مصدر.
   * @property {string} Access-Control-Allow-Methods - طرق HTTP المسموح بها.
   * @property {string} Access-Control-Allow-Headers - ترويسات الطلب المسموح بها.
   */
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ✅ جديد: معالجة طلبات OPTIONS (preflight) التي يرسلها المتصفح
  /**
   * @description يعالج طلبات OPTIONS (preflight) لتمكين CORS.
   *   يرد برمز الحالة 204 (No Content) وتضمين ترويسات CORS.
   * @param {Request} request - كائن طلب HTTP الوارد.
   * @returns {Response} استجابة HTTP 204 مع ترويسات CORS.
   */
  if (request.method === 'OPTIONS') {
    console.log('[CORS] تمت معالجة طلب OPTIONS لـ /api/orders');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  /**
   * @description يعالج طلبات PUT لتحديث حالة طلب موجود في قاعدة البيانات.
   *   يتطلب 'order_key' و 'order_status' في جسم الطلب.
   * @param {Request} request - كائن طلب HTTP الوارد.
   * @returns {Promise<Response>} استجابة HTTP تشير إلى نجاح أو فشل التحديث.
   * @throws {Error} إذا كان 'order_key' أو 'order_status' مفقودًا، أو حدث خطأ في قاعدة البيانات.
   */
  if (request.method === 'PUT') {
    try {
      console.log('[API: /api/orders] بدء معالجة طلب تحديث حالة الطلب...');
      const { order_key, order_status } = await request.json();

      if (!order_key || order_status === undefined) {
        return new Response(JSON.stringify({ error: 'order_key و order_status مطلوبان.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const db = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });

      await db.execute({
        sql: "UPDATE orders SET order_status = ? WHERE order_key = ?",
        args: [String(order_status), order_key], // ✅ تحويل: ضمان أن القيمة نصية
      });

      console.log(`[API: /api/orders] نجاح! تم تحديث حالة الطلب ${order_key} إلى ${order_status}.`);
      return new Response(JSON.stringify({ success: true, message: 'تم تحديث حالة الطلب بنجاح.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('[API: /api/orders] فشل في تحديث حالة الطلب:', error);
      return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء تحديث حالة الطلب.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  /**
   * @description يعالج طلبات POST لإنشاء طلب جديد وعناصره في قاعدة البيانات.
   *   يتطلب 'order_key', 'user_key', 'total_amount', و 'items' (مصفوفة من عناصر الطلب)
   *   في جسم الطلب.
   *   يقوم بتنفيذ عملية إدخال مجمعة (batch) لضمان اتساق البيانات.
   * @param {Request} request - كائن طلب HTTP الوارد.
   * @returns {Promise<Response>} استجابة HTTP تشير إلى نجاح أو فشل الإنشاء.
   * @throws {Error} إذا كانت بيانات الطلب غير مكتملة أو حدث خطأ في قاعدة البيانات.
   */
  if (request.method === 'POST') {
    try {
      console.log('[API: /api/orders] بدء معالجة طلب إنشاء طلب جديد...');
      const { order_key, user_key, total_amount, items } = await request.json();
      console.log('[API: /api/orders] البيانات المستلمة:', { order_key, user_key, total_amount, items_count: items.length });

      // التحقق من وجود البيانات الأساسية
      // التحقق من وجود البيانات الأساسية
      // Fixed: Checked total_amount against undefined/null allowing 0
      if (!order_key || !user_key || total_amount === undefined || total_amount === null || !items || items.length === 0) {
        console.error('[API: /api/orders] خطأ: بيانات الطلب غير مكتملة.');
        return new Response(JSON.stringify({ error: 'بيانات الطلب غير مكتملة.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const db = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });

      /**
       * @type {Array<Object>} statements - مصفوفة من الاستعلامات لتنفيذها في معاملة واحدة.
       */
      const statements = [];

      // ✅ جديد: إنشاء القيمة الافتراضية لحالة الطلب بالتنسيق الجديد
      // الحالة الافتراضية هي "قيد المراجعة" (ID = 0)
      const initialOrderStatus = `0#${new Date().toISOString()}`;

      // 1. إضافة الطلب الرئيسي إلى جدول `orders`
      statements.push({
        sql: "INSERT INTO orders (order_key, user_key, total_amount, order_status) VALUES (?, ?, ?, ?)",
        args: [order_key, user_key, total_amount, initialOrderStatus],
      });

      // 2. إضافة كل عنصر من عناصر السلة إلى جدول `order_items`
      for (const item of items) {
        statements.push({
          sql: "INSERT INTO order_items (order_key, product_key, quantity, seller_key, note) VALUES (?, ?, ?, ?, ?)",
          args: [order_key, item.product_key, item.quantity, item.seller_key, item.note],
        });
      }

      // تنفيذ جميع الاستعلامات دفعة واحدة
      console.log('[API: /api/orders] جاري تنفيذ عملية الإدخال في قاعدة البيانات...');
      await db.batch(statements, 'write');
      console.log('[API: /api/orders] نجاح! تم إنشاء الطلب في قاعدة البيانات.');

      return new Response(JSON.stringify({ success: true, message: 'تم إنشاء الطلب بنجاح.', order_key }), {
        status: 201, // 201 Created
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('[API: /api/orders] فشل فادح في إنشاء الطلب:', error);
      return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء إنشاء الطلب.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // إذا لم يكن الطلب POST أو PUT، أرجع خطأ
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}