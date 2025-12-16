/**
 * @file settings.js
 * @description المنطق الخاص بصفحة إعدادات الإشعارات. يتعامل مع تحميل وحفظ الإعدادات وعرض الجدول.
 * تم تحديث المتغيرات والدوال لتستخدم البادئة notifiSetting_ مع إضافة معالجة الأخطاء.
 */

// القيم الافتراضية كما تم تحديدها من قبل المستخدم
// القيم الافتراضية سيتم تحميلها من ملف JSON
let notifiSetting_DEFAULT_CONFIG = {};
/**
 * @type {object}
 * @description Stores the default notification settings loaded from a JSON file.
 */

const notifiSetting_STORAGE_KEY = 'notification_config';
/**
 * @constant
 * @type {string}
 * @description The key used to store and retrieve notification settings in LocalStorage.
 */

/**
 * @description المتحكم الرئيسي لصفحة إعدادات الإشعارات.
 * @namespace notifiSetting_Controller
 */
const notifiSetting_Controller = {
    /**
     * @description إعدادات الإشعارات الحالية
     * @type {object}
     */
    notifiSetting_config: {},

    /**
     * @description تهيئة الصفحة وتحميل الإعدادات
     * @async
     * @returns {Promise<void>}
     */
    async notifiSetting_init() {
        try {
            await this.notifiSetting_loadDefaults();
            this.notifiSetting_loadConfig();
            this.notifiSetting_renderTable();
            this.notifiSetting_setupEventListeners();
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تهيئة إعدادات الإشعارات:', notifiSetting_error);
            this.notifiSetting_showToast('فشل تحميل الصفحة بشكل صحيح ❌');
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
     * @description تحميل الإعدادات الافتراضية من ملف JSON
     * @async
     * @returns {Promise<void>}
     */
    async notifiSetting_loadDefaults() {
        const r2Url = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/notification_config.json';
        const timestamp = new Date().getTime(); // Cache busting
        try {
            console.log('محاولة تحميل الإعدادات من Cloudflare...');
            const response = await fetch(`${r2Url}?t=${timestamp}`);
            if (!response.ok) throw new Error('Failed to load from R2');

            notifiSetting_DEFAULT_CONFIG = await response.json();
            // في هذا النظام، الملف على السحابة هو الحقيقة، لذا نحدث Config مباشرة
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
            console.log('تم تحميل الإعدادات من Cloudflare بنجاح:', notifiSetting_DEFAULT_CONFIG);
        } catch (error) {
            console.warn('فشل تحميل الإعدادات من السحابة، العودة للملف المحلي:', error);
            try {
                const localResponse = await fetch('/notification_config.json');
                notifiSetting_DEFAULT_CONFIG = await localResponse.json();
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                console.log('تم تحميل الإعدادات الافتراضية المحلية.');
            } catch (localError) {
                console.error('فشل تحميل الإعدادات المحلية والآمنة:', localError);
                this.notifiSetting_showToast('فشل تحميل الإعدادات ⚠️');
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
        // لا نحتاج لدمج localStorage هنا لأننا حملنا البيانات الكاملة من السحابة في notifiSetting_loadDefaults
        // ولكن للتأكد، إذا كانت Config فارغة، نحاول ملئها من Default
        if (Object.keys(this.notifiSetting_config).length === 0) {
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
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
        try {
            this.notifiSetting_showToast('جاري رفع الإعدادات للسحابة... ☁️');

            const jsonString = JSON.stringify(this.notifiSetting_config, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // استخدام مكتبة cloudFileManager للرفع
            await uploadFile2cf(blob, 'notification_config.json', (msg) => console.log(msg));

            this.notifiSetting_showToast('تم حفظ الإعدادات وتحديث السحابة بنجاح ✅');
            console.log('[notifiSetting] تم حفظ الإعدادات في Cloudflare:', this.notifiSetting_config);
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء حفظ الإعدادات في Cloudflare:', notifiSetting_error);
            this.notifiSetting_showToast('فشل حفظ الإعدادات في السحابة ❌');
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
                this.notifiSetting_saveConfig();
            }
        } catch (notifiSetting_error) {
            console.error('حدث خطأ أثناء تحديث الإعداد:', notifiSetting_error);
        }
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

