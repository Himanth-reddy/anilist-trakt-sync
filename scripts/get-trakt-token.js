// import 'dotenv/config'; // Using node --env-file=.env instead
import readline from 'readline';

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
    console.error('Error: TRAKT_CLIENT_ID and TRAKT_CLIENT_SECRET must be set in your .env file.');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n=== Trakt Authentication Helper ===\n');
console.log('1. Visit this URL to authorize the app:');
console.log(`   https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${REDIRECT_URI}\n`);

rl.question('2. Paste the code you received here: ', async (code) => {
    try {
        const response = await fetch('https://api.trakt.tv/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code.trim(),
                client_id: TRAKT_CLIENT_ID,
                client_secret: TRAKT_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to get tokens: ${response.status} ${err}`);
        }

        const data = await response.json();

        console.log('\n✅ Authentication Successful!\n');
        console.log('Add these lines to your .env file:\n');
        console.log(`TRAKT_ACCESS_TOKEN=${data.access_token}`);
        console.log(`TRAKT_REFRESH_TOKEN=${data.refresh_token}`);
        console.log('\n(You can verify the expiration if you want, but these are the ones you need.)\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        rl.close();
    }
});
