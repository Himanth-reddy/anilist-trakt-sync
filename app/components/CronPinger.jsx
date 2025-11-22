'use client';

import { useEffect } from 'react';

export default function CronPinger() {
    useEffect(() => {
        // Ping cron every minute to check if sync is needed
        const interval = setInterval(() => {
            fetch('/api/cron').catch(console.error);
        }, 60000);

        // Initial ping
        fetch('/api/cron').catch(console.error);

        return () => clearInterval(interval);
    }, []);

    return null;
}
