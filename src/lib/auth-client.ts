// ============================================================
// TeamHub Frontend — Client-side Auth Token Management
// ============================================================
//
// Manages authentication tokens on the client side for API requests.
// Tokens are persisted to localStorage so they survive page refreshes
// and browser restarts without requiring re-authentication.
// ============================================================

const TOKEN_STORAGE_KEY = "teamhub_auth_token";
const REFRESH_TOKEN_KEY = "teamhub_refresh_token";

/**
 * Store the authentication token for subsequent API requests.
 * Persists to localStorage for session continuity across page loads.
 */
export function storeAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

/**
 * Retrieve the stored authentication token.
 * Returns null if no token exists or running on the server.
 */
export function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return null;
}

/**
 * Remove the stored authentication token (e.g., on logout).
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * Store a refresh token alongside the auth token.
 * Used for silent token renewal when the access token expires.
 */
export function storeRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

/**
 * Retrieve the stored refresh token.
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

/**
 * Check if there is a stored token (quick auth check without validation).
 */
export function hasStoredToken(): boolean {
  return getStoredToken() !== null;
}

/**
 * Parse the JWT payload without verification (for display purposes only).
 * Token verification should always happen server-side.
 */
export function parseTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if the stored token appears to be expired based on the `exp` claim.
 * This is a client-side heuristic only; the server must validate expiry.
 */
export function isTokenExpired(): boolean {
  const token = getStoredToken();
  if (!token) return true;

  const payload = parseTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;

  // Add 30-second buffer so we don't use a token that's about to expire
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - 30 < nowSeconds;
}
