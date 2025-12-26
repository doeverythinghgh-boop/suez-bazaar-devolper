/**
 * @file pages/productAdd2/js/add2_config.js
 * @description Configuration constants and shared variables for the Product Addition 2 Page.
 */

// --- Default Compression Settings ---
var add2_IMAGE_MAX_WIDTH = 1600; // Max width after compression
var add2_IMAGE_MAX_HEIGHT = 1600; // Max height after compression
var add2_IMAGE_QUALITY = 0.75; // Compression quality 0..1
var add2_MAX_FILES = 6; // Reasonable limit of images

// Global shared state
var add2_images = [];
var add2_idCounter = 1;

// Flag to prevent double processing
window.isProcessingFilesAdd2 = false;
