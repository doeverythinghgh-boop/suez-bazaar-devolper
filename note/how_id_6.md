آلية التعامل مع الفئة الخاصة (SERVICE_CATEGORY_NoPrice_ID)

يشرح هذا المستند بالتفصيل كيف يتعامل النظام مع الفئة التي تحمل المعرف المخزن في:

const SERVICE_CATEGORY_NoPrice_ID = "6";

والموجود داخل:

js/helpers/dom.js

وهي فئة "الخدمات العامة"، والتي يتم التعامل معها بشكل خاص لضمان أن المنتجات التي تندرج تحتها (كونها خدمات) لا تتطلب سعرًا أو كمية. هذا يحقق تجربة مستخدم منطقية ومتسقة.

يتم تطبيق هذا المنطق في 3 مواقع داخل المشروع:

عند إضافة المنتج

عند عرض المنتج

عند البحث داخل المنتجات

1. معالجة الفئة داخل صفحة إضافة/تعديل منتج (addProduct.html)
أ. التفاعل الفوري داخل النموذج

عند اختيار فئة "الخدمات العامة"، يتم إخفاء حقول السعر والكمية، وإلغاء كونها حقولاً إجبارية.

الملف: pages/addProduct.html
الدالة: initializeAddProductForm

mainCategorySelect.addEventListener("change", (event) => {
  const selectedCategoryId = event.target.value;

  const priceQuantityRow = document.getElementById('price-quantity-row');
  const quantityInput = document.getElementById('product-quantity');
  const priceInput = document.getElementById('product-price');

  // استخدام المتغير العام بدل الرقم
  if (selectedCategoryId === SERVICE_CATEGORY_NoPrice_ID) {
    priceQuantityRow.style.display = 'none';
    quantityInput.required = false;
    priceInput.required = false;
  } else {
    priceQuantityRow.style.display = 'flex';
    quantityInput.required = true;
    priceInput.required = true;
  }
});

ب. التحقق من صحة البيانات عند الإرسال

يتم تخطي التحقق من السعر والكمية إذا كانت الفئة هي فئة الخدمات.

const mainCategoryIdForValidation = document.getElementById('main-category').value;

// التحقق من الكمية
clearError(quantityInput);
if (mainCategoryIdForValidation !== SERVICE_CATEGORY_NoPrice_ID &&
    (!quantityInput.value || parseFloat(quantityInput.value) < 1)) {
  showError(quantityInput, 'يجب إدخال كمية متاحة صالحة (1 على الأقل).');
  isValid = false;
}

// التحقق من السعر
clearError(priceInput);
if (mainCategoryIdForValidation !== SERVICE_CATEGORY_NoPrice_ID &&
    (priceInput.value === '' || parseFloat(priceInput.value) < 0)) {
  showError(priceInput, 'يجب إدخال سعر صالح للمنتج.');
  isValid = false;
}

ج. ضبط القيم قبل حفظ البيانات
const mainCatForSubmit = document.getElementById('main-category').value;

if (mainCatForSubmit === SERVICE_CATEGORY_NoPrice_ID) {
  console.log('[ProductForm] Service category detected. Forcing price and quantity to 0 before submission.');
  document.getElementById('product-price').value = 0;
  document.getElementById('product-quantity').value = 0;
}

2. عرض تفاصيل المنتج (showProduct.html)

الملف: js/connectProduct.js
الدالة: populateProductDetails

const isServiceCategory = productData.MainCategory == SERVICE_CATEGORY_NoPrice_ID;

const quantityContainer = document.getElementById("product-modal-quantity-container");
const priceContainer = document.getElementById("product-modal-price-container");
const cartActionsContainer = document.getElementById("product-modal-cart-actions");

if (isServiceCategory) {
  quantityContainer.style.display = 'none';
  priceContainer.style.display = 'none';
  cartActionsContainer.style.display = 'none';
} else {
  quantityContainer.style.display = 'block';
  priceContainer.style.display = 'block';
  cartActionsContainer.style.display = 'block';

  document.getElementById("product-modal-quantity").textContent = productData.availableQuantity;
  document.getElementById("product-modal-price").textContent = `${productData.pricePerItem} جنيه`;
}

3. عرض السعر بشروط داخل نتائج البحث

الملف: js/searchModal.js
الدالة: displaySearchResults

داخل الدالة `displaySearchResults`، يتم استخدام الدالة المساعدة `generateProductCardHTML` (الموجودة في `js/helpers/dom.js`) لتوليد HTML لكل بطاقة منتج. هذه الدالة تتولى منطق إخفاء وعرض السعر بناءً على ما إذا كانت الفئة الرئيسية للمنتج هي `SERVICE_CATEGORY_NoPrice_ID`.

مثال من `generateProductCardHTML` (معالجة خاصة لنوع العرض 'search'):

const isService = product.MainCategory == SERVICE_CATEGORY_NoPrice_ID;
// ...
case 'search':
  // ...
  cardContent = `
    <img src="${imageUrl}" alt="${product.productName}" class="search-result-image">
    <div class="search-result-details">
      <h4 class="search-result-title">${product.productName}</h4>
      ${!isService ? `<p class="search-result-price">${price.toFixed(2)} جنيه</p>` : ''}
    </div>
  `;
  break;
