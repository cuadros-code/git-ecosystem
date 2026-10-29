export function iso(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback
}
