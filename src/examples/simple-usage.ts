import rabbitBrowser from "../index";

/**
 * Simple example of using RabbitBrowser with optimized output for AI token usage
 */
async function main() {
  try {
    // Navigate to a website
    console.log("Navigating to website...");
    await rabbitBrowser.go("https://www.liftos.app");

    // Get the complete data (elements and page context)
    const completeData = rabbitBrowser.getCompleteData();

    // Log data size
    const jsonString = JSON.stringify(completeData);
    console.log(`\nOutput size: ${jsonString.length} characters`);
    console.log(
      `Approximate tokens (chars/4): ~${Math.ceil(jsonString.length / 4)}`
    );

    // Display optimized data
    console.log("\nOptimized data for AI consumption:");
    console.log(JSON.stringify(completeData, null, 2));

    // Close the browser
    // await rabbitBrowser.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main().catch(console.error);
