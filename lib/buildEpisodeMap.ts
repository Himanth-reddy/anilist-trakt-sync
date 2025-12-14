import fetch from "node-fetch";
import { supabase } from "../utils/supabase";

export async function buildEpisodeMap(traktId: number) {
    const res = await fetch(
        `https://api.trakt.tv/shows/${traktId}/seasons?extended=episodes`,
        {
            headers: {
                "Content-Type": "application/json",
                "trakt-api-key": process.env.TRAKT_CLIENT_ID!,
                "trakt-api-version": "2",
                "User-Agent": "anilist-trakt-sync/1.0"
            }
        }
    );

    if (!res.ok) {
        throw new Error(`Failed to fetch seasons for Trakt ${traktId}`);
    }

    const seasons = await res.json();

    const rows: {
        trakt_id: number;
        abs: number;
        season: number;
        episode: number;
    }[] = [];

    for (const season of seasons) {
        // ❌ Skip specials
        if (season.number === 0) continue;

        for (const ep of season.episodes ?? []) {
            // ❌ Skip episodes without absolute numbering
            if (ep.number_abs == null) continue;

            rows.push({
                trakt_id: traktId,
                abs: ep.number_abs,
                season: season.number,
                episode: ep.number
            });
        }
    }

    if (rows.length === 0) {
        throw new Error(`No valid episode mappings for Trakt ${traktId}`);
    }

    // Atomic replace
    await supabase.from("episode_map").delete().eq("trakt_id", traktId);
    await supabase.from("episode_map").insert(rows);
}
