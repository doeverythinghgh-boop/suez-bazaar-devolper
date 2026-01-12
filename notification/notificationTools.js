/**
 * @file notification/notificationTools.js
 * @description مكتبة شاملة لإدارة أدوات الإشعارات، بما في ذلك إرسال الإشعارات عبر FCM،
 *   التعامل مع البيئة الأصلية (Android)، وإدارة منطق الإشعارات لمختلف أحداث النظام (الشراء، تغيير المراحل، إلخ).
 */

/**
 * @description التحقق مما إذا كان يجب إرسال الإشعار بناءً على الإعدادات
 * @param {string} eventKey
 * @param {string} role ('buyer' | 'admin' | 'seller' | 'delivery')
 * @returns {Promise<boolean>}
 */
let cachedDefaultConfig = null;
/**
 * @type {object|null}
 * @description Cache for the notification messages loaded from `notification_messages.json`.
 */
let notificationMessages = null;

/**
 * @description جلب رابط الملف من R2 (دالة احتياطية في حال غياب cloudFileManager.js)
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
 * @description جلب ملف نصوص الإشعارات وتخزينه في الذاكرة.
 */
async function loadNotificationMessages() {
    if (notificationMessages) return notificationMessages;
    try {
        const timestamp = new Date().getTime();
        // تحميل الملف محلياً حصراً بناءً على مساره في المشروع (استخدام / لضمان الجلب من الجذر)
        const response = await fetch(`/notification/notification_messages.json?t=${timestamp}`);

        if (response.ok) {
            notificationMessages = await response.json();
            window.notificationMessages = notificationMessages;
            console.log('[Notifications] تم تحميل الرسائل محلياً بنجاح.');
            return notificationMessages;
        } else {
            console.error('[Notifications] فشل تحميل ملف الرسائل المحلي:', response.status);
        }
    } catch (e) {
        console.error('[Notifications] خطأ في جلب ملف الرسائل المحلي:', e);
    }
    return null;
}

/**
 * @description استخراج نص الرسالة واستبدال المتغيرات.
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

    // استبدال المتغيرات
    Object.keys(placeholders).forEach(key => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        body = body.replace(regex, placeholders[key]);
        title = title.replace(regex, placeholders[key]);
    });

    return { title, body };
}

/**
 * @description التحقق من تفعيل التنبيه لحدث معين ودور معين بناءً على ملف JSON.
 * ✅ يعتمد **حصرياً** على notification_config.json (المحمل في window.globalNotificationConfig أو عبر الجلب).
 * ❌ يتجاهل localStorage (لأنه للإدارة فقط أو التصدير اليدوي).
 * @param {string} eventKey - مفتاح الحدث (مثل 'purchase', 'step-confirmed').
 * @param {string} role - الدور المستهدف (admin, seller, buyer, delivery).
 * @returns {Promise<boolean>} - هل يجب إرسال الإشعار؟
 */
async function shouldNotify(eventKey, role) {
    let config = window.globalNotificationConfig;

    // 1. إذا لم يكن Config محملاً عالمياً، نحاول جلبه فوراً
    if (!config) {
        if (!cachedDefaultConfig) { // استخدام الكاش الداخلي كخط دفاع ثانٍ
            try {
                const timestamp = new Date().getTime();
                try {
                    console.warn('[Notifications] التكوين غير موجود في window، جارٍ جلب ملف JSON من السحابة...');
                    const r2Url = _safeGetR2Url('notification_config.json');
                    const response = await fetch(`${r2Url}?t=${timestamp}`);

                    if (response.ok) {
                        cachedDefaultConfig = await response.json();
                        config = cachedDefaultConfig;
                        window.globalNotificationConfig = config;
                        console.log('[Notifications] تم تحميل التكوين من Cloudflare بنجاح.');
                    }
                } catch (e) {
                    console.warn('[Notifications] فشل جلب التكوين من السحابة، سيتم استخدام القيم الافتراضية.');
                }

                // محاولة جلب التكوين محلياً إذا فشل R2 (إضافة منطق أمان إضافي)
                if (!config) {
                    const localRes = await fetch(`/notification/notification_config.json?t=${timestamp}`);
                    if (localRes.ok) {
                        cachedDefaultConfig = await localRes.json();
                        config = cachedDefaultConfig;
                        window.globalNotificationConfig = config;
                        console.log('[Notifications] تم تحميل التكوين محلياً بنجاح.');
                    }
                }
            } catch (e) {
                console.error('[Notifications] خطأ فادح في جلب التكوين:', e);
            }
        } else {
            config = cachedDefaultConfig;
        }
    }

    // 2. التحقق من القيمة في Config (إذا وجد)
    if (config && config[eventKey] && config[eventKey][role] !== undefined) {
        return config[eventKey][role];
    }

    // 3. Fallback Defaults (شبكة أمان فقط في حالة فشل التحميل الكلي)
    // العودة إلى true (السماح بالإشعار) لعدم تفويت أحداث مهمة في حالة الخطأ،
    // إلا إذا كان هناك منطق حرج يتطلب العكس.
    const criticalDefaults = {
        'purchase': { admin: true }, // دائماً أبلغ الإدارة بالشراء كأولوية قصوى
    };

    if (criticalDefaults[eventKey] && criticalDefaults[eventKey][role] !== undefined) {
        return criticalDefaults[eventKey][role];
    }

    console.warn(`[Notifications] التكوين مفقود لـ ${eventKey}.${role}، يتم الافتراض بـ TRUE وفقاً لمتطلبات المستخدم.`);
    return true;
}
/**
 * @throws {Error} - If fetching the notification_config.json file fails.
 * @see window.globalNotificationConfig
 */

/**
 * @description دالة مخصصة ليتم استدعاؤها من كود الأندرويد الأصلي.
 *   تقوم هذه الدالة باستلام بيانات إشعار كـ JSON string وحفظه في IndexedDB.
 * @function saveNotificationFromAndroid
 * @param {string} notificationJson - سلسلة JSON تحتوي على بيانات الإشعار (title, body).
 */
function saveNotificationFromAndroid(notificationJson) {
    try {
        const notificationData = JSON.parse(notificationJson);
        // تحويلها إلى مصفوفة واستخدام الدالة الموحدة الجديدة
        saveNotificationBatchFromAndroid(JSON.stringify([notificationData]));
    } catch (error) {
        console.error("[Auth] خطأ في معالجة الإشعار المنفرد:", error);
    }
}

/**
 * @description دالة مخصصة لاستلام حزمة من الإشعارات وحفظها دفعة واحدة.
 *   تمنع هذه الدالة مشاكل السباق الزمني وفقدان البيانات عند التشغيل البارد.
 * @function saveNotificationBatchFromAndroid
 * @param {string} batchJson - سلسلة JSON تحتوي على مصفوفة من الإشعارات.
 */
function saveNotificationBatchFromAndroid(batchJson) {
    console.log('%c[FCM Android] 📦 تم استقبال حزمة إشعارات:', 'color: #007bff; font-weight: bold; font-size: 14px;', batchJson);
    try {
        const notifications = JSON.parse(batchJson);
        if (!Array.isArray(notifications)) return;

        if (typeof addNotificationLog !== 'function') {
            console.error("[Auth] addNotificationLog غير موجودة.");
            return;
        }

        const promises = notifications.map(notif => {
            // توليد معرف فريد حقاً في حالة غياب messageId
            // نستخدم راندوم لمنع تضارب المعرفات الناتجة عن التشغيل في نفس الميلي ثانية
            const uniqueSuffix = Math.random().toString(36).substring(2, 7);
            const fallbackId = `android_${Date.now()}_${uniqueSuffix}`;

            return addNotificationLog({
                messageId: notif.messageId || fallbackId,
                type: 'received',
                title: notif.title || 'Bazaar',
                body: notif.body || '',
                timestamp: notif.timestamp ? new Date(notif.timestamp) : new Date(),
                status: 'unread',
                relatedUser: { key: 'admin', name: 'الإدارة' },
                payload: notif,
            });
        });

        // الانتظار حتى اكتمال الحفظ ثم تحديث العداد مرة واحدة
        Promise.all(promises).then(() => {
            console.log(`%c[FCM] ✅ تم حفظ ${notifications.length} إشعار بنجاح - تحديث العداد الآن`, 'color: #28a745; font-weight: bold;');
            if (window.GLOBAL_NOTIFICATIONS) {
                window.GLOBAL_NOTIFICATIONS.updateCounter(true);
            } else {
                console.warn('[FCM] ⚠️ GLOBAL_NOTIFICATIONS غير متاح - لن يتم تحديث العداد');
            }
        }).catch(err => {
            console.error("[FCM] خطأ في حفظ حزمة الإشعارات:", err);
        });

    } catch (error) {
        console.error("[FCM] خطأ في تحليل حزمة الإشعارات:", error);
    }
}

/**
 * @description يرسل إشعارًا فوريًا (Push Notification) إلى جهاز معين باستخدام توكن Firebase Cloud Messaging (FCM).
 * @function sendNotification
 * @param {string} token - توكن Firebase Cloud Messaging (FCM) الخاص بالجهاز المستهدف.
 * @param {string} title - عنوان الإشعار.
 * @param {string} body - نص الإشعار.
 * @returns {Promise<Object>} - وعد (Promise) يحتوي على كائن يحتوي على نتيجة الإرسال من الخادم، أو كائن خطأ في حالة الفشل.
 * @see apiFetch
 */
async function sendNotification(token, title, body) {
    // التحقق من صحة التوكن قبل الإرسال لتجنب طلبات غير ضرورية
    if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string') {
        console.error('[Notifications] تجاهل محاولة إرسال إشعار بتوكن غير صالح:', token);
        return { error: 'Invalid or missing token', tokenStatus: 'broken' };
    }

    // [Enforcement] استخدام الجسر المباشر P2P
    if (window.Android && typeof window.Android.sendNotificationsToTokensP2P === 'function') {
        console.log(`[FCM Bridge] 📱 إرسال إشعار مباشر (Android P2P) للتوكن: ${token.substring(0, 10)}...`);
        try {
            const tokensJsonString = JSON.stringify([token]);
            window.Android.sendNotificationsToTokensP2P(tokensJsonString, title, body);
            return { success: true, platform: 'android-p2p' };
        } catch (e) {
            console.error('[FCM Bridge] خطأ في إرسال Android P2P:', e);
            return { error: e.message };
        }
    } else if (typeof WebP2PNotification !== 'undefined') {
        console.log(`[FCM Bridge] 🌐 إرسال إشعار مباشر (Web P2P) للتوكن: ${token.substring(0, 10)}...`);
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
* @description تتلقى الدالة مصفوفة نهائية من توكنات الإشعارات الصالحة (FCM Tokens)
* وتقوم بإرسال الإشعار المحدد إلى جميعها بالتوازي.
* @function sendNotificationsToTokens
* @param {Array<string>} allTokens - مصفوفة نهائية من توكنات الإشعارات الصالحة والفريدة.
* @param {string} title - عنوان الإشعار.
* @param {string} body - نص الإشعار.
* @returns {Promise<void>}
* @dependency {function} sendNotification - دالة لإرسال إشعار FCM.
*/
async function sendNotificationsToTokens(allTokens, title, body) {
    console.log(`[Notifications] بدء عملية إرسال الإشعارات. التوكنات المستلمة: ${allTokens?.length || 0}`);

    // 1. التحقق من وجود توكنات للإرسال
    if (!Array.isArray(allTokens) || allTokens.length === 0) {
        console.warn("[Notifications] لا توجد توكنات صالحة في المصفوفة. سيتم إنهاء العملية.");
        return;
    }

    // تسجيل الإشعار المرسل في السجل المحلي
    if (typeof addNotificationLog === 'function') {
        addNotificationLog({
            type: 'sent',
            title: title,
            body: body,
            timestamp: new Date(),
            status: 'read',
            relatedUser: { name: 'المستخدم' } // يمكن تخصيص هذا لاحقاً
        }).catch(e => console.error('[Notifications] فشل حفظ الإشعار المرسل:', e));
    }

    // 2. معالجة الإرسال بناءً على البيئة (Android P2P vs Web P2P vs Server)
    if (window.Android && typeof window.Android.sendNotificationsToTokensP2P === 'function') {
        console.log(`[FCM Bridge] 📱 إرسال جماعي مباشر (Android P2P) لـ ${allTokens.length} توكن.`);
        try {
            const validTokens = allTokens.filter(t => t && typeof t === 'string');
            if (validTokens.length === 0) return;
            const tokensJsonString = JSON.stringify(validTokens);
            window.Android.sendNotificationsToTokensP2P(tokensJsonString, title, body);
            return;
        } catch (e) {
            console.error('[FCM Bridge] خطأ في إرسال Android P2P Batch:', e);
        }
    } else if (typeof WebP2PNotification !== 'undefined') {
        console.log(`[FCM Bridge] 🌐 إرسال جماعي مباشر (Web P2P) لـ ${allTokens.length} توكن.`);
        try {
            const validTokens = allTokens.filter(t => t && typeof t === 'string');
            if (validTokens.length > 0) {
                await WebP2PNotification.sendBatch(validTokens, title, body);
            }
        } catch (e) {
            console.error('[FCM Bridge] خطأ في إرسال Web P2P Batch:', e);
        }
        return; // ✅ إنهاء الدالة هنا دائماً في بيئة الويب لمنع الإرسال المزدوج عبر السيرفر
    }

    // [Enforcement] P2P Only Strategy (No Server Fallback)
    console.warn('[Notifications] فشل إرسال P2P أو الخدمة غير متاحة. تم تعطيل الإرسال عبر السيرفر.');
}
/**
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `sendNotification` fails for any token or a network error occurs.
 */

/**
 * @description يجلب توكنات الإشعارات (FCM tokens) لجميع المسؤولين.
 *   يستخدم قائمة ثابتة من مفاتيح المسؤولين لإجراء طلب للـ API.
 * @async
 * @function getAdminTokens
 * @returns {Promise<string[]>} - وعد (Promise) يحتوي على مصفوفة من توكنات المسؤولين.
 * @see apiFetch
 */
async function getAdminTokens() {
    try {
        // المفاتيح الخاصة بالمسؤولين. في المستقبل، يمكن جلبها ديناميكيًا.
        const ADMIN_KEYS = ["dl14v1k7", "682dri6b", "pngukw"];
        const adminKeysQuery = ADMIN_KEYS.join(",");
        const response = await apiFetch(
            `/api/tokens?userKeys=${encodeURIComponent(adminKeysQuery)}`
        );
        return response?.tokens || [];
    } catch (error) {
        console.error("[Notifications] فشل في جلب توكنات المسؤولين:", error);
        return []; // إرجاع مصفوفة فارغة في حالة حدوث خطأ
    }
}
/**
 * @throws {Error} - If `apiFetch` fails to retrieve tokens.
 */

/**
 * @description يجلب قائمة الموزعين النشطين المرتبطين ببائع معين.
 *   يستخدم الفلتر `activeOnly=true` لجلب البيانات بكفاءة من الخادم.
 * @function getActiveDeliveryRelations
 * @param {string} sellerKey - المفتاح الفريد للبائع (`user_key`).
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات الموزعين النشطين، أو `null` في حالة حدوث خطأ.
 * @throws {Error} - إذا فشل جلب البيانات من API.
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
        console.log(`%c[API] نجح getActiveDeliveryRelations للبائع ${sellerKey}.`, "color: green;", relations);
        return relations;
    } catch (error) {
        console.error(`%c[getActiveDeliveryRelations] للبائع ${sellerKey} فشل:`, "color: red;", error);
        return null;
    }
}


/**
 * @description يجلب توكنات الإشعارات (FCM tokens) لجميع خدمات التوصيل النشطة المرتبطة ببائع معين.
 * @async
 * @function getTokensForActiveDelivery2Seller
 * @param {string} sellerKey - المفتاح الفريد للبائع (`user_key`).
 * @returns {Promise<string[]|undefined>} - وعد (Promise) يحتوي على مصفوفة من توكنات الإشعارات، أو `undefined` في حالة عدم وجود علاقات.
 * @see getActiveDeliveryRelations - الدالة التي تجلب علاقات التوصيل النشطة.
 */
async function getTokensForActiveDelivery2Seller(sellerKey) {
    try {
        const deliveryUsers = await getActiveDeliveryRelations(sellerKey);
        const deliveryTokens = deliveryUsers
            ?.map((user) => user.fcmToken)
            .filter(Boolean); // استخراج التوكنات الصالحة فقط
        return deliveryTokens;
    } catch (error) {
        console.error('[Notifications] خطأ في جلب توكنات التوصيل:', error);
        return [];
    }
}


/**
* @description تجلب توكنات إشعارات Firebase (FCM Tokens) للمستخدمين.
* تعتمد على نقطة النهاية `/api/tokens` التي تقبل قائمة المفاتيح عبر `userKeys` كـ Query Parameter.
* @function getUsersTokens
* @param {Array<string>} usersKeys - قائمة بمفاتيح المستخدمين (`user_key`) .
* @returns {Promise<Array<string>>} - مصفوفة تحتوي على جميع توكنات الإشعارات الصالحة التي تم جلبها.
* @see apiFetch
*/
async function getUsersTokens(usersKeys) {
    // إذا لم يكن هناك بائعون، لا تقم بأي طلب
    if (!usersKeys || usersKeys.length === 0) {
        return [];
    }

    // بناء استعلام URL آمن (مسار API فقط) لجلب توكنات البائعين
    const userKeysQuery = usersKeys.join(',');
    const apiUrlPath = `/api/tokens?userKeys=${encodeURIComponent(userKeysQuery)}`;

    try {
        // استخدام apiFetch (التي يفترض أنها تعالج baseURL وترويسات CORS و Status 4xx/5xx)
        const result = await apiFetch(apiUrlPath);

        // 4. التحقق من هيكل الاستجابة المتوقع (الاستجابة الناجحة تحتوي على مصفوفة tokens)
        if (result?.tokens) {
            return result.tokens;
        }

        // التعامل مع حالة الاستجابة الفارغة أو الخطأ الذي يرجعه الخادم/apiFetch
        if (result && result.error) {
            console.error('[FCM] أرجعت API خطأ:', result.error);
        }
        return [];

    } catch (error) {
        // معالجة أخطاء الشبكة أو الأخطاء التي لم يتم التعامل معها في apiFetch
        console.error('[FCM] خطأ حرج أثناء جلب التوكن:', error);
        return [];
    }
}
/**
 * @throws {Error} - If the `apiFetch` call encounters a critical error.
 */

/**
 * @description دالة مساعدة لإرسال توكن FCM إلى الخادم.
 * @function sendTokenToServer
 * @param {string} userKey - المفتاح التعريفي للمستخدم.
 * @param {string} token - توكن FCM الذي سيتم إرساله.
 * @param {string} platform - منصة الجهاز (مثل "android" أو "web").
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال، ولكنه يعالج الاستجابة من الخادم.
 * @throws {Error} - في حالة فشل الاتصال بالشبكة أو وجود مشكلة في استجابة الخادم.
 * @async
 */
async function sendTokenToServer(userKey, token, platform) {
    console.log(`%c[FCM] جارٍ إرسال التوكن إلى الخادم...`, "color: #fd7e14");
    console.log(`[FCM] مفتاح المستخدم: ${userKey} [FCM] توكن FCM: ${token} [FCM] المنصة: ${platform}`);

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
                "%c[Dev] ✅ [FCM] قام الخادم بحفظ/تحديث التوكن بنجاح.",
                "color: #28a745",
                responseData
            );
        } else {
            console.error(
                "[Dev] ❌ [FCM] فشل الخادم في حفظ التوكن. الحالة:",
                response.status,
                "الاستجابة:",
                responseData
            );
        }
    } catch (networkError) {
        console.error(
            "%c[Dev] ❌ [FCM] خطأ في الشبكة أثناء إرسال التوكن:",
            "color: #dc3545",
            networkError
        );
    }
}

/**
 * @description دالة لحذف توكن FCM من السيرفر (عند تسجيل الخروج أو تعطيل الإشعارات).
 * @function deleteTokenFromServer
 * @param {string} userKey - المفتاح التعريفي للمستخدم.
 * @returns {Promise<void>}
 * @async
 */
async function deleteTokenFromServer(userKey) {
    if (!userKey) return;
    console.log(`%c[Dev] 🗑️ [FCM] جارٍ طلب حذف التوكن من السيرفر للمستخدم: ${userKey}`, "color: #dc3545");

    try {
        const response = await fetch(`${baseURL}/api/tokens`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_key: userKey }),
        });

        const responseData = await response.json();
        if (response.ok) {
            console.log("%c[Dev] ✅ [FCM] تم حذف التوكن من السيرفر بنجاح.", "color: #28a745", responseData);
        } else {
            console.error("[Dev] ❌ [FCM] فشل السيرفر في حذف التوكن. الحالة:", response.status, responseData);
        }
    } catch (error) {
        console.error("[Dev] ❌ [FCM] خطأ في الشبكة أثناء محاولة حذف التوكن:", error);
    }
}

/**
 * @description تطلب إذن الإشعارات من النظام الأصلي (Native) إذا كان التطبيق يعمل ضمن بيئة Android،
 *   وذلك باستخدام واجهة `window.Android` المعرفة.
 * @function askForNotificationPermission
 * @async
 * @returns {Promise<void>} - يُرجع وعدًا (Promise) لا يُرجع قيمة عند الاكتمال.
 */
async function askForNotificationPermission() {
    try {
        // التحقق من وجود الكائن 'Android' للتأكد من أن الكود يعمل داخل تطبيق أندرويد
        if (
            window.Android &&
            // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.requestNotificationPermission.
            typeof window.Android.requestNotificationPermission === "function"
        ) {
            console.log("[Dev] 📱 [Android FCM] الخطوة 1: طلب الإذن من نظام أندرويد...");
            window.Android.requestNotificationPermission();
        } else {
            console.log("واجهة Android غير متاحة.");
        }
    } catch (error) {
        console.error('[Notifications] خطأ في طلب إذن الإشعارات (Android):', error);
    }
}


/**
 * @description يتم استدعاؤها عند تسجيل خروج المستخدم في بيئة الأندرويد.
 *   تقوم بإبلاغ الواجهة الأصلية وحذف توكن الأندرويد المخزن محلياً.
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
            console.log("[Auth] إعلام الواجهة الأصلية بتسجيل خروج المستخدم...");
            window.Android.onUserLoggedOut(userSession.user_key);
            // ✅ إضافة: حذف توكن الأندرويد من localStorage
            localStorage.removeItem("android_fcm_key");
            console.log(
                "[Auth] تم حذف توكن الأندرويد (android_fcm_key) من localStorage."
            );
        }
    } catch (error) {
        console.error('[Auth] خطأ في تسجيل خروج Android:', error);
    }
}

/**
 * @description إدارة عملية الإشعار عند إتمام أمر شراء.
 * تقوم بإخطار الإدارة والبائعين المعنيين.
 * @function handlePurchaseNotifications
 * @param {Object} order - كائن الطلب الذي تم إنشاؤه.
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If any sub-notification function fails.
 * @see shouldNotify
 * @see notifyAdminOnPurchase
 * @see notifySellersOnPurchase
 */
async function handlePurchaseNotifications(order) {
    console.log('[Notifications] معالجة إشعارات الشراء للطلب:', order.id);

    try {
        // 1. إشعار الإدارة
        if (await shouldNotify('purchase', 'admin')) {
            await notifyAdminOnPurchase(order);
        } else {
            console.log('[Notifications] تم تخطي إشعار الإدارة (شراء) بناءً على الإعدادات.');
        }

        // 2. إشعار البائعين
        if (await shouldNotify('purchase', 'seller')) {
            await notifySellersOnPurchase(order);
        } else {
            console.log('[Notifications] تم تخطي إشعار البائعين (شراء) بناءً على الإعدادات.');
        }

    } catch (error) {
        console.error('[Notifications] خطأ في معالجة إشعارات الشراء:', error);
    }
}

/**
 * @description إرسال إشعار للإدارة بوجود طلب جديد.
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
            console.log('[Notifications] تم إرسال إشعار للإدارة.');
        } else {
            console.warn('[Notifications] لم يتم العثور على توكنات للإدارة.');
        }
    } catch (error) {
        console.error('[Notifications] فشل إرسال إشعار الإدارة:', error);
    }
}

/**
 * @description إرسال إشعارات للبائعين الذين تم شراء منتجاتهم.
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

    // تجميع البائعين الفريدين
    const sellersMap = new Map();

    order.items.forEach(item => {
        // نفترض أن كل عنصر يحتوي على seller_key للبائع
        const sellerKey = item.seller_key;

        if (sellerKey) {
            if (!sellersMap.has(sellerKey)) {
                sellersMap.set(sellerKey, []);
            }
            sellersMap.get(sellerKey).push(item.name || item.title || 'منتج');
        }
    });

    console.log(`[Notifications] تم العثور على ${sellersMap.size} بائعين لإخطارهم.`);

    // إرسال الإشعارات لكل بائع
    await loadNotificationMessages();
    for (const [sellerKey, products] of sellersMap) {
        try {
            const sellerTokens = await getUsersTokens([sellerKey]);

            if (sellerTokens.length > 0) {
                const { title, body } = getMessageTemplate('purchase.seller');
                await sendNotificationsToTokens(sellerTokens, title, body);
                console.log(`[Notifications] تم إرسال إشعار للبائع ${sellerKey}.`);
            }
        } catch (error) {
            console.error(`[Notifications] فشل إرسال إشعار للبائع ${sellerKey}:`, error);
        }
    }
}

/**
 * @description إرسال إشعار للمشتري عند تغيير حالة المرحلة.
 * @function notifyBuyerOnStepChange
 * @param {string} buyerKey - مفتاح المشتري.
 * @param {string} stepId - معرف المرحلة المفعلة.
 * @param {string} stepName - اسم المرحلة بالعربية.
 * @param {string} orderId - رقم الطلب (اختياري).
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
            const orderIdText = orderId ? ` رقم #${orderId}` : '';
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
            console.log(`[Notifications] تم إرسال إشعار للمشتري ${buyerKey} عن المرحلة ${stepName}`);
        } else {
            console.warn(`[Notifications] لم يتم العثور على توكنات للمشتري ${buyerKey}`);
        }
    } catch (error) {
        console.error(`[Notifications] فشل إرسال إشعار للمشتري:`, error);
    }
}

/**
 * @description إرسال إشعار للإدارة عند تغيير حالة المرحلة.
 * @function notifyAdminOnStepChange
 * @param {string} stepId - معرف المرحلة المفعلة.
 * @param {string} stepName - اسم المرحلة بالعربية.
 * @param {string} orderId - رقم الطلب (اختياري).
 * @param {string} userName - اسم المستخدم الذي فعّل المرحلة (اختياري).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getAdminTokens` or `sendNotificationsToTokens` fails.
 * @see getAdminTokens
 * @see sendNotificationsToTokens
 */
async function notifyAdminOnStepChange(stepId, stepName, orderId = '', userName = '') {
    try {
        await loadNotificationMessages();
        const adminTokens = await getAdminTokens();

        if (adminTokens.length > 0) {
            const orderIdText = orderId ? ` للطلب #${orderId}` : '';
            const userInfo = userName ? ` بواسطة ${userName}` : '';

            const { title, body } = getMessageTemplate('steps.general_update.admin', {
                stepName,
                orderIdText,
                userInfo
            });

            await sendNotificationsToTokens(adminTokens, title, body);
            console.log(`[Notifications] تم إرسال إشعار للإدارة عن المرحلة ${stepName}`);
        } else {
            console.warn('[Notifications] لم يتم العثور على توكنات للإدارة');
        }
    } catch (error) {
        console.error('[Notifications] فشل إرسال إشعار للإدارة:', error);
    }
}

/**
 * @description إرسال إشعار لخدمات التوصيل عند تغيير حالة المرحلة.
 * @function notifyDeliveryOnStepChange
 * @param {Array<string>} deliveryKeys - مصفوفة مفاتيح خدمات التوصيل.
 * @param {string} stepId - معرف المرحلة المفعلة.
 * @param {string} stepName - اسم المرحلة بالعربية.
 * @param {string} orderId - رقم الطلب (اختياري).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getUsersTokens` or `sendNotificationsToTokens` fails.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifyDeliveryOnStepChange(deliveryKeys, stepId, stepName, orderId = '') {
    if (!deliveryKeys || deliveryKeys.length === 0) {
        console.log('[Notifications] لا توجد خدمات توصيل لإرسال إشعارات لها');
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
            console.log(`[Notifications] تم إرسال إشعار لخدمات التوصيل (${deliveryKeys.length}) عن المرحلة ${stepName}`);
        } else {
            console.warn('[Notifications] لم يتم العثور على توكنات لخدمات التوصيل');
        }
    } catch (error) {
        console.error('[Notifications] فشل إرسال إشعار لخدمات التوصيل:', error);
    }
}

/**
 * @description الدالة الرئيسية لإرسال الإشعارات عند تفعيل مرحلة جديدة.
 * تقوم بإرسال إشعارات للمشتري والإدارة وخدمات التوصيل بناءً على المرحلة المفعلة.
 * @function notifyOnStepActivation
 * @param {Object} params - معاملات الإشعار.
 * @param {string} params.stepId - معرف المرحلة (مثل: "step-confirmed").
 * @param {string} params.stepName - اسم المرحلة بالعربية (مثل: "تأكيد").
 * @param {string} params.buyerKey - مفتاح المشتري.
 * @param {Array<string>} [params.deliveryKeys] - مصفوفة مفاتيح خدمات التوصيل (اختياري).
 * @param {string} [params.orderId] - رقم الطلب (اختياري).
 * @param {string} [params.userName] - اسم المستخدم الذي فعّل المرحلة (اختياري).
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
    console.log(`[Notifications] بدء إرسال إشعارات تفعيل المرحلة: ${stepName} (${stepId}) - القائم بالفعل: ${actingUserId}`);

    try {
        const notificationPromises = [];

        // 1. إشعار المشتري (تصفية إذا كان المشتري هو القائم بالفعل)
        if (buyerKey && buyerKey !== actingUserId && await shouldNotify(stepId, 'buyer')) {
            notificationPromises.push(
                notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId)
            );
        }

        // 2. إشعار الإدارة
        if (await shouldNotify(stepId, 'admin')) {
            notificationPromises.push(
                notifyAdminOnStepChange(stepId, stepName, orderId, userName)
            );
        }

        // تصفية القائم بالفعل من قوائم البائعين والمناديب
        const filteredSellerKeys = sellerKeys.filter(k => k !== actingUserId);
        const filteredDeliveryKeys = deliveryKeys.filter(k => k !== actingUserId);

        // 3. إشعار البائعين
        if (filteredSellerKeys.length > 0 && await shouldNotify(stepId, 'seller')) {
            notificationPromises.push(
                notifySellerOnStepChange(filteredSellerKeys, stepId, stepName, orderId)
            );
        }

        // 4. إشعار خدمات التوصيل
        if (['step-confirmed', 'step-shipped', 'step-delivered'].includes(stepId)) {
            if (filteredDeliveryKeys.length > 0 && await shouldNotify(stepId, 'delivery')) {
                notificationPromises.push(
                    notifyDeliveryOnStepChange(filteredDeliveryKeys, stepId, stepName, orderId)
                );
            }
        }

        // انتظار إرسال جميع الإشعارات
        await Promise.all(notificationPromises);

        console.log(`[Notifications] ✅ تم إرسال جميع الإشعارات بنجاح للمرحلة: ${stepName}`);

    } catch (error) {
        console.error(`[Notifications] ❌ خطأ في إرسال إشعارات المرحلة ${stepName}:`, error);
    }
}

/**
 * @description إرسال إشعار للبائعين عند تغيير حالة المرحلة.
 * @function notifySellerOnStepChange
 * @param {Array<string>} sellerKeys - مصفوفة مفاتيح البائعين.
 * @param {string} stepId - معرف المرحلة المفعلة.
 * @param {string} stepName - اسم المرحلة بالعربية.
 * @param {string} orderId - رقم الطلب (اختياري).
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If `getUsersTokens` or `sendNotificationsToTokens` fails.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */
async function notifySellerOnStepChange(sellerKeys, stepId, stepName, orderId = '') {
    if (!sellerKeys || sellerKeys.length === 0) {
        console.log('[Notifications] لا يوجد بائعون لإرسال إشعارات لهم');
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
            console.log(`[Notifications] تم إرسال إشعار للبائعين (${sellerKeys.length}) عن المرحلة ${stepName}`);
        } else {
            console.warn('[Notifications] لم يتم العثور على توكنات للبائعين');
        }
    } catch (error) {
        console.error('[Notifications] فشل إرسال إشعار للبائعين:', error);
    }
}

/**
 * @description الدالة الرئيسية لإرسال الإشعارات للمراحل الفرعية (ملغي، مرفوض، مرتجع).
 * تُستدعى بعد تأكيد المرحلة الرئيسية المرتبطة بها.
 * @function notifyOnSubStepActivation
 * @param {Object} params - معاملات الإشعار.
 * @param {string} params.stepId - معرف المرحلة الفرعية.
 * @param {string} params.stepName - اسم المرحلة بالعربية.
 * @param {string} [params.buyerKey] - مفتاح المشتري (للمرحلة "مرفوض").
 * @param {Array<string>} [params.sellerKeys] - مفاتيح البائعين (للمراحل "ملغي" و "مرتجع").
 * @param {string} [params.orderId] - رقم الطلب.
 * @param {string} [params.userName] - اسم المستخدم الذي فعّل المرحلة.
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
    console.log(`[Notifications] بدء إرسال إشعارات المرحلة الفرعية: ${stepName} (${stepId}) - القائم بالفعل: ${actingUserId}`);

    try {
        const notificationPromises = [];

        const filteredSellerKeys = sellerKeys.filter(k => k !== actingUserId);

        // حسب نوع المرحلة الفرعية
        await loadNotificationMessages();
        switch (stepId) {
            case 'step-cancelled':
                // ملغي: إشعار البائعين + الإدارة
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
                break;

            case 'step-rejected':
                // مرفوض: إشعار المشتري + الإدارة
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-rejected', 'buyer')) {
                    const orderIdText = orderId ? ` رقم #${orderId}` : '';
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
                break;

            case 'step-returned':
                // مرتجع: إشعار البائعين + الإدارة
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
                break;
        }

        // انتظار إرسال جميع الإشعارات
        await Promise.all(notificationPromises);

        console.log(`[Notifications] ✅ تم إرسال جميع إشعارات المرحلة الفرعية: ${stepName}`);

    } catch (error) {
        console.error(`[Notifications] ❌ خطأ في إرسال إشعارات المرحلة الفرعية ${stepName}:`, error);
    }
}


/**
 * @description إرسال إشعار للإدارة عند إضافة منتج أو خدمة جديدة.
 * @function notifyAdminOnNewItem
 * @param {Object} productData - بيانات المنتج أو الخدمة المضافة.
 * @returns {Promise<void>}
 * @async
 */
async function notifyAdminOnNewItem(productData) {
    console.log(`%c[Dev-Notification] 🚀 بدء محاولة إخطار الإدارة بالإضافة الجديدة للمادة: ${productData.productName}`, 'color: #2196F3; font-weight: bold;');
    try {
        console.log(`[Dev-Notification] 🔍 المرحلة 1: التحقق من تفعيل الحدث (new-item-added) في الإعدادات...`);
        const isEnabled = await shouldNotify('new-item-added', 'admin');

        if (!isEnabled) {
            console.warn(`[Dev-Notification] ⚠️ الكود توقف: الإشعار للحدث new-item-added (admin) معطل حالياً في ملف التكوين.`);
            return;
        }
        console.log(`[Dev-Notification] ✅ الحدث مفعل في الإعدادات.`);

        console.log(`[Dev-Notification] 🔑 المرحلة 2: جلب توكنات FCM الخاصة بمدراء النظام...`);
        const adminTokens = await getAdminTokens();
        if (!adminTokens || adminTokens.length === 0) {
            console.error('[Dev-Notification] ❌ خطأ: لم يتم العثور على أي توكنات (Admins) مسجلة في قاعدة البيانات.');
            return;
        }

        // عرض التوكنات بناءً على طلب المستخدم
        console.log(`[Dev-Notification] 📱 توكنات الإدارة المكتشفة (${adminTokens.length}):`, adminTokens);

        console.log(`[Dev-Notification] 📄 المرحلة 3: تحميل نصوص الرسائل وتجهيز المحتوى النهائي...`);
        await loadNotificationMessages();

        const itemType = (productData.serviceType === 'service' || productData.isService) ? 'خدمة' : 'منتج';
        const itemName = productData.productName || 'غير مسمى';
        const itemKey = productData.product_key || 'N/A';
        const userKey = productData.user_key || 'N/A';
        const userName = userSession?.username || 'مستخدم مجهول';

        console.log(`[Dev-Notification] 🛠️ تجهيز القالب: new-item-added.admin | المادة: ${itemName} | المفتاح: ${itemKey} | بواسطة: ${userName} | المستخدم: ${userKey}`);
        const { title, body } = getMessageTemplate('new-item-added.admin', {
            itemType,
            itemName,
            itemKey,
            userName,
            userKey
        });

        if (!body) {
            console.error('[Dev-Notification] ❌ خطأ فادح: محتوى الرسالة (Body) فارغ! تأكد من وجود مفتاح new-item-added في notification_messages.json');
        } else {
            console.log(`[Dev-Notification] ✅ تم تجهيز الرسالة بنجاح: "${body.substring(0, 30)}..."`);
        }

        console.log(`[Dev-Notification] 📡 المرحلة 4: إرسال الطلبات المتوازية إلى Firebase لعدد ${adminTokens.length} توكن...`);
        const sendResult = await sendNotificationsToTokens(adminTokens, title, body);

        console.log(`[Dev-Notification] 🏁 ملخص النتيجة النهائية للإرسال:`, sendResult);
        console.log(`%c[Notifications] ✅ تم إرسال إشعار للإدارة بنجاح عن إضافة ${itemType}: ${itemName}`, 'color: #4CAF50; font-weight: bold;');

    } catch (error) {
        console.error('%c[Dev-Notification] ❌ فشل عملية الإخطار بالكامل نتيجة خطأ غير متوقع:', 'color: red;', error);
    }
}

/**
 * @description إرسال إشعار للإدارة عند تعديل منتج أو خدمة موجودة.
 * @function notifyAdminOnItemUpdate
 * @param {Object} productData - بيانات المنتج أو الخدمة المعدلة.
 * @returns {Promise<void>}
 * @async
 */
async function notifyAdminOnItemUpdate(productData) {
    console.log(`%c[Dev-Notification] 🚀 بدء محاولة إخطار الإدارة بتعديل المادة: ${productData.productName}`, 'color: #FF9800; font-weight: bold;');
    try {
        const isEnabled = await shouldNotify('item-updated', 'admin');
        if (!isEnabled) {
            console.warn(`[Dev-Notification] ⚠️ الكود توقف: الإشعار للحدث item-updated (admin) معطل حالياً.`);
            return;
        }

        const adminTokens = await getAdminTokens();
        if (!adminTokens || adminTokens.length === 0) {
            console.error('[Dev-Notification] ❌ خطأ: لم يتم العثور على أي توكنات (Admins).');
            return;
        }

        await loadNotificationMessages();

        const itemType = (productData.serviceType === 2 || productData.serviceType === '2' || productData.isService) ? 'خدمة' : 'منتج';
        const itemName = productData.productName || 'غير مسمى';
        const itemKey = productData.product_key || 'N/A';
        const userName = userSession?.user_name || 'مستخدم';

        const { title, body } = getMessageTemplate('item-updated.admin', {
            itemType,
            itemName,
            itemKey,
            userName
        });

        if (body) {
            await sendNotificationsToTokens(adminTokens, title, body);
            console.log(`%c[Notifications] ✅ تم إرسال إشعار للإدارة بنجاح عن تعديل ${itemType}: ${itemName}`, 'color: #4CAF50; font-weight: bold;');
        }

    } catch (error) {
        console.error('%c[Dev-Notification] ❌ فشل إشعار التعديل:', 'color: red;', error);
    }
}
