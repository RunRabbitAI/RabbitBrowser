import { RabbitBrowser } from "../RabbitBrowser";

/**
 * Example of using RabbitBrowser's interaction features
 *
 * This example:
 * 1. Navigates to a search engine
 * 2. Finds the search input
 * 3. Fills it with a search term
 * 4. Clicks the search button
 * 5. Analyzes the search results page
 */
async function main() {
  // Create a new RabbitBrowser instance
  const browser = new RabbitBrowser({
    headless: false, // Show the browser to see interactions
    waitTime: 5000, // Give more time for elements to load
  });

  try {
    // Initialize the browser
    await browser.init();

    // Navigate to a search engine
    console.log("Navigating to search engine...");
    await browser.go("https://www.duckduckgo.com");

    // Get the elements on the page
    const { elements } = await browser.getCompleteData();

    // Find the search input
    console.log("Looking for search input...");
    const searchInput = elements.find(
      (el) =>
        el.isFormInput &&
        (el.placeholder?.toLowerCase().includes("search") ||
          el.attributes?.name?.toLowerCase().includes("q"))
    );

    if (!searchInput) {
      throw new Error("Could not find search input");
    }

    console.log(
      `Found search input: ${searchInput.tagName} with placeholder: ${searchInput.placeholder}`
    );

    // Fill the search input
    console.log("Filling search input...");
    await browser.fillInput(searchInput, "RabbitBrowser automation");

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find the search button
    console.log("Looking for search button...");
    const searchButton = elements.find(
      (el) =>
        el.isClickable &&
        (el.text.toLowerCase().includes("search") ||
          el.attributes?.type === "submit" ||
          el.attributes?.["aria-label"]?.toLowerCase().includes("search"))
    );

    if (!searchButton) {
      throw new Error("Could not find search button");
    }

    console.log(
      `Found search button: ${searchButton.tagName} with text: ${searchButton.text}`
    );

    // Click the search button
    console.log("Clicking search button...");
    await browser.clickElement(searchButton);

    // Wait for results page to load
    console.log("Waiting for search results...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Analyze the results page
    console.log("Analyzing search results page...");
    const currentUrl = await browser.getCurrentUrl();
    await browser.go(currentUrl);

    // Get the updated elements on the results page
    const { elements: resultsElements, pageContext } =
      await browser.getCompleteData();

    // Count the number of result links
    const resultLinks = resultsElements.filter(
      (el) => el.tagName === "a" && el.isClickable
    );

    console.log(
      `Found ${resultLinks.length} clickable links on the results page`
    );
    console.log(`Page title: ${pageContext.title}`);

    // Click the first result (optional)
    if (resultLinks.length > 0) {
      console.log("Clicking the first result...");
      await browser.clickElement(resultLinks[0]);

      // Wait for the page to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get the current URL
      const finalUrl = await browser.getCurrentUrl();
      console.log(`Navigated to: ${finalUrl}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close the browser
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait to see the final page
    await browser.close();
  }
}

main().catch(console.error);
