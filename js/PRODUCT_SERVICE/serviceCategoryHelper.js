/**
 * @file js/PRODUCT_SERVICE/serviceCategoryHelper.js
 * @description Helper module for service category detection and management.
 * Provides functions to check if a category is a service based on configuration.
 */

/**
 * @description Cached service configuration to avoid repeated file reads.
 * @type {object|null}
 * @private
 */
let _serviceConfig = null;

/**
 * @description Loads the service categories configuration from JSON file.
 * @async
 * @function loadServiceConfig
 * @returns {Promise<object>} The service configuration object.
 * @throws {Error} If configuration file cannot be loaded.
 */
async function loadServiceConfig() {
    // Return cached config if already loaded
    if (_serviceConfig) {
        return _serviceConfig;
    }

    try {
        const response = await fetch('js/PRODUCT_SERVICE/serviceCategories.config.json');
        if (!response.ok) {
            throw new Error(`فشل تحميل ملف التكوين: ${response.status}`);
        }

        _serviceConfig = await response.json();
        console.log('[ServiceConfig] تم تحميل تكوين الخدمات بنجاح:', _serviceConfig);
        return _serviceConfig;
    } catch (error) {
        console.error('[ServiceConfig] خطأ في تحميل ملف التكوين:', error);
        // Fallback to default configuration (backward compatibility)
        _serviceConfig = {
            serviceMainCategories: [6, 20],
            serviceSubCategories: [],
            settings: {
                hidePrice: true,
                serviceType: "2",
                productType: "0"
            }
        };
        console.warn('[ServiceConfig] استخدام التكوين الافتراضي');
        return _serviceConfig;
    }
}

/**
 * @description Checks if a category (main or main+sub) is a service.
 * @function isServiceCategory
 * @param {number|string} mainId - Main category ID.
 * @param {number|string} [subId=null] - Sub category ID (optional).
 * @returns {boolean} True if the category is a service, false otherwise.
 */
function isServiceCategory(mainId, subId = null) {
    // Ensure config is loaded (use cached version)
    if (!_serviceConfig) {
        console.warn('[ServiceConfig] التكوين غير محمل، استخدام القيمة الافتراضية');
        // Fallback to old logic for backward compatibility
        return mainId == 6 || mainId == 20;
    }

    const config = _serviceConfig;

    // Convert to numbers for comparison
    const mainIdNum = parseFloat(mainId);
    const subIdNum = subId ? parseFloat(subId) : null;

    // Check if entire main category is a service
    if (config.serviceMainCategories.includes(mainIdNum)) {
        return true;
    }

    // Check if specific subcategory is a service
    if (subIdNum !== null) {
        const isServiceSub = config.serviceSubCategories.some(
            item => item.mainId === mainIdNum && item.subId === subIdNum
        );
        if (isServiceSub) {
            return true;
        }
    }

    return false;
}

/**
 * @description Gets the service type string for a category.
 * @function getServiceType
 * @param {number|string} mainId - Main category ID.
 * @param {number|string} [subId=null] - Sub category ID (optional).
 * @returns {string} Service type ('2' for service, '0' for product).
 */
function getServiceType(mainId, subId = null) {
    if (!_serviceConfig) {
        return isServiceCategory(mainId, subId) ? '2' : '0';
    }

    return isServiceCategory(mainId, subId)
        ? _serviceConfig.settings.serviceType
        : _serviceConfig.settings.productType;
}

/**
 * @description Gets all service configuration settings.
 * @function getServiceSettings
 * @returns {object} Service settings object.
 */
function getServiceSettings() {
    if (!_serviceConfig) {
        return {
            hidePrice: true,
            serviceType: "2",
            productType: "0"
        };
    }
    return _serviceConfig.settings;
}

// Auto-load configuration when script loads
loadServiceConfig().catch(err => {
    console.error('[ServiceConfig] فشل التحميل التلقائي:', err);
});
