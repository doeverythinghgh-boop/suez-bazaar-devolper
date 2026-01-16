/**
 * @file settings-api.js
 * @description Data fetching and saving logic for notification settings.
 */

var notifiSetting_DEFAULT_CONFIG = {};
var notifiSetting_STORAGE_KEY = 'notification_config';

Object.assign(notifiSetting_Controller, {
    /**
     * @description Internal helper to retrieve public R2 URL for configuration files.
     */
    _notifiSetting_getPublicR2FileUrl(fileName) {
        if (typeof getPublicR2FileUrl === 'function') {
            return getPublicR2FileUrl(fileName);
        }
        const domain = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev';
        return `${domain}/${fileName}`;
    },

    /**
     * @description Fetches the default configuration from Cloudflare R2 or local fallback.
     */
    async notifiSetting_loadDefaults() {
        const r2Url = this._notifiSetting_getPublicR2FileUrl('notification_config.json');
        const timestamp = new Date().getTime();
        try {
            console.log('[notifiSetting] Loading from Cloudflare...');
            const response = await fetch(`${r2Url}?t=${timestamp}`);
            if (!response.ok) throw new Error('Cloudflare fetch failed');

            notifiSetting_DEFAULT_CONFIG = await response.json();
            this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
            window.globalNotificationConfig = JSON.parse(JSON.stringify(this.notifiSetting_config));

            console.log('[notifiSetting] Config loaded successfully.');
        } catch (error) {
            console.warn('[notifiSetting] Cloudflare failed, using local:', error);
            try {
                const localResponse = await fetch('notification/notification_config.json');
                notifiSetting_DEFAULT_CONFIG = await localResponse.json();
                this.notifiSetting_config = JSON.parse(JSON.stringify(notifiSetting_DEFAULT_CONFIG));
            } catch (localError) {
                console.error('[notifiSetting] Fatal error loading defaults:', localError);
                this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_load_fail', 'Failed to load configuration'));
                notifiSetting_DEFAULT_CONFIG = {};
                this.notifiSetting_config = {};
            }
        }
    },

    /**
     * @description Loads existing configuration.
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
     * @description Saves current configuration to Cloudflare R2.
     */
    async notifiSetting_saveConfig() {
        if (this.notifiSetting_isSaving) {
            this.notifiSetting_needsRetry = true;
            return;
        }

        try {
            this.notifiSetting_isSaving = true;
            this.notifiSetting_toggleInputs(true);
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_uploading', 'Uploading settings...'));

            if (typeof uploadFile2cf !== 'function') {
                throw new Error('uploadFile2cf bridge missing');
            }

            const jsonString = JSON.stringify(this.notifiSetting_config, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            await uploadFile2cf(blob, 'notification_config.json', (msg) => console.log(msg));

            window.globalNotificationConfig = JSON.parse(JSON.stringify(this.notifiSetting_config));
            this.notifiSetting_showToast(this._notifiSetting_safeLangu('notif_save_success', 'Settings saved successfully'));
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
    }
});
