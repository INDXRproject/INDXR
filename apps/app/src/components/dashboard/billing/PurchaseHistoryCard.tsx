import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@indxr/shared/components/ui/card"
import { PACKAGES, formatEur } from "@indxr/shared/lib/pricing"
import { InvoiceButton } from "@/components/dashboard/billing/InvoiceButton"

// Aankoophistorie uit credit_transactions. Een aankoop = een 'credit'-rij met een
// stripe_session_id in metadata (door de Stripe-webhook weggeschreven). Bedragen/credits
// komen uit die rij — niets afgeleid uit onbetrouwbare SUM's, niets verzonnen.
export interface PurchaseRow {
  id: string
  amount: number
  created_at: string
  metadata: {
    stripe_session_id?: string
    amount_paid?: number
    currency?: string
    invoice_url?: string | null
  } | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Pakketnaam is deterministisch af te leiden uit het exacte credit-aantal (tiers hebben
// unieke credit-waarden: 100/400/1.300/3.100). Geen match -> geen naam (geen gok).
function packageName(credits: number): string | null {
  return PACKAGES.find((p) => p.credits === credits)?.name ?? null
}

// showInvoice=true (account): volledige betaalhistorie mét InvoiceButton (facturen horen op
// /account thuis). showInvoice=false (billing): puur overzicht (datum, pakket, credits, bedrag),
// geen invoice-knop. Zelfde rij-logica; alleen de knop + kop-copy verschillen.
// bare=true (billing): geen Card/CardHeader — de pagina levert zelf een SectionLabel met lijn,
// zodat billing hetzelfde sectieritme heeft als /docs. Alleen de lijst (of lege staat).
export function PurchaseHistoryCard({ purchases, showInvoice = true, bare = false }: { purchases: PurchaseRow[]; showInvoice?: boolean; bare?: boolean }) {
  const body =
    purchases.length === 0 ? (
      <p className="text-sm text-fg-muted py-4">No purchases yet.</p>
    ) : (
      <div className="divide-y divide-border-subtle">
        {purchases.map((p) => {
          const name = packageName(p.amount)
          const paid = p.metadata?.amount_paid
          const invoiceUrl = p.metadata?.invoice_url
          return (
            <div key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg truncate">
                  {name ? `${name} · ` : ""}{p.amount.toLocaleString()} credits
                </p>
                <p className="text-xs text-fg-muted">{formatDate(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <span className="text-sm font-medium text-fg tabular-nums">
                  {paid != null ? formatEur(paid) : "—"}
                </span>
                {showInvoice && <InvoiceButton transactionId={p.id} initialUrl={invoiceUrl} />}
              </div>
            </div>
          )
        })}
      </div>
    )

  if (bare) return body

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-fg">{showInvoice ? "Purchases & invoices" : "Purchase history"}</CardTitle>
        <CardDescription className="text-fg-subtle">
          {showInvoice
            ? "Your payments. Request an invoice for any purchase — it stays available to download afterwards."
            : "Your previous credit purchases."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="text-sm text-fg-muted py-4">No purchases yet.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {purchases.map((p) => {
              const name = packageName(p.amount)
              const paid = p.metadata?.amount_paid
              const invoiceUrl = p.metadata?.invoice_url
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {name ? `${name} · ` : ''}{p.amount.toLocaleString()} credits
                    </p>
                    <p className="text-xs text-fg-muted">{formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <span className="text-sm font-medium text-fg tabular-nums">
                      {paid != null ? formatEur(paid) : '—'}
                    </span>
                    {showInvoice && <InvoiceButton transactionId={p.id} initialUrl={invoiceUrl} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
