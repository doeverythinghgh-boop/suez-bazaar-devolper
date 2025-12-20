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
const VERCEL_URL = "https://bazaar-neon-three.vercel.app";

/**
 * @description List of domain names allowed to use the Vercel URL.
 * @type {string[]}
 * @const
 */
const allowedHosts = [
  "127.0.0.1",
  "localhost",
  "bazaar-bk1.pages.dev",
  "appassets.androidplatform.net",
  "doeverythinghgh-boop.github.io",
  "bazaar-neon-three.vercel.app",
];

// ✅ Improvement: Simplify baseURL determination logic using an array.
/**
 * @description Base API URL. Dynamically determined based on the runtime environment.
 * @type {string}
 * @const
 */
const baseURL = allowedHosts.includes(location.hostname) ? VERCEL_URL : "";

/**
 * @description List of admin phone numbers allowed administrative access.
 * @type {string[]}
 * @const
 */
const adminPhoneNumbers = ["01024182175", "01026546550"];
