/**
 * @file settings.js
 * @description المنطق الخاص بصفحة إعدادات الإشعارات. يتعامل مع تحميل وحفظ الإعدادات وعرض الجدول.
 * تم تحديث المتغيرات والدوال لتستخدم البادئة notifiSetting_ مع إضافة معالجة الأخطاء.
 */

// القيم الافتراضية كما تم تحديدها من قبل المستخدم
var notifiSetting_DEFAULT_CONFIG = {
    // Event Key: { buyer, admin, seller, delivery }
    'purchase': { label: 'شراء (Purchase)', buyer: false, admin: true, seller: true, delivery: false },
    'step-review': { label: 'مراجعة (Review)', buyer: true, admin: true, seller: false, delivery: false },
    'step-cancelled': { label: 'ملغي (Cancelled)', buyer: false, admin: true, seller: true, delivery: false },
    'step-confirmed': { label: 'تأكيد (Confirmed)', buyer: true, admin: true, seller: false, delivery: true },
    'step-rejected': { label: 'مرفوض (Rejected)', buyer: true, admin: true, seller: false, delivery: false },
    'step-shipped': { label: 'شحن (Shipped)', buyer: true, admin: true, seller: false, delivery: true },
    'step-delivered': { label: 'تسليم (Delivered)', buyer: true, admin: true, seller: false, delivery: true },
    'step-returned': { label: 'مرتجع (Returned)', buyer: false, admin: false, seller: false, delivery: false }
};

var notifiSetting_STORAGE_KEY = 'notification_config';

var notifiSetting_Controller = {
    notifiSetting_config: {},

    notifiSetting_init() {
        try {
            this.notifiSetting_loadConfig();
            this.notifiSetting_renderTable();
            this.notifiSetting_setupEventListeners();
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تهيئة إعدادات الإشعارات:', notifiSetting_error);
            this.notifiSetting_showToast('فشل تحميل الصفحة بشكل صحيح ❌');
        }
    },

    notifiSetting_loadConfig() {
        try {
            const notifiSetting_stored = localStorage.getItem(notifiSetting_STORAGE_KEY);
            if (notifiSetting_stored) {
                try {
                    // دمج الإعدادات المخزنة مع الافتراضيات لضمان صحة الهيكل
                    const notifiSetting_parsed = JSON.parse(notifiSetting_stored);
                    this.notifiSetting_config = { ...notifiSetting_DEFAULT_CONFIG };

                    // تحديث القيم المنطقية فقط، والإبقاء على التسميات من الكود
                    for (const notifiSetting_key in notifiSetting_parsed) {
                        if (this.notifiSetting_config[notifiSetting_key]) {
                            this.notifiSetting_config[notifiSetting_key] = {
                                ...this.notifiSetting_config[notifiSetting_key],
                                buyer: notifiSetting_parsed[notifiSetting_key].buyer,
                                admin: notifiSetting_parsed[notifiSetting_key].admin,
                                seller: notifiSetting_parsed[notifiSetting_key].seller,
                                delivery: notifiSetting_parsed[notifiSetting_key].delivery
                            };
                        }
                    }
                } catch (notifiSetting_parseError) {
                    console.error('خطأ في تحليل الإعدادات، التراجع إلى الافتراضي', notifiSetting_parseError);
                    this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                }
            } else {
                // نسخة عميقة من الافتراضيات
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تحميل الإعدادات:', notifiSetting_error);
        }
    },

    notifiSetting_saveConfig() {
        try {
            localStorage.setItem(notifiSetting_STORAGE_KEY, JSON.stringify(this.notifiSetting_config));
            this.notifiSetting_showToast('تم حفظ الإعدادات بنجاح ✅');
            console.log('[notifiSetting] Config saved:', this.notifiSetting_config);
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء حفظ الإعدادات:', notifiSetting_error);
            this.notifiSetting_showToast('فشل حفظ الإعدادات ❌');
        }
    },

    notifiSetting_resetDefaults() {
        try {
            if (confirm('هل أنت متأكد من استعادة الافتراضيات؟')) {
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                this.notifiSetting_saveConfig();
                this.notifiSetting_renderTable();
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء استعادة الافتراضيات:', notifiSetting_error);
        }
    },

    notifiSetting_updateSetting(notifiSetting_eventKey, notifiSetting_role, notifiSetting_isChecked) {
        try {
            if (this.notifiSetting_config[notifiSetting_eventKey]) {
                this.notifiSetting_config[notifiSetting_eventKey][notifiSetting_role] = notifiSetting_isChecked;
                this.notifiSetting_saveConfig();
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تحديث الإعداد:', notifiSetting_error);
        }
    },

    notifiSetting_renderTable() {
        try {
            const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
            if (!notifiSetting_tbody) return;

            notifiSetting_tbody.innerHTML = '';

            // ترتيب المفاتيح بناءً على تعريف notifiSetting_DEFAULT_CONFIG
            const notifiSetting_keys = Object.keys(notifiSetting_DEFAULT_CONFIG);

            notifiSetting_keys.forEach(notifiSetting_key => {
                const notifiSetting_data = this.notifiSetting_config[notifiSetting_key];
                const notifiSetting_row = document.createElement('tr');

                notifiSetting_row.innerHTML = `
                    <td class="notifiSetting_event-name">${notifiSetting_data.label}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'buyer', notifiSetting_data.buyer)}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'admin', notifiSetting_data.admin)}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'seller', notifiSetting_data.seller)}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'delivery', notifiSetting_data.delivery)}</td>
                `;

                notifiSetting_tbody.appendChild(notifiSetting_row);
            });
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء عرض الجدول:', notifiSetting_error);
        }
    },

    notifiSetting_createCheckbox(notifiSetting_eventKey, notifiSetting_role, notifiSetting_checked) {
        try {
            // إنشاء سلسلة HTML لمربع الاختيار
            return `
                <div class="notifiSetting_checkbox-wrapper">
                    <input type="checkbox" 
                        data-event="${notifiSetting_eventKey}" 
                        data-role="${notifiSetting_role}" 
                        ${notifiSetting_checked ? 'checked' : ''} 
                        onchange="notifiSetting_Controller.notifiSetting_handleCheckboxChange(this)"
                    >
                </div>
            `;
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء إنشاء Checkbox:', notifiSetting_error);
            return '';
        }
    },

    notifiSetting_handleCheckboxChange(notifiSetting_input) {
        try {
            const notifiSetting_eventKey = notifiSetting_input.dataset.event;
            const notifiSetting_role = notifiSetting_input.dataset.role;
            const notifiSetting_isChecked = notifiSetting_input.checked;

            this.notifiSetting_updateSetting(notifiSetting_eventKey, notifiSetting_role, notifiSetting_isChecked);
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تغيير الحالة:', notifiSetting_error);
        }
    },

    notifiSetting_setupEventListeners() {
        try {
            const notifiSetting_resetBtn = document.getElementById('notifiSetting_reset-btn');
            if (notifiSetting_resetBtn) {
                notifiSetting_resetBtn.addEventListener('click', () => {
                    this.notifiSetting_resetDefaults();
                });
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء إعداد مستمعي الأحداث:', notifiSetting_error);
        }
    },

    notifiSetting_showToast(notifiSetting_message) {
        try {
            const notifiSetting_toast = document.getElementById('notifiSetting_toast');
            if (notifiSetting_toast) {
                notifiSetting_toast.textContent = notifiSetting_message;
                notifiSetting_toast.classList.add('notifiSetting_show');
                setTimeout(() => {
                    notifiSetting_toast.classList.remove('notifiSetting_show');
                }, 3000);
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء عرض التنبيه:', notifiSetting_error);
        }
    }
};

// التهيئة عند جاهزية الـ DOM

    try {
        notifiSetting_Controller.notifiSetting_init();
    } catch (notifiSetting_error) {
        console.error('فشل بدء التطبيق:', notifiSetting_error);
    }

