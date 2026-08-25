// Client-side idempotentiesleutel (ADR-019). Eén sleutel per LOGISCHE handeling: gemunt bij intentie,
// hergebruikt bij een herzending (remount/refresh/dubbel-invoke van dezelfde handeling), en gewist zodra
// er een job-id terug is of een fout getoond is. Een BEWUSTE tweede poging (nieuwe klik na afronding/fout)
// vindt geen opgeslagen sleutel → munt een nieuwe = een nieuwe handeling. Overleeft navigatie/refresh via
// sessionStorage; de `action` is de stabiele identiteit van de handeling (bv. "summary:<transcriptId>").

const PREFIX = "idem:";

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* ignore */ }
  // Fallback zonder crypto (zou zelden nodig zijn): tijd + random is uniek genoeg voor een sleutel.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** De sleutel voor deze handeling: hergebruik de bestaande (herzending) of munt een nieuwe (nieuwe intentie). */
export function idempotencyKey(action: string): string {
  try {
    const existing = sessionStorage.getItem(PREFIX + action);
    if (existing) return existing;
    const k = uuid();
    sessionStorage.setItem(PREFIX + action, k);
    return k;
  } catch {
    return uuid();
  }
}

/** Forceer een NIEUWE sleutel voor deze handeling — voor een bewuste nieuwe poging (bv. playlist-retry). */
export function newIdempotencyKey(action: string): string {
  try { sessionStorage.removeItem(PREFIX + action); } catch { /* ignore */ }
  return idempotencyKey(action);
}

/** Wis de sleutel zodra de handeling is afgerond (job-id terug) of een fout is getoond. */
export function clearIdempotencyKey(action: string): void {
  try { sessionStorage.removeItem(PREFIX + action); } catch { /* ignore */ }
}
