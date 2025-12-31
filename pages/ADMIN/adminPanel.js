/**
 * @file pages/ADMIN/adminPanel.js
 * @description This file manages the admin control panel interface, handling user data fetching,
 * displaying it in a table, managing seller and delivery relations, as well as functions for Impersonation login and sending notifications.
 */
/**
 * @description Asynchronously fetches all basic user data from the server API.
 * Processes the data to include seller and delivery status based on `suppliers_deliveries`.
 * @returns {Promise<Array<object>>} Array of processed user objects.
 * @async
 * @throws {Error} - If there is a network error or the API response indicates failure.
 * @see baseURL
 * @see api/users
 * @see api/suppliers-deliveries
 */
async function getAllUsers_() {
    console.log('[getAllUsers_] بدء لجلب بيانات جميع المستخدمين...');

    try {
        console.log('[getAllUsers_] إرسال طلب GET إلى /api/users...');

        // Send GET request to the specified endpoint
        const response = await fetch(`${baseURL}/api/users`);

        console.log(`[getAllUsers_] تم استلام الرد من الخادم، رمز الحالة: ${response.status}`);

        // Check if request was successful (Status between 200 and 299)
        if (!response.ok) {
            console.error(`[getAllUsers_] فشل استلام البيانات من الخادم، رمز الخطأ: ${response.status}`);
            throw new Error(`Server response failed: ${response.status}`);
        }

        console.log('[getAllUsers_] تحويل الرد إلى JSON...');

        // Convert received data from server to JavaScript objects
        const rawUsersData = await response.json();

        console.log(`[getAllUsers_] تم تحويل البيانات بنجاح، عدد المستخدمين الخام: ${rawUsersData.length}`);

        // Process data: Convert each user to the required format
        console.log('[getAllUsers_] بدء معالجة وتنظيف البيانات...');

        // Extract all user_keys to check status in bulk
        const userKeys = rawUsersData.map(user => user.user_key);

        // Map to store results for easy access
        const deliveryStatusMap = {};

        try {
            console.log('[getAllUsers_] التحقق من حالة التوصيل للمستخدمين...');
            const statusResponse = await fetch(`${baseURL}/api/suppliers-deliveries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userKeys })
            });

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                const results = statusData.results || [];

                results.forEach(item => {
                    deliveryStatusMap[item.key] = {
                        isSeller: item.isSeller,
                        isDelivery: item.isDelivery
                    };
                });

                console.log('[getAllUsers_] تم استلام حالات التوصيل بنجاح');
            } else {
                console.warn(`[getAllUsers_] Failed to check delivery status: ${statusResponse.status}`);
            }
        } catch (statusError) {
            console.error('[getAllUsers_] Error fetching delivery status:', statusError);
        }

        const processedUsers = rawUsersData.map((user, index) => {
            const status = deliveryStatusMap[user.user_key] || { isSeller: false, isDelivery: false };

            const processedUser = {
                user_key: user.user_key,
                username: user.username,
                phone: user.phone,
                Address: user.Address,
                Password: user.Password,
                hasFCMToken: !!user.fcm_token,
                tokenPlatform: user.platform ? user.platform : "None",
                isSeller: status.isSeller,
                isDelivery: status.isDelivery,
                limitPackage: user.limitPackage || 0,
                isDelevred: user.isDelevred || 0
            };
            return processedUser;
        });

        console.log(`[getAllUsers_] اكتملت المعالجة، المستخدمين المعالجين:`, processedUsers);
        return processedUsers;

    } catch (error) {
        console.error('[getAllUsers_] حدث خطأ غير متوقع أثناء تنفيذ الدالة:', error);
        throw new Error(`Failed to fetch user data: ${error.message}`);
    }
}

/**
 * @description Populates the users table with the fetched data.
 * @function populateUsersTable
 * @param {Array<object>} users - Array containing user objects.
 * @returns {void}
 * @throws {Error} - If DOM elements are not found or an error occurs during HTML manipulation.
 * @see showRelationsModal
 * @see loginAsUser
 * @see sendAdminNotification
 */
function populateUsersTable(users) {
    const tbody = document.getElementById('admin-panel-users-tbody');
    if (!tbody) {
        console.error('[populateUsersTable] لم يتم العثور على عنصر tbody للجدول.');
        return;
    }

    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        const emptyRow = `<tr><td colspan="7" style="text-align: center; padding: 20px;">لا يوجد مستخدمون لعرضهم.</td></tr>`;
        tbody.innerHTML = emptyRow;
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        const tokenClass = user.hasFCMToken ? 'has-token-true' : 'has-token-false';
        const tokenText = user.hasFCMToken ? 'نعم' : 'لا';

        let deliveryAction = '-';
        if (user.isSeller && user.isDelivery) {
            deliveryAction = `<button class="btn-delivery-status btn-role-both" onclick="showRelationsModal('${user.user_key}', '${user.username}')">مشترك</button>`;
        } else if (user.isSeller) {
            deliveryAction = `<button class="btn-delivery-status btn-role-seller" onclick="showRelationsModal('${user.user_key}', '${user.username}')">بائع</button>`;
        } else if (user.isDelivery) {
            deliveryAction = `<button class="btn-delivery-status btn-role-delivery" onclick="showRelationsModal('${user.user_key}', '${user.username}')">توصيل</button>`;
        } else {
            deliveryAction = `<button class="btn-delivery-status btn-role-manage" style="background-color: #6c757d;" onclick="showRelationsModal('${user.user_key}', '${user.username}')">إدارة</button>`;
        }

        const loginAction = `<button class="btn-delivery-status" style="background-color: #17a2b8;" onclick="loginAsUser('${user.user_key}')">دخول</button>`;

        // ✅ New fields logic
        const limitAction = `
            <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
                <input type="number" id="limit-input-${user.user_key}" value="${user.limitPackage}" style="padding: 5px; width: 70px; border: 1px solid #ccc; border-radius: 4px;">
                <button class="btn-delivery-status" style="background-color: #28a745; color: #fff; padding: 5px 10px;" onclick="updateUserField('${user.user_key}', 'limitPackage')">
                   <i class="fas fa-save"></i>
                </button>
            </div>
        `;

        const deliveryStatusAction = `
            <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                <label style="font-size: 0.8em; color: #333; cursor: pointer;">
                    <input type="radio" name="isDelevred-${user.user_key}" value="1" ${user.isDelevred == 1 ? 'checked' : ''} onchange="updateUserField('${user.user_key}', 'isDelevred', this.value)"> نعم
                </label>
                <label style="font-size: 0.8em; color: #333; cursor: pointer;">
                    <input type="radio" name="isDelevred-${user.user_key}" value="0" ${user.isDelevred == 0 ? 'checked' : ''} onchange="updateUserField('${user.user_key}', 'isDelevred', this.value)"> لا
                </label>
            </div>
        `;

        // Input and Button for Notification
        const notifyAction = `
            <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
                <input type="text" id="notify-input-${user.user_key}" placeholder="رسالة" style="padding: 5px; width: 100px; border: 1px solid #ccc; border-radius: 4px;">
                <button class="btn-delivery-status" style="background-color: #ffc107; color: #000; padding: 5px 10px;" onclick="sendAdminNotification('${user.user_key}')">
                   <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;

        row.innerHTML = `
            <td>${user.user_key || 'غير متوفر'}</td>
            <td>${user.username || 'غير متوفر'}</td>
            <td>${user.phone || 'غير متوفر'}</td>
            <td>${user.Password || 'لا يوجد'}</td>
            <td>${user.Address || 'غير متوفر'}</td>
            <td class="${tokenClass}">${tokenText}</td>
            <td>${user.tokenPlatform || 'N/A'}</td>
            <td style="text-align: center;">${deliveryAction}</td>
            <td style="text-align: center;">${limitAction}</td>
            <td style="text-align: center;">${deliveryStatusAction}</td>
            <td style="text-align: center;">${notifyAction}</td>
            <td style="text-align: center;">${loginAction}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * @description Main function executed on page load to initialize the admin panel.
 * Fetches user data, populates the table, and sets up click-to-copy event listeners.
 * @function initializeAdminPanel
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If data fetching or table population fails.
 * @see getAllUsers_
 * @see populateUsersTable
 * @see Swal.mixin
 * @see showRelationsModal
 * @see loginAsUser
 * @see sendAdminNotification
 */
async function initializeAdminPanel() {
    const loader = document.getElementById('admin-panel-loader');
    const tableContainer = document.getElementById('admin-panel-table-container');
    const errorContainer = document.createElement('div');
    errorContainer.className = 'admin-panel-error';
    errorContainer.style.textAlign = 'center'; errorContainer.style.padding = '20px'; errorContainer.style.color = 'var(--danger-color)';

    try {
        loader.style.display = 'flex';
        tableContainer.style.display = 'none';

        const users = await getAllUsers_();
        populateUsersTable(users);

        loader.style.display = 'none';
        tableContainer.style.display = 'block';

        // ✅ Show broadcast section
        var broadcastSection = document.getElementById('admin-panel-broadcast-section');
        if (broadcastSection) broadcastSection.style.display = 'block';

        // ✅ Add Click to Copy Feature
        const tbody = document.getElementById('admin-panel-users-tbody');
        if (tbody) {
            tbody.onclick = function (e) {
                const target = e.target;
                if (target.tagName === 'BUTTON' || target.closest('button')) return;

                const cell = target.closest('td');
                if (!cell || cell.colSpan > 1) return;

                // [Highlight Logic]
                // 1. Remove 'selected-row' from all other rows
                const allRows = tbody.querySelectorAll('tr');
                allRows.forEach(row => row.classList.remove('selected-row'));

                // 2. Add 'selected-row' to the clicked row
                const clickedRow = target.closest('tr');
                if (clickedRow) {
                    clickedRow.classList.add('selected-row');

                    // [Display Username in Title]
                    const usernameCell = clickedRow.cells[1];
                    const selectedUserDisplay = document.getElementById('selected-user-display');
                    if (usernameCell && selectedUserDisplay) {
                        selectedUserDisplay.innerText = `(${usernameCell.innerText})`;
                    }
                }

                // [Copy Logic]

                const textToCopy = cell.innerText.trim();
                if (textToCopy && !['غير متوفر', 'لا يوجد', '-', 'N/A'].includes(textToCopy)) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true,
                            didOpen: (toast) => {
                                toast.addEventListener('mouseenter', Swal.stopTimer);
                                toast.addEventListener('mouseleave', Swal.resumeTimer);
                            }
                        });
                        Toast.fire({ icon: 'success', title: 'تم النسخ: ' + textToCopy });
                    }).catch(err => console.error('فشل النسخ', err));
                }
            };
        }

    } catch (error) {
        console.error('[initializeAdminPanel] فشل تهيئة لوحة التحكم:', error);
        loader.style.display = 'none';
        errorContainer.innerHTML = `<p>حدث خطأ أثناء تحميل بيانات المستخدمين.</p><p><small>${error.message}</small></p>`;
        const mainContainer = document.querySelector('.admin-panel-container');
        if (mainContainer) mainContainer.appendChild(errorContainer);
    }
}

/**
 * @function showRelationsModal
 * @description Displays the relations management modal for a user (sellers or distributors).
 * @param {string} userKey - User Key.
 * @param {string} username - Username.
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If fetching relations data fails.
 * @see baseURL
 * @see createRelationsListHtml
 * @see handleAddRelation
 */
async function showRelationsModal(userKey, username) {
    Swal.fire({
        title: 'جاري جلب العلاقات...',
        didOpen: () => Swal.showLoading()
    });

    try {
        const response = await fetch(`${baseURL}/api/suppliers-deliveries?relatedTo=${userKey}`);
        if (!response.ok) throw new Error('فشل جلب العلاقات');
        const data = await response.json();

        let htmlContent = `<div style="text-align: right; font-family: 'Tajawal', sans-serif;">`;
        htmlContent += `<h3 style="color: var(--primary-color); border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px;">📦 الموزعين التابعين له (كموزعين لديك)</h3>`;
        htmlContent += (data.asSeller && data.asSeller.length > 0) ? createRelationsListHtml(data.asSeller, userKey, 'seller') : `<p style="color: #777;">لا يوجد موزعين مرتبطين.</p>`;

        htmlContent += `<h3 style="color: var(--success-color); border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 20px;">🚚 البائعين التابع لهم (كموزع لديهم)</h3>`;
        htmlContent += (data.asDelivery && data.asDelivery.length > 0) ? createRelationsListHtml(data.asDelivery, userKey, 'delivery') : `<p style="color: #777;">لا يوجد بائعين مرتبطين.</p>`;

        htmlContent += `
            <div style="margin-top: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <h4 style="margin-top: 0;">➕ إضافة علاقة جديدة</h4>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="newRelUserKey" placeholder="أدخل مفتاح المستخدم المراد ربطه" class="swal2-input" style="margin: 0; flex: 1;">
                    <select id="newRelType" class="swal2-input" style="margin: 0; width: 120px; font-size: 14px;">
                        <option value="delivery">هو موزع لي</option>
                        <option value="seller">هو بائع لي</option>
                    </select>
                </div>
                <button onclick="handleAddRelation('${userKey}')" style="margin-top: 10px; background-color: var(--primary-color); color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; width: 100%;">ربط الآن</button>
            </div>
        </div>`;

        Swal.fire({
            title: `إدارة علاقات: ${username}`,
            html: htmlContent,
            width: '600px',
            showConfirmButton: false,
            showCloseButton: true
        });

    } catch (error) {
        console.error('خطأ في جلب بيانات العلاقات:', error);
    }
}

/**
 * @function createRelationsListHtml
 * @description Creates HTML for the relations list.
 * @param {Array<object>} list - List of relations.
 * @param {string} currentUserKey - Current User Key.
 * @param {string} currentRoleContext - Current role context ('seller' or 'delivery').
 * @returns {string} HTML code for the list.
 * @see handleToggleRelation
 */
function createRelationsListHtml(list, currentUserKey, currentRoleContext) {
    let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
    list.forEach(item => {
        const actionBtnText = item.isActive ? 'تعطيل' : 'تفعيل';
        const sellerKey = currentRoleContext === 'seller' ? currentUserKey : item.userKey;
        const deliveryKey = currentRoleContext === 'delivery' ? currentUserKey : item.userKey;

        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div>
                    <strong style="display: block;">${item.username || 'بدون اسم'}</strong>
                    <small style="color: #666;">${item.userKey}</small>
                    <span style="font-size: 0.8em; padding: 2px 5px; border-radius: 3px; background: ${item.isActive ? '#d4edda' : '#f8d7da'}; color: ${item.isActive ? '#155724' : '#721c24'}; margin-right: 5px;">${item.isActive ? 'نشط' : 'غير نشط'}</span>
                </div>
                <div>
                    <button onclick="handleToggleRelation('${sellerKey}', '${deliveryKey}', ${!item.isActive}, '${currentUserKey}')" 
                            style="padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; background-color: ${item.isActive ? '#dc3545' : '#28a745'}; color: white; margin-left: 5px;">
                        ${actionBtnText}
                    </button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    return html;
}

/**
 * @function handleAddRelation
 * @description Handles adding a new relation between users.
 * @param {string} currentUserKey - User key of the modal owner.
 * @returns {Promise<void>}
 */
window.handleAddRelation = async (currentUserKey) => {
    const targetUserKey = document.getElementById('newRelUserKey').value.trim();
    const relType = document.getElementById('newRelType').value;

    if (!targetUserKey) {
        Swal.showValidationMessage('يرجى إدخال مفتاح المستخدم');
        return;
    }

    let sellerKey, deliveryKey;
    if (relType === 'delivery') {
        sellerKey = currentUserKey;
        deliveryKey = targetUserKey;
    } else {
        sellerKey = targetUserKey;
        deliveryKey = currentUserKey;
    }

    try {
        const response = await fetch(`${baseURL}/api/suppliers-deliveries`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerKey, deliveryKey, isActive: true })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل الإضافة');

        Swal.fire({
            icon: 'success',
            title: 'تم!',
            text: 'تم إضافة العلاقة بنجاح',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            const title = Swal.getTitle().textContent.replace('إدارة علاقات: ', '');
            showRelationsModal(currentUserKey, title);
        });

    } catch (error) {
        console.error('خطأ في إضافة العلاقة:', error);
    }
};
/**
 * @throws {Error} - If the API call to add the relation fails.
 * @see baseURL
 * @see showRelationsModal
 */

/**
 * @function handleToggleRelation
 * @description Handles toggling relation status (enable/disable).
 * @param {string} sellerKey - Seller Key.
 * @param {string} deliveryKey - Distributor Key.
 * @param {boolean} newStatus - New status to set.
 * @param {string} modalOwnerKey - Key of the modal owner (for refreshing).
 * @returns {Promise<void>}
 */
window.handleToggleRelation = async (sellerKey, deliveryKey, newStatus, modalOwnerKey) => {
    try {
        const response = await fetch(`${baseURL}/api/suppliers-deliveries`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerKey, deliveryKey, isActive: newStatus })
        });

        if (!response.ok) throw new Error('فشل التحديث');

        Swal.fire({
            icon: 'success',
            title: 'تم التحديث',
            timer: 1000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });

        const title = Swal.getTitle().textContent.replace('إدارة علاقات: ', '');
        showRelationsModal(modalOwnerKey, title);

    } catch (error) {
        console.error('خطأ في تحديث العلاقة:', error);
    }
};
/**
 * @throws {Error} - If the API call to update the relation fails.
 * @see baseURL
 * @see showRelationsModal
 */

/**
 * @function loginAsUser
 * @description Impersonation login as another user.
 * @description Swaps the current session with the specified user's session.
 * @param {string} targetUserKey - Target User Key.
 * @returns {Promise<void>}
 */
window.loginAsUser = async (targetUserKey) => {
    try {
        // Confirmation before proceeding
        var result = await Swal.fire({
            title: 'تأكيد الدخول',
            text: 'هل أنت متأكد من رغبتك في الدخول بحساب هذا المستخدم؟ سيتم تسجيل خروجك الحالي.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، دخول',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: 'var(--primary-color)',
            cancelButtonColor: 'var(--danger-color)'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'جاري تبديل المستخدم...',
            text: 'سيتم تسجيل الخروج وتنظيف البيانات الحالية...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 1. Fetch target user data to verify first
        const response = await fetch(`${baseURL}/api/users`);
        const allUsers = await response.json();
        const targetUser = allUsers.find(u => u.user_key === targetUserKey);

        if (!targetUser) throw new Error('المستخدم غير موجود');

        // 2. Use SessionManager to handle impersonation
        await SessionManager.impersonate(targetUser);

    } catch (error) {
        console.error(error);
        Swal.fire("خطأ", error.message || "حدث خطأ أثناء التبديل.", "error");
    }
};
/**
 * @throws {Error} - If the user is not found, no valid admin session exists, or browser data cleanup fails.
 * @see baseURL
 * @see clearAllBrowserData
 */


/**
 * @function sendAdminNotification
 * @description Sends an instant notification to a user from the admin panel.
 * @param {string} userKey - Target User Key.
 * @returns {Promise<void>}
 */
window.sendAdminNotification = async (userKey) => {
    const inputElement = document.getElementById(`notify-input-${userKey}`);
    const messageBody = inputElement ? inputElement.value.trim() : '';

    if (!messageBody) {
        Swal.fire({
            toast: true,
            icon: 'warning',
            title: 'الرجاء كتابة نص الرسالة',
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
        return;
    }

    try {
        Swal.showLoading();

        // 1. Get User Tokens
        const tokens = await getUsersTokens([userKey]);

        if (!tokens || tokens.length === 0) {
            Swal.fire('خطأ', 'هذا المستخدم ليس لديه توكن إشعارات (FCM Token) مسجل.', 'error');
            return;
        }

        // 2. Send Notification
        // ملاحظة: يتم جلب العنوان من القالب الموحد في notificationTools
        const notificationTitle = (window.notificationMessages && window.notificationMessages.admin_manual)
            ? window.notificationMessages.admin_manual.title
            : "إشعار من الإدارة";

        await sendNotificationsToTokens(tokens, notificationTitle, messageBody);

        Swal.fire({
            toast: true,
            icon: 'success',
            title: 'تم الإرسال بنجاح',
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });

        // Clear input
        if (inputElement) inputElement.value = '';

    } catch (error) {
        console.error(error);

    }
};
/**
 * @throws {Error} - If token retrieval fails or the notification cannot be sent.
 * @see getUsersTokens
 * @see sendNotificationsToTokens
 */

/**
 * @function sendBroadcastNotification
 * @description Sends a notification to all users in the system who have an FCM token.
 * @returns {Promise<void>}
 */
window.sendBroadcastNotification = async function () {
    var inputElement = document.getElementById('broadcast-message-input');
    var messageBody = inputElement ? inputElement.value.trim() : '';

    if (!messageBody) {
        Swal.fire({
            toast: true,
            icon: 'warning',
            title: 'الرجاء كتابة نص الرسالة',
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
        return;
    }

    var result = await Swal.fire({
        title: 'تأكيد الإرسال الجماعي',
        text: 'هل أنت متأكد من إرسال هذه الرسالة لجميع المستخدمين؟ قد تستغرق هذه العملية بعض الوقت حسب عدد المستخدمين.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، أرسل للجميع',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: 'var(--primary-color)',
        cancelButtonColor: 'var(--danger-color)'
    });

    if (!result.isConfirmed) return;

    try {
        Swal.fire({
            title: 'جاري التحضير...',
            text: 'يتم جلب بيانات المستخدمين وتجهيز الإشعارات...',
            allowOutsideClick: false,
            didOpen: function () {
                Swal.showLoading();
            }
        });

        // 1. Fetch all users to identify those with FCM tokens
        var users = await getAllUsers_();
        var userKeysWithTokens = users.filter(function (u) { return u.hasFCMToken; }).map(function (u) { return u.user_key; });

        if (userKeysWithTokens.length === 0) {
            Swal.fire('تنبيه', 'لا يوجد مستخدمون لديهم توكن إشعارات (FCM Token) مسجل حالياً في النظام.', 'info');
            return;
        }

        // 2. Get all valid tokens for these users
        var tokens = await getUsersTokens(userKeysWithTokens);

        if (!tokens || tokens.length === 0) {
            Swal.fire('خطأ', 'فشل جلب توكنات المستخدمين من السيرفر.', 'error');
            return;
        }

        // 3. Send Notification
        var notificationTitle = (window.notificationMessages && window.notificationMessages.admin_manual)
            ? window.notificationMessages.admin_manual.title
            : "إشعار عام من الإدارة";

        await sendNotificationsToTokens(tokens, notificationTitle, messageBody);

        Swal.fire({
            icon: 'success',
            title: 'تم الإرسال بنجاح',
            text: 'تم إرسال الرسالة بنجاح إلى ' + tokens.length + ' جهاز.',
            confirmButtonText: 'موافق'
        });

        // Clear input after success
        if (inputElement) inputElement.value = '';

    } catch (error) {
        console.error('[sendBroadcastNotification] Error:', error);
        Swal.fire('خطأ', 'حدث خطأ غير متوقع أثناء إرسال الرسائل الجماعية. يرجى المحاولة مرة أخرى.', 'error');
    }
};

/**
 * @function updateUserField
 * @description Updates a specific field for a user via the API.
 * @param {string} userKey - The user key to identify the user.
 * @param {string} fieldName - The name of the field to update (limitPackage or isDelevred).
 * @param {any} [value] - The value to update (optional, will read from input if not provided).
 * @returns {Promise<void>}
 */
window.updateUserField = async (userKey, fieldName, value) => {
    try {
        var finalValue = value;

        // If field is limitPackage, get value from input if not provided
        if (fieldName === 'limitPackage' && value === undefined) {
            var input = document.getElementById(`limit-input-${userKey}`);
            if (input) {
                finalValue = parseFloat(input.value);
            }
        } else if (fieldName === 'isDelevred') {
            finalValue = parseInt(value, 10);
        }

        if (finalValue === undefined || isNaN(finalValue)) {
            Swal.fire('تنبيه', 'يرجى إدخال قيمة صحيحة', 'warning');
            return;
        }

        // Show loading
        Swal.showLoading();

        var body = {
            user_key: userKey
        };
        body[fieldName] = finalValue;

        console.log('[updateUserField] Sending update request:', body);

        var response = await fetch(`${baseURL}/api/users`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        var result = await response.json();

        if (response.ok) {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: 'تم التحديث بنجاح' });
        } else {
            throw new Error(result.error || 'فشل تحديث البيانات');
        }

    } catch (error) {
        console.error('[updateUserField] Error:', error);
        Swal.fire('خطأ', error.message || 'حدث خطأ أثناء التحديث', 'error');
    }
};

initializeAdminPanel();
