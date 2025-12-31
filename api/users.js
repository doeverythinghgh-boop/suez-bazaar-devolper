/**
 * @file api/users.js
 * @description API Endpoint for user management.
 * 
 * This file acts as a serverless backend (Vercel Edge Function) and handles all user-related operations:
 * - POST: Create a new user with phone number uniqueness check, or verify password.
 * - GET: Fetch data for all users or a specific user by phone number/role.
 * - PUT: Update user data (bulk update for sellers or individual profile update).
 * - OPTIONS: Handle CORS Preflight requests.
 * - DELETE: Delete a user by user_key.
 */
import { createClient } from "@libsql/client/web";

/**
 * @description Edge Function configuration for Vercel.
 * @type {object}
 * @const
 */
export const config = {
  runtime: 'edge',
};

/**
 * @description Database client for connecting to Turso DB.
 * @type {import("@libsql/client/web").Client}
 * @const
 * @see createClient
 */
const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * @description CORS headers to allow requests from any origin.
 * @type {object}
 * @const
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * @description API endpoint handler for user management (Create, Query, Update, Delete).
 * @function handler
 * @param {Request} request - Incoming HTTP request object.
 * @returns {Promise<Response>} - HTTP response object.
 * @async
 */
export default async function handler(request) {
  if (request.method === "OPTIONS") {
    console.log(`[CORS] Handled OPTIONS request for: ${request.url}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log(`[Request Start] Method: ${request.method}, URL: ${request.url}`);

    if (request.method === "POST") {
      const { action, phone, password, username, user_key, address, location } = await request.json();

      // Case 1: Password Verification
      if (action === 'verify') {
        console.log("[Logic] Entered: Verify user password.");
        if (!phone || !password) {
          return new Response(JSON.stringify({ error: 'رقم الهاتف وكلمة المرور مطلوبان.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const result = await db.execute({
          sql: "SELECT * FROM users WHERE phone = ? AND Password = ?",
          args: [phone, password],
        });

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: 'كلمة المرور غير صحيحة.' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Return full user data on success
        return new Response(JSON.stringify(result.rows[0]), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Case 2: Create New User (Default Behavior)
      console.log("[Logic] Entered: Add new user.");
      if (!username || !phone || !user_key) {
        return new Response(JSON.stringify({ error: "الاسم ورقم الهاتف والرقم التسلسلي مطلوبان" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existingUser = await db.execute({
        sql: "SELECT phone FROM users WHERE phone = ?",
        args: [phone],
      });
      if (existingUser.rows.length > 0) {
        return new Response(JSON.stringify({ error: "رقم الهاتف هذا مسجل بالفعل." }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await db.execute({
        sql: "INSERT INTO users (username, phone, user_key, Password, Address, location) VALUES (?, ?, ?, ?, ?, ?)",
        args: [username, phone, user_key, password || null, address || null, location || null]
      });

      return new Response(JSON.stringify({ message: "تم إضافة المستخدم بنجاح ✅" }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (request.method === "GET") {
      const { searchParams } = new URL(request.url);
      const phone = searchParams.get('phone');
      const role = searchParams.get('role');

      // Search for a specific user if phone is provided
      if (phone) {
        const result = await db.execute({
          sql: "SELECT id, username, phone, is_seller, user_key, Password, Address, location, limitPackage, isDelevred FROM users WHERE phone = ?",
          args: [phone],
        });

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(result.rows[0]), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Filter by role if provided
      if (role) {
        const result = await db.execute({
          sql: `
            SELECT id, username, phone, is_seller, user_key, Address, location,
                   (SELECT fcm_token FROM user_tokens ut WHERE ut.user_key = u.user_key LIMIT 1) as fcm_token
            FROM users u 
            WHERE is_seller = ?
          `,
          args: [parseInt(role, 10)]
        });
        return new Response(JSON.stringify(result.rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Return all users if no phone/role provided
      // Use LEFT JOIN to fetch fcm_token with each user
      const result = await db.execute(`
        SELECT 
          u.id, u.username, u.phone, u.is_seller, u.user_key, u.Address, u.location, u.Password,
          u.limitPackage, u.isDelevred,
           ut.fcm_token,
    ut.platform  
        FROM users u
        LEFT JOIN user_tokens ut ON u.user_key = ut.user_key
      `);

      // Add phone_link field for UI convenience
      const usersWithPhoneLink = result.rows.map(user => ({
        ...user,
        phone_link: `tel:${user.phone}`
      }));
      return new Response(JSON.stringify(usersWithPhoneLink), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (request.method === "PUT") {
      const updatesData = await request.json();

      // Case 1: Bulk Update Users (e.g., Promote to Seller)
      if (Array.isArray(updatesData)) {
        console.log("[Logic] Entered: Bulk update users (is_seller).");
        if (updatesData.length === 0) {
          return new Response(JSON.stringify({ error: "البيانات المرسلة غير صالحة." }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const tx = await db.transaction("write");
        try {
          for (const user of updatesData) {
            await tx.execute({
              sql: "UPDATE users SET is_seller = ? WHERE phone = ?",
              args: [user.is_seller, user.phone],
            });
          }
          await tx.commit();
          return new Response(JSON.stringify({ message: "تم تحديث المستخدمين بنجاح." }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (e) {
          await tx.rollback();
          throw e;
        }
      }
      // Case 2: Individual User Profile Update
      else if (typeof updatesData === 'object' && updatesData.user_key) {
        console.log(`[Logic] Entered: Update single user profile for key: ${updatesData.user_key}`);
        console.log(`[Logic] updatesData content: ${JSON.stringify(updatesData)}`);
        const { user_key, username, phone, password, address, location, limitPackage, isDelevred } = updatesData;

        // Verify phone number uniqueness if it is being changed
        if (phone) {
          const existingUser = await db.execute({
            sql: "SELECT user_key FROM users WHERE phone = ? AND user_key != ?",
            args: [phone, user_key],
          });
          if (existingUser.rows.length > 0) {
            return new Response(JSON.stringify({ error: "رقم الهاتف هذا مستخدم بالفعل من قبل حساب آخر." }), {
              status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // Build update SQL dynamically for provided fields
        let sql = "UPDATE users SET ";
        const args = [];
        if (username !== undefined) { sql += "username = ?, "; args.push(username); }
        if (phone !== undefined) { sql += "phone = ?, "; args.push(phone); }
        if (password !== undefined) { sql += "Password = ?, "; args.push(password); }
        if (address !== undefined) { sql += "Address = ?, "; args.push(address); }
        if (location !== undefined) { sql += "location = ?, "; args.push(location); }
        if (limitPackage !== undefined) { sql += "limitPackage = ?, "; args.push(limitPackage); }
        if (isDelevred !== undefined) { sql += "isDelevred = ?, "; args.push(isDelevred); }

        sql = sql.slice(0, -2); // Remove last comma
        sql += " WHERE user_key = ?";
        args.push(user_key);

        // Check if there are any fields to update
        if (args.length <= 1) {
          return new Response(JSON.stringify({ error: "لا توجد بيانات لتحديثها." }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await db.execute({ sql, args });
        return new Response(JSON.stringify({ message: "تم تحديث بياناتك بنجاح." }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (request.method === "DELETE") {
      console.log("[Logic] Entered: Delete user.");
      const { user_key } = await request.json();

      if (!user_key) {
        return new Response(JSON.stringify({ error: "مفتاح المستخدم (user_key) مطلوب للحذف." }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Foreign key constraints with ON DELETE CASCADE will handle related data
      const { rowsAffected } = await db.execute({
        sql: "DELETE FROM users WHERE user_key = ?",
        args: [user_key],
      });

      if (rowsAffected === 0) {
        return new Response(JSON.stringify({ message: "المستخدم غير موجود أو تم حذفه بالفعل." }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ message: "تم حذف المستخدم بنجاح." }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error(`[Request Error] Method: ${request.method}, URL: ${request.url}, Error:`, err);
    return new Response(JSON.stringify({ error: "حدث خطأ في الخادم: " + err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
// بفضل ON DELETE CASCADE في قاعدة البيانات، سيتم حذف جميع ال