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
 * @description تحقق من وجود user_key في جدول suppliers_deliveries
 * @param {string} userKey - مفتاح المستخدم للتحقق
 * @returns {Promise<boolean>} true إذا كان موجوداً في أي من العمودين
 */
export async function checkUserInSuppliersDeliveries(userKey) {
    if (!userKey) return false;
    
    const db = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });
    
    const { rows } = await db.execute({
        sql: `SELECT EXISTS(SELECT 1 FROM suppliers_deliveries WHERE seller_key = ? OR delivery_key = ?) as exists`,
        args: [userKey, userKey]
    });
    
    return rows[0].exists === 1;
}




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
      const activeOnly = url.searchParams.get('activeOnly') === 'true'; // ✅ إضافة: التحقق من وجود معامل لجلب النشطين فقط

      if (!sellerKey) {
        console.warn('[API] Bad Request: sellerKey is missing from query parameters.');
        return new Response(JSON.stringify({ error: 'sellerKey is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // ✅ إضافة: منطق جديد لجلب الموزعين النشطين فقط بكفاءة
      if (activeOnly) {
        console.log(`%c[API] Fetching ACTIVE delivery users for sellerKey: ${sellerKey}...`, "color: #8A2BE2;");
        const { rows } = await db.execute({
          sql: `
            SELECT
                u.user_key,
                u.username,
                u.phone,
                ut.fcm_token
            FROM
                users u
            JOIN
                suppliers_deliveries sd ON u.user_key = sd.delivery_key
            LEFT JOIN 
                user_tokens ut ON u.user_key = ut.user_key
            WHERE
              sd.seller_key = ? AND sd.is_active = 1 AND u.is_seller = 2;
          `,
          args: [sellerKey],
        });

        const result = rows.map(row => ({
          deliveryKey: row.user_key,
          username: row.username,
          phone: row.phone,
          fcmToken: row.fcm_token, // ✅ إضافة: تضمين التوكن في النتيجة
          isActive: true, // بما أننا جلبنا النشطين فقط، فستكون القيمة دائماً true
        }));

        console.log(`%c[API] Successfully fetched ${result.length} active delivery users.`, "color: green;");
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // --- المنطق الحالي لجلب جميع الموزعين مع حالتهم (يبقى كما هو) ---
      console.log(`[API] Fetching ALL delivery users and their status for sellerKey: ${sellerKey}...`);
      const { rows } = await db.execute({
        sql: `
          SELECT u.user_key, u.username, u.phone, CAST(COALESCE(sd.is_active, 0) AS BOOLEAN) as is_active
          FROM users u
          LEFT JOIN suppliers_deliveries sd ON u.user_key = sd.delivery_key AND sd.seller_key = ?
          WHERE u.is_seller = 2;
        `,
        args: [sellerKey],
      });
      const result = rows.map(row => ({
        deliveryKey: row.user_key,
        username: row.username,
        phone: row.phone,
        isActive: !!row.is_active,
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