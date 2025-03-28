// Simple script to check if the JSON file exists and its contents
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Possible locations to check
const possibleLocations = [
  './clickable-elements.json',
  path.resolve(process.cwd(), 'clickable-elements.json'),
  path.join(__dirname, 'clickable-elements.json'),
  '/tmp/clickable-elements.json'
];

// Check each location
possibleLocations.forEach(location => {
  try {
    if (fs.existsSync(location)) {
      const stats = fs.statSync(location);
      console.log(`✅ File exists at ${location} (size: ${stats.size} bytes)`);
      
      // Read file contents if it exists
      if (stats.size > 0) {
        const data = fs.readFileSync(location, 'utf8');
        try {
          const parsedData = JSON.parse(data);
          console.log(`   File contains valid JSON with ${Object.keys(parsedData).length} keys`);
          if (Array.isArray(parsedData)) {
            console.log(`   Array with ${parsedData.length} elements`);
          }
        } catch (e) {
          console.log(`   File does not contain valid JSON: ${e.message}`);
        }
      } else {
        console.log('   File is empty');
      }
    } else {
      console.log(`❌ File does not exist at ${location}`);
    }
  } catch (error) {
    console.error(`Error checking ${location}:`, error.message);
  }
});

// Try creating JSON file directly
try {
  const testData = { test: "Created from check-json.js", timestamp: new Date().toISOString() };
  fs.writeFileSync('./new-clickable-elements.json', JSON.stringify(testData, null, 2));
  console.log('Successfully created new-clickable-elements.json');
} catch (error) {
  console.error('Failed to create new file:', error.message);
} 