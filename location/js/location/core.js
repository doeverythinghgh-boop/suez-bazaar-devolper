/**
 * @file core.js
 * @description Core lifecycle and initialization logic for the location application.
 * orchestrates the startup sequence of the application.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

/**
 * Initialize the application components and services
 * @memberof location_app
 * @returns {void}
 */
location_app.init = function () {
    try {
        this.location_showLoading(true);

        this.location_initMap();
        this.location_setupEventListeners();
        this.location_loadInitialLocation();

        setTimeout(() => {
            this.location_showLoading(false);
        }, 500);

        console.log('Location application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize location application:', error);
        this.location_showAlert('خطأ في التهيئة', 'حدث خطأ أثناء تحميل التطبيق. يرجى تحديث الصفحة.', 'error');
    }
};
