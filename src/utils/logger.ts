/**
 * Logger utility for consistent log messages
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

// Current log level - can be set by the application
let currentLogLevel: LogLevel = LogLevel.INFO;

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Log a message at the specified level
 */
export function logWithLevel(level: LogLevel, message: string): void {
  if (level >= currentLogLevel) {
    const prefix = getLogPrefix(level);
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Standard log function (INFO level)
 */
export function log(message: string): void {
  logWithLevel(LogLevel.INFO, message);
}

/**
 * Debug level log
 */
export function debug(message: string): void {
  logWithLevel(LogLevel.DEBUG, message);
}

/**
 * Warning level log
 */
export function warn(message: string): void {
  logWithLevel(LogLevel.WARN, message);
}

/**
 * Error level log
 */
export function error(message: string): void {
  logWithLevel(LogLevel.ERROR, message);
}

/**
 * Get prefix for log level
 */
function getLogPrefix(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return "[DEBUG]";
    case LogLevel.INFO:
      return "[INFO]";
    case LogLevel.WARN:
      return "[WARN]";
    case LogLevel.ERROR:
      return "[ERROR]";
    default:
      return "[INFO]";
  }
}

/**
 * Browser-to-Node logging helper to be used in browser context
 */
export function createBrowserLogger(): string {
  return `
    function sendToNodeJS(message, level = 'info') {
      const prefix = level.toUpperCase();
      console.log(\`[\${prefix}] \${message}\`);
    }
  `;
}
