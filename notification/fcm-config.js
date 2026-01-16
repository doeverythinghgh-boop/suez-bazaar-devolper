/**
 * @file notification/fcm-config.js
 * @description Configuration and message template logic for FCM.
 */

var cachedDefaultConfig = null;
var notificationMessages = null;

/**
 * Securely retrieves an R2 file URL, with a fallback if cloudFileManager.js is not loaded.
 */
function _safeGetR2Url(fileName) {
    if (typeof getPublicR2FileUrl === 'function') {
        return getPublicR2FileUrl(fileName);
    }
    const R2_PUBLIC_BASE_URL = "https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev";
    const cleanName = fileName.startsWith("/") ? fileName.substring(1) : fileName;
    return `${R2_PUBLIC_BASE_URL}/${cleanName}`;
}

/**
 * Fetches and caches notification templates from `notification_messages.json`.
 */
async function loadNotificationMessages() {
    if (notificationMessages) return notificationMessages;
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`/notification/notification_messages.json?t=${timestamp}`);

        if (response.ok) {
            notificationMessages = await response.json();
            window.notificationMessages = notificationMessages;
            console.log('[Notifications] Messages loaded locally successfully.');
            return notificationMessages;
        } else {
            console.error('[Notifications] Failed to load local messages file:', response.status);
        }
    } catch (e) {
        console.error('[Notifications] Error fetching local messages file:', e);
    }
    return null;
}

/**
 * Extracts a message template and replaces placeholders with provided values.
 */
function getMessageTemplate(path, placeholders = {}) {
    if (!notificationMessages) return { title: 'Notification', body: '' };

    const keys = path.split('.');
    let template = notificationMessages;
    for (const key of keys) {
        template = template ? template[key] : null;
    }

    if (!template) return { title: 'Notification', body: '' };

    let body = template.body || '';
    let title = template.title || '';

    Object.keys(placeholders).forEach(key => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        body = body.replace(regex, placeholders[key]);
        title = title.replace(regex, placeholders[key]);
    });

    return { title, body };
}

/**
 * Determines if a notification is permitted for a specific event and role.
 */
async function shouldNotify(eventKey, role) {
    let config = window.globalNotificationConfig;

    if (!config) {
        if (!cachedDefaultConfig) {
            try {
                const timestamp = new Date().getTime();
                try {
                    console.warn('[Notifications] Config not found in window, fetching JSON file from cloud...');
                    const r2Url = _safeGetR2Url('notification_config.json');
                    const response = await fetch(`${r2Url}?t=${timestamp}`);

                    if (response.ok) {
                        cachedDefaultConfig = await response.json();
                        config = cachedDefaultConfig;
                        window.globalNotificationConfig = config;
                        console.log('[Notifications] Config loaded from Cloudflare successfully.');
                    }
                } catch (e) {
                    console.warn('[Notifications] Failed to fetch config from cloud, using default values.');
                }

                if (!config) {
                    const localRes = await fetch(`/notification/notification_config.json?t=${timestamp}`);
                    if (localRes.ok) {
                        cachedDefaultConfig = await localRes.json();
                        config = cachedDefaultConfig;
                        window.globalNotificationConfig = config;
                        console.log('[Notifications] Config loaded locally successfully.');
                    }
                }
            } catch (e) {
                console.error('[Notifications] Fatal error fetching config:', e);
            }
        } else {
            config = cachedDefaultConfig;
        }
    }

    if (config && config[eventKey] && config[eventKey][role] !== undefined) {
        return config[eventKey][role];
    }

    const criticalDefaults = {
        'purchase': { admin: true },
    };

    if (criticalDefaults[eventKey] && criticalDefaults[eventKey][role] !== undefined) {
        return criticalDefaults[eventKey][role];
    }

    console.warn(`[Notifications] Configuration missing for ${eventKey}.${role}, assuming TRUE.`);
    return true;
}

window.shouldNotify = shouldNotify;
window.loadNotificationMessages = loadNotificationMessages;
window.getMessageTemplate = getMessageTemplate;
