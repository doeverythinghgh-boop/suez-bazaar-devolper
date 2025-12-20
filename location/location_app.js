/**
 * @file location_app.js
 * @description Application entry point for the Location Selection system.
 * This file handles the initial boot sequence and global error management.
 * 
 * @author Antigravity
 * @version 1.0.0
 */

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Prevent multiple initializations
        if (window.location_appInitialized) {
            console.warn('Location app already initialized');
            return;
        }

        window.location_appInitialized = true;

        // Start the application
        if (typeof location_app !== 'undefined' && typeof location_app.init === 'function') {
            location_app.init();
        } else {
            throw new Error('لم يتم تحميل وحدات التطبيق الأساسية بشكل صحيح.');
        }

        // Add global error handler for uncaught exceptions
        window.addEventListener('error', (event) => {
            console.error('Captured global error:', event.error || event.message);
        });

    } catch (error) {
        console.error('Failed to initialize application bootstrapper:', error);

        // Show critical error screen to user
        const location_loadingOverlay = document.getElementById('location_loadingOverlay');
        if (location_loadingOverlay) {
            location_loadingOverlay.innerHTML = `
                <div id="location_errorContainer" style="text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3 id="location_errorTitle" style="color: #dc2626; margin-bottom: 10px;">خطأ في التحميل</h3>
                    <p id="location_errorText" style="color: #4b5563; margin-bottom: 20px;">حدث خطأ أثناء تشغيل التطبيق. يرجى المحاولة مرة أخرى.</p>
                    <button id="location_reloadBtn" onclick="window.location.reload()" 
                            style="padding: 10px 24px; 
                                   background: #2563eb; 
                                   color: white; 
                                   border: none; 
                                   border-radius: 8px; 
                                   cursor: pointer;
                                   font-weight: bold;
                                   transition: background 0.2s;">
                        تحديث الصفحة
                    </button>
                </div>
            `;
            location_loadingOverlay.style.display = 'flex';
            location_loadingOverlay.style.opacity = '1';
        }
    }
});