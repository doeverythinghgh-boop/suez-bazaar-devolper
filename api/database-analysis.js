import { createClient } from "@libsql/client";
import fs from "fs";

// اتصال Turso
const db = createClient({
    url: "libsql://bazaar-bazaar.aws-eu-west-1.turso.io",
    authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * تحليل قاعدة البيانات بالكامل وتخزينها في ملف JSON
 */
export async function analyzeAndSaveDatabase() {
    const result = {};

    // 1. جلب أسماء جميع الجداول آلياً
    const tablesRes = await db.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `);

    const tables = tablesRes.rows.map(row => row.name);
    result.tables = tables;

    // 2. جلب CREATE TABLE لكل جدول
    const createStatements = {};
    const createRes = await db.execute(`
        SELECT name, sql FROM sqlite_master WHERE type='table';
    `);

    for (const row of createRes.rows) {
        createStatements[row.name] = row.sql;
    }

    result.createStatements = createStatements;

    // 3. معلومات الأعمدة (PRAGMA table_info)
    const tablesInfo = {};

    for (const table of tables) {
        const info = await db.execute(`PRAGMA table_info(${table});`);
        tablesInfo[table] = info.rows;
    }

    result.tablesInfo = tablesInfo;

    // 4. العلاقات الخارجية (PRAGMA foreign_key_list)
    const foreignKeys = {};

    for (const table of tables) {
        const fkRes = await db.execute(`PRAGMA foreign_key_list(${table});`);
        foreignKeys[table] = fkRes.rows;
    }

    result.foreignKeys = foreignKeys;

    // 5. حفظ النتائج في ملف JSON
    const filePath = "./database-analysis.json";
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");

    return {
        message: "تم تحليل قاعدة البيانات بنجاح وحفظ الملف",
        filePath,
        data: result
    };
}

// مثال تشغيل:
// const r = await analyzeAndSaveDatabase();
// console.log(r);
