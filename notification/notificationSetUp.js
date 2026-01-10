
/**
 * @file notification/notificationSetUp.js
 * @description نقطة الدخول الرئيسية لتهيئة نظام إشعارات Firebase (FCM).
 *   تتولى هذه الوحدة تحديد البيئة (ويب أو أندرويد) وتشغيل إجراءات التهيئة المناسبة،
 *   بما في ذلك تسجيل Service Worker وطلب الأذونات ومزامنة التوكنات مع الخادم.
 */

// ===============================
//   Global State & Locks
// ===============================
let isSettingUpFCM = false;
let isServiceWorkerUsed = false;

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
    try {
        // التأكد من المستخدم
        if (!userSession || !userSession.user_key) {
            console.warn("[FCM] لا يوجد مستخدم مسجل — إلغاء العملية.");
            return;
        }
        const currentUserId = userSession.user_key;
        console.log(`[Dev] 📡 [FCM] المستخدم موجود (user_key: ${currentUserId}).`);

        // أولوية التهيئة على أندرويد
        if (window.Android && typeof window.Android.onUserLoggedIn === "function") {
            console.log('[Dev] 📡 [FCM] تم الكشف عن بيئة أندرويد (WebView).');
            await setupFirebaseAndroid(currentUserId);
        } else {
            console.log('[Dev] 📡 [FCM] تم الكشف عن بيئة ويب (Browser).');
            await setupFirebaseWeb(currentUserId);
        }

        sessionStorage.setItem("fcm_token_setup_done", "1");
        console.log('[Dev] 📡 [FCM] تم الانتهاء من دالة setupFCM بنجاح.');
    } catch (error) {
        console.error("[FCM] خطأ فادح في setupFCM:", error);
    } finally {
        isSettingUpFCM = false;
    }
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
        console.log("[SW] جاري تسجيل Service Worker...");
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // الانتظار حتى يصبح Service Worker نشطاً تماماً
        // هذا يمنع خطأ "no active Service Worker" عند طلب التوكن
        await navigator.serviceWorker.ready;

        console.log("[SW] تم التسجيل بنجاح وهو جاهز.");
        return reg;
    } catch (err) {
        console.error("[SW] فشل تسجيل Service Worker:", err);
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
        console.log("[Dev] 🌏 [Web FCM] الخطوة 1: تسجيل الـ Service Worker (registerServiceWorker)...");
        const swReg = await registerServiceWorker();
        if (!swReg) {
            console.error("[Dev] 🌏 [Web FCM] ❌ فشل تسجيل الـ Service Worker - لا يمكن المتابعة.");
            return;
        }
        console.log("[Dev] 🌏 [Web FCM] ✅ الـ Service Worker جاهز. الحالة: ", swReg.active ? "Active" : (swReg.installing ? "Installing" : "Waiting"));

        // استيراد Firebase ديناميكيًا
        if (!window.firebase) {
            console.log("[Dev] 🌏 [Web FCM] الخطوة 2: تحميل مكتبات Firebase الخارجية...");
            await import("../assets/libs/firebase/firebase-app-8.10.1.js");
            await import("../assets/libs/firebase/firebase-messaging-8.10.1.js");
        }

        const firebase = window.firebase;
        if (!firebase) {
            console.error("[Dev] 🌏 [Web FCM] ❌ فشل تحميل مكتبة Firebase بعد المحاولة.");
            return;
        }

        // تكوين Firebase
        console.log("[Dev] 🌏 [Web FCM] الخطوة 3: تهيئة Firebase App مع الإعدادات...");
        const firebaseConfig = {
            apiKey: "AIzaSyClapclT8_4UlPvM026gmZbYCiXaiBDUYk",
            authDomain: "suze-bazaar-notifications.firebaseapp.com",
            projectId: "suze-bazaar-notifications",
            storageBucket: "suze-bazaar-notifications.appspot.com",
            messagingSenderId: "983537000435",
            appId: "1:983537000435:web:92c2729c9aaf872764bc86",
            measurementId: "G-P8FMC3KR7M",
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("[Dev] 🌏 [Web FCM] ✅ تم إنشاء تطبيق Firebase بنجاح.");
        }
        const messaging = firebase.messaging();

        // ربط الخدمة بـ Messaging (ضروري في v8) - يجب استدعاؤه مرة واحدة فقط
        if (!isServiceWorkerUsed) {
            console.log("[Dev] 🌏 [Web FCM] 🔗 ربط الـ Service Worker بـ Messaging...");
            messaging.useServiceWorker(swReg);
            isServiceWorkerUsed = true;
            console.log("[Dev] 🌏 [Web FCM] ✅ تم الربط.");
        }

        // طلب الإذن
        console.log("[Dev] 🌏 [Web FCM] الخطوة 4: فحص وطلب إذن المتصفح (Notification.requestPermission)...");
        const permission = await Notification.requestPermission();
        console.log("[Dev] 🌏 [Web FCM] 🔐 حالة الإذن الحالية: ", permission);
        if (permission !== "granted") {
            console.warn("[Dev] 🌏 [Web FCM] ⚠️ تم رفض الإذن من المستخدم أو المتصفح.");
            return;
        }

        // طلب التوكن من FCM مع تأخير بسيط لضمان استقرار الـ Push Service
        console.log("[Dev] 🌏 [Web FCM] الخطوة 5: جاري طلب التوكن من سيرفرات Google FCM...");
        console.log("[Dev] 🌏 [Web FCM] ⏳ جاري الانتظار 1 ثانية لضمان استقرار PushManager...");
        await new Promise(r => setTimeout(r, 1000));

        try {
            console.log("[Dev] 🌏 [Web FCM] 🚀 جاري استدعاء getToken...");
            const currentToken = await messaging.getToken({
                vapidKey: "BK1_lxS32198GdKm0Gf89yk1eEGcKvKLu9bn1sg9DhO8_eUUhRCAW5tjynKGRq4igNhvdSaR0-eL74V3ACl3AIY",
                serviceWorkerRegistration: swReg
            });

            if (currentToken) {
                console.log("[Dev] 🌏 [Web FCM] ✅ تم استلام التوكن بنجاح: ", currentToken.substring(0, 15) + "...");
                const savedToken = localStorage.getItem("fcm_token");

                if (savedToken !== currentToken) {
                    console.log("[Dev] 🌏 [Web FCM] الخطوة 6: التوكن جديد، جاري حفظه...");
                    localStorage.setItem("fcm_token", currentToken);
                } else {
                    console.log("[Dev] 🌏 [Web FCM] الخطوة 6: التوكن مطابق تماماً للمحفوظ مسبقاً.");
                }

                // إرسال التوكن للخادم
                console.log("[Dev] 🌏 [Web FCM] الخطوة 7: جاري مزامنة التوكن مع قاعدة البيانات...");
                if (userId) {
                    await sendTokenToServer(userId, currentToken, "web");
                    localStorage.setItem('notifications_enabled', 'true');
                    console.log("[Dev] 🌏 [Web FCM] ✅ تمت المزامنة.");
                } else {
                    console.warn("[Dev] 🌏 [Web FCM] ⚠️ تم إلغاء المزامنة: userId مفقود.");
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
            console.error("[Dev] 🌏 [Web FCM] ❌ تفاصيل خطأ getToken:", {
                name: tokenErr.name,
                message: tokenErr.message,
                code: tokenErr.code,
                stack: tokenErr.stack
            });
            if (tokenErr.message.includes("Registration failed")) {
                console.error("[Dev] 🌏 [Web FCM] 💡 تحليل: هذا الخطأ (AbortError/Registration failed) غالباً بسبب حجب من المتصفح، VPN، أو عدم دعم الموقع لـ HTTPS بشكل كامل في هذه البيئة.");
            }
            throw tokenErr;
        }

    } catch (err) {
        console.error("[FCM Web] 💥 خطأ غير متوقع في setupFirebaseWeb:", err);
    }
}



// ===============================
//   Utility: Wait for Android Token
// ===============================

/**
 * @description تنتظر حتى يتم حفظ `android_fcm_key` في `localStorage` ثم تستدعي دالة رد الاتصال (callback).
 * @function waitForFcmKey
 * @param {function(string): void} callback - الدالة التي سيتم استدعاؤها مع مفتاح FCM بمجرد توفره.
 * @param {number} timeout - الوقت المحدد (في الميلي ثانية) قبل إلغاء الانتظار.
 * @returns {Promise<string>} - وعد (Promise) يُرجع مفتاح FCM بمجرد توفره.
 * @throws {Error} - في حالة انتهاء الوقت المحدد أو في حالة عدم وجود مفتاح FCM.
 */
function waitForFcmKey(callback, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const check = () => {
            const token = localStorage.getItem("android_fcm_key");

            if (token) {
                callback(token);
                return resolve(token);
            }

            if (Date.now() - start >= timeout) {
                console.warn("[Android FCM] انتهى الوقت — لم يصل التوكن.");
                return reject("timeout");
            }

            setTimeout(check, 300);
        };

        check();
    });
}
