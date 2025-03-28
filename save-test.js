import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data to save
const testData = {
  test: "This is a test",
  timestamp: new Date().toISOString()
};

// Try multiple save locations
const saveLocations = [
  // Current directory
  './clickable-elements.json',
  // Absolute path in current directory
  path.resolve(process.cwd(), 'clickable-elements.json'),
  // User's home directory
  path.join(os.homedir(), 'clickable-elements.json'),
  // Temp directory
  path.join(os.tmpdir(), 'clickable-elements.json')
];

console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Try each location
saveLocations.forEach(location => {
  try {
    fs.writeFileSync(location, JSON.stringify(testData, null, 2));
    console.log(`✅ Successfully saved to: ${location}`);
  } catch (error) {
    console.error(`❌ Failed to save to ${location}:`, error.message);
  }
});

console.log('Done testing file saves'); 