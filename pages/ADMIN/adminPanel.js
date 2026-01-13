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
 */
let allUsers_cache = []; // ✅ كاش محلي لتخزين جميع المستخدمين لغرض الفلترة
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
 * @description Populates the users dashboard with cards based on the provided data.
 * @function renderUsersCards
 * @param {Array<object>} users - Array containing user objects.
 * @returns {void}
 */
function renderUsersCards(users) {
    const grid = document.getElementById('admin-panel-users-grid');
    const countBadge = document.getElementById('users-count-badge');

    if (!grid) return;
    grid.innerHTML = '';

    // Update badge count
    if (countBadge) countBadge.innerText = users.length;

    if (!users || users.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">لا يوجد مستخدمون يطابقون بحثك.</div>`;
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.id = `user-card-${user.user_key}`;

        const tokenStatusIcon = user.hasFCMToken
            ? '<i class="fas fa-check-circle" style="color: var(--success-color);" title="لديه توكن"></i>'
            : '<i class="fas fa-times-circle" style="color: var(--danger-color);" title="لا يوجد توكن"></i>';

        let roleBtnClass = 'btn-role-manage';
        let roleText = 'إدارة الحساب';
        if (user.isSeller && user.isDelivery) { roleBtnClass = 'btn-role-both'; roleText = 'بائع وموزع'; }
        else if (user.isSeller) { roleBtnClass = 'btn-role-seller'; roleText = 'حساب بائع'; }
        else if (user.isDelivery) { roleBtnClass = 'btn-role-delivery'; roleText = 'حساب موزع'; }

        card.innerHTML = `
            <div class="card-header">
                <div class="user-info-main">
                    <h3 class="copy-able" onclick="copyToClipboard('${user.username}')">${user.username || 'بدون اسم'}</h3>
                    <span class="user-key-badge copy-able" onclick="copyToClipboard('${user.user_key}')">${user.user_key}</span>
                </div>
                <div class="token-status-icon">${tokenStatusIcon}</div>
            </div>

            <div class="card-body-details">
                <div class="detail-item">
                    <span class="detail-label">الهاتف</span>
                    <span class="detail-value copy-able" onclick="copyToClipboard('${user.phone}')">${user.phone || '—'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">كلمة المرور</span>
                    <span class="detail-value copy-able" onclick="copyToClipboard('${user.Password}')">${user.Password || '—'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">العنوان</span>
                    <span class="detail-value copy-able" onclick="copyToClipboard('${user.Address}')">${user.Address || '—'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">المنصة</span>
                    <span class="detail-value">${user.tokenPlatform || 'None'}</span>
                </div>
            </div>

            <div class="card-actions-row">
                <!-- Role & Relations -->
                <div class="card-action-group">
                    <span class="group-title">الأدوار والعلاقات</span>
                    <button class="btn-delivery-status ${roleBtnClass}" style="width: 100%" onclick="showRelationsModal('${user.user_key}', '${user.username}')">
                        ${roleText}
                    </button>
                </div>

                <!-- Package & Delivery Status -->
                <div class="card-action-group">
                    <span class="group-title">إعدادات التسليم</span>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div class="flex-actions">
                            <input type="number" id="limit-input-${user.user_key}" value="${user.limitPackage}" class="input-small" placeholder="حد الباقة">
                            <button class="btn-delivery-status" style="background-color: var(--success-color);" onclick="updateUserField('${user.user_key}', 'limitPackage')">
                                <i class="fas fa-save"></i>
                            </button>
                        </div>
                        <div class="status-radio-group">
                            <label class="radio-option">
                                <input type="radio" name="isDelevred-${user.user_key}" value="1" ${user.isDelevred == 1 ? 'checked' : ''} onchange="updateUserField('${user.user_key}', 'isDelevred', this.value)"> نعم
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="isDelevred-${user.user_key}" value="0" ${user.isDelevred == 0 ? 'checked' : ''} onchange="updateUserField('${user.user_key}', 'isDelevred', this.value)"> لا
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Fast Communication -->
                <div class="card-action-group">
                    <span class="group-title">رسائل ذكية</span>
                    <div class="flex-actions">
                        <input type="text" id="notify-input-${user.user_key}" placeholder="نص الإشعار..." class="input-small">
                        <button class="btn-delivery-status" style="background-color: #ffc107; color: #000;" onclick="sendAdminNotification('${user.user_key}')">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>

                <!-- Secure Login -->
                <button class="btn-delivery-status" style="background-color: #17a2b8; width: 100%; font-weight: bold;" onclick="loginAsUser('${user.user_key}')">
                    <i class="fas fa-sign-in-alt"></i> دخول بالحساب
                </button>
            </div>
        `;

        // Add selection listener
        card.onclick = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') return;
            selectUserCard(user.user_key, user.username);
        };

        grid.appendChild(card);
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
    const cardsContainer = document.getElementById('admin-panel-cards-container');
    const searchBar = document.getElementById('admin-panel-search-bar');
    const errorContainer = document.createElement('div');
    errorContainer.className = 'admin-panel-error';
    errorContainer.style.textAlign = 'center'; errorContainer.style.padding = '20px'; errorContainer.style.color = 'var(--danger-color)';

    try {
        loader.style.display = 'flex';
        cardsContainer.style.display = 'none';
        searchBar.style.display = 'none';

        const users = await getAllUsers_();
        allUsers_cache = users; // حفظ في الكاش لعملية البحث

        renderUsersCards(users);

        loader.style.display = 'none';
        cardsContainer.style.display = 'block';
        searchBar.style.display = 'flex';

        // Setup Search Listeners
        const searchInput = document.getElementById('admin-search-input');
        const searchType = document.getElementById('admin-search-type');

        if (searchInput) searchInput.oninput = handleAdminSearch;
        if (searchType) searchType.onchange = handleAdminSearch;

        // ✅ Show broadcast section
        var broadcastSection = document.getElementById('admin-panel-broadcast-section');
        if (broadcastSection) broadcastSection.style.display = 'block';

    } catch (error) {
        console.error('[initializeAdminPanel] فشل تهيئة لوحة التحكم:', error);
        loader.style.display = 'none';
        errorContainer.innerHTML = `<p>حدث خطأ أثناء تحميل بيانات المستخدمين.</p><p><small>${error.message}</small></p>`;
        const mainContainer = document.querySelector('.admin-panel-container');
        if (mainContainer) mainContainer.appendChild(errorContainer);
    }
}

/**
 * @description Handles live search and filtering based on the search bar inputs.
 * @function handleAdminSearch
 */
function handleAdminSearch() {
    const query = document.getElementById('admin-search-input').value.toLowerCase().trim();
    const type = document.getElementById('admin-search-type').value;

    const filtered = allUsers_cache.filter(user => {
        if (!query) return true;

        if (type === 'all') {
            return Object.values(user).some(val =>
                String(val).toLowerCase().includes(query)
            );
        }

        if (type === 'hasFCMToken') {
            const hasToken = user.hasFCMToken ? 'نعم' : 'لا';
            return hasToken.includes(query) || (query === 'yes' && user.hasFCMToken) || (query === 'no' && !user.hasFCMToken);
        }

        if (type === 'role') {
            const roles = [];
            if (user.isSeller) roles.push('بائع', 'seller');
            if (user.isDelivery) roles.push('موزع', 'delivery');
            if (roles.length === 0) roles.push('إدارة', 'manage', 'none');
            return roles.some(r => r.includes(query));
        }

        if (type === 'isDelevred') {
            const status = user.isDelevred == 1 ? 'نعم' : 'لا';
            return status.includes(query);
        }

        const value = user[type];
        return String(value || '').toLowerCase().includes(query);
    });

    renderUsersCards(filtered);
}

/**
 * @description Manages visual selection of a user card.
 * @function selectUserCard
 */
function selectUserCard(userKey, username) {
    // 1. Clear previous selections
    const allCards = document.querySelectorAll('.user-card');
    allCards.forEach(c => c.classList.remove('selected-card'));

    // 2. Add highlight to the active card
    const activeCard = document.getElementById(`user-card-${userKey}`);
    if (activeCard) activeCard.classList.add('selected-card');

    // 3. Update title display
    const selectedUserDisplay = document.getElementById('selected-user-display');
    if (selectedUserDisplay) {
        selectedUserDisplay.innerText = `(${username})`;
    }
}

/**
 * @description Helper to copy text to clipboard and show toast.
 * @function copyToClipboard
 */
window.copyToClipboard = (text) => {
    if (!text || ['غير متوفر', 'لا يوجد', '-', 'N/A', '—'].includes(text)) return;

    navigator.clipboard.writeText(text).then(() => {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: 'تم النسخ: ' + text });
    }).catch(err => console.error('فشل النسخ', err));
};

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
                    <span class="status-badge ${item.isActive ? 'status-active' : 'status-inactive'}">${item.isActive ? 'نشط' : 'غير نشط'}</span>
                </div>
                <div>
                    <button onclick="handleToggleRelation('${sellerKey}', '${deliveryKey}', ${!item.isActive}, '${currentUserKey}')" 
                            class="action-btn ${item.isActive ? 'btn-danger' : 'btn-success'}">
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
            // ✅ تحديث الكاش المحلي لضمان دقة البحث فوراً دون إعادة التحميل
            const cachedUser = allUsers_cache.find(u => u.user_key === userKey);
            if (cachedUser) {
                cachedUser[fieldName] = finalValue;
                console.log(`[updateUserField] Updated cache for ${userKey}: ${fieldName} = ${finalValue}`);
            }

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
