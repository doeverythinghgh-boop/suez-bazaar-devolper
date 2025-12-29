
/**
 * @file version-watcher.js
 * @description Watches for file changes and auto-increments the version in version.json.
 * @usage node version-watcher.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const VERSION_FILE = 'version.json';
const IGNORED_DIRS = ['.git', '.github', 'node_modules', 'maintenance', '.vscode', '.gemini'];
const IGNORED_FILES = ['version.json', 'package-lock.json', 'package.json'];

let isUpdating = false;
let timeout = null;

/**
 * Updates the version in version.json
 */
function updateVersion() {
    if (isUpdating) return;
    isUpdating = true;

    try {
        if (fs.existsSync(VERSION_FILE)) {
            const content = fs.readFileSync(VERSION_FILE, 'utf8');
            const data = JSON.parse(content);

            if (data.version) {
                const parts = data.version.split('.').map(Number);
                if (parts.length === 3) {
                    const oldVersion = data.version;
                    parts[2]++; // Increment patch
                    data.version = parts.join('.');
                    data.lastUpdated = new Date().toISOString();

                    fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2));
                    console.log(`\x1b[32m[Auto-Version] 🚀 Change detected! Version bumped: ${oldVersion} -> ${data.version}\x1b[0m`);
                    console.log(`\x1b[32m[Auto-Version] 📅 Date updated to: ${data.lastUpdated}\x1b[0m`);
                }
            }
        }
    } catch (error) {
        console.error("Error updating version:", error);
    } finally {
        setTimeout(() => { isUpdating = false; }, 1000); // 1s Guard against rapid multiple updates
    }
}

/**
 * Recursively watches a directory
 */
function watchDirectory(dir) {
    fs.watch(dir, (eventType, filename) => {
        if (!filename) return;

        // Ignore specific files
        if (IGNORED_FILES.includes(filename) || filename.startsWith('.')) return;

        // Debounce update
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            console.log(`\x1b[36m[Watcher] File changed: ${filename} (Processing in 3s...)\x1b[0m`);
            updateVersion();
        }, 3000); // Wait 3000ms after last change to update
    });

    // Recursively watch subdirectories
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        if (dirent.isDirectory()) {
            if (!IGNORED_DIRS.includes(dirent.name)) {
                watchDirectory(path.join(dir, dirent.name));
            }
        }
    });
}

console.log("\x1b[33m[Watcher] 👀 Monitoring files for changes... (Press Ctrl+C to stop)\x1b[0m");
watchDirectory('.');
