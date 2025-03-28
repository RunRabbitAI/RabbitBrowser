import rabbitBrowser from "../index";

/**
 * Simple example of using RabbitBrowser
 */
async function main() {
  try {
    // Navigate to Google
    console.log("Navigating to Google...");
    await rabbitBrowser.go("https://www.liftos.io");

    // Get all the detected elements
    const elements = rabbitBrowser.getElements();

    // Log the number of elements found
    console.log(`Found ${elements.length} interactive elements`);

    // Log the first 3 elements as a preview
    if (elements.length > 0) {
      console.log("Preview of detected elements:");
      const preview = elements;
      console.log(JSON.stringify(preview, null, 2));
    }

    // Close the browser
    // await rabbitBrowser.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main().catch(console.error);
