
/**
 * @file notification/notificationSetUp.js
 * @description نقطة الدخول الرئيسية لتهيئة نظام إشعارات Firebase (FCM).
 *   تتولى هذه الوحدة تحديد البيئة (ويب أو أندرويد) وتشغيل إجراءات التهيئة المناسبة،
 *   بما في ذلك تسجيل Service Worker وطلب الأذونات ومزامنة التوكنات مع الخادم.
 */

// ===============================
//   Global State & Locks
// ===============================
var isSettingUpFCM = false;
var isServiceWorkerUsed = false;

/**
 * @description تفقد الاتصال بخدمات جوجل الأساسية
 */
async function checkGoogleConnectivity() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://www.gstatic.com/generate_204', {
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (e) {
        console.error("[Dev] 🌏 [Web FCM] ❌ فشل الاتصال بخدمة gstatic.com - قد يكون هناك حجب للشبكة.");
        return false;
    }
}

/**
 * @description أداة تنظيف شاملة لتهيئة FCM من الصفر (Hard Reset)
 */
window.resetFCM = async function () {
    console.log("%c[FCM Tool] 🧹 بدء عملية التنظيف الشاملة (Hard Reset)...", "color: #ff9800; font-weight: bold;");
    try {
        // 1. مسح التوكنات
        localStorage.removeItem("fcm_token");
        localStorage.removeItem("notifications_enabled");
        sessionStorage.removeItem("fcm_token_setup_done");

        // 2. إلغاء تسجيل Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                console.log("[FCM Tool] تم إلغاء تسجيل: ", registration.scope);
            }
        }

        // 3. مسح الكاش
        if ('caches' in window) {
            const keys = await caches.keys();
            for (let key of keys) {
                await caches.delete(key);
                console.log("[FCM Tool] تم مسح الكاش: ", key);
            }
        }

        alert("تم التنظيف بنجاح. سيتم إعادة تحميل الصفحة الآن.");
        window.location.reload();
    } catch (e) {
        console.error("[FCM Tool] خطأ أثناء التنظيف:", e);
    }
};

// ===============================
//   FCM - Main Entry Point
// ===============================

/**
 * @description الدالة الرئيسية لتهيئة FCM.
 *   تقوم بالتحقق من وجود مستخدم مسجل، وتحديد المنصة (أندرويد أو ويب)، وتوجيه التهيئة للدالة المناسبة.
 * @function setupFCM
 * @async
 * @returns {Promise<void>}
 * @throws {Error} - If `setupFirebaseAndroid` or `setupFirebaseWeb` encounters a critical error.
 * @see setupFirebaseAndroid
 * @see setupFirebaseWeb
 * @see userSession
 */
async function setupFCM() {
    if (isSettingUpFCM) {
        console.log('[Dev] 📡 [FCM] Setup is already in progress. Skipping...');
        return;
    }
    isSettingUpFCM = true;

    console.log('[Dev] 📡 [FCM] جاري بدء تهيئة نظام الإشعارات setupFCM...');

    const MAX_RETRIES = 3;
    let attempt = 0;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
        attempt++;
        try {
            // التأكد من المستخدم
            if (!userSession || !userSession.user_key) {
                console.warn("[FCM] لا يوجد مستخدم مسجل — إلغاء العملية.");
                break; // No point in retrying if no user
            }
            const currentUserId = userSession.user_key;
            console.log(`[Dev] 📡 [FCM] محاولة رقم ${attempt}: المستخدم موجود (user_key: ${currentUserId}).`);

            // Check if this is a fresh setup after version change
            const lastVersionCheck = localStorage.getItem('last_version_check_time');
            if (lastVersionCheck) {
                const timeSinceCheck = Date.now() - parseInt(lastVersionCheck);
                if (timeSinceCheck < 10000) { // Within 10 seconds of version check/reload
                    console.log('%c[FCM] 🔄 تم رصد تحديث إصدار أو إعادة تحميل حديثة - جاري تهيئة FCM من جديد',
                        'color: #ff9800; font-weight: bold;');
                }
            }

            // أولوية التهيئة على أندرويد
            if (window.Android && typeof window.Android.onUserLoggedIn === "function") {
                console.log('[Dev] 📡 [FCM] تم الكشف عن بيئة أندرويد (WebView).');
                await setupFirebaseAndroid(currentUserId);
                success = true;
            } else {
                console.log('[Dev] 📡 [FCM] تم الكشف عن بيئة ويب (Browser).');
                await setupFirebaseWeb(currentUserId);
                // setupFirebaseWeb should throw if it fails critically to trigger retry
                success = true;
            }

            if (success) {
                sessionStorage.setItem("fcm_token_setup_done", "1");
                console.log(`[Dev] 📡 [FCM] ✅ تم الانتهاء من دالة setupFCM بنجاح في المحاولة رقم ${attempt}.`);
            }
        } catch (error) {
            console.error(`[FCM] ❌ فشل في المحاولة ${attempt}:`, error);
            if (attempt < MAX_RETRIES) {
                const delay = attempt * 3000; // 3s, 6s...
                console.log(`[FCM] ⏳ سيتم إعادة المحاولة خلال ${delay / 1000} ثانية...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("[FCM] 💥 تم استنفاد كافة المحاولات. فشل تهيئة الإشعارات.");
            }
        }
    }
    isSettingUpFCM = false;
}



// ===============================
//   1) Service Worker Registrar
// ===============================

/**
 * @description تقوم بتسجيل Service Worker الخاص بـ Firebase Messaging.
 *   تتحقق أولاً من دعم المتصفح وتتعامل مع تحذيرات HTTP/HTTPS.
 * @function registerServiceWorker
 * @async
 * @returns {Promise<ServiceWorkerRegistration|boolean>} - كائن التسجيل عند النجاح، أو `false` عند الفشل.
 */
async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        console.warn("[FCM] المتصفح لا يدعم Service Workers.");
        return false;
    }

    // تحذير عند العمل بدون HTTPS
    const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !isLocalhost) {
        console.warn("[FCM] تنبيه: الموقع يعمل عبر HTTP. قد يفشل تسجيل Service Worker إلا إذا تم تكوين المتصفح للسماح بذلك.");
        // لن نوقف التنفيذ هنا، سنترك المتصفح يقرر ما إذا كان سيقبل التسجيل أم لا
    }

    try {
        console.log("%c[SW] 🚀 الخطوة 1: بدء تسجيل Service Worker...", "color: #2196F3; font-weight: bold;");
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("%c[SW] ✅ الخطوة 2: تم إرسال طلب تسجيل sw.js بنجاح.", "color: #4CAF50;");

        // الانتظار حتى يصبح Service Worker نشطاً تماماً
        console.log("%c[SW] ⏳ الخطوة 3: في انتظار جاهزية الـ Service Worker...", "color: #FF9800;");
        const registration = await navigator.serviceWorker.ready;

        // التأكد من وجود عامل خدمة نشط
        if (!registration.active) {
            console.log("%c[SW] ⏳ الخطوة 4: ملف الخدمة غير نشط حالياً، جاري الانتظار البرمجي...", "color: #FF9800;");
            await new Promise((resolve) => {
                const onStateChange = () => {
                    if (registration.active) {
                        resolve();
                    }
                };
                if (registration.installing) {
                    registration.installing.addEventListener('statechange', onStateChange);
                } else if (registration.waiting) {
                    registration.waiting.addEventListener('statechange', onStateChange);
                } else {
                    resolve();
                }
            });
        }

        console.log(`%c[SW] 🎉 الخطوة 5: الـ Service Worker جاهز تماماً ونشط (Status: ${registration.active ? "Active" : "Unknown"}).`, "color: #4CAF50; font-weight: bold;");
        return registration;
    } catch (err) {
        console.error("%c[SW] ❌ فشل في تسجيل أو تجهيز ملف الخدمة:", "color: #f44336; font-weight: bold;", err);
        return false;
    }
}



// ===============================
//   2) FCM for Android WebView
// ===============================

/**
 * @description تقوم بتهيئة FCM خصيصاً لبيئة الأندرويد (WebView).
 *   تتواصل مع الواجهة الأصلية (Android Interface) لطلب التوكن، وتنتظر الاستجابة، ثم ترسله للخادم.
 * @function setupFirebaseAndroid
 * @async
 * @returns {Promise<void>}
 * @param {string} userId - The unique identifier of the user.
 * @throws {Error} - If `waitForFcmKey` or `sendTokenToServer` encounters an error.
 * @see waitForFcmKey
 * @see sendTokenToServer
 * @see userSession
 */
async function setupFirebaseAndroid(userId) {
    console.log("[Dev] 📱 [Android FCM] بدء تهيئة FCM للأندرويد...");

    const existingToken = localStorage.getItem("android_fcm_key");

    if (!existingToken) {
        console.log("[Dev] 📱 [Android FCM] الخطوة 1: لا يوجد توكن محفوظ محلياً.");
        console.log("[Dev] 📱 [Android FCM] الخطوة 2: طلب التوكن من النظام عبر window.Android.onUserLoggedIn...");

        // طلب التوكن من WebView
        try {
            // [!IMPORTANT] BRIDGE CALL: Coordinate with Android's WebAppInterface.onUserLoggedIn.
            console.log(`[Dev] 📱 [Android FCM] جاري استدعاء window.Android.onUserLoggedIn للمستخدم: ${userId}`);
            window.Android.onUserLoggedIn(userId);
        } catch (e) {
            console.error("[Android FCM] خطأ أثناء استدعاء onUserLoggedIn:", e);
        }

        // انتظار تخزين التوكن من النظام
        console.log("[Dev] 📱 [Android FCM] الخطوة 3: في انتظار وصول التوكن من تطبيق الأندرويد (waitForFcmKey)...");
        await waitForFcmKey(async (newToken) => {
            console.log("[Dev] 📱 [Android FCM] الخطوة 4: تم استلام التوكن من النظام بنجاح.");
            console.log("[Dev] 📱 [Android FCM] الخطوة 5: جاري مزامنة التوكن الجديد مع الخادم...");
            await sendTokenToServer(userId, newToken, "android");
            // تفعيل الإشعارات تلقائياً في الواجهة عند نجاح العملية لأول مرة
            console.log("[Dev] 📱 [Android FCM] الخطوة 6: تم تأكيد استلام التوكن ومزامنته. تفعيل الإشعارات في الواجهة.");
            localStorage.setItem('notifications_enabled', 'true');
        }, 10000); // timeout

    } else {
        console.log("[Current State] 📱 [Android FCM] التوكن موجود محليًا مسبقاً (Session Active).");
        console.log("[FCM Bridge] 📱 [Android FCM] التوكن: ", existingToken.substring(0, 10) + "...");
        // ✅ إضافة: ضمان تفعيل الإشعارات في الواجهة عند وجود توكن مسبقاً (مفيد عند إعادة تسجيل الدخول)
        console.log("[FCM Bridge] 📱 [Android FCM] مزامنة الحالة: الإشعارات مفعلة.");
        localStorage.setItem('notifications_enabled', 'true');
    }
}



// ===============================
//   3) FCM for Web Browsers
// ===============================

/**
 * @description تقوم بتهيئة FCM لبيئة الويب (المتصفحات).
 *   تشمل الخطوات: تسجيل Service Worker، استيراد مكتبات Firebase، تهيئة التطبيق، طلب الأذونات،
 *   الحصول على التوكن، ومزامنته مع الخادم.
 * @function setupFirebaseWeb
 * @async
 * @returns {Promise<void>}
 * @param {string} userId - The unique identifier of the user.
 * @throws {Error} - If Firebase libraries fail to load, permissions are denied, or token operations fail.
 * @see registerServiceWorker
 * @see addNotificationLog
 * @see sendTokenToServer
 * @see userSession
 */
async function setupFirebaseWeb(userId) {
    console.log("[Dev] 🌏 [Web FCM] بدء تهيئة FCM للويب...");

    try {
        const isSecureContext = window.isSecureContext;
        console.log("[Dev] 🌏 [Web FCM] 🔍 بدء تشخيص الحالة: ", {
            online: navigator.onLine,
            protocol: location.protocol,
            ua: navigator.userAgent,
            secureContext: isSecureContext,
            hostname: location.hostname
        });

        if (!isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
            console.error("[Dev] 🌏 [Web FCM] ❌ تنبيه أمني: المتصفح لا يعتبر هذه البيئة آمنة (Insecure Context). FCM لن يعمل إلا على HTTPS أو localhost.");
        }

        // فحص الاتصال بجوجل
        const googleAccess = await checkGoogleConnectivity();
        if (!googleAccess) {
            console.warn("[Dev] 🌏 [Web FCM] ⚠️ تنبيه: لا يمكن الوصول لخدمات Google. قد يفشل getToken.");
        }

        // تسجيل SW
        console.log("%c[Web FCM] 🏗️ الخطوة 1: جاري تسجيل الـ Service Worker...", "color: #9c27b0; font-weight: bold;");
        const swReg = await registerServiceWorker();
        if (!swReg) {
            const errorMsg = "[Web FCM] ❌ فشل تسجيل الـ Service Worker - لا يمكن المتابعة.";
            console.error(`%c${errorMsg}`, "color: #f44336; font-weight: bold;");
            throw new Error(errorMsg);
        }
        console.log("%c[Web FCM] ✅ تمت عملية التسجيل بنجاح.", "color: #4CAF50;");

        // استيراد Firebase ديناميكيًا
        if (!window.firebase) {
            console.log("%c[Web FCM] 🏗️ الخطوة 2: تحميل مكتبات Firebase الخارجية (Core & Messaging)...", "color: #9c27b0; font-weight: bold;");
            await import("../assets/libs/firebase/firebase-app-8.10.1.js");
            console.log("%c[Web FCM] - تم تحميل firebase-app.", "color: #795548;");
            await import("../assets/libs/firebase/firebase-messaging-8.10.1.js");
            console.log("%c[Web FCM] - تم تحميل firebase-messaging.", "color: #795548;");
        }

        const firebase = window.firebase;
        if (!firebase) {
            const errorMsg = "[Web FCM] ❌ فشل تحميل مكتبة Firebase بعد المحاولة.";
            console.error(`%c${errorMsg}`, "color: #f44336; font-weight: bold;");
            throw new Error(errorMsg);
        }
        console.log("%c[Web FCM] ✅ تم تجهيز كائن Firebase في النافذة.", "color: #4CAF50;");

        // تكوين Firebase
        console.log("%c[Web FCM] 🏗️ الخطوة 3: تهيئة Firebase App مع الإعدادات المخصصة...", "color: #9c27b0; font-weight: bold;");
        const firebaseConfig = {
            apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
            authDomain: "suze-bazaar-notifications.firebaseapp.com",
            projectId: "suze-bazaar-notifications",
            storageBucket: "suze-bazaar-notifications.firebasestorage.app",
            messagingSenderId: "983537000435",
            appId: "1:983537000435:web:92c2729c9aaf872764bc86",
            measurementId: "G-P8FMC3KR7M",
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("%c[Web FCM] ✅ تم إنشاء تطبيق Firebase (Initializing Done).", "color: #4CAF50;");
        } else {
            console.log("[Web FCM] تطبيق Firebase مفعل مسبقاً، استخدام نسخة المشروع الحالية.");
        }
        const messaging = firebase.messaging();

        // ربط الخدمة بـ Messaging (ضروري في v8)
        console.log("%c[Web FCM] 🏗️ الخطوة 4: ربط الـ Service Worker بكائن Messaging...", "color: #2196F3; font-weight: bold;");
        try {
            messaging.useServiceWorker(swReg);
            isServiceWorkerUsed = true;
            console.log("%c[Web FCM] ✅ تم الربط بنجاح (Connection Established).", "color: #4CAF50;");
        } catch (linkErr) {
            console.warn("[Web FCM] ⚠️ تنبيه عند الربط (قد يكون مرتبطاً مسبقاً):", linkErr.message);
        }

        // 5. فحص حالة الإذن
        let currentPermission = Notification.permission;
        console.log(`%c[Web FCM] 🔍 الخطوة 6: فحص حالة الإذن الحالية (Notification.permission): ${currentPermission}`, "color: #ffc107; font-weight: bold;");

        if (currentPermission === "denied") {
            const errorMsg = "[Web FCM] 🛑 الإذن مرفوض مسبقاً من إعدادات المتصفح/الجهاز.";
            console.error(`%c${errorMsg}`, "color: #f44336; font-weight: bold;");

            // إظهار تنبيه للمستخدم لإرشاده (فقط في بيئة الويب المتصفحية)
            if (typeof Swal !== 'undefined' && !window.Android) {
                Swal.fire({
                    title: 'الإشعارات معطلة بنظامك',
                    html: `لقد قمت بتعطيل الإشعارات لهذا التطبيق في إعدادات جهازك.<br>لتلقي التنبيهات، يرجى تفعيلها من <b>إعدادات المتصفح</b> أو <b>إعدادات الجهاز</b> ثم إعادة التشغيل.`,
                    icon: 'warning',
                    confirmButtonText: 'حسناً'
                });
            }
            return;
        }

        if (currentPermission === "default") {
            console.warn("%c[Web FCM] ⚠️ الأذونات في حالة 'default'. تخطي الطلب التلقائي لمنع الحظر في iOS/Safari.", "color: #ff9800;");
            console.log("%c[Web FCM] 💡 يجب على المستخدم تفعيل الإشعارات يدوياً من صفحة الإعدادات (User Gesture Required).", "color: #03a9f4;");
            return;
        }

        // إذا وصلنا هنا، يعني الإذن 'granted' (أو تم طلبه بنجاح في ظروف أخرى)
        console.log("%c[Web FCM] ✅ الخطوة 6: الإذن ممنوح (Status: granted). المتابعة لجلب التوكن.", "color: #4CAF50;");


        // طلب التوكن من FCM فوراً (بدون انتظار أعمى)
        console.log("%c[Web FCM] 🏗️ الخطوة 7: جاري جلب التوكن الفريد من سيرفرات Google FCM...", "color: #9c27b0; font-weight: bold;");

        const VAPID_KEY = "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY";

        try {
            console.log("%c[Web FCM] - جاري استدعاء messaging.getToken...", "color: #795548;");
            const currentToken = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg
            });

            if (currentToken) {
                console.log(`%c[Web FCM] ✅ الخطوة 8: تم استلام التوكن بنجاح: ${currentToken.substring(0, 15)}...`, "color: #4CAF50; font-weight: bold;");
                const savedToken = localStorage.getItem("fcm_token");

                if (savedToken !== currentToken) {
                    console.log("%c[Web FCM] 🔄 الخطوة 9: التوكن جديد ومختلف، جاري التحديث محلياً...", "color: #2196F3; font-weight: bold;");
                    localStorage.setItem("fcm_token", currentToken);
                } else {
                    console.log("[Web FCM] التوكن مطابق تماماً للمحفوظ مسبقاً - لا حاجة للتحديث المحلي.");
                }

                // إرسال التوكن للخادم
                console.log("%c[Web FCM] 🏗️ الخطوة 10: جاري مزامنة التوكن مع قاعدة البيانات عبر الخادم...", "color: #9c27b0; font-weight: bold;");
                if (userId) {
                    await sendTokenToServer(userId, currentToken, "web");
                    localStorage.setItem('notifications_enabled', 'true');
                    console.log("%c[Web FCM] ✅ تم تأكيد المزامنة مع الخادم بنجاح.", "color: #4CAF50;");
                } else {
                    console.warn("[Web FCM] ⚠️ توقف المزامنة: userId غير متاح حالياً.");
                }

                // [جديد] الخطوة 8: الاستماع للإشعارات في المقدمة (Foreground)
                // هذا المنطق يضمن استلام الإشعار وحفظه في DB حتى لو كان التطبيق مفتوحاً
                messaging.onMessage((payload) => {
                    console.log('%c[FCM Web] 📩 إشعار مستلم في المقدمة:', 'color: #00bcd4; font-weight: bold;', payload);

                    // استخراج البيانات (FCM v1 يضعها غالباً في payload.notification أو payload.data)
                    const { title, body } = payload.notification || payload.data || {};

                    if (title || body) {
                        if (typeof addNotificationLog === 'function') {
                            addNotificationLog({
                                messageId: payload.messageId || `fg_${Date.now()}`,
                                type: 'received',
                                title: title,
                                body: body,
                                timestamp: new Date(),
                                status: 'unread',
                                relatedUser: { key: 'system', name: 'النظام' },
                                payload: payload.data
                            }).then(() => {
                                console.log('[FCM Web] تم حفظ إشعار المقدمة في قاعدة البيانات.');
                            }).catch(err => {
                                console.error('[FCM Web] فشل حفظ إشعار المقدمة:', err);
                            });
                        }
                    }
                });

                console.log("[Dev] 🌏 [Web FCM] 🎉 اكتملت عملية التهيئة بنجاح.");
            } else {
                console.warn("[Dev] 🌏 [Web FCM] ❓ تم الاتصال بنجاح ولكن Google أعاد توكن فارغ.");
            }
        } catch (tokenErr) {
            // Ignore push service error as requested
            if (tokenErr.message && tokenErr.message.includes("push service error")) {
                console.warn("[Dev] 🌏 [Web FCM] ⚠️ تم تجاهل خطأ متكرر في خدمة الدفع (Push Service Error).");
            } else {
                console.error("[Dev] 🌏 [Web FCM] ❌ فشل الحصول على التوكن:", tokenErr.message);
                throw tokenErr;
            }
        }

    } catch (err) {
        // Ignore AbortError: Registration failed - push service error
        if (err.message && err.message.includes("push service error")) {
            console.warn("[FCM Web] ⚠️ تم تجاهل خطأ AbortError المتوقع لخدمة الدفع.");
        } else {
            console.error("[FCM Web] 💥 خطأ غير متوقع في setupFirebaseWeb:", err);
            throw err; // تصعيد الخطأ للمحاولة المتكررة
        }
    }
}



// ===============================
//   Utility: Wait for Android Token
// ===============================

/**
 * @description كائن لتخزين الوعود المعلقة بانتظار توكن الأندرويد
 */
window._fcmTokenResolvers = [];

/**
 * @description دالة يستدعيها تطبيق الأندرويد فور حصوله على التوكن
 * @param {string} token 
 */
window.onAndroidFcmReceived = function (token) {
    if (token) {
        console.log("[Bridge] 📱 تم استلام التوكن من الأندرويد عبر الإشارة المباشرة");
        localStorage.setItem("android_fcm_key", token);
        // حل جميع الوعود المنتظرة
        const resolvers = window._fcmTokenResolvers;
        window._fcmTokenResolvers = [];
        resolvers.forEach(resolve => resolve(token));
    }
};

function waitForFcmKey(callback, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem("android_fcm_key");

        if (token) {
            if (callback) callback(token);
            return resolve(token);
        }

        // إضافة الوعد للقائمة المنتظرة
        window._fcmTokenResolvers.push((t) => {
            if (callback) callback(t);
            resolve(t);
        });

        // تايم أوت للأمان فقط في حال فشل الأندرويد تماماً
        setTimeout(() => {
            if (!localStorage.getItem("android_fcm_key")) {
                console.warn("[Android FCM] فشل استلام التوكن عبر الإشارة (Timeout)");
                reject("timeout");
            }
        }, timeout);
    });
}
