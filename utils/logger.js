import { kv } from './kv.js';

export async function log(msg) {
    console.log(msg); // Keep console logging for Vercel runtime logs

    try {
        const raw = await kv.get('logs');
        let logs = [];
        if (!raw) logs = [];
        else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                logs = Array.isArray(parsed) ? parsed : [];
            } catch { logs = []; }
        } else if (Array.isArray(raw)) {
            logs = raw;
        } else {
            logs = [];
        }

        logs.push(`[${new Date().toISOString()}] ${msg}`);

        // Keep only last 200 logs
        if (logs.length > 200) {
            logs = logs.slice(-200);
        }

        await kv.set('logs', JSON.stringify(logs));
    } catch (err) {
        console.error('Failed to write to KV logs:', err);
    }
}
