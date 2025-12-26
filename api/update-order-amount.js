import { createClient } from "@libsql/client/web";

export const config = {
    runtime: 'edge',
};

/**
 * @file api/update-order-amount.js
 * @description API endpoint to update the total amount of an existing order.
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
        const { order_key, total_amount } = await request.json();

        if (!order_key || total_amount === undefined || total_amount === null) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const db = createClient({
            url: process.env.DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        // 1. Check if order exists
        const { rows } = await db.execute({
            sql: "SELECT order_key FROM orders WHERE order_key = ?",
            args: [order_key],
        });

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Update total_amount
        await db.execute({
            sql: "UPDATE orders SET total_amount = ? WHERE order_key = ?",
            args: [Number(total_amount), order_key],
        });

        console.log(`[API: update-order-amount] Successfully updated order ${order_key} to amount ${total_amount}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Order total amount updated successfully',
            order_key,
            total_amount: Number(total_amount)
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('[API: update-order-amount] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
