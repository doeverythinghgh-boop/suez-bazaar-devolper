/**
 * @file pages/productEdit/js/edit_config.js
 * @description Configuration constants and global state for the Product Edit Page.
 */

// --- Default Compression Settings ---
var EDIT_IMAGE_MAX_WIDTH = 1600;
var EDIT_IMAGE_MAX_HEIGHT = 1600;
var EDIT_IMAGE_QUALITY = 0.75;
var EDIT_MAX_FILES = 6;
var EDIT_CLOUDFLARE_BASE_URL = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/';

// Global State
var EDIT_images = [];
var EDIT_idCounter = 1;
var EDIT_originalImageNames = [];

// Namespace like object for backward compatibility if needed by external scripts
window.productModule = {
    get images() { return EDIT_images; },
    set images(val) { EDIT_images = val; },
    get originalImageNames() { return EDIT_originalImageNames; },
    set originalImageNames(val) { EDIT_originalImageNames = val; }
};
