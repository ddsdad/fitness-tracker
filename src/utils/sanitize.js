// Strip HTML tags from user-provided strings to prevent XSS in
// cross-user rendering contexts (leaderboard names, exercise names, etc.)
export function sanitize(str) {
  if (typeof str !== 'string') return str
  return str.replace(/<[^>]*>/g, '').trim()
}
