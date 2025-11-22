/**
 * @file js/users-admin-modal.js
 * @description موديول مستقل لعرض وإدارة المستخدمين في لوحة تحكم المسؤول.
 */

/**
 * @description يعرض نافذة منبثقة (Modal) لإدارة المستخدمين.
 *   يقوم بتحميل قالب إدارة المستخدمين من `pages/usersAdminModal.html`
 *   ويهيئ المنطق الخاص بإدارة المستخدمين عند الفتح.
 * @function showUsersAdminModal
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see initializeUsersAdminLogic
 */
async function showUsersAdminModal() {
  await loadAndShowModal(
    "users-modal-container",
    "pages/usersAdminModal.html",
    initializeUsersAdminLogic
  );
}

/**
 * @description يهيئ منطق العمل داخل نافذة إدارة المستخدمين،
 *   بما في ذلك جلب المستخدمين وعرضهم، وتفعيل فلاتر البحث والدور،
 *   وإدارة تحديثات أدوار المستخدمين، وإرسال إشعارات لهم.
 * @function initializeUsersAdminLogic
 * @param {HTMLElement} modalContainer - حاوية النافذة المنبثقة.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see fetchUsers
 * @see generateUserCardHTML
 * @see sendNotification
 * @see addNotificationLog
 * @see updateUsers
 */
async function initializeUsersAdminLogic(modalContainer) {
  const contentWrapper = modalContainer.querySelector("#users-admin-modal-content-wrapper");
  const actionsContainer = modalContainer.querySelector("#users-admin-modal-actions");
  const searchInput = modalContainer.querySelector("#users-admin-search-input");
  const roleFilterContainer = modalContainer.querySelector(".user-role-filter-container");
  let allUsers = []; // لتخزين جميع المستخدمين للبحث

  /**
   * @description تعرض قائمة بالمستخدمين في الواجهة على شكل بطاقات.
   *   تُخفي حاوية الإجراءات إذا لم يكن هناك مستخدمين.
   * @function displayUsers
   * @param {Array<Object>} users - مصفوفة من كائنات المستخدمين المراد عرضها.
   * @returns {void}
   * @see generateUserCardHTML
   */
  const displayUsers = (users) => {
    actionsContainer.style.display = 'none';
    if (users && users.length > 0) {
      let usersHTML = '<div class="user-cards-container">';
      users.forEach(u => { usersHTML += generateUserCardHTML(u); });
      usersHTML += `</div>`;
      contentWrapper.innerHTML = usersHTML;
    } else {
      contentWrapper.innerHTML = "<p>لم يتم العثور على مستخدمين.</p>";
    }
  };

  // تحميل المستخدمين لأول مرة
  contentWrapper.innerHTML = '<div class="loader"></div>';
  allUsers = await fetchUsers();
  displayUsers(allUsers);

  /**
   * @description تقوم بتصفية قائمة المستخدمين المعروضة بناءً على نص البحث والدور المحدد.
   *   تُحدّث عرض المستخدمين في الواجهة.
   * @function applyFilters
   * @returns {void}
   * @see displayUsers
   */
  const applyFilters = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedRole = roleFilterContainer.querySelector('input[name="user-role-filter"]:checked').value;

    if (!allUsers) return;

    const filteredUsers = allUsers.filter(user => {
      const matchesSearch = (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                            (user.phone && user.phone.includes(searchTerm));
      
      const matchesRole = !selectedRole || user.is_seller == selectedRole;

      return matchesSearch && matchesRole;
    });

    displayUsers(filteredUsers);
  };

  // ربط الأحداث
  searchInput.addEventListener('input', applyFilters);
  roleFilterContainer.addEventListener('change', applyFilters);
  // ربط الأحداث داخل النافذة المنبثقة
  const modalContent = modalContainer.querySelector('.modal-content');
  const updateBtn = modalContainer.querySelector("#update-users-btn");
  const cancelBtn = modalContainer.querySelector("#cancel-update-btn");

  modalContent.addEventListener('change', (event) => {
    if (event.target.classList.contains('user-role-select')) {
      actionsContainer.style.display = 'flex';
    }
  });

  modalContent.addEventListener('click', async (event) => {
    const sendBtn = event.target.closest('.send-notif-btn');
    if (!sendBtn) return;

    const userKey = sendBtn.dataset.userKey;
    const token = sendBtn.dataset.token;
    const messageInput = document.getElementById(`notif-input-${userKey}`);
    const message = messageInput.value.trim();

    if (!message) {
      Swal.fire({
        title: 'خطأ',
        text: 'الرجاء كتابة رسالة قبل الإرسال.',
        icon: 'error',
        target: modalContainer,
      });
      return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const result = await sendNotification(token, 'رسالة من الإدارة', message);
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';

    // ✅ جديد: تسجيل الإشعار المرسل في IndexedDB
    const recipientUser = allUsers.find(u => u.user_key === userKey);

    if (result && result.success) {
      Swal.fire({
        title: 'تم الإرسال',
        text: 'تم إرسال الإشعار بنجاح.',
        icon: 'success',
        target: modalContainer,
      });
      messageInput.value = '';
      if (typeof addNotificationLog === 'function' && recipientUser) {
        addNotificationLog({
          type: 'sent',
          title: 'رسالة من الإدارة',
          body: message,
          timestamp: new Date(),
          status: 'success',
          relatedUser: { key: recipientUser.user_key, name: recipientUser.username },
        });
      }
    } else {
      Swal.fire({
        title: 'فشل الإرسال',
        text: `حدث خطأ: ${result.error}`,
        icon: 'error',
        target: modalContainer,
      });
      if (typeof addNotificationLog === 'function' && recipientUser) {
        addNotificationLog({
          type: 'sent',
          title: 'رسالة من الإدارة',
          body: message,
          timestamp: new Date(),
          status: 'failed',
          relatedUser: { key: recipientUser.user_key, name: recipientUser.username },
          errorMessage: result.error,
        });
      }
    }
  });

  cancelBtn.addEventListener('click', () => {
    displayUsers(allUsers); // إعادة عرض جميع المستخدمين
  });

  updateBtn.addEventListener('click', async () => {
    const selects = modalContent.querySelectorAll('.user-role-select');
    const updates = [];
    
    selects.forEach(select => {
      const newRole = parseInt(select.value, 10);
      const originalState = parseInt(select.dataset.originalState, 10);
      if (newRole !== originalState) {
        updates.push({ phone: select.dataset.phone, is_seller: newRole });
      }
    });

    if (updates.length === 0) {
      actionsContainer.style.display = 'none';
      return;
    }

    const updateResult = await updateUsers(updates);
    if (updateResult && !updateResult.error) {
      Swal.fire({
        title: 'تم التحديث!',
        text: 'تم حفظ التغييرات بنجاح.',
        icon: 'success',
        target: modalContainer
      });
      // تحديث الحالة الأصلية في الواجهة لتجنب الحفظ المتكرر
      updates.forEach(upd => {
        const selectEl = modalContent.querySelector(`.user-role-select[data-phone="${upd.phone}"]`);
        if(selectEl) selectEl.dataset.originalState = upd.is_seller;
      });
      actionsContainer.style.display = 'none';
    } else {
      Swal.fire({
        title: 'خطأ!', text: 'فشل تحديث البيانات.', icon: 'error', target: modalContainer
      });
    }
  });
}