# Local Asset Management and Dependencies

Bazaar follows a strict policy of hosting all critical libraries locally to ensure independence from third-party CDNs, improve performance, and allow offline execution.

## 1. Fonts and Icons
- **FontAwesome (v6+)**: Hosted locally at `assets/fontawesome/`.
- **Performance**: The `fa-solid-900.woff2` file is preloaded in the `index.html` head to eliminate the visual jump (FOIT/FOUT) during initial page render.

## 2. Core JavaScript Libraries (`assets/libs/`)
- **SweetAlert2**: Local copy of `sweetalert2.all.min.js`. All UI alerts transition through this library.
- **Firebase (v8.10.1)**: Local versions of `firebase-app.js` and `firebase-messaging.js`. (V8 is used for historical compatibility with Service Workers and existing P2P logic).
- **jsrsasign (v10.5.25)**: Essential for client-side JWT (JSON Web Token) signing for the secure FCM v1 P2P notification system.
- **Leaflet**: Core mapping engine for the location module, hosted locally with associated CSS and marker assets.

## 3. Why Local Hosting?
1. **Network Independence**: The app remains functional and localized even if major CDNs are unreachable in the region.
2. **Offline Support**: Necessary for PWA offline modes where external assets cannot be fetched.
3. **Privacy**: Prevents user tracking by external font or library providers.
4. **Version Stability**: Protects the project from "Breaking Changes" or library removals by third-party providers.

## 4. Dependency Update Protocol
To update a library:
1. Download the minified production version.
2. Replace the file in `assets/libs/`.
3. Update the version reference in `LOCAL_Library.md`.
4. Run `node build.js` to ensure the new file is hashed and included in the distribution manifest.
