# 🎡 Advertisement System Guide

This document describes the mechanics of the advertisement system in the "Bazaar" project, from image management in the admin panel to displaying them to the end user, including an explanation of the smart caching system.

---

## 🏗️ Technical Architecture

The advertisement system consists of three integrated parts:

1.  **Admin Control Panel (`pages/ADMIN/mainAdvertises.html`)**: The interface used by the administrator to upload, arrange, and delete advertisements.
2.  **Storage Server (Cloudflare R2)**: Actual images and the manifest file (`advertisements.json`), which contains the list of images and their order, are stored here.
3.  **Display Module (`pages/advertisement/`)**: Responsible for fetching data and converting it into an interactive slider for the user.

### 3. Search Redirection
- The administrator can now write a "search query" next to each advertisement image.
- This word is stored in the `query` field within the `advertisements.json` file.
- When a user clicks on the advertisement, they are automatically redirected to the search page, and results related to this word are displayed.

---

## 🏗️ Updated Data Structure (`advertisements.json`)
Data is now stored as objects instead of simple text to support links:
```json
[
  { "img": "ad_123.jpg", "query": "Global Watches" },
  { "img": "ad_456.jpg", "query": "" }
]
```

### 1. Image Upload and Processing
- The administrator can upload up to **10 images**.
- Images are automatically compressed and resized to ensure fast loading and save storage space, with a preference for the **WebP** format if the browser supports it.
- A manual "resize" feature is available for new images to ensure display consistency.

### 2. Smart Sync Strategy
When clicking "Publish Advertisement," the system performs the following steps:
- **Parallel Upload**: Only new images are uploaded with unique names (`ad_timestamp_random.jpg`).
- **Manifest Update**: A new `advertisements.json` file is created and uploaded containing the final list of images in the order specified by the administrator.
- **Self-Cleaning**: The system automatically deletes old images from the server (Cloudflare R2) that are no longer in the new list to avoid the accumulation of orphan files.
- **Cache Invalidation**: A request is sent to `api/updates` to record the update time, alerting users' phones to fetch new data.

---

## 💻 Second: Displaying Advertisements (User Interface)

The system is consumed via the element `id="advertisement-section"` on the home page.

### 1. Fetching Mechanism
The `advertisement.js` module relies on smart fetching logic:
- It first checks for updates via `api/updates`.
- If there is a new update or the cache has expired, it fetches the `advertisements.json` file from the server.
- It builds the slider using the images mentioned in the file.

### 2. Caching System
To ensure superior speed and reduce data consumption:
- Images and data are stored in `localStorage`.
- **Validity Period**: The system trusts local data for **one hour** without asking the server.
- **Update Verification**: After one hour, the system checks the "Timestamp" from the database; if it hasn't changed, it continues to use the locally stored images.

### 3. UX Features
- **Circular Slider**: Supports infinite navigation.
- **Auto-play**: Advertisements change every 4 seconds automatically.
- **Smart Interaction**: Auto-play pauses temporarily when the advertisement is touched or clicked manually.
- **Responsiveness**: The slider adapts to different screen sizes and hides controls (arrows and dots) if there is only one advertisement.

---

## 🛠️ Recurring Maintenance

### Adding a New Advertisement
1. Go to Admin Control Panel -> Advertisement Management.
2. Choose the desired images (or take them with the camera).
3. Arrange the images by dragging and dropping (if available) or in the order you added them.
4. Click "Publish Advertisement Now."

### In Case Advertisements Do Not Appear
- Ensure the `advertisements.json` file exists in the R2 bucket.
- Verify the validity of the public link `R2_PUBLIC_URL` registered in the code.
- Try clearing "Site Data" (Clear Cache) in the browser to bypass the local cache.

---
> [!NOTE]
> The system primarily relies on the `advertisements.json` file as the Single Source of Truth for the order and status of published advertisements.
