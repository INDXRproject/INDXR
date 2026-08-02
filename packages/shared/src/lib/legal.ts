// BUNDELVERSIE van de legal-documenten die een gebruiker bij checkout aanvaardt.
// Gedefinieerd als de datum van de MEEST RECENTE inhoudelijke wijziging aan /privacy
// OF /terms (de laatste van de twee). Beide documenten worden samen aanvaard, dus één
// versie voor de bundel; WELKE documenten het betreft staat al in
// terms_acceptances.documents — daarom niet splitsen in per-document constanten.
//
// Bump deze bij ELKE inhoudelijke wijziging aan een van beide documenten, samen met de
// zichtbare "Last updated"-datum op het gewijzigde document én diens sitemap-lastmod.
// De zichtbare datum per document MAG afwijken van deze bundelversie als alleen het
// andere document wijzigde — dat is bedoeld gedrag (bv. /terms toont 2026-07-20 terwijl
// de bundel op 2026-08-02 staat na de /privacy Google-Ads-cookie-disclosure).
//
// Het veld heet terms_version in terms_acceptances maar draagt deze bundelversie (ADR-069);
// git is het versiearchief van beide documenten — geen apart archiefmechanisme nodig.
export const LEGAL_VERSION = "2026-08-02"
