/**
 * @description التحقق مما إذا كان يجب إرسال الإشعار بناءً على الإعدادات
 * @param {string} eventKey
 * @param {string} role ('buyer' | 'admin' | 'seller' | 'delivery')
 * @returns {Promise<boolean>}
 */
let cachedDefaultConfig = null;
async function shouldNotify(eventKey, role) {
    try {
        const stored = localStorage.getItem('notification_config');
        if (stored) {
            const config = JSON.parse(stored);
            if (config[eventKey] && config[eventKey][role] !== undefined) {
                return config[eventKey][role];
            }
        }
    } catch (e) {
        console.warn('[Notifications] Error reading config, using defaults:', e);
    }

    // Fallback Defaults (Fetched from JSON if possible)
    if (!cachedDefaultConfig) {
        try {
            const response = await fetch('/notification_config.json');
            if (response.ok) {
                cachedDefaultConfig = await response.json();
            } else {
                console.warn('[Notifications] Failed to fetch defaults from JSON.');
            }
        } catch (e) {
            console.warn('[Notifications] Error fetching JSON defaults:', e);
        }
    }

    const defaults = cachedDefaultConfig || {
        // Hardcoded specific fallback if JSON completely fails (safety net)
        'purchase': { buyer: false, admin: true, seller: true, delivery: false },
        // ... other critical defaults could be here, but usually JSON should load or stored config exists.
    };

    // If we have defaults (from JSON)
    if (defaults && defaults[eventKey]) {
        return defaults[eventKey][role] !== false; // Default to true if not explicitly false, or match logic
    }

    // Safety fallback: only purchase notification to admin is critical true by default if EVERYTHING fails
    if (eventKey === 'purchase' && role === 'admin') return true;

    return true; // Default permissive or restrictive? Usually permissive if config missing is better to not lose notification
}

/**
 * @description دالة مخصصة ليتم استدعاؤها من كود الأندرويد الأصلي.
 *   تقوم هذه الدالة باستلام بيانات إشعار كـ JSON string وحفظه في IndexedDB.
 * @function saveNotificationFromAndroid
 * @param {string} notificationJson - سلسلة JSON تحتوي على بيانات الإشعار (title, body).
 * @returns {void}
 * @see addNotificationLog
 */
function saveNotificationFromAndroid(notificationJson) {
    // [خطوة 1] تسجيل البيانات القادمة من الأندرويد لأغراض التصحيح.
    console.log('%c[FCM Android] 📱 تم استقبال رسالة من تطبيق الأندرويد:', 'color: #ff9100; font-weight: bold; font-size: 14px;', notificationJson);
    try {
        // [خطوة 2] محاولة تحليل سلسلة JSON إلى كائن JavaScript.
        const notificationData = JSON.parse(notificationJson);
        const { title, body } = notificationData;

        if (typeof addNotificationLog === 'function') {
            // [خطوة 3] إذا كانت دالة `addNotificationLog` متاحة، يتم استدعاؤها لحفظ الإشعار في IndexedDB.
            addNotificationLog({
                messageId: notificationData.messageId || `android_${Date.now()}`, // ✅ جديد: استخدام المعرف الفريد أو إنشاء واحد
                type: 'received',
                title: title,
                body: body,
                timestamp: new Date(),
                status: 'unread',
                relatedUser: { key: 'admin', name: 'الإدارة' }, // يمكن تحسينه لتمرير المرسل الفعلي
                payload: notificationData,
            });
            console.log("[Auth] تم حفظ الإشعار من الأندرويد بنجاح في IndexedDB.");
        } else {
            // [خطوة 4] إذا لم تكن الدالة موجودة، يتم تسجيل خطأ.
            console.error("[Auth] الدالة addNotificationLog غير موجودة. تأكد من تحميل ملف notification-db-manager.js.");
        }
    } catch (error) {
        // [خطوة 5] في حالة حدوث أي خطأ أثناء التحليل أو الحفظ، يتم تسجيله.
        console.error("[Auth] خطأ في معالجة الإشعار القادم من الأندرويد:", error);
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
    return await apiFetch('/api/send-notification', {
        method: 'POST',
        body: { token, title, body },
    });
}

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

    // 2. تهيئة مصفوفة لتخزين وعود الإرسال
    const notificationPromises = [];
    console.log(`[Notifications] جاري تجهيز وعود الإرسال لـ ${allTokens.length} توكن فريد.`);

    // استخدام حلقة for...of لإنشاء الوعود
    for (const token of allTokens) {
        // التأكد من أن التوكن ليس قيمة باطلة (null/undefined/empty string) قبل الإنشاء
        if (token) {
            notificationPromises.push(sendNotification(token, title, body));
            // console.log(`[Notifications Debug] تم إنشاء وعد الإرسال للتوكن: ${token.substring(0, 10)}...`);
        } else {
            console.warn("[Notifications Debug] تم تجاهل توكن بقيمة باطلة (null/empty).");
        }
    }

    console.log(`[Notifications] إجمالي عدد وعود الإرسال الجاهزة: ${notificationPromises.length}`);
    console.log("[Notifications] استخدام Promise.all لإرسال جميع الإشعارات بالتوازي.");

    // 3. إرسال جميع الإشعارات بالتوازي
    try {
        const results = await Promise.all(notificationPromises);

        let successCount = 0;
        let diffLog = [];

        results.forEach((result, index) => {
            if (result && result.error) {
                console.error(`[Notifications ERROR] إشعار رقم ${index + 1} فشل:`, result.error);
                diffLog.push({ index: index + 1, status: 'failed', error: result.error });
            } else {
                successCount++;
            }
        });

        if (diffLog.length > 0) {
            console.warn(`[Notifications PARTIAL SUCCESS] تم إرسال ${successCount} بنجاح، وفشل ${diffLog.length}.`, diffLog);
            // اختياري: إظهار تنبيه للمستخدم أو المطور إذا كان الفشل كلياً
            if (successCount === 0) {
                console.error("[Notifications FATAL] فشل إرسال جميع الإشعارات. راجع الخطأ أعلاه.");
            }
        } else {
            console.log(`[Notifications SUCCESS] تم إرسال ${successCount} إشعار بنجاح. انتهت عملية الإشعار.`);
        }

    } catch (error) {
        // تسجيل الأخطاء غير المتوقعة (مثل خطأ في Promise.all نفسه)
        console.error("[Notifications ERROR] حدث خطأ غير متوقع أثناء إرسال الإشعارات.", error);
    }
}

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
        const ADMIN_KEYS = ["dl14v1k7", "682dri6b"];
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
 * @description يجلب قائمة الموزعين النشطين المرتبطين ببائع معين.
 *   يستخدم الفلتر `activeOnly=true` لجلب البيانات بكفاءة من الخادم.
 * @function getActiveDeliveryRelations
 * @param {string} sellerKey - المفتاح الفريد للبائع (`user_key`).
 * @returns {Promise<Array<Object>|null>} - وعد (Promise) يحتوي على مصفوفة من كائنات الموزعين النشطين، أو `null` في حالة حدوث خطأ.
 * @throws {Error} - إذا فشل جلب البيانات من API.
 * @see apiFetch
 */
async function getActiveDeliveryRelations(sellerKey) {
    try {
        const relations = await apiFetch(`/api/suppliers-deliveries?sellerKey=${sellerKey}&activeOnly=true`);
        if (relations.error) {
            throw new Error(relations.error);
        }
        console.log(`%c[API] getActiveDeliveryRelations successful for seller ${sellerKey}.`, "color: green;", relations);
        return relations;
    } catch (error) {
        console.error(`%c[getActiveDeliveryRelations] for seller ${sellerKey} failed:`, "color: red;", error);
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
    const deliveryUsers = await getActiveDeliveryRelations(sellerKey);
    const deliveryTokens = deliveryUsers
        ?.map((user) => user.fcmToken)
        .filter(Boolean); // استخراج التوكنات الصالحة فقط
    return deliveryTokens;
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
            console.error('[FCM] API returned an error:', result.error);
        }
        return [];

    } catch (error) {
        // معالجة أخطاء الشبكة أو الأخطاء التي لم يتم التعامل معها في apiFetch
        console.error('[FCM] Critical error during token fetch:', error);
        return [];
    }
}

/**
 * @description دالة مساعدة لإرسال توكن FCM إلى الخادم.
 * @function sendTokenToServer
 * @param {string} userKey - المفتاح التعريفي للمستخدم.
 * @param {string} token - توكن FCM الذي سيتم إرساله.
 * @param {string} platform - منصة الجهاز (مثل "android" أو "web").
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال، ولكنه يعالج الاستجابة من الخادم.
 * @throws {Error} - في حالة فشل الاتصال بالشبكة أو وجود مشكلة في استجابة الخادم.
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
                "%c[FCM] Server successfully saved/updated the token.",
                "color: #28a745",
                responseData
            );
        } else {
            console.error(
                "[FCM] Server failed to save token. Status:",
                response.status,
                "Response:",
                responseData
            );
        }
    } catch (networkError) {
        console.error(
            "%c[FCM] Network error while sending token:",
            "color: #dc3545",
            networkError
        );
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
    // التحقق من وجود الكائن 'Android' للتأكد من أن الكود يعمل داخل تطبيق أندرويد
    if (
        window.Android &&
        typeof window.Android.requestNotificationPermission === "function"
    ) {
        console.log(
            "Calling native function to request notification permission..."
        );
        window.Android.requestNotificationPermission();
    } else {
        console.log("Android interface not available.");
    }
}


function onUserLoggedOutAndroid() {
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
}

/**
 * @description إدارة عملية الإشعار عند إتمام أمر شراء.
 * تقوم بإخطار الإدارة والبائعين المعنيين.
 * @function handlePurchaseNotifications
 * @param {Object} order - كائن الطلب الذي تم إنشاؤه.
 * @returns {Promise<void>}
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
 */
async function notifyAdminOnPurchase(order) {
    try {
        const adminTokens = await getAdminTokens();
        if (adminTokens.length > 0) {
            const title = "طلب شراء جديد";
            const body = `تم استلام طلب جديد رقم #${order.id || 'N/A'}. تحقق من التفاصيل في لوحة التحكم.`;
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
    for (const [sellerKey, products] of sellersMap) {
        try {
            const sellerTokens = await getUsersTokens([sellerKey]);

            if (sellerTokens.length > 0) {
                const productCount = products.length;
                const title = "مبيعات جديدة!";
                const body = `طلب شراء. تفقد الطلبات الآن.`;

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
 */
async function notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId = '') {
    try {
        const buyerTokens = await getUsersTokens([buyerKey]);

        if (buyerTokens.length > 0) {
            let title = "";
            let body = "";

            // تخصيص الرسالة حسب المرحلة
            switch (stepId) {
                case "step-review":
                    title = "تم استلام طلبك";
                    body = `تم استلام طلبك${orderId ? ` رقم #${orderId}` : ''}. يرجى مراجعة المنتجات.`;
                    break;
                case "step-confirmed":
                    title = "تم تأكيد الطلب";
                    body = `تم تأكيد طلبك${orderId ? ` رقم #${orderId}` : ''} من قبل البائع. جاري التجهيز للشحن.`;
                    break;
                case "step-shipped":
                    title = "تم شحن الطلب";
                    body = `تم شحن طلبك${orderId ? ` رقم #${orderId}` : ''}. في الطريق إليك!`;
                    break;
                case "step-delivered":
                    title = "تم التسليم";
                    body = `تم تسليم طلبك${orderId ? ` رقم #${orderId}` : ''} بنجاح. نتمنى أن تكون راضياً عن الخدمة.`;
                    break;
                default:
                    title = "تحديث الطلب";
                    body = `تم تحديث حالة طلبك${orderId ? ` رقم #${orderId}` : ''} إلى: ${stepName}`;
            }

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
 */
async function notifyAdminOnStepChange(stepId, stepName, orderId = '', userName = '') {
    try {
        const adminTokens = await getAdminTokens();

        if (adminTokens.length > 0) {
            const title = "تحديث حالة الطلب";
            const userInfo = userName ? ` بواسطة ${userName}` : '';
            const body = `تم تفعيل مرحلة "${stepName}"${orderId ? ` للطلب #${orderId}` : ''}${userInfo}.`;

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
 */
async function notifyDeliveryOnStepChange(deliveryKeys, stepId, stepName, orderId = '') {
    if (!deliveryKeys || deliveryKeys.length === 0) {
        console.log('[Notifications] لا توجد خدمات توصيل لإرسال إشعارات لها');
        return;
    }

    try {
        const deliveryTokens = await getUsersTokens(deliveryKeys);

        if (deliveryTokens.length > 0) {
            let title = "";
            let body = "";

            // تخصيص الرسالة حسب المرحلة
            switch (stepId) {
                case "step-confirmed":
                    title = "طلب جديد للتوصيل";
                    body = `تم تأكيد طلب${orderId ? ` #${orderId}` : ''} وجاهز للشحن. يرجى الاستعداد للتوصيل.`;
                    break;
                case "step-shipped":
                    title = "تم الشحن";
                    body = `تم شحن الطلب${orderId ? ` #${orderId}` : ''}. يرجى التوصيل للعميل.`;
                    break;
                case "step-delivered":
                    title = "تم التسليم";
                    body = `تم تسليم الطلب${orderId ? ` #${orderId}` : ''} بنجاح.`;
                    break;
                default:
                    title = "تحديث الطلب";
                    body = `تم تحديث حالة الطلب${orderId ? ` #${orderId}` : ''} إلى: ${stepName}`;
            }

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
 */
async function notifyOnStepActivation({
    stepId,
    stepName,
    buyerKey,
    deliveryKeys = [],
    orderId = '',
    userName = ''
}) {
    console.log(`[Notifications] بدء إرسال إشعارات تفعيل المرحلة: ${stepName} (${stepId})`);

    try {
        // إرسال الإشعارات بالتوازي لتحسين الأداء
        const notificationPromises = [];

        // 1. إشعار المشتري
        if (buyerKey && await shouldNotify(stepId, 'buyer')) {
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

        // 3. إشعار خدمات التوصيل
        if (['step-confirmed', 'step-shipped', 'step-delivered'].includes(stepId)) {
            if (deliveryKeys && deliveryKeys.length > 0 && await shouldNotify(stepId, 'delivery')) {
                notificationPromises.push(
                    notifyDeliveryOnStepChange(deliveryKeys, stepId, stepName, orderId)
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
 */
async function notifySellerOnStepChange(sellerKeys, stepId, stepName, orderId = '') {
    if (!sellerKeys || sellerKeys.length === 0) {
        console.log('[Notifications] لا يوجد بائعون لإرسال إشعارات لهم');
        return;
    }

    try {
        const sellerTokens = await getUsersTokens(sellerKeys);

        if (sellerTokens.length > 0) {
            let title = "";
            let body = "";

            // تخصيص الرسالة حسب المرحلة
            switch (stepId) {
                case "step-cancelled":
                    title = "منتجات ملغاة";
                    body = `المشتري ألغى بعض منتجاتك في الطلب${orderId ? ` #${orderId}` : ''}.`;
                    break;
                case "step-returned":
                    title = "منتجات مرتجعة";
                    body = `المشتري أرجع بعض منتجاتك من الطلب${orderId ? ` #${orderId}` : ''}.`;
                    break;
                default:
                    title = "تحديث الطلب";
                    body = `تم تحديث حالة الطلب${orderId ? ` #${orderId}` : ''} إلى: ${stepName}`;
            }

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
 */
async function notifyOnSubStepActivation({
    stepId,
    stepName,
    buyerKey = '',
    sellerKeys = [],
    orderId = '',
    userName = ''
}) {
    console.log(`[Notifications] بدء إرسال إشعارات المرحلة الفرعية: ${stepName} (${stepId})`);

    try {
        const notificationPromises = [];

        // حسب نوع المرحلة الفرعية
        switch (stepId) {
            case 'step-cancelled':
                // ملغي: إشعار البائعين + الإدارة
                if (sellerKeys && sellerKeys.length > 0 && await shouldNotify('step-cancelled', 'seller')) {
                    notificationPromises.push(
                        notifySellerOnStepChange(sellerKeys, stepId, stepName, orderId)
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
                if (buyerKey && await shouldNotify('step-rejected', 'buyer')) {
                    // تحديث رسالة المشتري للمرحلة "مرفوض"
                    const title = "منتجات مرفوضة";
                    const body = `تم رفض بعض المنتجات من طلبك${orderId ? ` رقم #${orderId}` : ''} لعدم توفرها.`;
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
                if (sellerKeys && sellerKeys.length > 0 && await shouldNotify('step-returned', 'seller')) {
                    notificationPromises.push(
                        notifySellerOnStepChange(sellerKeys, stepId, stepName, orderId)
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

