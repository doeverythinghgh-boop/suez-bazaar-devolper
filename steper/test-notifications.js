/**
 * @file test-notifications.js
 * @description ملف اختبار لنظام الإشعارات عند تفعيل المراحل
 * 
 * كيفية الاستخدام:
 * 1. افتح Console في المتصفح (F12)
 * 2. انسخ والصق هذا الكود
 * 3. استدعِ الدوال للاختبار
 */

/**
 * اختبار إرسال إشعار للمشتري
 * @function testBuyerNotification
 * @returns {Promise<void>}
 * @see notifyBuyerOnStepChange
 */
async function testBuyerNotification() {
    console.log('🧪 [Test] اختبار إشعار المشتري...');

    if (typeof notifyBuyerOnStepChange !== 'function') {
        console.error('❌ [Test] الدالة notifyBuyerOnStepChange غير موجودة!');
        return;
    }

    await notifyBuyerOnStepChange(
        'user_key_1',           // buyerKey
        'step-confirmed',       // stepId
        'تأكيد',                // stepName
        '123'                   // orderId
    );

    console.log('✅ [Test] تم إرسال طلب إشعار المشتري');
}

/**
 * اختبار إرسال إشعار للإدارة
 * @function testAdminNotification
 * @returns {Promise<void>}
 * @see notifyAdminOnStepChange
 */
async function testAdminNotification() {
    console.log('🧪 [Test] اختبار إشعار الإدارة...');

    if (typeof notifyAdminOnStepChange !== 'function') {
        console.error('❌ [Test] الدالة notifyAdminOnStepChange غير موجودة!');
        return;
    }

    await notifyAdminOnStepChange(
        'step-confirmed',       // stepId
        'تأكيد',                // stepName
        '123',                  // orderId
        'أحمد محمد'             // userName
    );

    console.log('✅ [Test] تم إرسال طلب إشعار الإدارة');
}

/**
 * اختبار إرسال إشعار لخدمات التوصيل
 * @function testDeliveryNotification
 * @returns {Promise<void>}
 * @see notifyDeliveryOnStepChange
 */
async function testDeliveryNotification() {
    console.log('🧪 [Test] اختبار إشعار خدمات التوصيل...');

    if (typeof notifyDeliveryOnStepChange !== 'function') {
        console.error('❌ [Test] الدالة notifyDeliveryOnStepChange غير موجودة!');
        return;
    }

    await notifyDeliveryOnStepChange(
        ['delivery_key_1', 'delivery_key_2'],  // deliveryKeys
        'step-shipped',                         // stepId
        'شحن',                                  // stepName
        '123'                                   // orderId
    );

    console.log('✅ [Test] تم إرسال طلب إشعار خدمات التوصيل');
}

/**
 * اختبار الدالة الرئيسية (إرسال لجميع الأطراف)
 * @function testFullNotification
 * @returns {Promise<void>}
 * @see notifyOnStepActivation
 */
async function testFullNotification() {
    console.log('🧪 [Test] اختبار الدالة الرئيسية (جميع الإشعارات)...');

    if (typeof notifyOnStepActivation !== 'function') {
        console.error('❌ [Test] الدالة notifyOnStepActivation غير موجودة!');
        return;
    }

    await notifyOnStepActivation({
        stepId: 'step-confirmed',
        stepName: 'تأكيد',
        buyerKey: 'user_key_1',
        deliveryKeys: ['delivery_key_1', 'delivery_key_2'],
        orderId: '123',
        userName: 'أحمد محمد'
    });

    console.log('✅ [Test] تم إرسال جميع الإشعارات');
}

/**
 * اختبار شامل لجميع المراحل
 * @function testAllSteps
 * @returns {Promise<void>}
 * @see notifyOnStepActivation
 */
async function testAllSteps() {
    console.log('🧪 [Test] اختبار شامل لجميع المراحل...');

    const steps = [
        { id: 'step-review', name: 'مراجعة' },
        { id: 'step-confirmed', name: 'تأكيد' },
        { id: 'step-shipped', name: 'شحن' },
        { id: 'step-delivered', name: 'تسليم' }
    ];

    for (const step of steps) {
        console.log(`\n📌 [Test] اختبار المرحلة: ${step.name}`);

        await notifyOnStepActivation({
            stepId: step.id,
            stepName: step.name,
            buyerKey: 'user_key_1',
            deliveryKeys: ['delivery_key_1'],
            orderId: '123',
            userName: 'مختبر النظام'
        });

        // انتظار ثانية بين كل مرحلة
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ [Test] اكتمل اختبار جميع المراحل');
}

/**
 * التحقق من توفر جميع الدوال
 * @function checkFunctionsAvailability
 * @returns {boolean}
 */
function checkFunctionsAvailability() {
    console.log('🔍 [Test] التحقق من توفر الدوال...\n');

    const functions = [
        'notifyBuyerOnStepChange',
        'notifyAdminOnStepChange',
        'notifyDeliveryOnStepChange',
        'notifyOnStepActivation',
        'getUsersTokens',
        'getAdminTokens',
        'sendNotificationsToTokens'
    ];

    let allAvailable = true;

    functions.forEach(funcName => {
        const isAvailable = typeof window[funcName] === 'function';
        const status = isAvailable ? '✅' : '❌';
        console.log(`${status} ${funcName}: ${isAvailable ? 'متوفرة' : 'غير متوفرة'}`);

        if (!isAvailable) allAvailable = false;
    });

    console.log('\n' + (allAvailable ? '✅ جميع الدوال متوفرة!' : '⚠️ بعض الدوال غير متوفرة'));

    return allAvailable;
}

// ====================================
// تعليمات الاستخدام
// ====================================

console.log(`
╔════════════════════════════════════════════════════════╗
║       🧪 ملف اختبار نظام الإشعارات                   ║
╚════════════════════════════════════════════════════════╝

📋 الدوال المتاحة:

1️⃣  checkFunctionsAvailability()
   التحقق من توفر جميع الدوال المطلوبة

2️⃣  testBuyerNotification()
   اختبار إرسال إشعار للمشتري

3️⃣  testAdminNotification()
   اختبار إرسال إشعار للإدارة

4️⃣  testDeliveryNotification()
   اختبار إرسال إشعار لخدمات التوصيل

5️⃣  testFullNotification()
   اختبار إرسال جميع الإشعارات معاً

6️⃣  testAllSteps()
   اختبار شامل لجميع المراحل

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 للبدء، جرب:
   checkFunctionsAvailability()

ثم:
   testFullNotification()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// تشغيل الفحص التلقائي عند تحميل الملف
checkFunctionsAvailability();
