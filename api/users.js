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
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export default async function handler(req, res) {  
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ معالجة جميع طلبات OPTIONS أولاً
  if (req.method === "OPTIONS") {
    console.log(`[CORS] Handled OPTIONS request for: ${req.url}`);
    return res.status(200).end();
  }

  try {
    console.log(`[Request Start] Method: ${req.method}, URL: ${req.url}`);
    // ✅ إضافة مستخدم جديد
    // تعديل الشرط للتعامل مع المسار الأساسي فقط
    if (req.method === "POST") {
      const { action, phone, password, username, user_key, address } = req.body;

      // ✅ الحالة 1: التحقق من كلمة المرور
      if (action === 'verify') {
        console.log("[Logic] Entered: Verify user password.");
        if (!phone || !password) {
          return res.status(400).json({ error: 'رقم الهاتف وكلمة المرور مطلوبان.' });
        }

        const result = await db.execute({
          sql: "SELECT * FROM users WHERE phone = ? AND Password = ?",
          args: [phone, password],
        });

        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
        }

        // أرجع بيانات المستخدم كاملة عند النجاح
        return res.status(200).json(result.rows[0]);
      }

      // ✅ الحالة 2: إنشاء مستخدم جديد (السلوك الافتراضي)
      console.log("[Logic] Entered: Add new user.");
      if (!username || !phone || !user_key) {
        return res.status(400).json({ error: "الاسم ورقم الهاتف والرقم التسلسلي مطلوبان" });
      }

      const existingUser = await db.execute({
        sql: "SELECT phone FROM users WHERE phone = ?",
        args: [phone],
      });
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: "رقم الهاتف هذا مسجل بالفعل." });
      }

      await db.execute({
        sql: "INSERT INTO users (username, phone, user_key, Password, Address) VALUES (?, ?, ?, ?, ?)",
        args: [username, phone, user_key, password || null, address || null]
      });

      return res.status(201).json({ message: "تم إضافة المستخدم بنجاح ✅" });
    } else if (req.method === "GET") {
      const { phone } = req.query;

      // إذا تم توفير رقم هاتف، ابحث عن مستخدم معين
      if (phone) {
        const result = await db.execute({
          sql: "SELECT username, phone, is_seller, user_key, Password, Address FROM users WHERE phone = ?",
          args: [phone],
        });

        // إذا لم يتم العثور على المستخدم، أرجع خطأ 404
        if (result.rows.length === 0) {
          return res.status(404).json({ error: "المستخدم غير موجود" });
        }

        // ✅ منطق تسجيل الدخول الجديد:
        // إذا كان للحساب كلمة مرور، لا ترجع بيانات المستخدم مباشرة.
        if (result.rows[0].Password) {
          return res.status(200).json({ passwordRequired: true });
        }
        // أرجع بيانات المستخدم الذي تم العثور عليه
        return res.status(200).json(result.rows[0]);
      }

      // إذا لم يتم توفير رقم هاتف، أرجع جميع المستخدمين
      const allUsers = await db.execute("SELECT * FROM users");
      return res.status(200).json(allUsers.rows);
    } else if (req.method === "PUT") {
      console.log("[Logic] Entered: Update users.");
      const body = req.body;

      // الحالة 1: تحديث مجموعة مستخدمين (من قبل المسؤول)
      if (Array.isArray(body)) {
        const updates = body;
        if (updates.length === 0) {
          return res.status(400).json({ error: "البيانات المرسلة غير صالحة." });
        }
        // استخدام معاملة لضمان تحديث كل شيء أو لا شيء
        const tx = await db.transaction("write");
        try {
          for (const user of updates) {
            await tx.execute({
              sql: "UPDATE users SET is_seller = ? WHERE phone = ?",
              args: [user.is_seller, user.phone],
            });
          }
          await tx.commit();
          return res.status(200).json({ message: "تم تحديث المستخدمين بنجاح." });
        } catch (e) {
          await tx.rollback();
          throw e; // سيتم التقاطه بواسطة كتلة catch الخارجية
        }
      }
      // الحالة 2: تحديث مستخدم واحد (تعديل البيانات الشخصية)
      else if (typeof body === 'object' && body.user_key) {
        const { user_key, username, phone, password, address } = body;

        // التحقق من أن رقم الهاتف الجديد (إذا تغير) غير مستخدم
        if (phone) {
          const existingPhone = await db.execute({
            sql: "SELECT user_key FROM users WHERE phone = ? AND user_key != ?",
            args: [phone, user_key]
          });
          if (existingPhone.rows.length > 0) {
            return res.status(409).json({ error: "رقم الهاتف هذا مستخدم بالفعل." });
          }
        }

        // بناء جملة التحديث ديناميكيًا
        const fields = [];
        const args = [];
        if (username) { fields.push("username = ?"); args.push(username); }
        if (phone) { fields.push("phone = ?"); args.push(phone); }
        if (password) { fields.push("Password = ?"); args.push(password); }
        // السماح بتحديث العنوان إلى قيمة فارغة
        if (address !== undefined) { fields.push("Address = ?"); args.push(address); }

        if (fields.length === 0) {
          return res.status(400).json({ error: "لا توجد بيانات للتحديث." });
        }

        args.push(user_key); // إضافة user_key في النهاية لـ WHERE
        const sql = `UPDATE users SET ${fields.join(", ")} WHERE user_key = ?`;

        await db.execute({ sql, args });
        return res.status(200).json({ message: "تم تحديث بياناتك بنجاح." });
      }

      return res.status(400).json({ error: "تنسيق الطلب غير صالح." });
    }

    console.log(`[Warning] No logic matched for ${req.method} ${req.url}.`);
    return res.status(405).json({ error: "الطريقة غير مدعومة" });

  } catch (err) {
    console.error("[FATAL ERROR]", err);
    return res.status(500).json({ error: err.message });
  }
}
