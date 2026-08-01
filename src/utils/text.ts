export function pluralize(count: number, noun: string, suffix = 's') {
  return count === 1 ? noun : noun + suffix
}

export function validationCount(field: any) {
  const raw = field?.props?.validation ?? field?.validation
  if (typeof raw !== 'string') return 0
  const parts = raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length
}
