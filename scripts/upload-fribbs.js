import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { refreshFribbsCache } from '../lib/fribbs.js';

// Load .env manually since dotenv is not installed
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      let val = value.trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  });
} else {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

async function run() {
  const data = await refreshFribbsCache();
  const count = Object.keys(data || {}).length;
  console.log(`Fribbs cache refreshed. Count: ${count}`);
}

run().catch(err => {
  console.error('Failed to upload Fribbs cache:', err);
  process.exit(1);
});
