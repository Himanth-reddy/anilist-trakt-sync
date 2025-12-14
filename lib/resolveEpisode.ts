import { supabase } from "../utils/supabase";

export async function resolveEpisode(
    traktId: number,
    abs: number
): Promise<{ season: number; episode: number } | null> {

    // 1️⃣ Manual override (always wins)
    const { data: override } = await supabase
    .from("episode_override")
    .select("season, episode")
    .eq("trakt_id", traktId)
    .eq("abs", abs)
    .single();

    if (override) return override;

    // 2️⃣ Canonical map
    const { data: mapped } = await supabase
    .from("episode_map")
    .select("season, episode")
    .eq("trakt_id", traktId)
    .eq("abs", abs)
    .single();

    if (mapped) return mapped;

    // 3️⃣ HARD STOP
    return null;
}
