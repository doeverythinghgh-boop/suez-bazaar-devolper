# Location System Implementation Guide (BidStory Location)

This document explains the architecture and operation of the geographic location application, which has been restructured into a modular system (Modules) to ensure ease of maintenance and development.

## Directory and File Structure

The application is located in the `location/` directory, and the source code is divided into `location/js/location/` as follows:

| File              | Description                                                                                                                                               |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.js`       | Contains the definition of the main `location_app` object and constants (such as default coordinates and zoom level).                                     |
| `ui.js`           | Responsible for interface elements such as loading screens and alerts (SweetAlert2).                                                                      |
| `storage.js`      | Manages the temporary storage of the selected location in memory (`memory state`) and coordinate validation.                                              |
| `map.js`          | Contains the logic for initializing the Leaflet map, adding markers, and determining the initial location based on URL parameters or default coordinates. |
| `gps.js`          | Manages the GPS location service and handles permissions and resulting errors (manual only).                                                              |
| `utils.js`        | Contains additional functions such as coordinate sharing (copying or opening in maps) and resetting the location.                                         |
| `core.js`         | Contains the main `init` function that links all modules together.                                                                                        |
| `location_app.js` | (In the main `location/` folder) is the entry point that launches the application upon page load and manages global errors.                               |

## Key Features

1. **Batch Update System**: No server communication occurs when selecting a location on the map. Instead, coordinates are sent to the parent window to be saved "locally" in a hidden field within the form. Synchronization with the server occurs only when the user clicks the final "Save Changes" or "Create Account" button.
2. **Local Control Buttons**:
   - **Save Button**: Sends coordinates to the parent window and updates the UI (e.g., changing the location button color).
   - **Close Button**: A modern circular (X) button that closes the window while informing the parent window of the current location status to ensure data consistency before the final save.
3. **Manual GPS Support**: Automatic location determination upon opening the map has been disabled to avoid distraction. The map always opens at the "Saved Location" (if found) or the "Default Location - Suez" (if not). The user can click the "Locate" (GPS) button at any time to manually get their current location.
4. **Modern Responsive Design**: 
   - Control buttons are arranged in a floating panel with rounded corners and deep shadows.
   - They always appear in a single row even on phones with horizontal scroll support.
5. **Server Dependency**: The saved location is automatically retrieved from user data upon login to ensure accurate courier arrival without the need for local storage.
6. **Advanced Sharing Options**: Copying coordinates or opening the location directly in a maps application.

## Parent Communication

The application runs inside an `iframe` and communicates with the main page via `window.postMessage`:
- **`LOCATION_SELECTED`**: Sent when the "Save" button is clicked, containing coordinates (lat, lng) to update the form in the parent window.
- **`LOCATION_RESET`**: Sent when the "Reset" button is clicked to zero out coordinates and alert the frontend.
- **`CLOSE_LOCATION_MODAL`**: Sent when the close button (X) is clicked to request closing the window from the parent page.

### Retrieving Current Location and View Modes
Data and parameters are passed to the map via URL parameters:
-   `lat` and `lng`: To set the initial view and marker at a specific location.
-   `viewOnly=true`: **(New)** To activate "View Only" mode, which results in:
    -   Hiding editing buttons (Save, GPS, Reset).
    -   Keeping only the **Share** and **Internal Close** buttons.
    -   Disabling the ability to change location by clicking or long-pressing.
    -   Improving the window appearance for direct preview purposes (single-window experience).
- `embedded=true`: To hide the close button (X) when the application is embedded as part of another page rather than a pop-up window.
- `hideSave=true`: To hide the internal "Save" button (for cases where the save button is outside the iframe).

Example URL: `location/LOCATION.html?lat=...&lng=...&viewOnly=true`
The `core.js` and `map.js` files capture these parameters to adjust the application behavior.

## View Only Mode and "Single Window" Experience

The map interface has been optimized to function as a **compact single window** when needed for preview:
1.  **Parent Page Integration**: When using view mode in an `iframe` (such as a transparent SweetAlert), the close button (X) inside the map application itself is relied upon.
2.  **Technical Communication**: When the user clicks the internal close button, the application sends a `CLOSE_LOCATION_MODAL` message to the parent window, which in turn closes the entire Modal, preventing overlapping windows.
3.  **Clean Design**: All editing tools are hidden to keep the focus entirely on the map and ease of access to the location via external map applications.

- **Small Attribution Font Size**: The map's attribution text (`leaflet-control-attribution`) has been scaled down to increase visible space.

## WebView Compatibility (Android)

The application is optimized for operation within a WebView in Android applications:
- Full Geolocation API support.
- Optimized timeout (20 seconds) to obtain a GPS signal in weak areas.
- Support for touch events and long-press.
- Responsive design that adapts to all screen sizes.

> [!IMPORTANT]
> When using the application in a WebView, ensure:
> - Adding location permissions in `AndroidManifest.xml`.
> - Enabling JavaScript and Geolocation in WebView settings.
> - Implementing `WebChromeClient` to handle location requests.

## Programmatic Usage

Files are loaded in the following order in `location\LOCATION.html`:
1. `js/location/config.js`
2. `js/location/ui.js`
3. `js/location/storage.js`
4. `js/location/map.js`
5. `js/location/gps.js`
6. `js/location/utils.js`
7. `js/location/core.js`
8. `location_app.js`

> [!IMPORTANT]
> External requirements: Leaflet JS, SweetAlert2, Material Icons.
