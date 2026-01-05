/**
 * @file pages/category/categoryModal.js
 * @description This module provides a reusable category selection modal.
 * It encapsulates its UI and logic, optionally using Shadow DOM for style isolation,
 * and handles external file loading, category data fetching, and user interactions
 * to allow selection of main and sub-categories.
 */

window.CategoryModal = (function () {
    'use strict';

    // ============================================
    // 1. Global Variables
    // ============================================
    const MODAL_ID = 'category-modal';
    /**
     * @function getDefaultTitle
     * @returns {string} The default modal title.
     */
    function getDefaultTitle() {
        return '📋 ' + (window.langu ? window.langu('dash_choose_destination') : 'Choose Destination');
    }
    /**
     * @constant
     * @type {string}
     */
    const CATEGORIES_URL = './shared/list.json';
    /**
     * @constant
     * @type {string}
     */
    const HTML_URL = 'pages/category/categoryModal.html';
    /**
     * @constant
     * @type {string}
     */
    const CSS_URL = 'pages/category/categoryModal.css';

    let categoriesData = [];
    /**
     * @type {boolean}
     * @description Indicates if the modal has been initialized (DOM created and event listeners set up).
     */
    let isInitialized = false;
    /**
     * @type {ShadowRoot|null}
     * @description The Shadow DOM root for the modal, if Shadow DOM is used.
     */
    let shadowRoot = null;
    /**
     * @type {HTMLStyleElement|null}
     * @description The style element inserted into the Shadow DOM or document head.
     */
    let styleElement = null;

    // ============================================
    // 2. Function to load external files
    // ============================================
    /**
     * @function loadExternalFile
     * @description Load external file content (HTML/CSS) via fetch.
     * @param {string} url - File URL.
     * @param {string} [type='text'] - Expected response type (currently always treated as text).
     * @returns {Promise<string>} File content as text.
     * @throws {Error} If loading fails.
     * @async
     */
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
    // 3. Create Shadow DOM and Isolate Styles
    // ============================================
    /**
     * @function createModalDOM
     * @description Create modal structure and isolate styles using Shadow DOM.
     * @returns {Promise<boolean>} returns true if successfully created or already exists.
     * @throws {Error} - If HTML content fails to load.
     * @async
     * @see loadExternalFile
     * @see createFallbackModal
     */
    async function createModalDOM() {
        console.log('[CategoryModal] إنشاء عناصر النافذة مع Shadow DOM...');

        // If modal already exists
        if (document.getElementById(MODAL_ID)) {
            console.log('[CategoryModal] النافذة موجودة بالفعل');
            return true;
        }

        try {
            // Load HTML and CSS in parallel
            const [htmlContent, cssContent] = await Promise.allSettled([
                loadExternalFile(HTML_URL),
                loadExternalFile(CSS_URL)
            ]);

            // Check for successful HTML loading
            if (htmlContent.status === 'rejected') {
                console.error('[CategoryModal] فشل تحميل HTML، استخدام بديل');
                throw new Error('تعذر تحميل هيكل النافذة');
            }

            // Create container element for modal
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

            // Create Shadow DOM
            shadowRoot = container.attachShadow({ mode: 'open' });

            // Add styles (CSS) to Shadow DOM
            styleElement = document.createElement('style');
            styleElement.id = 'category-modal-styles';

            if (cssContent.status === 'fulfilled') {
                styleElement.textContent = cssContent.value;
            } else {
                console.warn('[CategoryModal] استخدام أنماط افتراضية بسبب فشل تحميل CSS');
                styleElement.textContent = `
                    /* Default styles */
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
                    /* ... more default styles can be added */
                `;
            }

            // Add HTML to Shadow DOM
            const template = document.createElement('template');
            template.innerHTML = htmlContent.value;

            // Append elements to Shadow DOM
            shadowRoot.appendChild(styleElement);
            shadowRoot.appendChild(template.content.cloneNode(true));

            // Append container to body
            document.body.appendChild(container);

            // Make elements clickable
            const modalElement = shadowRoot.getElementById(MODAL_ID);
            if (modalElement) {
                modalElement.style.pointerEvents = 'auto';
                modalElement.querySelector('.category-modal-content').style.pointerEvents = 'auto';
            }

            // Apply translations and direction to Shadow DOM
            applyShadowTranslations(shadowRoot);

            console.log('[CategoryModal] تم إنشاء النافذة بنجاح مع Shadow DOM');
            return true;

        } catch (error) {
            console.error('[CategoryModal] خطأ في إنشاء النافذة:', error);

            // Attempt to use fallback method without Shadow DOM
            return createFallbackModal();
        }
    }

    // ============================================
    // 4. Fallback Method without Shadow DOM
    // ============================================
    /**
     * @function createFallbackModal
     * @description Fallback method to create modal if Shadow DOM fails.
     * Adds HTML and CSS directly to the main document.
     * @returns {Promise<boolean>} returns true if successful.
     * @throws {Error} - If fetching HTML or CSS fails.
     * @async
     * @see loadExternalFile
     */
    async function createFallbackModal() {
        console.log('[CategoryModal] استخدام الطريقة الاحتياطية...');

        try {
            // Load styles traditionally
            const cssResponse = await fetch(CSS_URL);
            if (cssResponse.ok) {
                const cssText = await cssResponse.text();
                const style = document.createElement('style');
                style.id = 'category-modal-styles-fallback';
                style.textContent = cssText;
                document.head.appendChild(style);
            }

            // Load HTML
            const htmlResponse = await fetch(HTML_URL);
            if (htmlResponse.ok) {
                const htmlText = await htmlResponse.text();
                const container = document.createElement('div');
                container.innerHTML = htmlText;
                document.body.appendChild(container.firstElementChild);

                console.log('[CategoryModal] تم إنشاء النافذة بالطريقة الاحتياطية');
                
                // For fallback, use global translation function
                if (window.applyAppTranslations) {
                    window.applyAppTranslations();
                }
                return true;
            }

            throw new Error('فشل تحميل الملفات في الطريقة الاحتياطية');

        } catch (error) {
            console.error('[CategoryModal] فشل الطريقة الاحتياطية:', error);
            return false;
        }
    }

    // ============================================
    // 5. Fetch Categories Data from JSON
    // ============================================
    /**
     * @function fetchCategoriesData
     * @description Fetch categories data from external JSON file.
     * @returns {Promise<Array>} Categories array.
     * @throws {Error} If data fetching fails.
     * @async
     */
    async function fetchCategoriesData() {
        if (categoriesData && categoriesData.length > 0) {
            return categoriesData;
        }

        try {
            console.log('[CategoryModal] جلب بيانات الفئات...');
            // Use global categories list if available, otherwise fetch
            const data = window.appCategoriesList || await fetchAppCategories();

            if (!data) {
                throw new Error(`فشل تحميل بيانات الفئات`);
            }

            categoriesData = data.categories || [];

            console.log('[CategoryModal] تم جلب', categoriesData.length, 'فئة');
            return categoriesData;

        } catch (error) {
            console.error('[CategoryModal] خطأ في جلب البيانات:', error);
            throw new Error('تعذر تحميل بيانات الفئات. تأكد من وجود ملف list.json');
        }
    }

    // ============================================
    // 6. Get Elements from Shadow DOM or Normal DOM
    // ============================================
    /**
     * @function getModalElement
     * @description Get modal root element (from Shadow DOM or document).
     * @returns {HTMLElement|null} Modal element.
     */
    function getModalElement() {
        if (shadowRoot) {
            return shadowRoot.getElementById(MODAL_ID);
        }
        return document.getElementById(MODAL_ID);
    }

    /**
     * @function querySelector
     * @description Query for an element within modal scope (Shadow DOM or document).
     * @param {string} selector - CSS selector.
     * @returns {HTMLElement|null} Matching element.
     */
    function querySelector(selector) {
        if (shadowRoot) {
            return shadowRoot.querySelector(selector);
        }
        return document.querySelector(selector);
    }

    // ============================================
    // 7. Update Modal Title
    // ============================================
    /**
     * @function updateModalTitle
     * @description Update text displayed in modal title.
     * @param {string} title - New title.
     * @returns {void}
     */
    function updateModalTitle(title) {
        const titleElement = querySelector('.category-modal-title');
        if (titleElement && title) {
            titleElement.textContent = title;
        }
    }

    // ============================================
    // 8. Setup and Show Modal (Main Function)
    // ============================================
    /**
     * @function showCategoryModal
     * @description Main internal function to open modal and manage its lifecycle.
     * @param {string|null} [initialMainId=null] - Initial main category ID.
     * @param {string|null} [initialSubId=null] - Initial sub-category ID.
     * @param {string|null} [customTitle=null] - Custom title.
     * @returns {Promise<object>} Promise resolved when modal is successfully closed or cancelled.
     * @async
     * @throws {Error} - If an unexpected error occurs during modal display.
     * @see createModalDOM
     * @see getModalElement
     * @see updateModalTitle
     * @see fetchCategoriesData
     * @see querySelector
     */
    function showCategoryModal(initialMainId = null, initialSubId = null, customTitle = null) {
        console.log('[CategoryModal] فتح النافذة', {
            initialMainId,
            initialSubId,
            customTitle,
            // Log all passed arguments
            argumentsLength: arguments.length,
            allArguments: Array.from(arguments)
        });

        return new Promise(async (resolve) => {
            try {
                // Handle flexible arguments
                // User can pass different arguments like:
                // show() - No arguments
                // show('1') - With main category only
                // show('1', '33') - With two categories
                // show('1', '33', 'Custom Title') - With two categories and title
                // show(null, null, 'Title Only') - With title only

                let titleToUse = getDefaultTitle();

                // Determine if third argument is title
                if (arguments.length === 3 && customTitle !== null) {
                    titleToUse = customTitle;
                }
                // If two arguments passed and second is string (not number/ID)
                else if (arguments.length === 2 && typeof initialSubId === 'string' &&
                    isNaN(initialSubId) && initialSubId.trim() !== '') {
                    titleToUse = initialSubId;
                    initialSubId = null; // Reset because it was title
                }
                // If one argument passed and is string (not number/ID)
                else if (arguments.length === 1 && typeof initialMainId === 'string' &&
                    isNaN(initialMainId) && initialMainId.trim() !== '') {
                    titleToUse = initialMainId;
                    initialMainId = null;
                }

                console.log('[CategoryModal] العنوان النهائي:', titleToUse);

                // 1. Check Initialization
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

                // 2. Check for Element Existence
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

                // 3. Update Title
                updateModalTitle(titleToUse);

                // 4. Fetch Data
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

                // 5. Get DOM Elements
                const mainSelect = querySelector('#main-category');
                const subSelect = querySelector('#sub-category');
                const confirmBtn = querySelector('#confirm-modal-btn');
                const cancelBtn = querySelector('#cancel-modal-btn');
                const validationMsg = querySelector('#validation-message');

                // Check for existence of all elements
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

                // 6. Populate Main List
                mainSelect.innerHTML = `<option value="" disabled selected>${window.langu('cat_select_main_placeholder')}</option>`;
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    // Handle title as object or string
                    const titleObj = category.title;
                    const displayTitle = typeof titleObj === 'object' ? 
                        (titleObj[window.app_language] || titleObj['ar']) : titleObj;
                    option.textContent = displayTitle;
                    mainSelect.appendChild(option);
                });

                // 7. Sub-category Update Function
                /**
                 * @description Updates the sub-category dropdown based on the selected main category.
                 * If the selected main category has subcategories, it populates the sub-category dropdown
                 * and enables it; otherwise, it disables the dropdown.
                 * @function updateSubCategories
                 * @returns {void}
                 */
                function updateSubCategories() {
                    const selectedId = mainSelect.value;
                    const selectedCategory = categories.find(cat => String(cat.id) === selectedId);

                    subSelect.innerHTML = `<option value="" disabled selected>${window.langu('cat_select_sub_placeholder')}</option>`;

                    if (validationMsg) {
                        validationMsg.textContent = '';
                    }

                    if (selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
                        selectedCategory.subcategories.forEach(sub => {
                            const option = document.createElement('option');
                            option.value = sub.id;
                            // Handle title as object or string
                            const subTitleObj = sub.title;
                            const subDisplayTitle = typeof subTitleObj === 'object' ? 
                                (subTitleObj[window.app_language] || subTitleObj['ar']) : subTitleObj;
                            option.textContent = subDisplayTitle;
                            subSelect.appendChild(option);
                        });
                        subSelect.disabled = false;
                    } else {
                        subSelect.disabled = true;
                    }
                }

                // 8. Set Initial Values
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

                // 9. Event Handlers
                let isModalActive = true;

                /**
                 * @description Event handler for when the main category selection changes.
                 * Triggers the update of sub-categories.
                 * @function handleMainChange
                 * @returns {void}
                 */
                function handleMainChange() {
                    updateSubCategories();
                }

                /**
                 * @description Handles the confirmation action of the modal.
                 * Validates selections and resolves the modal promise with success status.
                 * @function handleConfirm
                 * @returns {void}
                 */
                function handleConfirm() {
                    if (!isModalActive) return;

                    const mainId = mainSelect.value;
                    const subId = subSelect.value;

                    if (!mainId || !subId) {
                        if (validationMsg) {
                            validationMsg.textContent = '⚠️ ' + window.langu('api_connection_failed').replace(':', '') + ' (Main/Sub)';
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

                /**
                 * @description Handles the cancellation action of the modal.
                 * Resolves the modal promise with a cancelled status.
                 * @function handleCancel
                 * @returns {void}
                 */
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

                /**
                 * @description Handles clicks outside the modal content, treating it as a cancellation.
                 * @function handleBackdropClick
                 * @param {MouseEvent} e - The click event object.
                 * @returns {void}
                 */
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

                /**
                 * @description Handles the 'Escape' key press to close the modal.
                 * @function handleEscKey
                 * @param {KeyboardEvent} e - The keyboard event object.
                 * @returns {void}
                 */
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

                // 10. Cleanup Listeners Function
                /**
                 * @description Removes all event listeners to prevent memory leaks and duplicate triggers.
                 * Also resets the modal title to its default value.
                 * @function cleanup
                 * @returns {void}
                 */
                function cleanup() {
                    mainSelect.removeEventListener('change', handleMainChange);
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    modalElement.removeEventListener('click', handleBackdropClick);
                    document.removeEventListener('keydown', handleEscKey);

                    // Reset title to default
                    updateModalTitle(getDefaultTitle());
                }

                // 11. Add Event Listeners
                mainSelect.addEventListener('change', handleMainChange);
                confirmBtn.addEventListener('click', handleConfirm);
                cancelBtn.addEventListener('click', handleCancel);
                modalElement.addEventListener('click', handleBackdropClick);
                document.addEventListener('keydown', handleEscKey);

                // 12. Show Modal
                modalElement.classList.add('show');
                document.body.style.overflow = 'hidden';

                // Focus on appropriate element
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
                    title: getDefaultTitle(),
                    action: null
                });
            }
        });
    }

    // ============================================
    // 9. Manual Modal Close Function
    // ============================================
    /**
     * @function closeCategoryModal
     * @description Manually close modal and hide from UI.
     * @returns {void}
     * @see getModalElement
     * @see updateModalTitle
     */
    function closeCategoryModal() {
        const modalElement = getModalElement();
        if (modalElement) {
            modalElement.classList.remove('show');
            document.body.style.overflow = '';
            console.log('[CategoryModal] تم إغلاق النافذة يدوياً');

            // Reset title to default
            updateModalTitle(getDefaultTitle());
        }
    }

    // ============================================
    // 10. Modal State Check Function
    // ============================================
    /**
     * @function isModalOpen
     * @description Check if modal is currently open (has 'show' class).
     * @returns {boolean} true if open.
     * @see getModalElement
     */
    function isModalOpen() {
        const modalElement = getModalElement();
        return modalElement ? modalElement.classList.contains('show') : false;
    }

    // ============================================
    // 11. Reset Modal Function
    // ============================================
    /**
     * @function resetModal
     * @description Reset modal fields (dropdowns, title) to default state.
     * @returns {void}
     * @see getModalElement
     * @see querySelector
     * @see updateModalTitle
     */
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

        // Reset title to default
        updateModalTitle(getDefaultTitle());
    }

    // ============================================
    // 12. Memory Cleanup Function
    // ============================================
    /**
     * @function destroy
     * @description Remove modal and its elements completely from DOM and clear variables.
     * @returns {void}
     */
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
    // 13. Internal Translation Helper
    // ============================================
    /**
     * @function applyShadowTranslations
     * @description Applies translations and direction to elements within the Shadow DOM.
     * @param {ShadowRoot} root - The shadow root to apply translations to.
     */
    function applyShadowTranslations(root) {
        if (!root || !window.langu) return;

        const lang = window.app_language || 'ar';
        const dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Set direction on the container inside shadow root
        const container = root.querySelector('.category-modal-backdrop');
        if (container) {
            container.setAttribute('dir', dir);
            container.setAttribute('lang', lang);
        }

        // Translate elements with data-lkey
        root.querySelectorAll('[data-lkey]').forEach(el => {
            const key = el.getAttribute('data-lkey');
            el.textContent = window.langu(key);
        });
        
         // Translate Placeholders inside Shadow DOM
        root.querySelectorAll('[data-lkey-placeholder]').forEach(el => {
            const key = el.getAttribute('data-lkey-placeholder');
            el.setAttribute('placeholder', window.langu(key));
        });
    }

    // ============================================
    // 14. Export Public Interface
    // ============================================
    return {
        /**
         * Open category selection modal
         * @param {string|null} initialMainId - Initial Main Category ID (optional)
         * @param {string|null} initialSubId - Initial Sub-Category ID or Custom Title (optional)
         * @param {string|null} customTitle - Custom Modal Title (optional)
         * @returns {Promise<Object>} - Returns a promise with result object
         * 
         * Usage examples:
         * show() - No arguments
         * show('1') - With main category only
         * show('1', '33') - With two categories
         * show('1', '33', 'Select Category') - With two categories and title
         * show(null, null, 'Select Category') - With title only
         * show('Select Category') - With title only (flexible)
         */
        show: showCategoryModal,

        /**
         * Manually close modal
         */
        close: closeCategoryModal,

        /**
         * Check if modal is open
         * @returns {boolean}
         */
        isOpen: isModalOpen,

        /**
         * @description Checks if the modal has been initialized.
         * @function isInitialized
         * @returns {boolean}
         */
        isInitialized: function () {
            return isInitialized && (!!getModalElement() || !!shadowRoot);
        },

        /**
         * Reset modal to initial state
         */
        reset: resetModal,

        /**
         * Manually change modal title
         * @param {string} title - New Title
         */
        setTitle: function (title) {
            updateModalTitle(title);
        },

        /**
         * Get current title
         * @returns {string}
         */
        getTitle: function () {
            const titleElement = querySelector('.category-modal-title');
            return titleElement ? titleElement.textContent : DEFAULT_TITLE;
        },

        /**
         * Clean all resources and remove modal from memory
         */
        destroy: destroy,

        /**
         * @description Retrieves a copy of the currently loaded categories data.
         * @function getCategories
         * @returns {Array}
         */
        getCategories: function () {
            return [...categoriesData];
        },

        /**
         * @description Preloads the modal's external files and category data without displaying it.
         * Useful for optimizing the first display time.
         * @function preload
         * @returns {Promise<boolean>}
         * @async
         * @throws {Error} - If preloading of external files or category data fails.
         */
        preload: async function () {
            try {
                // Preload data and files
                await Promise.all([
                    fetchCategoriesData(),
                    loadExternalFile(HTML_URL).catch(() => { }),
                    loadExternalFile(CSS_URL).catch(() => { })
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
         * @description Provides debugging information about the modal's current state.
         * @function debug
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
// 14. Automatic Initialization on Page Load
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