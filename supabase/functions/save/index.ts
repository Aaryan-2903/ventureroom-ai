// save — persists a finished meeting anonymously and returns its share token.
// POST { pitch_one_liner, structured_fields?, transcript, votes?, report? }
// → { id, share_token, share_url }

import { handleOptions, error, json } from "../_shared/cors.ts";
import type { Turn, StructuredFields } from "../_shared/types.ts";

// Generate a URL-safe, human-friendly share token (~14 chars, base62).
function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

// supabase-js with the server secret key (admin client, bypasses RLS).
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
  if (req.method !== "POST") return error("POST required", 405);

  let body: {
    pitch_one_liner?: unknown;
    structured_fields?: unknown;
    transcript?: unknown;
    votes?: unknown;
    report?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const pitch = typeof body.pitch_one_liner === "string" ? body.pitch_one_liner.trim() : "";
  if (!pitch) return error("pitch_one_liner is required", 400);

  const transcript = Array.isArray(body.transcript) ? (body.transcript as Turn[]) : [];
  const structuredFields = body.structured_fields && typeof body.structured_fields === "object"
    ? (body.structured_fields as StructuredFields)
    : null;
  const votes = body.votes && typeof body.votes === "object" ? body.votes : null;
  const report = body.report && typeof body.report === "object" ? body.report : null;

  const supabase = adminClient();

  // Retry a few times on the rare share-token collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const shareToken = generateToken();
    const { data, error: insertError } = await supabase
      .from("meetings")
      .insert({
        pitch_one_liner: pitch,
        structured_fields: structuredFields,
        transcript,
        votes,
        report,
        share_token: shareToken,
      })
      .select("id, share_token")
      .single();

    if (!insertError && data) {
      const shareUrl = `${req.url.split("/functions/")[0]}/#/m/${shareToken}`;
      return json({ id: data.id, share_token: data.share_token, share_url: shareUrl });
    }

    if (insertError && String(insertError.code) === "23505" && attempt < 2) {
      continue; // unique violation on share_token — retry
    }
    console.error("save failed", insertError);
    return error(insertError ? `Could not save the meeting: ${insertError.message}` : "Could not save the meeting", 500);
  }
  return error("Could not save the meeting", 500);
});
