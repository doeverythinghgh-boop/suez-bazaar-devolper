import { createClient } from "@libsql/client/web";

export const config = {
  runtime: 'edge',
};
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
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * @description ترويسات CORS للسماح بالطلبات من أي مصدر.
 * @type {object}
 * @const
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
/**
 * @description تحليل قاعدة البيانات بالكامل وتخزينها في ملف JSON.
 * @async
 * @function analyzeAndSaveDatabase
 * @returns {Promise<string>} 
 *   سلسلة نصية تحتوي على بيانات التحليل بصيغة JSON.
 * @throws {Error} إذا حدث خطأ أثناء الاتصال بقاعدة البيانات أو تنفيذ الاستعلامات.
 */
export async function analyzeAndSaveDatabase() {
  console.log("[API: /api/database-analysis] بدء تحليل قاعدة البيانات...");

  const result = {};
  
  // ✅ جديد: إضافة وصف تفصيلي للبيانات التي سيتم إرجاعها
  // ✅ تحسين: تم تحويل الوصف إلى مخطط منظم (schema) ليكون قابلاً للتحليل الآلي بواسطة أدوات الذكاء الاصطناعي.
  result.schemaMetadata = {
    ai_prompt: "You are a database analysis expert. This JSON contains the complete schema of an SQLite database. Use 'tableNames' to iterate through tables. Use 'tablesInfo' for column details and 'foreignKeys' to understand relationships between tables. Your task is to analyze this schema to answer questions, generate documentation, or create diagrams.",
    type: "object",
    properties: {
      tableNames: {
        type: "array",
        description: "An array of all user-defined table names in the database.",
        items: { type: "string" }
      },
      createStatements: {
        type: "object",
        description: "A map where each key is a table name and the value is its full 'CREATE TABLE' SQL statement.",
        additionalProperties: { type: "string" }
      },
      tablesInfo: {
        type: "object",
        description: "A map where each key is a table name, and the value is an array of objects describing each column in that table.",
        additionalProperties: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cid: { type: "integer", description: "Column ID (0-indexed position)." },
              name: { type: "string", description: "Column name." },
              type: { type: "string", description: "Declared data type (e.g., 'TEXT', 'INTEGER')." },
              notnull: { type: "integer", description: "1 if the column has a NOT NULL constraint, 0 otherwise." },
              dflt_value: { type: "any", description: "The default value for the column." },
              pk: { type: "integer", description: "1 if this column is part of the primary key, 0 otherwise." }
            }
          }
        }
      },
      foreignKeys: {
        type: "object",
        description: "A map where each key is a table name, and the value is an array of objects describing the foreign key constraints originating from that table.",
        additionalProperties: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer", description: "Unique ID for the FK constraint within the table." },
              seq: { type: "integer", description: "Sequence number for composite keys (starts at 0)." },
              table: { type: "string", description: "The parent table being referenced." },
              from: { type: "string", description: "The column in the current (child) table." },
              to: { type: "string", description: "The column in the parent table." },
              on_update: { type: "string", description: "Action for ON UPDATE (e.g., 'CASCADE')." },
              on_delete: { type: "string", description: "Action for ON DELETE (e.g., 'CASCADE')." },
              match: { type: "string", description: "The MATCH clause (usually 'NONE')." }
            }
          }
        }
      }
    }
  };

  try {
    // 1️⃣ جلب أسماء جميع الجداول
    console.log("[DatabaseAnalysis] جلب أسماء الجداول...");
    const tablesRes = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `);
    const tables = tablesRes.rows.map(row => row.name);
    result.tableNames = tables;
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
    const tableInfoStatements = tables.map(table => ({ sql: `PRAGMA table_info(${table});` }));
    const tableInfoResults = await db.batch(tableInfoStatements, 'read');
    for (const table of tables) {
      // نجد النتيجة المطابقة من خلال البحث في نتائج الدفعة
      const matchingResult = tableInfoResults.find(res => res.rows.length > 0 && tables.includes(table));
      tablesInfo[table] = matchingResult ? matchingResult.rows : [];
    }
    result.tablesInfo = tablesInfo;

    // 4️⃣ جلب العلاقات الخارجية لكل جدول
    console.log("[DatabaseAnalysis] جلب العلاقات الخارجية لكل جدول...");
    const foreignKeys = {};
    const fkStatements = tables.map(table => ({ sql: `PRAGMA foreign_key_list(${table});` }));
    const fkResults = await db.batch(fkStatements, 'read');
    for (const table of tables) {
      const matchingResult = fkResults.find(res => res.rows.length > 0 && tables.includes(table));
      foreignKeys[table] = matchingResult ? matchingResult.rows : [];
    }
    result.foreignKeys = foreignKeys;

    console.log("[DatabaseAnalysis] تم الانتهاء من التحليل بنجاح!");
    // 5️⃣ إرجاع النتائج كنص JSON
    return result;

  } catch (error) {
    console.error("[DatabaseAnalysis] خطأ أثناء التحليل:", error);
    throw error;
  }
}
/**
 * @description نقطة نهاية API لجلب تحليل شامل لهيكلية قاعدة البيانات.
 *   تتعامل مع طلبات `OPTIONS` (preflight) لـ CORS، وطلبات `GET`
 *   لإجراء التحليل وإرجاع النتائج.
 * @function handler
 * @param {Request} request - كائن طلب HTTP الوارد.
 * @returns {Promise<Response>} - وعد (Promise) يحتوي على كائن استجابة HTTP.
 */
export default async function handler(request) {
  // معالجة طلبات OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === 'GET') {
    try {
      const analysisResult = await analyzeAndSaveDatabase();
      return new Response(JSON.stringify(analysisResult, null, 2), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[API: /api/database-analysis] فشل فادح في تحليل قاعدة البيانات:', error);
      return new Response(JSON.stringify({ error: 'حدث خطأ في الخادم أثناء تحليل قاعدة البيانات.', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
