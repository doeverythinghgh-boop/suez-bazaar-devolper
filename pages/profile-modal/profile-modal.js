/**
 * @file pages/profile-modal/profile-modal.js
 * @description Main entry point and coordinator for the user profile modal.
 * This file bootstraps the profile module components.
 */

/**
 * @function initializeProfileModule
 * @description Safely bootstraps the profile module after ensuring dependencies are loaded.
 */
function initializeProfileModule() {
    try {
        console.log("[Profile] Starting module initialization...");

        // 1. Initialize Header (Standard project pattern)
        // Check if container exists before attempting to insert
        const headerContainer = document.getElementById("profile-header-container");
        if (headerContainer) {
            insertUniqueSnapshot("pages/header.html", "profile-header-container", 300);
        } else {
            console.warn("[Profile] Header container not found yet, retrying...");
            setTimeout(initializeProfileModule, 100);
            return;
        }

        // 2. Initial Data Load
        if (typeof profileInitializeData === 'function') {
            profileInitializeData();
        } else {
            console.error("[Profile] profileInitializeData is not defined!");
        }

        // 3. Setup Interactive Listeners
        if (typeof profileSetupListeners === 'function') {
            profileSetupListeners();
        } else {
            console.error("[Profile] profileSetupListeners is not defined!");
        }

        console.log("[Profile] Module initialized successfully.");
    } catch (error) {
        console.error("[Profile] Error during module bootstrapping:", error);
    }
}

// Start initialization with a small delay to handle dynamic content loading
setTimeout(initializeProfileModule, 50);
