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

export const config = {
  runtime: 'edge',
};

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    console.log(`[CORS] Handled OPTIONS request for: ${request.url}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log(`[Request Start] Method: ${request.method}, URL: ${request.url}`);

    if (request.method === "POST") {
      const { action, phone, password, username, user_key, address } = await request.json();

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
        sql: "INSERT INTO users (username, phone, user_key, Password, Address) VALUES (?, ?, ?, ?, ?)",
        args: [username, phone, user_key, password || null, address || null]
      });

      return new Response(JSON.stringify({ message: "تم إضافة المستخدم بنجاح ✅" }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (request.method === "GET") {
      const { searchParams } = new URL(request.url);
      const phone = searchParams.get('phone');

      // إذا تم توفير رقم هاتف، ابحث عن مستخدم معين
      if (phone) {
        const result = await db.execute({
          sql: "SELECT id, username, phone, is_seller, user_key, Password, Address FROM users WHERE phone = ?",
          args: [phone],
        });

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (result.rows[0].Password) {
          return new Response(JSON.stringify({ passwordRequired: true }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify(result.rows[0]), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // إذا لم يتم توفير رقم هاتف، أرجع جميع المستخدمين
      // ✅ إصلاح: استخدام LEFT JOIN لجلب fcm_token مع كل مستخدم إن وجد.
      const allUsers = await db.execute(`
        SELECT 
          u.id, u.username, u.phone, u.is_seller, u.user_key, u.Address,
          ut.fcm_token
        FROM users u
        LEFT JOIN user_tokens ut ON u.user_key = ut.user_key
      `);
      return new Response(JSON.stringify(allUsers.rows), {
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
        const { user_key, username, phone, password, address } = updatesData;

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

      // بفضل ON DELETE CASCADE في قاعدة البيانات، سيتم حذف جميع البيانات المرتبطة
      // (المنتجات، الطلبات، التوكنات) تلقائيًا عند حذف المستخدم.
      const { rowsAffected } = await db.execute({
        sql: "DELETE FROM users WHERE user_key = ?",
        args: [user_key],
      });

      if (rowsAffected === 0) {
        return new Response(JSON.stringify({ error: "المستخدم غير موجود أو تم حذفه بالفعل." }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ message: "تم حذف الحساب وجميع البيانات المرتبطة به بنجاح." }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`[Warning] No logic matched for ${request.method} ${request.url}.`);
    return new Response(JSON.stringify({ error: "الطريقة غير مدعومة" }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("[FATAL ERROR]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
