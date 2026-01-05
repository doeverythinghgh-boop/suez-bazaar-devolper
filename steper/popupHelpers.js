/**
 * @file popupHelpers.js
 * @description Popup Helpers Controller.
 * This file contains logic for step activation and workflow control in popups.
 * It acts as a Controller, delegating business rules to `workflowLogic.js` 
 * and notification rules to `steperNotificationLogic.js`.
 */

import {
    saveStepState,
    loadStepState
} from "./stateManagement.js";

import {
    updateCurrentStepFromState,
} from "./uiUpdates.js";

import { validateStepSequence, createNewStepState } from "./workflowLogic.js";
import { extractNotificationMetadata, checkSubStepConditions } from "./steperNotificationLogic.js";

// =============================================================================
// CONTROLLER LOGIC
// =============================================================================

/**
 * @function addStatusToggleListener
 * @description Adds an Event Listener for the "Activate Step" checkbox in popups.
 * Orchestrates the validation, user confirmation, state saving, and notification dispatch.
 *
 * @param {object} controlData - Control data containing step definitions.
 * @param {Array<object>} ordersData - Orders data.
 */
export function addStatusToggleListener(controlData, ordersData) {
    try {
        const checkbox = document.getElementById("modal-step-status-checkbox");
        if (!checkbox) return;

        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                handleStepActivationAttempt(e.target, controlData, ordersData);
            }
        });
    } catch (listenerError) {
        console.error("Error in addStatusToggleListener:", listenerError);
    }
}

/**
 * Handles the logic when a user attempts to activate a step.
 * @param {HTMLElement} checkboxElement 
 * @param {object} controlData 
 * @param {Array<object>} ordersData 
 */
function handleStepActivationAttempt(checkboxElement, controlData, ordersData) {
    const stepIdToActivate = checkboxElement.dataset.stepId;
    const currentStep = controlData.steps.find((s) => s.id === stepIdToActivate);

    if (!currentStep) {
        checkboxElement.checked = false;
        return;
    }

    const basicSteps = ["step-review", "step-confirmed", "step-shipped", "step-delivered"];

    if (basicSteps.includes(stepIdToActivate)) {
        const savedCurrentStep = loadStepState("current_step");
        const currentActiveStepNo = savedCurrentStep ? (parseInt(savedCurrentStep.stepNo) || 0) : 0;
        const requestedStepNo = parseInt(currentStep.no);

        const validation = validateStepSequence(requestedStepNo, currentActiveStepNo);

        if (!validation.isValid) {
            Swal.fire({
                title: window.langu('alert_title_info'),
                text: validation.errorMessage,

                confirmButtonText: window.langu('alert_confirm_btn'),
                customClass: { popup: "fullscreen-swal" },
            });
            checkboxElement.checked = false;
            return;
        }
    }

    // Confirmation Logic
    Swal.fire({
        title: window.langu('stepper_activation_confirm_title'),
        text: window.langu('stepper_activation_confirm_text'),

        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: window.langu('stepper_activation_confirm_btn'),
        cancelButtonText: window.langu('alert_cancel_btn'),
        customClass: { popup: "fullscreen-swal" },
    }).then((result) => {
        if (result.isConfirmed) {
            executeStepActivation(currentStep, controlData, ordersData);
            Swal.close();
        } else {
            checkboxElement.checked = false;
        }
    });
}

/**
 * Executes the activation of the step after confirmation.
 * @param {object} stepToActivate 
 * @param {object} controlData 
 * @param {Array<object>} ordersData 
 */
function executeStepActivation(stepToActivate, controlData, ordersData) {
    // 1. Save new state
    const newState = createNewStepState(stepToActivate);
    saveStepState("current_step", newState);

    // 2. Notifications
    dispatchNotifications(stepToActivate, controlData, ordersData);

    // 3. Update UI
    updateCurrentStepFromState(controlData, ordersData);
}

/**
 * Orchestrates sending Main Step and Sub-Step notifications.
 * @param {object} stepToActivate 
 * @param {object} controlData 
 * @param {Array<object>} ordersData 
 */
function dispatchNotifications(stepToActivate, controlData, ordersData) {
    const metadata = extractNotificationMetadata(ordersData, controlData);

    // Main Step Notification (Broadcast to all parties in the order for major step changes)
    if (typeof notifyOnStepActivation === 'function') {
        notifyOnStepActivation({
            stepId: stepToActivate.id,
            stepName: stepToActivate.name || stepToActivate.id,
            ...metadata
        });
    }

    // Sub Step Notification
    if (typeof notifyOnSubStepActivation === 'function') {
        const subStepPayload = checkSubStepConditions(stepToActivate.id, metadata);
        if (subStepPayload) {
            console.log(`[Notifications] Sub-step condition met: ${subStepPayload.stepName}`);
            notifyOnSubStepActivation({
                ...subStepPayload,
                actingUserId: metadata.actingUserId
            });
        }
    }
}
