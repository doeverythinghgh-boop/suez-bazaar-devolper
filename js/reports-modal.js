/**
 * @file js/reports-modal.js
 * @description يحتوي على المنطق الخاص بعرض التقارير مثل حركة المشتريات.
 */

/**
 * @description ينشئ شريط تقدم زمني (Timeline) لحالة الطلب، مع تحديد الخطوات النشطة
 *   والخطوات القابلة للتعديل بناءً على دور المستخدم وصلاحياته.
 * @function createStatusTimelineHTML
 * @param {string | null} orderKey - المفتاح الفريد للطلب الذي يتم إنشاء شريط التقدم له.
 * @param {object} statusDetails - كائن يحتوي على تفاصيل الحالة الحالية للطلب (id, state, description).
 * @param {string | null} statusTimestamp - التاريخ بصيغة ISO للحالة الحالية.
 * @param {boolean} canEdit - قيمة منطقية تحدد ما إذا كان المستخدم لديه صلاحية تعديل هذا الطلب بشكل عام.
 * @param {number} userRole - دور المستخدم الحالي (على سبيل المثال: 1=بائع, 2=خدمة توصيل, 3=مسؤول).
 * @returns {string} - كود HTML الذي يمثل شريط التقدم الزمني للحالة.
 * @see ORDER_STATUS_MAP
 */
function createStatusTimelineHTML(
  orderKey,
  statusDetails,
  statusTimestamp,
  canEdit,
  userRole
) {
  const currentStatusId = statusDetails ? statusDetails.id : -1; // لا تغيير هنا، سنمرر statusDetails الصحيح

  const progressStates = [
    ORDER_STATUS_MAP.REVIEW,
    ORDER_STATUS_MAP.CONFIRMED,
    ORDER_STATUS_MAP.SHIPPED,
    ORDER_STATUS_MAP.DELIVERED,
  ];

  // إذا كانت تفاصيل الحالة غير موجودة، اعرض حالة غير معروفة
  if (!statusDetails) {
    return `<p class="timeline-description text-center">حالة الطلب غير معروفة.</p>`;
  }

  // ✅ جديد: تنسيق التاريخ لإضافته إلى الوصف
  let descriptionText = statusDetails.description;
  if (statusTimestamp) {
    const date = new Date(statusTimestamp);
    // التحقق من أن التاريخ صالح قبل عرضه
    if (!isNaN(date.getTime())) {
      const formattedDate = date.toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      descriptionText += ` <span class="status-date">(بتاريخ: ${formattedDate})</span>`;
    }
  }

  if (!progressStates.some((p) => p.id === currentStatusId)) {
    const statusClass = `status-${currentStatusId}`;
    let icon = "fa-info-circle";
    if (
      currentStatusId === ORDER_STATUS_MAP.CANCELLED.id ||
      currentStatusId === ORDER_STATUS_MAP.REJECTED.id
    ) {
      icon = "fa-times-circle";
    } else if (currentStatusId === ORDER_STATUS_MAP.RETURNED.id) {
      icon = "fa-undo-alt";
    }

    return `
      <div class="status-timeline-exception-wrapper">
        <div class="status-timeline-exception ${statusClass}">
          <i class="fas ${icon}"></i>
          <span>${statusDetails.state}</span>
        </div>
        <p class="timeline-description">${descriptionText}</p>
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
      const allowedDeliveryStatuses = [
        ORDER_STATUS_MAP.SHIPPED.id,
        ORDER_STATUS_MAP.DELIVERED.id,
      ];
      // اجعل الخطوة قابلة للتعديل فقط إذا كانت ضمن الحالات المسموح بها لخدمة التوصيل.
      isStepEditable = canEdit && allowedDeliveryStatuses.includes(state.id);
    }

    const editableClass = isStepEditable ? "editable-step" : "";
    const stepClass = isActive ? "active" : "";
    const currentClass = isCurrent ? "current" : "";

    // ✅ جديد: إضافة سمات البيانات لتخزين المعلومات اللازمة للتحديث
    const dataAttributes = isStepEditable
      ? `data-order-key="${orderKey}" data-status-id="${state.id}"`
      : "";

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
  timelineHTML += "</div>";

  const descriptionHTML = `<p class="timeline-description">${descriptionText}</p>`;

  return timelineHTML + descriptionHTML;
}

/**
 * @description يعالج حدث النقر لتحديث حالة الطلب.
 * @param {MouseEvent} event - كائن الحدث.
 * @param {string} userKey - مفتاح المستخدم الحالي لإعادة تحميل النافذة.
 */
async function handleStatusUpdateClick(event, userKey) {
  const stepElement = event.target.closest(".editable-step");
  if (!stepElement) return;

  // منع إعادة التفعيل إذا كانت الحالة نشطة بالفعل
  if (stepElement.classList.contains("active")) {
    return;
  }

  const orderKey = stepElement.dataset.orderKey;
  const newStatusId = parseInt(stepElement.dataset.statusId, 10);
  const statusInfo = ORDER_STATUSES.find((s) => s.id === newStatusId);

  if (!orderKey || isNaN(newStatusId) || !statusInfo) {
    console.error("بيانات تحديث الحالة غير مكتملة:", stepElement.dataset);
    return;
  }

  const result = await Swal.fire({
    title: "تأكيد التفعيل",
    html: `هل أنت متأكد من تفعيل حالة الطلب رقم <strong>${orderKey}</strong> إلى <strong>"${statusInfo.state}"</strong>؟<br><small>ملاحظة: لا يمكن التراجع عن هذا الإجراء.</small>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "نعم، قم بالتفعيل!",
    cancelButtonText: "تجاهل",
    showLoaderOnConfirm: true,
    preConfirm: () => updateOrderStatus(orderKey, newStatusId),
    allowOutsideClick: () => !Swal.isLoading(),
  });

  if (result.isConfirmed) {
    if (result.value && !result.value.error) {
      Swal.fire("تم التحديث!", "تم تحديث حالة الطلب بنجاح.", "success");
      showSalesMovementModal(userKey); // إعادة تحميل النافذة
      sendUpdateNotifications(orderKey, userKey, statusInfo.state); // إرسال الإشعارات
    } else {
      const errorMessage = result.value ? result.value.error : "خطأ غير معروف";
      Swal.fire("فشل التحديث", `حدث خطأ: ${errorMessage}`, "error");
    }
  }
}

/**
 * @description يرسل إشعارات بعد تحديث حالة الطلب.
 * @param {string} orderKey - مفتاح الطلب المحدث.
 * @param {string} userKey - مفتاح المستخدم (البائع).
 * @param {string} newStatusState - اسم الحالة الجديدة.
 */
async function sendUpdateNotifications(orderKey, userKey, newStatusState) {
  try {
    // 1. جلب توكنات خدمات التوصيل النشطة والبائع
    const deliveryUsers = await getActiveDeliveryRelations(userKey);
    const deliveryTokens = deliveryUsers
      ?.map((user) => user.fcmToken)
      .filter(Boolean); // استخراج التوكنات الصالحة فقط

    // 2. جلب توكنات المسؤولين
    const ADMIN_KEYS = ["dl14v1k7", "682dri6b"];
    const adminKeysQuery = ADMIN_KEYS.join(",");
    const tokensResponse = await apiFetch(
      `/api/tokens?userKeys=${encodeURIComponent(adminKeysQuery)}`
    );
    const adminTokens = tokensResponse?.tokens || [];

    // 3. دمج التوكنات وإزالة التكرار
    const allTokens = [...new Set([...(deliveryTokens || []), ...adminTokens])];

    if (allTokens.length > 0) {
      const title = "تحديث حالة طلب";
      const body = `تم تحديث حالة الطلب رقم #${orderKey} إلى "${newStatusState}".`;

      const notificationPromises = allTokens.map((token) =>
        sendNotification(token, title, body)
      );

      await Promise.all(notificationPromises);
      console.log("[Notifications] تم إرسال الإشعارات بنجاح.");
    }
  } catch (error) {
    console.error("[Notifications] فشل في إرسال الإشعارات:", error);
  }
}

/**
 * @description يعالج حدث النقر لعرض تفاصيل المنتج.
 * @param {MouseEvent} event - كائن الحدث.
 */
async function handleViewProductClick(event) {
  const button = event.target.closest(".view-product-details-btn");
  if (!button) return;

  console.log(
    '%c[DEV-LOG] تم النقر على زر "عرض تفاصيل المنتج".',
    "color: purple; font-weight: bold;"
  );
  const productKey = button.dataset.productKey;
  console.log(
    `[DEV-LOG] المفتاح المقروء من data-product-key هو: "${productKey}"`
  );

  if (!productKey) {
    Swal.fire("خطأ", "بيانات المنتج غير متوفرة لعرض التفاصيل.", "error");
    return;
  }

  Swal.fire({
    title: "جاري تحميل تفاصيل المنتج...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const productData = await getProductByKey(productKey);
    Swal.close();

    if (productData) {
      const productDataForModal = {
        ...productData,
        pricePerItem: productData.product_price,
        availableQuantity: productData.product_quantity,
        sellerMessage: productData.user_message,
        description: productData.product_description,
        imageSrc: productData.ImageName
          ? productData.ImageName.split(",").map(
              (name) =>
                `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${name}`
            )
          : [],
        MainCategory: productData.MainCategory,
        SubCategory: productData.SubCategory,
      };
      window.showProductDetails(productDataForModal, null, {
        showAddToCart: false,
      });
    } else {
      Swal.fire(
        "خطأ",
        "فشل في جلب تفاصيل المنتج. قد يكون المنتج قد تم حذفه.",
        "error"
      );
    }
  } catch (error) {
    Swal.close();
    console.error("Error fetching product details:", error);
    Swal.fire("خطأ", "حدث خطأ أثناء جلب تفاصيل المنتج.", "error");
  }
}

/**
 * @description يربط معالجات الأحداث اللازمة لنافذة حركة المبيعات.
 * @param {HTMLElement} contentWrapper - العنصر الحاوي لمحتوى النافذة.
 * @param {string} userKey - مفتاح المستخدم الحالي.
 */
function setupSalesMovementEventListeners(contentWrapper, userKey) {
  contentWrapper.addEventListener("click", (event) => {
    handleStatusUpdateClick(event, userKey);
    handleViewProductClick(event);
  });
}

/**
 * @description يعرض نافذة منبثقة (Modal) تحتوي على تقرير حركة المبيعات لجميع الطلبات،
 *   مع إمكانية عرض تفاصيل الطلبات وتحديث حالتها بناءً على صلاحيات المستخدم.
 * @function showSalesMovementModal
 * @param {string} userKey - المفتاح الفريد للمستخدم الذي يطلب التقرير.
 * @returns {Promise<void>} - وعد (Promise) لا يُرجع قيمة عند الاكتمال.
 * @see loadAndShowModal
 * @see getSalesMovement
 * @see generateSalesMovementItemHTML
 * @see updateOrderStatus
 * @see getProductByKey
 */
async function showSalesMovementModal(userKey) {
  await loadAndShowModal(
    "sales-movement-modal-container",
    "pages/salesMovementModal.html",
    async (modal) => {
      const contentWrapper = modal.querySelector(
        "#sales-movement-content-wrapper"
      );
      contentWrapper.innerHTML =
        '<div class="loader" style="margin: 2rem auto;"></div>';

      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      const isAdmin =
        loggedInUser && adminPhoneNumbers.includes(loggedInUser.phone);

      let orders = [];
      let deliveryUsers = [];

      if (isAdmin) {
        [orders, deliveryUsers] = await Promise.all([
          getSalesMovement(userKey),
          //getDeliveryUsers()
        ]);
      } else {
        // جلب الطلبات فقط إذا لم يكن المستخدم مسؤولاً
        orders = await getSalesMovement(userKey);
      }

      console.log(
        "%c[DEV-LOG] showSalesMovementModal: بيانات المستخدم المسجل دخوله:",
        "color: purple;",
        loggedInUser
      );
      console.log(
        `%c[DEV-LOG] showSalesMovementModal: هل المستخدم مسؤول (isAdmin)؟ -> ${isAdmin}`,
        "color: purple;"
      );
      console.log(
        "%c[DEV-LOG] showSalesMovementModal: الطلبات المستلمة:",
        "color: blue; font-weight: bold;",
        orders
      );

      if (orders && orders.length > 0) {
        contentWrapper.innerHTML = `<div id="sales-movement-list">
          ${orders
            .map((order) =>
              generateSalesMovementItemHTML(
                order,
                loggedInUser,
                isAdmin,
                deliveryUsers
              )
            )
            .join("")}
        </div>`;
      } else {
        contentWrapper.innerHTML =
          '<p style="text-align: center; padding: 2rem 0;">لا توجد طلبات لعرضها.</p>';
      }

      // ربط معالجات الأحداث للمحتوى الذي تم إنشاؤه
      setupSalesMovementEventListeners(contentWrapper, userKey);
    }
  );
}
