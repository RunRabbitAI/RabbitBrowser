import { RabbitBrowser } from "../RabbitBrowser";

/**
 * Example showing how to use RabbitBrowser to find consent elements on multiple sites
 */
async function findConsent() {
  // Create a new browser instance configured for consent detection
  const browser = new RabbitBrowser({
    focusOnConsent: true,
    logDetails: true,
    waitTime: 3000,
    earlyReturn: true,
  });

  // List of sites to test for consent elements
  const sites = [
    "https://www.google.com",
    "https://www.bbc.com",
    "https://www.cnn.com",
    "https://www.amazon.com",
  ];

  try {
    // Process each site
    for (const site of sites) {
      console.log(`\n--- Testing ${site} ---`);

      // Navigate to the site and focus on consent elements
      await browser.go(site);

      // Get all detected elements
      const elements = browser.getElements();
      console.log(`Found ${elements.length} elements on ${site}`);

      // Look for specific consent-related keywords
      const consentKeywords = [
        "accept",
        "agree",
        "consent",
        "cookie",
        "privacy",
        "reject",
        "decline",
      ];

      // Check each keyword
      for (const keyword of consentKeywords) {
        const matchingElements = browser.findElementsByText(keyword);
        if (matchingElements.length > 0) {
          console.log(
            `Found ${matchingElements.length} elements with '${keyword}' text`
          );

          // Show the first matching element
          if (matchingElements.length > 0) {
            const el = matchingElements[0];
            console.log(
              `  Example: ${el.tagName}${el.id ? `#${el.id}` : ""} - "${
                el.text
              }"`
            );
          }
        }
      }

      // Pause to allow for visual inspection
      console.log(`Waiting 3 seconds before moving to next site...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Close the browser when done
    await browser.close();
    console.log("\nConsent element search completed");
  } catch (error) {
    console.error("Error:", error);
    await browser.close();
  }
}

// Run the example
findConsent();
