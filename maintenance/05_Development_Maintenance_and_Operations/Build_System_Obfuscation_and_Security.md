# Build System Obfuscation and Security

The build process transforms the development source code into a protected, optimized, and production-ready `dist/` folder.

## 1. The Build Script (`build.js`)
This Node.js script is the primary orchestrator for preparing the distribution repository.

### Workflow Steps:
1. **Auto-Versioning**: Automatically increments the patch version in `version.json`.
2. **Cleanup**: Wipes the existing `dist/` directory to ensure no stale files remain.
3. **Asset Cloning**: Copies all CSS, images, and external libraries. (Excludes `api/`, `note/`, and `function/` folders).
4. **HTML/CSS Minification**: Uses `html-minifier-terser` and `clean-css` to reduce file sizes for faster mobile loading.

## 2. JavaScript Protection
Bazaar uses the `javascript-obfuscator` library to protect intellectual property and prevent reverse-engineering of sensitive logic (e.g., P2P notification signing).

### Obfuscation Policy:
- **IIFE Wrapping**: All logic is wrapped in IIFEs to isolate scopes.
- **Global Preservation**: `renameGlobals` is disabled to ensure that central bridge functions (like `window.Android` or `window.langu`) remain accessible.
- **Service Worker Security**: `sw.js` and `firebase-messaging-sw.js` undergo a specialized obfuscation pass to maintain PWA standards while adding security.

## 3. File Integrity System
The build script generates a `dist/version.json` file which acts as the integrity manifest.
- **SHA-256 Hashing**: A hash is calculated for the *original* content of every file.
- **Comparison**: The application compares these hashes on startup to detect corrupted or tampered assets.

## 4. Media Utilities
- **`generate_pwa_icons.js`**: Uses the `sharp` library to generate favicons and PWA-compliant icons (192x192, 512x512) from a single source image.
- **`optimize_image.js`**: A utility for manual batch conversion of promotional assets to optimized WebP format.

## 5. Automated Deployment
Once the build is successful, the script automatically commits and pushes the changes to the dedicated distribution repository (`_bazaar.git`), which is then served via Cloudflare Pages.
