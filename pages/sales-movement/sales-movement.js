var salesMovement_STORAGE_KEY = 'sales_movement_user_type';
var salesMovement_radioButtons = document.querySelectorAll('input[name="salesMovement_userType"]');

// Function to fetch orders based on user type
async function salesMovement_fetchOrders(salesMovement_userType) {
    try {
        // Show loading state
        salesMovement_showLoading();

        let salesMovement_url = '';
        let salesMovement_userKey = userSession.user_key;
        let salesMovement_role = '';

        // Determine parameters based on user type
        switch (salesMovement_userType) {
            case 'buyer':
                salesMovement_role = 'purchaser';
                salesMovement_url = `${baseURL}/api/user-all-orders?user_key=${salesMovement_userKey}&role=${salesMovement_role}`;
                console.log('جاري جلب طلبات المشتري...');
                break;
            case 'seller':
                salesMovement_role = 'seller';
                salesMovement_url = `${baseURL}/api/user-all-orders?user_key=${salesMovement_userKey}&role=${salesMovement_role}`;
                console.log('جاري جلب طلبات البائع...');
                break;
            case 'delivery':
                salesMovement_role = 'delivery';
                salesMovement_url = `${baseURL}/api/user-all-orders?user_key=${salesMovement_userKey}&role=${salesMovement_role}`;
                console.log('جاري جلب طلبات خدمة التوصيل...');
                break;
            case 'admin':
                salesMovement_role = 'admin';
                salesMovement_url = `${baseURL}/api/user-all-orders?user_key=${salesMovement_userKey}&role=${salesMovement_role}`;
                console.log('جاري جلب كافة الطلبات (وضع المسؤول)...');
                break;
            default:
                console.log('نوع مستخدم غير صالح');
                return;
        }

        try {
            console.log('الرابط:', salesMovement_url);
            const salesMovement_response = await fetch(salesMovement_url);

            if (!salesMovement_response.ok) {
                throw new Error(`خطأ HTTP! الحالة: ${salesMovement_response.status}`);
            }

            const salesMovement_data = await salesMovement_response.json();
            console.log('تم جلب البيانات بنجاح:', salesMovement_data);
            if (salesMovement_data && salesMovement_data.length > 0) {
                console.log('عينة عناصر الطلب الأول:', salesMovement_data[0].order_items);
            }

            // You can process and display data here
            salesMovement_displayOrders(salesMovement_data);

        } catch (salesMovement_error) {
            console.error('حدث خطأ أثناء جلب البيانات:', salesMovement_error);
        }
    } catch (salesMovement_error) {
        console.error('حدث خطأ في دالة fetchOrders:', salesMovement_error);
    }
}

// Function to display orders
function salesMovement_displayOrders(salesMovement_data) {
    try {
        const salesMovement_container = document.getElementById('salesMovement_ordersContainer');

        // Hide loading state
        salesMovement_hideLoading();

        // Check for data existence
        if (!salesMovement_data || salesMovement_data.length === 0) {
            salesMovement_container.innerHTML = `
                <div class="salesMovement_emptyState">
                    <div class="salesMovement_emptyIcon"><i class="fas fa-box-open"></i></div>
                    <div class="salesMovement_emptyText">${window.langu('sales_no_orders')}</div>
                </div>
            `;
            return;
        }

        // Sort orders by date (newest first)
        const salesMovement_sortedOrders = [...salesMovement_data].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        console.log('عرض الطلبات:', salesMovement_sortedOrders);

        // Create HTML for orders
        let salesMovement_cardsHTML = '';

        salesMovement_sortedOrders.forEach((salesMovement_order, salesMovement_index) => {
            const salesMovement_productCount = salesMovement_order.order_items ? salesMovement_order.order_items.length : 0;
            const salesMovement_formattedDate = salesMovement_formatDate(salesMovement_order.created_at);

            salesMovement_cardsHTML += `
                <div class="salesMovement_orderCard" data-order-index="${salesMovement_index}">
                    <div class="salesMovement_cardHeader">
                        <span class="salesMovement_cardIcon"><i class="fas fa-clipboard-list"></i></span>
                        <span class="salesMovement_cardTitle">${window.langu('sales_order_id').replace('{id}', salesMovement_order.order_key)}</span>
                    </div>
                    <div class="salesMovement_cardBody">
                        <div class="salesMovement_cardInfo">
                            <span><i class="fas fa-calendar-alt"></i> ${window.langu('sales_date')}</span>
                            <span>${salesMovement_formattedDate}</span>
                        </div>
                        <div class="salesMovement_cardInfo">
                            <span><i class="fas fa-boxes"></i> ${window.langu('sales_items_count')}</span>
                            <span>${salesMovement_productCount}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        salesMovement_container.innerHTML = salesMovement_cardsHTML;

        // Add event listeners to cards
        const salesMovement_cards = document.querySelectorAll('.salesMovement_orderCard');
        salesMovement_cards.forEach((salesMovement_card) => {
            salesMovement_card.addEventListener('click', async function () {
                try {
                    // 1. Reset default values
                    localStorage.setItem('productKeyFromStepReview', '');
                    if (window.globalStepperAppData) window.globalStepperAppData = null;

                    const salesMovement_orderIndex = parseInt(this.getAttribute('data-order-index'));
                    let salesMovement_orderData = salesMovement_sortedOrders[salesMovement_orderIndex];

                    if (!salesMovement_orderData) return;

                    // 2. إظهار مؤشر تحميل بسيط (اختياري: يمكن تحسينه UI)
                    const originalCursor = document.body.style.cursor;
                    document.body.style.cursor = 'wait';

                    console.log(`[SalesMovement] Fetching fresh data for order: ${salesMovement_orderData.order_key} `);

                    // 3. جلب البيانات الطازجة
                    const userKey = userSession.user_key;
                    // نحتاج معرفة الدور الحالي (buyer, seller, delivery)
                    // يمكن استنتاجه من الراديو المحدد
                    const selectedRoleRadio = document.querySelector('input[name="salesMovement_userType"]:checked');
                    const roleType = selectedRoleRadio ? selectedRoleRadio.value : 'buyer'; // default

                    // تحويل roleType إلى Role API المناسب
                    let apiRole = 'purchaser';
                    if (roleType === 'seller') apiRole = 'seller';
                    if (roleType === 'delivery') apiRole = 'delivery';
                    if (roleType === 'admin') apiRole = 'admin';

                    // بناء الرابط
                    const fetchUrl = `${baseURL}/api/user-all-orders?user_key=${userKey}&role=${apiRole}&order_key=${salesMovement_orderData.order_key}`;

                    const response = await fetch(fetchUrl);
                    if (response.ok) {
                        const freshDataArray = await response.json();
                        if (freshDataArray && freshDataArray.length > 0) {
                            console.log('[SalesMovement] Fresh data received:', freshDataArray[0]);
                            salesMovement_orderData = freshDataArray[0]; // تحديث البيانات بالنسخة الأحدث
                        } else {
                            console.warn('[SalesMovement] No fresh data found, using cached.');
                        }
                    } else {
                        console.error('[SalesMovement] Failed to fetch fresh data:', response.status);
                    }

                    document.body.style.cursor = originalCursor;

                    // 4. عرض التفاصيل بالبيانات (المحدثة أو المتاحة)
                    salesMovement_showOrderDetails(salesMovement_orderData);

                } catch (e) {
                    console.error('[SalesMovement] Error handling card click:', e);
                    document.body.style.cursor = 'default';
                    // Fallback to existing data if fetch fails critically
                    const idx = parseInt(this.getAttribute('data-order-index'));
                    if (salesMovement_sortedOrders[idx]) {
                        salesMovement_showOrderDetails(salesMovement_sortedOrders[idx]);
                    }
                }
            });
        });

    } catch (salesMovement_error) {
        console.error('حدث خطأ في دالة displayOrders:', salesMovement_error);
        const salesMovement_container = document.getElementById('salesMovement_ordersContainer');
        salesMovement_container.innerHTML = `
            <div class="salesMovement_emptyState">
                <div class="salesMovement_emptyIcon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="salesMovement_emptyText">${window.langu('sales_error')}</div>
            </div>
        `;
    }
}

// دالة لحفظ الاختيار في localStorage
function salesMovement_saveUserTypeSelection(salesMovement_userType) {
    try {
        localStorage.setItem(salesMovement_STORAGE_KEY, salesMovement_userType);
        console.log(`تم حفظ الاختيار: ${salesMovement_userType} `);
    } catch (salesMovement_error) {
        console.error('حدث خطأ في دالة saveUserTypeSelection:', salesMovement_error);
    }
}

// دالة لاستعادة الاختيار من localStorage
function salesMovement_loadUserTypeSelection() {
    try {
        const salesMovement_savedType = localStorage.getItem(salesMovement_STORAGE_KEY);
        if (salesMovement_savedType) {
            console.log(`تم استعادة الاختيار المحفوظ: ${salesMovement_savedType} `);
            // تحديد الراديو بوتن المناسب
            const salesMovement_radioToCheck = document.getElementById(`salesMovement_${salesMovement_savedType}`);
            if (salesMovement_radioToCheck) {
                salesMovement_radioToCheck.checked = true;
            }
            // جلب البيانات
            salesMovement_fetchOrders(salesMovement_savedType);
        } else {
            console.log('لا يوجد اختيار محفوظ');
        }

        // تحقق من صلاحيات المسؤول لإظهار الخيار
        salesMovement_checkAdminStatus();

    } catch (salesMovement_error) {
        console.error('حدث خطأ في دالة loadUserTypeSelection:', salesMovement_error);
    }
}

/**
 * @description يتحقق مما إذا كان المستخدم الحالي مسؤولاً ويظهر خيار المسؤول في الفلتر.
 * @function salesMovement_checkAdminStatus
 */
function salesMovement_checkAdminStatus() {
    try {
        const user = userSession;
        if (!user) return;

        const isAdmin = (typeof ADMIN_IDS !== "undefined" && ADMIN_IDS.includes(user.user_key));
        const isImpersonating = localStorage.getItem("originalAdminSession");

        if (isAdmin || isImpersonating) {
            const adminOption = document.getElementById('salesMovement_adminOption');
            if (adminOption) {
                adminOption.style.display = 'block';
                console.log('✅ تم تفعيل خيار المسؤول في لوحة حركة المبيعات');
            }
        }
    } catch (error) {
        console.error('خطأ في التحقق من حالة المسؤول:', error);
    }
}

// الاستماع لتغيير الراديو بوتن
try {
    salesMovement_radioButtons.forEach(salesMovement_radio => {
        salesMovement_radio.addEventListener('change', function () {
            try {
                if (this.checked) {
                    const salesMovement_selectedValue = this.value;
                    console.log('تم اختيار:', salesMovement_selectedValue);

                    // حفظ الاختيار
                    salesMovement_saveUserTypeSelection(salesMovement_selectedValue);

                    // جلب الطلبات بناءً على الاختيار
                    salesMovement_fetchOrders(salesMovement_selectedValue);
                }
            } catch (salesMovement_error) {
                console.error('حدث خطأ في معالج تغيير الراديو:', salesMovement_error);
            }
        });
    });
} catch (salesMovement_error) {
    console.error('حدث خطأ في إعداد مستمعي الأحداث:', salesMovement_error);
}

// زر التحديث
var salesMovement_refreshBtn = document.getElementById('salesMovement_refreshButton');
if (salesMovement_refreshBtn) {
    salesMovement_refreshBtn.addEventListener('click', function () {
        try {
            const selectedRadio = document.querySelector('input[name="salesMovement_userType"]:checked');
            if (selectedRadio) {
                console.log('🔄 تحديث البيانات يدويًا...');

                // إضافة تأثير بصري (لف الأيقونة)
                const icon = this.querySelector('.salesMovement_refreshIcon');
                if (icon) icon.style.transform = 'rotate(360deg)';

                salesMovement_fetchOrders(selectedRadio.value);

                // إعادة ضبط الأيقونة بعد وقت قصير
                setTimeout(() => {
                    if (icon) icon.style.transform = '';
                }, 500);
            } else {
                // Default fallback if nothing selected
                salesMovement_fetchOrders('buyer');
            }
        } catch (error) {
            console.error('خطأ في زر التحديث:', error);
        }
    });
}

// تحميل الاختيار المحفوظ عند تحميل الصفحة
salesMovement_loadUserTypeSelection();

// دالة لتنسيق التاريخ بالعربية
function salesMovement_formatDate(salesMovement_dateString) {
    try {
        // Ensure the date string is treated as UTC if it comes from SQLite (standard 'YYYY-MM-DD HH:MM:SS')
        let dateStr = salesMovement_dateString;
        if (dateStr && !dateStr.includes('Z') && !dateStr.includes('+')) {
            // Replace space with T and add Z to force UTC parsing
            dateStr = dateStr.replace(' ', 'T') + 'Z';
        }

        const salesMovement_date = new Date(dateStr);

        // Check validity
        if (isNaN(salesMovement_date.getTime())) {
            // Fallback to original string parsing if modification failed
            return new Date(salesMovement_dateString).toLocaleString('ar-EG');
        }

        return salesMovement_date.toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo', // Explicitly target Egypt time
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    } catch (salesMovement_error) {
        console.error('خطأ في تنسيق التاريخ:', salesMovement_error);
        return salesMovement_dateString;
    }
}

// دالة لعرض صفحة stepper في النافذة المنبثقة
function salesMovement_showOrderDetails(salesMovement_orderData) {
    try {
        const salesMovement_modal = document.getElementById('salesMovement_orderModal');
        const salesMovement_modalBody = document.getElementById('salesMovement_modalBody');

        // تحويل بيانات الطلب إلى البنية المطلوبة في config.js
        const salesMovement_convertedOrder = {
            order_key: salesMovement_orderData.order_key,
            user_key: salesMovement_orderData.user_key,
            user_name: salesMovement_orderData.user_name || '',
            user_phone: salesMovement_orderData.user_phone || '',
            user_address: salesMovement_orderData.user_address || '',
            user_location: salesMovement_orderData.user_location || '',
            order_status: salesMovement_orderData.order_status || '',
            created_at: salesMovement_orderData.created_at,
            total_amount: salesMovement_orderData.total_amount,
            orderType: (salesMovement_orderData.orderType !== undefined && salesMovement_orderData.orderType !== null) ? salesMovement_orderData.orderType : salesMovement_orderData.ordertype, // ✅ دعم حالة الأحرف المختلفة
            order_items: []
        };

        // تحويل order_items مع معالجة supplier_delivery
        if (salesMovement_orderData.order_items && salesMovement_orderData.order_items.length > 0) {
            salesMovement_orderData.order_items.forEach((salesMovement_item) => {
                const salesMovement_convertedItem = {
                    product_key: salesMovement_item.product_key,
                    product_name: salesMovement_item.product_name,
                    quantity: salesMovement_item.quantity,
                    seller_key: salesMovement_item.seller_key,
                    note: salesMovement_item.note || '',
                    product_price: salesMovement_item.product_price,
                    realPrice: salesMovement_item.realPrice,
                    item_status: salesMovement_item.item_status || null, // Pass Item Status
                    serviceType: salesMovement_item.serviceType, // ✅ جلب نوع الخدمة لكل عنصر
                    supplier_delivery: null
                };

                // معالجة supplier_delivery
                if (salesMovement_item.supplier_delivery) {
                    if (Array.isArray(salesMovement_item.supplier_delivery)) {
                        if (salesMovement_item.supplier_delivery.length === 1) {
                            // عنصر واحد: تحويل إلى Object
                            salesMovement_convertedItem.supplier_delivery = salesMovement_item.supplier_delivery[0];
                        } else if (salesMovement_item.supplier_delivery.length > 1) {
                            // أكثر من عنصر: إبقاء كـ Array
                            salesMovement_convertedItem.supplier_delivery = salesMovement_item.supplier_delivery;
                        } else {
                            // Array فارغ
                            salesMovement_convertedItem.supplier_delivery = {};
                        }
                    } else {
                        // إذا كان Object بالفعل
                        salesMovement_convertedItem.supplier_delivery = salesMovement_item.supplier_delivery;
                    }
                } else {
                    salesMovement_convertedItem.supplier_delivery = {};
                }

                salesMovement_convertedOrder.order_items.push(salesMovement_convertedItem);
            });
        }

        // تعيين المتغيرات العامة لتمريرها إلى config.js
        window.globalStepperAppData = {
            idUser: userSession.user_key,
            ordersData: [salesMovement_convertedOrder],
            baseURL: baseURL  // إضافة baseURL
        };

        console.log('تم تعيين globalStepperAppData من صفحة  pages_sales-movement.html   :', window.globalStepperAppData);
        console.log('Sample item from globalStepperAppData:', window.globalStepperAppData.ordersData[0].order_items[0]);

        // إنشاء iframe لعرض صفحة stepper
        // إنشاء iframe لعرض صفحة stepper
        salesMovement_modalBody.innerHTML = `
            <iframe 
                src="./steper/stepper-only.html" 
                class="salesMovement_stepperIframe"
                id="salesMovement_stepperIframe"
            ></iframe>
        `;

        // عرض النافذة المنبثقة
        salesMovement_modal.classList.add('salesMovement_show');

    } catch (salesMovement_error) {
        console.error('خطأ في عرض صفحة stepper:', salesMovement_error);
    }
}

// دالة لإظهار حالة التحميل
function salesMovement_showLoading() {
    try {
        const salesMovement_container = document.getElementById('salesMovement_ordersContainer');
        salesMovement_container.innerHTML = `
            <div class="salesMovement_loading">
                <i class="fas fa-hourglass-half"></i> ${window.langu('sales_loading')}
            </div>
        `;
    } catch (salesMovement_error) {
        console.error('خطأ في عرض حالة التحميل:', salesMovement_error);
    }
}

// دالة لإخفاء حالة التحميل
function salesMovement_hideLoading() {
    try {
        const salesMovement_container = document.getElementById('salesMovement_ordersContainer');
        const salesMovement_loadingElement = salesMovement_container.querySelector('.salesMovement_loading');
        if (salesMovement_loadingElement) {
            salesMovement_loadingElement.remove();
        }
    } catch (salesMovement_error) {
        console.error('خطأ في إخفاء حالة التحميل:', salesMovement_error);
    }
}

// إغلاق النافذة المنبثقة
var salesMovement_closeModalBtn = document.getElementById('salesMovement_closeModal');
var salesMovement_modal = document.getElementById('salesMovement_orderModal');

if (salesMovement_closeModalBtn) {
    salesMovement_closeModalBtn.addEventListener('click', function () {
        salesMovement_modal.classList.remove('salesMovement_show');
    });
}

// إغلاق النافذة عند النقر خارجها
if (salesMovement_modal) {
    salesMovement_modal.addEventListener('click', function (salesMovement_event) {
        if (salesMovement_event.target === salesMovement_modal) {
            salesMovement_modal.classList.remove('salesMovement_show');
        }
    });
}

// ========================================
// مراقبة تغييرات localStorage للمفتاح productKeyFromStepReview
// ========================================

// متغير لمنع التنفيذ المتكرر
var salesMovement_isProcessingProductKey = false;

// دالة للتحقق من التغييرات
async function salesMovement_checkProductKeyChanges() {
    try {
        // منع التنفيذ المتكرر
        if (salesMovement_isProcessingProductKey) {
            return;
        }

        const salesMovement_currentProductKey = localStorage.getItem('productKeyFromStepReview');

        // التحقق من وجود قيمة صالحة
        if (salesMovement_currentProductKey !== null &&
            salesMovement_currentProductKey !== "" &&
            salesMovement_currentProductKey !== undefined) {

            console.log('🔔 تم اكتشاف قيمة productKeyFromStepReview:', salesMovement_currentProductKey);

            // تفعيل علامة المعالجة
            salesMovement_isProcessingProductKey = true;

            // مسح القيمة فوراً لمنع التكرار
            localStorage.setItem('productKeyFromStepReview', "");

            try {
                // جلب بيانات المنتج
                const salesMovement_response = await fetch(`${baseURL}/api/products?product_key=${salesMovement_currentProductKey}`);

                if (!salesMovement_response.ok) {
                    throw new Error(`HTTP error! status: ${salesMovement_response.status}`);
                }

                const product = await salesMovement_response.json();
                console.log('✅ تم جلب بيانات المنتج:', product);

                // تحضير بيانات المنتج
                const productDataForModal = mapProductData(product);

                // تحديث الجلسة وعرض المنتج باستخدام النظام الحديث
                loadProductView(productDataForModal, { showAddToCart: false });
                console.log('✅ تم استدعاء loadProductView بنجاح');

            } catch (fetchError) {
                console.error('❌ خطأ في جلب بيانات المنتج:', fetchError);
            } finally {
                // إعادة تعيين علامة المعالجة بعد ثانية واحدة
                setTimeout(() => {
                    salesMovement_isProcessingProductKey = false;
                }, 1000);
            }
        }
    } catch (salesMovement_error) {
        console.error('❌ خطأ في مراقبة productKeyFromStepReview:', salesMovement_error);
        salesMovement_isProcessingProductKey = false;
    }
}

// بدء المراقبة كل 100 ملي ثانية
var salesMovement_productKeyWatcher = setInterval(salesMovement_checkProductKeyChanges, 100);

// تنظيف المراقبة عند إغلاق الصفحة (اختياري)
window.addEventListener('beforeunload', function () {
    clearInterval(salesMovement_productKeyWatcher);
});

console.log('✅ تم تفعيل مراقبة productKeyFromStepReview في localStorage');
