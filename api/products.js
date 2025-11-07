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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET") {
    try {
      const { searchParams } = new URL(request.url);
      const user_key = searchParams.get('user_key');
      const MainCategory = searchParams.get('MainCategory');
      const SubCategory = searchParams.get('SubCategory');

      let sql, args;

      if (MainCategory && SubCategory) {
        // ✅ تحسين: جلب المنتجات مع بيانات البائع عند التصفح حسب الفئة
        sql = `
          SELECT p.*, u.username as seller_username, u.phone as seller_phone 
          FROM marketplace_products p
          JOIN users u ON p.user_key = u.user_key
          WHERE p.MainCategory = ? AND p.SubCategory = ?
        `;
        args = [MainCategory, SubCategory];
      } else if (user_key) {
        // جلب منتجات بائع معين
        sql = "SELECT * FROM marketplace_products WHERE user_key = ?";
        args = [user_key];
      } else {
        // في حالة عدم وجود معاملات، أرجع مصفوفة فارغة بدلاً من كل المنتجات
        return new Response(JSON.stringify([]), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { rows } = await db.execute({
        sql: sql,
        args: args,
      });

      return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "حدث خطأ أثناء جلب المنتجات: " + err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === "POST") {
    try {
      const {
        productName, // جديد
        user_key,
        product_key,
        product_description,
        product_price,
        product_quantity,
        original_price, // ✅ إضافة: استقبال السعر الأصلي
        user_message,
        user_note,
        ImageName,
        MainCategory,
        SubCategory,
        ImageIndex
      } = await request.json();

      // تحقق بسيط من وجود البيانات الأساسية
      if (!user_key || !product_key || !product_price || !product_quantity || !MainCategory || !productName) {
        return new Response(JSON.stringify({ error: "البيانات الأساسية للمنتج مطلوبة." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await db.execute({
        sql: "INSERT INTO marketplace_products (productName, user_key, product_key, product_description, product_price, original_price, product_quantity, user_message, user_note, ImageName, MainCategory, SubCategory, ImageIndex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [productName, user_key, product_key, product_description, parseFloat(product_price), original_price ? parseFloat(original_price) : null, parseInt(product_quantity), user_message, user_note, ImageName, parseInt(MainCategory), parseInt(SubCategory) || null, parseInt(ImageIndex)]
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
        original_price, // ✅ إضافة: استقبال السعر الأصلي
        user_message,
        user_note,
        ImageName,
        MainCategory,
        SubCategory,
        ImageIndex
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
        original_price: original_price !== undefined ? (original_price ? parseFloat(original_price) : null) : undefined, // ✅ إضافة: معالجة السعر الأصلي
        product_quantity: product_quantity !== undefined ? parseInt(product_quantity) : undefined,
        user_message,
        user_note,
        ImageName,
        MainCategory: MainCategory !== undefined ? parseInt(MainCategory) : undefined,
        SubCategory: SubCategory !== undefined ? parseInt(SubCategory) || null : undefined,
        ImageIndex: ImageIndex !== undefined ? parseInt(ImageIndex) : undefined
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

  return new Response(JSON.stringify({ error: "الطريقة غير مدعومة" }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}