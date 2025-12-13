/**
 * @file uiUpdates.js
 * @description UI Updates Module.
 * This file contains all functions that interact directly with the DOM (page elements).
 * This includes:
 * - Showing alert and error messages.
 * - Updating step status (coloring the active step).
 * - Adding animation effects.
 * - Creating dynamic HTML elements (like modal footers).
 */

import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import {
    saveStepState,
    loadStepState,
    saveStepDate,
    loadStepDate,
    getAllItemsStatus,
    ITEM_STATUS
} from "./stateManagement.js";

// Variable to store message timeout (to manage redundancy and prevent timeout accumulation)
let messageTimeout;

/**
 * @description Formats date and time for display.
 * Format: YYYY-MM-DD hh:mm:ss A (12-hour system)
 * @function formatDate
 * @param {string|Date} dateInput - The date to format.
 * @returns {string} - The formatted date string.
 */
function formatDate(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * @description Shows an alert message to the user when they try to click a step they don't have permission for.
 * The message appears for a short period then disappears automatically.
 * @function showUnauthorizedAlert
 * @returns {void}
 */
export function showUnauthorizedAlert() {
    try {
        const messageElement = document.getElementById("permission-denied-message");
        if (!messageElement) return;

        // Clear previous timeout if user clicks again quickly before the previous message disappears
        // This prevents the new message from disappearing too early
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }

        messageElement.textContent = "ليس لديك الصلاحية لهذه المرحلة";
        messageElement.classList.add("show"); // Add CSS class to show the message

        // Hide message after 3 seconds
        messageTimeout = setTimeout(() => {
            messageElement.classList.remove("show");
        }, 3000);
    } catch (alertError) {
        console.error("Error in showUnauthorizedAlert:", alertError);
    }
}

/**
 * @description Adds an animation effect to the step circle to attract attention.
 * @function animateStep
 * @param {HTMLElement} circle - The circle DOM element to animate.
 * @returns {void}
 */
export function animateStep(circle) {
    try {
        // Assumes 'pulse' animation is defined in CSS
        circle.style.animation = "pulse 2.5s infinite";
    } catch (animationError) {
        console.error("Error in animateStep:", animationError);
    }
}

/**
 * @description Updates the visual appearance of the progress bar.
 * Removes highlighting from all steps and adds it only to the specific "current" step.
 * @function highlightCurrentStep
 * @param {string} stepId - The ID of the step to highlight.
 * @returns {void}
 */
export function highlightCurrentStep(stepId) {
    try {
        // 1. Clean previous state: Remove highlighting from all steps
        document.querySelectorAll(".step-item.current").forEach((item) => {
            item.classList.remove("current");
            const circle = item.querySelector(".step-circle");
            if (circle) circle.style.animation = ""; // Stop animation
        });

        // 2. Activate new state: Add highlighting and animation to the specified step
        const stepItem = document.getElementById(stepId);
        if (stepItem) {
            stepItem.classList.add("current");
            animateStep(stepItem.querySelector(".step-circle"));
        }
    } catch (highlightError) {
        console.error("Error in highlightCurrentStep:", highlightError);
    }
}

/**
 * @description Central function to update the full application state based on data.
 * Does the following:
 * 1. Determines the current step.
 * 2. Updates the UI to highlight the current step.
 * 3. Saves the new state.
 * 4. Checks for special statuses (like cancelled or rejected items) and updates corresponding step icons.
 * 5. Displays step description with date.
 * @function updateCurrentStepFromState
 * @param {object} controlData - Control data.
 * @param {Array<object>} ordersData - Orders data (optional).
 * @returns {void}
 */
export function updateCurrentStepFromState(controlData, ordersData) {
    try {
        // Determine current step
        const currentStep = determineCurrentStepId(controlData);

        // Update UI
        highlightCurrentStep(currentStep.stepId);

        // Update step description (display multiple texts based on status)
        const descriptionContainer = document.getElementById("step-description-container");
        const secondaryDescriptionContainer = document.getElementById("secondary-step-description-container");

        if (descriptionContainer) descriptionContainer.innerHTML = "";
        if (secondaryDescriptionContainer) secondaryDescriptionContainer.innerHTML = "";

        // Helper function to append description and date
        const appendDescription = (container, text, stepId) => {
            const p = document.createElement("p");
            p.style.margin = "0.5rem 0";

            // Determine date
            let dateStr = "";
            if (stepId === "step-review") {
                // For the first step, take creation date from the first order
                if (ordersData && ordersData.length > 0 && ordersData[0].created_at) {
                    dateStr = formatDate(ordersData[0].created_at);
                }
            } else {
                // For other steps, check localStorage
                const storedDate = loadStepDate(stepId);

                if (storedDate) {
                    dateStr = storedDate;
                } else if (stepId === currentStep.stepId) {
                    // If this is the current step and no date is saved, save current date
                    // Note: This assumes the function is called when step is activated
                    dateStr = formatDate(new Date());
                    saveStepDate(stepId, dateStr);
                }
            }

            if (dateStr) {
                p.innerHTML = `${text}<br><span style="font-size: 0.8rem; color: #666; display: block; margin-top: 0.2rem;" dir="ltr">${dateStr}</span>`;
            } else {
                p.textContent = text;
            }

            container.appendChild(p);
        };

        // 1. Description of the current active step
        const currentStepInfo = controlData.steps.find(s => s.id === currentStep.stepId);
        if (currentStepInfo && currentStepInfo.description) {
            // If the step is one of the basic steps (1-4)
            if (["step-review", "step-confirmed", "step-shipped", "step-delivered"].includes(currentStep.stepId)) {
                if (descriptionContainer) {
                    appendDescription(descriptionContainer, currentStepInfo.description, currentStep.stepId);
                }
            } else {
                // If the step is one of the final steps (5-7)
                if (secondaryDescriptionContainer) {
                    appendDescription(secondaryDescriptionContainer, currentStepInfo.description, currentStep.stepId);
                }
            }
        }

        // --- Use Item Status for Badges and Descriptions ---
        const itemsMap = getAllItemsStatus();
        const allItems = Object.values(itemsMap);

        const hasCancelled = allItems.some(i => i.status === ITEM_STATUS.CANCELLED);
        const hasRejected = allItems.some(i => i.status === ITEM_STATUS.REJECTED);
        const hasReturned = allItems.some(i => i.status === ITEM_STATUS.RETURNED);


        // 2. Check for cancelled products (step-cancelled)
        if (hasCancelled && currentStep.stepId !== "step-cancelled") {
            const cancelledStepInfo = controlData.steps.find(s => s.id === "step-cancelled");
            if (cancelledStepInfo && cancelledStepInfo.description && secondaryDescriptionContainer) {
                appendDescription(secondaryDescriptionContainer, cancelledStepInfo.description, "step-cancelled");
            }
        }

        // 3. Check for rejected products (step-rejected)
        if (hasRejected && currentStep.stepId !== "step-rejected") {
            const rejectedStepInfo = controlData.steps.find(s => s.id === "step-rejected");
            if (rejectedStepInfo && rejectedStepInfo.description && secondaryDescriptionContainer) {
                appendDescription(secondaryDescriptionContainer, rejectedStepInfo.description, "step-rejected");
            }
        }

        // 4. Check for returned products (step-returned)
        if (hasReturned && currentStep.stepId !== "step-returned") {
            const returnedStepInfo = controlData.steps.find(s => s.id === "step-returned");
            if (returnedStepInfo && returnedStepInfo.description && secondaryDescriptionContainer) {
                appendDescription(secondaryDescriptionContainer, returnedStepInfo.description, "step-returned");
            }
        }

        // Save current specified step to localStorage to ensure continuity on refresh
        saveStepState("current_step", currentStep);

        // --- Handle Special Indicators (Badges) ---

        // 1. Check for cancelled products (in 'Cancelled' step)
        const cancelledStep = document.getElementById("step-cancelled");
        if (cancelledStep) {
            if (hasCancelled) {
                cancelledStep.classList.add("has-cancelled-products");
            } else {
                cancelledStep.classList.remove("has-cancelled-products");
            }
        }

        // 2. Check for seller rejected products (in 'Rejected' step)
        const rejectedStep = document.getElementById("step-rejected");
        if (rejectedStep) {
            if (hasRejected) {
                rejectedStep.classList.add("has-rejected-products");
            } else {
                rejectedStep.classList.remove("has-rejected-products");
            }
        }

        // 3. Check for returned products (in 'Returned' step)
        const returnedStep = document.getElementById("step-returned");
        if (returnedStep) {
            if (hasReturned) {
                returnedStep.classList.add("has-returned-products");
            } else {
                returnedStep.classList.remove("has-returned-products");
            }
        }

    } catch (updateError) {
        console.error("Error in updateCurrentStepFromState:", updateError);
    }
}

/**
 * @description Generates HTML code for the modal footer.
 * The footer usually contains a checkbox to allow the user to activate the stage and proceed to it.
 * @function createStepStatusFooter
 * @param {string} stepId - ID of the step for which the window appears.
 * @param {object} currentStep - Object representing the currently active step in the system.
 * @returns {string} - HTML code ready for insertion into the window.
 */
export function createStepStatusFooter(stepId, currentStep) {
    try {
        // Is this step currently active?
        const isActive = stepId === currentStep.stepId;

        // Get current step number (from state)
        const currentStepNo = parseInt(currentStep.stepNo) || 0;

        // Manually define step order for comparison
        // This helps to know if the step has been completed previously
        const stepOrder = {
            "step-review": 1,
            "step-confirmed": 2,
            "step-shipped": 3,
            "step-delivered": 4,
            "step-cancelled": 5,
            "step-rejected": 6,
            "step-returned": 7
        };

        const requestedStepNo = stepOrder[stepId] || 0;

        // Determine if the step is completed (i.e., we passed it to a later stage)
        // If the requested step number is less than the current step number, it is completed
        const isCompleted = requestedStepNo < currentStepNo;

        // Determine checkbox state (checked or disabled)
        // It is checked if the step is active or completed
        const checked = isActive || isCompleted ? "checked" : "";
        // It is disabled (cannot be changed) if the step is active or completed
        const disabled = isActive || isCompleted ? "disabled" : "";

        return `
              <div id="modal-step-status-container" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                  <input type="checkbox" id="modal-step-status-checkbox" ${checked} ${disabled} data-step-id="${stepId}">
                  <label for="modal-step-status-checkbox" style="font-weight: bold; cursor: pointer;">تفعيل المرحله</label>
              </div>
          `;
    } catch (footerError) {
        console.error("Error in createStepStatusFooter:", footerError);
        return "";
    }
}