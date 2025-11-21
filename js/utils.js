/**
 * @file js/utils.js
 * @description يحتوي هذا الملف على دوال مساعدة عامة يمكن استخدامها في أي مكان في المشروع.
 */


/**
 * ✅ جديد: معرّف الفئة التي لا تتطلب سعرًا أو كمية (مثل الخدمات).
 */
const SERVICE_CATEGORY_NoPrice_ID = "6";


/* ----------------------------------------
    🟦 تخزين حالة الاتصال مؤقتاً (Cache)
---------------------------------------- */
let lastConnectionCheck = 0;
let isConnectedCache = false;
let offlineToast = null; 
const CONNECTION_CHECK_INTERVAL = 3000; // 3 ثوانٍ

/* ----------------------------------------
    🟦 دالة مستخدمة من أي مكان
---------------------------------------- */
async function checkInternetConnection() {
  return isConnectedCache;
}

/* ----------------------------------------
    🟦 Snackbar ثابت عند فقد الاتصال
---------------------------------------- */
async function performActualConnectionCheck() {
  lastConnectionCheck = Date.now();

  try {
    if (!navigator.onLine) throw new Error("navigator.onLine is false");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 🔹 عاد الاتصال
    if (!isConnectedCache) {
      console.log("%c[الشبكة] عاد الاتصال بالإنترنت.", "color: green;");
    }

    isConnectedCache = true;

    // 🔹 اغلاق Snackbar إذا كان ظاهر
    if (offlineToast) {
      Swal.close();
      offlineToast = null;
    }

    return true;

  } catch (error) {
    // 🔻 تم فقد الاتصال
    if (isConnectedCache) {
      console.warn("%c[الشبكة] تم فقد الاتصال بالإنترنت.", "color: red;");
    }

    isConnectedCache = false;

    // 🔹 إظهار Snackbar ثابت *مرة واحدة فقط*
    if (!offlineToast) {
      offlineToast = Swal.fire({
        toast: true,
        position: 'bottom',
        // ✅ تعديل: استخدام html لتنسيق الرسالة في سطر واحد
        html: '<i class="fas fa-wifi-slash" style="color: #fff; margin-left: 8px;"></i> لا يوجد اتصال بالإنترنت',
        showConfirmButton: false,
        timer: undefined,          // ← بدون مؤقت
        timerProgressBar: false,   // ← إخفاء عدّاد الوقت
        background: '#d32f2f',
        color: '#fff',
        customClass: {
          // ✅ تعديل: إزالة الحشو الزائد لجعل الرسالة أصغر
          popup: 'animate__animated animate__slideInUp no-padding-toast',
          popup: 'animate__animated animate__slideInUp'
        }
      });
    }

    return false;
  }
}

/* ----------------------------------------
    🟦 الفحص الدوري
---------------------------------------- */
function startPeriodicConnectionCheck() {
  performActualConnectionCheck();
  setInterval(performActualConnectionCheck, CONNECTION_CHECK_INTERVAL);

  window.addEventListener("online", () => {
    isConnectedCache = true;
    if (offlineToast) Swal.close();
    offlineToast = null;
    performActualConnectionCheck();
  });

  window.addEventListener("offline", () => {
    isConnectedCache = false;
    performActualConnectionCheck();
  });
}

/* ----------------------------------------
    🟦 البدء
---------------------------------------- */
startPeriodicConnectionCheck();





/**
 * ✅ جديد: يحول الأرقام الهندية (٠-٩) إلى أرقام إنجليزية (0-9) في سلسلة نصية.
 * هذه الدالة مفيدة لمعالجة مدخلات المستخدم التي قد تحتوي على أرقام بأي من الصيغتين.
 * @param {string} str - السلسلة النصية التي قد تحتوي على أرقام.
 * @returns {string} - السلسلة النصية بعد تحويل الأرقام إلى الصيغة الإنجليزية.
 */
function normalizeDigits(str) {
  if (!str) return '';
  const easternArabicNumerals = /[\u0660-\u0669]/g; // نطاق الأرقام العربية الشرقية (الهندية)
  return str.replace(easternArabicNumerals, d => d.charCodeAt(0) - 0x0660);
}

/**
 * ✅ جديد: يقوم بتنقيح وتوحيد النص العربي.
 * يزيل علامات التشكيل ويوحد أشكال الحروف (الهمزات والتاء المربوطة).
 * مفيد جدًا لعمليات البحث والمقارنة لضمان تطابق النصوص بغض النظر عن التشكيل.
 * @param {string} text - النص العربي المراد تنقيحه.
 * @returns {string} - النص بعد إزالة التشكيل وتوحيد الحروف.
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // إزالة التشكيل
  text = text.replace(/[\u064B-\u0652]/g, "");

  // توحيد الهمزات (أ، إ، آ) إلى ا
  text = text.replace(/[آأإ]/g, "ا");

  // تحويل التاء المربوطة (ة) إلى ه
  text = text.replace(/ة/g, "ه");

  // توحيد حرف الياء (ي / ى) إلى ي
  text = text.replace(/[ى]/g, "ي");

  // إزالة المد (ـــ)
  text = text.replace(/ـ+/g, "");

  // إزالة المسافات المكررة
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * ✅ جديد: إعداد منطق النافذة المنبثقة (Modal) بشكل معياري.
 *
 * هذه الدالة المساعدة تنشئ وتدير دورة حياة نافذة منبثقة.
 * تتولى إظهار وإخفاء النافذة، إضافة وإزالة فئة `modal-open` من الجسم،
 * وربط أحداث الإغلاق (زر الإغلاق والنقر على الخلفية).
 *
 * @param {string} modalId - معرف (ID) حاوية النافذة المنبثقة.
 * @param {string} closeBtnId - معرف (ID) زر الإغلاق داخل النافذة.
 * @param {object} [options] - خيارات إضافية.
 * @param {function} [options.onClose] - دالة رد اتصال اختيارية يتم استدعاؤها عند إغلاق النافذة.
 * @returns {{open: function, close: function, modalElement: HTMLElement}|null} - كائن يحتوي على دوال الفتح والإغلاق وعنصر النافذة، أو `null` إذا لم يتم العثور على عنصر النافذة.
 */
function setupModalLogic(modalId, closeBtnId, options = {}) {
  const modalElement = document.getElementById(modalId);
  if (!modalElement) {
    console.error(`[Modal Logic] لم يتم العثور على عنصر النافذة بالمعرف: ${modalId}`);
    return null;
  }

  const close = () => {
    modalElement.style.display = "none";
    document.body.classList.remove("modal-open");
    if (typeof options.onClose === "function") {
      options.onClose();
    }
  };

  const open = () => {
    modalElement.style.display = "block";
    document.body.classList.add("modal-open");

    const closeBtn = document.getElementById(closeBtnId);
    if (closeBtn) closeBtn.onclick = close;

    window.addEventListener('click', (event) => {
      if (event.target === modalElement) close();
    }, { once: true });
  };

  return { open, close, modalElement };
}

/**
 * ✅ جديد: تحميل وعرض نافذة منبثقة من قالب HTML.
 *
 * @param {string} modalId - معرف حاوية النافذة.
 * @param {string|null} templatePath - مسار ملف القالب (null إذا كان الهيكل موجودًا بالفعل).
 * @param {function(HTMLElement):void} initCallback - دالة تُستدعى بعد تحميل المحتوى لتهيئة المنطق.
 * @param {function():void} [onCloseCallback] - دالة اختيارية تُستدعى عند إغلاق النافذة.
 */
async function loadAndShowModal(modalId, templatePath, initCallback, onCloseCallback) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`[Modal Loader] لم يتم العثور على حاوية النافذة: ${modalId}`);
    return;
  }

  const modalLogic = setupModalLogic(modalId, `${modalId}-close-btn`, { onClose: onCloseCallback });

  try {
    // تحميل المحتوى فقط إذا لم يكن موجودًا أو تم تحديد مسار
    if (templatePath && modal.children.length === 0) {
      const response = await fetch(templatePath);
      if (!response.ok) throw new Error(`فشل تحميل القالب: ${response.status}`);
      modal.innerHTML = await response.text();

      // تنفيذ أي سكربتات مضمنة
      modal.querySelectorAll("script").forEach(script => {
        const newScript = document.createElement("script");
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript).remove();
      });
    }

    modalLogic.open();
    if (typeof initCallback === 'function') initCallback(modal);

  } catch (error) {
    console.error(`[Modal Loader] خطأ في تحميل أو عرض النافذة ${modalId}:`, error);
    Swal.fire("خطأ في التحميل", "حدث خطأ أثناء محاولة تحميل المحتوى. يرجى المحاولة مرة أخرى.", "error");
    if (typeof onCloseCallback === 'function') onCloseCallback();
  }
}

/**
 * ✅ جديد: دالة مركزية لإجراء طلبات API.
 * تغلف منطق fetch، معالجة الأخطاء، وتحويل JSON.
 * @param {string} endpoint - نقطة النهاية (e.g., '/api/users').
 * @param {object} [options={}] - خيارات fetch، بما في ذلك method, body, headers.
 * @returns {Promise<Object>} - بيانات الاستجابة أو كائن خطأ.
 */
async function apiFetch(endpoint, options = {}) {
  const { method = 'GET', body = null, specialHandlers = {}, ...restOptions } = options;
  const url = `${baseURL}${endpoint}`;

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...restOptions.headers,
    },
    ...restOptions,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log(`%c[API Fetch] ${method} ${endpoint}`, 'color: #17a2b8;', body ? { payload: body } : '');

  try {
    const response = await fetch(url, fetchOptions);

    if (specialHandlers[response.status]) {
      return specialHandlersresponse.status;
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP error! status: ${response.status}` };
    }
    return data;
  } catch (error) {
    return { error: `فشل الاتصال بالخادم: ${error.message}` };
  }
}
/**
 * ✅ تعديل: تفتح نافذة سجل الإشعارات مباشرة في الصفحة الحالية.
 */
async function showNotificationsModal() {
  const loggedInUserJSON = localStorage.getItem("loggedInUser");

  if (loggedInUserJSON) {
    const user = JSON.parse(loggedInUserJSON);

    // التأكد من أن المستخدم مسجل دخوله ومؤهل لرؤية الإشعارات
    if (typeof isUserEligibleForNotifications === 'function' && isUserEligibleForNotifications(user)) {
      // التأكد من وجود دالة عرض النافذة قبل استدعائها
      if (typeof showNotificationsLogModal === 'function') {
        await showNotificationsLogModal();
      } else {
        console.error('[Utils] الدالة showNotificationsLogModal() غير موجودة. تأكد من تحميل السكريبت الخاص بها.');
      }
    }
  }
}

/**
 * ✅ جديد: دالة مركزية لتوليد HTML لبطاقة المنتج.
 * تقلل من تكرار الكود وتضمن التناسق في عرض المنتجات عبر التطبيق.
 * @param {object} product - كائن المنتج الكامل.
 * @param {string} viewType - نوع العرض ('gallery', 'search', 'seller').
 * @returns {string} - سلسلة HTML لبطاقة المنتج.
 */
function generateProductCardHTML(product, viewType) {
  // 1. معالجة الصور
  const firstImageName = product.ImageName ? product.ImageName.split(',')[0] : null;
  const imageUrl = firstImageName
    ? `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${firstImageName}`
    : 'images/placeholder.png'; // صورة افتراضية

  // 2. منطق الخدمات والأسعار
  const isService = product.MainCategory == SERVICE_CATEGORY_NoPrice_ID;
  const price = parseFloat(product.product_price);
  const originalPrice = product.original_price ? parseFloat(product.original_price) : 0;

  let priceHtml = '';
  if (!isService) {
    priceHtml = `<p class="product-price">${price.toFixed(2)} جنيه</p>`;
    if (originalPrice > price) {
      priceHtml += `<p class="original-price"><del>${originalPrice.toFixed(2)} جنيه</del></p>`;
    }
  }

  // 3. تخصيص الهيكل بناءً على نوع العرض
  let cardClass = '';
  let cardContent = '';
  let cardAttributes = `data-product-key="${product.product_key}"`;

  switch (viewType) {
    case 'gallery':
      cardClass = 'product-card';
      cardContent = `
        <div class="product-image-container">
          <img src="${imageUrl}" alt="${product.productName}" class="product-image" loading="lazy">
        </div>
        <div class="product-info">
          <h3 class="product-title">${product.productName}</h3>
          ${priceHtml}
        </div>
        ${!isService ? '<button class="add-to-cart-btn-gallery"><i class="fas fa-cart-plus"></i></button>' : ''}
      `;
      break;

    case 'search':
      cardClass = 'search-result-item';
      cardContent = `
        <img src="${imageUrl}" alt="${product.productName}" class="search-result-image">
        <div class="search-result-details">
          <h4 class="search-result-title">${product.productName}</h4>
          ${!isService ? `<p class="search-result-price">${price.toFixed(2)} جنيه</p>` : ''}
        </div>
      `;
      break;

    case 'seller':
      cardClass = 'my-products-card';
      const productJson = JSON.stringify(product).replace(/'/g, "&apos;");
      cardAttributes += ` data-main-category="${product.MainCategory || ''}" data-sub-category="${product.SubCategory || ''}"`;
      const imagesHtml = (product.ImageName || '').split(',').filter(Boolean).map(name => 
        `<img src="https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${name}" alt="صورة منتج" onerror="this.style.display='none'">`
      ).join('') || '<span>لا توجد صور</span>';

      cardContent = `
        <div class="my-products-card-images">${imagesHtml}</div>
        <div class="my-products-card-details">
          <h4>${product.productName || 'منتج بلا اسم'}</h4>
          <p><strong>الوصف:</strong> ${product.product_description || 'لا يوجد'}</p>
          ${priceHtml.replace('product-price', '').replace('original-price', '')}
          <p><strong>الكمية:</strong> ${product.product_quantity}</p>
        </div>
        <div class="my-products-card-actions">
          <button class="button logout-btn-small my-products-edit-btn" data-product='${productJson}'><i class="fas fa-edit"></i> تعديل</button>
          <button class="button delete-btn-small my-products-delete-btn" data-product='${productJson}'><i class="fas fa-trash-alt"></i> إزالة</button>
        </div>
      `;
      break;
  }

  return `<div class="${cardClass}" ${cardAttributes}>${cardContent}</div>`;
}

/**
 * ✅ جديد: يولد HTML لصف واحد في سلة المشتريات.
 * @param {object} item - بيانات المنتج في السلة.
 * @returns {string} - سلسلة HTML لصف العنصر.
 */
function generateCartItemHTML(item) {
  const itemTotal = (item.price * item.quantity).toFixed(2);
  return `
    <div class="cart-item" data-key="${item.product_key}">
      <img src="${item.image}" alt="${item.productName}">
      <div class="cart-item-details">
        <strong>${item.productName}</strong>
        <p>${item.price} جنيه × ${item.quantity}</p>
      </div>
      <div><strong>${itemTotal} جنيه</strong></div>
      <button class="btn-ghost remove-from-cart-btn" title="إزالة من السلة">&times;</button>
    </div>`;
}

/**
 * ✅ جديد: يولد HTML لعنصر واحد في سجل المشتريات.
 * @param {object} item - بيانات المنتج المشترى.
 * @returns {string} - سلسلة HTML لبطاقة العنصر.
 */
function generatePurchaseItemHTML(item) {
  const firstImage = item.ImageName ? item.ImageName.split(',')[0] : '';
  const imageUrl = firstImage 
    ? `https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/${firstImage}`
    : 'images/placeholder.png';

  const isoDateTime = item.created_at.replace(' ', 'T') + 'Z';
  const purchaseDate = new Date(isoDateTime).toLocaleString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Cairo'
  });

  const itemPrice = parseFloat(item.product_price) || 0;
  const itemQuantity = parseInt(item.quantity, 10) || 0;
  const itemTotal = (itemPrice * itemQuantity).toFixed(2);

  return `
    <div class="purchase-item">
      <img src="${imageUrl}" alt="${item.productName}">
      <div class="purchase-item-details">
        <strong>${item.productName}</strong>
        <p><strong>سعر القطعة:</strong> ${itemPrice.toFixed(2)} جنيه</p>
        <p><strong>الكمية:</strong> ${item.quantity}</p>
        <p><strong>الإجمالي:</strong> ${itemTotal} جنيه</p>
        <p><strong>تاريخ الطلب:</strong> ${purchaseDate}</p>
        <div class="purchase-status-container">
          ${createStatusTimelineHTML(null, item.status_details, false, 0)}
        </div>
      </div>
    </div>`;
}

/**
 * ✅ جديد: يولد HTML لبطاقة طلب في تقرير حركة المبيعات.
 * @param {object} order - بيانات الطلب الكاملة.
 * @param {object} loggedInUser - بيانات المستخدم المسجل دخوله.
 * @param {boolean} isAdmin - هل المستخدم مسؤول.
 * @returns {string} - سلسلة HTML لبطاقة الطلب.
 */
function generateSalesMovementItemHTML(order, loggedInUser, isAdmin) {
  const userRole = loggedInUser ? loggedInUser.is_seller : 0;
  const isSellerOfThisOrder = userRole === 1 && order.items.some(item => item.seller_key === loggedInUser.user_key);
  const canEdit = isAdmin || isSellerOfThisOrder || userRole === 2;

  const isoDateTime = order.created_at.replace(' ', 'T') + 'Z';
  const orderDate = new Date(isoDateTime).toLocaleString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo'
  });

  const itemsTable = `<table class="order-items-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر القطعة</th><th>الإجمالي</th><th>عرض</th></tr></thead><tbody>
    ${order.items.map(item => {
      const itemTotal = (item.product_price * item.quantity).toFixed(2);
      const productKey = item.product_key || '';
      return `<tr>
        <td data-label="المنتج">${item.productName}</td>
        <td data-label="الكمية">${item.quantity}</td>
        <td data-label="سعر القطعة">${item.product_price.toFixed(2)} ج.م</td>
        <td data-label="الإجمالي">${itemTotal} ج.م</td>
        <td data-label="عرض">
          <button class="button icon-btn view-product-details-btn" data-product-key="${productKey}" title="عرض تفاصيل المنتج"><i class="fas fa-eye"></i></button>
        </td>
      </tr>`;
    }).join('')}
  </tbody></table>`;

  return `
    <div class="purchase-item">
      <div class="purchase-item-details">
        <p><strong>رقم الطلب:</strong> ${order.order_key}</p>
        ${isAdmin ? `
          <p><strong>العميل:</strong> ${order.customer_name}</p>
          <p><strong>هاتف العميل:</strong> ${order.customer_phone}</p>
          <p><strong>العنوان:</strong> ${order.customer_address || 'غير محدد'}</p>
        ` : ''}
        <p><strong>تاريخ الطلب:</strong> ${orderDate}</p>
        <p><strong>إجمالي الطلب:</strong> ${order.total_amount.toFixed(2)} جنيه</p>
        <div class="purchase-status-container">
          ${createStatusTimelineHTML(order.order_key, ORDER_STATUSES.find(s => s.id === order.order_status), canEdit, userRole)}
        </div>
        <h4>المنتجات:</h4>
        ${itemsTable}
      </div>
    </div>`;
}

/**
 * ✅ جديد: يولد HTML لبطاقة مستخدم في لوحة تحكم المسؤول.
 * @param {object} user - بيانات المستخدم.
 * @returns {string} - سلسلة HTML لبطاقة المستخدم.
 */
function generateUserCardHTML(user) {
  let notificationUI = '';
  if (isUserEligibleForNotifications(user)) {
    notificationUI = user.fcm_token
      ? `<div class="notification-sender">
           <input type="text" placeholder="اكتب رسالتك هنا..." class="notification-input" id="notif-input-${user.user_key}">
           <button class="send-notif-btn" data-token="${user.fcm_token}" data-user-key="${user.user_key}" title="إرسال"><i class="fas fa-paper-plane"></i></button>
         </div>`
      : '<span class="no-token">مؤهل (لم يسجل الجهاز)</span>';
  } else {
    notificationUI = '<span class="no-token">غير مؤهل للإشعارات</span>';
  }

  const isAdmin = adminPhoneNumbers.includes(user.phone);
  const roleUI = isAdmin
    ? `<div class="user-role-static"><i class="fas fa-user-shield"></i> <span>مسؤول</span></div>`
    : `<select id="role-select-${user.user_key}" class="user-role-select" data-phone="${user.phone}" data-original-state="${user.is_seller}">
         <option value="0" ${user.is_seller === 0 ? 'selected' : ''}>عميل</option>
         <option value="1" ${user.is_seller === 1 ? 'selected' : ''}>بائع</option>
         <option value="2" ${user.is_seller === 2 ? 'selected' : ''}>خدمة توصيل</option>
       </select>`;

  return `
    <div class="user-card" data-phone="${user.phone}">
      <div class="user-card-header">
        <i class="fas fa-user-circle user-avatar"></i>
        <div class="user-info">
          <span class="user-name">${user.username || 'غير متوفر'}</span>
          <span class="user-phone">${user.phone}</span>
        </div>
      </div>
      <div class="user-card-body">
        <div class="user-card-field">
          <label for="role-select-${user.user_key}">دور المستخدم</label>
          ${roleUI}
        </div>
        <div class="user-card-field">
          <label>إرسال إشعار</label>
          ${notificationUI}
        </div>
      </div>
    </div>`;
}

/**
 * ✅ جديد: يولد HTML لعنصر سجل إشعارات.
 * @param {object} log - بيانات سجل الإشعار.
 * @returns {string} - سلسلة HTML لعنصر السجل.
 */
function generateNotificationLogItemHTML(log) {
  const logDate = new Date(log.timestamp).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  let iconClass = log.type === 'sent' ? 'fa-paper-plane' : 'fa-inbox';
  let statusClass = log.type;
  let titlePrefix = log.type === 'sent' ? `إلى: ${log.relatedUser.name}` : `من: ${log.relatedUser.name}`;

  if (log.status === 'failed') {
    statusClass += ' failed';
    iconClass = 'fa-exclamation-triangle';
  }

  return `
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
}
