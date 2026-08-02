// Stub function — proves deploy + invocation works end-to-end with CORS.
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return json({
    ok: true,
    service: "ai-board-of-directors",
    time: new Date().toISOString(),
  });
});
