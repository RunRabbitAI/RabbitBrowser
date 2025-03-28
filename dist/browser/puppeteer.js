"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBrowser = setupBrowser;
exports.setupPage = setupPage;
exports.navigateTo = navigateTo;
const puppeteer_1 = __importDefault(require("puppeteer"));
const logger_1 = require("../utils/logger");
/**
 * Sets up and launches the browser
 */
async function setupBrowser() {
    (0, logger_1.log)("Launching browser...");
    return await puppeteer_1.default.launch({
        headless: false,
        defaultViewport: null, // Use window size instead of viewport
        args: ["--start-maximized", "--disable-web-security"], // Start with maximized window and disable CORS for iframes
    });
}
/**
 * Creates a new page in the browser
 */
async function setupPage(browser) {
    const page = await browser.newPage();
    // Intercept console messages from browser for CLI logging
    page.on("console", (msg) => {
        const text = msg.text();
        if (text.includes("[HIGHLIGHT]")) {
            // This is a message specifically for CLI logging
            (0, logger_1.log)(text.replace("[HIGHLIGHT] ", ""));
        }
    });
    // Set the window size to fit most screens
    await page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
    });
    return page;
}
/**
 * Navigates to a URL
 */
async function navigateTo(page, url) {
    (0, logger_1.log)(`Navigating to ${url}...`);
    await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
    });
    (0, logger_1.log)("Page loaded, initializing highlighter...");
}
//# sourceMappingURL=puppeteer.js.map