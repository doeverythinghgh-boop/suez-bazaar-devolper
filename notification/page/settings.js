/**
 * @file settings.js
 * @description المنطق الخاص بصفحة إعدادات الإشعارات. يتعامل مع تحميل وحفظ الإعدادات وعرض الجدول.
 * تم تحديث المتغيرات والدوال لتستخدم البادئة notifiSetting_ مع إضافة معالجة الأخطاء.
 */

// القيم الافتراضية كما تم تحديدها من قبل المستخدم
// القيم الافتراضية سيتم تحميلها من ملف JSON
var notifiSetting_DEFAULT_CONFIG = {};
/**
 * @type {object}
 * @description Stores the default notification settings loaded from a JSON file.
 */

var notifiSetting_STORAGE_KEY = 'notification_config';
/**
 * @constant
 * @type {string}
 * @description The key used to store and retrieve notification settings in LocalStorage.
 */

/**
 * @description المتحكم الرئيسي لصفحة إعدادات الإشعارات.
 * @namespace notifiSetting_Controller
 */
var notifiSetting_Controller = {
    /**
     * @description إعدادات الإشعارات الحالية
     * @type {object}
     */
    notifiSetting_config: {},

    /**
     * @description حالة الحفظ حالياً (لمنع التداخل)
     * @type {boolean}
     */
    notifiSetting_isSaving: false,

    /**
     * @description مؤقت التأخير (Debounce) للحفظ
     * @type {number|null}
     */
    notifiSetting_debounceTimeout: null,

    /**
     * @description هل نحتاج لمحاولة حفظ أخرى بعد الانتهاء؟
     * @type {boolean}
     */
    notifiSetting_needsRetry: false,

    /**
     * @description تهيئة الصفحة وتحميل الإعدادات
     * @async
     * @returns {Promise<void>}
     */
    async notifiSetting_init() {
        try {
            this.notifiSetting_renderLoading();
            await this.notifiSetting_loadDefaults();
            this.notifiSetting_loadConfig();
            this.notifiSetting_renderTable();
            this.notifiSetting_setupEventListeners();
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تهيئة إعدادات الإشعارات:', notifiSetting_error);
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notifications_init_error', 'Error initializing settings'));
        }
    },
    /**
     * @throws {Error} - If there's an error during any of the initialization steps.
     * @see notifiSetting_loadDefaults
     * @see notifiSetting_loadConfig
     * @see notifiSetting_renderTable
     * @see notifiSetting_setupEventListeners
     */

    /**
     * @description دالة مساعدة للحصول على رابط الملف من R2 مع حماية ضد غياب الدالة العالمية
     * @param {string} fileName 
     * @returns {string}
     */
    _notifiSetting_getPublicR2FileUrl(fileName) {
        if (typeof getPublicR2FileUrl === 'function') {
            return getPublicR2FileUrl(fileName);
        }
        // Fallback للرابط الافتراضي المعروف في المشروع
        const domain = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev';
        return `${domain}/${fileName}`;
    },

    /**
     * @description تحميل الإعدادات الافتراضية من ملف JSON
     * @async
     * @returns {Promise<void>}
     */
    async notifiSetting_loadDefaults() {
        const r2Url = this._notifiSetting_getPublicR2FileUrl('notification_config.json');
        const timestamp = new Date().getTime(); // Cache busting
        try {
            console.log('محاولة تحميل الإعدادات من Cloudflare...');
            const response = await fetch(`${r2Url}?t=${timestamp}`);
            if (!response.ok) throw new Error('Failed to load from R2');

            notifiSetting_DEFAULT_CONFIG = await response.json();
            // في هذا النظام، الملف على السحابة هو الحقيقة، لذا نحدث Config مباشرة
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));

            // مزامنة عالمية فورية
            window.globalNotificationConfig = JSON.parse(JSON.stringify(this.notifiSetting_config));

            console.log('تم تحميل الإعدادات من Cloudflare بنجاح:', notifiSetting_DEFAULT_CONFIG);
        } catch (error) {
            console.warn('فشل تحميل الإعدادات من السحابة، العودة للملف المحلي:', error);
            try {
                const localResponse = await fetch('/notification/notification_config.json');
                notifiSetting_DEFAULT_CONFIG = await localResponse.json();
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                console.log('تم تحميل الإعدادات الافتراضية المحلية.');
            } catch (localError) {
                console.error('فشل تحميل الإعدادات المحلية والآمنة:', localError);
                this.notifiSetting_showToast(window.langu('notif_load_fail'));
                notifiSetting_DEFAULT_CONFIG = {};
                this.notifiSetting_config = {};
            }
        }
    },
    /**
     * @throws {Error} - If the notification configuration JSON file fails to load or parse.
     */

    /**
     * @description تحميل الإعدادات المخزنة محلياً ودمجها مع الافتراضيات
     * @returns {void}
     */
    /**
     * @description تم الاستغناء عن التحميل من LocalStorage لصالح السحابة مباشرة.
     * @returns {void}
     */
    notifiSetting_loadConfig() {
        try {
            // لا نحتاج لدمج localStorage هنا لأننا حملنا البيانات الكاملة من السحابة في notifiSetting_loadDefaults
            // ولكن للتأكد، إذا كانت Config فارغة، نحاول ملئها من Default
            if (Object.keys(this.notifiSetting_config).length === 0) {
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تحميل إعدادات التكوين:', notifiSetting_error);
            // محاولة تعيين الافتراضيات كحل بديل
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG || {}));
        }
    },
    /**
     * @throws {Error} - If there's an error accessing or parsing data from LocalStorage.
     * @see notifiSetting_STORAGE_KEY
     * @see notifiSetting_DEFAULT_CONFIG
     */

    /**
     * @description حفظ الإعدادات الحالية في localStorage
     * @returns {void}
     */
    async notifiSetting_saveConfig() {
        // إذا كان هناك عملية حفظ جارية، نؤشر بضرورة الإعادة لاحقاً
        if (this.notifiSetting_isSaving) {
            console.log('[notifiSetting] حفظ جارٍ... سيتم جدولة الحفظ الجديد.');
            this.notifiSetting_needsRetry = true;
            return;
        }

        try {
            this.notifiSetting_isSaving = true;
            this.notifiSetting_toggleInputs(true); // تعطيل المدخلات
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_uploading', 'Uploading settings...'));

            if (typeof uploadFile2cf !== 'function') {
                throw new Error('uploadFile2cf is not defined');
            }

            const jsonString = JSON.stringify(this.notifiSetting_config, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            await uploadFile2cf(blob, 'notification_config.json', (msg) => console.log(msg));

            window.globalNotificationConfig = JSON.parse(JSON.stringify(this.notifiSetting_config));

            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_save_success', 'Settings saved successfully'));
            console.log('[notifiSetting] تم حفظ الإعدادات وتحديثها عالمياً:', this.notifiSetting_config);
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء حفظ الإعدادات في Cloudflare:', notifiSetting_error);
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_save_fail', 'Failed to save settings'));
        } finally {
            this.notifiSetting_isSaving = false;
            this.notifiSetting_toggleInputs(false); // إعادة التفعيل

            // إذا تم طلب حفظ أثناء الانشغال، ننفذه الآن
            if (this.notifiSetting_needsRetry) {
                this.notifiSetting_needsRetry = false;
                this.notifiSetting_saveConfig();
            }
        }
    },
    /**
     * @throws {Error} - If there's an error saving data to LocalStorage.
     * @see notifiSetting_STORAGE_KEY
     */

    /**
     * @description استعادة الإعدادات الافتراضية
     * @returns {void}
     */
    async notifiSetting_resetDefaults() {
        try {
            if (typeof Swal === 'undefined') {
                console.error('SweetAlert2 (Swal) is not loaded');
                return;
            }

            const result = await Swal.fire({
                title: window.langu('notif_reset_confirm'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: window.langu('alert_confirm_yes'),
                cancelButtonText: window.langu('alert_cancel_btn'),
                customClass: { popup: 'fullscreen-swal' }
            });

            if (result.isConfirmed) {
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                this.notifiSetting_saveConfig();
                this.notifiSetting_renderTable();
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء استعادة الافتراضيات:', notifiSetting_error);
        }
    },
    /**
     * @throws {Error} - If there's an error during the reset process or saving the new configuration.
     * @see notifiSetting_DEFAULT_CONFIG
     * @see notifiSetting_saveConfig
     * @see notifiSetting_renderTable
     */

    /**
     * @description تحديث قيمة إعداد واحد
     * @param {string} notifiSetting_eventKey
     * @param {string} notifiSetting_role
     * @param {boolean} notifiSetting_isChecked
     * @returns {void}
     */
    notifiSetting_updateSetting(notifiSetting_eventKey, notifiSetting_role, notifiSetting_isChecked) {
        try {
            if (this.notifiSetting_config[notifiSetting_eventKey]) {
                this.notifiSetting_config[notifiSetting_eventKey][notifiSetting_role] = notifiSetting_isChecked;

                // استخدام Debounce لمنع الرفع المتكرر عند النقر السريع
                if (this.notifiSetting_debounceTimeout) {
                    clearTimeout(this.notifiSetting_debounceTimeout);
                }

                this.notifiSetting_debounceTimeout = setTimeout(() => {
                    this.notifiSetting_saveConfig();
                }, 1000); // تأخير لمدة ثانية واحدة
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تحديث الإعداد:', notifiSetting_error);
        }
    },

    /**
     * @description تعطيل أو تفعيل كافة المدخلات في الجدول
     * @param {boolean} disabled 
     */
    notifiSetting_toggleInputs(disabled) {
        const inputs = document.querySelectorAll('#notifiSetting_settings-body input[type="checkbox"]');
        inputs.forEach(input => input.disabled = disabled);

        const resetBtn = document.getElementById('notifiSetting_reset-btn');
        if (resetBtn) resetBtn.disabled = disabled;
    },
    /**
     * @throws {Error} - If there's an error updating the setting or saving the configuration.
     * @see notifiSetting_saveConfig
     */

    /**
     * @description رسم جدول الإعدادات
     * @returns {void}
     */
    notifiSetting_renderTable() {
        try {
            const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
            if (!notifiSetting_tbody) return;

            notifiSetting_tbody.innerHTML = '';

            if (!this.notifiSetting_config || Object.keys(this.notifiSetting_config).length === 0) {
                notifiSetting_tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">${this._notifiSetting_safeLangu('notif_load_fail', 'No data available')}</td></tr>`;
                return;
            }

            // ترتيب المفاتيح بناءً على تعريف Config الحالية أو الافتراضية
            const notifiSetting_keys = Object.keys(this.notifiSetting_config);

            notifiSetting_keys.forEach(notifiSetting_key => {
                const notifiSetting_data = this.notifiSetting_config[notifiSetting_key];
                if (!notifiSetting_data) return;

                const notifiSetting_row = document.createElement('tr');

                // ترجمة التسمية (Label) بناءً على مفتاح الحدث
                const transKey = `notif_label_${notifiSetting_key.replace('step-', '')}`;
                const displayLabel = this._notifiSetting_safeLangu(transKey, notifiSetting_data.label || notifiSetting_key);

                notifiSetting_row.innerHTML = `
                    <td class="notifiSetting_event-name">${displayLabel}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'buyer', !!notifiSetting_data.buyer)}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'admin', !!notifiSetting_data.admin)}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'seller', !!notifiSetting_data.seller)}</td>
                    <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'delivery', !!notifiSetting_data.delivery)}</td>
                `;

                notifiSetting_tbody.appendChild(notifiSetting_row);
            });
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء عرض الجدول:', notifiSetting_error);
        }
    },

    /**
     * @description عرض حالة جاري التحميل داخل الجدول
     */
    notifiSetting_renderLoading() {
        const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
        if (notifiSetting_tbody) {
            notifiSetting_tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> ${this._notifiSetting_safeLangu('notifications_loading', 'Loading...')}</td></tr>`;
        }
    },

    /**
     * @description دالة ترجمة آمنة
     */
    _notifiSetting_safeLangu(key, defaultText) {
        if (typeof window.langu === 'function') {
            const val = window.langu(key);
            return val !== key ? val : defaultText;
        }
        return defaultText;
    },
    /**
     * @throws {Error} - If there's an error creating or appending table rows/checkboxes.
     * @see notifiSetting_DEFAULT_CONFIG
     * @see notifiSetting_createCheckbox
     */

    /**
     * @description إنشاء HTML لمربع اختيار (Checkbox)
     * @param {string} notifiSetting_eventKey
     * @param {string} notifiSetting_role
     * @param {boolean} notifiSetting_checked
     * @returns {string} HTML string
     */
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
    /**
     * @throws {Error} - If there's an error generating the HTML string for the checkbox.
     * @see notifiSetting_Controller.notifiSetting_handleCheckboxChange
     */

    /**
     * @description معالجة تغيير حالة مربع الاختيار
     * @param {HTMLInputElement} notifiSetting_input
     * @returns {void}
     */
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
    /**
     * @throws {Error} - If there's an error extracting data from the input element or updating the setting.
     * @see notifiSetting_updateSetting
     */

    /**
     * @description إعداد مستمعي الأحداث للأزرار
     * @returns {void}
     */
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
    /**
     * @throws {Error} - If there's an error attaching event listeners to DOM elements.
     * @see notifiSetting_resetDefaults
     */

    /**
     * @description إظهار رسالة تنبيه (Toast)
     * @param {string} notifiSetting_message
     * @returns {void}
     */
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
/**
 * @throws {Error} - If there's an error manipulating DOM elements to show the toast message.
 */

/**
 * @description Initializes the notification settings page controller when the DOM is ready.
 * This IIFE ensures that the `notifiSetting_Controller.notifiSetting_init()` method is called
 * as soon as the DOM is loaded, setting up the page's functionality.
 * @throws {Error} - If `notifiSetting_Controller.notifiSetting_init()` fails to execute.
 */
try {
    notifiSetting_Controller.notifiSetting_init();
} catch (notifiSetting_error) {
    console.error('فشل بدء التطبيق:', notifiSetting_error);
}

