/**
 * @file notification/fcm-api.js
 * @description API communication for FCM tokens and relations.
 */

async function getAdminTokens(excludeKey = '') {
    try {
        const ADMIN_KEYS = ["dl14v1k7", "682dri6b", "pngukw"];
        const filteredKeys = excludeKey ? ADMIN_KEYS.filter(k => k !== excludeKey) : ADMIN_KEYS;
        if (filteredKeys.length === 0) return [];

        const adminKeysQuery = filteredKeys.join(",");
        const response = await apiFetch(
            `/api/tokens?userKeys=${encodeURIComponent(adminKeysQuery)}`
        );
        return response?.tokens || [];
    } catch (error) {
        console.error("[Notifications] Failed to fetch admin tokens:", error);
        return [];
    }
}

async function getActiveDeliveryRelations(sellerKey) {
    try {
        const relations = await apiFetch(`/api/suppliers-deliveries?sellerKey=${sellerKey}&activeOnly=true`);
        if (relations.error) throw new Error(relations.error);
        console.log(`%c[API] Successfully got getActiveDeliveryRelations for seller ${sellerKey}.`, "color: green;", relations);
        return relations;
    } catch (error) {
        console.error(`%c[getActiveDeliveryRelations] for seller ${sellerKey} failed:`, "color: red;", error);
        return null;
    }
}

async function getTokensForActiveDelivery2Seller(sellerKey) {
    try {
        const deliveryUsers = await getActiveDeliveryRelations(sellerKey);
        const deliveryTokens = deliveryUsers
            ?.map((user) => user.fcmToken)
            .filter(Boolean);
        return deliveryTokens || [];
    } catch (error) {
        console.error('[Notifications] Error fetching delivery tokens:', error);
        return [];
    }
}

async function getUsersTokens(usersKeys) {
    if (!usersKeys || usersKeys.length === 0) return [];
    const userKeysQuery = usersKeys.join(',');
    const apiUrlPath = `/api/tokens?userKeys=${encodeURIComponent(userKeysQuery)}`;

    try {
        const result = await apiFetch(apiUrlPath);
        if (result?.tokens) return result.tokens;
        if (result && result.error) console.error('[FCM] API returned an error:', result.error);
        return [];
    } catch (error) {
        console.error('[FCM] Critical error during token fetch:', error);
        return [];
    }
}

async function sendTokenToServer(userKey, token, platform) {
    console.log(`%c[FCM] Sending token to server...`, "color: #fd7e14");
    try {
        const response = await fetch(`${baseURL}/api/tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_key: userKey,
                token: token,
                platform: platform,
            }),
        });

        const responseData = await response.json();
        if (response.ok) {
            console.log("%c[Dev] ✅ [FCM] Server successfully saved/updated the token.", "color: #28a745", responseData);
        } else {
            console.error("[Dev] ❌ [FCM] Server failed to save the token. Status:", response.status, responseData);
        }
    } catch (networkError) {
        console.error("%c[Dev] ❌ [FCM] Network error while sending token:", "color: #dc3545", networkError);
    }
}

async function deleteTokenFromServer(userKey) {
    if (!userKey) return;
    console.log(`%c[Dev] 🗑️ [FCM] Requesting token deletion from server for user: ${userKey}`, "color: #dc3545");
    try {
        const response = await fetch(`${baseURL}/api/tokens`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_key: userKey }),
        });

        const responseData = await response.json();
        if (response.ok) {
            console.log("%c[Dev] ✅ [FCM] Token deleted from server successfully.", "color: #28a745", responseData);
        } else {
            console.error("[Dev] ❌ [FCM] Server failed to delete token. Status:", response.status, responseData);
        }
    } catch (error) {
        console.error("[Dev] ❌ [FCM] Network error while attempting to delete token:", error);
    }
}

window.getAdminTokens = getAdminTokens;
window.getUsersTokens = getUsersTokens;
window.sendTokenToServer = sendTokenToServer;
window.deleteTokenFromServer = deleteTokenFromServer;
window.getTokensForActiveDelivery2Seller = getTokensForActiveDelivery2Seller;
