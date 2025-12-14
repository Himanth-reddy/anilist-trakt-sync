import fetch from "node-fetch";
import { resolveEpisode } from "./resolveEpisode";

export async function syncEpisode(
    traktId: number,
    abs: number
) {
    const resolved = await resolveEpisode(traktId, abs);

    if (!resolved) {
        console.log(`SKIP abs ${abs} — no Trakt mapping`);
        return;
    }

    const payload = {
        show: { ids: { trakt: traktId } },
        episode: {
            season: resolved.season,
            number: resolved.episode
        }
    };

    const res = await fetch(
        "https://api.trakt.tv/sync/history",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
                "trakt-api-version": "2",
                "User-Agent": "anilist-trakt-sync/1.0"
            },
            body: JSON.stringify({ episodes: [payload] })
        }
    );

    if (!res.ok) {
        throw new Error(`Trakt sync failed for ${traktId} abs ${abs}`);
    }
}
