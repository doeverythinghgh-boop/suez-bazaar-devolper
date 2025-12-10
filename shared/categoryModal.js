// shared/categoryModal.js
// نافذة اختيار الفئات - مع فصل HTML وCSS وعزل الأنماط

window.CategoryModal = (function () {
    'use strict';

    // ============================================
    // 1. المتغيرات العامة
    // ============================================
    const MODAL_ID = 'category-modal';
    const DEFAULT_TITLE = '📋 تحديد فئة المنتج الجديد';
    const CATEGORIES_URL = './shared/list.json';
    const HTML_URL = './shared/categoryModal.html';
    const CSS_URL = './shared/categoryModal.css';
    
    let categoriesData = [];
    let isInitialized = false;
    let shadowRoot = null;
    let styleElement = null;

    // ============================================
    // 2. دالة تحميل الملفات الخارجية
    // ============================================
    async function loadExternalFile(url, type = 'text') {
        try {
            console.log(`[CategoryModal] جاري تحميل ${url}...`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`فشل تحميل الملف: ${response.status} ${response.statusText}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error(`[CategoryModal] خطأ في تحميل ${url}:`, error);
            throw error;
        }
    }

    // ============================================
    // 3. إنشاء Shadow DOM وعزل الأنماط
    // ============================================
    async function createModalDOM() {
        console.log('[CategoryModal] إنشاء عناصر النافذة مع Shadow DOM...');

        // إذا كانت النافذة موجودة بالفعل
        if (document.getElementById(MODAL_ID)) {
            console.log('[CategoryModal] النافذة موجودة بالفعل');
            return true;
        }

        try {
            // تحميل HTML وCSS بشكل متوازي
            const [htmlContent, cssContent] = await Promise.allSettled([
                loadExternalFile(HTML_URL),
                loadExternalFile(CSS_URL)
            ]);

            // التحقق من نجاح تحميل HTML
            if (htmlContent.status === 'rejected') {
                console.error('[CategoryModal] فشل تحميل HTML، استخدام بديل');
                throw new Error('تعذر تحميل هيكل النافذة');
            }

            // إنشاء عنصر حاوية للنافذة
            const container = document.createElement('div');
            container.id = 'category-modal-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10000;
            `;

            // إنشاء Shadow DOM
            shadowRoot = container.attachShadow({ mode: 'open' });
            
            // إضافة الأنماط (CSS) إلى Shadow DOM
            styleElement = document.createElement('style');
            styleElement.id = 'category-modal-styles';
            
            if (cssContent.status === 'fulfilled') {
                styleElement.textContent = cssContent.value;
            } else {
                console.warn('[CategoryModal] استخدام أنماط افتراضية بسبب فشل تحميل CSS');
                styleElement.textContent = `
                    /* أنماط افتراضية */
                    .category-modal-backdrop {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0,0,0,0.5);
                        justify-content: center;
                        align-items: center;
                    }
                    .category-modal-backdrop.show { display: flex; }
                    .category-modal-content {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        max-width: 500px;
                        width: 90%;
                    }
                    /* ... يمكن إضافة المزيد من الأنماط الافتراضية */
                `;
            }

            // إضافة HTML إلى Shadow DOM
            const template = document.createElement('template');
            template.innerHTML = htmlContent.value;
            
            // إضافة العناصر إلى Shadow DOM
            shadowRoot.appendChild(styleElement);
            shadowRoot.appendChild(template.content.cloneNode(true));

            // إضافة الحاوية إلى body
            document.body.appendChild(container);

            // جعل العناصر قابلة للنقر
            const modalElement = shadowRoot.getElementById(MODAL_ID);
            if (modalElement) {
                modalElement.style.pointerEvents = 'auto';
                modalElement.querySelector('.category-modal-content').style.pointerEvents = 'auto';
            }

            console.log('[CategoryModal] تم إنشاء النافذة بنجاح مع Shadow DOM');
            return true;

        } catch (error) {
            console.error('[CategoryModal] خطأ في إنشاء النافذة:', error);
            
            // محاولة استخدام طريقة احتياطية بدون Shadow DOM
            return createFallbackModal();
        }
    }

    // ============================================
    // 4. طريقة احتياطية بدون Shadow DOM
    // ============================================
    async function createFallbackModal() {
        console.log('[CategoryModal] استخدام الطريقة الاحتياطية...');
        
        try {
            // تحميل الأنماط بشكل تقليدي
            const cssResponse = await fetch(CSS_URL);
            if (cssResponse.ok) {
                const cssText = await cssResponse.text();
                const style = document.createElement('style');
                style.id = 'category-modal-styles-fallback';
                style.textContent = cssText;
                document.head.appendChild(style);
            }

            // تحميل HTML
            const htmlResponse = await fetch(HTML_URL);
            if (htmlResponse.ok) {
                const htmlText = await htmlResponse.text();
                const container = document.createElement('div');
                container.innerHTML = htmlText;
                document.body.appendChild(container.firstElementChild);
                
                console.log('[CategoryModal] تم إنشاء النافذة بالطريقة الاحتياطية');
                return true;
            }
            
            throw new Error('فشل تحميل الملفات في الطريقة الاحتياطية');
            
        } catch (error) {
            console.error('[CategoryModal] فشل الطريقة الاحتياطية:', error);
            return false;
        }
    }

    // ============================================
    // 5. جلب بيانات الفئات من JSON
    // ============================================
    async function fetchCategoriesData() {
        if (categoriesData && categoriesData.length > 0) {
            return categoriesData;
        }

        try {
            console.log('[CategoryModal] جلب بيانات الفئات...');
            const response = await fetch(CATEGORIES_URL);

            if (!response.ok) {
                throw new Error(`فشل تحميل الملف: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            categoriesData = data.categories || [];

            console.log('[CategoryModal] تم جلب', categoriesData.length, 'فئة');
            return categoriesData;

        } catch (error) {
            console.error('[CategoryModal] خطأ في جلب البيانات:', error);
            throw new Error('تعذر تحميل بيانات الفئات. تأكد من وجود ملف list.json');
        }
    }

    // ============================================
    // 6. الحصول على عناصر من Shadow DOM أو DOM العادي
    // ============================================
    function getModalElement() {
        if (shadowRoot) {
            return shadowRoot.getElementById(MODAL_ID);
        }
        return document.getElementById(MODAL_ID);
    }

    function querySelector(selector) {
        if (shadowRoot) {
            return shadowRoot.querySelector(selector);
        }
        return document.querySelector(selector);
    }

    // ============================================
    // 7. تحديث عنوان النافذة
    // ============================================
    function updateModalTitle(title) {
        const titleElement = querySelector('.category-modal-title');
        if (titleElement && title) {
            titleElement.textContent = title;
        }
    }

    // ============================================
    // 8. إعداد وعرض النافذة (الوظيفة الرئيسية)
    // ============================================
    function showCategoryModal(initialMainId = null, initialSubId = null, customTitle = null) {
        console.log('[CategoryModal] فتح النافذة', { 
            initialMainId, 
            initialSubId, 
            customTitle,
            // تسجيل جميع المعلمات التي تم تمريرها
            argumentsLength: arguments.length,
            allArguments: Array.from(arguments)
        });

        return new Promise(async (resolve) => {
            try {
                // معالجة المعلمات المرنة
                // يمكن للمستخدم تمرير معلمات مختلفة مثل:
                // show() - بدون معلمات
                // show('1') - مع الفئة الرئيسية فقط
                // show('1', '33') - مع فئتين
                // show('1', '33', 'عنوان مخصص') - مع فئتين وعنوان
                // show(null, null, 'عنوان فقط') - مع عنوان فقط
                
                let titleToUse = DEFAULT_TITLE;
                
                // تحديد إذا كان المعامل الثالث هو العنوان
                if (arguments.length === 3 && customTitle !== null) {
                    titleToUse = customTitle;
                }
                // إذا مرر معلمتين فقط وكانت الثانية نصاً (ليست رقم/معرف)
                else if (arguments.length === 2 && typeof initialSubId === 'string' && 
                         isNaN(initialSubId) && initialSubId.trim() !== '') {
                    titleToUse = initialSubId;
                    initialSubId = null; // إعادة ضبط لأنها كانت العنوان
                }
                // إذا مرر معلمة واحدة وكانت نصاً (ليست رقم/معرف)
                else if (arguments.length === 1 && typeof initialMainId === 'string' && 
                         isNaN(initialMainId) && initialMainId.trim() !== '') {
                    titleToUse = initialMainId;
                    initialMainId = null;
                }

                console.log('[CategoryModal] العنوان النهائي:', titleToUse);

                // 1. التحقق من التهيئة
                if (!isInitialized) {
                    console.log('[CategoryModal] تهيئة النافذة لأول مرة');
                    const created = await createModalDOM();
                    if (!created) {
                        resolve({
                            status: 'error',
                            message: 'فشل إنشاء النافذة المنبثقة',
                            mainId: null,
                            subId: null,
                            title: titleToUse,
                            action: null
                        });
                        return;
                    }
                    isInitialized = true;
                }

                // 2. التحقق من وجود العنصر
                const modalElement = getModalElement();
                if (!modalElement) {
                    console.error('[CategoryModal] العنصر غير موجود في DOM');
                    resolve({
                        status: 'error',
                        message: 'عنصر النافذة غير موجود',
                        mainId: null,
                        subId: null,
                        title: titleToUse,
                        action: null
                    });
                    return;
                }

                // 3. تحديث العنوان
                updateModalTitle(titleToUse);

                // 4. جلب البيانات
                let categories;
                try {
                    categories = await fetchCategoriesData();
                } catch (error) {
                    resolve({
                        status: 'error',
                        message: error.message,
                        mainId: null,
                        subId: null,
                        title: titleToUse,
                        action: null
                    });
                    return;
                }

                // 5. الحصول على عناصر DOM
                const mainSelect = querySelector('#main-category');
                const subSelect = querySelector('#sub-category');
                const confirmBtn = querySelector('#confirm-modal-btn');
                const cancelBtn = querySelector('#cancel-modal-btn');
                const validationMsg = querySelector('#validation-message');

                // التحقق من وجود جميع العناصر
                if (!mainSelect || !subSelect || !confirmBtn || !cancelBtn) {
                    resolve({
                        status: 'error',
                        message: 'عناصر النافذة غير مكتملة',
                        mainId: null,
                        subId: null,
                        title: titleToUse,
                        action: null
                    });
                    return;
                }

                // 6. تعبئة القائمة الرئيسية
                mainSelect.innerHTML = '<option value="" disabled selected>اختر السوق الرئيسي...</option>';
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.title;
                    mainSelect.appendChild(option);
                });

                // 7. دالة تحديث القائمة الفرعية
                function updateSubCategories() {
                    const selectedId = mainSelect.value;
                    const selectedCategory = categories.find(cat => String(cat.id) === selectedId);

                    subSelect.innerHTML = '<option value="" disabled selected>اختر السوق الفرعي...</option>';

                    if (validationMsg) {
                        validationMsg.textContent = '';
                    }

                    if (selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
                        selectedCategory.subcategories.forEach(sub => {
                            const option = document.createElement('option');
                            option.value = sub.id;
                            option.textContent = sub.title;
                            subSelect.appendChild(option);
                        });
                        subSelect.disabled = false;
                    } else {
                        subSelect.disabled = true;
                    }
                }

                // 8. تعيين القيم الأولية
                if (initialMainId) {
                    mainSelect.value = initialMainId;
                    updateSubCategories();

                    if (initialSubId) {
                        setTimeout(() => {
                            if (!subSelect.disabled) {
                                const optionExists = Array.from(subSelect.options).some(
                                    opt => opt.value === String(initialSubId)
                                );
                                if (optionExists) {
                                    subSelect.value = initialSubId;
                                }
                            }
                        }, 50);
                    }
                }

                // 9. معالجات الأحداث
                let isModalActive = true;

                function handleMainChange() {
                    updateSubCategories();
                }

                function handleConfirm() {
                    if (!isModalActive) return;

                    const mainId = mainSelect.value;
                    const subId = subSelect.value;

                    if (!mainId || !subId) {
                        if (validationMsg) {
                            validationMsg.textContent = '⚠️ يجب اختيار الفئة الرئيسية والفرعية للمتابعة';
                        }
                        return;
                    }

                    cleanup();
                    isModalActive = false;
                    modalElement.classList.remove('show');
                    document.body.style.overflow = '';

                    resolve({
                        status: 'success',
                        message: 'تم الاختيار بنجاح',
                        mainId: mainId,
                        subId: subId,
                        title: titleToUse,
                        action: 'confirm'
                    });
                }

                function handleCancel() {
                    if (!isModalActive) return;

                    const mainId = mainSelect.value;
                    const subId = subSelect.value;

                    cleanup();
                    isModalActive = false;
                    modalElement.classList.remove('show');
                    document.body.style.overflow = '';

                    resolve({
                        status: 'cancelled',
                        message: 'تم إلغاء العملية',
                        mainId: mainId || null,
                        subId: subId || null,
                        title: titleToUse,
                        action: 'cancel'
                    });
                }

                function handleBackdropClick(e) {
                    if (!isModalActive) return;

                    if (e.target === modalElement) {
                        const mainId = mainSelect.value;
                        const subId = subSelect.value;

                        cleanup();
                        isModalActive = false;
                        modalElement.classList.remove('show');
                        document.body.style.overflow = '';

                        resolve({
                            status: 'cancelled',
                            message: 'تم النقر خارج النافذة',
                            mainId: mainId || null,
                            subId: subId || null,
                            title: titleToUse,
                            action: 'backdrop'
                        });
                    }
                }

                function handleEscKey(e) {
                    if (!isModalActive) return;

                    if (e.key === 'Escape' && modalElement.classList.contains('show')) {
                        const mainId = mainSelect.value;
                        const subId = subSelect.value;

                        cleanup();
                        isModalActive = false;
                        modalElement.classList.remove('show');
                        document.body.style.overflow = '';

                        resolve({
                            status: 'cancelled',
                            message: 'تم الضغط على زر ESC',
                            mainId: mainId || null,
                            subId: subId || null,
                            title: titleToUse,
                            action: 'esc'
                        });
                    }
                }

                // 10. دالة تنظيف المستمعات
                function cleanup() {
                    mainSelect.removeEventListener('change', handleMainChange);
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    modalElement.removeEventListener('click', handleBackdropClick);
                    document.removeEventListener('keydown', handleEscKey);
                    
                    // إعادة العنوان إلى القيمة الافتراضية
                    updateModalTitle(DEFAULT_TITLE);
                }

                // 11. إضافة مستمعات الأحداث
                mainSelect.addEventListener('change', handleMainChange);
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                modalElement.addEventListener('click', handleBackdropClick);
                document.addEventListener('keydown', handleEscKey);

                // 12. عرض النافذة
                modalElement.classList.add('show');
                document.body.style.overflow = 'hidden';

                // التركيز على العنصر المناسب
                setTimeout(() => {
                    if (initialMainId) {
                        subSelect.focus();
                    } else {
                        mainSelect.focus();
                    }
                }, 100);

            } catch (error) {
                console.error('[CategoryModal] خطأ غير متوقع:', error);
                resolve({
                    status: 'error',
                    message: `خطأ غير متوقع: ${error.message}`,
                    mainId: null,
                    subId: null,
                    title: DEFAULT_TITLE,
                    action: null
                });
            }
        });
    }

    // ============================================
    // 9. دالة إغلاق النافذة يدوياً
    // ============================================
    function closeCategoryModal() {
        const modalElement = getModalElement();
        if (modalElement) {
            modalElement.classList.remove('show');
            document.body.style.overflow = '';
            console.log('[CategoryModal] تم إغلاق النافذة يدوياً');
            
            // إعادة العنوان إلى القيمة الافتراضية
            updateModalTitle(DEFAULT_TITLE);
        }
    }

    // ============================================
    // 10. دالة التحقق من حالة النافذة
    // ============================================
    function isModalOpen() {
        const modalElement = getModalElement();
        return modalElement ? modalElement.classList.contains('show') : false;
    }

    // ============================================
    // 11. دالة إعادة تعيين النافذة
    // ============================================
    function resetModal() {
        const modalElement = getModalElement();
        if (!modalElement) return;

        const mainSelect = querySelector('#main-category');
        const subSelect = querySelector('#sub-category');
        const validationMsg = querySelector('#validation-message');

        if (mainSelect) mainSelect.selectedIndex = 0;
        if (subSelect) {
            subSelect.selectedIndex = 0;
            subSelect.disabled = true;
        }
        if (validationMsg) validationMsg.textContent = '';
        
        // إعادة العنوان إلى القيمة الافتراضية
        updateModalTitle(DEFAULT_TITLE);
    }

    // ============================================
    // 12. دالة تنظيف الذاكرة
    // ============================================
    function destroy() {
        const container = document.getElementById('category-modal-container');
        if (container) {
            container.remove();
        }
        
        const fallbackStyle = document.getElementById('category-modal-styles-fallback');
        if (fallbackStyle) {
            fallbackStyle.remove();
        }
        
        shadowRoot = null;
        styleElement = null;
        isInitialized = false;
        categoriesData = [];
        
        console.log('[CategoryModal] تم تنظيف جميع الموارد');
    }

    // ============================================
    // 13. تصدير الواجهة العامة
    // ============================================
    return {
        /**
         * فتح نافذة اختيار الفئات
         * @param {string|null} initialMainId - الفئة الرئيسية الأولية (اختياري)
         * @param {string|null} initialSubId - الفئة الفرعية الأولية أو العنوان المخصص (اختياري)
         * @param {string|null} customTitle - العنوان المخصص للنافذة (اختياري)
         * @returns {Promise<Object>} - يعيد وعداً بكائن النتيجة
         * 
         * أمثلة استخدام:
         * show() - بدون معلمات
         * show('1') - مع الفئة الرئيسية فقط
         * show('1', '33') - مع فئتين
         * show('1', '33', 'اختر التصنيف') - مع فئتين وعنوان
         * show(null, null, 'اختر التصنيف') - مع عنوان فقط
         * show('اختر التصنيف') - مع عنوان فقط (مرونة)
         */
        show: showCategoryModal,

        /**
         * إغلاق النافذة يدوياً
         */
        close: closeCategoryModal,

        /**
         * التحقق مما إذا كانت النافذة مفتوحة
         * @returns {boolean}
         */
        isOpen: isModalOpen,

        /**
         * التحقق مما إذا كانت النافذة مهيأة
         * @returns {boolean}
         */
        isInitialized: function () {
            return isInitialized && (!!getModalElement() || !!shadowRoot);
        },

        /**
         * إعادة تعيين النافذة إلى حالتها الأولية
         */
        reset: resetModal,

        /**
         * تغيير عنوان النافذة يدوياً
         * @param {string} title - العنوان الجديد
         */
        setTitle: function(title) {
            updateModalTitle(title);
        },

        /**
         * الحصول على العنوان الحالي
         * @returns {string}
         */
        getTitle: function() {
            const titleElement = querySelector('.category-modal-title');
            return titleElement ? titleElement.textContent : DEFAULT_TITLE;
        },

        /**
         * تنظيف جميع الموارد وإزالة النافذة من الذاكرة
         */
        destroy: destroy,

        /**
         * الحصول على بيانات الفئات المخزنة
         * @returns {Array}
         */
        getCategories: function () {
            return [...categoriesData];
        },

        /**
         * تهيئة النافذة مسبقاً دون عرضها
         * @returns {Promise<boolean>}
         */
        preload: async function () {
            try {
                // تحميل البيانات والملفات مسبقاً
                await Promise.all([
                    fetchCategoriesData(),
                    loadExternalFile(HTML_URL).catch(() => {}),
                    loadExternalFile(CSS_URL).catch(() => {})
                ]);
                
                if (!isInitialized) {
                    const created = await createModalDOM();
                    isInitialized = created;
                }
                return true;
            } catch (error) {
                console.error('[CategoryModal] فشل التحميل المسبق:', error);
                return false;
            }
        },

        /**
         * الحصول على معلومات التهيئة (لأغراض التصحيح)
         * @returns {Object}
         */
        debug: function () {
            return {
                isInitialized,
                hasShadowDOM: !!shadowRoot,
                categoriesCount: categoriesData.length,
                modalExists: !!getModalElement(),
                defaultTitle: DEFAULT_TITLE,
                currentTitle: this.getTitle()
            };
        }
    };
})();

// ============================================
// 14. تهيئة تلقائية عند تحميل الصفحة
// ============================================
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function () {
        console.log('[CategoryModal] الصفحة محملة، جاهز للاستخدام');
        
        // رسائل مفيدة للمطور
        console.log('[CategoryModal] يمكنك استخدام:');
        console.log('1. CategoryModal.show() - فتح النافذة');
        console.log('2. CategoryModal.show("1", "33") - مع فئات أولية');
        console.log('3. CategoryModal.show("1", "33", "عنوان مخصص") - مع عنوان');
        console.log('4. CategoryModal.setTitle("عنوان جديد") - تغيير العنوان');
        console.log('5. CategoryModal.preload() - التحميل المسبق');
    });
}