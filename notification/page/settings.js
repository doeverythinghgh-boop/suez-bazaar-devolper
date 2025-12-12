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
        try {
            // Adjust path if necessary. Assuming notification_config.json is at root "/" or relative to this file.
            // Since this JS is in /notification/page/, and json is in /bazaar/ (root web), we use /notification_config.json
            const response = await fetch('/notification_config.json');
            if (!response.ok) throw new Error('Failed to load configuration file');
            notifiSetting_DEFAULT_CONFIG = await response.json();
            console.log('تم تحميل الإعدادات الافتراضية من JSON:', notifiSetting_DEFAULT_CONFIG);
        } catch (error) {
            console.error('فشل تحميل ملف الإعدادات JSON:', error);
            this.notifiSetting_showToast('فشل تحميل ملف الإعدادات الافتراضية ⚠️');
            // Empty defaults or hardcoded fallback could go here if needed
            notifiSetting_DEFAULT_CONFIG = {};
        }
    },
    /**
     * @throws {Error} - If the notification configuration JSON file fails to load or parse.
     */

    /**
     * @description تحميل الإعدادات المخزنة محلياً ودمجها مع الافتراضيات
     * @returns {void}
     */
    notifiSetting_loadConfig() {
        try {
            const notifiSetting_stored = localStorage.getItem(notifiSetting_STORAGE_KEY);
            if (notifiSetting_stored) {
                try {
                    // دمج الإعدادات المخزنة مع الافتراضيات لضمان صحة الهيكل
                    const notifiSetting_parsed = JSON.parse(notifiSetting_stored);
                    this.notifiSetting_config = { ...notifiSetting_DEFAULT_CONFIG };

                    // تحديث القيم المنطقية فقط، والإبقاء على التسميات من الكود/JSON
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
    /**
     * @throws {Error} - If there's an error accessing or parsing data from LocalStorage.
     * @see notifiSetting_STORAGE_KEY
     * @see notifiSetting_DEFAULT_CONFIG
     */

    /**
     * @description حفظ الإعدادات الحالية في localStorage
     * @returns {void}
     */
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

