import { simpleRabbitBrowser } from "../SimpleRabbitBrowser";

// Get only consent elements from a page
async function getConsentElements() {
  try {
    // Single call to get consent elements
    const elements = await simpleRabbitBrowser.detectElements(
      "https://www.amazon.com",
      {
        focusOnConsent: true, // Focus on consent elements only
        closeBrowser: true, // Auto-close when done
        logDetails: true, // Show logs (optional)
      }
    );

    // Print the JSON output
    console.log(JSON.stringify(elements, null, 2));

    // Show a count
    console.log(`Total consent elements found: ${elements.length}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
getConsentElements();
