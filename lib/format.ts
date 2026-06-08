export function fmtNum(n: number | string | null | undefined): string {
  const num = parseFloat(String(n)) || 0
  return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
