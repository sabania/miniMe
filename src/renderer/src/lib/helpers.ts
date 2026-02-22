export function formatDate(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  )
}

export function shortenPath(p: string): string {
  // Windows: C:\Users\name\... → ~\...
  const winHome = p.match(/^[A-Z]:\\Users\\[^\\]+/)?.[0]
  if (winHome) return '~' + p.slice(winHome.length)
  // Linux: /home/name/... → ~/...
  const linuxHome = p.match(/^\/home\/[^/]+/)?.[0]
  if (linuxHome) return '~' + p.slice(linuxHome.length)
  return p
}

export function formatPhoneDisplay(digits: string): string {
  return '+' + digits
}
