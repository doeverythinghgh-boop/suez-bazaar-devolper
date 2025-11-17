/**
 * @file js/reports-modal.js
 * @description يحتوي على المنطق الخاص بعرض التقارير مثل حركة المشتريات.
 */

/**
 * ينشئ شريط تقدم زمني (Timeline) لحالة الطلب.
 * @param {object} statusDetails - كائن تفاصيل الحالة (id, state, description).
 * @returns {string} - كود HTML لشريط التقدم.
 */
function createStatusTimelineHTML(statusDetails) {
  const currentStatusId = statusDetails.id;

  const progressStates = [
    ORDER_STATUS_MAP.REVIEW,
    ORDER_STATUS_MAP.CONFIRMED,
    ORDER_STATUS_MAP.SHIPPED,
    ORDER_STATUS_MAP.DELIVERED
  ];

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
    const stepClass = isActive ? 'active' : '';
    const currentClass = isCurrent ? 'current' : '';

    timelineHTML += `
      <div class="timeline-step ${stepClass} ${currentClass}" title="${state.description}">
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
  const modalContainer = document.getElementById("sales-movement-modal-container");

  modalContainer.innerHTML = `
    <div class="modal-content large extra-large">
      <span class="close-button" id="sales-movement-modal-close-btn">&times;</span>
      <h2><i class="fas fa-dolly-flatbed"></i> حركة المشتريات</h2>
      <div class="loader" style="margin: 2rem auto;"></div>
    </div>`;
  
  document.body.classList.add("modal-open");
  modalContainer.style.display = "block";

  const closeModal = () => {
    modalContainer.style.display = "none";
    document.body.classList.remove("modal-open");
  };

  document.getElementById("sales-movement-modal-close-btn").onclick = closeModal;
  window.addEventListener('click', (event) => {
    if (event.target == modalContainer) closeModal();
  }, { once: true });

  const orders = await getSalesMovement(userKey);
  // ✅ تتبع: تسجيل البيانات فور استلامها من الخادم
  console.log('%c[DEV-LOG] showSalesMovementModal: البيانات المستلمة من getSalesMovement():', 'color: blue; font-weight: bold;', orders);

  const modalContentEl = modalContainer.querySelector('.modal-content');

  let contentHTML = `
    <span class="close-button" id="sales-movement-modal-close-btn">&times;</span>
    <h2><i class="fas fa-dolly-flatbed"></i> حركة المشتريات</h2>`;

  if (orders && orders.length > 0) {
    contentHTML += '<div id="sales-movement-list">';
    orders.forEach(order => {
      // ✅ تتبع: تسجيل بيانات كل طلب على حدة
      console.log(`%c[DEV-LOG] ... جاري معالجة الطلب: ${order.order_key}`, 'color: darkcyan;', order);
      const isoDateTime = order.created_at.replace(' ', 'T') + 'Z';
      const orderDate = new Date(isoDateTime).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo'
      });

      let itemsTable = `<table class="order-items-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر القطعة</th><th>الإجمالي</th><th>عرض</th></tr></thead><tbody>`;
      order.items.forEach(item => {
        const itemTotal = (item.product_price * item.quantity).toFixed(2);
        // ✅ تتبع: تسجيل بيانات كل منتج داخل الطلب
        console.log(`%c[DEV-LOG] ...... جاري معالجة المنتج: ${item.productName}`, 'color: grey;', item);

        // ✅ إصلاح: تخزين مفتاح المنتج فقط بدلاً من الكائن الكامل
        const productKey = item.product_key || item.productKey || (item.product_details ? item.product_details.product_key : '') || '';
        console.log(`[DEV-LOG] ......... تم استخلاص productKey: "${productKey}"`);

        itemsTable += `<tr>
          <td data-label="المنتج">${item.productName}</td>
          <td data-label="الكمية">${item.quantity}</td>
          <td data-label="سعر القطعة">${item.product_price.toFixed(2)} ج.م</td>
          <td data-label="الإجمالي">${itemTotal} ج.م</td>
          <td data-label="عرض">
            <button class="button icon-btn view-product-details-btn" data-product-key="${productKey}" title="عرض تفاصيل المنتج"><i class="fas fa-eye"></i></button>
          </td>
        </tr>`;
      });
      itemsTable += '</tbody></table>';

      contentHTML += `
        <div class="purchase-item">
          <div class="purchase-item-details">
            <p><strong>رقم الطلب:</strong> ${order.order_key}</p>
            <p><strong>العميل:</strong> ${order.customer_name} (${order.customer_phone})</p>
            <p><strong>العنوان:</strong> ${order.customer_address || 'غير محدد'}</p>
            <p><strong>تاريخ الطلب:</strong> ${orderDate}</p>
            <p><strong>إجمالي الطلب:</strong> ${order.total_amount.toFixed(2)} جنيه</p>
            <div class="purchase-status-container">
              ${createStatusTimelineHTML(ORDER_STATUSES.find(s => s.id === order.order_status) || ORDER_STATUSES[0])}
            </div>
            <h4>المنتجات:</h4>
            ${itemsTable}
          </div>
        </div>`;
    });
    contentHTML += '</div>';
  } else {
    contentHTML += '<p style="text-align: center; padding: 2rem 0;">لا توجد طلبات لعرضها.</p>';
  }

  modalContentEl.innerHTML = contentHTML;
  modalContentEl.querySelector('#sales-movement-modal-close-btn').onclick = closeModal;

  // ✅ جديد: ربط حدث النقر بأزرار "عرض المنتج"
  modalContentEl.querySelectorAll('.view-product-details-btn').forEach(button => {
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
      const productData = await getProductByKey(productKey); // افتراض وجود هذه الدالة في turo.js
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
        window.showProductDetails(productDataForModal);
      } else {
        Swal.fire('خطأ', 'فشل في جلب تفاصيل المنتج. قد يكون المنتج قد تم حذفه.', 'error');
      }
    });
  });
}