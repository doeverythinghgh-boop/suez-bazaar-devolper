/**
 * @file js/forms.js
 * =======================================================================
 * Dynamic Content Loader Module (BidStory)
 *
 * Updated profileRestartScripts to wrap inline codes with IIFE
 * to handle "Identifier has already been declared" errors affecting const/let.
 * 
 * Added containerGoBack function to return to previous container
 * =======================================================================
 */

// Log of IDs for containers that have been loaded, maintaining order
/**
 * @constant
 * @type {string[]}
 * @description Stores the IDs of containers that have been loaded, maintaining their order.
 * This registry is used to manage dynamic content loading and navigation history.
 */
const LOADER_REGISTRY = [];

/**
 * @description Hide all registered containers except current one, and check if container needs loading or just displaying.
 * @function profileHandleRegistry
 * @param {string} containerId - Target container ID.
 * @param {boolean} reload - Should content be reloaded even if registered?
 * @returns {boolean} - true if container found and reload not requested, stopping load process.
 * @throws {Error} - If an error occurs during DOM manipulation or array operations.
 */
function profileHandleRegistry(containerId, reload) {
    try {
        // Hide all currently open containers to mimic tab system
        LOADER_REGISTRY.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        // Search for container in array
        const existingIndex = LOADER_REGISTRY.indexOf(containerId);

        // If container is already registered
        if (existingIndex !== -1) {
            const container = document.getElementById(containerId);
            if (container) container.style.display = "block";

            if (container) container.style.display = "block";

            // Move container to end of array to become most recent
            LOADER_REGISTRY.splice(existingIndex, 1);
            LOADER_REGISTRY.push(containerId);

            // Stop loading process if not required
            if (!reload) {
                return true;
            }
        } else {
            // Register new container at end of array
            LOADER_REGISTRY.push(containerId);
        }
        return false; // Continue loading process
    } catch (error) {
        console.error("خطأ في إدارة سجل التحميل (profileHandleRegistry):", error);
        return false;
    }
}

/**
 * @description Fetch HTML content from specified URL.
 * @function profileFetchContent
 * @param {string} pageUrl - URL of page to fetch.
 * @returns {Promise<string|null>} - Promise returning HTML content or null on error.
 * @async
 * @throws {Error} - If the fetch request fails or the response is not OK.
 */
async function profileFetchContent(pageUrl) {
    try {
        const response = await fetch(pageUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`فشل تحميل الملف (${response.status}): ${pageUrl}`);
        }
        return await response.text();
    } catch (error) {
        console.error("خطأ في جلب محتوى الملف (profileFetchContent):", error);
        return null;
    }
}

/**
 * @description Manually restart inline scripts (Method: hgh_sec).
 *
 * *Updated*: Wrapping inline scripts with IIFE
 * to create private scope and avoid "already declared" error with const/let.
 * @function profileRestartScripts
 * @param {HTMLElement} container - Element containing scripts to restart.
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If an error occurs during DOM manipulation or script execution.
 */
async function profileRestartScripts(container) {
    try {
        // Extract all existing script elements
        const scripts = [...container.querySelectorAll("script")];

        for (const oldScript of scripts) {
            const newScript = document.createElement("script");

            // 1. Copy attributes and properties
            for (const attr of oldScript.attributes) {
                newScript.setAttribute(attr.name, attr.value);
            }

            // 2. Handle script content (for inline scripts)
            if (oldScript.innerHTML.trim()) {
                let scriptContent = oldScript.innerHTML;

                // Wrap inline code with IIFE to create private scope
                // This prevents "Identifier 'X' has already been declared" error on reload
                scriptContent = `(function() {
                    try {
                        ${scriptContent}
                    } catch (err) {
                        // Print error to help trace issue inside executed script
                        console.error("❌ خطأ في تنفيذ سكربت مُغلّف (IIFE) بعد التحميل:", err);
                    }
                })();`;

                newScript.textContent = scriptContent;
            }

            // 3. Replace old script with new one
            oldScript.replaceWith(newScript);

            // 4. If script is external (has src), must wait for it to load
            if (newScript.src) {
                // Wait using Promise to ensure sequential execution before proceeding to next script
                await new Promise((resolve) => {
                    newScript.onload = () => resolve();
                    newScript.onerror = () => {
                        console.error(`❌ فشل تحميل السكربت الخارجي: ${newScript.src}`);
                        resolve(); // Continue even if script fails
                    };
                });
            }
        }
    } catch (error) {
        console.error("خطأ في إعادة تشغيل السكربتات (profileRestartScripts):", error);
    }
}

/**
 * @description Execute callback function after load completes.
 * @function profileExecuteCallback
 * @function profileExecuteCallback
 * @param {string|string[]} callbackName - Name of callback function (or array of names) in global scope (window).
 * @returns {void}
 * @throws {Error} - If the specified callback function does not exist or throws an error during execution.
 */
function profileExecuteCallback(callbackName) {
    try {
        if (!callbackName) return;

        // Support multiple callbacks (Array of callbacks)
        if (Array.isArray(callbackName)) {
            callbackName.forEach(name => profileExecuteCallback(name));
            return;
        }

        if (!window[callbackName] || typeof window[callbackName] !== "function") return;

        const callback = window[callbackName];
        console.log(`✔ تم تنفيذ دالة رد النداء (Callback) باسم: ${callbackName}`);
        callback();

    } catch (error) {
        console.error("خطأ في تنفيذ دالة رد النداء (profileExecuteCallback):", error);
    }
}

/**
 * @description Clears styles and scripts associated with previous container load to prevent conflict.
 * @function profileClearOldContent
 * @param {string} containerId - Target container ID.
 * @returns {void}
 * @throws {Error} - If an error occurs during DOM manipulation.
 */
function profileClearOldContent(containerId) {
    try {
        // 1. Clear custom CSS automatically added to container
        // Search using custom attribute data-loader-id to ensure precise selection
        document.querySelectorAll(`style[data-loader-id="${containerId}"]`).forEach(styleTag => {
            styleTag.remove();
        });

        // 2. Clear HTML content of container
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }

        console.log(`✔ تم مسح المحتوى والـ CSS القديم المتعلق بالحاوية: ${containerId}`);

    } catch (error) {
        console.error("خطأ في مسح المحتوى القديم (profileClearOldContent):", error);
    }
}

/**
 * @description Main function to load dynamic content and apply it to target container.
 *
 * @param {string} pageUrl - Page URL to load.
 * @param {string} containerId - Target container ID.
 * @param {number} [waitMs=300] - Wait time in milliseconds.
 * @param {string} [cssRules=...] - CSS code applied to container (default ready).
 * @param {string|string[]} [callbackName] - Name of callback function (or array of names) in global scope (window) to be called after load.
 * @param {boolean} [reload=false] - Force content reload even if registered.
 */
async function mainLoader(
    pageUrl,
    containerId,
    waitMs = 300,
    cssRules = `
        flex: 1;
        border: none;
        overflow-y: auto;
        overflow-x: hidden;
    `,
    callbackName,
    reload = false
) {
    try {
        // 1. Registry management and hiding other containers
        const skipLoading = profileHandleRegistry(containerId, reload);

        if (skipLoading) {
            profileExecuteCallback(callbackName);
            return;
        }

        // 2. Clear on reload: prevents conflict of old Styles and Scripts
        if (reload) {
            profileClearOldContent(containerId);
        }

        // 3. Fetch HTML content
        const html = await profileFetchContent(pageUrl);

        if (html === null) return; // Load failed

        const container = document.getElementById(containerId);
        if (!container) {
            console.error("لم يتم العثور على العنصر: " + containerId);
            return;
        }

        // Insert content and show container
        container.innerHTML = html;
        container.style.display = "block";

        // 4. Apply CSS automatically (SoC)
        const styleTag = document.createElement("style");
        // Add custom attribute to distinguish loader-created styles
        styleTag.setAttribute('data-loader-id', containerId);
        styleTag.innerHTML = `
            #${containerId} {
                ${cssRules}
            }
        `;
        document.head.appendChild(styleTag);

        // 5. Restart scripts (Saved method: hgh_sec)
        await profileRestartScripts(container);

        // 6. Wait
        await new Promise((r) => setTimeout(r, waitMs));

        // Final output log of load process
        console.log(
            `%c✔✔✔✔✔✔✔ تم التحميل ✔✔✔✔✔✔✔\n` +
            `pageUrl: ${pageUrl}\n` +
            `containerId: ${containerId}\n` +
            `reload: ${reload}`,
            "color: #0a4902ff; font-size: 12px; font-weight: bold; font-family: 'Tahoma';"
        );

        // 7. Execute callback
        profileExecuteCallback(callbackName);

    } catch (globalError) {
        console.error("خطأ عام غير متوقع في دالة mainLoader:", globalError);
    }
}
/**
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If any sub-function (`profileHandleRegistry`, `profileClearOldContent`, `profileFetchContent`, `profileRestartScripts`, `profileExecuteCallback`) throws an error, or if critical DOM elements are not found.
 * @see profileHandleRegistry
 * @see profileClearOldContent
 * @see profileFetchContent
 * @see profileRestartScripts
 * @see profileExecuteCallback
 */

/**
 * @description Go back to previous container (if any) and remove current container from registry.
 * @function containerGoBack
 * @returns {boolean} - true if successful, false if no previous container to return to.
 * @throws {Error} - If an error occurs during DOM manipulation or registry updates.
 * @see profileClearOldContent
 */
function containerGoBack() {
    try {
        // Check if enough containers to go back
        if (LOADER_REGISTRY.length < 2) {
            console.warn("⚠ لا توجد حاوية سابقة للعودة إليها.");
            return false;
        }

        // Remove current container from end of array
        const currentContainerId = LOADER_REGISTRY.pop();

        // Get previous container (now last in array)
        const previousContainerId = LOADER_REGISTRY[LOADER_REGISTRY.length - 1];

                                                                                        // Hide current container
        const currentContainer = document.getElementById(currentContainerId);
        if (currentContainer) {
            currentContainer.style.display = "none";
        }

        // Clean current container content if still in DOM
        profileClearOldContent(currentContainerId);

        // Show previous container
        const previousContainer = document.getElementById(previousContainerId);
        if (previousContainer) {
            previousContainer.style.display = "block";

            // Log to console for analysis
            console.log(
                `%c↩ تم العودة من ${currentContainerId} إلى ${previousContainerId}\n` +
                `السجل الحالي: [${LOADER_REGISTRY.join(", ")}]`,
                "color: #1a73e8; font-weight: bold;"
            );

            return true;
        } else {
            console.error(`❌ لم يتم العثور على الحاوية السابقة: ${previousContainerId}`);
            return false;
        }

    } catch (error) {
        console.error("خطأ في دالة containerGoBack:", error);
        return false;
    }
}