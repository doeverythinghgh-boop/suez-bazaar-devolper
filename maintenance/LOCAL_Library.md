# Local Assets Hosting Guide (Local Assets Guide)

This file explains how fonts and external libraries are managed within the "Suez Bazaar" project to ensure best performance and complete independence from external servers (CDNs).

## 1. Fonts and Icons (Font Awesome)

Font Awesome has been moved from online loading to full local hosting:
- **Path**: `assets/fontawesome/`
- **Files**:
  - `css/all.css`: Contains all styles.
  - `webfonts/`: Contains font files in `.woff2` format (fastest and lightest).
- **Optimization**:
  We use the `preload` technique in the `index.html` file to load the most important font files very early:
  ```html
  <link rel="preload" href="assets/fontawesome/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin />
  ```

## 2. Third-Party Libraries

All programming libraries are located in a unified folder for easy management:
- **Base Path**: `assets/libs/`

### SweetAlert2
- **Path**: `assets/libs/sweetalert2/sweetalert2.all.min.js`
- **Usage**: Called in all pages that require interactive alerts.

### Firebase (v8.10.1)
Versions compatible with the Service Worker have been downloaded to ensure notifications work offline:
- **Path**: `assets/libs/firebase/`
- **Files**:
  - `firebase-app-8.10.1.js`
  - `firebase-messaging-8.10.1.js`

### jsrsasign (v10.5.25)
- **Path**: `assets/libs/jsrsasign/jsrsasign-all-min.js`
- **Usage**: Used for client-side JWT signing to enable P2P notification sending in the PWA.

## 3. Why Use Local Hosting?

1. **Performance**: Reducing DNS Lookup and SSL Handshake time with external sites.
2. **Offline Support**: The application works, and icons and alerts appear even if the internet service is interrupted or the CDN is blocked.
3. **Version Stability**: We ensure no sudden changes occur in the libraries due to updates from the external source.

## 4. How to Update

To update any library in the future:
1. Download the new version from the official library site or from `jsdelivr`.
2. Replace the old file in the `assets/libs/` folder while keeping the same filename or updating the path in the HTML files.
3. Ensure all pages using this library are updated.
