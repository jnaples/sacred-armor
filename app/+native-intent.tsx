import { isAuthCallbackUrl } from "../lib/authLinks";

// Auth email links carry tokens/errors that expo-router would otherwise try to
// match as a route ("Unmatched Route"). Send them to the root instead; the root
// layout reads the original URL and routes on from there.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return isAuthCallbackUrl(path) ? "/" : path;
}
