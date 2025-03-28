"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeElementDetector = initializeElementDetector;
/**
 * Injects and initializes the element detector in the page
 */
async function initializeElementDetector(page) {
    // Inject the element detector script
    await page.evaluate(() => {
        // Logger function to communicate with Node.js
        function sendToNodeJS(message) {
            console.log(`[HIGHLIGHT] ${message}`);
        }
        // Helper to get element details
        function getElementDetails(element) {
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
            const consentButtonDetails = [];
            // Try to find buttons by their known IDs
            for (const id of commonButtonIds) {
                const button = document.getElementById(id);
                if (button) {
                    // Only add buttons that are actually clickable elements
                    if (button.tagName === "BUTTON" ||
                        button.tagName === "A" ||
                        button.getAttribute("role") === "button") {
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
                    sendToNodeJS(`Found consent dialog container: ${getElementDetails(container)}`);
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
            if ((!window).jQuery && !Element.prototype.matches) {
                document.querySelector = (function (originalQuerySelector) {
                    return function (selector) {
                        try {
                            if (selector.includes(":contains(")) {
                                const match = selector.match(/:contains\(["'](.*)["']\)/);
                                if (match && match[1]) {
                                    const text = match[1];
                                    const baseSelector = selector.replace(/:contains\(["'].*["']\)/, "");
                                    const elements = Array.from(document.querySelectorAll(baseSelector || "*"));
                                    return elements.find((el) => el.textContent &&
                                        el.textContent.toLowerCase().includes(text.toLowerCase()));
                                }
                            }
                            return originalQuerySelector.call(document, selector);
                        }
                        catch (e) {
                            return originalQuerySelector.call(document, selector);
                        }
                    };
                })(document.querySelector);
            }
            // Try to find buttons by text content
            for (const selector of textSelectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element &&
                        !element.classList.contains("consent-button-detected")) {
                        element.classList.add("consent-button-detected");
                        foundButtons++;
                        consentButtonDetails.push(getElementDetails(element));
                    }
                }
                catch (e) {
                    // Skip invalid selectors
                }
            }
            return { count: foundButtons, details: consentButtonDetails };
        }
        // Dynamic detection of consent dialogs and buttons
        function handleConsentButtons() {
            let foundButtons = 0;
            const consentButtonDetails = [];
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
                const allElements = document.querySelectorAll("button, a, [role='button'], input[type='button'], input[type='submit']");
                Array.from(allElements).forEach((element) => {
                    const textContent = element.textContent?.toLowerCase() || "";
                    // Check if element text contains any consent pattern
                    const hasConsentText = consentTextPatterns.some((pattern) => textContent.includes(pattern.toLowerCase()));
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
                const potentialContainers = [];
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
                    const buttons = container.querySelectorAll("button, a, [role='button'], input[type='button'], input[type='submit']");
                    if (buttons.length > 0) {
                        buttons.forEach((button) => {
                            if (isClickableElement(button) &&
                                !button.classList.contains("consent-button-detected")) {
                                foundButtons++;
                                button.classList.add("consent-button-detected");
                                consentButtonDetails.push(getElementDetails(button));
                            }
                        });
                        // Log container but don't highlight it
                        sendToNodeJS(`Found consent dialog container: ${getElementDetails(container)}`);
                    }
                });
            }
            // Check if an element is actually clickable (not a container)
            function isClickableElement(element) {
                const tagName = element.tagName.toLowerCase();
                const rect = element.getBoundingClientRect();
                // Always consider actual buttons and links clickable
                if (tagName === "button" ||
                    tagName === "a" ||
                    element.getAttribute("role") === "button") {
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
                    }
                    catch (e) {
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
                    .querySelectorAll('[aria-label*="cookie" i], [aria-label*="consent" i], [aria-label*="privacy" i]')
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
            const allConsentButtons = document.querySelectorAll(".consent-button-detected");
            // Filter out any elements that shouldn't be highlighted
            const buttonsToHighlight = [];
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
                if ((tagName === "div" || tagName === "span") &&
                    button.childNodes.length === 1 &&
                    button.childNodes[0].nodeType === Node.TEXT_NODE) {
                    // Check if parent is a button or has button role
                    const parent = button.parentElement;
                    if (parent &&
                        (parent.tagName.toLowerCase() === "button" ||
                            parent.getAttribute("role") === "button")) {
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
            if (finalButtonsToHighlight.length > 0 &&
                window.highlightClickableElement) {
                sendToNodeJS(`Highlighting ${finalButtonsToHighlight.length} consent buttons manually (after filtering out ${allConsentButtons.length - finalButtonsToHighlight.length} duplicates/invalid elements)`);
                finalButtonsToHighlight.forEach((button, i) => {
                    window.highlightClickableElement(button, i + 1);
                });
            }
        }
        // Define getClickableElements function
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
                // Dialog and consent-specific selectors (more generic)
                ".consent-button-detected", // Our own marker class
                "[class*='consent']",
                "[class*='cookie']",
                "[class*='privacy']",
                "[class*='gdpr']",
                "[class*='banner']",
                "[class*='notice']",
                "div[role='dialog'] button",
                "div[aria-modal='true'] button",
            ];
            // Add :contains pseudo-selector implementation if it doesn't exist
            if ((!window).jQuery && !Element.prototype.matches) {
                const originalQuerySelector = document.querySelector;
                document.querySelector = function (selector) {
                    try {
                        if (selector.includes(":contains(")) {
                            const match = selector.match(/:contains\(["'](.*)["']\)/);
                            if (match && match[1]) {
                                const text = match[1];
                                const baseSelector = selector.replace(/:contains\(["'].*["']\)/, "");
                                const elements = Array.from(document.querySelectorAll(baseSelector || "*"));
                                return elements.find((el) => el.textContent &&
                                    el.textContent.toLowerCase().includes(text.toLowerCase()));
                            }
                        }
                        return originalQuerySelector.call(document, selector);
                    }
                    catch (e) {
                        return originalQuerySelector.call(document, selector);
                    }
                };
            }
            // Function to find elements in document and all iframes
            function getAllElementsIncludingIframes(doc, selectors) {
                // Get elements from the document
                const elements = [];
                for (const selector of selectors) {
                    try {
                        const found = Array.from(doc.querySelectorAll(selector));
                        elements.push(...found);
                    }
                    catch (e) {
                        // Skip invalid selectors
                    }
                }
                // Get elements from all iframes
                try {
                    const iframes = Array.from(doc.querySelectorAll("iframe"));
                    for (const iframe of iframes) {
                        try {
                            const iframeDoc = iframe.contentDocument ||
                                iframe.contentWindow?.document;
                            if (iframeDoc) {
                                const iframeElements = getAllElementsIncludingIframes(iframeDoc, selectors);
                                elements.push(...iframeElements);
                            }
                        }
                        catch (e) {
                            // Cross-origin iframe, can't access
                        }
                    }
                }
                catch (e) {
                    // Skip if iframe handling fails
                }
                return elements;
            }
            // Function to find clickable elements in Shadow DOM
            function findInShadowRoots(root, selectors) {
                const elements = [];
                try {
                    // Get all elements with shadow roots
                    const allElements = root.querySelectorAll("*");
                    for (const el of allElements) {
                        // Check if element has a shadow root
                        if (el.shadowRoot) {
                            // Search within the shadow root
                            for (const selector of selectors) {
                                try {
                                    const shadowElements = Array.from(el.shadowRoot.querySelectorAll(selector));
                                    elements.push(...shadowElements);
                                }
                                catch (e) {
                                    // Skip invalid selectors
                                }
                            }
                            // Recursively check for nested shadow roots
                            const nestedElements = findInShadowRoots(el.shadowRoot, selectors);
                            elements.push(...nestedElements);
                        }
                    }
                }
                catch (e) {
                    // Skip if shadow DOM handling fails
                }
                return elements;
            }
            // Find all potentially clickable elements, including in iframes and shadow DOM
            let allElements = [];
            try {
                // Regular DOM elements
                const domElements = getAllElementsIncludingIframes(document, clickableSelectors);
                allElements.push(...domElements);
                // Shadow DOM elements - Note: Using document.body instead of document to fix type error
                const shadowElements = findInShadowRoots(document.body, clickableSelectors);
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
                        }
                        catch (e) {
                            // Skip problematic elements
                        }
                    });
                }
                catch (e) {
                    // Skip if there's an error with style checking
                }
            }
            catch (e) {
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
                            sendToNodeJS(`Found ${elements.length} elements with special selector: ${selector}`);
                            allElements.push(...Array.from(elements));
                        }
                    }
                    catch (e) {
                        // Skip invalid selectors
                    }
                }
            }
            // Remove duplicates
            const uniqueElements = Array.from(new Set(allElements));
            // Find consent buttons dynamically - only include actual clickable elements
            const consentButtons = uniqueElements.filter((el) => {
                try {
                    // Skip zero-sized elements
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) {
                        return false;
                    }
                    // Skip elements that are likely to be just text containers inside buttons
                    const tagName = el.tagName.toLowerCase();
                    if ((tagName === "div" || tagName === "span") &&
                        el.childNodes.length === 1 &&
                        el.childNodes[0].nodeType === Node.TEXT_NODE) {
                        // Check if parent is a button or has button role
                        const parent = el.parentElement;
                        if (parent &&
                            (parent.tagName.toLowerCase() === "button" ||
                                parent.getAttribute("role") === "button")) {
                            return false; // This is just a text node inside a button
                        }
                    }
                    // First check if it's marked as a consent button by our detector
                    if (el.classList?.contains("consent-button-detected")) {
                        return true;
                    }
                    // Then check if it might be a consent button based on common patterns
                    const elementText = el.textContent?.toLowerCase() || "";
                    const elementId = el.id?.toLowerCase() || "";
                    const elementClasses = Array.from(el.classList || [])
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
                    const hasConsentActionText = consentActionPatterns.some((pattern) => elementText.includes(pattern));
                    // Check if this is a cookie settings link rather than a main consent button
                    const isLikelySettingsLink = elementText.includes("settings") ||
                        elementText.includes("preferences") ||
                        elementText.includes("mehr") ||
                        elementText.includes("options") ||
                        elementText.includes("einstellungen") ||
                        elementText.includes("personalisierung") ||
                        // No action verb but just "cookies" is likely just a link to cookie policy
                        (elementText.includes("cookie") &&
                            !consentActionPatterns.some((pattern) => elementText.includes(pattern)));
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
                    ].some((pattern) => elementClasses.includes(pattern) || elementId.includes(pattern));
                    // Only select actionable buttons, not generic "cookie" mentions
                    const isPotentialConsentButton = hasConsentActionText ||
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
                            const isReasonableSize = rect.width < 400 &&
                                rect.height < 100 &&
                                rect.width > 40 &&
                                rect.height > 15;
                            const hasPointerCursor = window.getComputedStyle(el).cursor === "pointer";
                            // Only accept divs that are appropriately sized and look clickable
                            return ((hasConsentClass || hasConsentActionText) &&
                                isReasonableSize &&
                                hasPointerCursor);
                        }
                    }
                }
                catch (e) {
                    // If any error occurs, skip this element
                    return false;
                }
                return false;
            });
            // If we found consent buttons, prioritize them
            if (consentButtons.length > 0) {
                sendToNodeJS(`Prioritizing ${consentButtons.length} consent buttons`);
                // Log detailed information about each consent button
                consentButtons.forEach((button, i) => {
                    try {
                        const rect = button.getBoundingClientRect();
                        const tagName = button.tagName.toLowerCase();
                        const id = button.id
                            ? `id="${button.id}"`
                            : "";
                        const classes = button.className
                            ? `class="${button.className}"`
                            : "";
                        const text = button.textContent?.trim().substring(0, 50) || "";
                        const dimensions = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
                        const position = `(${Math.round(rect.left)},${Math.round(rect.top)})`;
                        sendToNodeJS(`  Consent button ${i + 1}: ${tagName} ${id} ${classes} | text: "${text}" | ${dimensions} @ ${position}`);
                    }
                    catch (e) {
                        sendToNodeJS(`  Consent button ${i + 1}: Error getting details`);
                    }
                });
                return consentButtons;
            }
            // Filter out invisible elements and nested elements
            return uniqueElements.filter((element) => {
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
                }
                catch (e) {
                    return false; // Skip problematic elements
                }
            });
        };
    });
}
//# sourceMappingURL=elementDetector.js.map