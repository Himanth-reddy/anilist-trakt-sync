import { db } from './db.js';

export async function log(msg, level = 'info') {
    console.log(msg); // Keep console logging for runtime logs

    try {
        await db.saveLog(msg, level);
    } catch (err) {
        console.error('Failed to write to DB logs:', err);
    }
}
