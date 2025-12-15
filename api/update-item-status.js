import { createClient } from "@libsql/client/web";

export const config = {
    runtime: 'edge',
};

/**
 * @file api/update-item-status.js
 * @description API endpoint to update the status of a specific item within an order.
 * Stores item statuses as a JSON string appended to the order_status column.
 * Format: StepID#Timestamp#JSON_Statuses
 */
export default async function handler(request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const { order_key, product_key, status } = await request.json();

        if (!order_key || !product_key || !status) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const db = createClient({
            url: process.env.DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        // 1. Fetch current order status
        const { rows } = await db.execute({
            sql: "SELECT order_status FROM orders WHERE order_key = ?",
            args: [order_key],
        });

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let currentStatusStr = rows[0].order_status || "0#"; // Default if null
        let parts = currentStatusStr.split('#');

        // Ensure we have at least 3 parts: StepID # Timestamp # JSON
        if (parts.length < 2) {
            // Handle malformed legacy data
            parts = [currentStatusStr, new Date().toISOString()];
        }

        let stepId = parts[0];
        let timestamp = parts[1];
        let jsonStr = parts.slice(2).join('#'); // Join rest in case JSON contains # (though unlikely in standard JSON) or if parts > 3

        let itemStatuses = {};
        if (jsonStr) {
            try {
                itemStatuses = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse existing JSON statuses:", e);
                // Reset if corrupt
                itemStatuses = {};
            }
        }

        // 2. Update the specific item status
        itemStatuses[product_key] = status;

        // 3. Reconstruct string
        const newJsonStr = JSON.stringify(itemStatuses);
        const newStatusStr = `${stepId}#${timestamp}#${newJsonStr}`;

        // 4. Update Database
        await db.execute({
            sql: "UPDATE orders SET order_status = ? WHERE order_key = ?",
            args: [newStatusStr, order_key],
        });

        return new Response(JSON.stringify({ success: true, message: 'Item status updated', new_order_status: newStatusStr }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[API: update-item-status] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
