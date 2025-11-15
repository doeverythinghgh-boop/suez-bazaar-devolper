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
    <span class="close-button" id="notifications-log-modal-close-btn">&times;</span>
    <h2><i class="fas fa-history"></i> سجل الإشعارات</h2>`;

  if (logs && logs.length > 0) {
    contentHTML += '<div id="notifications-log-list">';
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
}