import rabbitBrowser from "../index";

/**
 * Simple example of using RabbitBrowser with improved element detection and no duplicates
 */
async function main() {
  try {
    // Navigate to a website
    console.log("Navigating to website...");
    await rabbitBrowser.go("https://www.liftos.app");

    // Get the complete data (elements and page context)
    const completeData = rabbitBrowser.getCompleteData();

    // Log the improved detection results
    console.log(
      `\nDetected ${completeData.elements.length} unique interactive elements`
    );

    // Group elements by tagName for better analysis
    const elementsByType: { [key: string]: any[] } = {};
    completeData.elements.forEach((el) => {
      const type = el.tagName;
      elementsByType[type] = elementsByType[type] || [];
      elementsByType[type].push(el);
    });

    // Display the count of each element type
    console.log("\nElements by type:");
    Object.keys(elementsByType).forEach((type) => {
      console.log(`- ${type}: ${elementsByType[type].length} elements`);
    });

    // Log data size
    const jsonString = JSON.stringify(completeData);
    console.log(`\nOutput size: ${jsonString.length} characters`);
    console.log(
      `Approximate tokens (chars/4): ~${Math.ceil(jsonString.length / 4)}`
    );

    // Display a preview of the data
    console.log("\nPreview of first 3 elements:");
    console.log(JSON.stringify(completeData.elements.slice(0, 3), null, 2));

    // Close the browser
    await rabbitBrowser.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main().catch(console.error);
