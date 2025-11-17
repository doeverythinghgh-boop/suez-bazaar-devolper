/**
 * @file js/users-admin-modal.js
 * @description موديول مستقل لعرض وإدارة المستخدمين في لوحة تحكم المسؤول.
 */

/**
 * يعرض نافذة منبثقة لإدارة المستخدمين.
 */
async function showUsersAdminModal() {
  const modalContainer = document.getElementById("users-modal-container");

  // 1. تحميل هيكل النافذة من ملف HTML منفصل
  try {
    const response = await fetch("pages/usersAdminModal.html");
    if (!response.ok) throw new Error("Failed to load modal structure.");
    modalContainer.innerHTML = await response.text();
  } catch (error) {
    console.error("Error loading users admin modal:", error);
    Swal.fire('خطأ', 'فشل تحميل واجهة إدارة المستخدمين.', 'error');
    return;
  }

  document.body.classList.add("modal-open");
  modalContainer.style.display = "block";

  // 2. إعداد وظيفة الإغلاق
  const closeModal = () => {
    modalContainer.style.display = "none";
    modalContainer.innerHTML = "";
    document.body.classList.remove("modal-open");
  };

  modalContainer.querySelector("#users-admin-modal-close-btn").onclick = closeModal;
  window.addEventListener('click', (event) => {
    if (event.target === modalContainer) closeModal();
  }, { once: true });

  // 3. تحميل وعرض بيانات المستخدمين وربط الأحداث
  await initializeUsersAdminLogic(modalContainer);
}

/**
 * يهيئ منطق العمل داخل نافذة إدارة المستخدمين.
 * @param {HTMLElement} modalContainer - حاوية النافذة المنبثقة.
 */
async function initializeUsersAdminLogic(modalContainer) {
  const contentWrapper = modalContainer.querySelector("#users-admin-modal-content-wrapper");
  const actionsContainer = modalContainer.querySelector("#users-admin-modal-actions");
  const searchInput = modalContainer.querySelector("#users-admin-search-input");
  const roleFilterContainer = modalContainer.querySelector(".user-role-filter-container");
  let allUsers = []; // لتخزين جميع المستخدمين للبحث

  // دالة لعرض المستخدمين بناءً على مصفوفة بيانات
  const displayUsers = (users) => {
    actionsContainer.style.display = 'none';
    if (users && users.length > 0) {
      let usersHTML = '<div class="user-cards-container">';
      users.forEach(u => {
        // ✅ تعديل: التحقق من أهلية المستخدم لاستقبال الإشعارات قبل عرض الواجهة.
        let notificationUI = '';
        // نستخدم الدالة المساعدة الموجودة في auth.js
        if (isUserEligibleForNotifications(u)) {
          // إذا كان المستخدم مؤهلاً، تحقق مما إذا كان لديه توكن مسجل.
          if (u.fcm_token) {
            notificationUI = `<div class="notification-sender">
                 <input type="text" placeholder="اكتب رسالتك هنا..." class="notification-input" id="notif-input-${u.user_key}">
                 <button class="send-notif-btn" data-token="${u.fcm_token}" data-user-key="${u.user_key}" title="إرسال"><i class="fas fa-paper-plane"></i></button>
               </div>`;
          } else {
            // مؤهل لكن لم يسجل جهازه بعد.
            notificationUI = '<span class="no-token">مؤهل (لم يسجل الجهاز)</span>';
          }
        } else {
          // غير مؤهل (مثل العملاء العاديين).
          notificationUI = '<span class="no-token">غير مؤهل للإشعارات</span>';
        }

        // ✅ جديد: التحقق إذا كان المستخدم مسؤولاً لعرض دوره كنص ثابت
        const isAdmin = adminPhoneNumbers.includes(u.phone);
        let roleUI;
        if (isAdmin) {
          // إذا كان المستخدم مسؤولاً، اعرض نصًا ثابتًا
          roleUI = `<div class="user-role-static"><i class="fas fa-user-shield"></i> <span>مسؤول</span></div>`;
        } else {
          // إذا لم يكن مسؤولاً، اعرض القائمة المنسدلة كالمعتاد
          roleUI = `<select id="role-select-${u.user_key}" class="user-role-select" data-phone="${u.phone}" data-original-state="${u.is_seller}">
                      <option value="0" ${u.is_seller === 0 ? 'selected' : ''}>عميل</option>
                      <option value="1" ${u.is_seller === 1 ? 'selected' : ''}>بائع</option>
                      <option value="2" ${u.is_seller === 2 ? 'selected' : ''}>خدمة توصيل</option>
                    </select>`;
        }

        usersHTML += `
          <div class="user-card" data-phone="${u.phone}">
            <div class="user-card-header">
              <i class="fas fa-user-circle user-avatar"></i>
              <div class="user-info">
                <span class="user-name">${u.username || 'غير متوفر'}</span>
                <span class="user-phone">${u.phone}</span>
              </div>
            </div>
            <div class="user-card-body">
              <div class="user-card-field">
                <label for="role-select-${u.user_key}">دور المستخدم</label>
                ${roleUI}
              </div>
              <div class="user-card-field">
                <label>إرسال إشعار</label>
                ${notificationUI}
              </div>
            </div>
          </div>`;
      });
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

  // دالة التصفية الموحدة
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
        target: modalContainer, // ✅ إصلاح: ربط الرسالة بالنافذة المنبثقة لضمان ظهورها في المقدمة
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
        target: modalContainer, // ✅ إصلاح: ربط الرسالة بالنافذة المنبثقة لضمان ظهورها في المقدمة
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
        target: modalContainer, // ✅ إصلاح: ربط الرسالة بالنافذة المنبثقة لضمان ظهورها في المقدمة
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
      Swal.fire('تم التحديث!', 'تم حفظ التغييرات بنجاح.', 'success');
      // تحديث الحالة الأصلية في الواجهة لتجنب الحفظ المتكرر
      updates.forEach(upd => {
        const selectEl = modalContent.querySelector(`.user-role-select[data-phone="${upd.phone}"]`);
        if(selectEl) selectEl.dataset.originalState = upd.is_seller;
      });
      actionsContainer.style.display = 'none';
    } else {
      Swal.fire('خطأ!', 'فشل تحديث البيانات.', 'error');
    }
  });
}