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

  // 1️⃣ التحقق من وجود متغير البيئة TURSO_AUTH_TOKEN
  if (!process.env.TURSO_AUTH_TOKEN) {
    console.error("[RunDatabaseAnalysis] خطأ: متغير البيئة TURSO_AUTH_TOKEN غير موجود أو فارغ.");
    console.error("يرجى ضبط التوكن قبل تشغيل التحليل:");
    console.error("PowerShell: $env:TURSO_AUTH_TOKEN=\"YOUR_TOKEN\"");
    console.error("CMD: set TURSO_AUTH_TOKEN=YOUR_TOKEN");
    console.error("Linux/macOS: export TURSO_AUTH_TOKEN=YOUR_TOKEN");
    process.exit(1); // إيقاف السكربت بسبب عدم وجود التوكن
  }

  try {
    console.log("[RunDatabaseAnalysis] تم العثور على توكن Turso، جاري التحليل...");
    
    const result = await analyzeAndSaveDatabase();

    console.log("[RunDatabaseAnalysis] التحليل اكتمل بنجاح!");
    console.log(`[RunDatabaseAnalysis] تم حفظ الملف في: ${result.filePath}`);
    console.log(`[RunDatabaseAnalysis] عدد الجداول: ${result.data.tables.length}`);
    
  } catch (error) {
    console.error("[RunDatabaseAnalysis] حدث خطأ أثناء التحليل:", error);
  }
})();
