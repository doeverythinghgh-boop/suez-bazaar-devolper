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
        console.log("[Core] Initializing components...");
        this.location_showLoading(true);

        // Check for viewOnly mode from URL parameters
        const params = new URLSearchParams(window.location.search);
        this.viewOnly = params.get('viewOnly') === 'true';

        if (this.viewOnly) {
            console.log("[Core] Mode: ViewOnly. Hiding editing controls...");
            const buttonsToHide = [
                'location_saveBtn',
                'location_gpsBtn',
                'location_resetBtn',
                'location_closeBtn'
            ];
            buttonsToHide.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = 'none';
            });

            // Adjust sharing button position if needed (it will be the only one)
            const shareBtn = document.getElementById('location_shareBtn');
            if (shareBtn) {
                shareBtn.style.flex = '1';
                shareBtn.style.justifyContent = 'center';
            }
        }

        console.log("[Core] -> Setting up Map...");
        this.location_initMap();

        console.log("[Core] -> Setting up Listeners...");
        this.location_setupEventListeners();

        console.log("[Core] -> Loading Initial Position...");
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
