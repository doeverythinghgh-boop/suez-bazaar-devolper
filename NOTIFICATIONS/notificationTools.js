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
    console.log("[Auth] تم استدعاء saveNotificationFromAndroid من الأندرويد:", notificationJson);
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
        await Promise.all(notificationPromises);
        console.log(`[Notifications SUCCESS] تم إرسال ${notificationPromises.length} إشعار بنجاح. انتهت عملية الإشعار.`);
    } catch (error) {
        // تسجيل الأخطاء المتعلقة بفشل الإرسال (دون إيقاف العملية الرئيسية)
        console.error("[Notifications ERROR] فشل في إرسال بعض الإشعارات. تحقق من سجلات sendNotification الفردية.", error);
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
