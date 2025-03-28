"use strict";
/**
 * Logger utility for consistent log messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.createBrowserLogger = createBrowserLogger;
// CLI Logging function
function log(message) {
    console.log(`[Highlighter] ${message}`);
}
// Browser-to-Node logging helper to be used in browser context
function createBrowserLogger() {
    return `
    function sendToNodeJS(message) {
      console.log('[HIGHLIGHT] ' + message);
    }
  `;
}
//# sourceMappingURL=logger.js.map