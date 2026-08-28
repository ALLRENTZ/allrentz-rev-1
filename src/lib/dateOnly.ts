const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatDateOnly(
  value: unknown,
  locales?: Intl.LocalesArgument,
): string {
  if (typeof value !== 'string') return 'UNKNOWN'
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return 'UNKNOWN'

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year
      || parsed.getUTCMonth() !== month - 1
      || parsed.getUTCDate() !== day) return 'UNKNOWN'

  return new Intl.DateTimeFormat(locales, { timeZone: 'UTC' }).format(parsed)
}
