import { Page } from "puppeteer";

/**
 * Injects and initializes the element detector in the page
 * @param page The Puppeteer page to initialize the detector on
 * @param options Configuration options for the detector
 */
export async function initializeElementDetector(
  page: Page,
  options: {
    focusOnConsent?: boolean;
    includeFormInputs?: boolean;
  } = {}
): Promise<void> {
  // Default options
  const defaultOptions = {
    focusOnConsent: false, // By default, look for all interactive elements
    includeFormInputs: true, // By default, include form inputs
  };

  const opts = { ...defaultOptions, ...options };

  // Set options in the page context
  await page.evaluate((options) => {
    // Store options in the window object for access within scripts
    window._detectorOptions = options;
  }, opts);

  // Inject the element detector script
  await page.evaluate(() => {
    // Get the detector options from the window object
    const detectorOptions = (window as any)._detectorOptions || {
      focusOnConsent: false,
      includeFormInputs: true,
    };

    // Logger function to communicate with Node.js
    function sendToNodeJS(message: string) {
      console.log(`[HIGHLIGHT] ${message}`);
    }

    // Helper to get element details
    function getElementDetails(element: Element) {
      const rect = element.getBoundingClientRect();
      const tagName = element.tagName.toLowerCase();
      const id = element.id ? `id="${element.id}"` : "";
      const classes = element.className ? `class="${element.className}"` : "";
      const text = element.textContent?.trim().substring(0, 50) || "";
      const dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      const position = `(${Math.round(rect.left)},${Math.round(rect.top)})`;
      const attributes = Array.from(element.attributes)
        .map((attr) => `${attr.name}="${attr.value}"`)
        .filter((attr) => !attr.startsWith("id=") && !attr.startsWith("class="))
        .join(" ");

      return `${tagName} ${id} ${classes} ${attributes} | text: "${text}" | ${dimensions} @ ${position}`;
    }

    // Direct targeting of Google's cookie consent dialog
    function handleGoogleConsent() {
      // Only include actual button IDs, not container divs
      const commonButtonIds = [
        "L2AGLb", // "I agree" button
        "W0wltc", // "Reject all" button
        "VDity", // Other possible id
      ];

      // Container IDs that should NOT be marked as clickable buttons
      const containerIds = ["CXQnmb"];

      let foundButtons = 0;
      const consentButtonDetails: string[] = [];

      // Try to find buttons by their known IDs
      for (const id of commonButtonIds) {
        const button = document.getElementById(id);
        if (button) {
          // Only add buttons that are actually clickable elements
          if (
            button.tagName === "BUTTON" ||
            button.tagName === "A" ||
            button.getAttribute("role") === "button"
          ) {
            foundButtons++;
            // Mark these as important by adding our own class
            button.classList.add("consent-button-detected");
            consentButtonDetails.push(getElementDetails(button));
          }
        }
      }

      // Log container elements but don't highlight them
      for (const id of containerIds) {
        const container = document.getElementById(id);
        if (container) {
          sendToNodeJS(
            `Found consent dialog container: ${getElementDetails(container)}`
          );
        }
      }

      // If we didn't find buttons by ID, try common class names
      if (foundButtons === 0) {
        const buttonClasses = [
          "tHlp8d",
          "QS5gu sy4vM",
          "VfPpkd-LgbsSe",
          "VfPpkd-LgbsSe-OWXEXe-k8QpJ",
          "consent-bump",
          "cookie-dialog",
        ];

        for (const className of buttonClasses) {
          // Look for elements with these classes
          const elements = document.querySelectorAll(`.${className}`);
          if (elements.length > 0) {
            foundButtons += elements.length;
            // Mark these
            elements.forEach((el) => {
              el.classList.add("consent-button-detected");
              consentButtonDetails.push(getElementDetails(el));
            });
          }
        }
      }

      // Also look for text that might indicate consent buttons
      const textSelectors = [
        'button:contains("Accept")',
        'button:contains("Agree")',
        'button:contains("Allow")',
        'button:contains("Consent")',
        'button:contains("Cookie")',
        'button:contains("Privacy")',
        'button:contains("GDPR")',
        'button:contains("Reject")',
        'button:contains("Decline")',
        'button:contains("Close")',
        'button:contains("No thanks")',
        'button:contains("I agree")',
      ];

      // Add :contains pseudo-selector if needed
      if ((!window as any).jQuery && !Element.prototype.matches) {
        document.querySelector = (function (originalQuerySelector) {
          return function (selector: string) {
            try {
              if (selector.includes(":contains(")) {
                const match = selector.match(/:contains\(["'](.*)["']\)/);
                if (match && match[1]) {
                  const text = match[1];
                  const baseSelector = selector.replace(
                    /:contains\(["'].*["']\)/,
                    ""
                  );
                  const elements = Array.from(
                    document.querySelectorAll(baseSelector || "*")
                  );
                  return elements.find(
                    (el) =>
                      el.textContent &&
                      el.textContent.toLowerCase().includes(text.toLowerCase())
                  );
                }
              }
              return originalQuerySelector.call(document, selector);
            } catch (e) {
              return originalQuerySelector.call(document, selector);
            }
          };
        })(document.querySelector);
      }

      // Try to find buttons by text content
      for (const selector of textSelectors) {
        try {
          const element = document.querySelector(selector);
          if (
            element &&
            !element.classList.contains("consent-button-detected")
          ) {
            element.classList.add("consent-button-detected");
            foundButtons++;
            consentButtonDetails.push(getElementDetails(element));
          }
        } catch (e) {
          // Skip invalid selectors
        }
      }

      return { count: foundButtons, details: consentButtonDetails };
    }

    // Dynamic detection of consent dialogs and buttons
    function handleConsentButtons(): { count: number; details: string[] } {
      let foundButtons = 0;
      const consentButtonDetails: string[] = [];

      // Common text patterns in consent buttons (case insensitive)
      const consentTextPatterns = [
        "accept",
        "agree",
        "allow",
        "consent",
        "cookie",
        "privacy",
        "gdpr",
        "reject",
        "decline",
        "no thanks",
        "i agree",
        "continue",
        "okay",
        "got it",
        "understood",
        "akzeptieren",
        "ablehnen",
        "alle akzeptieren",
        "verstanden",
      ];

      // Common class name patterns for consent dialogs
      const consentClassPatterns = [
        "consent",
        "cookie",
        "gdpr",
        "privacy",
        "banner",
        "notice",
        "popup",
        "modal",
        "dialog",
      ];

      // Find elements with consent-related text content
      function findElementsByText() {
        // Try to find buttons with consent-related text
        const allElements = document.querySelectorAll(
          "button, a, [role='button'], input[type='button'], input[type='submit']"
        );

        Array.from(allElements).forEach((element) => {
          const textContent = element.textContent?.toLowerCase() || "";

          // Check if element text contains any consent pattern
          const hasConsentText = consentTextPatterns.some((pattern) =>
            textContent.includes(pattern.toLowerCase())
          );

          if (hasConsentText) {
            // Check if it's actually a clickable element
            if (isClickableElement(element)) {
              foundButtons++;
              element.classList.add("consent-button-detected");
              consentButtonDetails.push(getElementDetails(element));
            }
          }
        });
      }

      // Find elements within consent dialogs/banners
      function findElementsInConsentContainers() {
        // Find potential consent containers by class/ID patterns
        const potentialContainers: Element[] = [];

        // Find by class name patterns
        consentClassPatterns.forEach((pattern) => {
          document.querySelectorAll(`[class*="${pattern}"]`).forEach((el) => {
            potentialContainers.push(el);
          });
          document.querySelectorAll(`[id*="${pattern}"]`).forEach((el) => {
            potentialContainers.push(el);
          });
        });

        // For each potential container, find buttons inside
        potentialContainers.forEach((container) => {
          const buttons = container.querySelectorAll(
            "button, a, [role='button'], input[type='button'], input[type='submit']"
          );

          if (buttons.length > 0) {
            buttons.forEach((button) => {
              if (
                isClickableElement(button) &&
                !button.classList.contains("consent-button-detected")
              ) {
                foundButtons++;
                button.classList.add("consent-button-detected");
                consentButtonDetails.push(getElementDetails(button));
              }
            });

            // Log container but don't highlight it
            sendToNodeJS(
              `Found consent dialog container: ${getElementDetails(container)}`
            );
          }
        });
      }

      // Check if an element is actually clickable (not a container)
      function isClickableElement(element: Element): boolean {
        const tagName = element.tagName.toLowerCase();
        const rect = element.getBoundingClientRect();

        // Always consider actual buttons and links clickable
        if (
          tagName === "button" ||
          tagName === "a" ||
          element.getAttribute("role") === "button"
        ) {
          return true;
        }

        // For divs and other elements, check if they're small enough to be buttons
        // and have cursor:pointer style
        if (tagName === "div" || tagName === "span") {
          // Check dimensions - most buttons are not huge
          const isReasonablySize = rect.width < 500 && rect.height < 100;

          try {
            const style = window.getComputedStyle(element);
            const hasPointerCursor = style.cursor === "pointer";

            return isReasonablySize && hasPointerCursor;
          } catch (e) {
            return isReasonablySize; // Fallback if style checking fails
          }
        }

        return false;
      }

      // Execute the detection methods
      findElementsByText();
      findElementsInConsentContainers();

      // If using known heuristics didn't find buttons, try aria attributes
      if (foundButtons === 0) {
        // Look for buttons with accessibility attributes related to consent
        document
          .querySelectorAll(
            '[aria-label*="cookie" i], [aria-label*="consent" i], [aria-label*="privacy" i]'
          )
          .forEach((element) => {
            if (isClickableElement(element)) {
              foundButtons++;
              element.classList.add("consent-button-detected");
              consentButtonDetails.push(getElementDetails(element));
            }
          });
      }

      return { count: foundButtons, details: consentButtonDetails };
    }

    // Find consent buttons
    const consentResult = handleConsentButtons();
    if (consentResult.count > 0) {
      sendToNodeJS(`Found ${consentResult.count} consent buttons on the page`);
      sendToNodeJS(`Consent button details:`);
      consentResult.details.forEach((detail, i) => {
        sendToNodeJS(`  ${i + 1}. ${detail}`);
      });

      // Get all consent buttons that have been detected
      const allConsentButtons = document.querySelectorAll(
        ".consent-button-detected"
      );

      // Filter out any elements that shouldn't be highlighted
      const buttonsToHighlight: Element[] = [];

      // First pass: collect all valid buttons and filter out 0x0 elements
      allConsentButtons.forEach((button) => {
        // Skip elements with zero dimensions
        const rect = button.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }

        // Skip if already highlighted
        if (window.processedElements.has(button)) {
          return;
        }

        // Skip text spans inside buttons
        const tagName = button.tagName.toLowerCase();
        if (
          (tagName === "div" || tagName === "span") &&
          button.childNodes.length === 1 &&
          button.childNodes[0].nodeType === Node.TEXT_NODE
        ) {
          // Check if parent is a button or has button role
          const parent = button.parentElement;
          if (
            parent &&
            (parent.tagName.toLowerCase() === "button" ||
              parent.getAttribute("role") === "button")
          ) {
            return; // Skip text nodes inside buttons
          }
        }

        // Add the button to our list
        buttonsToHighlight.push(button);
      });

      // Second pass: check for parent-child relationships between buttons
      const finalButtonsToHighlight = buttonsToHighlight.filter((button) => {
        // Check if any parent of this button is also in our list
        let parent = button.parentElement;
        while (parent) {
          if (buttonsToHighlight.includes(parent)) {
            return false; // Skip this button as its parent is also being highlighted
          }
          parent = parent.parentElement;
        }
        return true;
      });

      // Now highlight only the filtered buttons
      if (
        finalButtonsToHighlight.length > 0 &&
        window.highlightClickableElement
      ) {
        sendToNodeJS(
          `Highlighting ${
            finalButtonsToHighlight.length
          } consent buttons manually (after filtering out ${
            allConsentButtons.length - finalButtonsToHighlight.length
          } duplicates/invalid elements)`
        );
        finalButtonsToHighlight.forEach((button, i) => {
          window.highlightClickableElement(button, i + 1);
        });
      }
    }

    // Identify all clickable elements on the page
    window.getClickableElements = function (): Element[] {
      // Results array
      const clickableElements: Element[] = [];
      const processedParents = new Set<Element>();

      // First, add all generic interactive elements
      const interactiveSelectors = [
        "a",
        "button",
        "[role='button']",
        "input[type='button']",
        "input[type='submit']",
        "input[type='reset']",
        "input[type='checkbox']",
        "input[type='radio']",
        "summary",
      ];

      // Add form input elements if enabled
      if (detectorOptions.includeFormInputs) {
        interactiveSelectors.push(
          "input:not([type='hidden'])",
          "select",
          "textarea",
          "label",
          ".form-control"
        );
      }

      // Process elements in order from parent to child
      // This ensures we process parent buttons before their text nodes
      function processElementsInDOMOrder() {
        // Get all potential elements matching our selectors
        const potentialElements: Element[] = [];
        interactiveSelectors.forEach((selector) => {
          try {
            const elements = document.querySelectorAll(selector);
            potentialElements.push(...Array.from(elements));
          } catch (e) {
            // Skip invalid selectors
          }
        });

        // Also add elements with cursor:pointer style
        const allElements = document.querySelectorAll("*");
        Array.from(allElements).forEach((element) => {
          try {
            const style = window.getComputedStyle(element);
            if (style.cursor === "pointer") {
              potentialElements.push(element);
            }
          } catch (e) {
            // Skip style errors
          }
        });

        // Remove duplicates
        const uniqueElements = [...new Set(potentialElements)];

        // Process elements in DOM order (parent first, then children)
        const treeWalker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: function (node) {
              if (uniqueElements.includes(node as Element)) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_SKIP;
            },
          }
        );

        // Process each element in DOM order
        let currentNode = treeWalker.nextNode();
        while (currentNode) {
          processElement(currentNode as Element);
          currentNode = treeWalker.nextNode();
        }
      }

      // Process a single element
      function processElement(element: Element) {
        // Skip elements that are too small
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }

        // Skip elements that are children of already processed elements
        let parent = element.parentElement;
        while (parent) {
          if (processedParents.has(parent)) {
            return;
          }
          parent = parent.parentElement;
        }

        let isClickable = false;
        let isContainer = false;

        // Check if the element is in our list of likely interactive elements
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute("type");

        // Skip text containers inside interactive elements
        if (
          (tagName === "span" || tagName === "div" || tagName === "p") &&
          element.children.length === 0 &&
          element.parentElement &&
          (element.parentElement.tagName.toLowerCase() === "button" ||
            element.parentElement.tagName.toLowerCase() === "a" ||
            element.parentElement.getAttribute("role") === "button")
        ) {
          return;
        }

        // Check for standard clickable elements
        if (
          tagName === "a" ||
          tagName === "button" ||
          tagName === "select" ||
          tagName === "textarea" ||
          element.getAttribute("role") === "button" ||
          element.getAttribute("role") === "link" ||
          element.getAttribute("role") === "checkbox" ||
          element.getAttribute("role") === "radio" ||
          element.getAttribute("role") === "menuitem" ||
          element.getAttribute("role") === "tab" ||
          (tagName === "input" &&
            type &&
            ["button", "submit", "reset", "checkbox", "radio"].includes(type))
        ) {
          isClickable = true;

          // Mark containers that might contain text nodes
          if (
            tagName === "button" ||
            tagName === "a" ||
            element.getAttribute("role") === "button"
          ) {
            isContainer = true;
          }
        }

        // Check for form inputs if enabled
        if (detectorOptions.includeFormInputs && !isClickable) {
          if (
            (tagName === "input" &&
              type &&
              [
                "text",
                "email",
                "password",
                "search",
                "tel",
                "url",
                "number",
                "date",
                "datetime-local",
                "month",
                "week",
                "time",
                "color",
                "file",
                "range",
              ].includes(type)) ||
            tagName === "select" ||
            tagName === "textarea" ||
            element.getAttribute("contenteditable") === "true"
          ) {
            isClickable = true;
          }
        }

        // Check for common UI patterns for clickable elements
        if (!isClickable) {
          try {
            const style = window.getComputedStyle(element);
            if (style.cursor === "pointer") {
              isClickable = true;
            } else if (
              // Check for elements that have click handlers
              element.hasAttribute("onclick") ||
              element.hasAttribute("onmousedown") ||
              element.hasAttribute("onmouseup")
            ) {
              isClickable = true;
            }
          } catch (e) {
            // Skip style error
          }
        }

        if (isClickable) {
          clickableElements.push(element);

          // If this is a container element, mark it as processed
          // to prevent its child text nodes from being detected
          if (isContainer) {
            processedParents.add(element);
          }
        }
      }

      // Process elements in DOM order
      processElementsInDOMOrder();

      // Remove duplicates and sort by position
      const uniqueElements = [...new Set(clickableElements)];

      // Prioritize elements that are important for page interaction
      uniqueElements.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();

        // Elements with higher Z-index or later in DOM get higher priority
        let aZIndex = 0;
        let bZIndex = 0;

        try {
          aZIndex = parseInt(window.getComputedStyle(a).zIndex) || 0;
          bZIndex = parseInt(window.getComputedStyle(b).zIndex) || 0;
        } catch (e) {
          // Ignore style errors
        }

        // First sort by z-index
        if (aZIndex !== bZIndex) {
          return bZIndex - aZIndex;
        }

        // Then by position in viewport (top to bottom, left to right)
        if (Math.abs(aRect.top - bRect.top) > 10) {
          return aRect.top - bRect.top;
        }

        return aRect.left - bRect.left;
      });

      // Log what we're highlighting
      const prioritizedElements = uniqueElements.slice(0, 100); // Limit to 100 elements
      if (prioritizedElements.length > 0) {
        sendToNodeJS(
          `Prioritizing ${prioritizedElements.length} interactive elements`
        );
        prioritizedElements.forEach((element, i) => {
          sendToNodeJS(`  Element ${i + 1}: ${getElementDetails(element)}`);
        });
      }

      return prioritizedElements;
    };
  });
}
