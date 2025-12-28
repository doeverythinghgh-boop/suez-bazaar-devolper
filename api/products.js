import { createClient } from "@libsql/client/web";

/**
 * @description إعدادات تهيئة الوظيفة كـ Edge Function لـ Vercel.
 * @type {object}
 * @const
 */
export const config = {
  runtime: 'edge',
};

/**
 * @description عميل قاعدة البيانات المستخدم للاتصال بقاعدة بيانات Turso.
 * @type {import("@libsql/client/web").Client}
 * @const
 * @see createClient
 */
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * @description ترويسات CORS (Cross-Origin Resource Sharing) للسماح بالطلبات من أي مصدر.
 * @type {object}
 * @const
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * @description نقطة نهاية API لإدارة المنتجات (الاستعلام، الإضافة، التحديث، الحذف).
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS،
 *   وطلبات `GET` لجلب المنتجات بناءً على معايير مختلفة (مفتاح المستخدم، مصطلحات البحث، الفئات)،
 *   وطلبات `POST` لإضافة منتج جديد،
 *   وطلبات `PUT` لتحديث منتج موجود،
 *   وطلبات `DELETE` لحذف منتج.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 404, 405, 500) if validation fails or an unexpected error occurs during database operations.
 */
export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET") {
    try {
      const { searchParams } = new URL(request.url);
      const user_key = searchParams.get('user_key');
      // ✅ جديد: استقبال معاملات البحث الجديدة
      const searchTerm = searchParams.get('searchTerm');
      const MainCategory = searchParams.get('MainCategory');
      const SubCategory = searchParams.get('SubCategory');
      const product_key = searchParams.get('product_key'); // ✅ إصلاح: استقبال معامل مفتاح المنتج
      const status = searchParams.get('status'); // ✅ جديد: استقبال معامل الحالة

      // ✅ جديد: تسجيل معايير البحث المستلمة لتسهيل التصحيح
      console.log(`[API: /api/products GET] Received request with params: searchTerm='${searchTerm}', MainCategory='${MainCategory}', SubCategory='${SubCategory}', user_key='${user_key}', status='${status}', product_key='${product_key}'`);

      let sql, args;

      // 1. Fetch Single Product
      if (product_key) {
        sql = `
          SELECT p.*, p.realPrice, u.username as sellerName, u.phone as seller_phone, u.location as seller_location
          FROM marketplace_products p
          JOIN users u ON p.user_key = u.user_key
          WHERE p.product_key = ?
        `;
        // If not explicitly asking for pending (status=0), enforce approval check for public safety
        if (status === null) {
          sql += " AND p.is_approved = 1";
        }
        sql += " ORDER BY p.id DESC LIMIT 1";
        args = [product_key];
      }

      // 2. Search / Filter Public Market (or User's Market if user_key provided)
      else if ((searchTerm && searchTerm !== 'null') || (MainCategory && MainCategory !== 'null')) {
        sql = `
          SELECT p.*, u.username as sellerName, u.phone as seller_phone, u.location as seller_location
          FROM marketplace_products p
          JOIN users u ON p.user_key = u.user_key
        `;
        const whereClauses = [];
        args = [];

        // Public Search: Show APPROVED only by default
        if (status === null) {
          whereClauses.push("p.is_approved = 1");
        } else {
          // Admin Search: Filter by status if provided
          whereClauses.push("p.is_approved = ?");
          args.push(parseInt(status));
        }

        // ✅ FIX: Filter by user_key if provided (Search within User's products)
        if (user_key) {
          whereClauses.push("p.user_key = ?");
          args.push(user_key);
        }

        if (searchTerm) {
          whereClauses.push("p.productName LIKE ?");
          args.push(`%${searchTerm}%`);
        }
        if (MainCategory) {
          whereClauses.push("p.MainCategory = ?");
          args.push(MainCategory);
        }
        if (SubCategory) {
          whereClauses.push("p.SubCategory = ?");
          args.push(SubCategory);
        }
        sql += " WHERE " + whereClauses.join(" AND ");
        sql += " ORDER BY p.id DESC";

      }
      // 3. Vendor/User Products
      else if (user_key) {
        // Fetch products for specific vendor
        sql = `
          SELECT p.*, u.username as sellerName, u.phone as seller_phone, u.location as seller_location
          FROM marketplace_products p 
          JOIN users u ON p.user_key = u.user_key
          WHERE p.user_key = ?
        `;
        args = [user_key];

        // Ensure status filter is applied if provided
        if (status !== null) {
          sql += " AND p.is_approved = ?";
          args.push(parseInt(status));
        }

        sql += " ORDER BY p.id DESC";
      }

      // 4. Admin View (Fetch by Status Only)
      else if (status !== null) {
        sql = `
          SELECT p.*, u.username as sellerName, u.phone as seller_phone, u.location as seller_location
          FROM marketplace_products p
          JOIN users u ON p.user_key = u.user_key
          WHERE p.is_approved = ?
        `;
        sql += " ORDER BY p.id DESC";
        args = [parseInt(status)];
      }

      else {
        // Default: Return empty if no valid params
        return new Response(JSON.stringify([]), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ✅ جديد: تسجيل جملة SQL النهائية والوسائط قبل التنفيذ
      console.log(`[API: /api/products GET] Executing SQL: ${sql}`);
      console.log(`[API: /api/products GET] With arguments:`, args);

      const { rows } = await db.execute({
        sql: sql, // تم بناء جملة SQL في الخطوات السابقة
        args: args,
      });

      // ✅ جديد: تسجيل عدد النتائج التي تم العثور عليها
      console.log(`[API: /api/products GET] Found ${rows.length} products.`);

      // ✅ إصلاح: إذا كان الطلب لمنتج واحد، أرجع الكائن مباشرة وليس مصفوفة
      if (product_key) {
        return new Response(JSON.stringify(rows[0] || null), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      // ✅ جديد: تسجيل الخطأ بشكل أوضح
      console.error('[API: /api/products GET] An error occurred:', err);
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء جلب المنتجات: " + err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === "POST") {
    try {
      const {
        productName,
        user_key,
        product_key,
        product_description,
        product_price,
        original_price,
        product_quantity,
        user_message,
        user_note,
        ImageName,
        MainCategory,
        SubCategory,
        ImageIndex,
        serviceType, // جديد: استقبال نوع الخدمة
        realPrice, // جديد
        heavyLoad // جديد: يحتاج سيارة
      } = await request.json();

      // تحقق بسيط من وجود البيانات الأساسية
      if (!user_key || !product_key || !MainCategory || !productName) {
        return new Response(JSON.stringify({ error: "البيانات الأساسية للمنتج مطلوبة." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await db.execute({
        sql: "INSERT INTO marketplace_products (productName, user_key, product_key, product_description, product_price, original_price, realPrice, product_quantity, user_message, user_note, ImageName, MainCategory, SubCategory, ImageIndex, serviceType, is_approved, heavyLoad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [productName, user_key, product_key, product_description, parseFloat(product_price), original_price ? parseFloat(original_price) : null, realPrice ? parseFloat(realPrice) : null, parseInt(product_quantity), user_message, user_note, ImageName, parseInt(MainCategory), SubCategory ? parseInt(SubCategory) : null, parseInt(ImageIndex), serviceType || 0, 0, parseInt(heavyLoad) || 0]
      });

      return new Response(JSON.stringify({ message: "تم إضافة المنتج إلى قاعدة البيانات بنجاح." }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error("Database insertion error:", err);
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء حفظ المنتج: " + err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === "PUT") {
    try {
      const {
        productName, // جديد
        product_key,
        product_description,
        product_price,
        product_quantity,
        original_price, // ✅ إضافة: استقبال السعر قبل الخصم
        user_message,
        user_note,
        ImageName,
        MainCategory,
        SubCategory,
        ImageIndex,
        serviceType, // جديد: استقبال نوع الخدمة
        is_approved, // ✅ إضافة: استقبال حالة الموافقة
        realPrice, // جديد
        heavyLoad // جديد: يحتاج سيارة
      } = await request.json();

      // التحقق من وجود مفتاح المنتج
      if (!product_key) {
        return new Response(JSON.stringify({ error: "مفتاح المنتج مطلوب للتحديث." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // بناء جملة التحديث ديناميكيًا
      const fieldsToUpdate = {
        productName,
        product_description,
        product_price: product_price !== undefined ? parseFloat(product_price) : undefined,
        original_price: original_price !== undefined ? (original_price ? parseFloat(original_price) : null) : undefined, // ✅ إضافة: معالجة السعر قبل الخصم
        product_quantity: product_quantity !== undefined ? parseInt(product_quantity) : undefined,
        user_message,
        user_note,
        ImageName,
        MainCategory: MainCategory !== undefined ? parseInt(MainCategory) : undefined,
        SubCategory: SubCategory !== undefined ? parseInt(SubCategory) || null : undefined,
        ImageIndex: ImageIndex !== undefined ? parseInt(ImageIndex) : undefined,
        serviceType: serviceType !== undefined ? parseInt(serviceType) : undefined, // جديد: استقبال نوع الخدمة
        is_approved: is_approved !== undefined ? parseInt(is_approved) : undefined, // ✅ إضافة: السماح بتحديث حالة الموافقة
        realPrice: realPrice !== undefined ? (realPrice ? parseFloat(realPrice) : null) : undefined,
        heavyLoad: heavyLoad !== undefined ? parseInt(heavyLoad) : undefined
      };

      const updateEntries = Object.entries(fieldsToUpdate).filter(([key, value]) => value !== undefined);
      if (updateEntries.length === 0) {
        return new Response(JSON.stringify({ error: "لا توجد بيانات لتحديثها." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const setClause = updateEntries.map(([key]) => `${key} = ?`).join(', ');
      const args = [...updateEntries.map(([, value]) => value), product_key];
      await db.execute({
        sql: `UPDATE marketplace_products SET ${setClause} WHERE product_key = ?`,
        args: args
      });

      return new Response(JSON.stringify({ message: "تم تحديث المنتج بنجاح." }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      console.error("Database update error:", err);
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء تحديث المنتج: " + err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === "DELETE") {
    try {
      const { searchParams } = new URL(request.url);
      const product_key = searchParams.get('product_key');

      if (!product_key) {
        return new Response(JSON.stringify({ error: "مفتاح المنتج مطلوب للحذف." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { rowsAffected } = await db.execute({
        sql: "DELETE FROM marketplace_products WHERE product_key = ?",
        args: [product_key],
      });

      if (rowsAffected === 0) {
        return new Response(JSON.stringify({ message: "المنتج غير موجود أو تم حذفه بالفعل." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ message: "تم حذف المنتج بنجاح." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err) {
      console.error("Database delete error:", err);
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء حذف المنتج: " + err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: "الطريقة غير مدعومة" }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}