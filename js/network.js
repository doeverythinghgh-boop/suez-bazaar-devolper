/**
 * @file js/network.js
 * @description Manages network connection state in the application and provides a central function for making API requests.
 *   Includes mechanisms for periodic connection checking, displaying offline notifications, and caching connection state.
 */

/* ----------------------------------------
    🟦 Connection State Cache
---------------------------------------- */
/**
 * @description Timestamp of the last internet connection check.
 * @type {number}
 */
let lastConnectionCheck = 0;
/**
 * @description Cached internet connection state.
 * @type {boolean}
 */
let isConnectedCache = false;
/**
 * @description Reference to the "Swal" (SweetAlert) object for offline notification, to enable closing it.
 * @type {object|null}
 */
let offlineToast = null;
/**
 * @description Interval (in milliseconds) between periodic internet connection checks.
 * @type {number}
 * @const
 */
const CONNECTION_CHECK_INTERVAL = 10000; // 10 seconds

/* ----------------------------------------
    🟦 Function used from anywhere
---------------------------------------- */
/**
 * @description Returns the cached internet connection state.
 * @function checkInternetConnection
 * @returns {boolean} - `true` if there is an internet connection, otherwise `false`.
 * @async
 * @see isConnectedCache
 */
async function checkInternetConnection() {
  return isConnectedCache;
}

/* ----------------------------------------
    🟦 Fixed Snackbar on connection loss
---------------------------------------- */
/**
 * @description Performs an actual internet connection check by attempting to fetch a resource from `gstatic.com`.
 *   Updates the cached connection state (`isConnectedCache`) and shows or hides the offline notification (`offlineToast`) as needed.
 * @function performActualConnectionCheck
 * @returns {Promise<boolean>} - Promise returning `true` if connection is available, otherwise `false`.
 * @async
 * @throws {Error} - If `navigator.onLine` is false or the fetch request fails.
 * @see isConnectedCache
 * @see offlineToast
 * @see lastConnectionCheck
 */
async function performActualConnectionCheck() {
  lastConnectionCheck = Date.now();

  try {
    if (!navigator.onLine) throw new Error(langu("net_no_connection"));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",
      mode: "no-cors",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 🔹 Connection restored
    if (!isConnectedCache) {
      console.log(`%c[${langu('api_fetch_label')}] ${langu('net_restored')}`, "color: green;");
    }

    isConnectedCache = true;

    // 🔹 Close Snackbar if visible
    if (offlineToast) {
      Swal.close();
      offlineToast = null;
    }

    return true;

  } catch (error) {
    // 🔻 Connection lost
    if (isConnectedCache) {
      console.warn(`%c[${langu('api_fetch_label')}] ${langu('net_lost')}`, "color: red;");
    }

    isConnectedCache = false;

    // 🔹 Show fixed Snackbar *only once*
    if (!offlineToast) {
      offlineToast = Swal.fire({
        toast: true,
        position: 'bottom',
        html: `
    <div style="display: grid; align-items:center;justify-items: center;margin:0;padding:0;">
      <i class="fas fa-wifi-slash" style=""></i>
      <span style="font-size:14px;">${langu('net_weak_or_disconnected')}</span>
    </div>
  `,
        showConfirmButton: false,
        background: '#979797d9',
        color: 'white',
        padding: 0,
        width: 300,
        timer: undefined,
        timerProgressBar: false,
        customClass: {

        }
      });


    }

    return false;
  }
}

/* ----------------------------------------
    🟦 Periodic Check
---------------------------------------- */
/**
 * @description Starts periodic internet connection checking and sets up event handlers for browser connection state changes.
 * @function startPeriodicConnectionCheck
 * @returns {void}
 * @see performActualConnectionCheck
 * @see CONNECTION_CHECK_INTERVAL
 * @see isConnectedCache
 * @see offlineToast
 */
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
    🟦 Start
---------------------------------------- */
startPeriodicConnectionCheck();


/**
 * @description Central function for making API requests.
 *   Wraps `fetch` logic, error handling, and JSON conversion.
 * @function apiFetch
 * @param {string} endpoint - API endpoint path (e.g., '/users').
 * @param {object} [options={}] - `fetch` request options, including `method`, `body`, `headers`, and `specialHandlers`.
 * @param {string} [options.method='GET'] - HTTP request method (GET, POST, PUT, DELETE).
 * @param {object|null} [options.body=null] - Data to send with request, converted to JSON.
 * @param {object} [options.headers={}] - HTTP request headers.
 * @param {object} [options.specialHandlers={}] - Object containing functions to handle specific HTTP response statuses (like 401, 404).
 * @returns {Promise<Object>} - Promise containing server response data as JSON object, or error object on failure.
 * @async
 * @throws {Error} - If the fetch request fails or the server responds with a non-OK status.
 * @see baseURL
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

  console.log(`%c${langu('api_fetch_label')} ${method} ${endpoint}`, 'color: #b81717ff;', body ? { payload: body } : '');

  try {
    const response = await fetch(url, fetchOptions);

    if (specialHandlers[response.status]) {
      return specialHandlers[response.status]();
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `${langu('api_http_error')} ${response.status}` };
    }
    return data;
  } catch (error) {
    return { error: `${langu('api_connection_failed')} ${error.message}` };
  }
}