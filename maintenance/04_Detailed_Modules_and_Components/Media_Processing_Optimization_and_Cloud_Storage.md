# Media Processing Optimization and Cloud Storage

Efficient media handling is critical for Bazaar's performance on mobile devices with limited bandwidth and memory.

## 1. Client-Side Image Processing
Before any upload, images undergo a transformation process:
- **Compression**: Dimensions are normalized (Max Width 1600px, quality 0.75).
- **Format Conversion**: Priority is given to the **WebP** format to reduce file size by up to 30% compared to JPEG.
- **Resource Management**: Uses `createImageBitmap` and `OffscreenCanvas` (if available) to prevent UI thread blocking during compression.

## 2. Cloudflare R2 Storage Architecture
- **Strategy**: R2 is used as the high-availability "Single Source of Truth" for all user and marketing media.
- **Naming Convention**: 
  - `product_key` or `order_key` suffixes are used for unique identification.
  - Seller and Category identifiers are embedded in the path for logical grouping.

## 3. Parallel Upload System
- **`uploadFile2cf`**: A non-blocking utility that handles multi-part uploads.
- **State Tracking**: The `add1_images` (Physical) and `add2_images` (Service) arrays track the progress of each media item (pending, uploading, success, error).

## 4. Maintenance & Cleanup
- **Orphan Removal**: When a product or advertisement is deleted, the system calls `deleteFile2cf` to physically remove the associated blobs from the R2 bucket.
- **Manifest Updates**: The `advertisements.json` file is only updated after all associated images are verified in storage to prevent broken image placeholders.

## 5. Technical Requirements
- **Sharp Library**: Used in the Node.js `build.js` environment for pre-generating PWA icons and optimizing static promotional banners.
- **Compatibility Fallback**: If a browser does not support WebP, the system automatically falls back to High-Quality JPEG (0.8 quality).
