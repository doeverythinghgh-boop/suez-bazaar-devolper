/**
 * @file api/users.js
 * @description نقطة النهاية (API Endpoint) لإدارة المستخدمين.
 * 
 * هذا الملف يعمل كواجهة خلفية (Serverless Function على Vercel) ويتولى كافة العمليات المتعلقة بالمستخدمين:
 * - POST: إنشاء مستخدم جديد مع التحقق من عدم تكرار رقم الهاتف.
 * - GET: جلب بيانات جميع المستخدمين أو مستخدم معين باستخدام رقم الهاتف.
 * - PUT: تحديث بيانات مجموعة من المستخدمين (مثل ترقيتهم إلى بائعين).
 * - OPTIONS: معالجة طلبات CORS Preflight.
 */
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * @description نقطة نهاية API لإدارة المستخدمين (الإنشاء، الاستعلام، التحديث، الحذف).
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS،
 *   وطلبات `POST` لإنشاء مستخدمين جدد أو التحقق من كلمات المرور،
 *   وطلبات `GET` لجلب جميع المستخدمين أو مستخدمين معينين،
 *   وطلبات `PUT` لتحديث بيانات المستخدمين (فردي أو جماعي)،
 *   وطلبات `DELETE` لحذف المستخدمين.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 401, 404, 405, 409, 500) if validation fails or an unexpected error occurs.
 * @see createClient
 */
export default async function handler(request) {
  if (request.method === "OPTIONS") {
    console.log(`[CORS] Handled OPTIONS request for: ${request.url}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log(`[Request Start] Method: ${request.method}, URL: ${request.url}`);

    if (request.method === "POST") {
      const { action, phone, password, username, user_key, address, location } = await request.json();

      // ✅ الحالة 1: التحقق من كلمة المرور
      if (action === 'verify') {
        console.log("[Logic] Entered: Verify user password.");
        if (!phone || !password) {
          return new Response(JSON.stringify({ error: 'رقم الهاتف وكلمة المرور مطلوبان.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const result = await db.execute({
          sql: "SELECT * FROM users WHERE phone = ? AND Password = ?",
          args: [phone, password],
        });

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: 'كلمة المرور غير صحيحة.' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // أرجع بيانات المستخدم كاملة عند النجاح
        return new Response(JSON.stringify(result.rows[0]), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ✅ الحالة 2: إنشاء مستخدم جديد (السلوك الافتراضي)
      console.log("[Logic] Entered: Add new user.");
      if (!username || !phone || !user_key) {
        return new Response(JSON.stringify({ error: "الاسم ورقم الهاتف والرقم التسلسلي مطلوبان" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existingUser = await db.execute({
        sql: "SELECT phone FROM users WHERE phone = ?",
        args: [phone],
      });
      if (existingUser.rows.length > 0) {
        return new Response(JSON.stringify({ error: "رقم الهاتف هذا مسجل بالفعل." }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await db.execute({
        sql: "INSERT INTO users (username, phone, user_key, Password, Address, location) VALUES (?, ?, ?, ?, ?, ?)",
        args: [username, phone, user_key, password || null, address || null, location || null]
      });

      return new Response(JSON.stringify({ message: "تم إضافة المستخدم بنجاح ✅" }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (request.method === "GET") {
      const { searchParams } = new URL(request.url);
      const phone = searchParams.get('phone');
      const role = searchParams.get('role'); // ✅ جديد: استقبال معامل "role"

      // إذا تم توفير رقم هاتف، ابحث عن مستخدم معين
      if (phone) {
        const result = await db.execute({
          sql: "SELECT id, username, phone, is_seller, user_key, Password, Address, location FROM users WHERE phone = ?",
          args: [phone],
        });

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(result.rows[0]), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ✅ جديد: إذا تم توفير دور، قم بالفلترة بناءً عليه
      if (role) {
        const result = await db.execute({
          sql: `
            SELECT id, username, phone, is_seller, user_key, Address, location,
                   (SELECT fcm_token FROM user_tokens ut WHERE ut.user_key = u.user_key LIMIT 1) as fcm_token
            FROM users u 
            WHERE is_seller = ?
          `,
          args: [parseInt(role, 10)]
        });
        return new Response(JSON.stringify(result.rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // إذا لم يتم توفير رقم هاتف، أرجع جميع المستخدمين
      // ✅ إصلاح: استخدام LEFT JOIN لجلب fcm_token مع كل مستخدم إن وجد.
      const result = await db.execute(`
        SELECT 
          u.id, u.username, u.phone, u.is_seller, u.user_key, u.Address, u.location, u.Password,
           ut.fcm_token,
    ut.platform  
        FROM users u
        LEFT JOIN user_tokens ut ON u.user_key = ut.user_key
      `);
      // ✅ جديد: إضافة حقل phone_link لتسهيل الاستخدام في الواجهة الأمامية
      const usersWithPhoneLink = result.rows.map(user => ({
        ...user,
        phone_link: `tel:${user.phone}`
      }));
      return new Response(JSON.stringify(usersWithPhoneLink), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (request.method === "PUT") {
      const updatesData = await request.json();

      // الحالة 1: تحديث مجموعة مستخدمين (مثل ترقية البائعين)
      if (Array.isArray(updatesData)) {
        console.log("[Logic] Entered: Bulk update users (is_seller).");
        if (updatesData.length === 0) {
          return new Response(JSON.stringify({ error: "البيانات المرسلة غير صالحة." }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const tx = await db.transaction("write");
        try {
          for (const user of updatesData) {
            await tx.execute({
              sql: "UPDATE users SET is_seller = ? WHERE phone = ?",
              args: [user.is_seller, user.phone],
            });
          }
          await tx.commit();
          return new Response(JSON.stringify({ message: "تم تحديث المستخدمين بنجاح." }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (e) {
          await tx.rollback();
          throw e;
        }
      }
      // الحالة 2: تحديث بيانات مستخدم واحد
      else if (typeof updatesData === 'object' && updatesData.user_key) {
        console.log(`[Logic] Entered: Update single user profile for key: ${updatesData.user_key}`);
        const { user_key, username, phone, password, address, location } = updatesData;

        // إذا تم تغيير رقم الهاتف، تحقق من أنه غير مستخدم
        if (phone) {
          const existingUser = await db.execute({
            sql: "SELECT user_key FROM users WHERE phone = ? AND user_key != ?",
            args: [phone, user_key],
          });
          if (existingUser.rows.length > 0) {
            return new Response(JSON.stringify({ error: "رقم الهاتف هذا مستخدم بالفعل من قبل حساب آخر." }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // بناء جملة التحديث ديناميكيًا لتحديث الحقول المقدمة فقط
        let sql = "UPDATE users SET ";
        const args = [];
        if (username) { sql += "username = ?, "; args.push(username); }
        if (phone) { sql += "phone = ?, "; args.push(phone); }
        if (password) { sql += "Password = ?, "; args.push(password); }
        if (address !== undefined) { sql += "Address = ?, "; args.push(address); }
        if (location !== undefined) { sql += "location = ?, "; args.push(location); }

        sql = sql.slice(0, -2); // إزالة الفاصلة الأخيرة
        sql += " WHERE user_key = ?";
        args.push(user_key);

        // التحقق من وجود حقول للتحديث قبل تنفيذ الاستعلام
        if (args.length <= 1) {
          return new Response(JSON.stringify({ error: "لا توجد بيانات لتحديثها." }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await db.execute({ sql, args });
        return new Response(JSON.stringify({ message: "تم تحديث بياناتك بنجاح." }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (request.method === "DELETE") {
      console.log("[Logic] Entered: Delete user.");
      const { user_key } = await request.json();

      if (!user_key) {
        return new Response(JSON.stringify({ error: "مفتاح المستخدم (user_key) مطلوب للحذف." }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // بفضل ON DELETE CASCADE في قاعدة البيانات، سيتم حذف جميع البيانات المرتبطة بالمستخدم تلقائيًا
      const { rowsAffected } = await db.execute({
        sql: "DELETE FROM users WHERE user_key = ?",
        args: [user_key],
      });

      if (rowsAffected === 0) {
        return new Response(JSON.stringify({ message: "المستخدم غير موجود أو تم حذفه بالفعل." }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ message: "تم حذف المستخدم بنجاح." }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error(`[Request Error] Method: ${request.method}, URL: ${request.url}, Error:`, err);
    return new Response(JSON.stringify({ error: "حدث خطأ في الخادم: " + err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
// بفضل ON DELETE CASCADE في قاعدة البيانات، سيتم حذف جميع ال