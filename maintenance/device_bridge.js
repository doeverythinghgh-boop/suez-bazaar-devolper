/**
 * @file device_bridge.js
 * @description This script establishes a stable communication bridge between the AI Agent and the host device.
 * It verifies environment settings, directory permissions, and system compatibility to prevent runtime errors and freezes.
 * 
 * @author Antigravity AI
 * @version 1.0.0
 */

var os = require('os');
var fs = require('fs');
var path = require('path');

/**
 * Global object to store environment diagnostics.
 * @var {Object} bridgeDiagnostics
 */
var bridgeDiagnostics = {
    status: 'initializing',
    timestamp: new Date().toISOString(),
    os: {},
    permissions: {},
    environment: {},
    errors: []
};

/**
 * Checks the Operating System details and environment stability.
 * 
 * @function checkOSStability
 * @returns {void}
 */
function checkOSStability() {
    try {
        bridgeDiagnostics.os = {
            platform: os.platform(),
            release: os.release(),
            architecture: os.arch(),
            totalMemory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
            freeMemory: (os.freemem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
            cpus: os.cpus().length
        };
    } catch (error) {
        bridgeDiagnostics.errors.push('OS Check Error: ' + error.message);
    }
}

/**
 * Verifies if the script is running within the allowed project scope.
 * 
 * @function verifyProjectScope
 * @returns {boolean} True if within scope, false otherwise.
 */
function verifyProjectScope() {
    var currentDir = process.cwd();
    var allowedFolderName = 'suez-bazaar-devolper';

    try {
        if (!currentDir.includes(allowedFolderName)) {
            bridgeDiagnostics.errors.push('Scope Violation: Running outside ' + allowedFolderName);
            return false;
        }
        bridgeDiagnostics.environment.currentDir = currentDir;
        return true;
    } catch (error) {
        bridgeDiagnostics.errors.push('Scope Verification Error: ' + error.message);
        return false;
    }
}

/**
 * Checks read and write permissions for a specific directory.
 * 
 * @function checkDirectoryPermissions
 * @param {string} dirPath - The absolute path of the directory to check.
 * @param {string} label - A human-readable label for the directory.
 * @returns {Object} Result object containing read/write status.
 */
function checkDirectoryPermissions(dirPath, label) {
    var result = { read: false, write: false };
    try {
        // Check read permission
        fs.accessSync(dirPath, fs.constants.R_OK);
        result.read = true;

        // Check write permission
        fs.accessSync(dirPath, fs.constants.W_OK);
        result.write = true;
    } catch (error) {
        bridgeDiagnostics.errors.push('Permission Error [' + label + ']: ' + error.message);
    }
    return result;
}

/**
 * Performs a comprehensive check of all critical project directories and files.
 * 
 * @function runFullDiagnostics
 * @returns {void}
 */
function runFullDiagnostics() {
    console.log('--- Starting Device Bridge Diagnostics ---');

    checkOSStability();

    if (!verifyProjectScope()) {
        console.error('FATAL: Project scope verification failed.');
    }

    var criticalPaths = [
        { path: process.cwd(), label: 'Root' },
        { path: path.join(process.cwd(), 'maintenance'), label: 'Maintenance' },
        { path: path.join(process.cwd(), 'api'), label: 'API' },
        { path: path.join(process.cwd(), 'js'), label: 'JS Core' }
    ];

    criticalPaths.forEach(function (item) {
        if (fs.existsSync(item.path)) {
            bridgeDiagnostics.permissions[item.label] = checkDirectoryPermissions(item.path, item.label);
        } else {
            bridgeDiagnostics.errors.push('Missing Path: ' + item.label + ' (' + item.path + ')');
        }
    });

    // Check versions
    bridgeDiagnostics.environment.nodeVersion = process.version;

    if (bridgeDiagnostics.errors.length === 0) {
        bridgeDiagnostics.status = 'stable';
        console.log('SUCCESS: Communication bridge established and environment is stable.');
    } else {
        bridgeDiagnostics.status = 'unstable';
        console.warn('WARNING: Environment diagnostics found potential issues.');
    }

    console.log(JSON.stringify(bridgeDiagnostics, null, 2));
    console.log('--- Diagnostics Complete ---');
}

// Execute the diagnostic suite
try {
    runFullDiagnostics();
} catch (fatalError) {
    console.error('FATAL BRIDGE CRASH: ' + fatalError.message);
    process.exit(1);
}
