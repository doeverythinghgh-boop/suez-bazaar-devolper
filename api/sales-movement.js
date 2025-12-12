// استيراد دالة إنشاء العميل لقاعدة البيانات من مكتبة libsql للويب.
import { createClient } from "@libsql/client/web";

/**
 * @file api/sales-movement.js
 * @description نقطة نهاية API لجلب بيانات حركة المبيعات، مع دعم فلترة الطلبات بناءً على صلاحية المستخدم (1=بائع، 3=مشرف، 0=لا نتائج).
 * * **المنطق الجديد:**
 * * - is_seller = 1: جلب المنتجات التي قام ببيعها البائع فقط (فلترة حسب oi.seller_key).
 * * - is_seller = 3: جلب جميع الطلبات (عرض المشرف).
 * * - is_seller = 0 (أو غير ذلك): لا نتائج (عرض "عدم صلاحية").
 * * **نقطة النهاية المتوقعة:** /api/sales-movement?user_key=USER_ID_123
 */

// إعدادات Vercel لتشغيل هذه الدالة على "Edge Runtime".
/**
 * @description إعدادات تهيئة الوظيفة كـ Edge Function لـ Vercel.
 * @type {object}
 * @const
 */
export const config = {
  runtime: 'edge',
};

/**
 * @description يتحقق من صلاحية المستخدم ويعيد دوره (`is_seller`) من قاعدة البيانات.
 * @function getUserRole
 * @param {import("@libsql/client/web").Client} db - عميل قاعدة البيانات المستخدم للاتصال بـ Turso.
 * @param {string | null} userKey - مفتاح المستخدم (`user_key`) للتحقق من دوره.
 * @returns {Promise<number>} - وعد (Promise) يُرجع دور المستخدم (على سبيل المثال: 1 للبائع، 3 للمشرف، 0 لغير المصرح له).
 * @async
 * @throws {Error} - If a database error occurs during the role lookup.
 */
async function getUserRole(db, userKey) {
  if (!userKey) {
    return 0; // لا يوجد مفتاح، غير مصرح له.
  }

  const { rows } = await db.execute({
    sql: `SELECT is_seller FROM users WHERE user_key = ?;`,
    args: [userKey],
  });

  // إذا تم العثور على المستخدم، أعد دوره، وإلا أعد 0.
  return rows.length > 0 ? parseInt(rows[0].is_seller, 10) : 0;
}

// الدالة الرئيسية التي تتعامل مع الطلبات الواردة
/**
 * @description نقطة نهاية API لجلب بيانات حركة المبيعات، مع دعم فلترة الطلبات
 *   بناءً على صلاحية المستخدم (بائع، مشرف، أو خدمة توصيل).
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS وطلبات `GET`
 *   لجلب تفاصيل الطلبات وعناصرها المجمعة.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (405, 500) if the method is not allowed or a server error occurs.
 * @see createClient
 * @see getUserRole
 */
export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // معالجة طلبات OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // التأكد من أن الطلب هو من نوع GET فقط
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. استخراج user_key من سلسلة الاستعلام
    const url = new URL(request.url);
    const userKey = url.searchParams.get('user_key');

    console.log(`[API: /api/sales-movement] بدء جلب حركة المشتريات. user_key المقدم: ${userKey || 'None'}`);

    const db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // 2. التحقق من صلاحية المستخدم (is_seller)
    const userRole = await getUserRole(db, userKey);

    // 3. بناء شرط WHERE SQL ديناميكي بناءً على دور المستخدم
    let whereClause = '';
    let args = [];
    let logMessage = '';

    if (userRole === 1) {
      // حالة البائع: فلترة المنتجات بناءً على seller_key
      whereClause = 'WHERE oi.seller_key = ?';
      args.push(userKey); // userKey is guaranteed to exist here
      logMessage = `Filtering by seller_key: ${userKey} (is_seller = 1).`;
    } else if (userRole === 3 || userRole === 2) {
      // حالة المشرف (3) أو خدمة التوصيل (2): جلب جميع الطلبات
      whereClause = ''; // لا يتم إضافة شرط WHERE
      logMessage = `Fetching all sales movement (userRole = ${userRole}, Admin/Delivery view).`;
    } else {
      // حالة عدم الصلاحية (is_seller = 0): لا نتائج
      whereClause = 'WHERE 1 = 0'; // شرط مستحيل يحول دون إرجاع أي صفوف
      logMessage = `Access denied or invalid user (role = ${userRole}). Returning empty set.`;
    }
    
    console.log(`[DEV-LOG] ${logMessage}`);

    // استعلام شامل لجلب كل البيانات المطلوبة مع الشرط الديناميكي
    const { rows } = await db.execute({
      sql: `
        SELECT
          o.order_key,
          o.total_amount,
          o.order_status,
          o.created_at,
          u.username AS customer_name,
          u.phone AS customer_phone,
          u.Address AS customer_address,
          p.productName,
          p.product_price,
          oi.product_key AS item_product_key,
          oi.quantity,
          oi.seller_key -- ✅ إصلاح: إضافة حقل مفتاح البائع من جدول عناصر الطلب
        FROM orders AS o
        JOIN users AS u ON o.user_key = u.user_key
        JOIN order_items AS oi ON o.order_key = oi.order_key
        JOIN marketplace_products AS p ON oi.product_key = p.product_key
        ${whereClause} -- تطبيق شرط الفلترة هنا
        ORDER BY o.created_at DESC;
      `,
      args: args, // تمرير المصفوفة الديناميكية من الوسائط
    });

    // ✅ تتبع: تسجيل البيانات الخام القادمة من قاعدة البيانات
    console.log(`[DEV-LOG] /api/sales-movement: تم جلب ${rows.length} من سجلات المنتجات.`);


    // الخطوة التالية هي تجميع البيانات. هذه الخطوة لا تتغير.
    const ordersMap = new Map();
    for (const row of rows) {
      if (!ordersMap.has(row.order_key)) {
        ordersMap.set(row.order_key, {
          order_key: row.order_key,
          total_amount: row.total_amount,
          order_status: row.order_status,
          created_at: row.created_at,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_address: row.customer_address,
          items: []
        });
      }
      // أضف المنتج الحالي إلى قائمة المنتجات.
      ordersMap.get(row.order_key).items.push({
        productName: row.productName,
        product_price: row.product_price,
        quantity: row.quantity,
        product_key: row.item_product_key,
        seller_key: row.seller_key // ✅ إصلاح: إضافة مفتاح البائع إلى كائن المنتج
      });
    }

    // تحويل الـ Map إلى مصفوفة من الطلبات المجمعة.
    const groupedOrders = Array.from(ordersMap.values());
    
    // ✅ تتبع: تسجيل البيانات المجمعة قبل إرسالها
    console.log(`[DEV-LOG] /api/sales-movement: تم تجميع البيانات في ${groupedOrders.length} طلب.`);

    // إرجاع البيانات المجمعة كاستجابة JSON ناجحة.
    return new Response(JSON.stringify(groupedOrders), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    // في حالة حدوث أي خطأ، يتم تسجيله وإرجاع استجابة خطأ.
    console.error('[API: /api/sales-movement] فشل فادح في جلب البيانات:', error);
    return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء جلب حركة المشتريات.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}