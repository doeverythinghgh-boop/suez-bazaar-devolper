/**
 * @file config.js
 * @description ملف الإعدادات والثوابت للمشروع.
 * يحتوي هذا الملف على القيم الثابتة التي تستخدم في جميع أنحاء التطبيق، مثل معرفات المسؤولين (Admins).
 * الغرض منه هو تجميع الإعدادات في مكان واحد لسهولة التعديل والإدارة.
 */

/**
 * @constant {string[]} ADMIN_IDS
 * @description قائمة معرفات المستخدمين الذين يمتلكون صلاحيات المسؤول (Admin).
 * يتم استخدام هذه القائمة للتحقق مما إذا كان المستخدم الحالي مسؤولاً أم لا.
 * @example
 * // للتحقق مما إذا كان المستخدم admin:
 * if (ADMIN_IDS.includes(userId)) { ... }
 */
export var ADMIN_IDS = ["xx1", "xx2"];

/**
 * @constant {object} appDataControl
 * @description كائن التحكم المركزي الذي يحل محل control.json.
 * يحتوي على بيانات المستخدم الحالي، تعريف المستخدمين، والخطوات.
 */
export var appDataControl = {
    currentUser: {

        "idUser": "seller_key_1"


    },

    users: [
        {
            type: "buyer",
            allowedSteps: ["step-review", "step-delivered", "step-cancelled", "step-rejected", "step-returned"]
        },
        {
            type: "seller",
            allowedSteps: ["step-review", "step-confirmed", "step-shipped", "step-cancelled", "step-rejected", "step-returned"]
        },
        {
            type: "courier",
            allowedSteps: ["step-review", "step-shipped", "step-delivered", "step-cancelled", "step-rejected", "step-returned"]
        },
        {
            type: "admin",
            allowedSteps: [
                "step-review",
                "step-confirmed",
                "step-shipped",
                "step-delivered",
                "step-cancelled",
                "step-rejected",
                "step-returned"
            ]
        }
    ],

    steps: [
        {
            id: "step-review",
            no: "1",
            name: "مراجعة",
            description: "الطلب تم إرساله وينتظر تأكيد البائع "
        },
        {
            id: "step-confirmed",
            no: "2",
            name: "تأكيد",
            description: "البائع وافق على الطلب وسيبدأ في التجهيز والشحن "
        },
        {
            id: "step-shipped",
            no: "3",
            name: "شحن",
            description: "المنتج تم تسليمه لشركة الشحن "
        },
        {
            id: "step-delivered",
            no: "4",
            name: "تسليم",
            description: "المشتري استلم المنتج "
        },
        {
            id: "step-cancelled",
            no: "5",
            name: "ملغي",
            description: "بعض الطلبات أُلغيت من قبل المشتري "
        },
        {
            id: "step-rejected",
            no: "6",
            name: "مرفوض",
            description: "البائع او الاداره رفضت تنفيذ الطلبات لنفاد الكمية أو مشكلة في المنتج"
        },
        {
            id: "step-returned",
            no: "7",
            name: "مرتجع",
            description: "المشتري أعاد بعض المنتجات بعد استلامه وتم قبول الإرجاع "
        }
    ]
};

/**
 * @constant {Array<object>} ordersData
 * @description بيانات الطلبات التي تحل محل orders_.json.
 */
export var ordersData = [
    {
        order_key: "order_key_1",
        user_key: "user_key_1",
        user_name: "user name 1",
        user_phone: "01026666666",
        user_address: "user address 1",
        order_status: "",
        created_at: "2025-11-25 18:24:00",
        order_items: [
            {
                product_key: "product_key_1",
                product_name: "Product 1",
                quantity: 1,
                seller_key: "seller_key_1",
                supplier_delivery: {
                    delivery_key: "delivery_key_1",
                    delivery_name: "delivery name 1",
                    delivery_phone: "01026666666"
                }
            },
            {
                product_key: "product_key_2",
                product_name: "Product 2",
                quantity: 1,
                seller_key: "seller_key_1",
                supplier_delivery: {
                    delivery_key: [
                        "delivery_key_2",
                        "delivery_key_3"
                    ],
                    delivery_name: ["delivery name 1", "delivery name 2"],
                    delivery_phone: ["01026666666", "01026666666"],
                }
            },
            {
                product_key: "product_key_3",
                product_name: "Product 3",
                quantity: 1,
                seller_key: "seller_key_1",
                supplier_delivery: {
                    delivery_key: "delivery_key_2",
                    delivery_name: "delivery name 2",
                    delivery_phone: "01026666666"
                }
            }
        ]
    }
];

/**
 * @var {object|null} globalStepperAppData
 * @description متغير عام يحمل نسخة من بيانات التطبيق (stepper_app_data).
 * يتم تحديثه تلقائياً عند تغيير الحالة.
 */
export var globalStepperAppData = null;

/**
 * @var {string} baseURL
 * @description عنوان URL الأساسي للـ API.
 * يتم تحديثه من النافذة الأم إذا كان متوفراً.
 */
export var baseURL = '';

/**
 * @var {string} order_status
 * @description حالة الطلب الحالية.
 * يتم تحديثه من النافذة الأم إذا كان متوفراً.
 */
export var order_status = '';

/**
 * @constant {Promise<void>} initializationPromise
 * @description وعد (Promise) يتم حله عندما تنتهي دالة `initializeFromParent` من عملها.
 * هذا يضمن أن أي كود يعتمد على البيانات المهيأة من الصفحة الأم لن يعمل إلا بعد اكتمال التهيئة.
 */
let resolveInitialization;
export const initializationPromise = new Promise(resolve => { resolveInitialization = resolve; });

/**
 * @function updateGlobalStepperAppData
 * @description دالة لتحديث المتغير العام globalStepperAppData وطباعة القيمة الجديدة.
 * @param {object} newData - البيانات الجديدة.
 * @returns {void}
 * @throws {Error} - If a critical error occurs during the fetch request to update the server.
 * @see baseURL
 * @see ordersData
 */
export function updateGlobalStepperAppData(newData) {
    console.log("🚀 [Config] updateGlobalStepperAppData: Function called. 000000000000", { newData });
    globalStepperAppData = newData;
    try {
        if (globalStepperAppData) {
            console.log("  [Config] updateGlobalStepperAppData: Preparing to send data to server...");
            fetch(baseURL + '/api/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_key: ordersData[0].order_key,
                    order_status: JSON.stringify(globalStepperAppData)
                })
            })
                .then(res => res.json())
                .then(data => {
                    console.log("  [Config] updateGlobalStepperAppData: Server responded successfully.", data);
                })
                .catch(err => console.error("  [Config] updateGlobalStepperAppData: Fetch request failed.", err));
            console.log("✅ [Config] updateGlobalStepperAppData: Global variable updated locally.", globalStepperAppData);
        }
    } catch (error) {
        console.error("❌ [Config] updateGlobalStepperAppData: A critical error occurred.", error);
    }
}

/**
 * @function initializeFromParent
 * @description تهيئة البيانات من window.parent.globalStepperAppData إذا كانت متوفرة.
 * يتم تحديث idUser و ordersData بالقيم الحقيقية.
 * @returns {void}
 * @throws {Error} - If a critical error occurs during initialization from the parent window.
 * @see window.parent.globalStepperAppData
 * @see appDataControl
 * @see ordersData
 * @see baseURL
 * @see globalStepperAppData
 * @see resolveInitialization
 */
(function initializeFromParent() {
    console.log("🚀 [Config] initializeFromParent: Starting initialization from parent window...");
    try {
        // التحقق من وجود بيانات من النافذة الأم
        if (window.parent && window.parent.globalStepperAppData) {
            const parentData = window.parent.globalStepperAppData;

            console.log('  [Config] initializeFromParent: Found data in parent window.', parentData);

            // تحديث idUser
            if (parentData.idUser) {
                appDataControl.currentUser.idUser = parentData.idUser;
                console.log(`    [Config] initializeFromParent: Updated idUser to: ${parentData.idUser}`);
            }

            // تحديث ordersData
            if (parentData.ordersData && Array.isArray(parentData.ordersData)) {
                ordersData.length = 0; // مسح البيانات الافتراضية
                ordersData.push(...parentData.ordersData); // إضافة البيانات الحقيقية
                console.log('    [Config] initializeFromParent: Updated ordersData.', ordersData);
            }

            // تحديث baseURL
            if (parentData.baseURL) {
                baseURL = parentData.baseURL;
                console.log(`    [Config] initializeFromParent: Updated baseURL to: ${baseURL}`);
            }

            // تحديث order_status من أول طلب في ordersData
            if (parentData.ordersData && parentData.ordersData.length > 0 && parentData.ordersData[0].order_status) {
                let rawStatus = parentData.ordersData[0].order_status;
                console.log('    [Config] initializeFromParent: Found raw order_status.', rawStatus);
                // التحقق مما إذا كانت البيانات نص JSON وتحويلها
                if (typeof rawStatus === 'string' && rawStatus.trim().startsWith('{')) {
                    console.log('      [Config] initializeFromParent: order_status is a JSON string, attempting to parse...');
                    try {
                        // إذا كان نص JSON، قم بتحويله إلى كائن
                        globalStepperAppData = JSON.parse(rawStatus);
                        console.log('      [Config] initializeFromParent: Successfully parsed and updated globalStepperAppData.', globalStepperAppData);
                    } catch (e) {
                        console.error('      ❌ [Config] initializeFromParent: Failed to parse order_status JSON string.', e);
                        // في حالة الفشل، استخدم القيمة كما هي (كسلوك احتياطي)
                        globalStepperAppData = rawStatus;
                    }
                }
            }

            console.log('✅ [Config] initializeFromParent: Initialization from parent data complete.');
        } else {
            console.log('  [Config] initializeFromParent: No data found in parent window. Using default values.');
        }
    } catch (error) {
        console.error('❌ [Config] initializeFromParent: A critical error occurred during initialization.', error);
        console.log('  [Config] initializeFromParent: Falling back to default values due to error.');
    } finally {
        // في كل الحالات (نجاح أو فشل)، قم بحل الوعد للإشارة إلى أن التهيئة قد انتهت
        if (resolveInitialization) {
            console.log('🏁 [Config] initializeFromParent: Initialization routine finished. Resolving promise.');
            resolveInitialization();
        }
    }
})();
