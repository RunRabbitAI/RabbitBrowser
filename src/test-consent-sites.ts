import { highlightAndCollect } from "./index";
import { log } from "./utils/logger";
import { Browser } from "puppeteer";

/**
 * Test the highlighter on multiple websites with consent dialogs
 */
async function testMultipleSites() {
  // List of websites to test (chosen for their known consent dialogs)
  const testSites = [
    "https://www.google.com",
    "https://www.youtube.com",
    "https://www.bbc.com",
    "https://www.cnn.com",
    "https://www.amazon.com",
  ];

  // Results collection
  const results: Record<
    string,
    {
      totalElements: number;
      detectionTimeMs: number;
      success: boolean;
    }
  > = {};

  // Test parameters
  const maxWaitTime = 3000;
  const minElementsRequired = 1;

  log("========================================");
  log("TESTING CONSENT DETECTION ON MULTIPLE SITES");
  log("========================================");

  let lastBrowser: Browser | null = null;

  // Test each site
  for (const site of testSites) {
    log(`\n[TEST] Testing ${site}...`);
    const startTime = Date.now();

    try {
      // Close previous browser if exists
      if (lastBrowser) {
        try {
          await lastBrowser.close();
        } catch (e) {
          // Ignore errors when closing browser
        }
      }

      // Run the highlighter with fast settings
      const { elements, browser } = await highlightAndCollect(
        site,
        maxWaitTime,
        {
          focusOnConsent: true, // Focus on consent-related elements
          logDetails: false, // Don't log element details to keep output clean
          earlyReturn: true, // Return as soon as elements are found
          minElementsRequired: minElementsRequired,
          returnBrowser: true, // Return browser instance for management
        }
      );

      // Store browser for cleanup
      if (browser) lastBrowser = browser;

      const endTime = Date.now();
      const detectionTime = endTime - startTime;

      // Record results
      results[site] = {
        totalElements: elements.length,
        detectionTimeMs: detectionTime,
        success: elements.length >= minElementsRequired,
      };

      log(`✅ Found ${elements.length} elements in ${detectionTime}ms`);

      // List the first 3 elements at most
      if (elements.length > 0) {
        log("Sample elements:");
        elements.slice(0, 3).forEach((el: any, i: number) => {
          log(
            `  ${i + 1}. ${el.tagName}${
              el.id ? `#${el.id}` : ""
            } - "${el.text.substring(0, 50)}"`
          );
        });
      } else {
        log("❌ No elements detected on this site");
      }

      // Pause to let the user see the results visually
      log(`Waiting 5 seconds for visual inspection...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      log(`❌ Error testing ${site}: ${error}`);
      results[site] = {
        totalElements: 0,
        detectionTimeMs: Date.now() - startTime,
        success: false,
      };
    }
  }

  // Try to close the last browser
  if (lastBrowser) {
    try {
      await lastBrowser.close();
    } catch (e) {
      // Ignore
    }
  }

  // Print summary
  log("\n========================================");
  log("TEST RESULTS SUMMARY");
  log("========================================");

  let successCount = 0;
  let totalTime = 0;
  let totalElements = 0;

  for (const site of testSites) {
    const result = results[site];
    log(
      `${result.success ? "✅" : "❌"} ${site}: ${
        result.totalElements
      } elements in ${result.detectionTimeMs}ms`
    );

    if (result.success) successCount++;
    totalTime += result.detectionTimeMs;
    totalElements += result.totalElements;
  }

  log("\n----------------------------------------");
  log(
    `SUCCESS RATE: ${successCount}/${testSites.length} sites (${Math.round(
      (successCount / testSites.length) * 100
    )}%)`
  );
  log(`AVERAGE DETECTION TIME: ${Math.round(totalTime / testSites.length)}ms`);
  log(`TOTAL ELEMENTS FOUND: ${totalElements}`);
  log("----------------------------------------");
}

// Run the tests
testMultipleSites()
  .then(() => {
    log("Tests completed.");
  })
  .catch((error) => {
    console.error("Test execution error:", error);
  });
