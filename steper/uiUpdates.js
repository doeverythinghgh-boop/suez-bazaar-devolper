/**
 * @file uiUpdates.js
 * @description UI Updates Module.
 * Handles DOM manipulations and visual state updates.
 */

import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import { saveStepState, loadStepDate, saveStepDate, getAllItemsStatus } from "./stateManagement.js";
import { ITEM_STATUS } from "./config.js";

let messageTimeout;

/**
 * Formats a Date object or string into YYYY-MM-DD hh:mm:ss A.
 * @param {string|Date} dateInput 
 * @returns {string}
 */
function formatDate(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);

    // Check for invalid date
    if (isNaN(date.getTime())) return "";

    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());

    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const ampm = hours >= 12 ? window.langu('time_pm') : window.langu('time_am');

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Displays a temporary unauthorized access alert.
 */
export function showUnauthorizedAlert() {
    const messageElement = document.getElementById("permission-denied-message");
    if (!messageElement) return;

    if (messageTimeout) clearTimeout(messageTimeout);

    messageElement.textContent = window.langu('stepper_unauthorized_alert');
    messageElement.classList.add("show");

    messageTimeout = setTimeout(() => {
        messageElement.classList.remove("show");
    }, 3000);
}

/**
 * Updates the visual state of the current step in the timeline.
 * @param {object} controlData 
 * @param {Array<object>} ordersData 
 */
export function updateCurrentStepFromState(controlData, ordersData) {
    try {
        const currentStep = determineCurrentStepId(controlData);
        highlightCurrentStep(currentStep.stepId);
        updateStepDescriptions(controlData, ordersData, currentStep);
        updateStepBadges(currentStep);

        saveStepState("current_step", currentStep);
    } catch (error) {
        console.error("Error in updateCurrentStepFromState:", error);
    }
}

/**
 * Highlights existing step element and animates it.
 * @param {string} stepId 
 */
export function highlightCurrentStep(stepId) {
    document.querySelectorAll(".step-item.current").forEach((item) => {
        item.classList.remove("current");
        const circle = item.querySelector(".step-circle");
        if (circle) circle.style.animation = "";
    });

    const stepItem = document.getElementById(stepId);
    if (stepItem) {
        stepItem.classList.add("current");
        const circle = stepItem.querySelector(".step-circle");
        if (circle) circle.style.animation = "pulse 2.5s infinite";
    }
}

/**
 * Updates description texts and dates for steps.
 * @param {object} controlData 
 * @param {Array<object>} ordersData 
 * @param {object} currentStep 
 */
function updateStepDescriptions(controlData, ordersData, currentStep) {
    const mainContainer = document.getElementById("step-description-container");
    const subContainer = document.getElementById("secondary-step-description-container");

    if (mainContainer) mainContainer.innerHTML = "";
    if (subContainer) subContainer.innerHTML = "";

    const append = (container, text, stepId) => {
        if (!container) return;
        const dateStr = getStepDate(stepId, currentStep.stepId, ordersData);
        const p = document.createElement("p");
        p.style.margin = "0.5rem 0";
        if (dateStr) {
            p.innerHTML = `${text}<br><span style="font-size: 0.8rem; color: #666; display: block; margin-top: 0.2rem;" dir="ltr">${dateStr}</span>`;
        } else {
            p.textContent = text;
        }
        container.appendChild(p);
    };

    // Main Step Description
    const currentStepInfo = controlData.steps.find(s => s.id === currentStep.stepId);
    if (currentStepInfo?.description) {
        const isMainStep = ["step-review", "step-confirmed", "step-shipped", "step-delivered"].includes(currentStep.stepId);
        append(isMainStep ? mainContainer : subContainer, currentStepInfo.description, currentStep.stepId);
    }

    // Sub-Step Descriptions
    const itemsMap = getAllItemsStatus();
    const allItems = Object.values(itemsMap);

    if (allItems.some(i => i.status === ITEM_STATUS.CANCELLED) && currentStep.stepId !== "step-cancelled") {
        const info = controlData.steps.find(s => s.id === "step-cancelled");
        if (info) append(subContainer, info.description, "step-cancelled");
    }
    if (allItems.some(i => i.status === ITEM_STATUS.REJECTED) && currentStep.stepId !== "step-rejected") {
        const info = controlData.steps.find(s => s.id === "step-rejected");
        if (info) append(subContainer, info.description, "step-rejected");
    }
    if (allItems.some(i => i.status === ITEM_STATUS.RETURNED) && currentStep.stepId !== "step-returned") {
        const info = controlData.steps.find(s => s.id === "step-returned");
        if (info) append(subContainer, info.description, "step-returned");
    }
}

/**
 * Helper to determine date for a step.
 */
function getStepDate(stepId, currentActiveStepId, ordersData) {
    if (stepId === "step-review") {
        return (ordersData?.[0]?.created_at) ? formatDate(ordersData[0].created_at) : "";
    }

    const storedDate = loadStepDate(stepId);
    if (storedDate) return storedDate;

    if (stepId === currentActiveStepId) {
        const now = formatDate(new Date());
        saveStepDate(stepId, now);
        return now;
    }
    return "";
}

/**
 * Updates visual badges for sub-steps (Cancelled, Rejected, Returned).
 */
function updateStepBadges(currentStep) {
    const itemsMap = getAllItemsStatus();
    const allItems = Object.values(itemsMap);

    const toggleClass = (id, hasItem) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle(`has-${id.replace('step-', '')}-products`, hasItem);
    };

    toggleClass("step-cancelled", allItems.some(i => i.status === ITEM_STATUS.CANCELLED));
    toggleClass("step-rejected", allItems.some(i => i.status === ITEM_STATUS.REJECTED));
    toggleClass("step-returned", allItems.some(i => i.status === ITEM_STATUS.RETURNED));
}

/**
 * Creates the footer HTML for popups.
 * @param {string} stepId 
 * @param {object} currentStep 
 * @returns {string} HTML string
 */
export function createStepStatusFooter(stepId, currentStep) {
    const orderMap = {
        "step-review": 1, "step-confirmed": 2, "step-shipped": 3, "step-delivered": 4,
        "step-cancelled": 5, "step-rejected": 6, "step-returned": 7
    };

    const currentNo = parseInt(currentStep.stepNo) || 0;
    const requestedNo = orderMap[stepId] || 0;

    const isCompleted = requestedNo < currentNo;
    const isActive = stepId === currentStep.stepId;

    const state = (isActive || isCompleted) ? "checked disabled" : "";

    return `
        <div id="modal-step-status-container" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <input type="checkbox" id="modal-step-status-checkbox" ${state} data-step-id="${stepId}">
            <label for="modal-step-status-checkbox" style="font-weight: bold; cursor: pointer;">${window.langu('stepper_activate_step')}</label>
        </div>
    `;
}