/**
 * @file notification/page/settings.js
 * @description Logic for the notification settings page. Handles loading, saving, and rendering the notification configuration table.
 * All global variables use the 'notifiSetting_' prefix for scoping.
 */

/**
 * @type {object}
 * @description Stores the default notification configuration loaded from the server or local fallback.
 */
var notifiSetting_DEFAULT_CONFIG = {};

/**
 * @constant
 * @type {string}
 * @description The key used for identifying notification settings in synchronization and logging.
 */
var notifiSetting_STORAGE_KEY = 'notification_config';

/**
 * @namespace notifiSetting_Controller
 * @description Main controller for the notification settings interface.
 */
var notifiSetting_Controller = {
    /**
     * @type {object}
     * @description Current active notification configuration.
     */
    notifiSetting_config: {},

    /**
     * @type {boolean}
     * @description State flag indicating if a save operation is currently in progress.
     */
    notifiSetting_isSaving: false,

    /**
     * @type {number|null}
     * @description Internal timer for debouncing save operations to prevent excessive API calls.
     */
    notifiSetting_debounceTimeout: null,

    /**
     * @type {boolean}
     * @description Flag indicating if a subsequent save is needed after the current one finishes.
     */
    notifiSetting_needsRetry: false,

    /**
     * @description Initializes the page by rendering loading state, fetching defaults, and binding listeners.
     * @async
     * @function notifiSetting_init
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
            console.error('[notifiSetting] Error during initialization:', notifiSetting_error);
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notifications_init_error', 'Error initializing settings'));
        }
    },

    /**
     * @description Internal helper to retrieve public R2 URL for configuration files.
     * @private
     * @function _notifiSetting_getPublicR2FileUrl
     * @param {string} fileName - Name of the file in the R2 bucket.
     * @returns {string} Fully qualified URL.
     */
    _notifiSetting_getPublicR2FileUrl(fileName) {
        if (typeof getPublicR2FileUrl === 'function') {
            return getPublicR2FileUrl(fileName);
        }
        // Fallback to known production domain if global helper is missing
        const domain = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev';
        return `${domain}/${fileName}`;
    },

    /**
     * @description Fetches the default configuration from Cloudflare R2 or local fallback.
     * @async
     * @function notifiSetting_loadDefaults
     * @returns {Promise<void>}
     */
    async notifiSetting_loadDefaults() {
        const r2Url = this._notifiSetting_getPublicR2FileUrl('notification_config.json');
        const timestamp = new Date().getTime(); // Cache busting
        try {
            console.log('[notifiSetting] Attempting to load config from Cloudflare...');
            const response = await fetch(`${r2Url}?t=${timestamp}`);
            if (!response.ok) throw new Error('Cloudflare fetch failed');

            notifiSetting_DEFAULT_CONFIG = await response.json();
            // In this architecture, cloud data is the source of truth
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));

            // Sync globally immediately
            window.globalNotificationConfig = JSON.parse(JSON.stringify(this.notifiSetting_config));

            console.log('[notifiSetting] Config loaded from Cloudflare successfully.');
        } catch (error) {
            console.warn('[notifiSetting] Cloudflare fetch failed, falling back to local file:', error);
            try {
                // Adjusting path relative to app root when loaded via SPA loader
                const localResponse = await fetch('notification/notification_config.json');
                notifiSetting_DEFAULT_CONFIG = await localResponse.json();
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                console.log('[notifiSetting] Local default config loaded.');
            } catch (localError) {
                console.error('[notifiSetting] Fatal error loading local defaults:', localError);
                this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_load_fail', 'Failed to load configuration'));
                notifiSetting_DEFAULT_CONFIG = {};
                this.notifiSetting_config = {};
            }
        }
    },

    /**
     * @description Loads existing configuration. Favors existing config object from loadDefaults.
     * @function notifiSetting_loadConfig
     * @returns {void}
     */
    notifiSetting_loadConfig() {
        try {
            if (Object.keys(this.notifiSetting_config).length === 0) {
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
            }
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Error loading config:', notifiSetting_error);
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG || {}));
        }
    },

    /**
     * @description Saves current configuration to Cloudflare R2 using the central upload bridge.
     * @async
     * @function notifiSetting_saveConfig
     * @returns {Promise<void>}
     */
    async notifiSetting_saveConfig() {
        if (this.notifiSetting_isSaving) {
            console.log('[notifiSetting] Save in progress... scheduling next sync.');
            this.notifiSetting_needsRetry = true;
            return;
        }

        try {
            this.notifiSetting_isSaving = true;
            this.notifiSetting_toggleInputs(true); // Prevent concurrent edits
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_uploading', 'Uploading settings...'));

            if (typeof uploadFile2cf !== 'function') {
                throw new Error('uploadFile2cf bridge is not defined');
            }

            const jsonString = JSON.stringify(this.notifiSetting_config, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            await uploadFile2cf(blob, 'notification_config.json', (msg) => console.log(msg));

            window.globalNotificationConfig = JSON.parse(JSON.stringify(this.notifiSetting_config));

            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_save_success', 'Settings saved successfully'));
            console.log('[notifiSetting] Database synced successfully:', this.notifiSetting_config);
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Sync failure:', notifiSetting_error);
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_save_fail', 'Failed to save settings'));
        } finally {
            this.notifiSetting_isSaving = false;
            this.notifiSetting_toggleInputs(false);

            if (this.notifiSetting_needsRetry) {
                this.notifiSetting_needsRetry = false;
                this.notifiSetting_saveConfig();
            }
        }
    },

    /**
     * @description Resets notifications to system defaults after user confirmation.
     * @async
     * @function notifiSetting_resetDefaults
     * @returns {Promise<void>}
     */
    async notifiSetting_resetDefaults() {
        try {
            if (typeof Swal === 'undefined') {
                console.error('[notifiSetting] SweetAlert2 is missing');
                return;
            }

            const result = await Swal.fire({
                title: this._notifiSetting_safeLangu('notif_reset_confirm', 'Reset to defaults?'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: window.langu('alert_confirm_yes'),
                cancelButtonText: window.langu('alert_cancel_btn'),
                customClass: { popup: 'fullscreen-swal' }
            });

            if (result.isConfirmed) {
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
                await this.notifiSetting_saveConfig();
                this.notifiSetting_renderTable();
            }
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Reset failure:', notifiSetting_error);
        }
    },

    /**
     * @description Updates a specific entry in the configuration object.
     * @function notifiSetting_updateSetting
     * @param {string} notifiSetting_eventKey - Unique ID for the system event.
     * @param {string} notifiSetting_role - Role identifier (buyer, admin, etc).
     * @param {boolean} notifiSetting_isChecked - New state of the notification trigger.
     * @returns {void}
     */
    notifiSetting_updateSetting(notifiSetting_eventKey, notifiSetting_role, notifiSetting_isChecked) {
        try {
            if (this.notifiSetting_config[notifiSetting_eventKey]) {
                this.notifiSetting_config[notifiSetting_eventKey][notifiSetting_role] = notifiSetting_isChecked;

                // Debounce sync to prevent saturation during bulk clicks
                if (this.notifiSetting_debounceTimeout) {
                    clearTimeout(this.notifiSetting_debounceTimeout);
                }

                this.notifiSetting_debounceTimeout = setTimeout(() => {
                    this.notifiSetting_saveConfig();
                }, 1000);
            }
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Update failure:', notifiSetting_error);
        }
    },

    /**
     * @description Disables or enables all UI controls during sensitive operations.
     * @function notifiSetting_toggleInputs
     * @param {boolean} disabled - State flag.
     * @returns {void}
     */
    notifiSetting_toggleInputs(disabled) {
        const inputs = document.querySelectorAll('.table-responsive input[type="checkbox"]');
        inputs.forEach(input => input.disabled = disabled);

        const resetBtn = document.getElementById('notifiSetting_reset-btn');
        if (resetBtn) resetBtn.disabled = disabled;
    },

    /**
     * @description Dynamically builds the settings table rows based on current config.
     * @function notifiSetting_renderTable
     * @returns {void}
     */
    notifiSetting_renderTable() {
        try {
            // Ensure mandatory store moderation events exist
            const mandatoryEvents = {
                'new-item-added': { label: 'Add Product', admin: true, seller: true, category: 'store' },
                'item-accepted': { label: 'Accept Product', admin: true, seller: true, category: 'store' },
                'item-updated': { label: 'Update Product', admin: true, seller: true, category: 'store' }
            };

            Object.keys(mandatoryEvents).forEach(eventKey => {
                if (this.notifiSetting_config && !this.notifiSetting_config[eventKey]) {
                    this.notifiSetting_config[eventKey] = mandatoryEvents[eventKey];
                }
            });

            const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
            const notifiSetting_storeTbody = document.getElementById('notifiSetting_store-settings-body');
            if (!notifiSetting_tbody || !notifiSetting_storeTbody) return;

            notifiSetting_tbody.innerHTML = '';
            notifiSetting_storeTbody.innerHTML = '';

            if (!this.notifiSetting_config || Object.keys(this.notifiSetting_config).length === 0) {
                const emptyMsg = `<tr><td colspan="5" style="text-align:center; padding:20px;">${this._notifiSetting_safeLangu('notif_load_fail', 'No data available')}</td></tr>`;
                notifiSetting_tbody.innerHTML = emptyMsg;
                notifiSetting_storeTbody.innerHTML = emptyMsg;
                return;
            }

            const notifiSetting_keys = Object.keys(this.notifiSetting_config);

            notifiSetting_keys.forEach(notifiSetting_key => {
                const notifiSetting_data = this.notifiSetting_config[notifiSetting_key];
                if (!notifiSetting_data) return;

                const isStoreEvent = notifiSetting_data.category === 'store';
                const notifiSetting_row = document.createElement('tr');

                if (!isStoreEvent) {
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
                } else {
                    const transKey = `notif_label_${notifiSetting_key.replace(/-/g, '_')}`;
                    const displayLabel = this._notifiSetting_safeLangu(transKey, notifiSetting_data.label || notifiSetting_key);

                    notifiSetting_row.innerHTML = `
                        <td class="notifiSetting_event-name">${displayLabel}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'admin', !!notifiSetting_data.admin)}</td>
                        <td>${this.notifiSetting_createCheckbox(notifiSetting_key, 'seller', !!notifiSetting_data.seller)}</td>
                    `;
                    notifiSetting_storeTbody.appendChild(notifiSetting_row);
                }
            });
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Render failure:', notifiSetting_error);
        }
    },

    /**
     * @description Injects a loading placeholder into the tables.
     * @function notifiSetting_renderLoading
     * @returns {void}
     */
    notifiSetting_renderLoading() {
        const notifiSetting_tbody = document.getElementById('notifiSetting_settings-body');
        const notifiSetting_storeTbody = document.getElementById('notifiSetting_store-settings-body');
        const loadingHtml = `<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> ${this._notifiSetting_safeLangu('notifications_loading', 'Loading...')}</td></tr>`;

        if (notifiSetting_tbody) notifiSetting_tbody.innerHTML = loadingHtml;
        if (notifiSetting_storeTbody) notifiSetting_storeTbody.innerHTML = loadingHtml;
    },

    /**
     * @description Safe translation wrapper to prevent script breaks if langu() is missing.
     * @private
     * @function _notifiSetting_safeLangu
     * @param {string} key - Dictionary key.
     * @param {string} defaultText - Fallback if key missing or system down.
     * @returns {string}
     */
    _notifiSetting_safeLangu(key, defaultText) {
        if (typeof window.langu === 'function') {
            const val = window.langu(key);
            return val !== key ? val : defaultText;
        }
        return defaultText;
    },

    /**
     * @description Generates HTML for a checkbox input within the table.
     * @function notifiSetting_createCheckbox
     * @param {string} notifiSetting_eventKey
     * @param {string} notifiSetting_role
     * @param {boolean} notifiSetting_checked
     * @returns {string} HTML snippet.
     */
    notifiSetting_createCheckbox(notifiSetting_eventKey, notifiSetting_role, notifiSetting_checked) {
        try {
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
            console.error('[notifiSetting] Checkbox generator error:', notifiSetting_error);
            return '';
        }
    },

    /**
     * @description Native bridge for checkbox change events.
     * @function notifiSetting_handleCheckboxChange
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
            console.error('[notifiSetting] Click handler failure:', notifiSetting_error);
        }
    },

    /**
     * @description Binds event listeners to static UI elements like buttons.
     * @function notifiSetting_setupEventListeners
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
            console.error('[notifiSetting] Event binding error:', notifiSetting_error);
        }
    },

    /**
     * @description Triggers a temporary toast notification for user feedback.
     * @function notifiSetting_showToast
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
            console.error('[notifiSetting] Toast failure:', notifiSetting_error);
        }
    }
};

/**
 * Global entry point initialization.
 */
try {
    notifiSetting_Controller.notifiSetting_init();
} catch (notifiSetting_error) {
    console.error('[notifiSetting] Fatal bootstrap error:', notifiSetting_error);
}
