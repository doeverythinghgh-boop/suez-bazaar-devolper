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
 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  // ✅ تتبع: معالجة طلبات CORS التمهيدية (preflight)
  if (request.method === "OPTIONS") {
    console.log(`[CORS] Handled OPTIONS request for: ${request.url}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`%c[API: /suppliers-deliveries] Received ${request.method} request for: ${request.url}`, "color: blue;");

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const sellerKey = url.searchParams.get('sellerKey');

      if (!sellerKey) {
        console.warn('[API] Bad Request: sellerKey is missing from query parameters.');
        return new Response(JSON.stringify({ error: 'sellerKey is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // 1. جلب جميع المستخدمين الذين هم موزعين (is_seller = 2)
      console.log('[API] Step 1: Fetching all delivery users (is_seller = 2)...');
      const deliveriesRes = await db.execute({
        sql: "SELECT user_key, username, phone FROM users WHERE is_seller = 2",
        args: [],
      });
      const allDeliveries = deliveriesRes.rows;
      console.log(`[API] Found ${allDeliveries.length} delivery users.`);

      // 2. جلب العلاقات النشطة للبائع المحدد
      console.log(`[API] Step 2: Fetching active relations for sellerKey: ${sellerKey}...`);
      const relationsRes = await db.execute({
        sql: "SELECT delivery_key, is_active FROM suppliers_deliveries WHERE seller_key = ?",
        args: [sellerKey],
      });
      const activeRelations = new Map(relationsRes.rows.map(r => [r.delivery_key, r.is_active]));
      console.log(`[API] Found ${activeRelations.size} active relations for this seller.`);

      // 3. دمج البيانات: إضافة حالة 'isActive' لكل موزع
      console.log('[API] Step 3: Merging delivery users with their relation status...');
      const result = allDeliveries.map(delivery => ({
        deliveryKey: delivery.user_key,
        username: delivery.username,
        phone: delivery.phone,
        isActive: activeRelations.has(delivery.user_key) ? !!activeRelations.get(delivery.user_key) : false,
      }));

      console.log(`%c[API] Successfully processed GET request. Returning ${result.length} items.`, "color: green;");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method === 'PUT') {
      console.log('[API] Processing PUT request to update/create a relation...');
      const { sellerKey, deliveryKey, isActive } = await request.json();

      if (!sellerKey || !deliveryKey || typeof isActive !== 'boolean') {
        console.warn('[API] Bad Request: Invalid payload for PUT request.', { sellerKey, deliveryKey, isActive });
        return new Response(JSON.stringify({ error: 'sellerKey, deliveryKey, and isActive are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // استخدام UPSERT: إذا كان الصف موجودًا، قم بتحديثه. إذا لم يكن، قم بإدراجه.
      // ملاحظة: يتطلب هذا أن يكون لديك UNIQUE constraint على (seller_key, delivery_key)
      // CREATE UNIQUE INDEX idx_seller_delivery ON suppliers_deliveries(seller_key, delivery_key);
      console.log(`[API] Executing UPSERT for seller: ${sellerKey}, delivery: ${deliveryKey}, isActive: ${isActive}`);
      await db.execute({
        sql: `
          INSERT INTO suppliers_deliveries (seller_key, delivery_key, is_active)
          VALUES (?, ?, ?)
          ON CONFLICT(seller_key, delivery_key) DO UPDATE SET
          is_active = excluded.is_active;
        `,
        args: [sellerKey, deliveryKey, isActive ? 1 : 0],
      });

      console.log(`%c[API] Successfully processed PUT request.`, "color: green;");
      return new Response(JSON.stringify({ success: true, message: 'Relation updated successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // إذا كان نوع الطلب غير مدعوم
    console.warn(`[API] Method Not Allowed: Received a ${request.method} request, which is not supported.`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('%c[API: /api/suppliers-deliveries] A critical error occurred:', "color: red; font-weight: bold;", error);
    return new Response(JSON.stringify({ error: 'Server error occurred.', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // التأكد من وجود الترويسات حتى في حالة الخطأ
    });
  }
}

/**
 * ملاحظة هامة للمطور:
 * لضمان عمل منطق الـ UPSERT (INSERT ... ON CONFLICT) بشكل صحيح،
 * يجب التأكد من وجود فهرس فريد (UNIQUE INDEX) على العمودين `seller_key` و `delivery_key`
 * في جدول `suppliers_deliveries`. إذا لم يكن موجودًا، يمكنك إضافته عن طريق تنفيذ
 * الاستعلام التالي مرة واحدة على قاعدة بيانات Turso الخاصة بك:
 *
 * ALTER TABLE suppliers_deliveries ADD CONSTRAINT unique_seller_delivery UNIQUE (seller_key, delivery_key);
 *
 * هذا يمنع وجود صفوف مكررة لنفس البائع والموزع ويسمح بتحديث العلاقة القائمة بكفاءة.
 */