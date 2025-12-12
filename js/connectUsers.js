/**
 * @file js/connectUsers.js
 * @description API connection layer for users.
 *
 * This file contains a set of async functions that facilitate
 * handling user data, including fetching, adding, updating, deleting, and verifying.
 * Depends on the global `baseURL` variable which must be defined in `js/config.js`.
 */

/**
 * @description Fetches a list of all users from the database via API.
 *   Commonly used in admin dashboards.
 * @function fetchUsers
 * @returns {Promise<Array<Object>|null>} - Promise containing an array of user objects, or `null` on error.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function fetchUsers() {
  try {
    const data = await apiFetch('/api/users');
    return data.error ? null : data;
  } catch (error) {
    console.error("%c[fetchUsers] failed:", "color: red;", error);
    return null;
  }
}

/**
 * @description Adds a new user to the database via API.
 * @function addUser
 * @param {object} userData - Object containing all data of the user to append.
 * @param {string} userData.username - Username.
 * @param {string} userData.phone - User phone number.
 * @param {string} [userData.password] - Password (optional).
 * @param {string} [userData.address] - Address (optional).
 * @param {string} userData.user_key - Unique serial number for the user.
 * @returns {Promise<Object>} - Promise containing the created object, or error object on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function addUser(userData) {
  return await apiFetch('/api/users', {
    method: 'POST',
    body: userData,
  });
}

/**
 * @description Updates single user data in the database via API.
 * @function updateUser
 * @param {object} userData - Object containing user data to update. Must contain `user_key` to identify the user.
 * @returns {Promise<Object>} - Promise containing the updated object, or error object on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function updateUser(userData) {
  return await apiFetch('/api/users', {
    method: 'PUT',
    body: userData,
  });
}




/**
 * @description Updates data for multiple users at once via API.
 *   Used in admin dashboard to change roles of multiple users (e.g., upgrade to sellers).
 * @function updateUsers
 * @param {Array<Object>} updates - Array of objects containing update data for each user. Each object must contain at least `user_key`.
 * @returns {Promise<Object>} - Promise containing the server response object, or an error object on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function updateUsers(updates) {
  return await apiFetch('/api/users', {
    method: 'PUT',
    body: updates,
  });
}

/**
 * @description Verifies user password via API.
 * @function verifyUserPassword
 * @param {string} phone - User phone number.
 * @param {string} password - Password to verify.
 * @returns {Promise<Object>} - Promise containing user data object on success, or error object on failure.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function verifyUserPassword(phone, password) {
  return await apiFetch('/api/users', {
    method: 'POST',
    body: { action: 'verify', phone, password },
  });
}

/**
 * @description Deletes a user permanently from the database via API.
 * @function deleteUser
 * @param {string} userKey - Unique key of the user to delete.
 * @returns {Promise<Object>} - Promise containing the server response object.
 * @async
 * @throws {Error} - If `apiFetch` encounters a network error or the API returns an error.
 * @see apiFetch
 */
async function deleteUser(userKey) {
  return await apiFetch('/api/users', {
    method: 'DELETE',
    body: { user_key: userKey },
  });
}
