# Project Build System and Encryption (Build System & Obfuscation)

This file explains how the project's Build System works and how the `dist` folder, which represents the final protected and production-ready version, is generated.

## 1. Overview
The goal of the build system is to independently encrypt all project JavaScript files and protect the source code from reverse engineering. This process relies on the `build.js` script, which runs in a Node.js environment.

### Main Outputs:
- **`dist` Folder**: Contains a complete version of the project with the same original directory structure.
- **Individual File Encryption**: Each JavaScript file is encrypted independently and saved in its corresponding path within `dist`.
- **Original HTML Files**: HTML files are copied as-is, preserving the original script loading order and ensuring application stability.

---

## 2. Development vs Production

There is a fundamental difference between the main folder and the `dist` folder in the project lifecycle:

### A. Local Development
- **Main File**: `index.html` located in the project root.
- **Usage**: The developer's daily working environment.
- **Content**: Uses direct source code files (unencrypted), facilitating modification and debugging.

### B. Production & Deployment
- **Main File**: `dist/index.html`.
- **Usage**: The final version deployed to users (e.g., via Cloudflare Pages).
- **Content**: Fully processed and encrypted files to ensure best performance and highest security levels.

### C. Android Application (Android WebView)
- **Usage**: The application runs as a "local site" inside the phone.
- **Content**: The application relies exclusively on the files in the `dist` folder, as they are displayed within a `WebView`. This ensures the application always runs the protected and optimized version, just like the production version on the web.

---

## 3. Repository Management

To prevent file overlap and facilitate the deployment process, the project is separated into two repositories:

1. **Main Repository**:
   - **Link**: `https://github.com/doeverythinghgh-boop/suez-bazaar-devolper.git`
   - **Content**: Contains the original Source Code, including configuration files, documentation, and unencrypted resources.
   - **Goal**: Development, modification, and management of core versions.

2. **Distribution Repository**:
   - **Link**: `https://github.com/doeverythinghgh-boop/_bazaar.git`
   - **Local Path**: `dist/`
   - **Content**: Contains only the final encrypted version (Production Build).
   - **Goal**: Direct Deployment via Cloudflare Pages or for use in the Android application.

> [!NOTE]
> The `dist` folder is ignored in the main repository (via `.gitignore`) to prevent file duplication or uploading encrypted files to the source code repository.

---

## 4. How the `build.js` Script Works
The script executes the following steps in order:

### A. Auto-Versioning
The process begins by automatically incrementing the version number (Patch version) in the main `version.json` file, ensuring each new build has a unique identifier and forcing browsers to update their cache when necessary.

### B. Cleanup
The old `dist` folder is deleted if it exists to ensure the resulting version is completely fresh and contains no old files (while preserving the `.git` folder).

### C. Assets Copying
Vital folders containing CSS files, images, and external libraries are copied to the `dist` folder, excluding ignored folders (such as `function`, `api`, and `note`):
- `assets/`: External libraries and fonts.
- `style/`: Core CSS files.
- `images/`: Images and icons.
- `notification/`: Notification system files.
- `shared/`: Shared data files.
- `location/`: Map and location files.
- `js/`: Core JavaScript files.
- `pages/`: All pages and sub-components.
- `steper/`: Order tracking system.

### D. Individual Obfuscation & IIFE Isolation
All `.js` files are searched for and encrypted separately, with an added programmatic "isolation" step:
- **IIFE Wrapping**: The content of each file is placed inside an Immediately Invoked Function Expression `(function(){...})();` before encryption. This ensures that the internal variables of the obfuscator do not overlap when pages are reloaded in the SPA environment.
- `javascript-obfuscator` is used with `renameGlobals` disabled to maintain communication between files.
- **Size Optimization**: `deadCodeInjection` and `unicodeEscapeSequence` have been disabled, and encryption thresholds partially reduced to decrease final file sizes and avoid bloating the `dist` repository.

### D. Service Worker Protection
Root browser files like `sw.js` and `firebase-messaging-sw.js` are encrypted to ensure the protection of caching and notification logic.

### E. HTML and CSS Processing and Minification
Formatting and structure files are processed to reduce size and improve security:
- **CSS Files**: The `clean-css` library is used to remove spaces and comments and fully minify the code, making it difficult to read and reducing page load time.
- **HTML Files**: `html-minifier-terser` is used to remove comments, minify whitespace, and minify internal styles, while maintaining the integrity of the page structure and links between files.

### F. File Manifest & SHA-256 Integrity Check
This is a vital step to ensure the integrity of the final version:
1. All files in the `dist` folder (including images, fonts, and CSS) are scanned.
2. A **SHA-256** hash of the **original** content (before encryption) is calculated for each file.
3. Direct download links from GitHub (Raw URLs) for the encrypted files are generated.
4. The `dist/version.json` file is updated with this comprehensive manifest.

### G. Auto Deployment
After a successful build and manifest update, the script automatically performs a `Push` of the encrypted files to the `_bazaar` repository to ensure the production version is synchronized immediately.

---

## 5. File Integrity System

The `dist/version.json` file is the mastermind of the update and verification process, containing:
- **`version`**: The current version number.
- **`lastUpdated`**: The timestamp of the last build.
- **`files`**: An array containing every file in the project:
    - `path`: GitHub link to download the encrypted version.
    - `hash`: SHA-256 hash of the original file (for authentication).
    - `size`: Final file size in bytes in the `dist` folder (after encryption and minification).

> [!IMPORTANT]
> **Why the original file hash?**
> Since encryption produces variable code each time, relying on the original file hash ensures that the encrypted file—no matter how it looks—was generated from a clean and trusted source code that was previously verified. Additionally, the presence of the **final size** (Size) helps verify the completeness of the download process.

---

## 6. How to Run
To create a new encrypted version, execute the following command in the terminal:

```bash
node build.js
```

---

## 7. Important Technical Notes

> [!TIP]
> **Application Stability**: Thanks to individual encryption, the application runs with the same stability as the development version and avoids Bundle-related issues.

> [!WARNING]
> **Space Management**: Encryption settings have been optimized to reduce the bloat of the `dist` repository resulting from radical changes in the encrypted code.

---

---

## 9. Image Optimization Utility (`optimize_image.js`)

To ensure the best performance and maintain a consistent visual experience, the project includes a dedicated utility for processing category and product images.

### A. Overview
The `optimize_image.js` script (located in the root directory) automates the process of resizing and compressing images before they are added to the project.

### B. Key Features
- **Auto-WebP**: Converts any input format (JPG, PNG) to the optimized `.webp` format.
- **Strict Sizing**: Forces images to exactly **150x150 pixels** using a smart-cover crop to maintain visual balance.
- **High Compression**: Uses the `sharp` library to achieve the smallest possible file size while maintaining a high visual quality (80%).

### C. Usage
To optimize an image, run the following command from the project root:
```bash
node optimize_image.js <input_path> <output_path>
```

**Example**:
```bash
node optimize_image.js "C:\Downloads\my_pic.jpg" "images/categories/Fashion.webp"
```

### D. Requirements
- **Sharp Library**: This tool requires the `sharp` package (`npm install sharp --save-dev`).

---

## 10. Files Included in the Build
- All `.js` and `.html` files and assets (CSS, Images, Fonts).
- **Digital Manifest**: `dist/version.json`.
- **Exclusions**: `api/`, `note/`, `function/`, and `docs/` are excluded.
