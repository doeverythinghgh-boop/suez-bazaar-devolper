/**
 * @file api/user-all-orders.js
 * @description نقطة نهاية (API Endpoint) لجلب جميع الطلبات المتعلقة بمستخدم معين بناءً على دوره.
 *
 * هذا الملف يعمل كواجهة خلفية (Serverless Function على Vercel) ويتولى كافة العمليات المتعلقة بالطلبات:
 * - GET: جلب تفاصيل الطلبات وعناصرها وخدمات التوصيل المرتبطة بها بناءً على user_key والدور (purchaser, seller, delivery, admin).
 * - OPTIONS: معالجة طلبات CORS Preflight.
 */
import { createClient } from "@libsql/client/web";

export const config = { runtime: 'edge' };
/**
 * @description إعدادات تهيئة الوظيفة كـ Edge Function لـ Vercel.
 * @type {object}
 * @const
 */

/**
 * @description نقطة نهاية API لجلب جميع الطلبات المتعلقة بمستخدم معين بناءً على دوره.
 * تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS وطلبات `GET` لجلب تفاصيل الطلبات وعناصرها المجمعة.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 405, 500, 503, 504) if validation fails or an unexpected error occurs during database operations.
 * @see createClient
 */
export default async function handler(request) {
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

  console.log(`[API: user-all-orders] بدء معالجة طلب ${request.method} إلى ${request.url}`);

  // معالجة طلبات CORS preflight
  if (request.method === 'OPTIONS') {
    console.log('[CORS] تمت معالجة طلب OPTIONS');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // التأكد من أن الطريقة مسموحة
  if (request.method !== 'GET') {
    console.error(`[API: user-all-orders] طريقة غير مسموحة: ${request.method}`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // استخراج معاملات URL
    const { searchParams } = new URL(request.url);
    const user_key = searchParams.get('user_key');
    const role = searchParams.get('role');
    const order_key = searchParams.get('order_key'); // ✅ جديد: دعم الفلترة برقم الطلب

    console.log(`[API: user-all-orders] المعاملات المستلمة - user_key: ${user_key}, role: ${role}, order_key: ${order_key || 'N/A'}`);

    // التحقق من وجود المعاملات المطلوبة
    if (!user_key) {
      console.error('[API: user-all-orders] خطأ: user_key مطلوب');
      return new Response(JSON.stringify({
        error: 'user_key مطلوب',
        message: 'يجب توفير معرف المستخدم'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!role) {
      console.error('[API: user-all-orders] خطأ: role مطلوب');
      return new Response(JSON.stringify({
        error: 'role مطلوب',
        message: 'يجب تحديد دور المستخدم (purchaser, seller, delivery, admin)',
        valid_roles: ['purchaser', 'seller', 'delivery', 'admin']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // التحقق من صحة دور المستخدم
    const validRoles = ['purchaser', 'seller', 'delivery', 'admin'];
    if (!validRoles.includes(role)) {
      console.error(`[API: user-all-orders] خطأ: role غير صالح: ${role}`);
      return new Response(JSON.stringify({
        error: 'role غير صالح',
        message: `الدور ${role} غير مسموح به`,
        valid_roles: validRoles
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[API: user-all-orders] بدء معالجة الطلب لـ user_key: ${user_key} كـ ${role}`);

    // إنشاء اتصال بقاعدة البيانات
    const db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('[API: user-all-orders] تم الاتصال بقاعدة البيانات');

    let orderKeysQuery;
    let queryArgs = [];

    // بناء استعلام مفاتيح الطلبات بناءً على الدور
    console.log(`[API: user-all-orders] بناء استعلام لجمع مفاتيح الطلبات للدور: ${role}`);

    switch (role) {
      case 'purchaser':
        orderKeysQuery = `SELECT order_key FROM orders WHERE user_key = ?`;
        queryArgs = [user_key];
        if (order_key) {
          orderKeysQuery += ` AND order_key = ?`;
          queryArgs.push(order_key);
        }
        console.log('[API: user-all-orders] البحث عن الطلبات التي اشتراها المستخدم');
        break;

      case 'seller':
        orderKeysQuery = `
          SELECT DISTINCT o.order_key 
          FROM orders o 
          JOIN order_items oi ON o.order_key = oi.order_key 
          WHERE oi.seller_key = ?
        `;
        queryArgs = [user_key];
        if (order_key) {
          orderKeysQuery += ` AND o.order_key = ?`;
          queryArgs.push(order_key);
        }
        console.log('[API: user-all-orders] البحث عن الطلبات التي يبيعها المستخدم');
        break;

      case 'delivery':
        orderKeysQuery = `
          SELECT DISTINCT o.order_key 
          FROM orders o 
          JOIN order_items oi ON o.order_key = oi.order_key 
          JOIN suppliers_deliveries sd ON oi.seller_key = sd.seller_key 
          WHERE sd.delivery_key = ? AND sd.is_active = 1
        `;
        queryArgs = [user_key];
        if (order_key) {
          orderKeysQuery += ` AND o.order_key = ?`;
          queryArgs.push(order_key);
        }
        console.log('[API: user-all-orders] البحث عن الطلبات التي يوزعها المستخدم');
        break;

      case 'admin':
        orderKeysQuery = `SELECT order_key FROM orders WHERE 1=1`;
        queryArgs = [];
        if (order_key) {
          orderKeysQuery += ` AND order_key = ?`;
          queryArgs.push(order_key);
        }
        console.log('[API: user-all-orders] البحث عن جميع الطلبات (وضع المشرف)');
        break;
    }

    // تنفيذ استعلام مفاتيح الطلبات
    console.log(`[API: user-all-orders] جاري تنفيذ استعلام مفاتيح الطلبات...`);
    const { rows: orderKeysRows } = await db.execute({
      sql: orderKeysQuery,
      args: queryArgs,
    });

    console.log(`[API: user-all-orders] تم العثور على ${orderKeysRows.length} طلب مرتبط بالمستخدم`);

    if (orderKeysRows.length === 0) {
      console.log('[API: user-all-orders] لا توجد طلبات مرتبطة، إرجاع مصفوفة فارغة');
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // تحويل النتائج إلى مصفوفة من المفاتيح
    const orderKeysArray = orderKeysRows.map(row => row.order_key);
    const placeholders = orderKeysArray.map(() => '?').join(',');

    console.log(`[API: user-all-orders] جاري جلب تفاصيل ${orderKeysArray.length} طلب...`);

    // جلب تفاصيل الطلبات
    const { rows: orders } = await db.execute({
      sql: `
        SELECT 
          o.order_key,
          o.user_key,
          o.total_amount,
          o.order_status,
          o.created_at,
          u.username as user_name,
          u.phone as user_phone,
          u.Address as user_address,
          u.location as user_location
        FROM orders o
        JOIN users u ON o.user_key = u.user_key
        WHERE o.order_key IN (${placeholders})
        ORDER BY o.created_at DESC
      `,
      args: orderKeysArray,
    });

    console.log(`[API: user-all-orders] تم جلب تفاصيل ${orders.length} طلب`);

    // جلب جميع عناصر الطلبات
    console.log('[API: user-all-orders] جاري جلب عناصر الطلبات...');
    const { rows: orderItems } = await db.execute({
      sql: `
        SELECT 
          oi.order_key,
          oi.product_key,
          oi.quantity,
          oi.quantity,
          oi.seller_key,
          oi.note,
          mp.productName as product_name,
          mp.product_price as product_price,
          mp.realPrice as real_price
        FROM order_items oi
        JOIN marketplace_products mp ON oi.product_key = mp.product_key
        WHERE oi.order_key IN (${placeholders})
      `,
      args: orderKeysArray,
    });

    console.log(`[API: user-all-orders] تم جلب ${orderItems.length} عنصر طلب`);

    // تجميع العناصر حسب order_key في الذاكرة
    const itemsByOrder = {};
    orderItems.forEach(item => {
      if (!itemsByOrder[item.order_key]) {
        itemsByOrder[item.order_key] = [];
      }
      itemsByOrder[item.order_key].push(item);
    });

    // جلب جميع خدمات التوصيل المفعلة للبائعين الموجودين في الطلبات
    const sellerKeys = [...new Set(orderItems.map(item => item.seller_key))];
    let activeDeliveries = {};

    if (sellerKeys.length > 0) {
      console.log(`[API: user-all-orders] جاري جلب خدمات التوصيل لـ ${sellerKeys.length} بائع`);

      const sellerPlaceholders = sellerKeys.map(() => '?').join(',');

      const { rows: deliveries } = await db.execute({
        sql: `
          SELECT 
            sd.seller_key,
            sd.delivery_key,
            u.username as delivery_name,
            u.phone as delivery_phone
          FROM suppliers_deliveries sd
          JOIN users u ON sd.delivery_key = u.user_key
          WHERE sd.seller_key IN (${sellerPlaceholders}) 
            AND sd.is_active = 1
          ORDER BY sd.seller_key, u.username
        `,
        args: sellerKeys,
      });

      console.log(`[API: user-all-orders] تم جلب ${deliveries.length} خدمة توصيل مفعلة`);

      // تجميع خدمات التوصيل حسب seller_key
      deliveries.forEach(delivery => {
        if (!activeDeliveries[delivery.seller_key]) {
          activeDeliveries[delivery.seller_key] = [];
        }
        activeDeliveries[delivery.seller_key].push({
          delivery_key: delivery.delivery_key,
          delivery_name: delivery.delivery_name,
          delivery_phone: delivery.delivery_phone
        });
      });
    } else {
      console.log('[API: user-all-orders] لا توجد بائعين في عناصر الطلبات');
    }

    // بناء هيكل البيانات النهائي
    console.log('[API: user-all-orders] جاري بناء هيكل البيانات النهائي...');

    const ordersData = orders.map(order => {
      const items = itemsByOrder[order.order_key] || [];

      // Parse order_status to check for item-level statuses key#time#json
      let itemStatuses = {};
      const statusStr = order.order_status || "";
      const parts = statusStr.split('#');
      if (parts.length >= 3) {
        const jsonStr = parts.slice(2).join('#');
        try {
          itemStatuses = JSON.parse(jsonStr);
        } catch (e) {
          // Ignore parse errors
        }
      }

      const formattedItems = items.map(item => {
        const deliveries = activeDeliveries[item.seller_key] || [];
        // Use server status if available, otherwise default will be handled by frontend
        const serverStatus = itemStatuses[item.product_key] || null;

        return {
          product_key: item.product_key,
          product_name: item.product_name,
          quantity: item.quantity,
          seller_key: item.seller_key,
          note: item.note,
          product_price: item.product_price,
          item_status: serverStatus, // PASSING THE STATUS HERE
          real_price: item.real_price,
          supplier_delivery: deliveries
        };
      });

      return {
        order_key: order.order_key,
        user_key: order.user_key,
        user_name: order.user_name,
        user_phone: order.user_phone,
        user_address: order.user_address,
        user_location: order.user_location,
        order_status: order.order_status,
        created_at: order.created_at,
        total_amount: order.total_amount,
        order_items: formattedItems
      };
    });

    console.log(`[API: user-all-orders] تم بناء هيكل البيانات لـ ${ordersData.length} طلب`);
    console.log('[API: user-all-orders] إرجاع الاستجابة الناجحة');

    return new Response(JSON.stringify(ordersData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // معالجة الأخطاء
    console.error('[API: user-all-orders] خطأ فادح:', error);

    // تحديد نوع الخطأ
    let errorMessage = 'حدث خطأ في الخادم أثناء معالجة الطلب';
    let statusCode = 500;

    if (error.message && error.message.includes('no such table')) {
      errorMessage = 'خطأ في هيكل قاعدة البيانات: أحد الجداول مفقود';
      statusCode = 500;
    } else if (error.message && error.message.includes('syntax error')) {
      errorMessage = 'خطأ في بناء جملة الاستعلام';
      statusCode = 500;
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'خطأ في الاتصال بقاعدة البيانات';
      statusCode = 503;
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'انتهت مهلة الاتصال بقاعدة البيانات';
      statusCode = 504;
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}