// Holds the in-memory access token so the tRPC link (created once, outside
// React state) can read the current value on every request without a
// re-render dependency. The refresh token itself lives only in the httpOnly
// cookie the API sets — it never touches JS.
export const authTokenStore: { current: string | null } = { current: null };
