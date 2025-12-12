/**
 * @file sellerPopups.js
 * @description نوافذ البائع المنبثقة (Seller Popups).
 * يحتوي هذا الملف على جميع الدوال المسؤولة عن عرض النوافذ المنبثقة الخاصة بالبائع.
 * تشمل هذه النوافذ:
 * - تأكيد المنتجات (الموافقة على الطلب).
 * - عرض المنتجات المرفوضة.
 * - عرض معلومات الشحن.
 */

import {
    saveStepState,
    loadStepState,
} from "./stateManagement.js";
import { determineCurrentStepId } from "./roleAndStepDetermination.js";
import {
    updateCurrentStepFromState,
    createStepStatusFooter,
} from "./uiUpdates.js";
import { addStatusToggleListener } from "./popupHelpers.js";

/**
 * Helper to get product name from orders data.
 * @function getProductName
 * @param {string} productKey 
 * @param {Array<object>} ordersData 
 * @returns {string}
 */
function getProductName(productKey, ordersData) {
    for (const order of ordersData) {
        const item = order.order_items.find(i => i.product_key === productKey);
        if (item) return item.product_name;
    }
    return productKey; // Fallback
}

/**
 * Helper to attach log button listeners
 * @function attachLogButtonListeners
 * @returns {void}
 */
function attachLogButtonListeners() {
    document.querySelectorAll('.btn-show-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent toggling the checkbox/row
            console.log(btn.dataset.key);
        });
    });
}

/**
 * @function showSellerConfirmationProductsAlert
 * @description تعرض نافذة للبائع لتأكيد توفر المنتجات التي طلبها المشتري.
 * هذه هي الخطوة الثانية (Confirmed Step).
 *
 * المنطق يشمل:
 * 1. عرض فقط المنتجات التي تخص هذا البائع والتي قام المشتري باختيارها.
 * 2. السماح للبائع بإلغاء تحديد المنتجات (رفضها) إذا لم تكن متوفرة.
 * 3. حفظ حالة التأكيد (المقبول والمرفوض).
 *
 * @param {object} data - بيانات التحكم.
 * @param {Array<object>} ordersData - بيانات الطلبات.
 * @returns {void}
 * @throws {Error} - If there is an error displaying the alert or processing product confirmations.
 * @see saveStepState
 * @see loadStepState
 * @see determineCurrentStepId
 * @see updateCurrentStepFromState
 * @see createStepStatusFooter
 * @see addStatusToggleListener
 */
export function showSellerConfirmationProductsAlert(data, ordersData) {
    try {
        const sellerId = data.currentUser.idUser;

        // تجميع منتجات البائع مع معلومات التوصيل
        const sellerOwnedProducts = ordersData.flatMap((order) =>
            order.order_items
                .filter((item) => item.seller_key === sellerId)
                .map((item) => {
                    const deliveryData = item.supplier_delivery;
                    let parsedDeliveryData = [];

                    if (deliveryData) {
                        const names = deliveryData.delivery_name;
                        const phones = deliveryData.delivery_phone;

                        if (Array.isArray(names)) {
                            parsedDeliveryData = names.map((name, index) => {
                                const phone = Array.isArray(phones) ? phones[index] : phones;
                                return { name: name, phone: phone || 'N/A' };
                            });
                        } else if (names) {
                            const phone = Array.isArray(phones) ? phones[0] : phones;
                            parsedDeliveryData = [{ name: names, phone: phone || 'N/A' }];
                        } else if (deliveryData.delivery_key) {
                            // Fallback to key
                            const key = Array.isArray(deliveryData.delivery_key) ? deliveryData.delivery_key.join(", ") : deliveryData.delivery_key;
                            parsedDeliveryData = [{ name: key, phone: 'N/A' }];
                        }
                    }

                    return {
                        product_key: item.product_key,
                        delivery_info: parsedDeliveryData,
                        note: item.note || '' // Extract note
                    };
                })
        );

        // إزالة التكرار
        const uniqueSellerProducts = Array.from(
            new Map(sellerOwnedProducts.map((p) => [p.product_key, p])).values()
        );

        // الحصول على اختيارات المشتري
        const buyerReviewState = loadStepState("step-review");
        // إذا لم يكن هناك حالة مراجعة (لم يقم المشتري بالحفظ)، نعتبر أن جميع المنتجات مقبولة مبدئياً
        const buyerSelectedKeys = buyerReviewState
            ? buyerReviewState.selectedKeys
            : null;

        const sellerConfirmedState = loadStepState("step-confirmed");
        const previouslySellerSelectedKeys = sellerConfirmedState
            ? sellerConfirmedState.selectedKeys
            : null;

        // التحقق مما إذا كانت مرحلة التأكيد مفعلة بالفعل (تم الانتقال لما بعدها)
        const currentStepState = loadStepState("current_step");
        const isConfirmedActivated = currentStepState && parseInt(currentStepState.stepNo) >= 2;

        // تصفية المنتجات لعرض فقط ما طلبه المشتري
        const displayableProducts = uniqueSellerProducts.filter((p) =>
            buyerSelectedKeys === null || buyerSelectedKeys.includes(p.product_key)
        );

        let contentHtml;

        if (displayableProducts.length === 0) {
            contentHtml = "<p>لا توجد منتجات مشتركة مع اختيارات المشتري لتأكيدها.</p>";
        } else {
            // إنشاء جدول موحد يحتوي على الـ checkboxes ومعلومات التوصيل
            const tableRows = displayableProducts.map(product => {
                const isChecked =
                    previouslySellerSelectedKeys !== null
                        ? previouslySellerSelectedKeys.includes(product.product_key)
                        : true;
                const productName = getProductName(product.product_key, ordersData);
                const agentNames = product.delivery_info.map(d => d.name).join("<br>");
                const agentPhones = product.delivery_info.map(d => d.phone).join("<br>");

                // إنشاء checkbox + label + key button
                const checkboxCell = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center;">
                            <input type="checkbox" 
                                   id="seller-confirmation-checkbox-${product.product_key}" 
                                   name="sellerProductKeys" 
                                   value="${product.product_key}" 
                                   ${isChecked ? "checked" : ""} 
                                   ${isConfirmedActivated ? "disabled" : ""}
                                   style="margin-left: 8px;">
                            <label for="seller-confirmation-checkbox-${product.product_key}">${productName}</label>
                        </div>
                        <button type="button" class="btn-show-key" data-key="${product.product_key}" 
                                style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">
                            key
                        </button>
                    </div>
                `;

                return `
                    <tr id="seller-confirmation-item-${product.product_key}">
                        <td style="padding: 8px; border: 1px solid #ddd;">${checkboxCell}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${product.note ? product.note : '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${agentNames || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${agentPhones || '-'}</td>
                    </tr>
                `;
            }).join("");

            contentHtml = `
                <div style="width: 100%; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="padding: 8px; border: 1px solid #ddd;">المنتج</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">ملاحظات</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">مندوب التوصيل</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">رقم الهاتف</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const currentStep = determineCurrentStepId(data);

        Swal.fire({
            title: "تأكيد المنتجات (بائع):",
            html: `<div id="seller-confirmation-container" style="display: flex; flex-direction: column; align-items: start; width: 100%;">
                    ${contentHtml}
                   </div>`,
            footer: isConfirmedActivated
                ? "لا يمكن تعديل الاختيارات لأن المرحلة مفعلة بالفعل."
                : createStepStatusFooter("step-confirmed", currentStep),
            cancelButtonText: "إغلاق",
            showConfirmButton: false,
            showCancelButton: true,
            focusConfirm: false,
            allowOutsideClick: true,
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
                if (
                    displayableProducts.length > 0 &&
                    !isConfirmedActivated
                ) {
                    addStatusToggleListener(data, ordersData);
                    const container = document.getElementById(
                        "seller-confirmation-container"
                    );
                    container.addEventListener("change", (e) => {
                        if (e.target.name === "sellerProductKeys") {
                            const sellerSelectedKeys = Array.from(
                                container.querySelectorAll(
                                    'input[name="sellerProductKeys"]:checked'
                                )
                            ).map((cb) => cb.value);

                            // المنتجات غير المحددة تعتبر مرفوضة
                            const sellerDeselectedKeys = displayableProducts
                                .map((p) => p.product_key)
                                .filter((key) => !sellerSelectedKeys.includes(key));

                            saveStepState("step-confirmed", {
                                selectedKeys: sellerSelectedKeys,
                                deselectedKeys: sellerDeselectedKeys,
                            });
                            console.log("Auto-saved seller confirmation state:", {
                                selectedKeys: sellerSelectedKeys,
                                deselectedKeys: sellerDeselectedKeys,
                            });
                            updateCurrentStepFromState(data, ordersData);
                        }
                    });
                }
            },
        });
    } catch (sellerConfirmAlertError) {
        console.error(
            "Error in showSellerConfirmationProductsAlert:",
            sellerConfirmAlertError
        );
    }
}

/**
 * @function showSellerRejectedProductsAlert
 * @description تعرض نافذة بالمنتجات التي قام البائع برفضها (إلغاء تحديدها) في مرحلة التأكيد.
 * تظهر عند النقر على خطوة "مرفوض".
 *
 * @param {object} data - بيانات التحكم.
 * @param {Array<object>} ordersData - بيانات الطلبات.
 * @returns {void}
 * @throws {Error} - If there is an error displaying the alert for rejected products.
 * @see loadStepState
 * @see getProductName
 */
export function showSellerRejectedProductsAlert(data, ordersData) {
    try {
        const sellerConfirmedState = loadStepState("step-confirmed");
        const sellerDeselectedKeys = sellerConfirmedState
            ? sellerConfirmedState.deselectedKeys
            : [];

        let contentHtml;
        if (sellerDeselectedKeys && sellerDeselectedKeys.length > 0) {
            const itemsHtml = sellerDeselectedKeys
                .map((key) => {
                    const productName = getProductName(key, ordersData);
                    return `<li id="rejected-item-${key}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span>${productName}</span>
                         <button type="button" class="btn-show-key" data-key="${key}" style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px;">key</button>
                    </li>`;
                })
                .join("");
            contentHtml = `<p>المنتجات التي تم رفضها من قبل البائع:</p><ul id="rejected-products-list" style="text-align: right; margin-top: 1rem; padding-right: 2rem; width: 100%;">${itemsHtml}</ul>`;
        } else {
            contentHtml =
                '<p id="no-rejected-items-message">لم يقم البائع بإلغاء  أي منتجات</p>';
        }

        Swal.fire({
            title: "المنتجات المرفوضة من البائع",
            html: contentHtml,
            icon:
                sellerDeselectedKeys && sellerDeselectedKeys.length > 0
                    ? "info"
                    : "success",
            confirmButtonText: "حسنًا",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                attachLogButtonListeners();
            }
        });
    } catch (rejectedAlertError) {
        console.error(
            "Error in showSellerRejectedProductsAlert:",
            rejectedAlertError
        );
    }
}

/**
 * @function showShippingInfoAlert
 * @description تعرض نافذة بالمنتجات التي تم شحنها.
 * تظهر هذه النافذة في خطوة "شُحن".
 * تعرض فقط المنتجات التي تم تأكيدها من قبل البائع.
 *
 * @param {object} data - بيانات التحكم.
 * @param {Array<object>} ordersData - بيانات الطلبات.
 * @returns {void}
 * @throws {Error} - If there is an error displaying the shipping information alert.
 * @see loadStepState
 * @see getProductName
 * @see determineCurrentStepId
 * @see createStepStatusFooter
 * @see addStatusToggleListener
 */
export function showShippingInfoAlert(data, ordersData) {
    try {
        const sellerConfirmedState = loadStepState("step-confirmed");
        let confirmedKeys;

        if (sellerConfirmedState) {
            confirmedKeys = sellerConfirmedState.selectedKeys;
        } else {
            // إذا لم يكن هناك حالة محفوظة، نفترض أن جميع المنتجات المتاحة هي مؤكدة
            const userId = data.currentUser.idUser;
            const userType = data.currentUser.type;

            let userOwnedProducts;

            if (userType === "seller") {
                userOwnedProducts = ordersData.flatMap((order) =>
                    order.order_items
                        .filter((item) => item.seller_key === userId)
                        .map((item) => item.product_key)
                );
            } else if (userType === "courier") {
                userOwnedProducts = ordersData.flatMap((order) =>
                    order.order_items
                        .filter((item) => {
                            const deliveryKey = item.supplier_delivery?.delivery_key;
                            if (!deliveryKey) return false;
                            if (Array.isArray(deliveryKey)) {
                                return deliveryKey.includes(userId);
                            } else {
                                return deliveryKey === userId;
                            }
                        })
                        .map((item) => item.product_key)
                );
            } else {
                userOwnedProducts = [];
            }

            // إزالة التكرار
            const uniqueUserProducts = [...new Set(userOwnedProducts)];

            const buyerReviewState = loadStepState("step-review");
            const buyerSelectedKeys = buyerReviewState
                ? buyerReviewState.selectedKeys
                : null;

            confirmedKeys = uniqueUserProducts.filter((key) =>
                buyerSelectedKeys === null || buyerSelectedKeys.includes(key)
            );
        }

        if (confirmedKeys.length === 0) {
            Swal.fire({
                title: "لا توجد منتجات للشحن",
                text: "يجب تأكيد المنتجات أولاً قبل الانتقال إلى مرحلة الشحن.",
                icon: "warning",
                confirmButtonText: "حسنًا",
                customClass: { popup: "fullscreen-swal" },
            });
            return;
        }

        // إعداد بيانات الجدول
        const tableRows = confirmedKeys.map(productKey => {
            const productName = getProductName(productKey, ordersData);
            let deliveryInfo = { names: '-', phones: '-' };

            // البحث عن تفاصيل التوصيل للمنتج
            for (const order of ordersData) {
                const item = order.order_items.find(i => i.product_key === productKey);
                if (item && item.supplier_delivery) {
                    const deliveryData = item.supplier_delivery;
                    const names = deliveryData.delivery_name;
                    const phones = deliveryData.delivery_phone;

                    if (Array.isArray(names)) {
                        deliveryInfo.names = names.join("<br>");
                        deliveryInfo.phones = Array.isArray(phones) ? phones.join("<br>") : phones;
                    } else if (names) {
                        deliveryInfo.names = names;
                        deliveryInfo.phones = phones || '-';
                    } else if (deliveryData.delivery_key) {
                        const key = Array.isArray(deliveryData.delivery_key) ? deliveryData.delivery_key.join(", ") : deliveryData.delivery_key;
                        deliveryInfo.names = key;
                    }
                    break; // وجدنا المنتج، نكتفي بأول تطابق (أو يمكن تحسينه إذا كان المنتج مكرر بطريقة ما)
                }
            }

            // إضافة زر Key بجانب اسم المنتج
            const keyButton = `<button type="button" class="btn-show-key" data-key="${productKey}" style="float:left; padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; margin-right: 5px;">key</button>`;

            return `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${productName} ${keyButton}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${deliveryInfo.names}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${deliveryInfo.phones}</td>
                </tr>
            `;
        }).join("");

        const tableHtml = `
            <div style="width: 100%; overflow-x: auto;">
                <p>المنتجات التالية جاهزة للشحن:</p>
                <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.9em; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px; border: 1px solid #ddd;">المنتج</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">مندوب التوصيل</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">رقم الهاتف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;

        const currentStep = determineCurrentStepId(data);

        Swal.fire({
            title: "المنتجات المشحونة",
            html: tableHtml,
            footer: createStepStatusFooter("step-shipped", currentStep),
            // icon: "info", // Remove icon to give more space for table
            confirmButtonText: "إغلاق",
            customClass: { popup: "fullscreen-swal" },
            didOpen: () => {
                addStatusToggleListener(data, ordersData);
                attachLogButtonListeners();
            },
        });
    } catch (shippingAlertError) {
        console.error("Error in showShippingInfoAlert:", shippingAlertError);
    }
}
