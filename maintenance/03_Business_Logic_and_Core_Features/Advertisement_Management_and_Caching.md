# Advertisement Management and Caching

The advertisement system provides high-impact visual marketing while maintaining extreme performance and offline capability.

## 1. Asset Storage & Manifest
- **Source of Truth**: `advertisements.json` stored in a Cloudflare R2 bucket.
- **Metadata**: Each ad entry includes an image URL, a title, and a `searchQuery` for redirection.
- **Sync Strategy**: All ad updates are parallelized. The system updates the manifest only after images are successfully verified in R2.

## 2. Image Processing Pipeline
- **Optimization**: Images are converted to WebP and resized to optimal dimensions on upload to save bandwidth.
- **Self-Cleaning**: The `build.js` or admin tools automatically delete old images from R2 when an advertisement is replaced or removed, preventing storage bloat.

## 3. UI Display Module (`pages/advertisement/`)
- **Integration**: Injected into `index.html` via `<div id="advertisement-section">`.
- **UX Features**: 
  - Responsive circular slider with touch support.
  - Auto-play functionality with smart pause on interaction.
  - Direct redirection: Clicking an ad performs a global search based on the pre-defined `searchQuery`.

## 4. Caching & Invalidation
- **Local Storage**: Fetched ad data is cached in `localStorage` with a 1-hour expiration.
- **Versioning**: The system checks `api/updates` for a timestamp. If a global content update is detected, the ad cache is cleared immediately regardless of age.

## 5. Maintenance Guidelines
- Ensure `R2_PUBLIC_URL` is correctly configured in the admin panel.
- Advertisement images must follow a naming convention (ID-based) to ensure cache consistency.
- Any manual change to `advertisements.json` requires a manual cache clear in the developer console for testing.
