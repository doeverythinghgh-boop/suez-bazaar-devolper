/**
 * @file dev-console.js
 * @description A mobile-friendly developer console overlay that captures and displays console logs on screen.
 * RESTRICTED: Only visible to admin with key 682dri6b.
 */

(function () {
    var AUTHORIZED_KEY = '682dri6b';
    var uiInitialized = false;
    var consoleWrapper, toggleBtn, logPanel, logHeader, logContainer;

    // 1. Capture Console (Always capture, but only display if authorized)
    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;
    var bufferedLogs = [];

    function addLogToPanel(type, args) {
        if (!uiInitialized) {
            bufferedLogs.push({ type: type, args: args });
            // Cleanup buffer if it gets too large
            if (bufferedLogs.length > 100) bufferedLogs.shift();
            return;
        }

        var logLine = document.createElement('div');
        logLine.className = 'dev-log dev-log-' + type;

        var timeSpan = document.createElement('span');
        var now = new Date();
        timeSpan.className = 'dev-log-time';
        timeSpan.textContent = '[' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() + ']';

        var msgSpan = document.createElement('span');
        var messages = Array.prototype.slice.call(args).map(function (arg) {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        });
        msgSpan.textContent = messages.join(' ');

        logLine.appendChild(timeSpan);
        logLine.appendChild(msgSpan);
        logContainer.appendChild(logLine);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    console.log = function () { originalLog.apply(console, arguments); addLogToPanel('log', arguments); };
    console.warn = function () { originalWarn.apply(console, arguments); addLogToPanel('warn', arguments); };
    console.error = function () { originalError.apply(console, arguments); addLogToPanel('error', arguments); };
    console.info = function () { originalInfo.apply(console, arguments); addLogToPanel('info', arguments); };

    // 2. UI Creation logic
    function initUI() {
        if (uiInitialized) {
            consoleWrapper.style.display = 'block';
            return;
        }
        uiInitialized = true;

        consoleWrapper = document.createElement('div');
        consoleWrapper.id = 'dev-console-wrapper';

        toggleBtn = document.createElement('button');
        toggleBtn.id = 'dev-console-toggle';
        toggleBtn.innerHTML = '<i class="fas fa-terminal"></i>';

        logPanel = document.createElement('div');
        logPanel.id = 'dev-console-panel';
        logPanel.style.display = 'none';

        logHeader = document.createElement('div');
        logHeader.id = 'dev-console-header';
        logHeader.innerHTML = '<span>Dev Console</span><button id="dev-console-clear">Clear</button><button id="dev-console-close">Close</button>';

        logContainer = document.createElement('div');
        logContainer.id = 'dev-console-logs';

        logPanel.appendChild(logHeader);
        logPanel.appendChild(logContainer);
        consoleWrapper.appendChild(toggleBtn);
        consoleWrapper.appendChild(logPanel);
        document.body.appendChild(consoleWrapper);

        // Styles
        var style = document.createElement('style');
        style.textContent =
            '#dev-console-wrapper { position: fixed; bottom: 85px; left: 10px; z-index: 999999; font-family: monospace; direction: ltr; }' +
            '#dev-console-toggle { width: 45px; height: 45px; border-radius: 50%; background: #222; color: #fff; border: 2px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }' +
            '#dev-console-panel { position: fixed; top: 0; left: 0; width: 100%; height: 65%; background: rgba(0, 0, 0, 0.95); border-bottom: 2px solid #555; flex-direction: column; overflow: hidden; display: none; }' +
            '#dev-console-header { background: #1a1a1a; color: #eee; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }' +
            '#dev-console-logs { flex: 1; overflow-y: auto; padding: 10px; font-size: 11px; }' +
            '.dev-log { padding: 4px 0; border-bottom: 1px solid #222; color: #eee; }' +
            '.dev-log-warn { color: #ffca28; background: rgba(255, 202, 40, 0.1); }' +
            '.dev-log-error { color: #ff5252; background: rgba(255, 82, 82, 0.1); }' +
            '.dev-log-time { color: #777; margin-right: 6px; }' +
            '#dev-console-header button { background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 3px; font-size: 11px; margin-left: 5px; }';
        document.head.appendChild(style);

        // UI Handlers
        toggleBtn.onclick = function () {
            logPanel.style.display = 'flex';
            toggleBtn.style.display = 'none';
        };
        document.getElementById('dev-console-close').onclick = function () {
            logPanel.style.display = 'none';
            toggleBtn.style.display = 'flex';
        };
        document.getElementById('dev-console-clear').onclick = function () {
            logContainer.innerHTML = '';
        };

        // Flush Buffer
        if (bufferedLogs.length > 0) {
            bufferedLogs.forEach(function (item) { addLogToPanel(item.type, item.args); });
            bufferedLogs = [];
        }
    }

    // 3. Authorization Watcher
    function checkAuth() {
        try {
            var userStr = localStorage.getItem('loggedInUser');
            if (userStr) {
                var user = JSON.parse(userStr);
                if (user && user.user_key === AUTHORIZED_KEY) {
                    initUI();
                } else if (uiInitialized) {
                    consoleWrapper.style.display = 'none';
                }
            } else if (uiInitialized) {
                consoleWrapper.style.display = 'none';
            }
        } catch (e) { }
    }

    // Check periodically
    setInterval(checkAuth, 3000);
    checkAuth();

    originalLog.call(console, '🚀 Dev Console Engine Restricted to Admin.');
})();
