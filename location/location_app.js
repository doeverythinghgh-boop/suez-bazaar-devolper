/**
 * @file location_app.js
 * @description Application entry point for the Location Selection system.
 */

// Function to start the app
function bootLocationApp() {
    console.log("[App] Booting Location Application...");
    try {
        if (window.location_appInitialized) return;
        window.location_appInitialized = true;

        if (typeof location_app !== 'undefined' && typeof location_app.init === 'function') {
            location_app.init();
        } else {
            throw new Error(window.langu('location_critical_load_error'));
        }
    } catch (error) {
        console.error('Failed to initialize application bootstrapper:', error);

        // Show critical error screen to user
        const location_loadingOverlay = document.getElementById('location_loadingOverlay');
        if (location_loadingOverlay) {
            location_loadingOverlay.innerHTML = `
                <div id="location_errorContainer" style="text-align: center; padding: 20px; background: var(--bg-color-white); border-radius: 12px; box-shadow: var(--shadow-soft);">
                    <h3 id="location_errorTitle" style="color: var(--danger-color); margin-bottom: 10px;">${window.langu('location_critical_error_title')}</h3>
                    <p id="location_errorText" style="color: var(--text-color-medium); margin-bottom: 20px;">${window.langu('location_critical_error_text')}</p>
                    <button id="location_reloadBtn" onclick="window.location.reload()" 
                            style="padding: 10px 24px; 
                                   background: #2563eb; 
                                   color: white; 
                                   border: none; 
                                   border-radius: 8px; 
                                   cursor: pointer;
                                   font-weight: bold;
                                   transition: background 0.2s;">
                        ${window.langu('location_reload_btn')}
                    </button>
                </div>
            `;
            location_loadingOverlay.style.display = 'flex';
            location_loadingOverlay.style.opacity = '1';
        }
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLocationApp);
} else {
    bootLocationApp();
}

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('Captured global error:', event.error || event.message);
});