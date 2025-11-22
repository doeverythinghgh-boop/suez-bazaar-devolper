(async () => {
    const r = await analyzeAndSaveDatabase();
 console.log(r);
  })();import { analyzeAndSaveDatabase } from "../api/database-analysis.js";

/**
 * @file js/RunDatabaseAnalysis.js
 * @description سكربت لتشغيل تحليل قاعدة البيانات وحفظ النتائج في JSON.
 *              يتحقق من وجود توكن Turso قبل البدء.
 */

(async () => {
  console.log("[RunDatabaseAnalysis] بدء تشغيل السكربت...");

  // 1️⃣ التحقق من وجود متغيرات البيئة المطلوبة
  const requiredEnv = ['DATABASE_URL', 'TURSO_AUTH_TOKEN'];
  const missingEnv = requiredEnv.filter(envVar => !process.env[envVar]);

  if (missingEnv.length > 0) {
    console.error(`[RunDatabaseAnalysis] خطأ: متغيرات البيئة التالية غير موجودة أو فارغة: ${missingEnv.join(', ')}`);
    console.error("يرجى ضبط المتغيرات قبل تشغيل التحليل. مثال:");
    
    if (process.platform === "win32") {
        console.error("PowerShell: $env:DATABASE_URL=\"YOUR_URL\"; $env:TURSO_AUTH_TOKEN=\"YOUR_TOKEN\"");
        console.error("CMD: set DATABASE_URL=YOUR_URL && set TURSO_AUTH_TOKEN=YOUR_TOKEN");
    } else {
        console.error("Linux/macOS: export DATABASE_URL=\"YOUR_URL\" && export TURSO_AUTH_TOKEN=\"YOUR_TOKEN\"");
    }

    process.exit(1); // إيقاف السكربت بسبب عدم وجود التوكن
  }

  try {
    console.log("[RunDatabaseAnalysis] تم العثور على متغيرات البيئة، جاري التحليل...");
    
    const result = await analyzeAndSaveDatabase();

    console.log("[RunDatabaseAnalysis] التحليل اكتمل بنجاح!");
    console.log(`[RunDatabaseAnalysis] تم حفظ الملف في: ${result.filePath}`);
    console.log(`[RunDatabaseAnalysis] عدد الجداول: ${result.data.tables.length}`);
    
  } catch (error) {
    console.error("[RunDatabaseAnalysis] حدث خطأ أثناء التحليل:", error);
  }
})();
