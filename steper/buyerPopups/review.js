/**
 * @file steper/buyerPopups/review.js
 * @description Controller for the Review Step in the Buyer workflow.
 */

import { ITEM_STATUS } from "../config.js";
import { loadItemStatus, saveItemStatus } from "../stateManagement.js";
import { updateCurrentStepFromState } from "../uiUpdates.js";
import { getProductsForReview } from "../buyerLogic.js";
import { generateReviewListHtml } from "../buyerUi.js";
import { extractNotificationMetadata, extractRelevantSellerKeys } from "../steperNotificationLogic.js";
import { attachLogButtonListeners } from "./utils.js";

/**
 * Handles saving review changes.
 * @function handleReviewSave
 * @param {object} data
 * @param {Array<object>} ordersData
 */
export async function handleReviewSave(data, ordersData) {
    const container = document.getElementById("buyer-review-products-container");
    if (!container) return; // Guard clause
    const checkboxes = container.querySelectorAll('input[name="productKeys"]');

    const updates = [];

    checkboxes.forEach(cb => {
        if (!cb.disabled) {
            const newStatus = cb.checked ? ITEM_STATUS.PENDING : ITEM_STATUS.CANCELLED;
            const currentStatus = loadItemStatus(cb.value);
            if (currentStatus !== newStatus) {
                updates.push({ key: cb.value, status: newStatus });
            }
        }
    });

    if (updates.length > 0) {
        console.log('[Dev] 📝 [Review Save] بدء عملية حفظ المراجعة...');
        console.log('[Dev] 📝 [Review Save] عدد التحديثات المطلوبة:', updates.length);
        console.log('[Dev] 📝 [Review Save] تفاصيل التحديثات:', JSON.stringify(updates, null, 2));

        // Show loading state
        Swal.fire({
            title: window.langu('shipping_saving_title'),
            text: window.langu('review_saving_text'),
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text'
            }
        });

        try {
            console.log('[Dev] 📝 [Review Save] جاري تنفيذ التحديثات...');

            // Execute all updates (Blocking)
            await Promise.all(updates.map(async (u, index) => {
                console.log(`[Dev] 📝 [Review Save] تحديث ${index + 1}/${updates.length}: key=${u.key}, status=${u.status}`);
                try {
                    await saveItemStatus(u.key, u.status);
                    console.log(`[Dev] ✅ [Review Save] نجح التحديث ${index + 1}/${updates.length}`);
                } catch (err) {
                    console.error(`[Dev] ❌ [Review Save] فشل التحديث ${index + 1}/${updates.length}:`, err);
                    throw err; // Re-throw to trigger outer catch
                }
            }));

            console.log('[Dev] ✅ [Review Save] تم حفظ جميع التحديثات بنجاح');

            Swal.fire({
                title: window.langu('review_update_success_title'),
                text: window.langu('review_update_success_text'),
                timer: 1500,
                showConfirmButton: false,
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text'
                }
            }).then(() => {
                console.log('[Dev] 📝 [Review Save] جاري تحديث واجهة المستخدم...');
                updateCurrentStepFromState(data, ordersData);

                // [Notifications] Dispatch Notifications
                if (typeof window.notifyOnStepActivation === 'function') {
                    console.log('[Dev] 🔔 [Review Save] جاري إرسال الإشعارات...');
                    const metadata = extractNotificationMetadata(ordersData, data);

                    // 1. Notify Review (Always trigger if enabled in config)
                    console.log(`[SteperNotification] 📢 Triggering 'step-review' notification.`);
                    console.log(`[SteperNotification] 🎯 Destination: All configured recipients for 'step-review'.`);
                    window.notifyOnStepActivation({
                        stepId: 'step-review',
                        stepName: window.langu('review_notify_title') || 'مراجعة المنتجات',
                        ...metadata
                    });

                    // 2. Notify Cancelled
                    const hasCancelled = updates.some(u => u.status === ITEM_STATUS.CANCELLED);
                    if (hasCancelled) {
                        console.log('[Dev] 🔔 [Review Save] يوجد منتجات ملغاة - إرسال إشعار الإلغاء...');
                        const relevantSellers = extractRelevantSellerKeys(updates, ordersData);

                        console.log(`[SteperNotification] 📢 Triggering 'step-cancelled' notification.`);
                        console.log(`[SteperNotification] 🎯 Target Sellers (Keys):`, relevantSellers);

                        window.notifyOnStepActivation({
                            stepId: 'step-cancelled',
                            stepName: window.langu('review_notify_cancelled'),
                            ...metadata,
                            sellerKeys: relevantSellers
                        });
                    }
                    console.log('[Dev] ✅ [Review Save] تم إرسال الإشعارات بنجاح');
                }
            });
        } catch (error) {
            console.error('[Dev] ❌ [Review Save] فشل حفظ المراجعة - تفاصيل الخطأ:');
            console.error('[Dev] ❌ [Review Save] نوع الخطأ:', error.name);
            console.error('[Dev] ❌ [Review Save] رسالة الخطأ:', error.message);
            console.error('[Dev] ❌ [Review Save] Stack Trace:', error.stack);

            if (error.response) {
                console.error('[Dev] ❌ [Review Save] استجابة السيرفر:', error.response);
                console.error('[Dev] ❌ [Review Save] حالة HTTP:', error.response.status);
                console.error('[Dev] ❌ [Review Save] بيانات الاستجابة:', error.response.data);
            }

            if (error.request) {
                console.error('[Dev] ❌ [Review Save] الطلب المرسل:', error.request);
            }

            Swal.fire({
                title: window.langu('stepper_save_fail_title'),
                text: window.langu('review_save_fail_text'),
                confirmButtonText: window.langu('alert_confirm_btn'),
                buttonsStyling: false,
                customClass: {
                    popup: 'swal-modern-mini-popup',
                    title: 'swal-modern-mini-title',
                    htmlContainer: 'swal-modern-mini-text',
                    confirmButton: 'swal-modern-mini-confirm'
                }
            });
        }
    } else {
        console.log('[Dev] ℹ️ [Review Save] لا توجد تحديثات للحفظ - إغلاق النافذة');
        Swal.close();
    }
}

/**
 * Displays a popup for the buyer to review products and select what they want to order.
 * @function showProductKeysAlert
 * @param {object} data - Control Data.
 * @param {Array<object>} ordersData - Orders Data.
 * @param {boolean} isModificationLocked - Is modification locked.
 */
export function showProductKeysAlert(data, ordersData, isModificationLocked) {
    try {
        const userId = data.currentUser.idUser;
        const userType = data.currentUser.type;

        // Use Logic module to get data
        const productKeys = getProductsForReview(ordersData, userId, userType);

        const isOverallLocked = isModificationLocked || (userType !== "buyer" && userType !== "admin");

        // Use UI module to generate HTML
        const htmlContent = generateReviewListHtml(productKeys, ordersData, isOverallLocked);

        Swal.fire({
            title: isOverallLocked ? window.langu('review_modal_view_title') : window.langu('review_modal_select_title'),
            html: `<div id="buyer-review-products-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">${htmlContent}</div>`,
            footer: isOverallLocked
                ? window.langu('review_readonly_info')
                : `<button id="btn-save-review" class="swal2-confirm swal2-styled" style="background-color: #28a745;">${window.langu('review_save_btn')}</button>`,
            cancelButtonText: window.langu('alert_close_btn'),
            focusConfirm: false,
            allowOutsideClick: !isOverallLocked,
            showConfirmButton: false,
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'swal-modern-mini-popup',
                title: 'swal-modern-mini-title',
                htmlContainer: 'swal-modern-mini-text',
                confirmButton: 'swal-modern-mini-confirm',
                cancelButton: 'swal-modern-mini-cancel'
            },
            didOpen: () => {
                attachLogButtonListeners();
                if (!isOverallLocked) {
                    document.getElementById('btn-save-review')?.addEventListener('click', () => {
                        handleReviewSave(data, ordersData);
                    });
                }
            },
        });
    } catch (error) {
        console.error("Error in showProductKeysAlert:", error);
    }
}
