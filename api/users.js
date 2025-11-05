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

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    // ✅ إضافة مستخدم جديد
    if (req.method === "POST") {
      const { username, phone, user_key } = req.body;

      if (!username || !phone || !user_key) {
        return res.status(400).json({ error: "الاسم ورقم الهاتف والرقم التسلسلي مطلوبان" });
      }

      // ✅ التحقق مما إذا كان رقم الهاتف مسجلاً بالفعل
      const existingUser = await db.execute({
        sql: "SELECT phone FROM users WHERE phone = ?",
        args: [phone],
      });

      if (existingUser.rows.length > 0) {
        // إذا وجد، أرجع خطأ 409 (Conflict)
        return res.status(409).json({ error: "رقم الهاتف هذا مسجل بالفعل." });
      }

      // ✅ تنفيذ الإدخال في جدول users
      await db.execute({
        sql: "INSERT INTO users (username, phone, user_key) VALUES (?, ?, ?)",
        args: [username, phone, user_key]
      });

      return res.status(201).json({ message: "تم إضافة المستخدم بنجاح ✅" });
    }

    // ✅ جلب المستخدمين
    if (req.method === "GET") {
      // استخلاص رقم الهاتف من معاملات الاستعلام (e.g., /api/users?phone=123)
      const { phone } = req.query;

      // إذا تم توفير رقم هاتف، ابحث عن مستخدم معين
      if (phone) {
        const result = await db.execute({
          sql: "SELECT username, phone, is_seller, user_key FROM users WHERE phone = ?",
          args: [phone],
        });

        // إذا لم يتم العثور على المستخدم، أرجع خطأ 404
        if (result.rows.length === 0) {
          return res.status(404).json({ error: "المستخدم غير موجود" });
        }
        // أرجع بيانات المستخدم الذي تم العثور عليه
        return res.status(200).json(result.rows[0]);
      }

      // إذا لم يتم توفير رقم هاتف، أرجع جميع المستخدمين
      const allUsers = await db.execute("SELECT * FROM users");
      return res.status(200).json(allUsers.rows);
    }

    // ✅ تحديث المستخدمين (مثل is_seller)
    if (req.method === "PUT") {
      const updates = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
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

    return res.status(405).json({ error: "الطريقة غير مدعومة" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
