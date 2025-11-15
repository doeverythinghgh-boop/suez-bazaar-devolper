/**
 * @file js/notifications-log-modal.js
 * @description وحدة لعرض سجل الإشعارات من IndexedDB.
 */

/**
 * يعرض نافذة منبثقة بسجل الإشعارات.
 */
async function showNotificationsLogModal() {
  const modalContainer = document.getElementById("notifications-log-modal-container");

  // 1. عرض النافذة مع مؤشر تحميل
  modalContainer.innerHTML = `
    <div class="modal-content large">
      <span class="close-button" id="notifications-log-modal-close-btn">&times;</span>
      <h2><i class="fas fa-history"></i> سجل الإشعارات</h2>
      <div class="loader" style="margin: 2rem auto;"></div>
    </div>`;

  document.body.classList.add("modal-open");
  modalContainer.style.display = "block";

  // 2. إعداد وظيفة الإغلاق
  const closeModal = () => {
    modalContainer.style.display = "none";
    modalContainer.innerHTML = ""; // تنظيف المحتوى عند الإغلاق
    document.body.classList.remove("modal-open");
  };

  modalContainer.querySelector("#notifications-log-modal-close-btn").onclick = closeModal;
  window.addEventListener('click', (event) => {
    if (event.target == modalContainer) closeModal();
  }, { once: true });

  // 3. جلب البيانات من IndexedDB
  // التأكد من وجود الدالة قبل استدعائها
  if (typeof getNotificationLogs !== 'function') {
    console.error("الدالة getNotificationLogs غير معرفة. تأكد من تحميل db-manager.js.");
    modalContainer.querySelector('.modal-content').innerHTML += "<p style='color: red;'>خطأ: لا يمكن تحميل سجل الإشعارات.</p>";
    return;
  }

  const logs = await getNotificationLogs('all', 100); // جلب آخر 100 إشعار
  const modalContentEl = modalContainer.querySelector('.modal-content');

  // 4. بناء المحتوى بعد جلب البيانات
  let contentHTML = `
    <style>
      .modal-header-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
      .modal-header-controls h2 { margin: 0; }
    </style>
    <span class="close-button" id="notifications-log-modal-close-btn">&times;</span>
    <div class="modal-header-controls">
      <h2><i class="fas fa-history"></i> سجل الإشعارات</h2>
      <button id="clear-notifications-btn" class="button delete-btn-small" style="display: none;"><i class="fas fa-trash-alt"></i> مسح الكل</button>
    </div>`;

  if (logs && logs.length > 0) {
    contentHTML += '<div id="notifications-log-list" style="max-height: 65vh; overflow-y: auto; padding-right: 10px;">';
    logs.forEach(log => {
      const logDate = new Date(log.timestamp).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      let iconClass = 'fa-bell';
      let statusClass = log.type; // 'sent' or 'received'
      let titlePrefix = '';

      if (log.type === 'sent') {
        iconClass = 'fa-paper-plane';
        titlePrefix = `إلى: ${log.relatedUser.name}`;
        if (log.status === 'failed') {
          statusClass += ' failed';
          iconClass = 'fa-exclamation-triangle';
        }
      } else { // received
        iconClass = 'fa-inbox';
        titlePrefix = `من: ${log.relatedUser.name}`;
      }

      contentHTML += `
        <div class="notification-log-item ${statusClass}">
          <i class="fas ${iconClass} notification-log-icon"></i>
          <div class="notification-log-content">
            <h4>${log.title}</h4>
            <p>${log.body}</p>
            <p><em>${titlePrefix}</em></p>
            ${log.status === 'failed' ? `<p style="color: #e74c3c;"><strong>سبب الفشل:</strong> ${log.errorMessage || 'غير معروف'}</p>` : ''}
            <div class="notification-log-timestamp">${logDate}</div>
          </div>
        </div>`;
    });
    contentHTML += '</div>';
  } else if (logs) {
    contentHTML += '<p style="text-align: center; padding: 2rem 0;">لا توجد إشعارات مسجلة بعد.</p>';
  } else {
    contentHTML += '<p style="text-align: center; padding: 2rem 0; color: red;">حدث خطأ أثناء تحميل سجل الإشعارات.</p>';
  }

  modalContentEl.innerHTML = contentHTML;
  // إعادة ربط حدث الإغلاق بعد تحديث المحتوى
  modalContentEl.querySelector('#notifications-log-modal-close-btn').onclick = closeModal;

  // ✅ جديد: ربط حدث النقر بزر "مسح الكل"
  const clearBtn = modalContentEl.querySelector('#clear-notifications-btn');
  if (clearBtn && logs && logs.length > 0) {
    clearBtn.style.display = 'inline-flex'; // إظهار الزر فقط إذا كانت هناك سجلات
    clearBtn.addEventListener('click', async () => {
      const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سيتم حذف جميع الإشعارات من السجل نهائيًا. لا يمكن التراجع عن هذا الإجراء.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف الكل!',
        cancelButtonText: 'إلغاء'
      });

      if (result.isConfirmed) {
        if (typeof clearNotificationLogs === 'function') {
          await clearNotificationLogs();
          Swal.fire('تم الحذف!', 'تم مسح سجل الإشعارات بنجاح.', 'success');
          // إعادة رسم النافذة لإظهارها فارغة
          showNotificationsLogModal();
        } else {
          Swal.fire('خطأ', 'الدالة المطلوبة لمسح السجلات غير موجودة.', 'error');
        }
      }
    });
  }
}