import { rabbitBrowser } from "../RabbitBrowser";

/**
 * Simple example showing how to use RabbitBrowser
 */
async function runExample() {
  try {
    console.log("Starting RabbitBrowser example...");

    // Navigate to Google homepage
    console.log("Navigating to Google...");
    await rabbitBrowser.go("https://www.google.com");

    // Get all elements
    const elements = rabbitBrowser.getElements();
    console.log(`Found ${elements.length} interactive elements`);

    // Find only buttons
    const buttons = rabbitBrowser.findElementsByTagName("button");
    console.log(`Found ${buttons.length} buttons`);

    // Find elements with text containing 'accept'
    const acceptElements = rabbitBrowser.findElementsByText("accept");
    console.log(`Found ${acceptElements.length} elements related to 'accept'`);

    // Log first 3 elements
    console.log("First 3 elements:");
    elements.slice(0, 3).forEach((el, i) => {
      console.log(
        `${i + 1}. ${el.tagName}${el.id ? `#${el.id}` : ""} - "${el.text}"`
      );
    });

    // You can keep the browser open for visual inspection
    console.log(
      "Browser is still open with elements highlighted. Press Ctrl+C to exit."
    );

    // Alternatively, you can close the browser
    // await rabbitBrowser.close();
  } catch (error) {
    console.error("Error in example:", error);
    await rabbitBrowser.close();
  }
}

// Run the example
runExample();
