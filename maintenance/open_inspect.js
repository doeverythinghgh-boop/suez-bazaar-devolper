/**
 * @file open_inspect.js
 * @description Automatically opens Google Chrome at the chrome://inspect/#devices page.
 * Usage: node maintenance/open_inspect.js
 */

const { exec } = require('child_process');
const os = require('os');

function openInspect() {
    console.log('🚀 Attempting to open Chrome Inspector...');

    // Command differs by OS
    let command;
    const url = 'chrome://inspect/#devices';

    if (os.platform() === 'win32') {
        // We use 'start chrome' to specifically target Chrome if possible
        command = `start chrome "${url}"`;
    } else if (os.platform() === 'darwin') {
        command = `open -a "Google Chrome" "${url}"`;
    } else {
        command = `google-chrome "${url}"`;
    }

    exec(command, (error) => {
        if (error) {
            console.error('❌ Failed to open Chrome. Make sure Google Chrome is installed and in your PATH.');
            console.log('Alternatively, manually open Chrome and go to: chrome://inspect/#devices');
        } else {
            console.log('✅ Chrome Inspector opened successfully.');
        }
    });
}

openInspect();
