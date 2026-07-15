// Open-redirect guard voor post-auth doelen (checkout-intent die door de
// signup/login → onboarding-flow heen gethread wordt). Alleen de app-host
// (app.indxr.ai) of lokale dev-hosts zijn toegestaan. Retourneert de
// genormaliseerde URL-string als het doel geldig is, anders null → caller valt
// terug op /dashboard. Puur/isomorf: bruikbaar server- én client-side.
export function safeAppRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (
      url.hostname === "app.indxr.ai" ||
      url.hostname === "localhost" ||
      url.hostname.startsWith("app.localhost")
    ) {
      return url.toString()
    }
  } catch {
    /* geen absolute/geldige URL → niet vertrouwen */
  }
  return null
}
