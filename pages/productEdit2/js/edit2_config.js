/**
 * @file pages/productEdit2/js/edit2_config.js
 * @description Configuration constants and global state for the Service Edit Page (Add2/Edit2).
 */

// --- Default Compression Settings ---
var EDIT2_IMAGE_MAX_WIDTH = 1600;
var EDIT2_IMAGE_MAX_HEIGHT = 1600;
var EDIT2_IMAGE_QUALITY = 0.75;
var EDIT2_MAX_FILES = 6;
var EDIT2_CLOUDFLARE_BASE_URL = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev/';

// Global Shared State
var EDIT2_images = [];
var EDIT2_idCounter = 1;
var EDIT2_originalImageNames = [];

// Namespace like object for backward compatibility
window.productModule = {
    get images() { return EDIT2_images; },
    set images(val) { EDIT2_images = val; },
    get originalImageNames() { return EDIT2_originalImageNames; },
    set originalImageNames(val) { EDIT2_originalImageNames = val; }
};
