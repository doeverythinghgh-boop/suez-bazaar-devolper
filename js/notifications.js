/*
handler	api/send-notification.js	
نقطة نهاية API (Serverless) لإرسال إشعارات Push عبر Firebase Admin SDK، تتعامل مع طلبات POST.

handler	api/tokens.js	
نقطة نهاية API لإدارة التوكنات (حفظ، تحديث، حذف) في جدول user_tokens.

initDB	js/notification-db-manager.js	
تفتح أو تنشئ قاعدة بيانات IndexedDB المحلية لتخزين سجلات الإشعارات.

addNotificationLog	js/notification-db-manager.js	
تضيف سجلاً جديدًا للإشعار (صادر أو وارد) في قاعدة البيانات المحلية.

getNotificationLogs	js/notification-db-manager.js	
تجلب سجلات الإشعارات المخزنة لعرضها للمستخدم، مرتبة زمنيًا.

clearNotificationLogs	js/notification-db-manager.js	
تمسح كافة سجلات الإشعارات من قاعدة البيانات المحلية.

*/

/**
 * @description تهيئة Firebase Cloud Messaging (FCM) للمستخدم الحالي.
 *   تتضمن هذه العملية تسجيل Service Worker، طلب إذن الإشعارات،
 *   الحصول على توكن FCM، وإرساله إلى الخادم. تتعامل أيضًا مع تهيئة
 *   FCM للأجهزة التي تعمل بنظام Android.
 * @function setupFCM
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see sendTokenToServer
 * @see getCurrentUser
 * @see handleRevokedPermissions
 */
async function setupFCM() {
    // ✅ تحسين: إضافة علم لمنع إعادة التهيئة في كل مرة يتم فيها تحميل الصفحة.
    // هذا يضمن أن عملية الإعداد تتم مرة واحدة فقط لكل جلسة.
    if (window.fcmInitialized) {
        console.log("[FCM Setup] تم تهيئة FCM بالفعل في هذه الجلسة. سيتم التخطي.");
        return;
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


    // ✅ خطوة حاسمة: التحقق إذا كان الكود يعمل داخل تطبيق الأندرويد

    // الخطوة الحاسمة: إعلام كود الأندرويد الأصلي (فقط إذا كان مطلوبًا)
    if (window.Android && typeof window.Android.onUserLoggedIn === "function") {
        // احصل على التوكن المحلي من الأندرويد إذا كان موجودًا
        const existingAndroidToken = localStorage.getItem("android_fcm_key");

        // تحقق مما إذا كان التوكن فارغًا أو غير موجود
        if (!existingAndroidToken) {
            console.log("[Auth] بيئة أندرويد مكتشفة والتوكن المحلي فارغ. جاري طلب توكن جديد...");
            // استدعِ دالة الأندرويد فقط إذا لم يكن هناك توكن بالفعل
            window.Android.onUserLoggedIn(userSession.user_key );
            //هناك داله في نظام الاندرويد registerNativeToken تحفظ التوكن في التخزين باسم android_fcm_key
            //ننتظر حتي تقوم الداله بعملها وجلب التوكن 
            //ننرسله الي قاعدة البينات للحفظ
            await waitForFcmKey(async (fcmToken) => {
                console.log("تم العثور على مفتاح للاندرويد محفوظ محليا :", fcmToken);
                // استدعاء الدالة المساعدة الجديدة
                await sendTokenToServer(userSession.user_key, fcmToken, "android");
            });
        } else {
            console.log(
                "[Auth] بيئة أندرويد مكتشفة، والتوكن المحلي موجود بالفعل. لا حاجة لطلب جديد."
            );
            // يمكنك هنا إضافة أي منطق آخر إذا أردت، مثل التحقق من صحة التوكن
        }
        return;
    }

    // التأكد من أن المتصفح يدعم Service Workers
    if (!("serviceWorker" in navigator)) {
        console.log(
  "%c✔✔✔✔✔✔✔  تحذير هام ✔✔✔✔✔✔✔\n" +
  `هذا المتصفح لا يدعم ميزة الإشعارات (Service Workers).\n` 
  ,
  "color: #dc3545; font-size: 12px; font-weight: bold; font-family: 'Tahoma';"
);
        return;
    }

    if (!userSession.user_key) {
        console.log(
  "%c✔✔✔✔✔✔✔  تحذير هام ✔✔✔✔✔✔✔\n" +
  `لا يوجد مستخدم مسجل أو لا يحتوي على user_key. تتوقف العملية.\n` 
  ,
  "color: #dc3545; font-size: 12px; font-weight: bold; font-family: 'Tahoma';"
);
        return;
    }
    console.log("[FCM Setup] تم العثور على مستخدم مسجل:", userSession.username);
    //
    try {
        console.log("[FCM Setup] جاري تسجيل عامل الخدمة (Service Worker)...");
        await navigator.serviceWorker.register("firebase-messaging-sw.js");
        console.log(
            "%c[FCM] تم تسجيل عامل الخدمة (Service Worker) بنجاح.",
            "color: #28a745"
        );

        // استيراد دوال Firebase بشكل ديناميكي
        const { initializeApp } = await import(
            "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js"
        );
        const { getMessaging, getToken, onMessage } = await import(
            "https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging.js"
        );

        console.log("[FCM Setup] جاري تهيئة تطبيق Firebase...");
        const firebaseConfig = {
            apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
            authDomain: "suze-bazaar-notifications.firebaseapp.com",
            projectId: "suze-bazaar-notifications",
            storageBucket: "suze-bazaar-notifications.firebasestorage.app",
            messagingSenderId: "983537000435",
            appId: "1:983537000435:web:92c2729c9aaf872764bc86",
            measurementId: "G-P8FMC3KR7M",
        };

        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);
        console.log("[FCM Setup] تم تهيئة Firebase بنجاح.");

        onMessage(messaging, (payload) => {
            console.log(
                "%c[FCM] تم استقبال إشعار أثناء فتح الموقع (Foreground):",
                "color: #17a2b8",
                payload
            );
            const { title, body } = payload.data;
            Swal.fire({
                title: title, // عنوان الرسالة
                text: body, // نص الرسالة
                icon: "info", // أيقونة معلومات
                confirmButtonText: "موافق", // زر واحد للإغلاق
            });

            // ✅ إعادة إضافة: تسجيل الإشعار المستقبل في IndexedDB لمستخدمي المتصفح
            if (typeof addNotificationLog === 'function') {
                addNotificationLog({
                    messageId: payload.messageId, // ✅ جديد: تمرير المعرف الفريد للإشعار
                    type: 'received',
                    title: title,
                    body: body,
                    timestamp: new Date(),
                    status: 'unread',
                    relatedUser: { key: 'admin', name: 'الإدارة' },
                    payload: payload.data,
                });
            }
        });

        console.log("[FCM Setup] جاري طلب إذن عرض الإشعارات من المستخدم...");
        const permission = await Notification.requestPermission();
        if (permission === "granted") {

            console.log(
                "%c[FCM] تم الحصول على إذن إرسال الإشعارات.",
                "color: #28a745"
            );

            let fcmToken = localStorage.getItem("fcm_token");

            if (!fcmToken) {
                console.log(
                    "[FCM Setup] لا يوجد توكن مخزن، جاري طلب توكن جديد من Firebase..."
                );
                try {
                    const newFcmToken = await getToken(messaging, {
                        vapidKey:
                            "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY", // يُفضل نقل هذا إلى ملف config.js
                    });
                    if (newFcmToken) {
                        console.log(
                            "%c[FCM Setup] تم الحصول على توكن جديد:",
                            "color: #007bff",
                            newFcmToken
                        );
                        console.log(
                            "%c[FCM Setup] جاري حفظ التوكن الجديد في localStorage...",
                            "color: orange;"
                        );
                        localStorage.setItem("fcm_token", newFcmToken);
                        fcmToken = newFcmToken;

                        // ✅ تحسين: إرسال التوكن إلى الخادم فقط عند الحصول على توكن جديد.
                        console.log("[FCM] جاري إرسال التوكن الجديد إلى الخادم...");
                        await sendTokenToServer(loggedInUser.user_key, fcmToken, "web");

                    } else {
                        console.error("[FCM] فشل في الحصول على توكن جديد من Firebase.");
                    }
                } catch (err) {
                    console.error("[FCM] خطأ عند طلب التوكن من Firebase:", err);
                }
            } else {
                console.log("[FCM] تم العثور على توكن مخزن محليًا. لا حاجة لإرساله مرة أخرى.");
            }
        } else {
            console.warn("[FCM Setup] تم رفض إذن إرسال الإشعارات من قبل المستخدم.");
        }
    } catch (error) {
        console.error(
            "%c[FCM] حدث خطأ فادح أثناء إعداد الإشعارات:",
            "color: #dc3545",
            error
        );
    } finally {
        // ✅ تحسين: تعيين العلم إلى true بعد اكتمال المحاولة (سواء نجحت أم فشلت)
        // لمنع المحاولات المتكررة في نفس الجلسة.
        window.fcmInitialized = true;
    }
}

/**
* @description دالة جديدة ومستقلة لتهيئة الإشعارات.
*   يتم استدعاؤها من الصفحات التي تحتاج إلى استقبال الإشعارات.
*   تتحقق من أهلية المستخدم للإشعارات وتقوم بتهيئة FCM إذا كان مؤهلاً.
* @function initializeNotifications
* @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
* @see handleRevokedPermissions
* @see setupFCM
*/
async function initializeNotifications() {
    // [خطوة 1] التأكد من وجود جلسة مستخدم مسجلة. إذا لم يكن هناك مستخدم، تتوقف الدالة.
    //  if (!userSession) return;

    // [خطوة 2] استدعاء دالة للتحقق مما إذا كان المستخدم قد ألغى أذونات الإشعارات يدويًا.
    //handleRevokedPermissions();

    // [خطوة 3] التحقق مما إذا كان المستخدم مؤهلاً لاستقبال الإشعارات (بائع أو له دور أعلى).
    if (Number(userSession.is_seller) >= 1) {
        console.log("[Auth] مستخدم مؤهل، جاري إعداد FCM...");
        // [خطوة 4] (معطل حاليًا) استدعاء دالة إعداد FCM لبدء الاستماع للإشعارات.
        //await setupFCM();
    } else {
        console.log("[Auth] المستخدم (عميل عادي) غير مؤهل لاستقبال الإشعارات. تم تخطي إعداد FCM.");
    }
}

/**
 * @description يعالج سيناريو قيام المستخدم بإلغاء أذونات الإشعارات من إعدادات المتصفح.
 *   إذا تم العثور على توكن مخزن محليًا بينما الإذن مرفوض، فإنه يحاول حذفه من الخادم.
 * @function handleRevokedPermissions
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.

 */
async function handleRevokedPermissions() {
    // [خطوة 1] التحقق مما إذا كان الكود يعمل داخل WebView أندرويد أو إذا كانت الإشعارات غير مدعومة بالمتصفح. في هذه الحالات، لا يتم عمل أي شيء.
    if (window.Android || !("Notification" in window)) {
        return;
    }

    // [خطوة 2] الحصول على حالة إذن الإشعارات الحالية من المتصفح.
    const currentPermission = Notification.permission;
    // [خطوة 3] الحصول على توكن FCM المخزن محليًا (إن وجد).
    const fcmToken = localStorage.getItem("fcm_token");

    // [خطوة 4] التحقق مما إذا كان الإذن قد تم رفضه أو لم يتم تحديده، وفي نفس الوقت لا يزال هناك توكن مخزن.
    // هذا يعني أن المستخدم ألغى الإذن يدويًا من إعدادات المتصفح.
    if (
        (currentPermission === "denied" || currentPermission === "default") &&
        fcmToken
    ) {
        console.warn(
            "[FCM] تم اكتشاف إلغاء إذن الإشعارات. سيتم حذف التوكن..."
        );

        // [خطوة 5] التحقق من وجود جلسة مستخدم نشطة لإرسال طلب الحذف للخادم.
        if (userSession?.user_key) {
            try {
                // [خطوة 6] إرسال طلب HTTP "DELETE" إلى الخادم لحذف التوكن من قاعدة البيانات.
                await fetch(`${baseURL}/api/tokens`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_key: userSession.user_key,
                        token: fcmToken,
                    }),
                });
                console.log(
                    "[FCM] تم إرسال طلب حذف التوكن من الخادم بسبب تغيير حالة الإذن."
                );
            } catch (error) {
                console.error(
                    "[FCM] فشل إرسال طلب حذف التوكن بعد تغيير حالة الإذن:",
                    error
                );
                // ملاحظة: من الجيد هنا تسجيل هذا الخطأ في خدمة مراقبة خارجية.
            } finally {
                // [خطوة 7] سواء نجح الحذف من الخادم أم لا، يجب دائمًا إزالة التوكن من التخزين المحلي لضمان نظافة الحالة.
                localStorage.removeItem("fcm_token");
                console.log("[FCM] تم حذف التوكن من التخزين المحلي.");
            }
        } else {
            // [خطوة 8] إذا لم يكن هناك مستخدم مسجل، يتم فقط حذف التوكن المحلي.
            localStorage.removeItem("fcm_token");
        }
    }
}


/**
 * @description تنتظر حتى يتم حفظ `android_fcm_key` في `localStorage` ثم تستدعي دالة رد الاتصال (callback).
 * @function waitForFcmKey
 * @param {function(string): void} callback - الدالة التي سيتم استدعاؤها مع مفتاح FCM بمجرد توفره.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 */
async function waitForFcmKey(callback) {
    // [خطوة 1] بدء عملية فحص دورية باستخدام setInterval للبحث عن المفتاح.
    const checkInterval = setInterval(() => {
        // [خطوة 2] في كل دورة، محاولة قراءة "android_fcm_key" من التخزين المحلي.
        const key = localStorage.getItem("android_fcm_key");

        // [خطوة 3] التحقق من أن المفتاح موجود وقيمته ليست فارغة.
        if (key && key.trim() !== "") {
            // [خطوة 4] إذا تم العثور على المفتاح، يتم إيقاف الفحص الدوري.
            clearInterval(checkInterval);
            // [خطوة 5] استدعاء دالة الـ callback وتمرير المفتاح الذي تم العثور عليه.
            callback(key);
        }
    }, 300); // يتم الفحص كل 300 مللي ثانية
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
 * @description يرسل إشعارات بعد تحديث حالة الطلب.
 * @param {string} orderKey - مفتاح الطلب المحدث.
 * @param {string} sellerKey - مفتاح المستخدم (البائع).
 * @param {string} newStatusState - اسم الحالة الجديدة.
 */
async function sendUpdateNotifications(
    orderKey,
    sellerKey,
    newStatusState,
    withDelivery = true
) {
    try {
        let deliveryTokens = [];
        //  جلب توكنات خدمات التوصيل إذا كان من اطلق الحدث بائع
        if (withDelivery && sessionStorage.getItem("isSELLER")) {
            // 1. جلب توكنات خدمات التوصيل النشطة للبائع
            deliveryTokens = await getTokensForActiveDelivery2Seller(sellerKey); // استخراج التوكنات الصالحة فقط
        }
        if (!sessionStorage.getItem("isADMIN")) {
            // 2. جلب توكنات المسؤولين (الدالة معرفة في js/helpers/network.js)
            const adminTokens = await getAdminTokens();
        }

        // 3. دمج جميع التوكنات (خدمات التوصيل والمسؤولين) وإزالة التكرار
        const allTokens = [
            ...new Set([...(deliveryTokens || []), ...(adminTokens || [])]),
        ];
        const title = "تحديث حالة طلب";
        const body = `تم تحديث حالة الطلب رقم #${orderKey} إلى "${newStatusState}".`;
        await sendNotificationsToTokens(allTokens, title, body);
    } catch (error) {
        console.error("[Notifications] فشل في إرسال الإشعارات:", error);
    }
}

/**
 * @description يتحقق من حالة إذن الإشعارات ووجود توكن FCM، ثم يعرض رسالة وزر تفعيل أو معلومات الحالة بناءً على ذلك.
 *   يوفر للمستخدمين واجهة للتفاعل مع أذونات الإشعارات ويوجههم حول كيفية تفعيلها أو إلغائها.
 * @function checkAndDisplayNotificationStatus
 * @async
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see setupFCM (from js/auth.js)
 * @see Notification.permission
 * @see localStorage 'fcm_token'
 * @throws {Error} إذا فشلت عملية إعداد FCM عند محاولة التفعيل.
 */
async function checkAndDisplayNotificationStatus() {
    const statusContainer = document.getElementById('notification-status-container');
    if (!statusContainer) return;

    // ✅ جديد: التحقق أولاً مما إذا كان المتصفح يدعم الإشعارات من الأساس
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        statusContainer.innerHTML = `<i class="fas fa-exclamation-circle" style="color: #ffc107;"></i> <span>حالة الإشعارات: <strong>غير مدعومة</strong> (هذا المتصفح لا يدعم استقبال الإشعارات)</span>`;
        return;
    }

    let statusHTML = '';
    const permission = Notification.permission;
    const fcmToken = localStorage.getItem('fcm_token');

    if (permission === 'granted') {
        if (fcmToken) {
            statusHTML = `<i class="fas fa-check-circle" style="color: #28a745;"></i> <span>حالة الإشعارات: <strong>مفعّلة</strong> (أنت تستقبل الإشعارات حاليًا)</span>`;
        } else {
            statusHTML = `<i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> <span>حالة الإشعارات: <strong>قيد التفعيل.</strong> (حاول إعادة تحميل الصفحة لتسجيل الجهاز)</span> <button id="request-notif-btn" class="button-small-action">إعادة المحاولة</button>`;
        }
    } else if (permission === 'denied') {
        statusHTML = `<i class="fas fa-times-circle" style="color: #dc3545;"></i> <span>حالة الإشعارات: <strong>معطّلة</strong> (لقد قمت برفض الإذن)</span> <button id="request-notif-btn" class="button-small-action">إعادة التفعيل</button>`;
    } else {
        statusHTML = `<i class="fas fa-question-circle" style="color: #6c757d;"></i> <span>حالة الإشعارات: <strong>غير محددة</strong></span> <button id="request-notif-btn" class="button-small-action">تفعيل الإشعارات</button>`;
    }

    statusContainer.innerHTML = statusHTML;

    // إضافة وظيفة للزر الجديد
    const requestBtn = document.getElementById('request-notif-btn');
    if (requestBtn) {
        requestBtn.addEventListener('click', async () => {
            // إذا كان الإذن مرفوضًا، يجب على المستخدم تغييره يدويًا
            if (Notification.permission === 'denied') {
                Swal.fire({
                    title: 'الإشعارات محظورة',
                    icon: 'info',
                    html: `
            <div style="text-align: right; line-height: 1.7;">
              لقد قمت بحظر الإشعارات لهذا الموقع سابقًا. لإعادة تفعيلها، اتبع الخطوات الخاصة بمتصفحك:
              <ul style="padding-right: 20px; margin-top: 15px; text-align: right; list-style-type: none;">
                <li style="margin-bottom: 10px;"><strong><i class="fas fa-desktop" style="color: #555;"></i> على الكمبيوتر أو أندرويد:</strong><br>
                  انقر على أيقونة القفل <i class="fas fa-lock" style="color: #555;"></i> بجوار عنوان الموقع، ثم اختر "الأذونات" أو "إعدادات الموقع" وقم بتغيير "الإشعارات" إلى "سماح".
                </li>
                <li><strong><i class="fas fa-mobile-alt" style="color: #555;"></i> على أجهزة أخرى:</strong><br>
                  اذهب إلى إعدادات المتصفح، ثم "إعدادات المواقع"، وابحث عن موقعنا لتعديل أذونات الإشعارات.</li>
              </ul>
              <p style="margin-top: 15px;">قد تحتاج إلى إعادة تحميل الصفحة بعد تغيير الإعداد.</p>
            </div>`,
                    confirmButtonText: 'حسنًا، فهمت'
                });
                return;
            }

            // إذا لم يكن الإذن ممنوحًا، اطلب الإذن
            if (typeof setupFCM === 'function') {
                requestBtn.disabled = true;
                requestBtn.textContent = 'جاري...';
                try {
                    await setupFCM(); // استدعاء دالة طلب الإذن من auth.js
                    // إعادة التحقق من الحالة بعد محاولة التفعيل
                    await checkAndDisplayNotificationStatus();
                } catch (error) {
                    console.error("فشل في إعداد FCM:", error);
                    Swal.fire('خطأ', 'حدث خطأ أثناء محاولة تفعيل الإشعارات.', 'error');
                    requestBtn.disabled = false;
                    requestBtn.textContent = 'إعادة المحاولة';
                }
            } else {
                console.error('الدالة setupFCM غير موجودة.');
                Swal.fire('خطأ فني', 'لا يمكن طلب إذن الإشعارات حاليًا.', 'error');
            }
        });
    }
}

/**
 * @description يعرض نافذة منبثقة (Modal) بسجل الإشعارات، ويقوم بتحميل سجل الإشعارات من IndexedDB
 *   ويعرضها في قائمة، مع توفير وظيفة لمسح السجل.
 *   تستمع هذه الدالة أيضًا للأحداث الجديدة (`notificationLogAdded`) لتحديث السجل في الوقت الفعلي.
 * @function showNotificationsLogModal
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see getNotificationLogs
 * @see generateNotificationLogItemHTML
 * @see clearNotificationLogs
 */
async function showNotificationsLogModal() {
    /**
     * @description دالة مساعدة لمعالجة حدث `notificationLogAdded` وتحديث قائمة الإشعارات في النافذة المنبثقة.
     *   تضيف الإشعار الجديد إلى أعلى القائمة إذا كانت النافذة مرئية.
     * @function handleNewNotification
     * @param {CustomEvent} event - كائن الحدث المخصص الذي يحتوي على تفاصيل الإشعار الجديد (`event.detail`).
     * @returns {void}
     * @see generateNotificationLogItemHTML
     */
    const handleNewNotification = (event) => {
        // ✅ إصلاح: التحقق مما إذا كانت النافذة مفتوحة بالفعل قبل تحديثها.
        // هذا يمنع النافذة من الظهور تلقائيًا إذا كانت مغلقة.
        // ✅ إصلاح: الوصول إلى عنصر النافذة مباشرة لتجنب خطأ مرجعي.
        const modal = document.getElementById("notifications-log-modal-container");

        if (!modal || modal.style.display !== 'block') {
            console.log('[NotificationsModal] تم استقبال إشعار جديد، لكن النافذة مغلقة أو غير موجودة. سيتم تجاهل تحديث الواجهة.');
            return; // إيقاف التنفيذ إذا كانت النافذة غير مرئية
        }

        const newLog = event.detail;
        console.log('[NotificationsModal] تم استقبال إشعار جديد عبر الحدث، سيتم تحديث الواجهة:', newLog);

        // ✅ تحسين: إضافة الإشعار الجديد مباشرة إلى أعلى القائمة بدلاً من إعادة تحميل النافذة.
        // هذا يضمن الحفاظ على الترتيب التنازلي ويمنع وميض إعادة التحميل.
        const listContainer = document.getElementById('notifications-log-list');
        if (listContainer) {
            // إضافة العنصر الجديد في بداية القائمة
            listContainer.insertAdjacentHTML('afterbegin', generateNotificationLogItemHTML(newLog));
        } else {
            // كحل بديل إذا لم تكن القائمة موجودة (مثلاً كانت فارغة)، أعد تحميل النافذة
            showNotificationsLogModal();
        }
    };

    await loadAndShowModal(
        "notifications-log-modal-container",
        "pages/notificationsLogModal.html",
        async (modal) => {
            window.addEventListener('notificationLogAdded', handleNewNotification);

            const contentWrapper = modal.querySelector("#notifications-log-content-wrapper");
            contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

            if (typeof getNotificationLogs !== 'function') {
                console.error("الدالة getNotificationLogs غير معرفة. تأكد من تحميل notification-db-manager.js.");
                contentWrapper.innerHTML = "<p style='color: red;'>خطأ: لا يمكن تحميل سجل الإشعارات.</p>";
                return;
            }

            const logs = await getNotificationLogs('all', 100);

            if (logs && logs.length > 0) {
                contentWrapper.innerHTML = `
          <div id="notifications-log-list" style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">
            ${logs.map(generateNotificationLogItemHTML).join('')}
          </div>
          <div class="modal-footer-controls">
            <button id="clear-notifications-btn" class="button delete-btn-small"><i class="fas fa-trash-alt"></i> مسح الكل</button>
          </div>`;

                modal.querySelector('#clear-notifications-btn').addEventListener('click', async () => {
                    const result = await Swal.fire({
                        title: 'هل أنت متأكد؟',
                        text: "سيتم حذف جميع الإشعارات من السجل نهائيًا.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'نعم، احذف الكل!',
                        cancelButtonText: 'إلغاء'
                    });

                    if (result.isConfirmed) {
                        if (typeof clearNotificationLogs === 'function') {
                            await clearNotificationLogs();
                            Swal.fire('تم الحذف!', 'تم مسح سجل الإشعارات بنجاح.', 'success');
                            // ✅ تحسين: تحديث الواجهة مباشرة بدلاً من إعادة تحميل النافذة بالكامل.
                            contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0;">لا توجد إشعارات مسجلة بعد.</p>';
                        } else {
                            Swal.fire('خطأ', 'الدالة المطلوبة لمسح السجلات غير موجودة.', 'error');
                        }
                    }
                });
            } else if (logs) {
                contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0;">لا توجد إشعارات مسجلة بعد.</p>';
            } else {
                contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0; color: red;">حدث خطأ أثناء تحميل سجل الإشعارات.</p>';
            }
        },
        () => {
            // onClose callback
            if (handleNewNotification) {
                window.removeEventListener('notificationLogAdded', handleNewNotification);
            }
        }
    );
}