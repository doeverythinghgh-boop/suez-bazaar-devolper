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

        // Check for modes from URL parameters
        const params = new URLSearchParams(window.location.search);
        this.viewOnly = params.get('viewOnly') === 'true';
        this.isEmbedded = params.get('embedded') === 'true';

        if (this.viewOnly || this.isEmbedded) {
            const buttonsToHide = [];
            this.hideSave = params.get('hideSave') === 'true';

            if (this.viewOnly) {
                console.log("[Core] Mode: ViewOnly. Hiding editing controls...");
                buttonsToHide.push('location_saveBtn', 'location_gpsBtn', 'location_resetBtn');
            }

            if (this.isEmbedded) {
                console.log("[Core] Mode: Embedded. Hiding close button...");
                const closeBtn = document.getElementById('location_closeBtn');
                if (closeBtn) {
                    closeBtn.style.setProperty('display', 'none', 'important');
                }
            }

            if (this.hideSave) {
                console.log("[Core] Mode: HideSave. Hiding internal save button...");
                buttonsToHide.push('location_saveBtn');
            }

            buttonsToHide.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = 'none';
            });
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
        this.location_showAlert(window.langu('location_init_error_title'), window.langu('location_init_error_text'), 'error');
    }
};
