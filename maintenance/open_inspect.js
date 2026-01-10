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
        command = `start chrome "${url}"`;
    } else if (os.platform() === 'darwin') {
        command = `open -a "Google Chrome" "${url}"`;
    } else {
        command = `google-chrome "${url}"`;
    }

    exec(command, (error) => {
        if (error) {
            console.error('❌ Failed to open Chrome automatically.');
            console.log('\n💡 Please follow these steps manually:');
            console.log('1. Open Google Chrome on your PC.');
            console.log(`2. Copy and paste this URL into the address bar: ${url}`);
            console.log('3. Your connected device should appear there.');
        } else {
            console.log('✅ Chrome Inspector command sent.');
            console.log('\n--- 💡 Troubleshooting Profile Selector ---');
            console.log('If you see "Who\'s using Chrome?":');
            console.log('1. First, open your preferred Chrome profile manually.');
            console.log('2. Then, run this script again (it will open a new tab in your active profile).');
            console.log('---');
            console.log(`If it still shows a search page/404, manually enter: ${url}`);
        }
    });
}

openInspect();
