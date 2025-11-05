/**
 * @file cloudflare-workers/file-manager.js
 * @description عامل Cloudflare Worker لإدارة الملفات وتخزينها على R2.
 * 
 * هذا العامل (Worker) يعمل كواجهة خلفية آمنة ومحمية للتعامل مع Cloudflare R2 Storage.
 * يوفر المسارات التالية:
 * - `/login`: لإصدار توكن مصادقة مؤقت (JWT-like) صالح لمدة ساعتين.
 * - `/upload`: لرفع الملفات (حتى 5MB) إلى R2 بعد التحقق من التوكن.
 * - `/download`: لتحميل الملفات من R2 بعد التحقق من التوكن.
 * - `/delete`: لحذف الملفات من R2 بعد التحقق من التوكن.
 * 
 * جميع المسارات المحمية تتطلب `X-Auth-Key` في الـ headers.
 */
export default {
  async fetch(req, env, ctx) {
    const { pathname, searchParams } = new URL(req.url);
    const method = req.method;
    const bucket = env.MY_BUCKET;

    // ✅ دعم Preflight (OPTIONS)
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // ✅ مسار /login → يصدر توكن مؤقت
    if (pathname === "/login" && method === "GET") {
      const token = await createToken(env.SECRET_KEY);
      return json({ token });
    }

    // 🔐 التحقق من التوكن
    const key = req.headers.get("X-Auth-Key") || req.headers.get("Authorization")?.replace("Bearer ", "");
    const auth = await verifyToken(key, env.SECRET_KEY);

    if (!auth) {
      return json({ error: "❌ المصادقة مطلوبة أو التوكن غير صالح." }, 401);
    }

    // ✅ رفع ملف
    if (pathname === "/upload" && method === "POST") {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return json({ error: "نوع الطلب غير صالح." }, 400);
      }

      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file.name !== "string") {
        return json({ error: "الملف غير موجود أو غير صالح." }, 400);
      }

      if (file.size > 5 * 1024 * 1024) {
        return json({ error: "⚠️ الحد الأقصى للملف هو 5MB." }, 413);
      }

      await bucket.put(file.name, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" }
      });

      return json({ success: true, message: "✅ تم رفع الملف", file: file.name });
    }

    // ✅ تحميل ملف
    if (pathname === "/download" && method === "GET") {
      const filename = searchParams.get("file");
      if (!filename) return json({ error: "يرجى تحديد اسم الملف." }, 400);

      const object = await bucket.get(filename);
      if (!object) return json({ error: "الملف غير موجود." }, 404);

      return new Response(object.body, {
        headers: {
          ...corsHeaders(),
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    // ✅ حذف ملف
    if (pathname === "/delete" && method === "DELETE") {
      const filename = searchParams.get("file");
      if (!filename) return json({ error: "يرجى تحديد اسم الملف." }, 400);

      await bucket.delete(filename);
      return json({ success: true, message: "✅ تم حذف الملف", file: filename });
    }

    // ⛔ مسار غير معروف
    return json({ error: "❌ المسار غير معروف." }, 404);
  }
};

// ✅ إنشاء توكن (JWT مبسط)
async function createToken(secret) {
  const payload = {
    role: "guest",
    exp: Date.now() + 1000 * 60 * 60 * 2 // صلاحية: ساعتان
  };

  const encoded = btoa(JSON.stringify(payload));
  const signature = await sha256(encoded + secret);
  return `${encoded}.${signature}`;
}

// ✅ التحقق من التوكن
async function verifyToken(token, secret) {
  if (!token) return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  const expected = await sha256(encoded + secret);
  if (expected !== signature) return false;

  const payload = JSON.parse(atob(encoded));
  return payload.exp > Date.now(); // تحقق من انتهاء الصلاحية
}

// ✅ SHA-256 signing
async function sha256(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ✅ JSON Response with CORS
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders()
    }
  });
}

// ✅ رؤوس CORS الموحدة
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Key, Authorization"
  };
}
