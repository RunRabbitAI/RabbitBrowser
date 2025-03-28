import puppeteer, { ElementHandle, Page } from "puppeteer";

// Add custom window property type
declare global {
  interface Window {
    getClickableElements: () => Element[];
    highlightedElements: Array<{
      element: Element;
      highlight: HTMLElement;
      number: HTMLElement;
    }>;
    elementObserver: IntersectionObserver;
    updateHighlights: () => void;
    highlightClickableElement: (element: Element, index: number) => void;
    processedElements: Set<Element>;
    startObservingNewElements: () => void;
    scanInterval: number;
  }
}

// Main function to run the highlighter
async function runHighlighter() {
  // CLI Logging function
  function log(message: string) {
    console.log(`[Highlighter] ${message}`);
  }

  log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null, // Use window size instead of viewport
    args: ["--start-maximized", "--disable-web-security"], // Start with maximized window and disable CORS for iframes
  });

  const page = await browser.newPage();

  // Intercept console messages from browser for CLI logging
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[HIGHLIGHT]")) {
      // This is a message specifically for CLI logging
      log(text.replace("[HIGHLIGHT] ", ""));
    }
  });

  // Set the window size to fit most screens
  await page.setViewport({
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
  });

  log("Navigating to Google...");
  await page.goto("https://www.google.com", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });

  log("Page loaded, initializing highlighter...");

  // Check for Google consent dialog specifically
  await page.evaluate(() => {
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
      const commonButtonIds = [
        "L2AGLb", // "I agree" button
        "W0wltc", // "Reject all" button
        "VDity", // Other possible id
        "CXQnmb", // Another possible id
      ];

      let foundButtons = 0;
      let consentButtonDetails = [];

      // Try to find buttons by their known IDs
      for (const id of commonButtonIds) {
        const button = document.getElementById(id);
        if (button) {
          foundButtons++;
          // Mark these as important by adding our own class
          button.classList.add("consent-button-detected");
          consentButtonDetails.push(getElementDetails(button));
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

    const consentResult = handleGoogleConsent();
    if (consentResult.count > 0) {
      sendToNodeJS(`Found ${consentResult.count} consent buttons on the page`);
      sendToNodeJS(`Consent button details:`);
      consentResult.details.forEach((detail, i) => {
        sendToNodeJS(`  ${i + 1}. ${detail}`);
      });
    }
  });

  // Set up the highlighting system - this initializes the core functionality
  await page.evaluate(() => {
    function sendToNodeJS(message: string) {
      console.log(`[HIGHLIGHT] ${message}`);
    }

    // Create a style element for our highlighting CSS
    const style = document.createElement("style");
    style.innerHTML = `
      .clickable-highlight {
        position: absolute;
        pointer-events: none;
        z-index: 10000;
        box-sizing: border-box;
        border: 2px solid red;
        transition: opacity 0.2s ease;
      }
      .clickable-number {
        position: absolute;
        background-color: red;
        color: white;
        padding: 2px 5px;
        border-radius: 10px;
        font-size: 12px;
        z-index: 10001;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
    `;
    document.head.appendChild(style);

    // Initialize containers to hold highlighting elements
    const highlightContainer = document.createElement("div");
    highlightContainer.style.position = "absolute";
    highlightContainer.style.top = "0";
    highlightContainer.style.left = "0";
    highlightContainer.style.pointerEvents = "none";
    highlightContainer.style.zIndex = "9999";
    document.body.appendChild(highlightContainer);

    // Store references to elements and their highlights
    window.highlightedElements = [];
    window.processedElements = new Set();

    // Create an Intersection Observer to detect when elements enter/exit viewport
    window.elementObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementId = entry.target.getAttribute("data-highlight-id");
          if (!elementId) return;

          const highlight = document.querySelector(
            `.clickable-highlight[data-for="${elementId}"]`
          ) as HTMLElement;
          const number = document.querySelector(
            `.clickable-number[data-for="${elementId}"]`
          ) as HTMLElement;

          if (highlight && number) {
            if (entry.isIntersecting) {
              highlight.style.opacity = "1";
              number.style.opacity = "1";
            } else {
              highlight.style.opacity = "0";
              number.style.opacity = "0";
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    // Update highlight positions
    window.updateHighlights = function () {
      window.highlightedElements.forEach((el) => {
        if (!el.element || !document.body.contains(el.element)) return;

        const rect = el.element.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Update highlight position
        if (el.highlight) {
          el.highlight.style.top = rect.top + scrollY + "px";
          el.highlight.style.left = rect.left + scrollX + "px";
          el.highlight.style.width = rect.width + "px";
          el.highlight.style.height = rect.height + "px";
        }

        // Update number position
        if (el.number) {
          el.number.style.top = rect.top + scrollY + "px";
          el.number.style.left = rect.left + scrollX + "px";
        }
      });
    };

    // Add scroll and resize event listeners
    window.addEventListener("scroll", window.updateHighlights);
    window.addEventListener("resize", window.updateHighlights);

    // Function to highlight a clickable element
    window.highlightClickableElement = function (
      element: Element,
      index: number
    ) {
      // Skip if already processed
      if (window.processedElements.has(element)) {
        return;
      }

      window.processedElements.add(element);

      // Give the element a unique identifier
      const elementId = "clickable-" + index;
      element.setAttribute("data-highlight-id", elementId);

      // Create highlight elements
      const highlight = document.createElement("div");
      highlight.className = "clickable-highlight";
      highlight.setAttribute("data-for", elementId);

      const number = document.createElement("div");
      number.className = "clickable-number";
      number.setAttribute("data-for", elementId);
      number.textContent = index.toString();

      // Add to container
      highlightContainer.appendChild(highlight);
      highlightContainer.appendChild(number);

      // Store reference
      window.highlightedElements.push({
        element,
        highlight,
        number,
      });

      // Observe this element
      window.elementObserver.observe(element);

      // Set position
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      highlight.style.top = rect.top + scrollY + "px";
      highlight.style.left = rect.left + scrollX + "px";
      highlight.style.width = rect.width + "px";
      highlight.style.height = rect.height + "px";

      number.style.top = rect.top + scrollY + "px";
      number.style.left = rect.left + scrollX + "px";
    };

    // Function to find clickable elements - comprehensive version
    window.getClickableElements = function () {
      // Selectors for clickable elements
      const clickableSelectors = [
        "a",
        "button",
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        'input[type="checkbox"]',
        'input[type="radio"]',
        "select",
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="tab"]',
        '[role="menuitem"]',
        '[tabindex]:not([tabindex="-1"])',
        "[onclick]",
        "[data-toggle]",
        ".btn",
        ".button",
        ".nav-item",
        ".clickable",
        // Cookie consent button selectors
        '[aria-label*="consent"]',
        '[aria-label*="cookie"]',
        '[class*="consent"]',
        '[class*="cookie"]',
        '[id*="consent"]',
        '[id*="cookie"]',
        '[data-testid*="cookie"]',
        ".accept-cookies",
        ".reject-cookies",
        ".consent-button",
        ".agree-button",
        "[data-cookieconsent]",
        ".cc-button",
        ".cc-btn",
        ".gdpr-button",
        // Google-specific selectors
        "#L2AGLb",
        "#W0wltc",
        ".tHlp8d",
        "#VDity",
        "#CXQnmb",
        ".VfPpkd-LgbsSe",
        ".VfPpkd-LgbsSe-OWXEXe-k8QpJ",
        ".consent-button-detected",
        // Looking for text in buttons
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
        '[aria-label*="Accept"]',
        '[aria-label*="Agree"]',
        '[aria-label*="Cookie"]',
        // Other specific selectors
        '[data-a-target="consent-banner-accept"]',
        'form[action*="consent"] button',
        'div[aria-modal="true"] button',
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

        // Shadow DOM elements
        const shadowElements = findInShadowRoots(document, clickableSelectors);
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
        sendToNodeJS("Error finding elements: " + e.message);
      }

      // Special handling for Google content buttons
      if (allElements.length === 0) {
        sendToNodeJS("No clickable elements found, trying special selectors");

        const specialSelectors = [
          // Google's cookie consent selectors
          "#L2AGLb",
          "#W0wltc",
          ".tHlp8d",
          "#VDity",
          "#CXQnmb",
          "button.tHlp8d",
          'div[role="dialog"] button',
          "div.QS5gu",
          "div.sy4vM",
          // Try to find any visible buttons
          'button:not([style*="display:none"]):not([style*="display: none"])',
          'div[role="button"]:not([style*="display:none"]):not([style*="display: none"])',
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

      // Find Google consent buttons specifically
      const googleConsentButtons = uniqueElements.filter((el: Element) => {
        return (
          (el as HTMLElement).id === "L2AGLb" ||
          (el as HTMLElement).id === "W0wltc" ||
          ((el as HTMLElement).classList &&
            (el as HTMLElement).classList.contains("tHlp8d")) ||
          (el as HTMLElement).classList.contains("consent-button-detected")
        );
      });

      // If we found Google consent buttons, prioritize them
      if (googleConsentButtons.length > 0) {
        sendToNodeJS(
          `Prioritizing ${googleConsentButtons.length} Google consent buttons`
        );

        // Log detailed information about each consent button
        googleConsentButtons.forEach((button, i) => {
          try {
            const rect = button.getBoundingClientRect();
            const tagName = button.tagName.toLowerCase();
            const id = (button as HTMLElement).id
              ? `id="${(button as HTMLElement).id}"`
              : "";
            const classes = button.className
              ? `class="${button.className}"`
              : "";
            const text = button.textContent?.trim().substring(0, 50) || "";
            const dimensions = `${Math.round(rect.width)}x${Math.round(
              rect.height
            )}`;
            const position = `(${Math.round(rect.left)},${Math.round(
              rect.top
            )})`;

            sendToNodeJS(
              `  Consent button ${
                i + 1
              }: ${tagName} ${id} ${classes} | text: "${text}" | ${dimensions} @ ${position}`
            );
          } catch (e) {
            sendToNodeJS(`  Consent button ${i + 1}: Error getting details`);
          }
        });

        return googleConsentButtons;
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

    // Function to start observing for new elements
    window.startObservingNewElements = function () {
      // Function to update clickable elements when DOM changes
      function refreshClickableElements() {
        const newElements = window.getClickableElements();

        // Filter for elements we haven't processed yet
        const newUnprocessedElements = newElements.filter((element) => {
          return !window.processedElements.has(element);
        });

        if (newUnprocessedElements.length > 0) {
          sendToNodeJS(
            `Found ${newUnprocessedElements.length} new clickable elements`
          );
        }

        // Process each new element
        newUnprocessedElements.forEach((element, i) => {
          window.highlightClickableElement(element, i + 1);
        });

        if (newUnprocessedElements.length > 0) {
          sendToNodeJS(
            `Total highlighted elements: ${window.highlightedElements.length}`
          );
        }
      }

      // Create a mutation observer
      const observer = new MutationObserver(() => {
        refreshClickableElements();
      });

      // Start observing the document
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });

      // Initial scan
      refreshClickableElements();

      sendToNodeJS("Started observing for new elements");
    };

    // Initialize the element detection
    window.processedElements = new Set();
    window.highlightedElements = [];
    window.startObservingNewElements();
  });

  // Wait for elements to be highlighted
  log("Waiting for elements to be highlighted (monitoring DOM changes)...");

  // Wait for some time to let the elements be found and highlighted
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Collect data about the highlighted elements
  log("Collecting data about highlighted elements...");
  const elementData = await page.evaluate(() => {
    function sendToNodeJS(message: string) {
      console.log(`[HIGHLIGHT] ${message}`);
    }

    if (
      !window.highlightedElements ||
      window.highlightedElements.length === 0
    ) {
      sendToNodeJS("No highlighted elements found to process");
      return { elements: [] };
    }

    sendToNodeJS(
      `Processing data for ${window.highlightedElements.length} highlighted elements`
    );

    // Check if we have consent buttons among highlighted elements
    const consentButtons = window.highlightedElements.filter(
      ({ element }) =>
        element.classList.contains("consent-button-detected") ||
        element.id === "L2AGLb" ||
        element.id === "W0wltc" ||
        element.classList.contains("tHlp8d")
    );

    if (consentButtons.length > 0) {
      sendToNodeJS(
        `Found ${consentButtons.length} consent buttons among highlighted elements:`
      );
      consentButtons.forEach(({ element }, i) => {
        const tagName = element.tagName.toLowerCase();
        const id = element.id ? `id="${element.id}"` : "";
        const text = element.textContent?.trim().substring(0, 50) || "";
        sendToNodeJS(`  ${i + 1}. ${tagName} ${id} | "${text}"`);
      });
    }

    // Map the highlighted elements to their data
    const elements = window.highlightedElements.map(({ element }, index) => {
      // Get the element's text content
      const originalText = element.textContent?.trim() || "";

      // Get element's type
      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute("type") || "";

      // Get attributes
      const attributes: Record<string, string> = {};
      Array.from(element.attributes).forEach((attr: Attr) => {
        attributes[attr.name] = attr.value;
      });

      // Get immediate text content (excluding child element text)
      let immediateText = "";
      for (let i = 0; i < element.childNodes.length; i++) {
        const node = element.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
          immediateText += node.textContent || "";
        }
      }
      immediateText = immediateText.trim();

      // Check if element has event listeners (approximation)
      const hasOnClickAttr = element.hasAttribute("onclick");
      const isClickable =
        tagName === "a" ||
        tagName === "button" ||
        (tagName === "input" &&
          ["button", "submit", "reset", "checkbox", "radio"].includes(type)) ||
        element.getAttribute("role") === "button" ||
        window.getComputedStyle(element).cursor === "pointer" ||
        hasOnClickAttr;

      // Generate the selector
      function generateSelector(el: Element): string {
        if (el.id) {
          return `#${el.id}`;
        }

        let path = "";
        let element = el;
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let selector = element.nodeName.toLowerCase();
          if (element.id) {
            selector += `#${element.id}`;
            path = selector + (path ? " > " + path : "");
            break;
          } else {
            let sibling = element.previousElementSibling;
            let index = 1;

            while (sibling) {
              if (sibling.nodeName.toLowerCase() === selector) {
                index++;
              }
              sibling = sibling.previousElementSibling;
            }

            if (index > 1) {
              selector += `:nth-of-type(${index})`;
            }
          }

          path = selector + (path ? " > " + path : "");
          element = element.parentNode as Element;
        }

        return path;
      }

      // Return element data
      return {
        index,
        text: originalText,
        immediateText: immediateText || undefined,
        tagName,
        type: type || undefined,
        id: element.id || undefined,
        className: element.className || undefined,
        href: element instanceof HTMLAnchorElement ? element.href : undefined,
        value: element instanceof HTMLInputElement ? element.value : undefined,
        attributes,
        selector: generateSelector(element),
        isVisible: true,
        isClickable,
      };
    });

    return { elements };
  });

  // Log results in Node.js CLI
  if (elementData.elements.length === 0) {
    log("WARNING: No clickable elements were collected");
  } else {
    log(`Collected data for ${elementData.elements.length} clickable elements`);

    // Log first 3 elements
    if (elementData.elements.length > 0) {
      log("First few elements:");
      console.log(JSON.stringify(elementData.elements.slice(0, 3), null, 2));

      log(`All ${elementData.elements.length} elements:`);
      console.log(JSON.stringify(elementData.elements, null, 2));
    }
  }

  log(
    "Highlight process completed - browser window remains open with highlights"
  );

  // Keep browser open for viewing
  // await browser.close(); // Uncomment to close browser automatically
}

// Run the highlighter
runHighlighter().catch((error) => console.error("Error:", error));
