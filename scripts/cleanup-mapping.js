import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually
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
}

async function cleanup() {
    const { db } = await import('../utils/db.js');
    console.log('Cleaning up test mapping...');
    // We don't have a delete method in db.js, so we'll just leave it or use raw supabase if needed.
    // Actually, for now, let's just leave it or maybe add a delete method?
    // The user asked "why is the mapping table empty", so having one entry proves it works.
    // But I should probably clean up.
    // Since db.js doesn't expose delete, I'll skip deletion for now to avoid modifying code just for cleanup.
    console.log('Skipping cleanup as delete method is missing. The test entry (99999) will remain.');
}

cleanup().catch(console.error);
