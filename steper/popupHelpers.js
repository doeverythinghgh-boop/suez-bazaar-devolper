/**
 * @file popupHelpers.js
 * @description Popup Helpers Module.
 * This file contains common logic used across different popups,
 * primarily the logic for step activation and verifying proper step sequence.
 */

import {
    saveStepState,
    loadStepState,
    getAllItemsStatus,
    ITEM_STATUS
} from "./stateManagement.js";
import {
    updateCurrentStepFromState,
} from "./uiUpdates.js";

/**
 * @function addStatusToggleListener
 * @description Adds an Event Listener for the "Activate Step" checkbox in popups.
 * This function contains the core logic for Workflow Control.
 * 
 * It does the following:
 * 1. Listens for changes to the checkbox.
 * 2. Checks if the transition to the new step is allowed (must be sequential).
 * 3. Shows warning messages if the user tries to skip steps.
 * 4. Requests final confirmation from the user before activation.
 * 5. Saves the new state and updates the UI upon confirmation.
 * 
 * @param {object} controlData - Control data containing step definitions.
 * @param {Array<object>} ordersData - Orders data.
 * @returns {void}
 * @throws {Error} - If there is an error adding the event listener or processing the step activation logic.
 * @see saveStepState
 * @see loadStepState
 * @see updateCurrentStepFromState
 * @see sendStepActivationNotifications
 */
export function addStatusToggleListener(controlData, ordersData) {
    try {
        const checkbox = document.getElementById("modal-step-status-checkbox");
        if (!checkbox) return;

        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                const checkboxElement = e.target;
                const stepIdToActivate = checkboxElement.dataset.stepId;

                // Get current step object from data
                const currentStep = controlData.steps.find(
                    (s) => s.id === stepIdToActivate
                );

                if (!currentStep) {
                    checkboxElement.checked = false;
                    return;
                }

                // Define basic steps that must follow a strict order
                const basicSteps = ["step-review", "step-confirmed", "step-shipped", "step-delivered"];
                // Final/Sub-steps (do not necessarily follow the same strict order rules, but listed here for reference)
                const finalSteps = ["step-cancelled", "step-rejected", "step-returned"];

                // Check sequence logic for basic steps
                if (basicSteps.includes(stepIdToActivate)) {
                    // Get current active step number from storage
                    const savedCurrentStep = loadStepState("current_step");
                    let currentActiveStepNo = 0;

                    if (savedCurrentStep) {
                        currentActiveStepNo = parseInt(savedCurrentStep.stepNo) || 0;
                    }

                    const requestedStepNo = parseInt(currentStep.no);

                    // Rule: The requested step must be (current step + 1)
                    if (requestedStepNo !== currentActiveStepNo + 1) {
                        let errorMessage = "";

                        if (requestedStepNo <= currentActiveStepNo) {
                            errorMessage = "لا يمكن الرجوع إلى مرحلة سابقة. يجب التقدم بالترتيب فقط.";
                        } else {
                            errorMessage = `يجب تفعيل المراحل بالترتيب. المرحلة التالية المتاحة هي رقم ${currentActiveStepNo + 1}.`;
                        }

                        // Show error message and prevent activation
                        Swal.fire({
                            title: "تنبيه",
                            text: errorMessage,
                            icon: "warning",
                            confirmButtonText: "حسنًا",
                            customClass: { popup: "fullscreen-swal" },
                        });

                        checkboxElement.checked = false; // Uncheck
                        return;
                    }
                }

                // If check passes, request final user confirmation
                Swal.fire({
                    title: "تأكيد تفعيل المرحلة",
                    text: "بمجرد تفعيل هذه المرحلة، لا يمكنك التراجع. هل أنت متأكد؟",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "نعم، قم بالتفعيل",
                    cancelButtonText: "إلغاء",
                    customClass: { popup: "fullscreen-swal" },
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Execute activation
                        const stepToActivate = controlData.steps.find(
                            (s) => s.id === stepIdToActivate
                        );
                        if (stepToActivate) {
                            // Save new state
                            saveStepState("current_step", {
                                stepId: stepToActivate.id,
                                stepNo: stepToActivate.no,
                                status: "active",
                            });

                            // Send notifications to relevant parties
                            sendStepActivationNotifications(stepToActivate, controlData, ordersData);

                            // Update UI immediately
                            updateCurrentStepFromState(controlData, ordersData);
                            Swal.close(); // Close popup
                        }
                    } else {
                        // If user cancels, revert checkbox selection
                        checkboxElement.checked = false;
                    }
                });
            }
        });
    } catch (listenerError) {
        console.error("Error in addStatusToggleListener:", listenerError);
    }
}

/**
 * @function sendStepActivationNotifications
 * @description Helper function to send notifications when a new step is activated.
 * Extracts necessary data from ordersData and calls the main notification function.
 * 
 * @param {object} stepToActivate - The activated step object.
 * @param {object} controlData - Control data.
 * @param {Array<object>} ordersData - Orders data.
 */
function sendStepActivationNotifications(stepToActivate, controlData, ordersData) {
    try {
        // Check function availability (optimistically)
        if (typeof notifyOnStepActivation !== 'function') {
            console.warn('[Notifications] notifyOnStepActivation function is not available. Ensure notificationTools.js is loaded.');
            return;
        }

        // Extract data from ordersData
        let buyerKey = '';
        let deliveryKeys = [];
        let sellerKeys = []; // Array of seller keys
        let orderId = '';
        let userName = '';

        if (ordersData && ordersData.length > 0) {
            // Extract buyer key from first order
            const firstOrder = ordersData[0];
            buyerKey = firstOrder.user_key || '';
            orderId = firstOrder.id || firstOrder.order_id || '';

            // Extract current user name
            if (controlData.currentUser) {
                userName = controlData.currentUser.name || controlData.currentUser.idUser || '';
            }

            // Extract delivery keys and seller keys
            const deliveryKeysSet = new Set();
            const sellerKeysSet = new Set(); // Set to store unique seller keys

            ordersData.forEach(order => {
                if (order.order_items && Array.isArray(order.order_items)) {
                    order.order_items.forEach(item => {
                        // Extract delivery key
                        if (item.supplier_delivery && item.supplier_delivery.delivery_key) {
                            const deliveryKey = item.supplier_delivery.delivery_key;
                            if (Array.isArray(deliveryKey)) {
                                deliveryKey.forEach(key => { if (key) deliveryKeysSet.add(key); });
                            } else if (deliveryKey) {
                                deliveryKeysSet.add(deliveryKey);
                            }
                        }

                        // Extract seller key
                        if (item.seller_key) {
                            sellerKeysSet.add(item.seller_key);
                        }
                    });
                }
            });

            deliveryKeys = Array.from(deliveryKeysSet);
            sellerKeys = Array.from(sellerKeysSet); // Convert Set to Array
        }

        // Call main notification function
        notifyOnStepActivation({
            stepId: stepToActivate.id,
            stepName: stepToActivate.name || stepToActivate.id,
            buyerKey: buyerKey,
            deliveryKeys: deliveryKeys,
            sellerKeys: sellerKeys, // Pass seller keys
            orderId: orderId,
            userName: userName
        });

        console.log(`[Notifications] Notification function called for step: ${stepToActivate.name || stepToActivate.id}`);

        // Send sub-step notifications if any
        sendSubStepNotifications(stepToActivate, controlData, ordersData);

    } catch (error) {
        console.error('[Notifications] Error in sendStepActivationNotifications:', error);
    }
}

/**
 * @function sendSubStepNotifications
 * @description Sends notifications for sub-steps (cancelled, rejected, returned) after confirming the main step.
 * 
 * @param {object} stepToActivate - The activated step object.
 * @param {object} controlData - Control data.
 * @param {Array<object>} ordersData - Orders data.
 */
function sendSubStepNotifications(stepToActivate, controlData, ordersData) {
    try {
        // Check function availability
        if (typeof notifyOnSubStepActivation !== 'function') {
            return; // Function not available, ignore
        }

        const stepId = stepToActivate.id;
        let buyerKey = '';
        let sellerKeys = [];
        let orderId = '';
        let userName = '';

        // Extract basic data
        if (ordersData && ordersData.length > 0) {
            const firstOrder = ordersData[0];
            buyerKey = firstOrder.user_key || '';
            orderId = firstOrder.id || firstOrder.order_id || '';

            if (controlData.currentUser) {
                userName = controlData.currentUser.name || controlData.currentUser.idUser || '';
            }

            // Extract seller keys from all products
            const sellerKeysSet = new Set();
            ordersData.forEach(order => {
                if (order.order_items && Array.isArray(order.order_items)) {
                    order.order_items.forEach(item => {
                        if (item.seller_key) {
                            sellerKeysSet.add(item.seller_key);
                        }
                    });
                }
            });
            sellerKeys = Array.from(sellerKeysSet);
        }

        // Check Items Status
        const itemsMap = getAllItemsStatus();
        const allItems = Object.values(itemsMap);

        const hasCancelled = allItems.some(i => i.status === ITEM_STATUS.CANCELLED);
        const hasRejected = allItems.some(i => i.status === ITEM_STATUS.REJECTED);
        const hasReturned = allItems.some(i => i.status === ITEM_STATUS.RETURNED);

        // Depending on the activated main step, check for sub-steps
        if (stepId === 'step-review') {
            // After activating "Review", check for cancelled products
            if (hasCancelled) {
                console.log('[Notifications] Cancelled products detected, sending notifications...');
                notifyOnSubStepActivation({
                    stepId: 'step-cancelled',
                    stepName: 'ملغي',
                    sellerKeys: sellerKeys,
                    orderId: orderId,
                    userName: userName
                });
            }
        } else if (stepId === 'step-confirmed') {
            // After activating "Confirmed", check for rejected products
            if (hasRejected) {
                console.log('[Notifications] Rejected products detected, sending notifications...');
                notifyOnSubStepActivation({
                    stepId: 'step-rejected',
                    stepName: 'مرفوض',
                    buyerKey: buyerKey,
                    orderId: orderId,
                    userName: userName
                });
            }
        } else if (stepId === 'step-delivered') {
            // After activating "Delivered", check for returned products
            if (hasReturned) {
                console.log('[Notifications] Returned products detected, sending notifications...');
                notifyOnSubStepActivation({
                    stepId: 'step-returned',
                    stepName: 'مرتجع',
                    sellerKeys: sellerKeys,
                    orderId: orderId,
                    userName: userName
                });
            }
        }

    } catch (error) {
        console.error('[Notifications] Error in sendSubStepNotifications:', error);
    }
}
