import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Sample clickable elements data to simulate what would come from puppeteer
const clickableElements = [
  {
    index: 0,
    text: "Google Search",
    tagName: "input",
    type: "submit",
    id: "searchButton",
    selector: "input#searchButton",
    isVisible: true,
    isClickable: true
  },
  {
    index: 1,
    text: "I'm Feeling Lucky",
    tagName: "input",
    type: "submit",
    id: "luckyButton",
    selector: "input#luckyButton",
    isVisible: true,
    isClickable: true
  }
];

// Save elements data to a JSON file - clearly showing how it should be formatted
try {
  // Create full path to the output file
  const outputPath = path.resolve(process.cwd(), "clickable-elements.json");
  
  // Format the data with indentation for readability
  const jsonData = JSON.stringify(clickableElements, null, 2);
  
  // Write the file
  fs.writeFileSync(outputPath, jsonData);
  console.log(`Successfully saved ${clickableElements.length} elements to:`, outputPath);
  
  // Read it back to verify
  const readData = fs.readFileSync(outputPath, 'utf8');
  const parsed = JSON.parse(readData);
  console.log(`Verified: Read back ${parsed.length} elements from file`);
} catch (error) {
  console.error("Error:", error);
} 