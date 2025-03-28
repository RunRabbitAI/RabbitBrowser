"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightAndCollect = highlightAndCollect;
exports.main = main;
const logger_1 = require("./utils/logger");
const puppeteer_1 = require("./browser/puppeteer");
const elementDetector_1 = require("./highlighting/elementDetector");
const highlighter_1 = require("./highlighting/highlighter");
/**
 * Highlight clickable elements on the page and return their data
 * @param url The URL to navigate to and highlight elements on
 * @param waitTime Time to wait for element detection in ms
 * @returns Promise with the collected element data
 */
async function highlightAndCollect(url = "https://www.google.com", waitTime = 8000) {
    // Launch the browser
    const browser = await (0, puppeteer_1.setupBrowser)();
    try {
        // Create a new page
        const page = await (0, puppeteer_1.setupPage)(browser);
        // Navigate to the URL
        await (0, puppeteer_1.navigateTo)(page, url);
        // Initialize the highlighter first
        await (0, highlighter_1.initializeHighlighter)(page);
        // Initialize the element detector
        await (0, elementDetector_1.initializeElementDetector)(page);
        // Explicitly start the element observation process
        await page.evaluate(() => {
            window.processedElements = new Set();
            window.highlightedElements = window.highlightedElements || [];
            window.startObservingNewElements();
        });
        // Wait for elements to be highlighted
        (0, logger_1.log)("Waiting for elements to be highlighted...");
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        // Collect data about the highlighted elements
        (0, logger_1.log)("Collecting data about highlighted elements...");
        const elementData = await (0, highlighter_1.collectElementData)(page);
        // Log results
        if (elementData.elements.length === 0) {
            (0, logger_1.log)("WARNING: No clickable elements were collected");
        }
        else {
            (0, logger_1.log)(`Collected data for ${elementData.elements.length} clickable elements`);
        }
        (0, logger_1.log)("Highlight process completed - browser window remains open with highlights");
        return elementData;
    }
    catch (error) {
        (0, logger_1.log)(`Error during highlighting: ${error}`);
        await browser.close();
        throw error;
    }
}
/**
 * Main function to run the highlighter
 */
async function main() {
    try {
        const data = await highlightAndCollect();
        // Log first 3 elements for preview
        if (data.elements.length > 0) {
            (0, logger_1.log)("First few elements:");
            console.log(JSON.stringify(data.elements.slice(0, 3), null, 2));
            (0, logger_1.log)(`All ${data.elements.length} elements:`);
            console.log(JSON.stringify(data.elements, null, 2));
        }
        // The browser stays open for viewing the highlights
        // Uncomment to close the browser automatically:
        // await browser.close();
    }
    catch (error) {
        console.error("Error:", error);
    }
}
// Run the highlighter if this file is executed directly
if (require.main === module) {
    main().catch((error) => console.error("Error:", error));
}
//# sourceMappingURL=index.js.map