# Geolocation and Interactive Maps

The Location module is an isolated, robust tool for managing geographic coordinates, optimized for both web browsers and the Android native hybrid container.

## 1. Component Isolation (`location/`)
The module is built as an independent sub-application to ensure performance and prevent styling conflicts.
- **`location_app.js`**: Central entry point.
- **`leaflet.js` Integration**: Core map engine.
- **`gps.js`**: Advanced handler for browser-level and native Android geolocation.

## 2. Parent-Child Communication (`postMessage`)
Since the map usually runs in an Iframe, it communicates with the root application via standard events:
- `LOCATION_SELECTED`: Sends selected `lat` and `lng` to the parent.
- `LOCATION_RESET`: Notifies the parent to clear stored coordinates.
- `CLOSE_LOCATION_MODAL`: Requests the parent to hide the location UI.

## 3. Advanced Operational Modes
The system detects URL parameters to change its behavior:
- **View Only (`viewOnly=true`)**: Hides editing markers, shows a static pin, and enables "Share Location" features.
- **Embedded (`embedded=true`)**: Hides the internal "Close" button, delegating UI control to the parent's Modal framework.
- **Manual Input**: Allows users to tap anywhere on the map to set a precise location even if GPS is unavailable.

## 4. Performance: Batch Update System
To reduce battery consumption and network overhead:
- Coordinates are stored locally in the Iframe's state during the browsing session.
- No server updates are made until the user explicitly clicks the "Save Location" button, triggering a final broadcast.

## 5. Mobile & Android Compatibility
- **Touch Events**: Optimized for pinch-zoom and long-press on mobile screens.
- **Native Bridge Support**: When running in Android, the map uses the `WebChromeClient` to request system-level GPS permissions, ensuring accurate positioning even within a restricted WebView.
- **Localization**: Titles and buttons are translated using the `iframe bridge` to link with the parent's `window.langu` dictionary.
