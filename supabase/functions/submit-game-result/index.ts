import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "kvelps74@gmail.com";
const TIME_ZONE = "America/Chicago";

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Converts a local date and time in a named timezone to UTC.
function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
): Date {
  const target = Date.UTC(year, month - 1, day, hour);

  let guess = target;

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));

    const values: Record<string, number> = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = Number(part.value);
      }
    }

    const represented = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
    );

    guess += target - represented;
  }

  return new Date(guess);
}

function getDayBounds(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error("Invalid report date.");
  }

  const [year, month, day] = dateString.split("-").map(Number);

  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    throw new Error("Invalid report date.");
  }

  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    start: zonedDateToUtc(year, month, day, 0, TIME_ZONE).toISOString(),
    end: zonedDateToUtc(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
      0,
      TIME_ZONE,
    ).toISOString(),
  };
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!url || !serviceKey || !anonKey) {
      console.error("Required Supabase environment variables are missing.");
      return respond({ error: "Server configuration error." }, 500);
    }

    const body = await req.json();

    // ===================================
    // ADMIN DAILY REPORT
    // ===================================

    if (body.action === "admin_report") {
      const authorization = req.headers.get("Authorization");

      if (!authorization?.startsWith("Bearer ")) {
        return respond({ error: "Authentication required." }, 401);
      }

      const token = authorization.substring(7);

      // Verify the actual signed-in Supabase user.
      const authClient = createClient(url, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: authData, error: authError } =
        await authClient.auth.getUser(token);

      if (authError || !authData.user) {
        return respond({ error: "Invalid or expired login." }, 401);
      }

      if (
        authData.user.email?.toLowerCase() !== ADMIN_EMAIL
      ) {
        return respond({ error: "Admin access denied." }, 403);
      }

      const reportDate =
        typeof body.date === "string" ? body.date : "";

      let bounds;

      try {
        bounds = getDayBounds(reportDate);
      } catch {
        return respond({ error: "Please provide a valid report date." }, 400);
      }

      const supabase = createClient(url, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: results, error: resultsError } = await supabase
        .from("game_results")
        .select("player_id, score, completed_at")
        .gte("completed_at", bounds.start)
        .lt("completed_at", bounds.end)
        .order("completed_at", { ascending: true });

      if (resultsError) throw resultsError;

      const playerIds = [
        ...new Set((results || []).map(result => result.player_id)),
      ];

      let playerMap = new Map();

      if (playerIds.length > 0) {
        const { data: players, error: playersError } = await supabase
          .from("players")
          .select("id, first_name, last_name, work_email")
          .in("id", playerIds);

        if (playersError) throw playersError;

        playerMap = new Map(
          (players || []).map(player => [player.id, player]),
        );
      }

      const report = (results || []).map(result => {
        const player = playerMap.get(result.player_id);

        return {
          first_name: player?.first_name || "",
          last_name: player?.last_name || "",
          work_email: player?.work_email || "",
          tickets_earned: Number(result.score || 0),
          completed_at: result.completed_at,
        };
      });

      const totalTickets = report.reduce(
        (total, result) => total + result.tickets_earned,
        0,
      );

      return respond({
        success: true,
        date: reportDate,
        total_plays: report.length,
        total_tickets: totalTickets,
        results: report,
      });
    }

    // ===================================
    // SERVICE ROLE CLIENT FOR GAME ACTIONS
    // ===================================

    const supabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // ===================================
    // REGISTER PLAYER
    // ===================================

    if (body.action === "register") {
      const firstName =
        typeof body.first_name === "string"
          ? body.first_name.trim()
          : "";

      const lastName =
        typeof body.last_name === "string"
          ? body.last_name.trim()
          : "";

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
        return respond({
          error: "Please provide valid registration details.",
        }, 400);
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

    // ===================================
    // SUBMIT GAME RESULT
    // ===================================

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

      if (!player) {
        return respond({ error: "Player not found." }, 404);
      }

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
      const { data: results, error: resultsError } = await supabase
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
          leaderboard: [],
        });
      }

      const { data: players, error: playersError } = await supabase
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
          tickets_earned: bestScores.get(playerId),
        });
      }

      return respond({
        success: true,
        leaderboard,
      });
    }

    return respond({ error: "Unknown action." }, 400);

  } catch (error) {
    console.error("Game submission error:", error);
    return respond({
      error: "Unable to process this request.",
    }, 500);
  }
});
