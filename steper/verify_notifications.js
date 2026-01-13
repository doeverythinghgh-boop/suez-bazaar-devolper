
/**
 * Verification Test for Notification System
 * This script is intended to be run in the browser console where the app scripts are loaded.
 */

async function runNotificationTests() {
    console.log("%c Starting Notification System Verification...", "color: blue; font-weight: bold;");

    // Mocking window.shouldNotify to always return true for testing
    const originalShouldNotify = window.shouldNotify;
    window.shouldNotify = async () => true;

    // Mocking actual send functions to track calls
    const calls = {
        buyer: [],
        seller: [],
        delivery: [],
        admin: []
    };

    const originalNotifyBuyer = window.notifyBuyerOnStepChange;
    const originalNotifySeller = window.notifySellerOnStepChange;
    const originalNotifyDelivery = window.notifyDeliveryOnStepChange;
    const originalNotifyAdmin = window.notifyAdminOnStepChange;

    window.notifyBuyerOnStepChange = (...args) => calls.buyer.push(args);
    window.notifySellerOnStepChange = (...args) => calls.seller.push(args);
    window.notifyDeliveryOnStepChange = (...args) => calls.delivery.push(args);
    window.notifyAdminOnStepChange = (...args) => calls.admin.push(args);

    const mockOrdersData = [
        {
            id: 'ORD-123',
            user_key: 'BUYER-1',
            order_items: [
                { product_key: 'ITEM-A', seller_key: 'SELLER-A', supplier_delivery: { delivery_key: 'COURIER-A' } },
                { product_key: 'ITEM-B', seller_key: 'SELLER-B', supplier_delivery: { delivery_key: 'COURIER-B' } }
            ]
        }
    ];

    const mockControlData = { currentUser: { idUser: 'SELLER-A', name: 'Seller A' } };

    // --- CASE 1: SELLER-A confirms ITEM-A ---
    console.log("\n--- Case 1: SELLER-A confirms ITEM-A ---");
    const updates1 = [{ key: 'ITEM-A', status: 'Confirmed' }];

    // In actual app, we call extractRelevantSellerKeys and extractRelevantDeliveryKeys
    const relevantSellers1 = extractRelevantSellerKeys(updates1, mockOrdersData);
    const relevantDelivery1 = extractRelevantDeliveryKeys(updates1, mockOrdersData);
    const metadata1 = extractNotificationMetadata(mockOrdersData, mockControlData);

    await notifyOnStepActivation({
        stepId: 'step-confirmed',
        stepName: 'تم التأكيد',
        ...metadata1,
        sellerKeys: relevantSellers1,
        deliveryKeys: relevantDelivery1
    });

    console.log("Recipients identified:", { sellers: relevantSellers1, delivery: relevantDelivery1 });
    console.log("Seller notifications sent to keys:", calls.seller[0]?.[0]);
    console.log("Delivery notifications sent to keys:", calls.delivery[0]?.[0]);

    const sellerAisFiltered = !calls.seller[0]?.[0].includes('SELLER-A');
    const courierAisNotified = calls.delivery[0]?.[0].includes('COURIER-A');
    const courierBisNOTnotified = !calls.delivery[0]?.[0].includes('COURIER-B');

    console.log("Test 1 Result - Seller A Filtered:", sellerAisFiltered ? "✅" : "❌");
    console.log("Test 1 Result - Courier A (Relevant) Notified:", courierAisNotified ? "✅" : "❌");
    console.log("Test 1 Result - Courier B (Irrelevant) NOT Notified:", courierBisNOTnotified ? "✅" : "❌");

    // --- CASE 2: BUYER confirms delivery ---
    console.log("\n--- Case 2: BUYER confirms ITEM-A delivery ---");
    calls.buyer = []; calls.seller = []; calls.delivery = [];
    const mockControlDataBuyer = { currentUser: { idUser: 'BUYER-1', name: 'Buyer' } };
    const updates2 = [{ key: 'ITEM-A', status: 'Delivered' }];

    const relevantSellers2 = extractRelevantSellerKeys(updates2, mockOrdersData);
    const relevantDelivery2 = extractRelevantDeliveryKeys(updates2, mockOrdersData);
    const metadata2 = extractNotificationMetadata(mockOrdersData, mockControlDataBuyer);

    await notifyOnStepActivation({
        stepId: 'step-delivered',
        stepName: 'تم التوصيل',
        ...metadata2,
        sellerKeys: relevantSellers2,
        deliveryKeys: relevantDelivery2
    });

    console.log("Buyer is actor. Buyer Key:", metadata2.buyerKey);
    console.log("Buyer notification calls:", calls.buyer.length);

    const buyerIsFiltered = calls.buyer.length === 0;
    console.log("Test 2 Result - Buyer (Actor) Filtered:", buyerIsFiltered ? "✅" : "❌");

    // Restore originals
    window.shouldNotify = originalShouldNotify;
    window.notifyBuyerOnStepChange = originalNotifyBuyer;
    window.notifySellerOnStepChange = originalNotifySeller;
    window.notifyDeliveryOnStepChange = originalNotifyDelivery;
    window.notifyAdminOnStepChange = originalNotifyAdmin;

    console.log("\n%c Verification Complete.", "color: blue; font-weight: bold;");
}

runNotificationTests();
