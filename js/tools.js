/**
 * @file js/tools.js
 * @description Provides general helper functions for text and number formatting, session management, local storage interaction, and triggering alerts.
 */



/**
 * @description Checks for an original admin session (originalAdminSession) in local storage.
 *   If found, displays a watermark indicating that the admin is browsing as another user.
 * @function checkImpersonationMode
 * @returns {void}
 */
function checkImpersonationMode() {
  const isImpersonating = SessionManager.isImpersonating();

  if (isImpersonating) {
    // If found, create HTML element for watermark and add to page.
    if (!document.querySelector(".admin-watermark")) {
      const watermark = document.createElement("div");
      watermark.className = "admin-watermark";
      watermark.innerHTML = `
            <i class="fas fa-user-shield"></i>
            <span>وضع المسؤول: تتصفح بصلاحيات المستخدم</span>
            `;
      document.body.appendChild(watermark);
    }
  } else {
    const watermark = document.querySelector(".admin-watermark");
    if (watermark) {
      watermark.remove();
    }
  }
}

/**
 * @description Converts Hindi digits (0-9) to English digits (0-9) in a string.
 *   Useful for processing user inputs that may contain digits in either format.
 * @function normalizeDigits
 * @param {string} str - String that may contain digits.
 * @returns {string} - String after converting digits to English format.
 */
function normalizeDigits(str) {
  if (!str) return "";
  const easternArabicNumerals = /[\u0660-\u0669]/g; // Eastern Arabic (Hindi) numerals range
  return str.replace(easternArabicNumerals, (d) => d.charCodeAt(0) - 0x0660);
}

/**
 * @description Sanitizes and normalizes Arabic text by removing diacritics and unifying character forms (Hamzas and Taa Marbuta).
 *   Very useful for search and comparison operations to ensure text matching regardless of diacritics.
 * @function normalizeArabicText
 * @param {string} text - Arabic text to sanitize.
 * @returns {string} - Text after removing diacritics and unifying characters.
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // Remove diacritics
  text = text.replace(/[\u064B-\u0652]/g, "");

  // Unify Hamzas (أ، إ، آ) to ا
  text = text.replace(/[آأإ]/g, "ا");

  // Convert Taa Marbuta (ة) to Ha (ه)
  text = text.replace(/ة/g, "ه");

  // Unify Ya (ي / ى) to ي
  text = text.replace(/[ى]/g, "ي");

  // Remove Tatweel (ـــ)
  text = text.replace(/ـ+/g, "");

  // Remove duplicate spaces
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * @description Combines status ID with current date and time into a single string.
 *   Result format: "ID#TIMESTAMP" (e.g., "1#2023-10-27T10:00:00.000Z").
 *   This function is used before sending status updates to the server.
 * @function composeOrderStatus
 * @param {number} statusId - Numeric ID of the new status.
 * @returns {string} - Combined string.
 */
function composeOrderStatus(statusId) {
  const timestamp = new Date().toISOString();
  return `${statusId}#${timestamp}`;
}

/**
 * @description Parses the order status string (from database) into a structured object.
 *   Handles cases where the value is invalid or legacy (does not contain #).
 * @function parseOrderStatus
 * @param {string | null | undefined} statusValue - Value stored in `order_status` column.
 * @returns {{statusId: number, timestamp: string | null}} - Object containing status ID and timestamp.
 */
function parseOrderStatus(statusValue) {
  if (!statusValue || typeof statusValue !== "string") {
    return { statusId: -1, timestamp: null }; // Unknown status or empty value
  }

  if (statusValue.includes("#")) {
    const [idStr, timestamp] = statusValue.split("#");
    return { statusId: parseInt(idStr, 10), timestamp: timestamp };
  }

  // Handle legacy data that might be just a number or text
  return { statusId: -1, timestamp: null }; // Assume unknown status if not in new format
}

/**
 * @description Processes a single order object to add formatted status details to it.
 *   This is a central helper function used in the connection layer (connect1.js) to ensure
 *   that all orders coming from API contain `status_details` and `status_timestamp`.
 * @function processOrderStatus
 * @param {object} order - Original order object containing `order_status`.
 * @returns {object} - Order object after adding formatted fields.
 * @see parseOrderStatus
 * @see ORDER_STATUSES
 */
function processOrderStatus(order) {
  const { statusId, timestamp } = parseOrderStatus(order.order_status);
  const statusInfo = ORDER_STATUSES.find((s) => s.id === statusId) || {
    state: "غير معروف",
    description: "حالة الطلب غير معروفة.",
  };
  return {
    ...order,
    status_details: statusInfo,
    status_timestamp: timestamp,
  };
}


/**
 * @function showError
 * @description Displays an error message below the specified input field and adds an error class to it.
 * @param {HTMLInputElement} input - Input element where the error occurred.
 * @param {string} message - Error message to display.
 * @returns {void}
 */
const showError = (input, message) => {
  // Find the element dedicated to displaying the error message.
  const errorDiv = document.getElementById(`${input.id}-error`);
  // Add CSS class to change input style (e.g., change border color to red).
  input.classList.add("input-error");
  // Set error message text.
  errorDiv.textContent = message;
};

/**
 * @function clearError
 * @description Removes the error message from below the specified input field and removes the error class from it.
 * @param {HTMLInputElement} input - Input element to clear error from.
 * @returns {void}
 */
const clearError = (input) => {
  // Find error message element.
  const errorDiv = document.getElementById(`${input.id}-error`);
  // Remove error class from input field.
  input.classList.remove("input-error");
  // Clear error message text.
  errorDiv.textContent = "";
};
/**
 * @description Updates login text in the top bar of the page.
 *   If a user is logged in, displays their name (truncated if long).
 *   If not, displays "Login".
 * @function setUserNameInIndexBar
 * @returns {void}
 */
function setUserNameInIndexBar() {
  let loginTextElement = document.getElementById("index-login-text");

  if (userSession && userSession.username) {
    if (loginTextElement) {
      let displayName = userSession.username;
      if (displayName.length > 8) {
        displayName = displayName.substring(0, 8) + "...";
      }
      loginTextElement.textContent = displayName;
    }
  } else {
    loginTextElement.textContent = "تسجيل الدخول";

  }
}
/**
 * @description Clears all locally stored browser data related to the application,
 *   including `localStorage`, `sessionStorage`, and wiping `IndexedDB` databases.
 *   Typically used for full logout or app cleanup.
 * @function clearAllBrowserData
 * @async
 * @returns {Promise<boolean>} - Promise returning `true` on completion.
 * @throws {Error} - If there's an error clearing localStorage, sessionStorage, or IndexedDB.
 */
async function clearAllBrowserData() {
  // -----------------------------
  // 1) Clear localStorage
  // -----------------------------
  try {
    localStorage.clear();
  } catch (e) {
    console.warn("فشل مسح localStorage:", e);
  }

  // -----------------------------
  // 2) Clear sessionStorage
  // -----------------------------
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn("فشل مسح sessionStorage:", e);
  }



  // -----------------------------
  // 3) Clear IndexedDB
  // -----------------------------
  try {
    if ("indexedDB" in window) {
      const dbs = (await indexedDB.databases?.()) || [];

      for (const db of dbs) {
        if (db && db.name) {
          try {
            indexedDB.deleteDatabase(db.name);
          } catch (dbErr) {
            console.warn(`فشل حذف قاعدة البيانات IndexedDB "${db.name}":`, dbErr);
          }
        }
      }
    }
  } catch (e) {
    console.warn("فشل مسح IndexedDB:", e);
  }

  return true;
}

/**
 * @description Checks the application version from version.json and compares it with the version stored in localStorage.
 *   If the versions are different, it clears browser cache, cookies, and session storage (preserving localStorage and IndexedDB),
 *   then reloads the page to ensure the user has the latest files.
 * @function checkAppVersionAndClearData
 * @async
 * @returns {Promise<void>}
 */
async function checkAppVersionAndClearData() {
  const VERSION_STORAGE_KEY = 'app_version';
  try {
    // 1) Fetch latest version.json with cache busting
    const response = await fetch(`version.json?t=${Date.now()}`);
    if (!response.ok) return;

    const data = await response.json();
    const latestVersion = data.version;
    const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);

    // 2) If versions differ, perform aggressive cleanup (excluding localStorage and IndexedDB)
    if (storedVersion && latestVersion !== storedVersion) {
      console.log(`[VersionCheck] New version detected: ${latestVersion} (Old: ${storedVersion}). Performing deep cleanup...`);

      // A) Clear Session Storage
      sessionStorage.clear();

      // B) Clear Cookies
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }

      // C) Unregister ALL Service Workers (Crucial for immediate PWA update)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[VersionCheck] Service Worker unregistered.');
        }
      }

      // D) Clear ALL Cache Storage (The most important part for file updates)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => {
            console.log(`[VersionCheck] Deleting cache: ${name}`);
            return caches.delete(name);
        }));
      }

      // Update stored version
      localStorage.setItem(VERSION_STORAGE_KEY, latestVersion);

      // E) Force Reload from Server
      console.log("[VersionCheck] Cleanup complete. Forcing reload from server...");
      window.location.reload(true);
    } else if (!storedVersion) {
      // First time visit or storage cleared - just set the version
      localStorage.setItem(VERSION_STORAGE_KEY, latestVersion);
    }
    
    // Save the time of check
    localStorage.setItem('last_version_check_time', Date.now());
  } catch (error) {
    console.error("[VersionCheck] Error checking for updates:", error);
  }
}

/**
 * @description Displays notifications modal using `mainLoader`.
 * @function showNotificationsModal
 * @returns {void}
 * @deprecated - This function is commented out in the code and appears unused.
 */
function showNotificationsModal() {
  //  mainLoader("./notification/page/notifications.html", "index-notifications-container", 500, undefined, "showHomeIcon", true);
}


// Global variable to reuse AudioContext
/**
 * @type {AudioContext|null}
 * @description Global variable to store and reuse the AudioContext instance for notification sounds.
 */
let suzeAudioContext = null;

/**
 * @description Play notification sound using Web Audio API
 * @returns {void}
 * @throws {Error} - If the Web Audio API encounters an error during sound playback.
 */
function playNotificationSound() {
  try {
    // Create AudioContext only when needed
    if (!suzeAudioContext) {
      suzeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Fix if browser suspended AudioContext
    if (suzeAudioContext.state === "suspended") {
      suzeAudioContext.resume();
    }

    const oscillator = suzeAudioContext.createOscillator();
    const gainNode = suzeAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(suzeAudioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 600;

    const now = suzeAudioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    oscillator.start(now);
    oscillator.stop(now + 0.25);

  } catch (error) {
    console.warn("[Sound] فشل تشغيل صوت التنبيه:", error);
  }
}


const pageSnapshots = {};
/**
 * @type {object}
 * @description A cache for storing HTML content of pages fetched via `insertUniqueSnapshot`.
 * Keys are page URLs and values are their HTML content.
 */

/**
 * @description Fetches HTML page content and caches it, then inserts it into a specified container.
 *   Ensures the same page is not loaded repeatedly from network if already cached.
 *   Also re-executes scripts found in the loaded page.
 * @function insertUniqueSnapshot
 * @async
 * @param {string} pageUrl - URL of the page to fetch.
 * @param {string} containerId - ID of the container to insert content into.
 * @returns {Promise<void>}
 * @throws {Error} - If the page fails to load or the container element is not found.
 */
async function insertUniqueSnapshot(pageUrl, containerId) {
  try {
    // Save snapshot if not exists
    if (!pageSnapshots[pageUrl]) {
      const response = await fetch(pageUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("فشل تحميل: " + pageUrl);
      pageSnapshots[pageUrl] = await response.text();
    }

    // Remove previous copies from DOM
    document
      .querySelectorAll(`[data-page-url="${pageUrl}"]`)
      .forEach((el) => el.remove());

    // Insert snapshot
    const container = document.getElementById(containerId);
    if (!container) throw new Error("لا يوجد عنصر: " + containerId);

    container.replaceChildren();
    container.innerHTML = pageSnapshots[pageUrl];
    container.setAttribute("data-page-url", pageUrl);

    // Run all scripts
    const scripts = [...container.querySelectorAll("script")];

    for (const oldScript of scripts) {
      const newScript = document.createElement("script");

      // Copy attributes
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }

      // If inline script
      if (!oldScript.src) {
        let code = oldScript.textContent.trim();

        // Auto-wrap in IIFE to prevent variable re-definition
        code = `(function(){\n${code}\n})();`;

        newScript.textContent = code;
      } else {
        // External script -> add tags to prevent duplication
        const uniqueSrc = oldScript.src + "?v=" + Date.now();
        newScript.src = uniqueSrc;

        if (oldScript.type) newScript.type = oldScript.type;
      }

      oldScript.replaceWith(newScript);

      // Wait for external script to load
      if (newScript.src) {
        await new Promise((resolve) => {
          newScript.onload = resolve;
          newScript.onerror = resolve; // Continue on error
        });
      }
    }

  } catch (err) {
    console.error("خطأ:", err);
  }
}

/**
 * Function that loads an HTML fragment from an external file and merges it into another page,
 * fully re-executing scripts within it,
 * and waits for a period after everything completes.
 *
 * @param {string} pageUrl - URL of the external file to load
 * @param {string} containerId - ID of the element to contain the content
 * @param {number} waitMs - Wait period after loading and executing everything
 * @returns {Promise<void>}
 * @async
 * @throws {Error} - If fetching HTML fails, the container element is not found, or script execution encounters an error.
 */
async function loader(pageUrl, containerId, waitMs = 300) {
  try {
    // ================================
    // 1) Fetch file via fetch
    // ================================
    let response, html;
    try {
      response = await fetch(pageUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("فشل تحميل الملف: " + pageUrl);
      html = await response.text();
    } catch (fetchError) {
      console.error("خطأ أثناء جلب الملف:", fetchError);
      return;
    }

    // ================================
    // 2) Insert content into target element
    // ================================
    let container;
    try {
      container = document.getElementById(containerId);
      if (!container)
        throw new Error("لم يتم العثور على العنصر: " + containerId);

      // Clear content to ensure no old scripts remain
      container.replaceChildren();

      container.innerHTML = html;
    } catch (domError) {
      console.error("خطأ في إدراج المحتوى داخل DOM:", domError);
      return;
    }

    // ================================
    // 3) Extract and re-run all scripts
    // ================================
    try {
      const scripts = [...container.querySelectorAll("script")];

      for (const oldScript of scripts) {
        const newScript = document.createElement("script");

        // Transfer type (important for ES Modules)
        if (oldScript.type) newScript.type = oldScript.type;

        // If external script
        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.async = oldScript.async || false; // Maintain async
        }

        // If inline script
        if (oldScript.innerHTML.trim() !== "") {
          newScript.textContent = oldScript.innerHTML;
        }

        // Transfer script attributes (dataset, attributes)
        for (const attr of oldScript.attributes) {
          if (attr.name !== "src" && attr.name !== "type")
            newScript.setAttribute(attr.name, attr.value);
        }

        oldScript.replaceWith(newScript);

        // Wait for external script to load
        if (newScript.src) {
          await new Promise((resolve) => {
            newScript.onload = resolve;
            newScript.onerror = resolve; // Continue on error
          });
        }
      }
    } catch (scriptError) {
      console.error("خطأ أثناء تشغيل السكربتات:", scriptError);
      return;
    }

    // ================================
    // 4) Wait after everything completes
    // ================================
    try {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    } catch (delayError) {
      console.warn("خطأ أثناء الانتظار:", delayError);
    }

  } catch (globalError) {
    console.error("خطأ غير متوقع في الدالة loader:", globalError);
  }
}



/////////////////////////////////

/**
 * @description Shows a SweetAlert2 modal prompting the user to log in.
 *   If confirmed, it navigates to the login page using mainLoader.
 *   Checks guest session status.
 * @function showLoginAlert
 * @returns {boolean} - Returns false if the user is a guest (and shows alert), true otherwise.
 */
function showLoginAlert() {
  if (!userSession || userSession.user_key == "guest_user") {
    Swal.fire({
      icon: "info",
      title: "تنبيه",
      text: "يرجى تسجيل الدخول أولاً للتمكن من استخدام هذه الميزة.",
      showCancelButton: true,
      confirmButtonText: "تسجيل الدخول",
      cancelButtonText: "إلغاء",
      customClass: { popup: 'fullscreen-swal' }, // Apply custom style
    }).then((result) => {
      if (result.isConfirmed) {
        if (typeof mainLoader === 'function') {
          mainLoader("./pages/login/login.html", "index-user-container", 0, undefined, "hiddenLoginIcon", true);
        } else {
          console.error("mainLoader function is not defined");
        }
      }
    });
    return false;
  }
  return true;
}

/**
        * @function generateSerial
        * @description Generates a unique 6-character alphanumeric serial.
        * @returns {string} Serial.
        */
function generateSerial() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let serial = "";
  for (let i = 0; i < 6; i++) {
    serial += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return serial;
}