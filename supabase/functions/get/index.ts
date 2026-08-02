// get — fetches a meeting by its share token for the anonymous read-only view.
// GET ?token=...  or  POST { token }  → meeting row or 404-style error.

import { handleOptions, error, json } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key: string | undefined;
  if (secretKeysRaw) {
    try {
      key = JSON.parse(secretKeysRaw)["default"];
    } catch {
      key = undefined;
    }
  }
  key = key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!url || !key) throw new Error("Supabase admin credentials missing");
  return createClient(url, key);
}

Deno.serve(async (req: Request) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  let token: string | null = null;
  if (req.method === "GET") {
    token = new URL(req.url).searchParams.get("token");
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      token = typeof body?.token === "string" ? body.token : null;
    } catch {
      return error("Invalid JSON body", 400);
    }
  } else {
    return error("GET or POST required", 405);
  }

  if (!token || !/^[A-Za-z0-9]{8,32}$/.test(token)) {
    return error("A valid share token is required", 400);
  }

  try {
    const supabase = adminClient();
    const { data, error: queryError } = await supabase
      .from("meetings")
      .select("id, pitch_one_liner, structured_fields, transcript, votes, report, share_token, created_at")
      .eq("share_token", token)
      .maybeSingle();

    if (queryError) throw queryError;
    if (!data) {
      return error("This meeting doesn't exist or was removed", 404);
    }
    return json({ meeting: data });
  } catch (err) {
    console.error("get failed", err);
    return error("Could not load the meeting — try again?", 500);
  }
});
