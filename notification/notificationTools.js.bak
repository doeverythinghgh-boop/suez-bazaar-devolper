/**
 * @file notification/notificationTools.js
 * @description Comprehensive library for notification management, including FCM delivery,
 * native bridge handling (Android), and business logic for various system events (Purchase, Step Changes, etc.).
 */

/**
 * Internal cache for the notification configuration.
 * @type {object|null}
 */
var cachedDefaultConfig = null;

/**
 * Cache for the notification messages loaded from `notification_messages.json`.
 * @type {object|null}
 */
var notificationMessages = null;

/**
 * Securely retrieves an R2 file URL, with a fallback if cloudFileManager.js is not loaded.
 * @param {string} fileName - Name of the file in R2.
 * @returns {string} The public URL for the file.
 */
function _safeGetR2Url(fileName) {
    if (typeof getPublicR2FileUrl === 'function') {
        return getPublicR2FileUrl(fileName);
    }
    const R2_PUBLIC_BASE_URL = "https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev";
    const cleanName = fileName.startsWith("/") ? fileName.substring(1) : fileName;
    return `${R2_PUBLIC_BASE_URL}/${cleanName}`;
}

/**
 * Fetches and caches notification templates from `notification_messages.json`.
 * @async
 * @returns {Promise<object|null>} The loaded messages object.
 */
async function loadNotificationMessages() {
    if (notificationMessages) return notificationMessages;
    try {
        const timestamp = new Date().getTime();
        // Load the file locally based on its project path (using / to ensure fetching from root)
        const response = await fetch(`/notification/notification_messages.json?t=${timestamp}`);

        if (response.ok) {
            notificationMessages = await response.json();
            window.notificationMessages = notificationMessages;
            console.log('[Notifications] Messages loaded locally successfully.');
            return notificationMessages;
        } else {
            console.error('[Notifications] Failed to load local messages file:', response.status);
        }
    } catch (e) {
        console.error('[Notifications] Error fetching local messages file:', e);
    }
    return null;
}

/**
 * Extracts a message template and replaces placeholders with provided values.
 * @param {string} path - Dot-notation path to the template (e.g., 'purchase.admin').
 * @param {object} placeholders - Key-value pairs for variable substitution.
 * @returns {object} { title, body } result.
 */
function getMessageTemplate(path, placeholders = {}) {
    if (!notificationMessages) return { title: 'Notification', body: '' };

    const keys = path.split('.');
    let template = notificationMessages;
    for (const key of keys) {
        template = template ? template[key] : null;
    }

    if (!template) return { title: 'Notification', body: '' };

    let body = template.body || '';
    let title = template.title || '';

    // Replace variables
    Object.keys(placeholders).forEach(key => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        body = body.replace(regex, placeholders[key]);
        title = title.replace(regex, placeholders[key]);
    });

    return { title, body };
}

/**
 * Determines if a notification is permitted for a specific event and role.
 * Priority: 1. window.globalNotificationConfig, 2. Remote R2 JSON, 3. Local JSON, 4. Critical Defaults.
 * @param {string} eventKey - The event key (e.g., 'purchase', 'step-confirmed').
 * @param {string} role - Target role (admin, seller, buyer, delivery).
 * @returns {Promise<boolean>} True if notification is enabled.
 */
async function shouldNotify(eventKey, role) {
    let config = window.globalNotificationConfig;

    // 1. If Config is not loaded globally, try to fetch it immediately
    if (!config) {
        if (!cachedDefaultConfig) { // Use internal cache as a second line of defense
            try {
                const timestamp = new Date().getTime();
                try {
                    console.warn('[Notifications] Config not found in window, fetching JSON file from cloud...');
                    const r2Url = _safeGetR2Url('notification_config.json');
                    const response = await fetch(`${r2Url}?t=${timestamp}`);

                    if (response.ok) {
                        cachedDefaultConfig = await response.json();
                        config = cachedDefaultConfig;
                        window.globalNotificationConfig = config;
                        console.log('[Notifications] Config loaded from Cloudflare successfully.');
                    }
                } catch (e) {
                    console.warn('[Notifications] Failed to fetch config from cloud, using default values.');
                }

                // Attempt to fetch config locally if R2 fails (extra security logic)
                if (!config) {
                    const localRes = await fetch(`/notification/notification_config.json?t=${timestamp}`);
                    if (localRes.ok) {
                        cachedDefaultConfig = await localRes.json();
                        config = cachedDefaultConfig;
                        window.globalNotificationConfig = config;
                        console.log('[Notifications] Config loaded locally successfully.');
                    }
                }
            } catch (e) {
                console.error('[Notifications] Fatal error fetching config:', e);
            }
        } else {
            config = cachedDefaultConfig;
        }
    }

    // 2. Check value in Config (if exists)
    if (config && config[eventKey] && config[eventKey][role] !== undefined) {
        return config[eventKey][role];
    }

    // 3. Fallback Defaults (safety net in case of total upload failure)
    // Revert to true (allow notification) to avoid missing important events on error,
    // unless there is critical logic requiring the opposite.
    const criticalDefaults = {
        'purchase': { admin: true }, // Always notify admin on purchase as top priority
    };

    if (criticalDefaults[eventKey] && criticalDefaults[eventKey][role] !== undefined) {
        return criticalDefaults[eventKey][role];
    }

    console.warn(`[Notifications] Configuration missing for ${eventKey}.${role}, assuming TRUE per user requirements.`);
    return true;
}
/**
 * @throws {Error} - If fetching the notification_config.json file fails.
 * @see window.globalNotificationConfig
 */

/**
 * [Android Bridge] Entry point for single notification persistence from Android.
 * Invoked by Native Android code when a notification is received in foreground/background.
 * @function saveNotificationFromAndroid
 * @param {string} notificationJson - JSON string containing {title, body, messageId}.
 */
function saveNotificationFromAndroid(notificationJson) {
    try {
        const notificationData = JSON.parse(notificationJson);
        // Convert to array and use the new unified function
        saveNotificationBatchFromAndroid(JSON.stringify([notificationData]));
    } catch (error) {
        console.error("[Auth] Error processing single notification:", error);
    }
}

/**
 * [Android Bridge] Entry point for batch notification persistence.
 * Essential for syncing notifications received while the app was closed or in background.
 * @function saveNotificationBatchFromAndroid
 * @param {string} batchJson - JSON string containing an array of notification objects.
 */
function saveNotificationBatchFromAndroid(batchJson) {
    console.log('%c[FCM Android] 📦 Notification batch received:', 'color: #007bff; font-weight: bold; font-size: 14px;', batchJson);
    try {
        const notifications = JSON.parse(batchJson);
        if (!Array.isArray(notifications)) return;

        if (typeof addNotificationLog !== 'function') {
            console.error("[Auth] addNotificationLog not found.");
            return;
        }

        const promises = notifications.map(notif => {
            // Generate a truly unique ID if messageId is missing
            // Use random to prevent ID collisions from firing in the same millisecond
            const uniqueSuffix = Math.random().toString(36).substring(2, 7);
            const fallbackId = `android_${Date.now()}_${uniqueSuffix}`;

            return addNotificationLog({
                messageId: notif.messageId || fallbackId,
                type: 'received',
                title: notif.title || 'Bazaar',
                body: notif.body || '',
                timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
                status: 'unread',
                relatedUser: { key: 'admin', name: 'Admin' },
                payload: notif,
            });
        });

        // Wait for save completion then update counter once
        Promise.all(promises).then(() => {
            console.log(`%c[FCM] ✅ Saved ${notifications.length} notifications successfully - updating counter now`, 'color: #28a745; font-weight: bold;');
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.updateCounter(true);
            } else {
                console.warn('[FCM] ⚠️ GLOBAL_NOTIFICATIONS unavailable - counter will not update');
            }
        }).catch(err => {
            console.error("[FCM] Error saving notification batch:", err);
        });

    } catch (error) {
        console.error("[FCM] Error parsing notification batch:", error);
    }
}

/**
 * Sends an instant Push Notification via FCM.
 * Prioritizes P2P delivery mechanisms (Android Bridge or WebP2P) and prevents self-notification.
 * @function sendNotification
 * @param {string} token - FCM Registration Token.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @returns {Promise<Object>} Result object with success/error details.
 */
async function sendNotification(token, title, body) {
    // Validate token before sending to avoid unnecessary requests
    if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') {
        console.error('[Notifications] Ignoring attempt to send notification with invalid token:', token);
        return { error: 'Invalid or missing token', tokenStatus: 'broken' };
    }

    // [Self-Notification Prevention] Cannot send notification to yourself
    const localTokens = [
        localStorage.getItem("fcm_token"),
        localStorage.getItem("android_fcm_key")
    ].filter(t => t && t !== 'undefined' && t !== 'null');

    if (localTokens.includes(token)) {
        console.warn(`%c[Notifications] 🚫 Prevented sending notification to the same device (Self-Notification Prevention). Token: ${token.substring(0, 10)}...`, 'color: #ff9800; font-weight: bold;');
        return { success: false, reason: 'self_notification_prevented' };
    }

    // [Enforcement] Use direct P2P bridge
    if (window.Android && typeof window.Android.sendNotificationsToTokensP2P === 'function') {
        console.log(`[FCM Bridge] 📱 Sending direct notification (Android P2P) for token: ${token.substring(0, 10)}...`);
        try {
            const tokensJsonString = JSON.stringify([token]);
            window.Android.sendNotificationsToTokensP2P(tokensJsonString, title, body);
            return { success: true, platform: 'android-p2p' };
        } catch (e) {
            console.error('[FCM Bridge] Error sending Android P2P:', e);
            return { error: e.message };
        }
    } else if (typeof WebP2PNotification !== 'undefined') {
        console.log(`[FCM Bridge] 🌐 Sending direct notification (Web P2P) for token: ${token.substring(0, 10)}...`);
        return await WebP2PNotification.send(token, title, body);
    }

    // [Enforcement] P2P Only Strategy (No Server Fallback)
    console.warn('[FCM] Server-side fallback is DISABLED. Ensure WebP2P or Android Bridge is active.');
    return { error: 'P2P Notification failed or not available. Server fallback is disabled.' };
}
/**
 * @async
 * @throws {Error} - If the API request fails or returns an error.
 */

/**
 * Broadcasts a notification to a list of tokens in parallel.
 * Implements self-notification prevention and utilizes environment-specific P2P bridges.
 * @function sendNotificationsToTokens
 * @param {string[]} allTokens - Unique array of target FCM tokens.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body contents.
 * @returns {Promise<void>}
 */
async function sendNotificationsToTokens(allTokens, title, body) {
    console.log(`[Notifications] Starting notification sending process. Tokens received: ${allTokens?.length || 0}`);

    // 1. Check for tokens to send
    if (!Array.isArray(allTokens) || allTokens.length === 0) {
        console.warn("[Notifications] No valid tokens in array. Operation terminated.");
        return;
    }

    // Log the sent notification in local log
    if (typeof addNotificationLog === 'function') {
        addNotificationLog({
            type: 'sent',
            title: title,
            body: body,
            timestamp: new Date(),
            status: 'read',
            relatedUser: { name: 'User' } // This can be customized later
        }).catch(e => console.error('[Notifications] Failed to save sent notification:', e));
    }

    // 2. Process sending based on environment (Android P2P vs Web P2P vs Server)
    if (window.Android && typeof window.Android.sendNotificationsToTokensP2P === 'function') {
        console.log(`[FCM Bridge] 📱 Direct batch sending (Android P2P) for ${allTokens.length} tokens.`);
        try {
            // [Self-Notification Prevention] Exclude local tokens from batch sending
            const localTokens = [
                localStorage.getItem("fcm_token"),
                localStorage.getItem("android_fcm_key")
            ].filter(t => t && t !== 'undefined' && t !== 'null');

            const validTokens = allTokens.filter(t =>
                t && typeof t === 'string' && !localTokens.includes(t)
            );

            if (validTokens.length === 0) {
                console.log('%c[Notifications] ℹ️ All tokens filtered (either invalid or belong to this device).', 'color: #ffc107;');
                return;
            }

            const tokensJsonString = JSON.stringify(validTokens);
            window.Android.sendNotificationsToTokensP2P(tokensJsonString, title, body);
            return;
        } catch (e) {
            console.error('[FCM Bridge] Error sending Android P2P Batch:', e);
        }
    } else if (typeof WebP2PNotification !== 'undefined') {
        console.log(`[FCM Bridge] 🌐 Direct batch sending (Web P2P) for ${allTokens.length} tokens.`);
        try {
            // [Self-Notification Prevention] Exclude local tokens from batch sending (Web)
            const localTokens = [
                localStorage.getItem("fcm_token"),
                localStorage.getItem("android_fcm_key")
            ].filter(t => t && t !== 'undefined' && t !== 'null');

            const validTokens = allTokens.filter(t =>
                t && typeof t === 'string' && !localTokens.includes(t)
            );

            if (validTokens.length > 0) {
                await WebP2PNotification.sendBatch(validTokens, title, body);
            } else {
                console.log('%c[Notifications] ℹ️ All tokens filtered in Web environment.', 'color: #ffc107;');
            }
        } catch (e) {
            console.error('[FCM Bridge] Error sending Web P2P Batch:', e);
        }
        return; // ✅ Always terminate function here in Web environment to prevent double sending via server
    }

    // [Enforcement] P2P Only Strategy (No Server Fallback)
    console.warn('[Notifications] P2P sending failed or service unavailable. Server-side sending is disabled.');
}
/**
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `sendNotification` fails for any token or a network error occurs.
 */

/**
 * @description Fetches FCM tokens for all admins.
 * @async
 * @function getAdminTokens
 * @param {string} excludeKey - The key to exclude from fetching tokens (current user).
 * @returns {Promise<string[]>} - Promise containing an array of admin tokens.
 */
async function getAdminTokens(excludeKey = '') {
    try {
        const ADMIN_KEYS = ["dl14v1k7", "682dri6b", "pngukw"];

        // Filter current user if passed
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
/**
 * @throws {Error} - If `apiFetch` fails to retrieve tokens.
 */

/**
 * @description Fetches list of active delivery agents associated with a specific seller.
 *   Uses the activeOnly=true filter to fetch data efficiently from the server.
 * @function getActiveDeliveryRelations
 * @param {string} sellerKey - The unique key of the seller (user_key).
 * @returns {Promise<Array<Object>|null>} - Promise containing an array of active delivery objects, or null on error.
 * @throws {Error} - if fetching data from API fails.
 * @async
 * @see apiFetch
 */
async function getActiveDeliveryRelations(sellerKey) {
    try {
        const relations = await apiFetch(`/api/suppliers-deliveries?sellerKey=${sellerKey}&activeOnly=true`);
        if (relations.error) {
            throw new Error(relations.error);
        }
        if (relations.error) {
            throw new Error(relations.error);
        }
        console.log(`%c[API] Successfully got getActiveDeliveryRelations for seller ${sellerKey}.`, "color: green;", relations);
        return relations;
    } catch (error) {
        console.error(`%c[getActiveDeliveryRelations] for seller ${sellerKey} failed:`, "color: red;", error);
        return null;
    }
}


/**
 * @description Fetches FCM tokens for all active delivery services associated with a specific seller.
 * @async
 * @function getTokensForActiveDelivery2Seller
 * @param {string} sellerKey - The unique key of the seller (user_key).
 * @returns {Promise<string[]|undefined>} - Promise containing an array of FCM tokens, or undefined if no relations.
 * @see getActiveDeliveryRelations - The function that fetches active delivery relations.
 */
async function getTokensForActiveDelivery2Seller(sellerKey) {
    try {
        const deliveryUsers = await getActiveDeliveryRelations(sellerKey);
        const deliveryTokens = deliveryUsers
            ?.map((user) => user.fcmToken)
            .filter(Boolean); // Extract only valid tokens
        return deliveryTokens;
    } catch (error) {
        console.error('[Notifications] Error fetching delivery tokens:', error);
        return [];
    }
}


/**
* @description Fetches FCM Tokens for users.
* Relies on the /api/tokens endpoint which accepts a list of keys via userKeys as a Query Parameter.
* @function getUsersTokens
* @param {Array<string>} usersKeys - List of user keys (user_key).
* @returns {Promise<Array<string>>} - Array containing all valid fetched notification tokens.
* @see apiFetch
*/
async function getUsersTokens(usersKeys) {
    // If no sellers, do not make any request
    if (!usersKeys || usersKeys.length === 0) {
        return [];
    }

    // Build a secure URL query (API path only) to fetch seller tokens
    const userKeysQuery = usersKeys.join(',');
    const apiUrlPath = `/api/tokens?userKeys=${encodeURIComponent(userKeysQuery)}`;

    try {
        // Use apiFetch (which is supposed to handle baseURL, CORS headers, and Status 4xx/5xx)
        const result = await apiFetch(apiUrlPath);

        // 4. Check expected response structure (successful response contains tokens array)
        if (result?.tokens) {
            return result.tokens;
        }

        // Handle empty response or error returned by server/apiFetch
        if (result && result.error) {
            console.error('[FCM] API returned an error:', result.error);
        }
        return [];

    } catch (error) {
        // Process network errors or unhandled errors in apiFetch
        console.error('[FCM] Critical error during token fetch:', error);
        return [];
    }
}
/**
 * @throws {Error} - If the `apiFetch` call encounters a critical error.
 */

/**
 * @description Helper function to send FCM token to the server.
 * @function sendTokenToServer
 * @param {string} userKey - The user's identification key.
 * @param {string} token - The FCM token to be sent.
 * @param {string} platform - Device platform (e.g., "android" or "web").
 * @returns {Promise<void>} - Promise returns no value on completion, but handles response from server.
 * @throws {Error} - in case of network failure or issue with server response.
 * @async
 */
async function sendTokenToServer(userKey, token, platform) {
    console.log(`%c[FCM] Sending token to server...`, "color: #fd7e14");
    console.log(`[FCM] User Key: ${userKey} [FCM] FCM Token: ${token} [FCM] Platform: ${platform}`);

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
            console.log(
                "%c[Dev] ✅ [FCM] Server successfully saved/updated the token.",
                "color: #28a745",
                responseData
            );
        } else {
            console.error(
                "[Dev] ❌ [FCM] Server failed to save the token. Status:",
                response.status,
                "Response:",
                responseData
            );
        }
    } catch (networkError) {
        console.error(
            "%c[Dev] ❌ [FCM] Network error while sending token:",
            "color: #dc3545",
            networkError
        );
    }
}

/**
 * @description Function to delete FCM token from the server (on logout or disabling notifications).
 * @function deleteTokenFromServer
 * @param {string} userKey - The user's identification key.
 * @returns {Promise<void>}
 * @async
 */
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

/**
 * @description Requests notification permission from the native system if the app is running in an Android environment,
 *   using the defined window.Android interface.
 * @function askForNotificationPermission
 * @async
 * @returns {Promise<void>} - Returns a Promise that resolves on completion.
 */
async function askForNotificationPermission() {
    try {
        // Check for 'Android' object to ensure code runs inside Android app
        if (
            window.Android &&
            // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.requestNotificationPermission.
            typeof window.Android.requestNotificationPermission === "function"
        ) {
            console.log("[Dev] 📱 [Android FCM] Step 1: Requesting permission from Android system...");
            window.Android.requestNotificationPermission();
        } else {
            console.log("Android interface not available.");
        }
    } catch (error) {
        console.error('[Notifications] Error asking for notification permission (Android):', error);
    }
}


/**
 * @description Called when the user logs out in an Android environment.
 *   Informs the native interface and deletes the locally stored Android token.
 * @function onUserLoggedOutAndroid
 * @returns {void}
 * @see userSession
 */
function onUserLoggedOutAndroid() {
    try {
        if (
            window.Android &&
            typeof window.Android.onUserLoggedOut === "function"
        ) {
            console.log("[Auth] Informing native interface of user logout...");
            window.Android.onUserLoggedOut(userSession.user_key);
            // ✅ Addition: Delete Android token from localStorage
            localStorage.removeItem("android_fcm_key");
            console.log(
                "[Auth] Android token (android_fcm_key) deleted from localStorage."
            );
        }
    } catch (error) {
        console.error('[Auth] Error in Android logout:', error);
    }
}

/**
 * @description Manage notification process when a purchase order is completed.
 * Notifies admin and concerned sellers.
 * @function handlePurchaseNotifications
 * @param {Object} order - The order object created.
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If any sub-notification function fails.
 * @see shouldNotify
 * @see notifyAdminOnPurchase
 * @see notifySellersOnPurchase
 */
async function handlePurchaseNotifications(order) {
    console.log('[Notifications] Processing purchase notifications for order:', order.id);

    try {
        const notificationPromises = [];

        // 1. Notify Admin
        if (await shouldNotify('purchase', 'admin')) {
            notificationPromises.push(notifyAdminOnPurchase(order));
        }

        // 2. Notify Sellers
        if (await shouldNotify('purchase', 'seller')) {
            notificationPromises.push(notifySellersOnPurchase(order));
        }

        // 3. Notify Buyer - new support based on settings
        if (await shouldNotify('purchase', 'buyer')) {
            notificationPromises.push(notifyBuyerOnPurchase(order));
        }

        // 4. Notify Delivery - new support based on settings
        if (await shouldNotify('purchase', 'delivery')) {
            notificationPromises.push(notifyDeliveryOnPurchase(order));
        }

        await Promise.all(notificationPromises);
        console.log('[Notifications] ✅ Finished processing all purchase notifications.');

    } catch (error) {
        console.error('[Notifications] Error processing purchase notifications:', error);
    }
}

/**
 * @description Send notification to admin about a new order.
 * @function notifyAdminOnPurchase
 * @param {Object} order
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getAdminTokens` or `sendNotificationsToTokens` fails.
 * @see getAdminTokens
 * @see sendNotificationsToTokens
 */
async function notifyAdminOnPurchase(order) {
    try {
        await loadNotificationMessages();
        const adminTokens = await getAdminTokens();
        if (adminTokens.length > 0) {
            const { title, body } = getMessageTemplate('purchase.admin', { orderId: order.id || 'N/A' });
            await sendNotificationsToTokens(adminTokens, title, body);
            console.log('[Notifications] Notification sent to admin.');
        } else {
            console.warn('[Notifications] Admin tokens not found.');
        }
    } catch (error) {
        console.error('[Notifications] Failed to send admin notification:', error);
    }
}

/**
 * @description Send notifications to sellers whose products were purchased.
 * @function notifySellersOnPurchase
 * @param {Object} order
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getUsersTokens` or `sendNotificationsToTokens` fails for any seller.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifySellersOnPurchase(order) {
    if (!order.items || !Array.isArray(order.items)) return;

    // Collect unique sellers
    const sellersMap = new Map();

    order.items.forEach(item => {
        // Assume each item contains seller_key of the seller
        const sellerKey = item.seller_key;

        if (sellerKey) {
            if (!sellersMap.has(sellerKey)) {
                sellersMap.set(sellerKey, []);
            }
            sellersMap.get(sellerKey).push(item.name || item.title || 'product');
        }
    });

    console.log(`[Notifications] Found ${sellersMap.size} sellers to notify.`);

    // Send notifications to each seller
    await loadNotificationMessages();
    for (const [sellerKey, products] of sellersMap) {
        try {
            const sellerTokens = await getUsersTokens([sellerKey]);

            if (sellerTokens.length > 0) {
                const { title, body } = getMessageTemplate('purchase.seller');
                await sendNotificationsToTokens(sellerTokens, title, body);
                console.log(`[Notifications] Notification sent to seller ${sellerKey}.`);
            }
        } catch (error) {
            console.error(`[Notifications] Failed to send notification to seller ${sellerKey}:`, error);
        }
    }
}

/**
 * @description Send notification to buyer when order is completed.
 * @async
 */
async function notifyBuyerOnPurchase(order) {
    try {
        if (!order.user_key) return;
        await loadNotificationMessages();
        const tokens = await getUsersTokens([order.user_key]);
        if (tokens.length > 0) {
            const { title, body } = getMessageTemplate('purchase.buyer', { orderId: order.id || 'N/A' });
            await sendNotificationsToTokens(tokens, title, body);
        }
    } catch (e) { console.error('[Notifications] Failed to notify buyer of purchase:', e); }
}

/**
 * @description Send notification to available delivery agents when order is completed.
 * @async
 */
async function notifyDeliveryOnPurchase(order) {
    try {
        await loadNotificationMessages();
        // Fetch delivery agents (may require fetching all agents or agents of a specific area)
        // Currently relying on fetching system delivery agents generally or through admin channel
        const adminTokens = await getAdminTokens(); // Delivery agents and admins usually receive new order notification
        if (adminTokens.length > 0) {
            const { title, body } = getMessageTemplate('purchase.delivery', { orderId: order.id || 'N/A' });
            await sendNotificationsToTokens(adminTokens, title, body);
        }
    } catch (e) { console.error('[Notifications] Failed to notify delivery of purchase:', e); }
}

/**
 * @description Send notification to buyer when step status changes.
 * @function notifyBuyerOnStepChange
 * @param {string} buyerKey - Buyer key.
 * @param {string} stepId - Activated step ID.
 * @param {string} stepName - Step name in Arabic.
 * @param {string} orderId - Order number (optional).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getUsersTokens` or `sendNotificationsToTokens` fails.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId = '') {
    try {
        await loadNotificationMessages();
        const buyerTokens = await getUsersTokens([buyerKey]);

        if (buyerTokens.length > 0) {
            const orderIdText = orderId ? ` Number #${orderId}` : '';
            let templatePath = `steps.${stepId}.buyer`;

            // Fallback checking
            const check = (path) => {
                const parts = path.split('.');
                let val = notificationMessages;
                for (const p of parts) { val = val ? val[p] : null; }
                return !!val;
            };

            if (!check(templatePath)) {
                templatePath = 'steps.general_update.buyer';
            }

            const { title, body } = getMessageTemplate(templatePath, {
                orderIdText,
                stepName
            });

            await sendNotificationsToTokens(buyerTokens, title, body);
            console.log(`[Notifications] Notification sent to buyer ${buyerKey} about step ${stepName}`);
        } else {
            console.warn(`[Notifications] Tokens not found for buyer ${buyerKey}`);
        }
    } catch (error) {
        console.error(`[Notifications] Failed to notify buyer of step change:`, error);
    }
}

/**
 * @description Send notification to admin when step status changes.
 * @function notifyAdminOnStepChange
 * @param {string} stepId - Activated step ID.
 * @param {string} stepName - Step name in Arabic.
 * @param {string} orderId - Order number (optional).
 * @param {string} userName - Name of the user who activated the step (optional).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getAdminTokens` or `sendNotificationsToTokens` fails.
 * @see getAdminTokens
 * @see sendNotificationsToTokens
 */
async function notifyAdminOnStepChange(stepId, stepName, orderId = '', userName = '', actingUserId = '') {
    try {
        await loadNotificationMessages();
        const adminTokens = await getAdminTokens(actingUserId);

        if (adminTokens.length > 0) {
            const orderIdText = orderId ? ` for order #${orderId}` : '';
            const userInfo = userName ? ` by ${userName}` : '';

            const { title, body } = getMessageTemplate('steps.general_update.admin', {
                stepName,
                orderIdText,
                userInfo
            });

            await sendNotificationsToTokens(adminTokens, title, body);
            console.log(`[Notifications] Notification sent to admin about step ${stepName}`);
        } else {
            console.warn('[Notifications] Admin tokens not found');
        }
    } catch (error) {
        console.error('[Notifications] Failed to send admin notification:', error);
    }
}

/**
 * @description Send notification to delivery services when step status changes.
 * @function notifyDeliveryOnStepChange
 * @param {Array<string>} deliveryKeys - Array of delivery service keys.
 * @param {string} stepId - Activated step ID.
 * @param {string} stepName - Step name in Arabic.
 * @param {string} orderId - Order number (optional).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getUsersTokens` or `sendNotificationsToTokens` fails.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifyDeliveryOnStepChange(deliveryKeys, stepId, stepName, orderId = '') {
    if (!deliveryKeys || deliveryKeys.length === 0) {
        console.log('[Notifications] No delivery services to notify');
        return;
    }

    try {
        await loadNotificationMessages();
        const deliveryTokens = await getUsersTokens(deliveryKeys);

        if (deliveryTokens.length > 0) {
            const orderIdText = orderId ? ` #${orderId}` : '';
            let templatePath = `steps.${stepId}.delivery`;

            // Fallback checking
            const check = (path) => {
                const parts = path.split('.');
                let val = notificationMessages;
                for (const p of parts) { val = val ? val[p] : null; }
                return !!val;
            };

            if (!check(templatePath)) {
                templatePath = 'steps.general_update.delivery';
            }

            const { title, body } = getMessageTemplate(templatePath, {
                orderIdText,
                stepName
            });

            await sendNotificationsToTokens(deliveryTokens, title, body);
            console.log(`[Notifications] Notification sent to delivery services (${deliveryKeys.length}) about step ${stepName}`);
        } else {
            console.warn('[Notifications] Tokens not found for delivery services');
        }
    } catch (error) {
        console.error('[Notifications] Failed to send notification to delivery services:', error);
    }
}

/**
 * @description Main function to send notifications when a new step is activated.
 * Sends notifications to buyer, admin, and delivery services based on the activated step.
 * @function notifyOnStepActivation
 * @param {Object} params - Notification parameters.
 * @param {string} params.stepId - Step ID (e.g., "step-confirmed").
 * @param {string} params.stepName - Step name in Arabic (e.g., "Confirmation").
 * @param {string} params.buyerKey - Buyer key.
 * @param {Array<string>} [params.deliveryKeys] - Array of delivery service keys (optional).
 * @param {string} [params.orderId] - Order number (optional).
 * @param {string} [params.userName] - Name of the user who activated the step (optional).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If any of the sub-notification functions (`notifyBuyerOnStepChange`, `notifyAdminOnStepChange`, `notifySellerOnStepChange`, `notifyDeliveryOnStepChange`) fail.
 * @see shouldNotify
 * @see notifyBuyerOnStepChange
 * @see notifyAdminOnStepChange
 * @see notifySellerOnStepChange
 * @see notifyDeliveryOnStepChange
 */
async function notifyOnStepActivation({
    stepId,
    stepName,
    buyerKey = '',
    sellerKeys = [],
    deliveryKeys = [],
    orderId = '',
    userName = '',
    actingUserId = ''
}) {
    console.log(`[Notifications] Starting step activation notifications: ${stepName} (${stepId}) - Actor: ${actingUserId}`);

    try {
        const notificationPromises = [];

        // 1. Notify Buyer (filter if buyer is the actor)
        if (buyerKey && buyerKey !== actingUserId && await shouldNotify(stepId, 'buyer')) {
            notificationPromises.push(
                notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId)
            );
        }

        // 2. Notify Admin
        if (await shouldNotify(stepId, 'admin')) {
            notificationPromises.push(
                notifyAdminOnStepChange(stepId, stepName, orderId, userName, actingUserId)
            );
        }

        // Filter actor from seller and delivery lists
        const filteredSellerKeys = sellerKeys.filter(k => k !== actingUserId);
        const filteredDeliveryKeys = deliveryKeys.filter(k => k !== actingUserId);

        // 3. Notify Sellers
        if (filteredSellerKeys.length > 0 && await shouldNotify(stepId, 'seller')) {
            notificationPromises.push(
                notifySellerOnStepChange(filteredSellerKeys, stepId, stepName, orderId)
            );
        }

        // 4. Notify Delivery services (agents)
        if (filteredDeliveryKeys.length > 0 && await shouldNotify(stepId, 'delivery')) {
            notificationPromises.push(
                notifyDeliveryOnStepChange(filteredDeliveryKeys, stepId, stepName, orderId)
            );
        }

        // Wait for all notifications to be sent
        await Promise.all(notificationPromises);

        console.log(`[Notifications] ✅ All notifications sent successfully for step: ${stepName}`);

    } catch (error) {
        console.error(`[Notifications] ❌ Error sending notifications for step ${stepName}:`, error);
    }
}

/**
 * @description Send notification to sellers when step status changes.
 * @function notifySellerOnStepChange
 * @param {Array<string>} sellerKeys - Array of seller keys.
 * @param {string} stepId - Activated step ID.
 * @param {string} stepName - Step name in Arabic.
 * @param {string} orderId - Order number (optional).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getUsersTokens` or `sendNotificationsToTokens` fails.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifySellerOnStepChange(sellerKeys, stepId, stepName, orderId = '') {
    if (!sellerKeys || sellerKeys.length === 0) {
        console.log('[Notifications] No sellers to notify');
        return;
    }

    try {
        await loadNotificationMessages();
        const sellerTokens = await getUsersTokens(sellerKeys);

        if (sellerTokens.length > 0) {
            const orderIdText = orderId ? ` #${orderId}` : '';
            let templatePath = `steps.${stepId}.seller`;

            // Fallback checking
            const check = (path) => {
                const parts = path.split('.');
                let val = notificationMessages;
                for (const p of parts) { val = val ? val[p] : null; }
                return !!val;
            };

            if (!check(templatePath)) {
                templatePath = 'steps.general_update.seller';
            }

            const { title, body } = getMessageTemplate(templatePath, {
                orderIdText,
                stepName
            });

            await sendNotificationsToTokens(sellerTokens, title, body);
            console.log(`[Notifications] Notification sent to sellers (${sellerKeys.length}) about step ${stepName}`);
        } else {
            console.warn('[Notifications] Tokens not found for sellers');
        }
    } catch (error) {
        console.error('[Notifications] Failed to send notification to sellers:', error);
    }
}

/**
 * @description Main function to send notifications for sub-steps (Cancelled, Rejected, Returned).
 * Called after confirming the associated primary step.
 * @function notifyOnSubStepActivation
 * @param {Object} params - Notification parameters.
 * @param {string} params.stepId - Sub-step ID.
 * @param {string} params.stepName - Step name in Arabic.
 * @param {string} [params.buyerKey] - Buyer key (for "Rejected" step).
 * @param {Array<string>} [params.sellerKeys] - Seller keys (for "Cancelled" and "Returned" steps).
 * @param {string} [params.orderId] - Order number.
 * @param {string} [params.userName] - Name of the user who activated the step.
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If any of the sub-notification functions (`notifySellerOnStepChange`, `notifyAdminOnStepChange`, `sendNotificationsToTokens`) fail.
 * @see shouldNotify
 * @see notifySellerOnStepChange
 * @see notifyAdminOnStepChange
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifyOnSubStepActivation({
    stepId,
    stepName,
    buyerKey = '',
    sellerKeys = [],
    orderId = '',
    userName = '',
    actingUserId = ''
}) {
    console.log(`[Notifications] Starting sub-step notifications: ${stepName} (${stepId}) - Actor: ${actingUserId}`);

    try {
        const notificationPromises = [];

        const filteredSellerKeys = sellerKeys.filter(k => k !== actingUserId);

        // Based on sub-step type
        await loadNotificationMessages();
        switch (stepId) {
            case 'step-cancelled':
                // Cancelled: Notify Sellers + Admin
                if (filteredSellerKeys.length > 0 && await shouldNotify('step-cancelled', 'seller')) {
                    notificationPromises.push(
                        notifySellerOnStepChange(filteredSellerKeys, stepId, stepName, orderId)
                    );
                }
                if (await shouldNotify('step-cancelled', 'admin')) {
                    notificationPromises.push(
                        notifyAdminOnStepChange(stepId, stepName, orderId, userName)
                    );
                }
                // Add support based on settings for agents and buyers
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-cancelled', 'buyer')) {
                    notificationPromises.push(notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId));
                }
                const deliveryKeysForCancel = await getTokensForActiveDelivery2Seller(filteredSellerKeys[0] || '');
                if (deliveryKeysForCancel && deliveryKeysForCancel.length > 0 && await shouldNotify('step-cancelled', 'delivery')) {
                    notificationPromises.push(notifyDeliveryOnStepChange(deliveryKeysForCancel, stepId, stepName, orderId));
                }
                break;

            case 'step-rejected':
                // Rejected: Notify Buyer + Admin + Seller + Delivery
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-rejected', 'buyer')) {
                    const orderIdText = orderId ? ` Number #${orderId}` : '';
                    const { title, body } = getMessageTemplate('steps.step-rejected.buyer', { orderIdText });

                    const buyerTokens = await getUsersTokens([buyerKey]);
                    if (buyerTokens.length > 0) {
                        notificationPromises.push(
                            sendNotificationsToTokens(buyerTokens, title, body)
                        );
                    }
                }
                if (await shouldNotify('step-rejected', 'admin')) {
                    notificationPromises.push(
                        notifyAdminOnStepChange(stepId, stepName, orderId, userName)
                    );
                }
                if (filteredSellerKeys.length > 0 && await shouldNotify('step-rejected', 'seller')) {
                    notificationPromises.push(notifySellerOnStepChange(filteredSellerKeys, stepId, stepName, orderId));
                }
                if (await shouldNotify('step-rejected', 'delivery')) {
                    // Fetch first seller's agents as a sample for communication
                    const deliveryKeysForReject = await getTokensForActiveDelivery2Seller(filteredSellerKeys[0] || '');
                    if (deliveryKeysForReject && deliveryKeysForReject.length > 0) {
                        notificationPromises.push(notifyDeliveryOnStepChange(deliveryKeysForReject, stepId, stepName, orderId));
                    }
                }
                break;

            case 'step-returned':
                // Returned: Notify Sellers + Admin + Buyer + Delivery
                if (filteredSellerKeys.length > 0 && await shouldNotify('step-returned', 'seller')) {
                    notificationPromises.push(
                        notifySellerOnStepChange(filteredSellerKeys, stepId, stepName, orderId)
                    );
                }
                if (await shouldNotify('step-returned', 'admin')) {
                    notificationPromises.push(
                        notifyAdminOnStepChange(stepId, stepName, orderId, userName)
                    );
                }
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-returned', 'buyer')) {
                    notificationPromises.push(notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId));
                }
                if (await shouldNotify('step-returned', 'delivery')) {
                    const deliveryKeysForReturn = await getTokensForActiveDelivery2Seller(filteredSellerKeys[0] || '');
                    if (deliveryKeysForReturn && deliveryKeysForReturn.length > 0) {
                        notificationPromises.push(notifyDeliveryOnStepChange(deliveryKeysForReturn, stepId, stepName, orderId));
                    }
                }
                break;
        }

        // Wait for all notifications to be sent
        await Promise.all(notificationPromises);

        console.log(`[Notifications] ✅ All sub-step notifications sent: ${stepName}`);

    } catch (error) {
        console.error(`[Notifications] ❌ Error sending sub-step notifications ${stepName}:`, error);
    }
}


/**
 * @description Send notification to admin when a new product or service is added.
 * @function notifyAdminOnNewItem
 * @param {Object} productData - Data of the added product or service.
 * @returns {Promise<void>}
 * @async
 */
async function notifyAdminOnNewItem(productData) {
    console.log(`%c[Dev-Notification] 🚀 Starting attempt to notify admin of new item: ${productData.productName}`, 'color: #2196F3; font-weight: bold;');
    try {
        console.log(`[Dev-Notification] 🔍 Step 1: Checking event activation (new-item-added) in settings...`);
        const isEnabled = await shouldNotify('new-item-added', 'admin');

        if (!isEnabled) {
            console.warn(`[Dev-Notification] ⚠️ Execution stopped: Notification for event new-item-added (admin) is currently disabled in config file.`);
            return;
        }
        console.log(`[Dev-Notification] ✅ Event enabled in settings.`);

        console.log(`[Dev-Notification] 🔑 Step 2: Fetching FCM tokens of system admins...`);
        const actingUserId = userSession?.idUser || '';
        const adminTokens = await getAdminTokens(actingUserId);
        if (!adminTokens || adminTokens.length === 0) {
            console.error('[Dev-Notification] ❌ Error: No registered tokens (Admins) found in database.');
            return;
        }

        // Show tokens per user request
        console.log(`[Dev-Notification] 📱 Discovered admin tokens (${adminTokens.length}):`, adminTokens);

        console.log(`[Dev-Notification] 📄 Step 3: Loading message texts and preparing final content...`);
        await loadNotificationMessages();

        const itemType = (productData.serviceType === 2 || productData.serviceType === '2' || productData.isService) ? 'Service' : 'Product';
        const itemName = productData.productName || 'Unnamed';
        const itemKey = productData.product_key || 'N/A';
        const userKey = productData.user_key || 'N/A';
        const userName = userSession?.username || 'Anonymous User';

        console.log(`[Dev-Notification] 🛠️ Preparing template: new-item-added.admin | Item: ${itemName} | Key: ${itemKey} | By: ${userName} | User: ${userKey}`);
        const { title, body } = getMessageTemplate('new-item-added.admin', {
            itemType,
            itemName,
            itemKey,
            userName,
            userKey
        });

        if (!body) {
            console.error('[Dev-Notification] ❌ Fatal error: Message content (Body) is empty!');
        } else {
            console.log(`[Dev-Notification] ✅ Message prepared successfully: "${body.substring(0, 30)}..."`);
        }

        // --- Seller Notification ---
        const sellerEnabled = await shouldNotify('new-item-added', 'seller');
        if (sellerEnabled && userKey && userKey !== 'N/A') {
            const sellerTokens = await getUsersTokens([userKey]);
            if (sellerTokens.length > 0) {
                const sellerMsg = getMessageTemplate('new-item-added.seller', { itemType, itemName });
                await sendNotificationsToTokens(sellerTokens, sellerMsg.title, sellerMsg.body);
            }
        }

        console.log(`[Dev-Notification] 📡 Step 4: Sending parallel requests to Firebase for ${adminTokens.length} tokens...`);
        const sendResult = await sendNotificationsToTokens(adminTokens, title, body);

        console.log(`[Dev-Notification] 🏁 Final result summary of sending:`, sendResult);
        console.log(`%c[Notifications] ✅ Successfully sent notification to admin about added ${itemType}: ${itemName}`, 'color: #4CAF50; font-weight: bold;');

    } catch (error) {
        console.error('%c[Dev-Notification] ❌ Entire notification process failed due to unexpected error:', 'color: red;', error);
    }
}

/**
 * @description Send notification to admin when an existing product or service is updated.
 * @function notifyAdminOnItemUpdate
 * @param {Object} productData - Data of the updated product or service.
 * @returns {Promise<void>}
 * @async
 */
async function notifyAdminOnItemUpdate(productData) {
    console.log(`%c[Dev-Notification] 🚀 Starting attempt to notify admin of item update: ${productData.productName}`, 'color: #FF9800; font-weight: bold;');
    try {
        const isEnabled = await shouldNotify('item-updated', 'admin');
        if (!isEnabled) {
            console.warn(`[Dev-Notification] ⚠️ Execution stopped: Notification for event item-updated (admin) is currently disabled.`);
            return;
        }

        const actingUserId = userSession?.idUser || '';
        const adminTokens = await getAdminTokens(actingUserId);
        if (!adminTokens || adminTokens.length === 0) {
            console.error('[Dev-Notification] ❌ Error: No tokens (Admins) found.');
            return;
        }

        await loadNotificationMessages();

        const itemType = (productData.serviceType === 2 || productData.serviceType === '2' || productData.isService) ? 'Service' : 'Product';
        const itemName = productData.productName || 'Unnamed';
        const itemKey = productData.product_key || 'N/A';
        const userName = userSession?.username || 'User';

        const { title, body } = getMessageTemplate('item-updated.admin', {
            itemType,
            itemName,
            itemKey,
            userName
        });

        if (body) {
            await sendNotificationsToTokens(adminTokens, title, body);
            console.log(`%c[Notifications] ✅ Successfully sent notification to admin about updated ${itemType}: ${itemName}`, 'color: #4CAF50; font-weight: bold;');
        }

        // --- Seller Notification ---
        const sellerEnabled = await shouldNotify('item-updated', 'seller');
        const userKey = productData.user_key;
        if (sellerEnabled && userKey) {
            const sellerTokens = await getUsersTokens([userKey]);
            if (sellerTokens.length > 0) {
                const sellerMsg = getMessageTemplate('item-updated.seller', { itemType, itemName });
                await sendNotificationsToTokens(sellerTokens, sellerMsg.title, sellerMsg.body);
            }
        }

    } catch (error) {
        console.error('%c[Dev-Notification] ❌ Update notification failed:', 'color: red;', error);
    }
}

/**
 * @description Send notifications when a product is accepted and published in the store.
 * Includes admin and product owner (seller).
 * @function notifyOnItemAccepted
 * @param {Object} productData - Data of the approved product.
 * @returns {Promise<void>}
 */
async function notifyOnItemAccepted(productData) {
    console.log(`%c[Notifications] 📢 Starting product acceptance notifications: ${productData.productName}`, 'color: #8BC34A; font-weight: bold;');
    try {
        const itemType = productData.isService ? 'Service' : 'Product';
        const itemName = productData.productName || 'Unnamed';
        const sellerKey = productData.user_key;

        await loadNotificationMessages();

        // 1. Notify Admin
        if (await shouldNotify('item-accepted', 'admin')) {
            const actingUserId = userSession?.idUser || '';
            const adminTokens = await getAdminTokens(actingUserId);
            if (adminTokens.length > 0) {
                const { title, body } = getMessageTemplate('item-accepted.admin', { itemType, itemName });
                await sendNotificationsToTokens(adminTokens, title, body);
            }
        }

        // 2. Notify Seller
        if (sellerKey && await shouldNotify('item-accepted', 'seller')) {
            const sellerTokens = await getUsersTokens([sellerKey]);
            if (sellerTokens.length > 0) {
                const { title, body } = getMessageTemplate('item-accepted.seller', { itemType, itemName });
                await sendNotificationsToTokens(sellerTokens, title, body);
            }
        }
    } catch (error) {
        console.error('[Notifications] Failed to send product acceptance notifications:', error);
    }
}

// Export functions to window for access from Android Bridge and other modules (e.g., Stepper)
window.shouldNotify = shouldNotify;
window.sendNotification = sendNotification;
window.sendNotificationsToTokens = sendNotificationsToTokens;
window.notifyOnStepActivation = notifyOnStepActivation;
window.notifyOnSubStepActivation = notifyOnSubStepActivation;
window.handlePurchaseNotifications = handlePurchaseNotifications;
window.notifyAdminOnPurchase = notifyAdminOnPurchase;
window.notifySellersOnPurchase = notifySellersOnPurchase;
window.notifyBuyerOnPurchase = notifyBuyerOnPurchase;
window.notifyDeliveryOnPurchase = notifyDeliveryOnPurchase;
window.notifyBuyerOnStepChange = notifyBuyerOnStepChange;
window.notifyAdminOnStepChange = notifyAdminOnStepChange;
window.notifySellerOnStepChange = notifySellerOnStepChange;
window.notifyDeliveryOnStepChange = notifyDeliveryOnStepChange;
window.notifyAdminOnNewItem = notifyAdminOnNewItem;
window.notifyAdminOnItemUpdate = notifyAdminOnItemUpdate;
window.notifyOnItemAccepted = notifyOnItemAccepted;
window.saveNotificationFromAndroid = saveNotificationFromAndroid;
window.saveNotificationBatchFromAndroid = saveNotificationBatchFromAndroid;

console.log('%c[Notifications] ✅ All notification tools loaded and exported (Deep Settings Enforcement Ready).', 'color: #4CAF50; font-weight: bold;');
