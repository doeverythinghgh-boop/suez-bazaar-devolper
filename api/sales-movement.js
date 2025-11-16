// استيراد دالة إنشاء العميل لقاعدة البيانات من مكتبة libsql للويب.
// النسخة "/web" مصممة خصيصًا للعمل في بيئات مثل Cloudflare Workers و Vercel Edge Functions.
import { createClient } from "@libsql/client/web";

/**
 * @file api/sales-movement.js
 * @description نقطة نهاية API (API Endpoint) لجلب بيانات حركة المبيعات الكاملة.
 * 
 * هذه الدالة مخصصة للمستخدمين المصرح لهم (مثل المسؤول، البائع، أو خدمة التوصيل).
 * تقوم بجلب جميع الطلبات مع تفاصيلها، بما في ذلك بيانات العميل والمنتجات داخل كل طلب.
 * يتم تجميع النتائج حسب مفتاح الطلب (order_key) لتسهيل عرضها في الواجهة الأمامية.
 */

// إعدادات Vercel لتشغيل هذه الدالة على "Edge Runtime".
// هذا يضمن استجابة سريعة وأداء عالي لأن الكود يعمل في بيئة خفيفة وقريبة من المستخدم.
export const config = {
  runtime: 'edge',
};

// الدالة الرئيسية التي تتعامل مع الطلبات الواردة إلى /api/sales-movement
export default async function handler(request) {
  // ترويسات CORS للسماح بالطلبات من أي مصدر ('*').
  // هذا ضروري للسماح للواجهة الأمامية (المستضافة على نطاق مختلف) بالوصول إلى هذه الـ API.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // معالجة طلبات "preflight" من نوع OPTIONS التي يرسلها المتصفح للتحقق من صلاحيات CORS.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // التأكد من أن الطلب هو من نوع GET فقط. أي نوع آخر سيتم رفضه.
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // استخدام كتلة try...catch للتعامل مع أي أخطاء قد تحدث أثناء تنفيذ الكود.
  try {
    console.log('[API: /api/sales-movement] بدء جلب حركة المشتريات...');

    // إنشاء اتصال مع قاعدة البيانات باستخدام متغيرات البيئة للأمان.
    const db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // استعلام شامل لجلب كل البيانات المطلوبة
    const { rows } = await db.execute({
      // الاستعلام يربط بين الطلبات (orders)، المستخدمين (users)، بنود الطلب (order_items)، والمنتجات (marketplace_products).
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
          oi.quantity
        FROM orders AS o
        JOIN users AS u ON o.user_key = u.user_key
        JOIN order_items AS oi ON o.order_key = oi.order_key
        JOIN marketplace_products AS p ON oi.product_key = p.product_key
        ORDER BY o.created_at DESC; -- ترتيب النتائج من الأحدث إلى الأقدم.
      `,
      args: [],
    });

    // ✅ تتبع: تسجيل البيانات الخام القادمة من قاعدة البيانات
    console.log(`[DEV-LOG] /api/sales-movement: تم جلب ${rows.length} من سجلات المنتجات. عينة من السجل الأول:`);
    if (rows.length > 0) console.log(rows[0]);


    // الخطوة التالية هي تجميع البيانات. الاستعلام يُرجع صفًا لكل "منتج" في الطلب،
    // مما يؤدي إلى تكرار بيانات الطلب نفسه. لذلك، نحتاج إلى تجميع هذه الصفوف.
    // نستخدم Map لضمان أن كل طلب (order_key) يظهر مرة واحدة فقط.
    const ordersMap = new Map();
    for (const row of rows) {
      // إذا لم يكن الطلب موجودًا في الـ Map، قم بإضافته مع بياناته الأساسية.
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
      // أضف المنتج الحالي إلى قائمة المنتجات (items) الخاصة بالطلب.
      ordersMap.get(row.order_key).items.push({
        productName: row.productName,
        product_price: row.product_price,
        quantity: row.quantity,
        product_key: row.item_product_key
      });
    }

    // تحويل الـ Map إلى مصفوفة من الطلبات المجمعة.
    const groupedOrders = Array.from(ordersMap.values());
    
    // ✅ تتبع: تسجيل البيانات المجمعة قبل إرسالها
    console.log(`[DEV-LOG] /api/sales-movement: تم تجميع البيانات في ${groupedOrders.length} طلب. عينة من الطلب الأول:`);
    if (groupedOrders.length > 0) console.log(groupedOrders[0]);

    // إرجاع البيانات المجمعة كاستجابة JSON ناجحة.
    return new Response(JSON.stringify(groupedOrders), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    // في حالة حدوث أي خطأ (مثل فشل الاتصال بقاعدة البيانات أو خطأ في الاستعلام)، يتم تسجيله.
    console.error('[API: /api/sales-movement] فشل فادح في جلب البيانات:', error);
    // إرجاع استجابة خطأ عامة للمستخدم للحفاظ على أمان الخادم.
    return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء جلب حركة المشتريات.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}