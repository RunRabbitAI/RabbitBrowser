import { Page } from "puppeteer";

/**
 * Injects and initializes the element detector in the page
 * @param page The Puppeteer page to initialize the detector on
 * @param options Configuration options for the detector
 */
export async function initializeElementDetector(
  page: Page,
  options: { focusOnConsent?: boolean } = {}
): Promise<void> {
  // Default options
  const defaultOptions = {
    focusOnConsent: false, // By default, look for all interactive elements
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

    // Define getClickableElements function
    window.getClickableElements = function () {
      // Core selectors for clickable elements - general web standards
      const clickableSelectors = [
        // Standard interactive elements
        "a", // Links
        "button", // Buttons
        'input[type="button"]', // Button inputs
        'input[type="submit"]', // Submit inputs
        'input[type="reset"]', // Reset inputs
        'input[type="checkbox"]', // Checkboxes
        'input[type="radio"]', // Radio buttons
        "select", // Dropdown selectors

        // ARIA and accessibility elements
        '[role="button"]', // Elements with button role
        '[role="link"]', // Elements with link role
        '[role="checkbox"]', // Elements with checkbox role
        '[role="tab"]', // Tabs
        '[role="menuitem"]', // Menu items
        '[role="option"]', // Selectable options
        '[role="menuitemcheckbox"]', // Menu checkboxes
        '[role="menuitemradio"]', // Menu radio buttons
        '[role="switch"]', // Toggle switches

        // Interactive attributes
        '[tabindex]:not([tabindex="-1"])', // Elements in tab order
        "[onclick]", // Elements with click handlers
        "[onmousedown]", // Elements with mouse handlers
        "[ontouchstart]", // Elements with touch handlers

        // Common CSS classes for interactive elements
        ".btn", // Bootstrap buttons
        ".button", // Generic button classes
        ".nav-item", // Navigation items
        ".clickable", // Generic clickable classes
        ".control", // Generic control elements
        ".interactive", // Generic interactive elements

        // Common UI frameworks
        ".MuiButtonBase-root", // Material-UI buttons
        ".v-btn", // Vuetify buttons
        ".ant-btn", // Ant Design buttons
        ".chakra-button", // Chakra UI buttons

        // Any element within a dialog that might be actionable
        'div[role="dialog"] a, div[role="dialog"] button, div[role="dialog"] [role="button"]',
        'div[aria-modal="true"] a, div[aria-modal="true"] button, div[aria-modal="true"] [role="button"]',

        // Legacy event handlers (less common but still valid)
        "[data-toggle]", // Bootstrap data-toggle attribute
        "[data-target]", // Bootstrap data-target attribute
        "[data-action]", // Custom action attribute

        // Custom selector for our marked elements
        ".consent-button-detected", // Our own marker class
      ];

      // Add :contains pseudo-selector implementation if it doesn't exist
      if ((!window as any).jQuery && !Element.prototype.matches) {
        const originalQuerySelector = document.querySelector;
        document.querySelector = function (selector: string) {
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
      }

      // Function to find elements in document and all iframes
      function getAllElementsIncludingIframes(
        doc: Document,
        selectors: string[]
      ): Element[] {
        // Get elements from the document
        const elements: Element[] = [];

        for (const selector of selectors) {
          try {
            const found = Array.from(doc.querySelectorAll(selector));
            elements.push(...found);
          } catch (e) {
            // Skip invalid selectors
          }
        }

        // Get elements from all iframes
        try {
          const iframes = Array.from(doc.querySelectorAll("iframe"));
          for (const iframe of iframes) {
            try {
              const iframeDoc =
                (iframe as HTMLIFrameElement).contentDocument ||
                (iframe as HTMLIFrameElement).contentWindow?.document;
              if (iframeDoc) {
                const iframeElements = getAllElementsIncludingIframes(
                  iframeDoc,
                  selectors
                );
                elements.push(...iframeElements);
              }
            } catch (e) {
              // Cross-origin iframe, can't access
            }
          }
        } catch (e) {
          // Skip if iframe handling fails
        }

        return elements;
      }

      // Function to find clickable elements in Shadow DOM
      function findInShadowRoots(
        root: DocumentFragment | Element,
        selectors: string[]
      ): Element[] {
        const elements: Element[] = [];

        try {
          // Get all elements with shadow roots
          const allElements = root.querySelectorAll("*");

          for (const el of allElements) {
            // Check if element has a shadow root
            if (el.shadowRoot) {
              // Search within the shadow root
              for (const selector of selectors) {
                try {
                  const shadowElements = Array.from(
                    el.shadowRoot.querySelectorAll(selector)
                  );
                  elements.push(...shadowElements);
                } catch (e) {
                  // Skip invalid selectors
                }
              }

              // Recursively check for nested shadow roots
              const nestedElements = findInShadowRoots(
                el.shadowRoot,
                selectors
              );
              elements.push(...nestedElements);
            }
          }
        } catch (e) {
          // Skip if shadow DOM handling fails
        }

        return elements;
      }

      // Find all potentially clickable elements, including in iframes and shadow DOM
      let allElements: Element[] = [];

      try {
        // Regular DOM elements
        const domElements = getAllElementsIncludingIframes(
          document,
          clickableSelectors
        );
        allElements.push(...domElements);

        // Shadow DOM elements - Note: Using document.body instead of document to fix type error
        const shadowElements = findInShadowRoots(
          document.body,
          clickableSelectors
        );
        allElements.push(...shadowElements);

        // Find elements with cursor: pointer style
        try {
          const allDomElements = document.querySelectorAll("*");
          Array.from(allDomElements).forEach((el) => {
            try {
              const style = window.getComputedStyle(el);
              if (style.cursor === "pointer") {
                allElements.push(el);
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        } catch (e) {
          // Skip if there's an error with style checking
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        sendToNodeJS("Error finding elements: " + errorMessage);
      }

      // Special handling for Google content buttons
      if (allElements.length === 0) {
        sendToNodeJS("No clickable elements found, trying special selectors");

        const specialSelectors = [
          // Generic dialog and consent selectors
          'div[role="dialog"] button',
          'div[aria-modal="true"] button',
          '[class*="consent"] button',
          '[class*="cookie"] button',
          '[class*="privacy"] button',
          '[class*="gdpr"] button',
          '[class*="notice"] button',
          '[class*="banner"] button',
          // Try to find any visible buttons
          'button:not([style*="display:none"]):not([style*="display: none"])',
          'div[role="button"]:not([style*="display:none"]):not([style*="display: none"])',
          '[aria-label*="cookie" i]',
          '[aria-label*="consent" i]',
          '[aria-label*="privacy" i]',
          '[aria-label*="accept" i]',
          '[aria-label*="agree" i]',
          '[aria-label*="decline" i]',
          '[aria-label*="reject" i]',
        ];

        for (const selector of specialSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              sendToNodeJS(
                `Found ${elements.length} elements with special selector: ${selector}`
              );
              allElements.push(...Array.from(elements));
            }
          } catch (e) {
            // Skip invalid selectors
          }
        }
      }

      // Remove duplicates
      const uniqueElements = Array.from(new Set(allElements));

      // Find consent buttons dynamically - only include actual clickable elements
      const consentButtons = uniqueElements.filter((el: Element) => {
        try {
          // Skip zero-sized elements
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return false;
          }

          // Skip elements that are likely to be just text containers inside buttons
          const tagName = el.tagName.toLowerCase();
          if (
            (tagName === "div" || tagName === "span") &&
            el.childNodes.length === 1 &&
            el.childNodes[0].nodeType === Node.TEXT_NODE
          ) {
            // Check if parent is a button or has button role
            const parent = el.parentElement;
            if (
              parent &&
              (parent.tagName.toLowerCase() === "button" ||
                parent.getAttribute("role") === "button")
            ) {
              return false; // This is just a text node inside a button
            }
          }

          // First check if it's marked as a consent button by our detector
          if (
            (el as HTMLElement).classList?.contains("consent-button-detected")
          ) {
            return true;
          }

          // Then check if it might be a consent button based on common patterns
          const elementText = el.textContent?.toLowerCase() || "";
          const elementId = (el as HTMLElement).id?.toLowerCase() || "";
          const elementClasses = Array.from((el as HTMLElement).classList || [])
            .join(" ")
            .toLowerCase();

          // Check if this is a real consent button by its text patterns
          // Only include actual consent action text patterns, not general "cookie" links
          const consentActionPatterns = [
            "accept",
            "agree",
            "allow",
            "akzeptieren",
            "reject",
            "decline",
            "ablehnen",
            "alle akzeptieren",
            "alle ablehnen",
          ];

          // First check for action words - these are more likely real consent buttons
          const hasConsentActionText = consentActionPatterns.some((pattern) =>
            elementText.includes(pattern)
          );

          // Check if this is a cookie settings link rather than a main consent button
          const isLikelySettingsLink =
            elementText.includes("settings") ||
            elementText.includes("preferences") ||
            elementText.includes("mehr") ||
            elementText.includes("options") ||
            elementText.includes("einstellungen") ||
            elementText.includes("personalisierung") ||
            // No action verb but just "cookies" is likely just a link to cookie policy
            (elementText.includes("cookie") &&
              !consentActionPatterns.some((pattern) =>
                elementText.includes(pattern)
              ));

          // Skip generic cookie links and policy links
          if (isLikelySettingsLink && tagName === "a") {
            return false;
          }

          // Strong signals that this is a consent button
          const hasConsentClass = [
            "consent-button",
            "accept",
            "agree",
            "disagree",
            "reject",
            "decline",
            "allow",
            "cookie-button",
            "cookie-consent",
          ].some(
            (pattern) =>
              elementClasses.includes(pattern) || elementId.includes(pattern)
          );

          // Only select actionable buttons, not generic "cookie" mentions
          const isPotentialConsentButton =
            hasConsentActionText ||
            (elementText.includes("cookie") &&
              (tagName === "button" || hasConsentClass));

          // Then verify it's actually a clickable element, not a container
          if (isPotentialConsentButton) {
            // Buttons and elements with button role are always valid
            if (tagName === "button" || el.getAttribute("role") === "button") {
              return true;
            }

            // Links are valid only if they look like action buttons
            if (tagName === "a" && hasConsentActionText) {
              return true;
            }

            // Divs are valid only if they have the right attributes and size
            if (tagName === "div") {
              const isReasonableSize =
                rect.width < 400 &&
                rect.height < 100 &&
                rect.width > 40 &&
                rect.height > 15;
              const hasPointerCursor =
                window.getComputedStyle(el).cursor === "pointer";

              // Only accept divs that are appropriately sized and look clickable
              return (
                (hasConsentClass || hasConsentActionText) &&
                isReasonableSize &&
                hasPointerCursor
              );
            }
          }
        } catch (e) {
          // If any error occurs, skip this element
          return false;
        }

        return false;
      });

      // Prioritize certain elements that look like they're important interactive elements
      const priorityElements = uniqueElements.filter((el: Element) => {
        try {
          // Skip zero-sized or tiny elements
          const rect = el.getBoundingClientRect();
          if (
            rect.width === 0 ||
            rect.height === 0 ||
            (rect.width < 5 && rect.height < 5)
          ) {
            return false;
          }

          // Skip elements that are likely to be just text containers inside other elements
          const tagName = el.tagName.toLowerCase();
          if (
            (tagName === "div" || tagName === "span") &&
            el.childNodes.length === 1 &&
            el.childNodes[0].nodeType === Node.TEXT_NODE
          ) {
            // Check if parent is an interactive element
            const parent = el.parentElement;
            if (
              parent &&
              (parent.tagName.toLowerCase() === "button" ||
                parent.tagName.toLowerCase() === "a" ||
                parent.getAttribute("role") === "button")
            ) {
              return false; // Skip text nodes inside interactive elements
            }
          }

          // Check if this element has been marked by our detector
          if (
            (el as HTMLElement).classList?.contains("consent-button-detected")
          ) {
            return true;
          }

          // Always include standard interactive elements
          if (
            tagName === "button" ||
            tagName === "select" ||
            (tagName === "input" &&
              ["button", "submit", "reset", "checkbox", "radio"].includes(
                (el as HTMLInputElement).type || ""
              ))
          ) {
            return true;
          }

          // Always include elements with interactive ARIA roles
          if (
            el.getAttribute("role") === "button" ||
            el.getAttribute("role") === "link" ||
            el.getAttribute("role") === "checkbox" ||
            el.getAttribute("role") === "tab" ||
            el.getAttribute("role") === "switch"
          ) {
            return true;
          }

          // For links (<a>), include only those that likely represent actions
          if (tagName === "a") {
            // Check if the link has button-like appearance
            const style = window.getComputedStyle(el);
            const hasBgColor =
              style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
              style.backgroundColor !== "transparent";
            const hasBorder = style.border !== "none" && style.border !== "";
            const hasButtonStyling = hasBgColor || hasBorder;

            // Links with button styling or onclick attributes are prioritized
            if (hasButtonStyling || el.hasAttribute("onclick")) {
              return true;
            }

            // In dialogs, prioritize all links
            let parent = el.parentElement;
            while (parent) {
              if (
                parent.getAttribute("role") === "dialog" ||
                parent.getAttribute("aria-modal") === "true"
              ) {
                return true;
              }
              parent = parent.parentElement;
            }

            // Other links aren't prioritized (but will still be included in the general list)
            return false;
          }

          // For divs, they need to have clickable characteristics
          if (tagName === "div") {
            // Check if the div has cursor:pointer style
            const style = window.getComputedStyle(el);
            const hasPointerCursor = style.cursor === "pointer";

            // Check if it has click event handlers
            const hasClickHandler =
              el.hasAttribute("onclick") || el.hasAttribute("data-toggle");

            // Check if it has a reasonable size for a button (not too big, not too small)
            const isReasonableSize =
              rect.width < 400 &&
              rect.height < 100 &&
              rect.width > 20 &&
              rect.height > 10;

            // Divs need to look clickable and be reasonably sized
            return (hasPointerCursor || hasClickHandler) && isReasonableSize;
          }
        } catch (e) {
          // If any error occurs, skip this element
          return false;
        }

        return false;
      });

      // If we found priority elements, return those
      if (priorityElements.length > 0) {
        sendToNodeJS(
          `Prioritizing ${priorityElements.length} interactive elements`
        );

        // Log detailed information about prioritized elements
        priorityElements.forEach((element, i) => {
          try {
            const rect = element.getBoundingClientRect();
            const tagName = element.tagName.toLowerCase();
            const id = (element as HTMLElement).id
              ? `id="${(element as HTMLElement).id}"`
              : "";
            const classes = element.className
              ? `class="${element.className}"`
              : "";
            const text = element.textContent?.trim().substring(0, 50) || "";
            const dimensions = `${Math.round(rect.width)}x${Math.round(
              rect.height
            )}`;
            const position = `(${Math.round(rect.left)},${Math.round(
              rect.top
            )})`;

            sendToNodeJS(
              `  Element ${
                i + 1
              }: ${tagName} ${id} ${classes} | text: "${text}" | ${dimensions} @ ${position}`
            );
          } catch (e) {
            sendToNodeJS(`  Element ${i + 1}: Error getting details`);
          }
        });

        return priorityElements;
      }

      // Filter out invisible elements and nested elements
      return uniqueElements.filter((element: Element) => {
        try {
          // Skip invisible elements
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return false;
          }

          // Check if any parent is a clickable element - if so, skip this element
          let parent = element.parentElement;
          while (parent) {
            if (uniqueElements.includes(parent)) {
              return false; // This is a child of another clickable element
            }
            parent = parent.parentElement;
          }

          return true;
        } catch (e) {
          return false; // Skip problematic elements
        }
      });
    };
  });
}
