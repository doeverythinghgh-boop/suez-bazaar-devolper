/**
 * @file js/notifications-log-modal.js
 * @description وحدة لعرض سجل الإشعارات من IndexedDB.
 */

/**
 * يعرض نافذة منبثقة بسجل الإشعارات.
 */
async function showNotificationsLogModal() {
  const handleNewNotification = (event) => {
    // ✅ إصلاح: التحقق مما إذا كانت النافذة مفتوحة بالفعل قبل تحديثها.
    // هذا يمنع النافذة من الظهور تلقائيًا إذا كانت مغلقة.
    // ✅ إصلاح: الوصول إلى عنصر النافذة مباشرة لتجنب خطأ مرجعي.
    const modal = document.getElementById("notifications-log-modal-container");

    if (!modal || modal.style.display !== 'block') {
      console.log('[NotificationsModal] تم استقبال إشعار جديد، لكن النافذة مغلقة أو غير موجودة. سيتم تجاهل تحديث الواجهة.');
      return; // إيقاف التنفيذ إذا كانت النافذة غير مرئية
    }

    const newLog = event.detail;
    console.log('[NotificationsModal] تم استقبال إشعار جديد عبر الحدث، سيتم تحديث الواجهة:', newLog);

    // ✅ تحسين: إضافة الإشعار الجديد مباشرة إلى أعلى القائمة بدلاً من إعادة تحميل النافذة.
    // هذا يضمن الحفاظ على الترتيب التنازلي ويمنع وميض إعادة التحميل.
    const listContainer = document.getElementById('notifications-log-list');
    if (listContainer) {      
      // إضافة العنصر الجديد في بداية القائمة
      listContainer.insertAdjacentHTML('afterbegin', generateNotificationLogItemHTML(newLog));
    } else {
      // كحل بديل إذا لم تكن القائمة موجودة (مثلاً كانت فارغة)، أعد تحميل النافذة
      showNotificationsLogModal();
    }
  };

  await loadAndShowModal(
    "notifications-log-modal-container",
    "js/notificationsLogModal.html",
    async (modal) => {
      window.addEventListener('notificationLogAdded', handleNewNotification);

      const contentWrapper = modal.querySelector("#notifications-log-content-wrapper");
      contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

      if (typeof getNotificationLogs !== 'function') {
        console.error("الدالة getNotificationLogs غير معرفة. تأكد من تحميل db-manager.js.");
        contentWrapper.innerHTML = "<p style='color: red;'>خطأ: لا يمكن تحميل سجل الإشعارات.</p>";
        return;
      }

      const logs = await getNotificationLogs('all', 100);

      if (logs && logs.length > 0) {
        contentWrapper.innerHTML = `
          <div id="notifications-log-list" style="max-height: 60vh; overflow-y: auto; padding-right: 10px;">
            ${logs.map(generateNotificationLogItemHTML).join('')}
          </div>
          <div class="modal-footer-controls">
            <button id="clear-notifications-btn" class="button delete-btn-small"><i class="fas fa-trash-alt"></i> مسح الكل</button>
          </div>`;

        modal.querySelector('#clear-notifications-btn').addEventListener('click', async () => {
          const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "سيتم حذف جميع الإشعارات من السجل نهائيًا.",
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
              // ✅ تحسين: تحديث الواجهة مباشرة بدلاً من إعادة تحميل النافذة بالكامل.
              contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0;">لا توجد إشعارات مسجلة بعد.</p>';
            } else {
              Swal.fire('خطأ', 'الدالة المطلوبة لمسح السجلات غير موجودة.', 'error');
            }
          }
        });
      } else if (logs) {
        contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0;">لا توجد إشعارات مسجلة بعد.</p>';
      } else {
        contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0; color: red;">حدث خطأ أثناء تحميل سجل الإشعارات.</p>';
      }
    },
    () => {
      // onClose callback
      if (handleNewNotification) {
        window.removeEventListener('notificationLogAdded', handleNewNotification);
      }
    }
  );
}