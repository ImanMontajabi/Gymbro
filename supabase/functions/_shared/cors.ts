// Shared CORS headers for every Edge Function in this project — the browser
// sends a preflight OPTIONS request before the real POST, and every actual
// response also needs these headers or the browser blocks the response body
// from reaching the calling code even on success.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
