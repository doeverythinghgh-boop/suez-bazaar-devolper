/**
 * @file settings-controller.js
 * @description Main controller for the notification settings interface.
 */

var notifiSetting_Controller = {
    notifiSetting_config: {},
    notifiSetting_isSaving: false,
    notifiSetting_debounceTimeout: null,
    notifiSetting_needsRetry: false,

    /**
     * @description Initializes the page.
     */
    async notifiSetting_init() {
        try {
            this.notifiSetting_renderLoading();
            await this.notifiSetting_loadDefaults();
            this.notifiSetting_loadConfig();
            this.notifiSetting_renderTable();
            this.notifiSetting_setupEventListeners();
        } catch (notifiSetting_error) {
            console.error('[notifiSetting] Init Error:', notifiSetting_error);
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notifications_init_error', 'Error initializing settings'));
        }
    },

    /**
     * @description Resets to system defaults.
     */
    async notifiSetting_resetDefaults() {
        try {
            if (typeof Swal === 'undefined') return;

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
     * @description Updates a setting with debounce.
     */
    notifiSetting_updateSetting(notifiSetting_eventKey, notifiSetting_role, notifiSetting_isChecked) {
        try {
            if (this.notifiSetting_config[notifiSetting_eventKey]) {
                this.notifiSetting_config[notifiSetting_eventKey][notifiSetting_role] = notifiSetting_isChecked;

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
     * @description Toggles inputs.
     */
    notifiSetting_toggleInputs(disabled) {
        const inputs = document.querySelectorAll('.table-responsive input[type="checkbox"]');
        inputs.forEach(input => input.disabled = disabled);

        const resetBtn = document.getElementById('notifiSetting_reset-btn');
        if (resetBtn) resetBtn.disabled = disabled;
    },

    /**
     * @description Handle checkbox change.
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
     * @description Binds event listeners.
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
    }
};

// Bootstrap
try {
    notifiSetting_Controller.notifiSetting_init();
} catch (e) {
    console.error('[notifiSetting] Bootstrap error:', e);
}
