import { supabase } from "./supabase";

// Auth emails deep-link back into the app with the session in the URL, either
// as #access_token=...&refresh_token=... (implicit flow) or ?code=... (PKCE).
// detectSessionInUrl is off on native, so we have to establish it ourselves.
const AUTH_PARAM = /(access_token|refresh_token|error_description|[?#&]code)=/;

// The "#" sometimes arrives percent-encoded (even twice, as %2523), so decode
// until it's stable before looking for auth params.
function decodeUrl(url: string) {
  let decoded = url;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

export function isAuthCallbackUrl(url: string) {
  return AUTH_PARAM.test(decodeUrl(url));
}

// Returns the link type (e.g. "recovery") if a session was created, else null.
export async function createSessionFromUrl(url: string) {
  const decoded = decodeUrl(url);
  const start = decoded.search(/[?#]/);
  const params = new URLSearchParams(
    start === -1 ? "" : decoded.slice(start + 1).replace(/#/g, "&")
  );

  const errorDescription = params.get("error_description");
  if (errorDescription) throw new Error(errorDescription);

  const type = params.get("type") ?? "";
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return type;
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return type;
  }

  return null;
}
