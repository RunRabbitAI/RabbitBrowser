# RabbitBrowser API

RabbitBrowser provides a simple, intuitive API for detecting and highlighting interactive elements (like buttons, links, and forms) on web pages. It's particularly useful for detecting cookie consent dialogs and other interactive elements.

## Quick Start

```typescript
import { rabbitBrowser } from '../RabbitBrowser';

// Navigate to a page
await rabbitBrowser.go('https://example.com');

// Get all detected elements
const elements = rabbitBrowser.getElements();
console.log(`Found ${elements.length} elements`);

// Find elements containing specific text
const consentButtons = rabbitBrowser.findElementsByText('accept');

// Find elements by tag
const buttons = rabbitBrowser.findElementsByTagName('button');

// Close the browser when done
await rabbitBrowser.close();
```

## API Reference

### Creating a Browser Instance

You can use the pre-configured instance or create your own:

```typescript
// Use the pre-configured instance
import { rabbitBrowser } from '../RabbitBrowser'; 

// Or create your own with custom options
import { RabbitBrowser } from '../RabbitBrowser';

const browser = new RabbitBrowser({
  focusOnConsent: true,    // Focus on consent-related elements
  logDetails: true,        // Enable detailed logging
  waitTime: 3000,          // Maximum wait time in ms
  earlyReturn: true,       // Return as soon as elements are found
  minElementsRequired: 1   // Minimum elements needed before early return
});
```

### Navigation

```typescript
// Basic navigation
await rabbitBrowser.go('https://example.com');

// With options for this specific navigation
await rabbitBrowser.go('https://example.com', {
  focusOnConsent: true,  // Override the default setting for this navigation
  waitTime: 5000         // Wait longer for this specific page
});
```

### Getting Elements

```typescript
// Get all detected elements
const elements = rabbitBrowser.getElements();

// Get count
const count = rabbitBrowser.getElementCount();

// Filter elements using a custom predicate
const visibleButtons = rabbitBrowser.filterElements(el => 
  el.tagName === 'button' && el.isVisible
);

// Find by text (case-insensitive)
const acceptButtons = rabbitBrowser.findElementsByText('accept');

// Find by tag name
const links = rabbitBrowser.findElementsByTagName('a');
```

### Element Properties

Each element has these properties:

```typescript
{
  index: number;         // Position in the list
  text: string;          // Text content
  immediateText?: string; // Direct text (excluding child elements)
  tagName: string;       // HTML tag (button, a, div, etc.)
  type?: string;         // For inputs (button, checkbox, etc.)
  id?: string;           // Element ID
  className?: string;    // CSS classes
  href?: string;         // For links
  value?: string;        // For form elements
  attributes: Record<string, string>; // All attributes
  selector: string;      // CSS selector to target this element
  isVisible: boolean;    // Is the element visible
  isClickable: boolean;  // Is the element clickable
}
```

### Other Utilities

```typescript
// Take a screenshot
await rabbitBrowser.takeScreenshot('screenshot.png');

// Get the current URL
const url = rabbitBrowser.getCurrentUrl();

// Check if initialized
const isReady = rabbitBrowser.isInitialized();

// Close the browser
await rabbitBrowser.close();
```

## Examples

See the example files:
- `simple-example.ts` - Basic usage
- `consent-finder.ts` - Finding consent dialogs on multiple sites

## Focus on Consent Elements

When `focusOnConsent` is enabled, RabbitBrowser will:

1. Prioritize elements with consent-related text like "accept", "agree", "cookie", etc.
2. Look for elements within cookie consent dialogs and banners
3. Detect common consent implementations across different websites

This is useful for automating cookie consent handling or analyzing how different sites implement their consent mechanisms. 