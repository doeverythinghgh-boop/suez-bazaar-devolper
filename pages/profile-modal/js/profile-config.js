/**
 * @file pages/profile-modal/js/profile-config.js
 * @description Global configuration and state management for the profile modal.
 */

/**
 * State to track if the current password has been verified.
 * Used to avoid redundant password prompts during a single session of the modal.
 * @type {boolean}
 */
var profileIsPasswordVerified = false;
