/**
 * @file api/suppliers-deliveries.js
 * @description API Endpoint for managing relationships between sellers and delivery distributors.
 *
 * This file acts as a backend (Serverless Function on Vercel) and handles operations related to these relationships:
 * - GET: Fetch a list of distributors associated with a specific seller, or all relationships for a specific user.
 * - PUT: Update or create a relationship between a seller and a distributor.
 * - POST: Check user roles (seller/distributor).
 * - OPTIONS: Handle CORS Preflight requests.
 */
import { createClient } from "@libsql/client/web";

export const config = {
  runtime: 'edge',
};
/**
 * @description Configuration to set the function as a Vercel Edge Function.
 * @type {object}
 * @const
 */

/**
 * @description Initialize connection to Turso database
 * @type {import("@libsql/client/web").Client}
 * @const
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
 * @description Check for the existence of a set of user_keys in the suppliers_deliveries table
 * @param {string[]} userKeys - Array of user keys to check
 * @returns {Promise<Array<{key: string, isSeller: boolean, isDelivery: boolean}>>} Array of objects indicating each user's role
 * @async
 * @throws {Error} - If a database error occurs.
 */
export async function checkUserInSuppliersDeliveries(userKeys) {
  if (!Array.isArray(userKeys) || userKeys.length === 0) return [];

  const placeholders = userKeys.map(() => '?').join(',');

  const { rows } = await db.execute({
    sql: `SELECT seller_key, delivery_key FROM suppliers_deliveries WHERE seller_key IN (${placeholders}) OR delivery_key IN (${placeholders})`,
    args: [...userKeys, ...userKeys] // Repeat array because we use placeholders twice
  });

  // Create quick lookup sets
  const sellers = new Set();
  const deliveries = new Set();

  rows.forEach(row => {
    if (row.seller_key) sellers.add(row.seller_key);
    if (row.delivery_key) deliveries.add(row.delivery_key);
  });

  return userKeys.map(key => ({
    key: key,
    isSeller: sellers.has(key),
    isDelivery: deliveries.has(key)
  }));
}




/**
 * @description API endpoint to manage supplier and distributor relationships.
 * - GET: To fetch a list of distributors and their association status with a specific seller.
 * - PUT: To update (or create) the association status between a seller and a distributor.
 * @param {Request} request - Incoming HTTP request object.
 * @returns {Promise<Response>} - Promise containing the HTTP response object.
 * @async
 * @throws {Response} - Returns an HTTP response with an error status (400, 405, 500) if validation fails or an unexpected error occurs during database operations.
 */
export default async function handler(request) {
  // ✅ Track: Handle CORS Preflight requests
  if (request.method === "OPTIONS") {
    console.log(`[CORS] Handled OPTIONS request for: ${request.url}`);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`%c[API: /suppliers-deliveries] Received ${request.method} request for: ${request.url}`, "color: blue;");

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const sellerKey = url.searchParams.get('sellerKey');
      const relatedTo = url.searchParams.get('relatedTo'); // ✅ New parameter to fetch bidirectional relations
      const activeOnly = url.searchParams.get('activeOnly') === 'true';

      // --- New Scenario: Fetch ALL relations (seller and distributor) for a specific user ---
      if (relatedTo) {
        console.log(`[API] Fetching ALL relations for user: ${relatedTo}...`);

        // 1. Fetch distributors if this user is a seller
        const { rows: asSellerRows } = await db.execute({
          sql: `
               SELECT u.user_key, u.username, u.phone, ut.fcm_token, sd.is_active
               FROM users u
               JOIN suppliers_deliveries sd ON u.user_key = sd.delivery_key
               LEFT JOIN user_tokens ut ON u.user_key = ut.user_key
               WHERE sd.seller_key = ?
            `,
          args: [relatedTo]
        });

        // 2. Fetch sellers if this user is a distributor
        const { rows: asDeliveryRows } = await db.execute({
          sql: `
               SELECT u.user_key, u.username, u.phone, ut.fcm_token, sd.is_active
               FROM users u
               JOIN suppliers_deliveries sd ON u.user_key = sd.seller_key
               LEFT JOIN user_tokens ut ON u.user_key = ut.user_key
               WHERE sd.delivery_key = ?
            `,
          args: [relatedTo]
        });

        const responseData = {
          asSeller: asSellerRows.map(row => ({
            userKey: row.user_key,
            username: row.username,
            phone: row.phone,
            isActive: !!row.is_active,
            role: 'delivery' // This person is a distributor for the current user
          })),
          asDelivery: asDeliveryRows.map(row => ({
            userKey: row.user_key,
            username: row.username,
            phone: row.phone,
            isActive: !!row.is_active,
            role: 'seller' // This person is a seller for the current user
          }))
        };

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // --- Old Scenario: (Compatible with previous code) ---
      if (!sellerKey) {
        console.warn('[API] Bad Request: sellerKey is missing from query parameters.');
        return new Response(JSON.stringify({ error: 'sellerKey is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // ✅ Add: New logic to efficiently fetch active distributors only
      if (activeOnly) {
        console.log(`%c[API] Fetching ACTIVE delivery users for sellerKey: ${sellerKey}...`, "color: #8A2BE2;");
        const { rows } = await db.execute({
          sql: `
            SELECT
                u.user_key,
                u.username,
                u.phone,
                ut.fcm_token
            FROM
                users u
            JOIN
                suppliers_deliveries sd ON u.user_key = sd.delivery_key
            LEFT JOIN 
                user_tokens ut ON u.user_key = ut.user_key
            WHERE
              sd.seller_key = ? AND sd.is_active = 1 AND u.is_seller = 2;
          `,
          args: [sellerKey],
        });

        const result = rows.map(row => ({
          deliveryKey: row.user_key,
          username: row.username,
          phone: row.phone,
          fcmToken: row.fcm_token, // ✅ Add: Include token in result
          isActive: true, // Since we only fetched active ones, value will always be true
        }));

        console.log(`%c[API] Successfully fetched ${result.length} active delivery users.`, "color: green;");
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // --- Current logic to fetch all distributors with their status (remains unchanged) ---
      console.log(`[API] Fetching ALL delivery users and their status for sellerKey: ${sellerKey}...`);
      const { rows } = await db.execute({
        sql: `
          SELECT u.user_key, u.username, u.phone, CAST(COALESCE(sd.is_active, 0) AS BOOLEAN) as is_active
          FROM users u
          LEFT JOIN suppliers_deliveries sd ON u.user_key = sd.delivery_key AND sd.seller_key = ?
          WHERE u.is_seller = 2;
        `,
        args: [sellerKey],
      });
      const result = rows.map(row => ({
        deliveryKey: row.user_key,
        username: row.username,
        phone: row.phone,
        isActive: !!row.is_active,
      }));

      console.log(`%c[API] Successfully processed GET request. Returning ${result.length} items.`, "color: green;");
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method === 'PUT') {
      console.log('[API] Processing PUT request to update/create a relation...');
      const { sellerKey, deliveryKey, isActive } = await request.json();

      if (!sellerKey || !deliveryKey || typeof isActive !== 'boolean') {
        console.warn('[API] Bad Request: Invalid payload for PUT request.', { sellerKey, deliveryKey, isActive });
        return new Response(JSON.stringify({ error: 'sellerKey, deliveryKey, and isActive are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Use UPSERT: If row exists, update it. If not, insert it.
      // Note: This requires a UNIQUE constraint on (seller_key, delivery_key)
      // CREATE UNIQUE INDEX idx_seller_delivery ON suppliers_deliveries(seller_key, delivery_key);
      console.log(`[API] Executing UPSERT for seller: ${sellerKey}, delivery: ${deliveryKey}, isActive: ${isActive}`);
      await db.execute({
        sql: `
          INSERT INTO suppliers_deliveries (seller_key, delivery_key, is_active)
          VALUES (?, ?, ?)
          ON CONFLICT(seller_key, delivery_key) DO UPDATE SET
          is_active = excluded.is_active;
        `,
        args: [sellerKey, deliveryKey, isActive ? 1 : 0],
      });

      console.log(`%c[API] Successfully processed PUT request.`, "color: green;");
      return new Response(JSON.stringify({ success: true, message: 'Relation updated successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (request.method === 'POST') {
      console.log('[API] Processing POST request to check user status...');
      const { userKeys } = await request.json();

      if (!Array.isArray(userKeys)) {
        return new Response(JSON.stringify({ error: 'userKeys must be an array' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const results = await checkUserInSuppliersDeliveries(userKeys);

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // If request type is not supported
    console.warn(`[API] Method Not Allowed: Received a ${request.method} request, which is not supported.`);
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('%c[API: /api/suppliers-deliveries] A critical error occurred:', "color: red; font-weight: bold;", error);
    return new Response(JSON.stringify({ error: 'Server error occurred.', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }, // Ensure headers exist even in error case
    });
  }
}

/**
 * Important Developer Note:
 * To ensure UPSERT logic (INSERT ... ON CONFLICT) works correctly,
 * must ensure a UNIQUE INDEX exists on columns `seller_key` and `delivery_key`
 * in `suppliers_deliveries` table. If not present, you can add it by executing
 * the following query once on your Turso database:
 *
 * ALTER TABLE suppliers_deliveries ADD CONSTRAINT unique_seller_delivery UNIQUE (seller_key, delivery_key);
 *
 * This prevents duplicate rows for the same seller and distributor and allows updating existing relationship efficiently.
 */