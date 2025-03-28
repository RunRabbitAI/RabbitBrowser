/**
 * Logger utility for consistent log messages
 */

// CLI Logging function
export function log(message: string): void {
  console.log(`[Highlighter] ${message}`);
}

// Browser-to-Node logging helper to be used in browser context
export function createBrowserLogger() {
  return `
    function sendToNodeJS(message) {
      console.log('[HIGHLIGHT] ' + message);
    }
  `;
}
