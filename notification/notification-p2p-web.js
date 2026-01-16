/**
 * @file notification/notification-p2p-web.js
 * @description Peer-to-Peer (P2P) notification module that sends messages directly from the browser.
 * It uses the Google Cloud Identity Platform to generate JWTs and retrieve OAuth2 tokens
 * for secure communication with the FCM v1 API.
 */

var WebP2PNotification = (() => {
    // [Optimization] If running inside Android, skip Web P2P setup entirely to save resources
    if (window.Android) {
        console.log('%c[Web P2P] 📱 Android Bridge detected. Disabling redundant Web P2P module.', 'color: #9e9e9e;');
        return {
            send: async () => ({ error: 'WebP2P disabled on Android context' }),
            sendBatch: async () => []
        };
    }

    let cachedAccessToken = null;

    /**
     * Retrieves an OAuth2 Access Token from Google using the Service Account credentials.
     * Implements caching with a 5-minute safety margin before expiry.
     * @returns {Promise<string>} The valid OAuth2 Access Token.
     * @throws {Error} If credentials are missing, jsrsasign is not loaded, or the fetch request fails.
     */
    async function getAccessToken() {
        // If current token is valid (with 5-minute safety margin)
        if (cachedAccessToken && Date.now() < tokenExpiry - 300000) {
            return cachedAccessToken;
        }

        try {
            // Check for existence of the encrypted key variable
            if (typeof FCM_ADMIN_SDK_KEY === 'undefined') {
                throw new Error('FCM_ADMIN_SDK_KEY is not defined. Check if notification-credentials.js is loaded.');
            }

            const key = FCM_ADMIN_SDK_KEY;

            const header = { alg: 'RS256', typ: 'JWT' };
            const now = Math.floor(Date.now() / 1000);
            const payload = {
                iss: key.client_email,
                scope: 'https://www.googleapis.com/auth/firebase.messaging',
                aud: 'https://oauth2.googleapis.com/token',
                exp: now + 3600,
                iat: now
            };

            // Sign the JWT using the jsrsasign library
            console.log('[Web P2P Debug] Signing JWT...');
            const sHeader = JSON.stringify(header);
            const sPayload = JSON.stringify(payload);
            const privateKey = key.private_key;

            if (typeof KJUR === 'undefined') {
                throw new Error('KJUR library (jsrsasign) is not loaded or undefined.');
            }

            const sJWT = KJUR.jws.JWS.sign("RS256", sHeader, sPayload, privateKey);
            console.log('[Web P2P Debug] JWT Signed successfully. Length:', sJWT.length);

            console.log('[Web P2P Debug] Requesting Access Token from Google...');
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${sJWT}`
            });

            console.log('[Web P2P Debug] Token Response Status:', tokenRes.status);

            if (!tokenRes.ok) {
                const errorText = await tokenRes.text();
                console.error('[Web P2P Error] Token Request Failed:', errorText);
                throw new Error(`Failed to fetch Access Token. Status: ${tokenRes.status}, Body: ${errorText}`);
            }

            const tokenData = await tokenRes.json();
            if (tokenData.access_token) {
                console.log('[Web P2P Debug] Access Token retrieved successfully.');
                cachedAccessToken = tokenData.access_token;
                tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
                return cachedAccessToken;
            } else {
                throw new Error('Failed to fetch Access Token: ' + JSON.stringify(tokenData));
            }
        } catch (error) {
            console.error('[Web P2P] Error authenticating with Google:', error);
            throw error;
        }
    }

    /**
     * Sends a direct FCM notification to a specific registration token.
     * Constructs a "Data-Only" message to ensure Android devices trigger the app's internal handler.
     * @param {string} token - The recipient's FCM registration token.
     * @param {string} title - The notification title.
     * @param {string} body - The notification body content.
     * @returns {Promise<object>} Result object containing success status or error details.
     */
    async function sendDirect(token, title, body) {
        try {
            const accessToken = await getAccessToken();
            const projectId = "suze-bazaar-notifications";
            const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

            const message = {
                message: {
                    token: token,
                    android: {
                        priority: 'HIGH' // Ensure immediate delivery on Android
                    },
                    webpush: {
                        headers: {
                            Urgency: "high"
                        }
                    },
                    /* 
                       [CRITICAL] Data-only message format.
                       By omitting the 'notification' property, we force the Android app's 
                       onMessageReceived() to trigger even when in background/closed state.
                    */
                    data: {
                        title: title,
                        body: body,
                        messageId: `web_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        platform: 'web-p2p',
                        channelId: 'bazaar_channel_v5'
                    }
                }
            };

            const response = await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });

            const result = await response.json();
            if (response.ok) {
                return { success: true, result };
            } else {
                console.error('[Web P2P] Send failed for', token, result);
                return { error: result };
            }
        } catch (error) {
            let errorMsg = error;
            if (typeof error === 'object') {
                try {
                    errorMsg = JSON.stringify(error, Object.getOwnPropertyNames(error));
                } catch (e) {
                    errorMsg = 'Unserializable Error';
                }
            }
            console.error(`[Web P2P] Critical error in sending: ${errorMsg}`);
            return { error: errorMsg };
        }
    }

    /**
     * Sends a batch of notifications to multiple tokens concurrently.
     * @param {string[]} tokens - Array of FCM registration tokens.
     * @param {string} title - The notification title.
     * @param {string} body - The notification body content.
     * @returns {Promise<Array<object>>} Array of results for each send operation.
     */
    async function sendDirectBatch(tokens, title, body) {
        console.log(`[Web P2P] 🌐 Starting direct batch sending for ${tokens.length} devices.`);
        const promises = tokens.map(t => sendDirect(t, title, body));
        return Promise.all(promises);
    }

    return {
        send: sendDirect,
        sendBatch: sendDirectBatch
    };
})();
