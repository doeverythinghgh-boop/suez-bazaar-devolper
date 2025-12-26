/**
 * @file pages/productAdd/js/add1_config.js
 * @description Configuration constants and shared variables for the Product Addition Page.
 */

// --- Default Compression Settings ---
var add1_IMAGE_MAX_WIDTH = 1600; // Max width after compression
var add1_IMAGE_MAX_HEIGHT = 1600; // Max height after compression
var add1_IMAGE_QUALITY = 0.75; // Compression quality 0..1
var add1_MAX_FILES = 6; // Reasonable limit of images

// Global shared state
var add1_images = [];
var add1_idCounter = 1;

// Flag to prevent double processing
window.isProcessingFilesAdd1 = false;
