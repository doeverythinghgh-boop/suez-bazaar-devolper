/**
 * @file js/reports-modal.js
 * @description يحتوي على المنطق الخاص بعرض التقارير مثل حركة المشتريات.
 */

/**
 * ينشئ شريط تقدم زمني (Timeline) لحالة الطلب.
 * @param {string} orderKey - المفتاح الفريد للطلب.
 * @param {object} statusDetails - كائن تفاصيل الحالة (id, state, description).
 * @param {boolean} canEdit - يحدد ما إذا كان المستخدم لديه صلاحية تعديل هذا الطلب بشكل عام.
 * @param {number} userRole - دور المستخدم الحالي (1=بائع, 2=خدمة توصيل, 3=مسؤول).
 * @returns {string} - كود HTML لشريط التقدم.
 */
function createStatusTimelineHTML(orderKey, statusDetails, canEdit, userRole) {
  const currentStatusId = statusDetails ? statusDetails.id : -1;

  const progressStates = [
    ORDER_STATUS_MAP.REVIEW,
    ORDER_STATUS_MAP.CONFIRMED,
    ORDER_STATUS_MAP.SHIPPED,
    ORDER_STATUS_MAP.DELIVERED
  ];

  // إذا كانت تفاصيل الحالة غير موجودة، اعرض حالة غير معروفة
  if (!statusDetails) {
    return `<p class="timeline-description">حالة الطلب غير معروفة.</p>`;
  }

  if (!progressStates.some(p => p.id === currentStatusId)) {
    const statusClass = `status-${currentStatusId}`;
    let icon = 'fa-info-circle';
    if (currentStatusId === ORDER_STATUS_MAP.CANCELLED.id || currentStatusId === ORDER_STATUS_MAP.REJECTED.id) {
      icon = 'fa-times-circle';
    } else if (currentStatusId === ORDER_STATUS_MAP.RETURNED.id) {
      icon = 'fa-undo-alt';
    }

    return `
      <div class="status-timeline-exception-wrapper">
        <div class="status-timeline-exception ${statusClass}">
          <i class="fas ${icon}"></i>
          <span>${statusDetails.state}</span>
        </div>
        <p class="timeline-description">${statusDetails.description}</p>
      </div>
    `;
  }

  let timelineHTML = '<div class="status-timeline">';
  progressStates.forEach((state, index) => {
    const isActive = currentStatusId >= state.id;
    const isCurrent = currentStatusId === state.id;

    // ✅ جديد: تحديد ما إذا كانت هذه الخطوة *المحددة* قابلة للتعديل.
    let isStepEditable = canEdit;
    // إذا كان المستخدم بائعًا (1)، فإنه لا يمكنه تعديل حالة "تم التسليم".
    if (userRole === 1 && state.id === ORDER_STATUS_MAP.DELIVERED.id) {
      isStepEditable = false;
    }
    // ✅ جديد: إذا كان المستخدم خدمة توصيل (2)، يمكنه فقط تعديل "تم الشحن" و "تم التسليم".
    if (userRole === 2) {
      const allowedDeliveryStatuses = [ORDER_STATUS_MAP.SHIPPED.id, ORDER_STATUS_MAP.DELIVERED.id];
      // اجعل الخطوة قابلة للتعديل فقط إذا كانت ضمن الحالات المسموح بها لخدمة التوصيل.
      isStepEditable = canEdit && allowedDeliveryStatuses.includes(state.id);
    }

    const editableClass = isStepEditable ? 'editable-step' : '';
    const stepClass = isActive ? 'active' : '';
    const currentClass = isCurrent ? 'current' : '';

    // ✅ جديد: إضافة سمات البيانات لتخزين المعلومات اللازمة للتحديث
    const dataAttributes = isStepEditable 
      ? `data-order-key="${orderKey}" data-status-id="${state.id}"` 
      : '';

    timelineHTML += `
      <div class="timeline-step ${stepClass} ${currentClass} ${editableClass}" title="${state.description}" ${dataAttributes}>
        <div class="timeline-dot"></div>
        <div class="timeline-label">${state.state}</div>
      </div>
    `;
    if (index < progressStates.length - 1) {
      timelineHTML += `<div class="timeline-line ${stepClass}"></div>`;
    }
  });
  timelineHTML += '</div>';

  const descriptionHTML = `<p class="timeline-description">${statusDetails.description}</p>`;

  return timelineHTML + descriptionHTML;
}

/**
 * يعرض نافذة منبثقة بحركة المشتريات لجميع الطلبات.
 * @param {string} userKey - مفتاح المستخدم الذي يطلب التقرير.
 */
async function showSalesMovementModal(userKey) {
  await loadAndShowModal("sales-movement-modal-container", "../js/salesMovementModal.html", async (modal) => {
    const contentWrapper = modal.querySelector("#sales-movement-content-wrapper");
    contentWrapper.innerHTML = '<div class="loader" style="margin: 2rem auto;"></div>';

  const orders = await getSalesMovement(userKey);
  // ✅ إصلاح: جلب بيانات المستخدم الحالي للتحقق مما إذا كان مسؤولاً أم لا
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  // سيتم إخفاء البيانات فقط إذا لم يكن المستخدم مسؤولاً.
  // adminPhoneNumbers معرفة في js/config.js
  const isAdmin = loggedInUser && adminPhoneNumbers.includes(loggedInUser.phone);

  // ✅ تتبع للمطور: عرض بيانات المستخدم المسجل دخوله لتأكيد دوره
  console.log('%c[DEV-LOG] showSalesMovementModal: بيانات المستخدم المسجل دخوله:', 'color: purple;', loggedInUser);
  console.log(`%c[DEV-LOG] showSalesMovementModal: هل المستخدم مسؤول (isAdmin)؟ -> ${isAdmin}`, 'color: purple;');

  // ✅ تتبع: تسجيل البيانات فور استلامها من الخادم
  console.log('%c[DEV-LOG] showSalesMovementModal: البيانات المستلمة من getSalesMovement():', 'color: blue; font-weight: bold;', orders);

  if (orders && orders.length > 0) {
    contentWrapper.innerHTML = `<div id="sales-movement-list">
        ${orders.map(order => generateSalesMovementItemHTML(order, loggedInUser, isAdmin)).join('')}
      </div>`;
  } else {
    contentWrapper.innerHTML = '<p style="text-align: center; padding: 2rem 0;">لا توجد طلبات لعرضها.</p>';
  }

  // ✅ جديد: إضافة مستمع حدث للنقر على خطوات الحالة القابلة للتعديل
  contentWrapper.addEventListener('click', async (event) => {
    const stepElement = event.target.closest('.editable-step');
    if (!stepElement) return;

    // ✅ جديد: التحقق مما إذا كانت الحالة المحددة نشطة بالفعل.
    // إذا كانت كذلك، لا تفعل شيئًا لمنع إعادة التفعيل.
    if (stepElement.classList.contains('active')) {
      return; // إيقاف التنفيذ لأن الحالة نشطة بالفعل
    }

    const orderKey = stepElement.dataset.orderKey;
    const newStatusId = parseInt(stepElement.dataset.statusId, 10);
    const statusInfo = ORDER_STATUSES.find(s => s.id === newStatusId);

    if (!orderKey || isNaN(newStatusId) || !statusInfo) {
      console.error('بيانات تحديث الحالة غير مكتملة:', stepElement.dataset);
      return;
    }

    const result = await Swal.fire({
      title: 'تأكيد التفعيل',
      html: `هل أنت متأكد من تفعيل حالة الطلب رقم <strong>${orderKey}</strong> إلى <strong>"${statusInfo.state}"</strong>؟<br><small>ملاحظة: لا يمكن التراجع عن هذا الإجراء.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، قم بالتفعيل!',
      cancelButtonText: 'إلغاء',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        return await updateOrderStatus(orderKey, newStatusId);
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (result.isConfirmed) {
      if (result.value && !result.value.error) {
        Swal.fire('تم التحديث!', 'تم تحديث حالة الطلب بنجاح.', 'success');
        // إعادة تحميل النافذة لعرض التغييرات
        showSalesMovementModal(userKey);
      } else {
        Swal.fire(
          'فشل التحديث',
          `حدث خطأ: ${result.value ? result.value.error : 'غير معروف'}`,
          'error'
        );
      }
    }
  });

  // ✅ جديد: ربط حدث النقر بأزرار "عرض المنتج"
  contentWrapper.querySelectorAll('.view-product-details-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      // ✅ تتبع: تسجيل الحدث عند النقر على الزر
      console.log('%c[DEV-LOG] تم النقر على زر "عرض تفاصيل المنتج".', 'color: purple; font-weight: bold;');
      const productKey = event.currentTarget.dataset.productKey;
      // ✅ تتبع: تسجيل المفتاح الذي تم قراءته من الزر
      console.log(`[DEV-LOG] المفتاح المقروء من data-product-key هو: "${productKey}"`);

      if (!productKey) {
        Swal.fire('خطأ', 'بيانات المنتج غير متوفرة لعرض التفاصيل.', 'error');
        return;
      }

      // ✅ إصلاح: جلب بيانات المنتج الكاملة من الواجهة الخلفية باستخدام مفتاح المنتج
      Swal.fire({ title: 'جاري تحميل تفاصيل المنتج...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const productData = await getProductByKey(productKey); // افتراض وجود هذه الدالة في connect1.js
      Swal.close();

      if (productData) {
        // تحويل البيانات لتتناسب مع ما تتوقعه دالة showProductDetails
        const productDataForModal = {
          ...productData,
          pricePerItem: productData.product_price,
          availableQuantity: productData.product_quantity,
          sellerMessage: productData.user_message,
          description: productData.product_description,
          imageSrc: productData.ImageName ? productData.ImageName.split(',').map(name => `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${name}`) : [],
          MainCategory: productData.MainCategory, // ✅ إضافة: تمرير ID الفئة الرئيسية
          SubCategory: productData.SubCategory    // ✅ إضافة: تمرير ID الفئة الفرعية
        };
        // ✅ تعديل: تمرير خيار لإخفاء زر "إضافة إلى السلة"
        window.showProductDetails(productDataForModal, null, { showAddToCart: false });
      } else {
        Swal.fire('خطأ', 'فشل في جلب تفاصيل المنتج. قد يكون المنتج قد تم حذفه.', 'error');
      }
    });
  });
  });
}