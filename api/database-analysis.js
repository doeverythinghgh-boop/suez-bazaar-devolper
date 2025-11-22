import { createClient } from "@libsql/client";
import fs from "fs";

/**
 * @file api/database-analysis.js
 * @description تحليل قاعدة بيانات Turso بالكامل وحفظ جميع معلومات الجداول،
 * الأعمدة، وعلاقات المفاتيح الخارجية في ملف JSON.
 */

/**
 * @description تهيئة الاتصال بقاعدة البيانات Turso
 * @type {object}
 * @const
 */
const db = createClient({
  url: "libsql://bazaar-bazaar.aws-eu-west-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * @description تحليل قاعدة البيانات بالكامل وتخزينها في ملف JSON.
 * @async
 * @function analyzeAndSaveDatabase
 * @returns {Promise<{message: string, filePath: string, data: object}>} 
 *   رسالة النجاح، مسار الملف، وبيانات التحليل.
 * @throws {Error} إذا حدث خطأ أثناء الاتصال بقاعدة البيانات أو تنفيذ الاستعلامات.
 */
export async function analyzeAndSaveDatabase() {
  console.log("[DatabaseAnalysis] بدء تحليل قاعدة البيانات...");

  const result = {};

  try {
    // 1️⃣ جلب أسماء جميع الجداول
    console.log("[DatabaseAnalysis] جلب أسماء الجداول...");
    const tablesRes = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `);
    const tables = tablesRes.rows.map(row => row.name);
    result.tables = tables;
    console.log(`[DatabaseAnalysis] تم العثور على ${tables.length} جدول.`);

    // 2️⃣ جلب CREATE TABLE لكل جدول
    console.log("[DatabaseAnalysis] جلب CREATE TABLE لكل جدول...");
    const createStatements = {};
    const createRes = await db.execute(`
      SELECT name, sql FROM sqlite_master WHERE type='table';
    `);
    for (const row of createRes.rows) {
      createStatements[row.name] = row.sql;
    }
    result.createStatements = createStatements;

    // 3️⃣ جلب معلومات الأعمدة لكل جدول
    console.log("[DatabaseAnalysis] جلب معلومات الأعمدة لكل جدول...");
    const tablesInfo = {};
    for (const table of tables) {
      const info = await db.execute(`PRAGMA table_info(${table});`);
      tablesInfo[table] = info.rows;
    }
    result.tablesInfo = tablesInfo;

    // 4️⃣ جلب العلاقات الخارجية لكل جدول
    console.log("[DatabaseAnalysis] جلب العلاقات الخارجية لكل جدول...");
    const foreignKeys = {};
    for (const table of tables) {
      const fkRes = await db.execute(`PRAGMA foreign_key_list(${table});`);
      foreignKeys[table] = fkRes.rows;
    }
    result.foreignKeys = foreignKeys;

    // 5️⃣ حفظ النتائج في ملف JSON
    const filePath = "./database-analysis.json";
    console.log(`[DatabaseAnalysis] حفظ النتائج في الملف ${filePath}...`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");

    console.log("[DatabaseAnalysis] تم الانتهاء من التحليل بنجاح!");
    return {
      message: "تم تحليل قاعدة البيانات بنجاح وحفظ الملف",
      filePath,
      data: result,
    };

  } catch (error) {
    console.error("[DatabaseAnalysis] خطأ أثناء التحليل:", error);
    throw error;
  }
}

/**
 * @example
 * // لتشغيل التحليل مباشرة
 * (async () => {
 *   const r = await analyzeAndSaveDatabase();
 *   console.log(r);
 * })();
 */
