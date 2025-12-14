import { buildEpisodeMap } from "./buildEpisodeMap";
import { syncEpisode } from "./syncEpisode";
import { supabase } from "../utils/supabase";

export async function syncShow(
    anilistId: number,
    traktId: number,
    currentAbs: number
) {
    const { data: progress } = await supabase
    .from("sync_progress")
    .select("last_abs")
    .eq("anilist_id", anilistId)
    .single();

    const lastAbs = progress?.last_abs ?? 0;

    // Ensure episode map exists
    await buildEpisodeMap(traktId);

    for (let abs = lastAbs + 1; abs <= currentAbs; abs++) {
        await syncEpisode(traktId, abs);
    }

    await supabase.from("sync_progress").upsert({
        anilist_id: anilistId,
        last_abs: currentAbs
    });
}
