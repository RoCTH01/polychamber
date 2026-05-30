export function weekStartFor(offset: number, now = new Date()): string {
  const dow = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setDate(now.getDate() - dow + offset * 7)
  start.setHours(0, 0, 0, 0)
  // Convert to local date string using toLocaleDateString since the date manipulation
  // above uses local time via setDate/setHours
  const year = start.getFullYear()
  const month = String(start.getMonth() + 1).padStart(2, '0')
  const day = String(start.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}

/**
 * Returns true if the text is long enough to warrant a collapse/expand toggle.
 * Heuristic: counts explicit newlines plus estimated soft-wrap lines at 80 chars.
 */
export function isLongText(body: string, threshold = 5): boolean {
  const newlines = (body.match(/\n/g) ?? []).length
  const estimatedLines = Math.ceil(body.length / 80)
  return (newlines + estimatedLines) > threshold
}
