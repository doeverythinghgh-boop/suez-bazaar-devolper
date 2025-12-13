/**
 * @file main.js
 * @description Application Entry Point.
 * This file is the mastermind of the application, where execution begins.
 * It coordinates the initial loading process:
 * 1. Fetching data (Control & Orders).
 * 2. Determining user identity and type.
 * 3. Determining the initial state of the application (current step).
 * 4. Bonding event listeners.
 */

import { fetchControlData, fetchOrdersData } from "./dataFetchers.js";
import {
    determineUserType,
    determineCurrentStepId,
} from "./roleAndStepDetermination.js";
import { initializeState } from "./stateManagement.js";
import { updateCurrentStepFromState } from "./uiUpdates.js";
import { addStepClickListeners } from "./stepClickHandlers.js"; import { initializationPromise } from "./config.js";

/**
 * @event DOMContentLoaded
 * @description Executed once the DOM is fully loaded.
 * Ensures that all elements we try to access actually exist.
 */
document.addEventListener("DOMContentLoaded",
    /**
     * @description The main initialization routine for the application, executed once the DOM is fully loaded.
     * It coordinates data fetching, user authentication, state management, and event listener setup.
     * @function mainInitializationRoutine
     * @returns {Promise<void>}
     * @throws {Error} - If any critical step during initialization fails (e.g., data fetching, user type determination).
     * @see fetchControlData
     * @see fetchOrdersData
     * @see initializeState
     * @see determineUserType
     * @see determineCurrentStepId
     * @see updateCurrentStepFromState
     * @see addStepClickListeners
     * @see initializationPromise
     */
    async () => {
        console.log("🚀 [Main] DOMContentLoaded: Page loaded. Starting application initialization.");

        // First, wait for initialization from the parent page
        initializationPromise.then(() => {
            /**
             * @description Fetch all necessary data concurrently (Parallel Fetching).
             * We use Promise.all to wait for both requests to complete before proceeding.
             * This improves performance compared to waiting for each request individually.
             */
            console.log("  [Main] Fetching initial data (control & orders)...");
            Promise.all([fetchControlData(), fetchOrdersData()])
                .then(([controlData, ordersData]) => {
                    console.log("✅ [Main] Initial data fetched successfully.", { controlData, ordersData });
                    try {
                        // --- Initialization Phase ---
                        console.log("  [Main] Initializing application state...");
                        initializeState();

                        // 1. Extract user ID from data
                        const userId = controlData.currentUser.idUser;
                        console.log(`  [Main] Current User ID: ${userId}`);

                        // 2. Determine user type (Admin, Buyer, Seller, Courier)
                        const userType = determineUserType(userId, ordersData, controlData);

                        // If user type is not determined (e.g., inconsistent data), stop execution
                        if (!userType) {
                            console.error("Failed to determine user type. Aborting initialization.");
                            console.error("❌ [Main] Failed to determine user type. Aborting initialization.");
                            return;
                        }

                        // 3. Calculate modification lock state for buyer
                        console.log("  [Main] Calculating buyer modification lock state...");
                        // If we passed the shipping stage, the buyer should not modify their orders
                        const currentStepNo = parseInt(
                            determineCurrentStepId(controlData).stepNo
                        );
                        const shippedStepNo = parseInt(
                            controlData.steps.find((step) => step.id === "step-shipped")?.no || 0
                        );
                        const isBuyerReviewModificationLocked = currentStepNo >= shippedStepNo;
                        console.log(`    [Main] Buyer modification lock state: ${isBuyerReviewModificationLocked}`);

                        // 4. Update user object with the determined type
                        controlData.currentUser.type = userType;

                        // 5. Display user info in browser title
                        const originalTitle = document.title;
                        document.title = `[${userType}: ${userId}] - ${originalTitle}`;

                        console.log(`✅ [Main] User type determined as: ${userType}`);

                        // 6. Update UI to reflect current step
                        console.log("  [Main] Performing initial UI update...");
                        updateCurrentStepFromState(controlData, ordersData);

                        // 7. Enable interaction: Add step click listeners
                        console.log("  [Main] Adding click listeners to stepper items...");
                        addStepClickListeners(
                            controlData,
                            ordersData,
                            isBuyerReviewModificationLocked
                        );
                        console.log("🎉 [Main] Application initialized successfully!");
                    } catch (initializationError) {
                        console.error(
                            "❌ [Main] Error during initialization process (inside .then):",
                            initializationError
                        );
                    }
                })
                .catch((error) =>
                    console.error("❌ [Main] Critical error fetching initial data (Promise.catch):", error)
                );
        });
    });
