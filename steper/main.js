/**
 * @file main.js
 * @description Main Entry Point. Orchestrates application initialization.
 * Coordinates Data Fetching, Role Determination, State Initialization, and Event Binding.
 */

import { fetchControlData, fetchOrdersData } from "./dataFetchers.js";
import { determineUserType, determineCurrentStepId } from "./roleAndStepDetermination.js";
import { initializeState } from "./stateManagement.js";
import { updateCurrentStepFromState } from "./uiUpdates.js";
import { addStepClickListeners } from "./stepClickHandlers.js";
import { initializationPromise } from "./config.js";

/**
 * Initializes the Steper application.
 * Executed after DOMContentLoaded and initial data injection.
 */
async function initApp() {
    try {
        console.log("🚀 [Main] Starting initialization...");

        // 1. Fetch Data
        const [controlData, ordersData] = await Promise.all([
            fetchControlData(),
            fetchOrdersData()
        ]);
        console.log("✅ [Main] Data fetched.", { controlData, ordersData });

        // 2. Initialize State
        initializeState();

        // 3. User Role Logic
        // 3. User Role Logic
        if (!controlData.currentUser) {
            console.error("❌ [Main] 'currentUser' is missing in controlData.", controlData);
            throw new Error("Missing currentUser data. Cannot determine user role.");
        }

        const userId = controlData.currentUser.idUser;
        const userType = determineUserType(userId, ordersData, controlData);

        if (!userType) {
            throw new Error(`Failed to determine user type for ID: ${userId}`);
        }

        controlData.currentUser.type = userType;
        document.title = `[${userType}] - ${document.title}`;
        console.log(`✅ [Main] Verified User: ${userId} as ${userType}`);

        // 4. Calculate Logic Locks (Buyer specific)
        const currentStepState = determineCurrentStepId(controlData);
        const currentStepNo = parseInt(currentStepState.stepNo || 0);
        const shippedStepNo = parseInt(controlData.steps.find((s) => s.id === "step-shipped")?.no || 0);

        // Buyer cannot modify Review if order is Shipped
        const isBuyerReviewLocked = currentStepNo >= shippedStepNo;

        // 5. Initial UI Render
        updateCurrentStepFromState(controlData, ordersData);

        // 6. Bind Events
        addStepClickListeners(controlData, ordersData, isBuyerReviewLocked);

        console.log("🎉 [Main] App initialized successfully!");

    } catch (error) {
        console.error("❌ [Main] Initialization Failed:", error);
    } finally {
        if (typeof window.hideAppLoader === 'function') {
            window.hideAppLoader();
        }
    }
}

// Safety fallback: Hide loader after 5 seconds regardless of state
setTimeout(() => {
    if (typeof window.hideAppLoader === 'function') {
        window.hideAppLoader();
    }
}, 5000);

document.addEventListener("DOMContentLoaded", () => {
    // Wait for config/data injection before starting
    initializationPromise.then(initApp).catch(err => {
        console.error("❌ [Main] Pre-initialization Failed:", err);
    });
});
