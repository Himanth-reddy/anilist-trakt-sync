
import { kv } from './utils/kv.js';

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, path, method = 'GET', body = null) {
    console.log(`\nTesting ${name} (${path})...`);
    try {
        const options = { method };
        if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        const res = await fetch(`${BASE_URL}${path}`, options);
        const status = res.status;
        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        }

        console.log(`Status: ${status}`);
        if (status >= 200 && status < 300) {
            console.log('✅ Success');
            // console.log('Response:', data);
        } else {
            console.log('❌ Failed');
            console.log('Response:', data);
        }
        return { status, data };
    } catch (err) {
        console.log('❌ Error:', err.message);
        return { error: err.message };
    }
}

async function runVerification() {
    console.log('Starting System Verification...');

    // 1. Test Fribbs Refresh
    await testEndpoint('Fribbs Refresh', '/api/refresh-fribbs');

    // 2. Test Mappings
    await testEndpoint('Mappings', '/api/mappings');

    // 3. Test Manual Override
    await testEndpoint('Manual Override', '/api/manual-map', 'POST', {
        anilistId: '99999',
        traktId: '88888',
        tmdbId: '77777'
    });

    // 4. Test Logs
    await testEndpoint('Logs', '/api/logs');

    // 5. Test Single Sync (One Piece - ID 21)
    // Note: This might fail if credentials aren't set, but we want to see the response
    await testEndpoint('Single Sync (One Piece)', '/api/sync?anilistId=21');

    // 6. Test Full Sync
    await testEndpoint('Full Sync', '/api/full-sync');

    console.log('\nVerification Complete.');
}

runVerification();
