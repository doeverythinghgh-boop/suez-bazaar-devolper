/**
 * @file config.js
 * @description Configuration and constants file for the project.
 * This file contains constant values used throughout the application, such as Admin IDs.
 * Its purpose is to centralize settings in one place for easy modification and management.
 */

/**
 * @constant {string[]} ADMIN_IDS
 * @description List of user IDs that possess Admin privileges.
 * This list is used to check if the current user is an admin or not.
 * @example
 * // To check if the user is admin:
 * if (ADMIN_IDS.includes(userId)) { ... }
 */
export var ADMIN_IDS = ["dl14v1k7", "682dri6b"];

/**
 * @constant {object} ITEM_STATUS
 * @description Standard status constants for order items.
 * Used to track the progress of individual products within an order.
 */
export const ITEM_STATUS = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    REJECTED: "rejected",
    RETURNED: "returned"
};

/**
 * @constant {object} appDataControl
 * @description Central control object that replaces control.json.
 * Contains current user data, user definitions, and steps.
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
 * @description Orders data that replaces orders_.json.
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
 * @description Global variable holding a copy of the application data (stepper_app_data).
 * Updated automatically when state changes.
 */
export var globalStepperAppData = null;

/**
 * @var {string} baseURL
 * @description Base URL for the API.
 * Updated from the parent window if available.
 */
export var baseURL = '';

/**
 * @var {string} order_status
 * @description Current order status.
 * Updated from the parent window if available.
 */
export var order_status = '';

/**
 * @constant {Promise<void>} initializationPromise
 * @description Promise that resolves when `initializeFromParent` function finishes its work.
 * This ensures that any code depending on data initialized from the parent page will only run after initialization is complete.
 */
let resolveInitialization;
export const initializationPromise = new Promise(resolve => { resolveInitialization = resolve; });

/**
 * @function updateGlobalStepperAppData
 * @description Function to update the global variable globalStepperAppData and print the new value.
 * @param {object} newData - The new data.
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
 * @description Initializes data from window.parent.globalStepperAppData if available.
 * Updates idUser and ordersData with real values.
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
        // Check for data from parent window
        if (window.parent && window.parent.globalStepperAppData) {
            const parentData = window.parent.globalStepperAppData;

            console.log('  [Config] initializeFromParent: Found data in parent window.', parentData);

            // Update idUser
            if (parentData.idUser) {
                appDataControl.currentUser.idUser = parentData.idUser;
                console.log(`    [Config] initializeFromParent: Updated idUser to: ${parentData.idUser}`);
            }

            // Update ordersData
            if (parentData.ordersData && Array.isArray(parentData.ordersData)) {
                ordersData.length = 0; // Clear default data
                ordersData.push(...parentData.ordersData); // Add real data
                console.log('    [Config] initializeFromParent: Updated ordersData.', ordersData);
            }

            // Update baseURL
            if (parentData.baseURL) {
                baseURL = parentData.baseURL;
                console.log(`    [Config] initializeFromParent: Updated baseURL to: ${baseURL}`);
            }

            // Update order_status from the first order in ordersData
            if (parentData.ordersData && parentData.ordersData.length > 0 && parentData.ordersData[0].order_status) {
                let rawStatus = parentData.ordersData[0].order_status;
                console.log('    [Config] initializeFromParent: Found raw order_status.', rawStatus);
                // Check if data is a JSON string and parse it
                if (typeof rawStatus === 'string' && rawStatus.trim().startsWith('{')) {
                    console.log('      [Config] initializeFromParent: order_status is a JSON string, attempting to parse...');
                    try {
                        // If it is a JSON string, convert it to an object
                        globalStepperAppData = JSON.parse(rawStatus);
                        console.log('      [Config] initializeFromParent: Successfully parsed and updated globalStepperAppData.', globalStepperAppData);
                    } catch (e) {
                        console.error('      ❌ [Config] initializeFromParent: Failed to parse order_status JSON string.', e);
                        // In case of failure, use value as is (fallback behavior)
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
        // In all cases (success or failure), resolve the promise to indicate that initialization is finished
        if (resolveInitialization) {
            console.log('🏁 [Config] initializeFromParent: Initialization routine finished. Resolving promise.');
            resolveInitialization();
        }
    }
})();
