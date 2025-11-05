import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export default async function handler(req, res) {
  // ✅ CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-control-allow-methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ جلب منتجات خاصة بمستخدم معين
  if (req.method === "GET") {
    try {
      const { user_key, MainCategory, SubCategory } = req.query;

      let sql = "SELECT * FROM marketplace_products WHERE 1=1";
      const args = [];

      if (user_key) {
        sql += " AND user_key = ?";
        args.push(user_key);
      }

      if (MainCategory) {
        sql += " AND MainCategory = ?";
        args.push(MainCategory);
      }

      if (SubCategory) {
        sql += " AND SubCategory = ?";
        args.push(SubCategory);
      }

      const { rows } = await db.execute({
        sql: sql,
        args: args,
      });

      return res.status(200).json(rows);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "حدث خطأ أثناء جلب المنتجات: " + err.message });
    }
  }

  // ✅ إضافة منتج جديد
  if (req.method === "POST") {
    try {
      const {
        user_key,
        product_key,
        product_description,
        product_price,
        product_quantity,
        user_message,
        user_note,
        ImageName,
        MainCategory, // جديد
        SubCategory,  // جديد
        ImageIndex    // جديد
      } = req.body;

      // تحقق بسيط من وجود البيانات الأساسية
      if (!user_key || !product_key || !product_price || !product_quantity || !MainCategory) {
        return res.status(400).json({ error: "البيانات الأساسية للمنتج مطلوبة." });
      }

      await db.execute({
        sql: "INSERT INTO marketplace_products (user_key, product_key, product_description, product_price, product_quantity, user_message, user_note, ImageName, MainCategory, SubCategory, ImageIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [user_key, product_key, product_description, parseFloat(product_price), parseInt(product_quantity), user_message, user_note, ImageName, parseInt(MainCategory), parseInt(SubCategory) || null, parseInt(ImageIndex)]
      });

      return res.status(201).json({ message: "تم إضافة المنتج إلى قاعدة البيانات بنجاح." });

    } catch (err) {
      console.error("Database insertion error:", err);
      return res.status(500).json({ error: "حدث خطأ أثناء حفظ المنتج: " + err.message });
    }
  }

  // ✅ تحديث منتج موجود
  if (req.method === "PUT") {
    try {
      const {
        product_key,
        product_description,
        product_price,
        product_quantity,
        user_message,
        user_note,
        ImageName,
        MainCategory,
        SubCategory,
        ImageIndex
      } = req.body;

      // التحقق من وجود مفتاح المنتج
      if (!product_key) {
        return res.status(400).json({ error: "مفتاح المنتج مطلوب للتحديث." });
      }

      await db.execute({
        sql: "UPDATE marketplace_products SET product_description = ?, product_price = ?, product_quantity = ?, user_message = ?, user_note = ?, ImageName = ?, MainCategory = ?, SubCategory = ?, ImageIndex = ? WHERE product_key = ?",
        args: [product_description, parseFloat(product_price), parseInt(product_quantity), user_message, user_note, ImageName, parseInt(MainCategory), parseInt(SubCategory) || null, parseInt(ImageIndex), product_key]
      });

      return res.status(200).json({ message: "تم تحديث المنتج بنجاح." });

    } catch (err) {
      console.error("Database update error:", err);
      return res.status(500).json({ error: "حدث خطأ أثناء تحديث المنتج: " + err.message });
    }
  }

  return res.status(405).json({ error: "الطريقة غير مدعومة" });
}