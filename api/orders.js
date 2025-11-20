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

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // ✅ جديد: إضافة ترويسات CORS للسماح بالطلبات من أي مصدر
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS', // ✅ تعديل: إضافة PUT
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ✅ جديد: معالجة طلبات OPTIONS (preflight) التي يرسلها المتصفح
  if (request.method === 'OPTIONS') {
    console.log('[CORS] تمت معالجة طلب OPTIONS لـ /api/orders');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST' && request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    try {
      console.log('[API: /api/orders] بدء معالجة طلب تحديث حالة الطلب...');
      const { order_key, order_status } = await request.json();

      if (!order_key || order_status === undefined) {
        return new Response(JSON.stringify({ error: 'مفتاح الطلب وحالة الطلب الجديدة مطلوبان.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const db = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });

      await db.execute({
        sql: "UPDATE orders SET order_status = ? WHERE order_key = ?",
        args: [order_status, order_key],
      });

      console.log(`[API: /api/orders] نجاح! تم تحديث حالة الطلب ${order_key} إلى ${order_status}.`);
      return new Response(JSON.stringify({ success: true, message: 'تم تحديث حالة الطلب بنجاح.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[API: /api/orders] فشل فادح في إنشاء الطلب:', error);
      return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء تحديث حالة الطلب.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } else if (request.method === 'PUT') {
    try {
      console.log('[API: /api/orders] بدء معالجة طلب تحديث حالة الطلب...');
      const { order_key, order_status } = await request.json();

      if (!order_key || order_status === undefined) {
        return new Response(JSON.stringify({ error: 'مفتاح الطلب وحالة الطلب الجديدة مطلوبان.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const db = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });

      await db.execute({
        sql: "UPDATE orders SET order_status = ? WHERE order_key = ?",
        args: [order_status, order_key],
      });

      console.log(`[API: /api/orders] نجاح! تم تحديث حالة الطلب ${order_key} إلى ${order_status}.`);
      return new Response(JSON.stringify({ success: true, message: 'تم تحديث حالة الطلب بنجاح.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[API: /api/orders] فشل فادح في تحديث حالة الطلب:', error);
      return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء تحديث حالة الطلب.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Fallback for any other case, though the initial check should prevent this.
  return new Response(JSON.stringify({ error: 'Request could not be processed.' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}