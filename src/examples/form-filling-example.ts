import { RabbitBrowser } from "../RabbitBrowser";

/**
 * Example of using RabbitBrowser to fill out a form
 *
 * This example:
 * 1. Navigates to a form demo page
 * 2. Finds different types of form elements
 * 3. Fills text inputs, selects options, and toggles checkboxes
 * 4. Submits the form
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

    // Navigate to a page with a form
    console.log("Navigating to form demo page...");
    await browser.go("https://www.w3schools.com/html/html_forms.asp");

    // Get the elements on the page
    const { elements } = browser.getCompleteData();

    // Find form elements of different types
    console.log("Looking for form elements...");

    // Helper function to find elements by type or attribute
    function findInputByType(type: string) {
      return elements.find((el) => el.isFormInput && el.type === type);
    }

    // Find elements of various types
    const textInput = findInputByType("text");
    const passwordInput = findInputByType("password");
    const checkbox = findInputByType("checkbox");
    const radioButton = findInputByType("radio");
    const submitButton = elements.find(
      (el) =>
        el.isClickable &&
        (el.type === "submit" || el.text.toLowerCase().includes("submit"))
    );

    // Find a select dropdown
    const selectElement = elements.find((el) => el.tagName === "select");

    // Log what we found
    if (textInput) console.log("Found text input");
    if (passwordInput) console.log("Found password input");
    if (checkbox) console.log("Found checkbox");
    if (radioButton) console.log("Found radio button");
    if (selectElement) console.log("Found select element");
    if (submitButton) console.log("Found submit button");

    // Fill the form fields if they exist
    console.log("\nFilling form fields...");

    if (textInput) {
      console.log("Filling text input...");
      await browser.fillInput(textInput, "RabbitBrowser User");
    }

    if (passwordInput) {
      console.log("Filling password input...");
      await browser.fillInput(passwordInput, "SecurePassword123");
    }

    if (checkbox) {
      console.log("Clicking checkbox...");
      await browser.clickElement(checkbox);
    }

    if (radioButton) {
      console.log("Selecting radio button...");
      await browser.clickElement(radioButton);
    }

    if (
      selectElement &&
      selectElement.options &&
      selectElement.options.length > 0
    ) {
      console.log("Selecting dropdown option...");
      const optionValue =
        selectElement.options[1]?.value || selectElement.options[0]?.value;
      await browser.selectOption(selectElement, optionValue);
    }

    // Wait a moment to see the filled form
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Submit the form if possible
    if (submitButton) {
      console.log("Submitting form...");
      await browser.clickElement(submitButton);

      // Wait for the form submission to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log(`Form submitted. Current URL: ${browser.getCurrentUrl()}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close the browser after a delay
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // await browser.close();
  }
}

main().catch(console.error);
