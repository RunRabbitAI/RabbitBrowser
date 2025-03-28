import { RabbitBrowser } from "../index";

/**
 * Example of detecting consent buttons using RabbitBrowser
 */
async function detectConsentButtons() {
  // Create a browser instance focused on consent elements
  const browser = new RabbitBrowser({
    focusOnConsent: true,
    waitTime: 5000,
    logDetails: true,
  });

  try {
    // Navigate to a site known for consent dialogs
    console.log("Navigating to site...");
    await browser.go("https://www.google.com");

    // Get all the detected elements
    const allElements = browser.getElements();
    console.log(`Found ${allElements.length} interactive elements in total`);

    // Filter for consent-related elements by checking for specific keywords in text
    const consentRelated = browser.filterElements((element) => {
      const text = element.text.toLowerCase();
      const hasConsentKeyword =
        text.includes("accept") ||
        text.includes("agree") ||
        text.includes("consent") ||
        text.includes("cookie") ||
        text.includes("privacy") ||
        text.includes("gdpr") ||
        text.includes("reject") ||
        text.includes("decline");

      const hasConsentClass =
        (element.className?.includes("consent") ||
          element.className?.includes("cookie")) ??
        false;

      return hasConsentKeyword || hasConsentClass;
    });

    // Log the consent-related elements
    console.log(`Found ${consentRelated.length} consent-related elements`);

    if (consentRelated.length > 0) {
      console.log("Consent elements:");
      console.log(JSON.stringify(consentRelated, null, 2));
    }

    // Close the browser
    await browser.close();
  } catch (error) {
    console.error("Error:", error);
    await browser.close();
  }
}

// Run the example
detectConsentButtons().catch(console.error);
