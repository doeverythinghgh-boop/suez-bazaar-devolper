/**
 * @file notification/fcm-event-handlers.js
 * @description Business logic for handling specific notification events.
 */

async function handlePurchaseNotifications(order) {
    console.log('[Notifications] Processing purchase:', order.id);
    try {
        const promises = [];
        if (await shouldNotify('purchase', 'admin')) promises.push(notifyAdminOnPurchase(order));
        if (await shouldNotify('purchase', 'seller')) promises.push(notifySellersOnPurchase(order));
        if (await shouldNotify('purchase', 'buyer')) promises.push(notifyBuyerOnPurchase(order));
        if (await shouldNotify('purchase', 'delivery')) promises.push(notifyDeliveryOnPurchase(order));
        await Promise.all(promises);
    } catch (error) {
        console.error('[Notifications] error:', error);
    }
}

async function notifyAdminOnPurchase(order) {
    try {
        await loadNotificationMessages();
        const adminTokens = await getAdminTokens();
        if (adminTokens.length > 0) {
            const { title, body } = getMessageTemplate('purchase.admin', { orderId: order.id || 'N/A' });
            await sendNotificationsToTokens(adminTokens, title, body);
        }
    } catch (error) {
        console.error('[Notifications] Admin notification failed:', error);
    }
}

async function notifySellersOnPurchase(order) {
    if (!order.items || !Array.isArray(order.items)) return;
    const sellersMap = new Map();
    order.items.forEach(item => {
        const sellerKey = item.seller_key;
        if (sellerKey) {
            if (!sellersMap.has(sellerKey)) sellersMap.set(sellerKey, []);
            sellersMap.get(sellerKey).push(item.name || 'product');
        }
    });
    await loadNotificationMessages();
    for (const [sellerKey, products] of sellersMap) {
        try {
            const sellerTokens = await getUsersTokens([sellerKey]);
            if (sellerTokens.length > 0) {
                const { title, body } = getMessageTemplate('purchase.seller');
                await sendNotificationsToTokens(sellerTokens, title, body);
            }
        } catch (error) {
            console.error(`[Notifications] Seller ${sellerKey} failed:`, error);
        }
    }
}

async function notifyBuyerOnPurchase(order) {
    try {
        if (!order.user_key) return;
        await loadNotificationMessages();
        const tokens = await getUsersTokens([order.user_key]);
        if (tokens.length > 0) {
            const { title, body } = getMessageTemplate('purchase.buyer', { orderId: order.id || 'N/A' });
            await sendNotificationsToTokens(tokens, title, body);
        }
    } catch (e) { console.error('[Notifications] Buyer purchase failed:', e); }
}

async function notifyDeliveryOnPurchase(order) {
    try {
        await loadNotificationMessages();
        const adminTokens = await getAdminTokens();
        if (adminTokens.length > 0) {
            const { title, body } = getMessageTemplate('purchase.delivery', { orderId: order.id || 'N/A' });
            await sendNotificationsToTokens(adminTokens, title, body);
        }
    } catch (e) { console.error('[Notifications] Delivery purchase failed:', e); }
}

async function notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId = '') {
    try {
        await loadNotificationMessages();
        const tokens = await getUsersTokens([buyerKey]);
        if (tokens.length > 0) {
            const orderIdText = orderId ? ` Number #${orderId}` : '';
            let templatePath = `steps.${stepId}.buyer`;
            if (!(notificationMessages && notificationMessages.steps && notificationMessages.steps[stepId] && notificationMessages.steps[stepId].buyer)) {
                templatePath = 'steps.general_update.buyer';
            }
            const { title, body } = getMessageTemplate(templatePath, { orderIdText, stepName });
            await sendNotificationsToTokens(tokens, title, body);
        }
    } catch (error) {
        console.error(`[Notifications] Step change buyer failed:`, error);
    }
}

async function notifyAdminOnStepChange(stepId, stepName, orderId = '', userName = '', actingUserId = '') {
    try {
        await loadNotificationMessages();
        const tokens = await getAdminTokens(actingUserId);
        if (tokens.length > 0) {
            const orderIdText = orderId ? ` for order #${orderId}` : '';
            const userInfo = userName ? ` by ${userName}` : '';
            const { title, body } = getMessageTemplate('steps.general_update.admin', { stepName, orderIdText, userInfo });
            await sendNotificationsToTokens(tokens, title, body);
        }
    } catch (error) { console.error('[Notifications] Step change admin failed:', error); }
}

async function notifyDeliveryOnStepChange(deliveryKeys, stepId, stepName, orderId = '') {
    if (!deliveryKeys || deliveryKeys.length === 0) return;
    try {
        await loadNotificationMessages();
        const tokens = await getUsersTokens(deliveryKeys);
        if (tokens.length > 0) {
            const orderIdText = orderId ? ` #${orderId}` : '';
            let templatePath = `steps.${stepId}.delivery`;
            if (!(notificationMessages && notificationMessages.steps && notificationMessages.steps[stepId] && notificationMessages.steps[stepId].delivery)) {
                templatePath = 'steps.general_update.delivery';
            }
            const { title, body } = getMessageTemplate(templatePath, { orderIdText, stepName });
            await sendNotificationsToTokens(tokens, title, body);
        }
    } catch (error) { console.error('[Notifications] Step change delivery failed:', error); }
}

async function notifySellerOnStepChange(sellerKeys, stepId, stepName, orderId = '') {
    if (!sellerKeys || sellerKeys.length === 0) return;
    try {
        await loadNotificationMessages();
        const tokens = await getUsersTokens(sellerKeys);
        if (tokens.length > 0) {
            const orderIdText = orderId ? ` #${orderId}` : '';
            let templatePath = `steps.${stepId}.seller`;
            if (!(notificationMessages && notificationMessages.steps && notificationMessages.steps[stepId] && notificationMessages.steps[stepId].seller)) {
                templatePath = 'steps.general_update.seller';
            }
            const { title, body } = getMessageTemplate(templatePath, { orderIdText, stepName });
            await sendNotificationsToTokens(tokens, title, body);
        }
    } catch (error) { console.error('[Notifications] Step change seller failed:', error); }
}

async function notifyOnStepActivation({ stepId, stepName, buyerKey = '', sellerKeys = [], deliveryKeys = [], orderId = '', userName = '', actingUserId = '' }) {
    console.log(`[Notifications] Step activation: ${stepName}`);
    try {
        const promises = [];
        if (buyerKey && buyerKey !== actingUserId && await shouldNotify(stepId, 'buyer')) promises.push(notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId));
        if (await shouldNotify(stepId, 'admin')) promises.push(notifyAdminOnStepChange(stepId, stepName, orderId, userName, actingUserId));

        const filteredSellers = sellerKeys.filter(k => k !== actingUserId);
        const filteredDelivery = deliveryKeys.filter(k => k !== actingUserId);

        if (filteredSellers.length > 0 && await shouldNotify(stepId, 'seller')) promises.push(notifySellerOnStepChange(filteredSellers, stepId, stepName, orderId));
        if (filteredDelivery.length > 0 && await shouldNotify(stepId, 'delivery')) promises.push(notifyDeliveryOnStepChange(filteredDelivery, stepId, stepName, orderId));

        await Promise.all(promises);
    } catch (error) { console.error(`[Notifications] Step activation failed:`, error); }
}

async function notifyOnSubStepActivation({ stepId, stepName, buyerKey = '', sellerKeys = [], orderId = '', userName = '', actingUserId = '' }) {
    console.log(`[Notifications] Sub-step: ${stepName}`);
    try {
        const promises = [];
        const filteredSellers = sellerKeys.filter(k => k !== actingUserId);
        await loadNotificationMessages();

        switch (stepId) {
            case 'step-cancelled':
                if (filteredSellers.length > 0 && await shouldNotify('step-cancelled', 'seller')) promises.push(notifySellerOnStepChange(filteredSellers, stepId, stepName, orderId));
                if (await shouldNotify('step-cancelled', 'admin')) promises.push(notifyAdminOnStepChange(stepId, stepName, orderId, userName));
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-cancelled', 'buyer')) promises.push(notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId));
                const deliveryKeysCancel = await getTokensForActiveDelivery2Seller(filteredSellers[0] || '');
                if (deliveryKeysCancel?.length > 0 && await shouldNotify('step-cancelled', 'delivery')) promises.push(notifyDeliveryOnStepChange(deliveryKeysCancel, stepId, stepName, orderId));
                break;

            case 'step-rejected':
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-rejected', 'buyer')) {
                    const orderIdText = orderId ? ` Number #${orderId}` : '';
                    const { title, body } = getMessageTemplate('steps.step-rejected.buyer', { orderIdText });
                    const buyerTokens = await getUsersTokens([buyerKey]);
                    if (buyerTokens.length > 0) promises.push(sendNotificationsToTokens(buyerTokens, title, body));
                }
                if (await shouldNotify('step-rejected', 'admin')) promises.push(notifyAdminOnStepChange(stepId, stepName, orderId, userName));
                if (filteredSellers.length > 0 && await shouldNotify('step-rejected', 'seller')) promises.push(notifySellerOnStepChange(filteredSellers, stepId, stepName, orderId));
                const deliveryKeysReject = await getTokensForActiveDelivery2Seller(filteredSellers[0] || '');
                if (deliveryKeysReject?.length > 0 && await shouldNotify('step-rejected', 'delivery')) promises.push(notifyDeliveryOnStepChange(deliveryKeysReject, stepId, stepName, orderId));
                break;

            case 'step-returned':
                if (filteredSellers.length > 0 && await shouldNotify('step-returned', 'seller')) promises.push(notifySellerOnStepChange(filteredSellers, stepId, stepName, orderId));
                if (await shouldNotify('step-returned', 'admin')) promises.push(notifyAdminOnStepChange(stepId, stepName, orderId, userName));
                if (buyerKey && buyerKey !== actingUserId && await shouldNotify('step-returned', 'buyer')) promises.push(notifyBuyerOnStepChange(buyerKey, stepId, stepName, orderId));
                const deliveryKeysReturn = await getTokensForActiveDelivery2Seller(filteredSellers[0] || '');
                if (deliveryKeysReturn?.length > 0 && await shouldNotify('step-returned', 'delivery')) promises.push(notifyDeliveryOnStepChange(deliveryKeysReturn, stepId, stepName, orderId));
                break;
        }
        await Promise.all(promises);
    } catch (error) { console.error(`[Notifications] Sub-step failed:`, error); }
}

async function notifyAdminOnNewItem(productData) {
    try {
        if (!(await shouldNotify('new-item-added', 'admin'))) return;
        const actingUserId = userSession?.idUser || '';
        const adminTokens = await getAdminTokens(actingUserId);
        if (!adminTokens?.length) return;

        await loadNotificationMessages();
        const itemType = (productData.serviceType === 2 || productData.isService) ? 'Service' : 'Product';
        const itemName = productData.productName || 'Unnamed';
        const itemKey = productData.product_key || 'N/A';
        const userKey = productData.user_key || 'N/A';
        const userName = userSession?.username || 'Anonymous User';

        const { title, body } = getMessageTemplate('new-item-added.admin', { itemType, itemName, itemKey, userName, userKey });
        await sendNotificationsToTokens(adminTokens, title, body);

        if (await shouldNotify('new-item-added', 'seller') && userKey !== 'N/A') {
            const sellerTokens = await getUsersTokens([userKey]);
            if (sellerTokens.length > 0) {
                const sellerMsg = getMessageTemplate('new-item-added.seller', { itemType, itemName });
                await sendNotificationsToTokens(sellerTokens, sellerMsg.title, sellerMsg.body);
            }
        }
    } catch (error) { console.error('[Notifications] New item notification failed:', error); }
}

async function notifyAdminOnItemUpdate(productData) {
    try {
        if (!(await shouldNotify('item-updated', 'admin'))) return;
        const actingUserId = userSession?.idUser || '';
        const adminTokens = await getAdminTokens(actingUserId);
        if (!adminTokens?.length) return;

        await loadNotificationMessages();
        const itemType = (productData.serviceType === 2 || productData.isService) ? 'Service' : 'Product';
        const itemName = productData.productName || 'Unnamed';
        const itemKey = productData.product_key || 'N/A';
        const userName = userSession?.username || 'User';

        const { title, body } = getMessageTemplate('item-updated.admin', { itemType, itemName, itemKey, userName });
        await sendNotificationsToTokens(adminTokens, title, body);

        if (await shouldNotify('item-updated', 'seller') && productData.user_key) {
            const sellerTokens = await getUsersTokens([productData.user_key]);
            if (sellerTokens.length > 0) {
                const sellerMsg = getMessageTemplate('item-updated.seller', { itemType, itemName });
                await sendNotificationsToTokens(sellerTokens, sellerMsg.title, sellerMsg.body);
            }
        }
    } catch (error) { console.error('[Notifications] Item update notification failed:', error); }
}

async function notifyOnItemAccepted(productData) {
    try {
        const itemType = productData.isService ? 'Service' : 'Product';
        const itemName = productData.productName || 'Unnamed';
        const sellerKey = productData.user_key;
        await loadNotificationMessages();

        if (await shouldNotify('item-accepted', 'admin')) {
            const actingUserId = userSession?.idUser || '';
            const adminTokens = await getAdminTokens(actingUserId);
            if (adminTokens.length > 0) {
                const { title, body } = getMessageTemplate('item-accepted.admin', { itemType, itemName });
                await sendNotificationsToTokens(adminTokens, title, body);
            }
        }

        if (sellerKey && await shouldNotify('item-accepted', 'seller')) {
            const sellerTokens = await getUsersTokens([sellerKey]);
            if (sellerTokens.length > 0) {
                const { title, body } = getMessageTemplate('item-accepted.seller', { itemType, itemName });
                await sendNotificationsToTokens(sellerTokens, title, body);
            }
        }
    } catch (error) { console.error('[Notifications] Item acceptance failed:', error); }
}

window.handlePurchaseNotifications = handlePurchaseNotifications;
window.notifyAdminOnPurchase = notifyAdminOnPurchase;
window.notifySellersOnPurchase = notifySellersOnPurchase;
window.notifyBuyerOnPurchase = notifyBuyerOnPurchase;
window.notifyDeliveryOnPurchase = notifyDeliveryOnPurchase;
window.notifyBuyerOnStepChange = notifyBuyerOnStepChange;
window.notifyAdminOnStepChange = notifyAdminOnStepChange;
window.notifyDeliveryOnStepChange = notifyDeliveryOnStepChange;
window.notifySellerOnStepChange = notifySellerOnStepChange;
window.notifyOnStepActivation = notifyOnStepActivation;
window.notifyOnSubStepActivation = notifyOnSubStepActivation;
window.notifyAdminOnNewItem = notifyAdminOnNewItem;
window.notifyAdminOnItemUpdate = notifyAdminOnItemUpdate;
window.notifyOnItemAccepted = notifyOnItemAccepted;
