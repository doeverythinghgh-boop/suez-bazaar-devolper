/**
 * @file api/send-notification.js
 * @description نقطة النهاية (API Endpoint) لإرسال إشعارات Push عبر FCM.
 *
 * هذا الملف يعمل كـ Node.js Serverless Function على Vercel.
 * يستخدم Firebase Admin SDK لإرسال الإشعارات إلى توكن جهاز معين.
 * يعتمد على متغيرات البيئة (Environment Variables) لإعداد Firebase Admin.
 */

import admin from "firebase-admin";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ✅ إصلاح جذري: التحقق من وجود جميع متغيرات البيئة المطلوبة قبل أي شيء آخر.
const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY_ID', 'FIREBASE_CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

let firebaseInitialized = false;
let initializationError = null;

// إعداد serviceAccount باستخدام متغيرات البيئة
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// تهيئة التطبيق فقط إذا لم يتم تهيئته من قبل وإذا كانت جميع متغيرات البيئة موجودة
if (!admin.apps.length && missingEnvVars.length === 0) {
    try {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        firebaseInitialized = true;
        console.log("[Firebase Init] Firebase Admin SDK initialized successfully.");
    } catch (e) {
        initializationError = e.message;
        console.error("[Firebase Init] FATAL: Failed to initialize Firebase Admin SDK.", e);
    }
} else if (missingEnvVars.length > 0) {
    initializationError = `Missing environment variables: ${missingEnvVars.join(', ')}`;
    console.error(`[Firebase Init] FATAL: ${initializationError}`);
} else if (admin.apps.length > 0) {
    firebaseInitialized = true; // تم تهيئته بالفعل في استدعاء سابق
}

export default async function handler(req, res) {
  // التعامل مع طلبات OPTIONS (preflight) أولاً لمنع أخطاء CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);

  // التحقق مما إذا تم تهيئة Firebase بنجاح
  if (!firebaseInitialized) {
    console.error(`[API: /api/send-notification] Firebase Admin not initialized. Reason: ${initializationError}`);
    return res.status(500).json({ error: `فشل تهيئة خدمة الإشعارات في الخادم: ${initializationError}` });
  }

  const { token, title, body } = req.body;
  console.log(`[API: /api/send-notification] استلام طلب لإرسال إشعار إلى توكن: ...${token ? token.slice(-10) : 'N/A'}`);

  try {
    await admin.messaging().send({ token, notification: { title, body } });
    console.log(`[API: /api/send-notification] نجاح: تم إرسال الإشعار بنجاح.`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[API: /api/send-notification] فشل: حدث خطأ أثناء إرسال الإشعار:`, error);
    res.status(500).json({ error: error.message });
  }
}