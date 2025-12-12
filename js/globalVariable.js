/**
 * @file js/globalVariable.js
 * @description تعريف المتغيرات العامة والدوال المسؤولة عن توجيه الصفحات وتخطيط العرض (Layout)
 *   الخاص بالمنتجات (إضافة، عرض، تعديل).
 */

/**
 * @description بيانات المستخدم المسجل حالياً.
 * @type {object|null}
 * @global
 */
window.userSession = null;

/**
 * @description بيانات المنتج المعروض حالياً (للتفاصيل أو التعديل).
 * @type {Array|object|null}
 * @global
 */
window.productSession = null;

/**
 * @description المعرف (ID) للفئة الرئيسية المختارة عند إضافة منتج.
 * @type {string|number|null}
 * @global
 */
window.mainCategorySelectToAdd = null;

/**
 * @description المعرف (ID) للفئة الفرعية المختارة عند إضافة منتج.
 * @type {string|number|null}
 * @global
 */
window.subCategorySelectToAdd = null;

/**
 * @description نوع المنتج المختار عند الإضافة (0 = افتراضي، 2 = خدمي، etc).
 * @type {number|null}
 * @global
 */
window.productTypeToAdd = null;

/**
 * @description قائمة بمنتجات المستخدم الحالي (للعرض في صفحة "منتجاتي").
 * @type {Array|null}
 * @global
 */
window.myProducts = null;

/**
 * @description يقوم بتحميل وعرض صفحة تفاصيل المنتج بناءً على نوع العرض المطلوب.
 * @function productViewLayout
 * @param {string} View - نوع العرض ('0' للعرض العادي، '2' للعرض البديل).
 * @returns {void}
 * @see mainLoader
 */
function productViewLayout(View) {
  console.log('------------------------نوع الخدمه-------------------', View);
  //في الارسال
  //productSession = [productDataForModal,{showAddToCart:true}];
  //في الاستقبال
  //(productSession[0],  productSession[1] )
  //function productView_viewDetails(productData, options = {})--->options.showAddToCart
  if (View == '0') {
    //option = t/f ==> view or hidden pasket option
    mainLoader(
      "pages/productView.html",
      "index-product-container",
      0,
      undefined,
      "showHomeIcon",
      true
    );
  }
  if (View == '2') {
    mainLoader(
      "pages/productView2.html",
      "index-product-container",
      0,
      undefined,
      "showHomeIcon",
      true
    );
  }
}

/**
 * @description يوجه المستخدم إلى صفحة إضافة منتج جديد، مع تحديد نوع المنتج بناءً على الفئة المختارة.
 * @function productAddLayout
 * @param {boolean} [editMode=false] - هل الوضع هو تعديل منتج موجود؟ (حالياً غير مستخدم بالكامل في هذا المنطق).
 * @returns {void}
 * @see mainLoader
 */
function productAddLayout(editMode = false) {
  if (mainCategorySelectToAdd == 6) {
    productTypeToAdd = 2; //نوع المنتج خدمي
  } else {
    productTypeToAdd = 0; //نوع المنتج افتراضي
  }
  if (editMode == false) {
    mainLoader(
      "./pages/productAdd.html",
      "index-product-container",
      0,
      undefined,
      "showHomeIcon",
      true
    );
  }

}

/**
 * @description يوجه المستخدم إلى صفحة تعديل المنتج، مع تحديد نوع المنتج بناءً على الفئة المختارة.
 * @function productEditLayout
 * @returns {void}
 * @see mainLoader
 */
function productEditLayout() {
  if (mainCategorySelectToAdd == 6) {
    productTypeToAdd = 2; //نوع المنتج خدمي
  } else {
    //نوع المنتج افتراضي
    mainLoader(
      "./pages/productEdit.html",
      "index-product-container",
      0,
      undefined,
      "showHomeIcon",
      true
    );
  }
}

/**
 * @description يعرض نافذة منبثقة لاختيار الفئة الرئيسية والفرعية قبل إضافة منتج جديد.
 * @async
 * @function showAddProductModal
 * @returns {Promise<void>}
 * @throws {Error} - If there's an error displaying the category modal or setting product layout.
 * @see CategoryModal.show
 * @see productAddLayout
 */
async function showAddProductModal() {
  try {

    const result = await CategoryModal.show();
    if (result.status === 'success') {
      console.log('تم الاختيار:', result.mainId, result.subId);
      mainCategorySelectToAdd = result.mainId; //الفئه الرئيسية المختارة عند اضافة منتج
      subCategorySelectToAdd = result.subId; //الفئه الفرعية المختارة عند اضافة منتج
      productAddLayout();
    }


  } catch (error) {
    console.error("خطأ في عرض نافذة إضافة المنتج:", error);
    Swal.fire("خطأ", "حدث خطأ أثناء محاولة عرض النافذة.", "error");
  }
}
