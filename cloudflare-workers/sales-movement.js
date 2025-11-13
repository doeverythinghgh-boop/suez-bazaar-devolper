import { createClient } from "@libsql/client/web";

/**
 * @file api/sales-movement.js
 * @description نقطة نهاية API لجلب بيانات حركة المشتريات الكاملة.
 * 
 * هذه الدالة مخصصة للمستخدمين المتقدمين (مسؤول، بائع، خدمة توصيل).
 * تقوم بجلب جميع الطلبات مع تفاصيلها، بما في ذلك بيانات العميل والمنتجات داخل كل طلب.
 * يتم تجميع النتائج حسب كل طلب (order_key) لتسهيل عرضها في الواجهة الأمامية.
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // ترويسات CORS للسماح بالطلبات
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
    console.log('[API: /api/sales-movement] بدء جلب حركة المشتريات...');

    const db = createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // استعلام شامل لجلب كل البيانات المطلوبة
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
          oi.quantity
        FROM orders AS o
        JOIN users AS u ON o.user_key = u.user_key
        JOIN order_items AS oi ON o.order_key = oi.order_key
        JOIN marketplace_products AS p ON oi.product_key = p.product_key
        ORDER BY o.created_at DESC;
      `,
      args: [],
    });

    console.log(`[API: /api/sales-movement] تم جلب ${rows.length} من سجلات المنتجات في الطلبات.`);

    // تجميع المنتجات تحت كل طلب
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
      ordersMap.get(row.order_key).items.push({
        productName: row.productName,
        product_price: row.product_price,
        quantity: row.quantity,
      });
    }

    const groupedOrders = Array.from(ordersMap.values());
    console.log(`[API: /api/sales-movement] تم تجميع البيانات في ${groupedOrders.length} طلب.`);

    return new Response(JSON.stringify(groupedOrders), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[API: /api/sales-movement] فشل فادح في جلب البيانات:', error);
    return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء جلب حركة المشتريات.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}