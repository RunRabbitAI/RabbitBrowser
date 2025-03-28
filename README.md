# RabbitBrowser

A powerful browser automation tool for detecting and interacting with elements on web pages. RabbitBrowser is built on top of Puppeteer and provides a simple API for element detection, highlighting, and interaction.

## Features

- 🔍 **Automatic Element Detection**: Detects clickable elements, form inputs, and text blocks
- 🎨 **Visual Highlighting**: Highlights elements in the browser for easy identification
- 📝 **Form Automation**: Fill inputs, select options, click buttons, and submit forms
- 🌐 **CDP Support**: Connect to existing Chrome instances via Chrome DevTools Protocol
- 📊 **Context Extraction**: Extract page context, text, and element data for analysis
- ⏱️ **Async API**: All methods return Promises for better control flow and awaitable responses

```typescript
// All getter methods are async and return Promises
const elements = await browser.getElements();
const textBlocks = await browser.getTextBlocks();
const url = await browser.getCurrentUrl(); 

// Find and filter methods are also async
const buttons = await browser.findElementsByTagName('button');
const loginButtons = await browser.findElementsByText('login');
```

## Installation

```bash
npm install rabbit-browser
```

## Quick Start

```typescript
import { RabbitBrowser } from 'rabbit-browser';

async function example() {
  // Create a new instance
  const browser = new RabbitBrowser();
  
  try {
    // Navigate to a URL
    await browser.go('https://example.com');
    
    // Get all the detected elements
    const { elements, textBlocks, pageContext } = await browser.getCompleteData();
    
    console.log(`Detected ${elements.length} interactive elements`);
    
    // Find and interact with elements
    const loginButtons = await browser.findElementsByText('login');
    const loginButton = loginButtons[0];
    if (loginButton) {
      await browser.clickElement(loginButton);
    }
    
    // Close the browser when done
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## API Reference

### Creating a Browser Instance

```typescript
// Default options
const browser = new RabbitBrowser();

// With custom options
const browser = new RabbitBrowser({
  headless: false,              // Show the browser UI
  defaultViewport: { width: 1280, height: 800 },
  highlightAllText: true,       // Highlight text blocks
  focusOnConsent: false,        // Special focus on consent buttons
  waitTime: 3000,               // Time to wait for elements to appear
  includePageContext: true,     // Include page context in results
});
```

### Navigation and Initialization

```typescript
// Initialize the browser (called automatically by go())
await browser.init();

// Navigate to a URL
await browser.go('https://example.com');

// Connect to an existing Chrome instance via CDP
await browser.connectCDP({
  browserURL: 'http://127.0.0.1:9222'
});
```

### Getting Elements and Data

```typescript
// Get all detected elements
const elements = await browser.getElements();

// Get text blocks
const textBlocks = await browser.getTextBlocks();

// Get page context
const pageContext = await browser.getPageContext();

// Get everything at once
const { elements, textBlocks, pageContext } = await browser.getCompleteData();

// Get element count
const count = await browser.getElementCount();

// Get current URL
const url = await browser.getCurrentUrl();
```

### Finding Elements

```typescript
// Filter elements with a custom function
const buttons = await browser.filterElements(e => e.tagName === 'button');

// Find elements by text content
const loginElements = await browser.findElementsByText('login');

// Find elements by tag name
const divs = await browser.findElementsByTagName('div');
```

### Interacting with Elements

```typescript
// Click an element (by element data or index)
await browser.clickElement(loginButton);
// Or by index
await browser.clickElement(0);

// Fill an input
await browser.fillInput(emailInput, 'user@example.com');

// Submit a form
await browser.submitForm(formElement);

// Select an option in a dropdown
await browser.selectOption(selectElement, 'option-value');

// Take a screenshot
await browser.takeScreenshot('screenshot.png');

// Close the browser
await browser.close();
```

## Advanced Usage Examples

### Working with Forms

```typescript
import { RabbitBrowser } from 'rabbit-browser';

async function fillForm() {
  const browser = new RabbitBrowser({ headless: false });
  
  try {
    await browser.go('https://example.com/form');
    
    // Get all elements
    const elements = await browser.getElements();
    
    // Find form elements
    const nameInputs = await browser.findElementsByText('name');
    const nameInput = nameInputs[0];
    const emailInputs = await browser.findElementsByText('email');
    const emailInput = emailInputs[0];
    const submitButton = elements.find(e => e.type === 'submit');
    
    // Fill form fields
    await browser.fillInput(nameInput, 'John Doe');
    await browser.fillInput(emailInput, 'john@example.com');
    
    // Submit the form
    await browser.clickElement(submitButton);
    
    console.log(`Form submitted. Current URL: ${await browser.getCurrentUrl()}`);
  } finally {
    await browser.close();
  }
}
```

### Connecting to an Existing Chrome Instance

```typescript
import { RabbitBrowser } from 'rabbit-browser';

async function useCDP() {
  const browser = new RabbitBrowser({
    preserveBrowserViewport: true,  // Use the actual browser window size
  });
  
  try {
    // Connect to an existing Chrome instance via CDP
    await browser.connectCDP({
      browserURL: 'http://127.0.0.1:9222',
    });
    
    // Navigate to a page
    await browser.go('https://example.com');
    
    // Get all the data
    const { elements, textBlocks, pageContext } = await browser.getCompleteData();
    
    console.log(`Detected Elements: ${elements.length}`);
    console.log(`Text Blocks: ${textBlocks.length}`);
  } finally {
    // Disconnect from CDP (doesn't close Chrome)
    await browser.close();
  }
}
```

## Browser Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| headless | boolean | true | Run browser in headless mode |
| defaultViewport | object | { width: 1280, height: 800 } | Browser viewport size |
| highlightAllText | boolean | true | Highlight all text blocks |
| focusOnConsent | boolean | false | Focus on detecting consent buttons |
| logDetails | boolean | false | Log detailed operations |
| waitTime | number | 3000 | Time to wait for elements to appear (ms) |
| minElementsRequired | number | 1 | Minimum elements required before early return |
| earlyReturn | boolean | true | Return early if enough elements found |
| includePageContext | boolean | true | Include page context in results |
| includeFormInputs | boolean | true | Include form inputs in results |
| includeTextBlocks | boolean | true | Include text blocks in results |
| preserveBrowserViewport | boolean | false | Use browser's actual viewport size (for CDP) |

## Running Examples

The package includes several examples demonstrating different features:

```bash
# Simple example with element detection
npm run example:simple

# Consent button detection
npm run example:consent

# Using CDP to connect to existing Chrome
npm run example:cdp

# Interactive element example
npm run example:interactive

# Form filling example
npm run example:form
```

## License

MIT 