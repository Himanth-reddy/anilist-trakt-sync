import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    console.log('Loaded Env Keys:', Object.keys(process.env).filter(k => k.startsWith('SUPABASE')));
} else {
    console.error('❌ .env file not found at:', envPath);
}

async function verify() {
    const { db } = await import('../utils/db.js');
    console.log('Starting DB Verification...');

    // 1. Config
    console.log('\n--- Testing Config ---');
    const testKey = 'test:config:key';
    const testValue = { foo: 'bar', timestamp: Date.now() };
    await db.setConfig(testKey, testValue);
    const retrievedValue = await db.getConfig(testKey);
    console.log('Set Value:', testValue);
    console.log('Got Value:', retrievedValue);
    if (JSON.stringify(testValue) === JSON.stringify(retrievedValue)) {
        console.log('✅ Config Test Passed');
    } else {
        console.error('❌ Config Test Failed');
    }

    // 2. Logs
    console.log('\n--- Testing Logs ---');
    const logMsg = `Test log entry ${Date.now()}`;
    await db.saveLog(logMsg, 'info');
    const logs = await db.getLogs(5);
    const foundLog = logs.find(l => l.message === logMsg);
    if (foundLog) {
        console.log('✅ Log Test Passed');
    } else {
        console.error('❌ Log Test Failed');
        console.log('Recent logs:', logs);
    }

    // 3. Mappings
    console.log('\n--- Testing Mappings ---');
    const anilistId = '999999'; // unlikely ID
    const mapping = {
        traktId: 12345,
        tmdbId: 67890,
        imdbId: 'tt1234567',
        tvdbId: 54321,
        type: 'show'
    };
    await db.saveMapping(anilistId, mapping, true);
    const retrievedMapping = await db.getMapping(anilistId);
    console.log('Set Mapping:', mapping);
    console.log('Got Mapping:', retrievedMapping);

    if (retrievedMapping && retrievedMapping.traktId === mapping.traktId) {
        console.log('✅ Mapping Test Passed');
    } else {
        console.error('❌ Mapping Test Failed');
    }

    const allMappings = await db.getAllMappings();
    const foundInAll = allMappings.manual.find(m => m.anilistId == anilistId);
    if (foundInAll) {
        console.log('✅ GetAllMappings Test Passed');
    } else {
        console.error('❌ GetAllMappings Test Failed');
    }

    console.log('\nVerification Complete.');
}

verify().catch(console.error);
