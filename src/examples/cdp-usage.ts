import { RabbitBrowser } from "../RabbitBrowser";

/**
 * Example of using RabbitBrowser with Chrome DevTools Protocol (CDP)
 *
 * To use this example:
 * 1. Start Chrome with debugging enabled:
 *    chrome --remote-debugging-port=9222
 * 2. Run this script
 */
async function main() {
  // Create a new RabbitBrowser instance
  const browser = new RabbitBrowser({
    // Don't set viewport size - we'll use the browser's actual size
    preserveBrowserViewport: true,
  });

  try {
    // Connect to an existing Chrome instance via CDP
    await browser.connectCDP({
      browserURL: "http://127.0.0.1:9222",
    });

    // Navigate to a safe page to analyze
    await browser.go("https://liftos.io");

    // Get all the data
    const { elements, textBlocks, pageContext } = browser.getCompleteData();

    console.log("Detected Elements:", elements.length);
    console.log("Text Blocks:", textBlocks.length);
    console.log("Page Context:", pageContext);

    console.log("Analysis complete!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Disconnect from CDP (this doesn't close Chrome)
    await browser.close();
  }
}

main().catch(console.error);
