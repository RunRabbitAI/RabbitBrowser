import rabbitBrowser from "../index";

/**
 * Simple example of RabbitBrowser with text and element highlighting
 */
async function main() {
  try {
    // Navigate to a website
    console.log("Navigating to website...");
    await rabbitBrowser.go("https://www.liftos.io");

    // Get the complete data
    const completeData = rabbitBrowser.getCompleteData();

    // Log the counts
    console.log(
      `\nDetected ${completeData.elements.length} interactive elements and ${completeData.textBlocks.length} text blocks`
    );

    // Display the full data as JSON
    console.log("\nComplete data for AI analysis:");
    console.log(JSON.stringify(completeData, null, 2));

    // Close the browser when done
    await rabbitBrowser.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main().catch(console.error);
