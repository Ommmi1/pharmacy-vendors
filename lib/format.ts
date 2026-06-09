export function fmtNum(n: number | string | null | undefined): string {
  return (parseFloat(String(n)) || 0)
    .toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
