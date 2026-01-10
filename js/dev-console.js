/**
 * @file dev-console.js
 * @description A mobile-friendly developer console overlay that captures and displays:
 * 1. Web Logs (console.log, warn, error)
 * 2. Native Android Logs (piped via LogBridge.kt)
 * RESTRICTED: Only visible to admin with key 682dri6b.
 */

(function () {
    var AUTHORIZED_KEY = '682dri6b';
    var uiInitialized = false;
    var consoleWrapper, toggleBtn, logPanel, logHeader, logContainer, searchInput, modeToggleBtn;

    // Modes: 0 = All, 1 = Web Only, 2 = Native Only
    var currentMode = 0;
    var modeNames = ['All', 'Web', 'Native'];

    // 1. Capture Console (Always capture, but only display if authorized)
    var originalLog = console.log;
    var originalWarn = console.warn;
    var originalError = console.error;
    var originalInfo = console.info;
    var bufferedLogs = [];

    function addLogToPanel(type, args, isNative) {
        var now = new Date();
        var timeStr = '[' + now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0') + ':' +
            now.getSeconds().toString().padStart(2, '0') + ']';

        var fullMessage;
        if (isNative) {
            fullMessage = args[0]; // For native, args is already a string
        } else {
            var messages = Array.prototype.slice.call(args).map(function (arg) {
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
                }
                return String(arg);
            });
            fullMessage = messages.join(' ');
        }

        if (!uiInitialized) {
            bufferedLogs.push({ type: type, time: timeStr, msg: fullMessage, isNative: !!isNative });
            if (bufferedLogs.length > 300) bufferedLogs.shift();
            return;
        }

        renderLog(type, timeStr, fullMessage, isNative);
    }

    function renderLog(type, time, msg, isNative) {
        var logLine = document.createElement('div');
        logLine.className = 'dev-log dev-log-' + type + (isNative ? ' dev-log-native' : ' dev-log-web');
        logLine.setAttribute('data-msg', (isNative ? '[Native] ' : '[Web] ') + msg.toLowerCase());
        logLine.setAttribute('data-source', isNative ? 'native' : 'web');

        var timeSpan = document.createElement('span');
        timeSpan.className = 'dev-log-time';
        timeSpan.textContent = time;

        var sourceBadge = document.createElement('span');
        sourceBadge.className = 'dev-log-badge ' + (isNative ? 'badge-native' : 'badge-web');
        sourceBadge.textContent = isNative ? 'Android' : 'Web';

        var msgSpan = document.createElement('span');
        msgSpan.textContent = (isNative ? '' : '') + msg;

        logLine.appendChild(timeSpan);
        logLine.appendChild(sourceBadge);
        logLine.appendChild(msgSpan);
        logContainer.appendChild(logLine);

        // Apply filters
        applyCurrentFilters();

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function applyCurrentFilters() {
        if (!uiInitialized) return;
        var query = (searchInput ? searchInput.value : '').toLowerCase();
        var logs = logContainer.querySelectorAll('.dev-log');

        logs.forEach(function (log) {
            var source = log.getAttribute('data-source');
            var text = log.getAttribute('data-msg');

            var modePass = true;
            if (currentMode === 1) modePass = (source === 'web');
            if (currentMode === 2) modePass = (source === 'native');

            var searchPass = true;
            if (query) searchPass = (text.indexOf(query) > -1);

            log.style.display = (modePass && searchPass) ? 'block' : 'none';
        });
    }

    // Capture Functions
    console.log = function () { originalLog.apply(console, arguments); addLogToPanel('log', arguments); };
    console.warn = function () { originalWarn.apply(console, arguments); addLogToPanel('warn', arguments); };
    console.error = function () { originalError.apply(console, arguments); addLogToPanel('error', arguments); };
    console.info = function () { originalInfo.apply(console, arguments); addLogToPanel('info', arguments); };

    // Native Bridge Listener
    window.onNativeLog = function (type, message) {
        // 1. Send to original browser console (visible in PC Chrome Inspector)
        var msgWithBadge = '[Android] ' + message;
        if (type === 'error' && originalError) originalError.call(console, msgWithBadge);
        else if (type === 'warn' && originalWarn) originalWarn.call(console, msgWithBadge);
        else if (type === 'info' && originalInfo) originalInfo.call(console, msgWithBadge);
        else if (originalLog) originalLog.call(console, msgWithBadge);

        // 2. Add to on-screen overlay
        addLogToPanel(type, [message], true);
    };

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

        logHeader = document.createElement('div');
        logHeader.id = 'dev-console-header';
        logHeader.innerHTML =
            '<div class="dev-header-top">' +
            '<span>Dev Console</span>' +
            '<div>' +
            '<button id="dev-console-mode" title="Switch Mode">Mode: All</button>' +
            '<button id="dev-console-copy"><i class="fas fa-copy"></i></button>' +
            '<button id="dev-console-clear">Clear</button>' +
            '<button id="dev-console-close">X</button>' +
            '</div>' +
            '</div>' +
            '<div class="dev-header-search">' +
            '<input type="text" id="dev-console-search-input" placeholder="Search logs (Filter: source + text)...">' +
            '</div>';

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
            '#dev-console-panel { position: fixed; top: 0; left: 0; width: 100%; height: 75%; background: rgba(0, 0, 0, 0.95); border-bottom: 2px solid #555; flex-direction: column; overflow: hidden; display: none; }' +
            '#dev-console-header { background: #1a1a1a; color: #eee; border-bottom: 1px solid #333; display: flex; flex-direction: column; }' +
            '.dev-header-top { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; }' +
            '.dev-header-search { padding: 0 12px 10px 12px; }' +
            '#dev-console-search-input { width: 100%; background: #333; border: 1px solid #444; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 11px; outline: none; }' +
            '#dev-console-logs { flex: 1; overflow-y: auto; padding: 10px; font-size: 11px; }' +
            '.dev-log { padding: 5px 0; border-bottom: 1px solid #222; color: #eee; line-height: 1.4; }' +
            '.dev-log-warn { color: #ffca28; background: rgba(255, 202, 40, 0.1); }' +
            '.dev-log-error { color: #ff5252; background: rgba(255, 82, 82, 0.1); }' +
            '.dev-log-time { color: #777; margin-right: 6px; font-size: 10px; }' +
            '.dev-log-badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; margin-right: 6px; font-weight: bold; text-transform: uppercase; }' +
            '.badge-native { background: #4caf50; color: #fff; }' +
            '.badge-web { background: #2196f3; color: #fff; }' +
            '#dev-console-header button { background: #333; color: #fff; border: 1px solid #555; padding: 4px 10px; border-radius: 3px; font-size: 11px; margin-left: 5px; cursor: pointer; }' +
            '#dev-console-mode { font-weight: bold; color: #2196f3 !important; }';
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
        document.getElementById('dev-console-copy').onclick = function () {
            var text = Array.prototype.slice.call(logContainer.querySelectorAll('.dev-log'))
                .filter(function (l) { return l.style.display !== 'none'; })
                .map(function (l) { return l.innerText; }).join('\n');
            navigator.clipboard.writeText(text).then(function () {
                alert('Filtered logs copied to clipboard!');
            });
        };

        modeToggleBtn = document.getElementById('dev-console-mode');
        modeToggleBtn.onclick = function () {
            currentMode = (currentMode + 1) % 3;
            modeToggleBtn.textContent = 'Mode: ' + modeNames[currentMode];
            applyCurrentFilters();
        };

        searchInput = document.getElementById('dev-console-search-input');
        searchInput.oninput = function () {
            applyCurrentFilters();
        };

        // Flush Buffer
        if (bufferedLogs.length > 0) {
            bufferedLogs.forEach(function (item) { renderLog(item.type, item.time, item.msg, item.isNative); });
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

    setInterval(checkAuth, 3000);
    checkAuth();

    originalLog.call(console, '🚀 Hybrid Dev Console Loaded: Android Log Bridge Active.');
})();
