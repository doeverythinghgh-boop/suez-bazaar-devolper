/**
 * @file api/save-token.js
 * @description نقطة النهاية (API Endpoint) لحفظ توكنات FCM في قاعدة بيانات Turso.
 */

import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { user_key, token } = req.body;
  console.log(`[API: /api/save-token] استلام طلب لحفظ توكن للمستخدم: ${user_key}`);

  if (!user_key || !token) {
    console.error('[API: /api/save-token] خطأ: الطلب لا يحتوي على user_key أو token.');
    return res.status(400).json({ error: "user_key and token are required." });
  }

  try {
    await db.execute("INSERT OR REPLACE INTO user_tokens (user_key, fcm_token) VALUES (?, ?)", [user_key, token]);
    console.log(`[API: /api/save-token] نجاح: تم حفظ التوكن للمستخدم ${user_key} بنجاح.`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[API: /api/save-token] فشل: خطأ في قاعدة البيانات للمستخدم ${user_key}:`, err);
    res.status(500).json({ error: err.message });
  }
}