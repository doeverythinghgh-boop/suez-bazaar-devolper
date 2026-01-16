/**
 * @file notification/notification-p2p-web.js
 * @description وحدة إرسال الإشعارات مباشرة من المتصفح (P2P) باستخدام Admin SDK.
 *   تتعامل مع توليد JWT، جلب الـ Access Token من جوجل، والإرسال لـ FCM v1.
 * // Test comment for auto-version watcher
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
     * جلب توكن الوصول من جوجل باستخدام ملف الصلاحيات
     */
    async function getAccessToken() {
        // إذا كان التوكن الحالي صالحاً (مع هامش أمان 5 دقائق)
        if (cachedAccessToken && Date.now() < tokenExpiry - 300000) {
            return cachedAccessToken;
        }

        try {
            // التحقق من وجود المتغير المشفّر
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

            // توقيع الـ JWT باستخدام مكتبة jsrsasign
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
                throw new Error('فشل جلب Access Token: ' + JSON.stringify(tokenData));
            }
        } catch (error) {
            console.error('[Web P2P] خطأ في المصادقة مع جوجل:', error);
            throw error;
        }
    }

    /**
     * إرسال إشعار لتوكن معين
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
                        priority: 'HIGH'
                        // إزالة notification للتأكد من أن onMessageReceived تعمل وتشغل الصوت
                    },
                    webpush: {
                        headers: {
                            Urgency: "high"
                        }
                    },
                    notification: {
                        title: title,
                        body: body
                    },
                    data: {
                        title: title,
                        body: body,
                        messageId: `web_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        platform: 'web-p2p',
                        // إضافة channelId في البيانات لكي يستخدمها الأندرويد إذا لزم الأمر
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
                console.error('[Web P2P] فشل الإرسال لـ', token, result);
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
            console.error(`[Web P2P] خطأ حرج في الإرسال: ${errorMsg}`);
            return { error: errorMsg };
        }
    }

    /**
     * إرسال جماعي
     */
    async function sendDirectBatch(tokens, title, body) {
        console.log(`[Web P2P] 🌐 بدء إرسال جماعي مباشر لـ ${tokens.length} جهاز.`);
        const promises = tokens.map(t => sendDirect(t, title, body));
        return Promise.all(promises);
    }

    return {
        send: sendDirect,
        sendBatch: sendDirectBatch
    };
})();
