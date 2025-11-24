import { createClient } from "@libsql/client/web";

export const config = {
  runtime: 'edge',
};

/**
 * @description تهيئة الاتصال بقاعدة البيانات Turso
 */
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * @description ترويسات CORS للسماح بالطلبات من أي مصدر.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * @description نقطة نهاية API لإدارة علاقات الموردين والموزعين.
 * - GET: لجلب قائمة الموزعين وحالة ارتباطهم ببائع معين.
 * - PUT: لتحديث (أو إنشاء) حالة الارتباط بين بائع وموزع.
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد يحتوي على كائن استجابة HTTP.
 */
export default async function handler(request) {
  // معالجة طلبات OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const sellerKey = url.searchParams.get('sellerKey');

      if (!sellerKey) {
        return new Response(JSON.stringify({ error: 'sellerKey is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // 1. جلب جميع المستخدمين الذين هم موزعين (is_seller = 2)
      const deliveriesRes = await db.execute({
        sql: "SELECT user_key, username, phone FROM users WHERE is_seller = 2",
        args: [],
      });
      const allDeliveries = deliveriesRes.rows;

      // 2. جلب العلاقات النشطة للبائع المحدد
      const relationsRes = await db.execute({
        sql: "SELECT delivery_key, is_active FROM suppliers_deliveries WHERE seller_key = ?",
        args: [sellerKey],
      });
      const activeRelations = new Map(relationsRes.rows.map(r => [r.delivery_key, r.is_active]));

      // 3. دمج البيانات: إضافة حالة 'isActive' لكل موزع
      const result = allDeliveries.map(delivery => ({
        deliveryKey: delivery.user_key,
        username: delivery.username,
        phone: delivery.phone,
        isActive: activeRelations.has(delivery.user_key) ? !!activeRelations.get(delivery.user_key) : false,
      }));

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method === 'PUT') {
      const { sellerKey, deliveryKey, isActive } = await request.json();

      if (!sellerKey || !deliveryKey || typeof isActive !== 'boolean') {
        return new Response(JSON.stringify({ error: 'sellerKey, deliveryKey, and isActive are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // استخدام UPSERT: إذا كان الصف موجودًا، قم بتحديثه. إذا لم يكن، قم بإدراجه.
      // ملاحظة: يتطلب هذا أن يكون لديك UNIQUE constraint على (seller_key, delivery_key)
      // CREATE UNIQUE INDEX idx_seller_delivery ON suppliers_deliveries(seller_key, delivery_key);
      await db.execute({
        sql: `
          INSERT INTO suppliers_deliveries (seller_key, delivery_key, is_active)
          VALUES (?, ?, ?)
          ON CONFLICT(seller_key, delivery_key) DO UPDATE SET
          is_active = excluded.is_active;
        `,
        args: [sellerKey, deliveryKey, isActive ? 1 : 0],
      });

      return new Response(JSON.stringify({ success: true, message: 'Relation updated successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // إذا كان نوع الطلب غير مدعوم
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('[API: /api/suppliers-deliveries] Error:', error);
    return new Response(JSON.stringify({ error: 'Server error occurred.', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

/**
 * ملاحظة هامة للمطور:
 * لضمان عمل منطق الـ UPSERT (INSERT ... ON CONFLICT) بشكل صحيح،
 * يجب التأكد من وجود فهرس فريد (UNIQUE INDEX) على العمودين `seller_key` و `delivery_key`
 * في جدول `suppliers_deliveries`. يمكنك تنفيذ الاستعلام التالي مرة واحدة على قاعدة بياناتك:
 *
 * CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_delivery ON suppliers_deliveries(seller_key, delivery_key);
 *
 * هذا يمنع وجود صفوف مكررة لنفس البائع والموزع ويسمح بتحديث العلاقة القائمة بكفاءة.
 */