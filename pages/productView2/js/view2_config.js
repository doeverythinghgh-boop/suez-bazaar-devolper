/**
 * @file pages/productView2/js/view2_config.js
 * @description Configuration and constants for ProductView2 (Service View).
 */

const PV2_IMAGE_MAX_WIDTH = 1920;
const PV2_IMAGE_MAX_HEIGHT = 1920;
const PV2_IMAGE_QUALITY = 0.8;

const PV2_MAX_ORDER_IMAGES = 4;
const PV2_MAX_IMAGE_SIZE_MB = 5;

// Shared States
let pv2_sliderState = {
    currentIndex: 0,
    slides: [],
    dots: [],
    autoPlayInterval: null,
    images: []
};

let pv2_orderImages = []; // Stores blob/file objects for the photo order
