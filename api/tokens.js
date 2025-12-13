/**
 * @file api/tokens.js
 * @description API Endpoint for managing Firebase Cloud Messaging (FCM) tokens.
 *
 * This file acts as a backend (Serverless Function on Vercel) and handles FCM token operations:
 * - POST: Save or update an FCM token for a specific user in the `user_tokens` table using `ON CONFLICT`.
 * - DELETE: Delete an FCM token for a specific user (used when logging out).
 * - OPTIONS: Handle CORS Preflight requests.
 */
import { createClient } from "@libsql/client/web";

/**
 * @description Configuration to set the function as a Vercel Edge Function.
 * @type {object}
 * @const
 */
export const config = {
  runtime: "edge",
};

/**
 * @description CORS headers to allow requests from any origin.
 * @type {object}
 * @const
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * @description API endpoint for managing Firebase Cloud Messaging (FCM) tokens.
 *   Handles `OPTIONS` (preflight) requests for CORS,
 *   and `GET` requests to fetch user tokens based on `user_key`,
 *   and `POST` requests to save or update an FCM token for a specific user,
 *   and `DELETE` requests to delete an FCM token for a user.
 * @function handler
 * @param {Request} request - Incoming HTTP request object.
 * @returns {Promise<Response>} - Promise containing the HTTP response object.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 405, 500) if validation fails or an unexpected error occurs during database operations.
 * @see createClient
 */
export default async function handler(request) {
  const db = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // -----------------------------------------------------
    // -----------------------------------------------------
    // ✅ New Part: Handle GET request to fetch tokens
    // -----------------------------------------------------
    if (request.method === "GET") {
      console.log("[API: /api/tokens] Received GET request to fetch tokens.");

      // Parse URL to extract query parameters
      const url = new URL(request.url);
      const userKeysQuery = url.searchParams.get("userKeys"); // Fetch keys sent in the link

      if (!userKeysQuery) {
        return new Response(
          JSON.stringify({ error: "userKeys parameter is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Convert comma-separated keys string to an array
      const userKeys = userKeysQuery.split(',');

      // Build SQL query to fetch tokens for specified keys
      // Use question marks (?) as placeholders and pass userKeys as array to args
      const placeholders = userKeys.map(() => '?').join(',');
      const sqlQuery = `SELECT fcm_token FROM user_tokens WHERE user_key IN (${placeholders})`;

      console.log(`[API: /api/tokens] Fetching tokens for ${userKeys.length} users.`);

      const result = await db.execute({
        sql: sqlQuery,
        args: userKeys, // Pass the array here
      });

      // Extract tokens from database results
      const tokens = result.rows.map(row => row.fcm_token);

      // Return tokens as array in JSON response
      return new Response(
        JSON.stringify({ success: true, tokens: tokens }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    if (request.method === "POST") {
      console.log("[API: /api/tokens] Received POST request to save token.");
      const { user_key, token, platform } = await request.json();

      if (!user_key || !token || !platform) {
        console.error("[API: /api/tokens] Bad Request: user_key, token, or platform is missing.");
        return new Response(
          JSON.stringify({ error: "user_key, token, and platform are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[API: /api/tokens] Saving token for user_key: ${user_key}`);

      // ✅ Fix: Use transaction to ensure reliability.
      // 1. Delete any old record for this user to ensure no old tokens exist.
      // 2. Delete any old record for this token if registered to another user (rare case).
      // 3. Add the new record.
      // This ensures each user has only one token, and each token is linked to only one user.
      const tx = await db.transaction("write");
      try {
        await tx.execute({ sql: "DELETE FROM user_tokens WHERE user_key = ?", args: [user_key] });
        await tx.execute({ sql: "DELETE FROM user_tokens WHERE fcm_token = ?", args: [token] });
        await tx.execute({
          sql: "INSERT INTO user_tokens (user_key, fcm_token, platform) VALUES (?, ?, ?)",
          args: [user_key, token, platform],
        });
        await tx.commit();
      } catch (err) {
        await tx.rollback();
        throw err; // This error will be caught in the main catch block
      }

      console.log(`[API: /api/tokens] Successfully saved token for user_key: ${user_key}`);
      return new Response(
        JSON.stringify({ success: true, message: "Token saved successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (request.method === "DELETE") {
      const { user_key } = await request.json(); // We only need user_key

      if (!user_key) {
        return new Response(
          JSON.stringify({ error: "user_key is required for deletion." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await db.execute({
        sql: "DELETE FROM user_tokens WHERE user_key = ?", // Delete any token associated with this user
        args: [user_key],
      });

      return new Response(
        JSON.stringify({ success: true, message: "Token deleted successfully." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[API: /api/tokens] FATAL ERROR", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}