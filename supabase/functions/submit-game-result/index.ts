
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Use POST." }, 405);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !key) {
      console.error("Required Supabase environment variables are missing.");
      return respond({ error: "Server configuration error." }, 500);
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();

    if (body.action === "register") {
      const firstName =
        typeof body.first_name === "string" ? body.first_name.trim() : "";
      const lastName =
        typeof body.last_name === "string" ? body.last_name.trim() : "";
      const email =
        typeof body.work_email === "string"
          ? body.work_email.trim().toLowerCase()
          : "";

      if (
        !firstName ||
        !lastName ||
        firstName.length > 80 ||
        lastName.length > 80 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254
      ) {
        return respond({ error: "Please provide valid registration details." }, 400);
      }

      const { data: existing, error: lookupError } = await supabase
        .from("players")
        .select("id, last_played_at")
        .eq("work_email", email)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        return respond({
          player_id: existing.id,
          last_played_at: existing.last_played_at,
        });
      }

      const { data: player, error: insertError } = await supabase
        .from("players")
        .insert({
          first_name: firstName,
          last_name: lastName,
          work_email: email,
        })
        .select("id, last_played_at")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return respond({
            error: "This email may already be registered. Please try again.",
          }, 409);
        }
        throw insertError;
      }

      return respond({
        player_id: player.id,
        last_played_at: player.last_played_at,
      }, 201);
    }

    if (body.action === "submit_result") {
      const playerId = body.player_id;
      const score = body.score;
      const objectsRemoved = body.objects_removed;
      const ticketsRemaining = body.tickets_remaining;

      if (
        typeof playerId !== "string" ||
        !Number.isInteger(score) ||
        score < 0 ||
        !Number.isInteger(objectsRemoved) ||
        objectsRemoved < 0 ||
        objectsRemoved > 5 ||
        !Number.isInteger(ticketsRemaining) ||
        ticketsRemaining < 0 ||
        ticketsRemaining > 10
      ) {
        return respond({ error: "Invalid game result." }, 400);
      }

      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, last_played_at")
        .eq("id", playerId)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!player) return respond({ error: "Player not found." }, 404);

      if (player.last_played_at) {
        const lastPlayed = new Date(player.last_played_at).getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        if (Date.now() - lastPlayed < oneDay) {
          return respond({
            error: "This player has already played within the last 24 hours.",
          }, 429);
        }
      }

      const { error: resultError } = await supabase
        .from("game_results")
        .insert({
          player_id: playerId,
          score,
          objects_removed: objectsRemoved,
          tickets_remaining: ticketsRemaining,
        });

      if (resultError) throw resultError;

      const { error: updateError } = await supabase
        .from("players")
        .update({ last_played_at: new Date().toISOString() })
        .eq("id", playerId);

      if (updateError) throw updateError;

      return respond({ success: true });
    }

    // ===================================
    // GET LEADERBOARD
    // ===================================

    if (body.action === "leaderboard") {

      const { data: results, error: resultsError } =
        await supabase
          .from("game_results")
          .select("player_id, score, completed_at")
          .order("score", { ascending: false })
          .order("completed_at", { ascending: true });

      if (resultsError) throw resultsError;

      const bestScores = new Map();

      for (const result of results || []) {

        if (!bestScores.has(result.player_id)) {
          bestScores.set(result.player_id, result.score);
        }

      }

      const playerIds = Array.from(bestScores.keys());

      if (playerIds.length === 0) {
        return respond({
          success: true,
          leaderboard: []
        });
      }

      const { data: players, error: playersError } =
        await supabase
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds);

      if (playersError) throw playersError;

      const playerMap = new Map();

      for (const player of players || []) {
        playerMap.set(player.id, player);
      }

      const leaderboard = [];

      for (const playerId of playerIds) {

        const player = playerMap.get(playerId);

        if (!player) continue;

        leaderboard.push({
          first_name: player.first_name,
          last_name: player.last_name,
          tickets_earned: bestScores.get(playerId)
        });

      }

      return respond({
        success: true,
        leaderboard
      });

    }

    return respond({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("Game submission error:", error);
    return respond({ error: "Unable to process this request." }, 500);
  }
});
