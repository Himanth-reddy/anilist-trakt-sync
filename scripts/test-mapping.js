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

async function test() {
    const { db } = await import('../utils/db.js');
    console.log('Testing Mapping Storage...');
    const testId = 99999;
    const mapping = {
        traktId: 88888,
        tmdbId: 77777,
        imdbId: 'ttTest',
        tvdbId: 66666,
        type: 'show'
    };

    console.log('Saving mapping...');
    await db.saveMapping(testId, mapping, true);

    console.log('Retrieving mapping...');
    const saved = await db.getMapping(testId);
    console.log('Saved:', saved);

    console.log('Checking getAllMappings...');
    const all = await db.getAllMappings();
    const found = all.manual.find(m => m.anilistId === testId);
    console.log('Found in all:', found);

    if (saved && found) {
        console.log('✅ Mapping storage working correctly.');
    } else {
        console.error('❌ Mapping storage failed.');
    }
}

test().catch(console.error);
