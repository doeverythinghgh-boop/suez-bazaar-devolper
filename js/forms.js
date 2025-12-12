/**
 * @file js/forms.js
 * =======================================================================
 * وحدة تحميل المحتوى الديناميكي (Dynamic Content Loader - BidStory)
 *
 * تم تحديث profileRestartScripts لتغليف الأكواد المضمنة بـ IIFE
 * للتعامل مع أخطاء "Identifier has already been declared" الناتجة عن const/let.
 * 
 * تمت إضافة دالة containerGoBack للعودة إلى الحاوية السابقة
 * =======================================================================
 */

// سجل المعرّفات (ID's) الخاصة بالحاويات التي تم تحميلها مع حفظ الترتيب
/**
 * @constant
 * @type {string[]}
 * @description Stores the IDs of containers that have been loaded, maintaining their order.
 * This registry is used to manage dynamic content loading and navigation history.
 */
const LOADER_REGISTRY = [];

/**
 * @description إخفاء جميع الحاويات المسجلة ما عدا الحالية، والتحقق مما إذا كانت الحاوية مطلوبة للتحميل أم للعرض فقط.
 * @function profileHandleRegistry
 * @param {string} containerId - المعرّف (ID) الخاص بالحاوية الهدف.
 * @param {boolean} reload - هل يجب إعادة تحميل المحتوى حتى لو كان مسجلاً؟
 * @returns {boolean} - true إذا تم العثور على الحاوية ولم يُطلب إعادة التحميل، مما يوقف عملية التحميل.
 * @throws {Error} - If an error occurs during DOM manipulation or array operations.
 */
function profileHandleRegistry(containerId, reload) {
    try {
        // إخفاء جميع الحاويات المفتوحة حاليًا لتحاكي نظام التبويبات
        LOADER_REGISTRY.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        // البحث عن الحاوية في المصفوفة
        const existingIndex = LOADER_REGISTRY.indexOf(containerId);

        // إذا كانت الحاوية مسجلة بالفعل
        if (existingIndex !== -1) {
            const container = document.getElementById(containerId);
            if (container) container.style.display = "block";

            // نقل الحاوية إلى نهاية المصفوفة لتصبح الأحدث
            LOADER_REGISTRY.splice(existingIndex, 1);
            LOADER_REGISTRY.push(containerId);

            // إيقاف عملية التحميل إذا كانت غير مطلوبة
            if (!reload) {
                return true;
            }
        } else {
            // تسجيل الحاوية الجديدة في نهاية المصفوفة
            LOADER_REGISTRY.push(containerId);
        }
        return false; // المتابعة لعملية التحميل
    } catch (error) {
        console.error("خطأ في إدارة سجل التحميل (profileHandleRegistry):", error);
        return false;
    }
}

/**
 * @description جلب محتوى HTML من الرابط المحدد.
 * @function profileFetchContent
 * @param {string} pageUrl - رابط الصفحة المراد جلبها.
 * @returns {Promise<string|null>} - وعد (Promise) يعود بمحتوى HTML أو null في حال حدوث خطأ.
 * @async
 * @throws {Error} - If the fetch request fails or the response is not OK.
 */
async function profileFetchContent(pageUrl) {
    try {
        const response = await fetch(pageUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`فشل تحميل الملف (${response.status}): ${pageUrl}`);
        }
        return await response.text();
    } catch (error) {
        console.error("خطأ في جلب محتوى الملف (profileFetchContent):", error);
        return null;
    }
}

/**
 * @description إعادة تشغيل السكربتات المضمنة يدوياً (المنهجية: hgh_sec).
 *
 * *تم التحديث*: تغليف السكربتات المضمنة بدالة مُنفذة فورياً (IIFE)
 * لإنشاء نطاق خاص وتجنب خطأ "already declared" مع const/let.
 * @function profileRestartScripts
 * @param {HTMLElement} container - العنصر الذي يحتوي على السكربتات المراد إعادة تشغيلها.
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If an error occurs during DOM manipulation or script execution.
 */
async function profileRestartScripts(container) {
    try {
        // استخراج جميع عناصر السكربتات الموجودة
        const scripts = [...container.querySelectorAll("script")];

        for (const oldScript of scripts) {
            const newScript = document.createElement("script");

            // 1. نسخ السمات والخصائص
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }

            // 2. معالجة محتوى السكربت (للسكربتات المضمنة)
            if (oldScript.innerHTML.trim()) {
                let scriptContent = oldScript.innerHTML;

                // تغليف الكود المضمن بدالة منفذة فورياً (IIFE) لإنشاء نطاق خاص
                // هذا يمنع خطأ "Identifier 'X' has already been declared" عند إعادة التحميل
                scriptContent = `(function() {
                    try {
                        ${scriptContent}
                    } catch (err) {
                        // طباعة الخطأ للمساعدة في تتبع المشكلة داخل السكربت المُنفّذ
                        console.error("❌ خطأ في تنفيذ سكربت مُغلّف (IIFE) بعد التحميل:", err);
                    }
                })();`;

                newScript.textContent = scriptContent;
            }

            // 3. استبدال السكربت القديم بالجديد
            oldScript.replaceWith(newScript);

            // 4. إذا كان السكربت خارجياً (لديه src)، يجب الانتظار حتى يتم تحميله
            if (newScript.src) {
                // الانتظار باستخدام Promise لضمان التنفيذ التسلسلي قبل متابعة السكربت التالي
                await new Promise((resolve) => {
                    newScript.onload = () => resolve();
                    newScript.onerror = () => {
                        console.error(`❌ فشل تحميل السكربت الخارجي: ${newScript.src}`);
                        resolve(); // الاستمرار حتى لو فشل السكربت
                    };
                });
            }
        }
    } catch (error) {
        console.error("خطأ في إعادة تشغيل السكربتات (profileRestartScripts):", error);
    }
}

/**
 * @description تنفيذ دالة رد النداء (Callback) بعد اكتمال التحميل.
 * @function profileExecuteCallback
 * @function profileExecuteCallback
 * @param {string|string[]} callbackName - اسم دالة رد النداء (أو مصفوفة من الأسماء) في النطاق العام (window).
 * @returns {void}
 * @throws {Error} - If the specified callback function does not exist or throws an error during execution.
 */
function profileExecuteCallback(callbackName) {
    try {
        if (!callbackName) return;

        // دعم تعدد الكول باك (Array of callbacks)
        if (Array.isArray(callbackName)) {
            callbackName.forEach(name => profileExecuteCallback(name));
            return;
        }

        if (!window[callbackName] || typeof window[callbackName] !== "function") return;

        const callback = window[callbackName];
        console.log(`✔ تم تنفيذ دالة رد النداء (Callback) باسم: ${callbackName}`);
        callback();

    } catch (error) {
        console.error("خطأ في تنفيذ دالة رد النداء (profileExecuteCallback):", error);
    }
}

/**
 * @description تقوم بمسح الأنماط (Styles) والسكربتات (Scripts) المرتبطة بالتحميل السابق للحاوية لمنع التضارب.
 * @function profileClearOldContent
 * @param {string} containerId - المعرّف (ID) الخاص بالحاوية الهدف.
 * @returns {void}
 * @throws {Error} - If an error occurs during DOM manipulation.
 */
function profileClearOldContent(containerId) {
    try {
        // 1. مسح الـ CSS المخصص المضاف تلقائيًا للحاوية
        // البحث باستخدام السمة المخصصة data-loader-id لضمان تحديد دقيق
        document.querySelectorAll(`style[data-loader-id="${containerId}"]`).forEach(styleTag => {
            styleTag.remove();
        });

        // 2. مسح محتوى HTML للحاوية
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }

        console.log(`✔ تم مسح المحتوى والـ CSS القديم المتعلق بالحاوية: ${containerId}`);

    } catch (error) {
        console.error("خطأ في مسح المحتوى القديم (profileClearOldContent):", error);
    }
}

/**
 * @description الدالة الرئيسية لتحميل المحتوى الديناميكي وتطبيقه في الحاوية الهدف.
 *
 * @param {string} pageUrl - رابط الصفحة المراد تحميلها.
 * @param {string} containerId - الـ ID الخاص بالحاوية الهدف.
 * @param {number} [waitMs=300] - وقت الانتظار بالملي ثانية.
 * @param {string} [cssRules=...] - كود CSS يتم تطبيقه على الـ container (افتراضي جاهز).
 * @param {string|string[]} [callbackName] - اسم دالة رد النداء (أو مصفوفة أسماء) في النطاق العام (window) ليتم استدعاؤها بعد التحميل.
 * @param {boolean} [reload=false] - فرض إعادة تحميل المحتوى حتى لو كان مسجلاً.
 */
async function mainLoader(
    pageUrl,
    containerId,
    waitMs = 300,
    cssRules = `
        flex: 1;
        border: none;
        overflow-y: auto;
        overflow-x: hidden;
    `,
    callbackName,
    reload = false
) {
    try {
        // 1. إدارة السجل وإخفاء الحاويات الأخرى
        const skipLoading = profileHandleRegistry(containerId, reload);

        if (skipLoading) {
            profileExecuteCallback(callbackName);
            return;
        }

        // 2. المسح عند إعادة التحميل: يمنع تضارب الـ Styles والـ Scripts القديمة
        if (reload) {
            profileClearOldContent(containerId);
        }

        // 3. تحميل محتوى HTML
        const html = await profileFetchContent(pageUrl);

        if (html === null) return; // فشل التحميل

        const container = document.getElementById(containerId);
        if (!container) {
            console.error("لم يتم العثور على العنصر: " + containerId);
            return;
        }

        // إدخال المحتوى وعرض الحاوية
        container.innerHTML = html;
        container.style.display = "block";

        // 4. تطبيق CSS تلقائياً (فصل المسؤوليات - SoC)
        const styleTag = document.createElement("style");
        // إضافة سمة مخصصة لتمييز الأنماط التي أنشأها الـ Loader
        styleTag.setAttribute('data-loader-id', containerId);
        styleTag.innerHTML = `
            #${containerId} {
                ${cssRules}
            }
        `;
        document.head.appendChild(styleTag);

        // 5. إعادة تشغيل السكربتات (المنهجية المحفوظة: hgh_sec)
        await profileRestartScripts(container);

        // 6. الانتظار
        await new Promise((r) => setTimeout(r, waitMs));

        // سجل الإخراج النهائي لعملية التحميل
        console.log(
            `%c✔✔✔✔✔✔✔ تم التحميل ✔✔✔✔✔✔✔\n` +
            `pageUrl: ${pageUrl}\n` +
            `containerId: ${containerId}\n` +
            `reload: ${reload}`,
            "color: #0a4902ff; font-size: 12px; font-weight: bold; font-family: 'Tahoma';"
        );

        // 7. تنفيذ رد النداء
        profileExecuteCallback(callbackName);

    } catch (globalError) {
        console.error("خطأ عام غير متوقع في دالة mainLoader:", globalError);
    }
}
/**
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If any sub-function (`profileHandleRegistry`, `profileClearOldContent`, `profileFetchContent`, `profileRestartScripts`, `profileExecuteCallback`) throws an error, or if critical DOM elements are not found.
 * @see profileHandleRegistry
 * @see profileClearOldContent
 * @see profileFetchContent
 * @see profileRestartScripts
 * @see profileExecuteCallback
 */

/**
 * @description العودة إلى الحاوية السابقة (إن وجدت) وإزالة الحاوية الحالية من السجل.
 * @function containerGoBack
 * @returns {boolean} - true إذا تمت العملية بنجاح، false إذا لم تكن هناك حاوية سابقة للعودة إليها.
 * @throws {Error} - If an error occurs during DOM manipulation or registry updates.
 * @see profileClearOldContent
 */
function containerGoBack() {
    try {
        // التحقق من وجود حاويات كافية للعودة
        if (LOADER_REGISTRY.length < 2) {
            console.warn("⚠ لا توجد حاوية سابقة للعودة إليها.");
            return false;
        }

        // إزالة الحاوية الحالية من نهاية المصفوفة
        const currentContainerId = LOADER_REGISTRY.pop();

        // الحصول على الحاوية السابقة (أصبحت الآن الأخيرة في المصفوفة)
        const previousContainerId = LOADER_REGISTRY[LOADER_REGISTRY.length - 1];

        // إخفاء الحاوية الحالية
        const currentContainer = document.getElementById(currentContainerId);
        if (currentContainer) {
            currentContainer.style.display = "none";
        }

        // تنظيف محتوى الحاوية الحالية إذا كانت لا تزال في الـ DOM
        profileClearOldContent(currentContainerId);

        // إظهار الحاوية السابقة
        const previousContainer = document.getElementById(previousContainerId);
        if (previousContainer) {
            previousContainer.style.display = "block";

            // تسجيل في console للتحليل
            console.log(
                `%c↩ تم العودة من ${currentContainerId} إلى ${previousContainerId}\n` +
                `السجل الحالي: [${LOADER_REGISTRY.join(", ")}]`,
                "color: #1a73e8; font-weight: bold;"
            );

            return true;
        } else {
            console.error(`❌ لم يتم العثور على الحاوية السابقة: ${previousContainerId}`);
            return false;
        }

    } catch (error) {
        console.error("خطأ في دالة containerGoBack:", error);
        return false;
    }
}