const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'

export function marketingHref(path: string): string {
  return `${MARKETING_URL}${path}`
}

export function appHref(path: string): string {
  return `${APP_URL}${path}`
}
