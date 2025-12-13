/**
 * @file dataFetchers.js
 * @description Data Fetching Module.
 * This file contains functions responsible for fetching basic application data from local JSON files (or configured objects).
 * It uses `fetch` API (or direct resolution) to retrieve data asynchronously.
 */

import { appDataControl, ordersData } from "./config.js";

/**
 * @function fetchControlData
 * @description Returns control data directly from the configuration file.
 * Replaced fetching `control.json` with using the `appDataControl` variable from `config.js`.
 *
 * @returns {Promise<Object>} A Promise that resolves with the control data object.
 * @throws {Error} - If there is an error resolving the promise with `appDataControl`.
 * @see appDataControl
 */
export function fetchControlData() {
    try {
        // Return data directly as a Promise to maintain interface compatibility with existing code
        return Promise.resolve(appDataControl);
    } catch (error) {
        console.error("Error in fetchControlData:", error);
        return Promise.reject(error);
    }
}

/**
 * @function fetchOrdersData
 * @description Returns orders data directly from the configuration file.
 * Replaced fetching `orders_.json` with using the `ordersData` variable from `config.js`.
 *
 * @returns {Promise<Object>} A Promise that resolves with the orders data object (array).
 * @throws {Error} - If there is an error resolving the promise with `ordersData`.
 * @see ordersData
 */
export function fetchOrdersData() {
    try {
        // Return data directly as a Promise
        return Promise.resolve(ordersData);
    } catch (error) {
        console.error("Error in fetchOrdersData:", error);
        return Promise.reject(error);
    }
}
