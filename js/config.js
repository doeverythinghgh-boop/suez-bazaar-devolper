/**
 * @file js/config.js
 * @description This file contains general settings and constants used throughout the application,
 *   such as API URLs, allowed user lists, and order status maps.
 *   It aims to provide a central point for configuration management.
 */

/**
 * @description Defines the base API URL based on the runtime environment (Local, Cloudflare Pages, or Android App).
 * @type {string}
 * @const
 */
/**
 * @description Defines the base API URL based on the runtime environment (Local, Cloudflare Pages, or Android App).
 * @type {string}
 * @var
 */
window.VERCEL_URL = "https://suez-bazaar.vercel.app";

/**
 * @description List of domain names allowed to use the Vercel URL.
 * @type {string[]}
 * @var
 */
window.allowedHosts = [
  "127.0.0.1",
  "localhost",
  "bazaar-bk1.pages.dev",
  "appassets.androidplatform.net",
  "doeverythinghgh-boop.github.io",
  "suez-bazaar.vercel.app",
];

// ✅ Improvement: Simplify baseURL determination logic using an array.
/**
 * @description Base API URL. Dynamically determined based on the runtime environment.
 * @type {string}
 * @var
 */
window.baseURL = window.allowedHosts.includes(location.hostname) ? window.VERCEL_URL : "";

/**
 * @description List of user IDs with administrative privileges.
 * @type {string[]}
 * @const
 */
const ADMIN_IDS = ["dl14v1k7", "682dri6b"];
