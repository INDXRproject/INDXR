# Belasting-jurisdicties — niet-EU B2C digitale diensten

**Doel:** per land vastleggen of een NL-gevestigde verkoper van digitale diensten (INDXR, B2C) zich daar moet registreren voor BTW/GST, vanaf welke drempel, en op welke **grondslag** die drempel wordt gemeten (lokale omzet vs wereldomzet). Dit onderbouwt de Radar-landguard (ADR-062).

**Aannames:** NL-gevestigd, géén vaste inrichting in het doelland, elektronisch geleverde diensten (transcript-credits) rechtstreeks aan particulieren (B2C).
**Geraadpleegd:** 2026-07-15. **Herijk periodiek** — tarieven en hervormingstermijnen wijzigen.

**Bronregel:** verifieer tegen de belastingdienst zélf, niet tegen compliance-verkopers (Quaderno/Avalara/Dodo/PwC mogen vindplaats zijn, geen bron).

## Overzicht (de blocklist van ADR-062)

| Land | Drempel (lokaal) | €0 vanaf sale 1? | **Grondslag** | Tarief | Regime | Officiële bron | Verificatie |
|------|------------------|:---:|--------------|-------|--------|----------------|-------------|
| **CH** Zwitserland | CHF 100.000/jaar | Nee — zie grondslag | **WERELDOMZET** (In- und Ausland) | 8,1% | MWST-Pflicht, Art. 10 MWSTG | estv.admin.ch | ✅ ESTV, geciteerd |
| **GB** VK | £0 (NETP) | **Ja** | n.v.t. (geen drempel) | 20% | Non-Established Taxable Person, VATA 1994 Sch. 1A | gov.uk / HMRC | ✅ gov.uk, geciteerd |
| **KR** Zuid-Korea | KRW 0 | **Ja** | n.v.t. | 10% | Simplified Business Registration (e-services) | nts.go.kr | ⚠ via PwC/GT, niet van NTS-pagina |
| **TR** Turkije | TRY 0 | **Ja** | n.v.t. | 20% | Special VAT Reg. for Electronic Service Providers (KDV-3) | gib.gov.tr | ⚠ portal bestaat; details secundair |
| **IN** India | INR 0 | **Ja** | n.v.t. | 18% IGST | OIDAR, CGST §24(ix) | cbic-gst.gov.in | ⚠ statuut geciteerd, niet van CBIC-pagina |
| **BR** Brazilië | BRL 0 | **Ja** (phase-in) | n.v.t. | ~26,5% CBS+IBS (gefaseerd 2026–2033) | CBS/IBS (LC 214/2025) | gov.br/receitafederal | ⚠ NIEUW/onzeker — herijk |
| **UY** Uruguay | UYU 0 | **Ja** | n.v.t. | 22% | Non-resident digital services VAT (IVA) | dgi.gub.uy | ⚠ via PwC/GT/Avalara |
| **OM** Oman | OMR 0 | **Ja** | n.v.t. | 5% | Non-resident e-commerce VAT (OTA) | taxoman.gov.om | ⚠ OTA-gids bestaat; details secundair |
| **RS** Servië | RSD 0 | **Ja** | n.v.t. | 20% | Non-resident e-services VAT + fiscaal vertegenwoordiger | purs.gov.rs | ⚠ via secundair |

**Kernpunt (grondslag):** alléén **Zwitserland** gebruikt een **wereldomzet**-drempel. Alle andere landen op deze lijst hebben **geen drempel** voor niet-gevestigde B2C-digitaal (registratie vanaf sale 1) → lokaal-vs-wereld is voor hen moot: er is geen omzetvloer om op te meten.

## Per land

### CH — Zwitserland (KRITISCH — geverifieerd tegen ESTV)
De CHF 100.000-drempel wordt gemeten op **WERELDOMZET**, niet op Zwitserse omzet. Bevestigd op de ESTV-site (foreign-companies):

> "all companies that are domiciled in Switzerland or that provide supply of goods or supply of services in Switzerland will become liable to VAT, if they generate a **worldwide turnover of at least CHF 100 000 p. a.**"

Duits: "… mindestens 100 000 Franken Umsatz aus steuerbaren und steuerbefreiten Leistungen **im In- und Ausland** …" ("im In- und Ausland" = binnen- én buitenland). Geldt sinds 1-1-2018 (Art. 10 MWSTG).

**Gevolg voor INDXR:** aansprakelijkheid ontstaat als (a) er een belastbare levering in Zwitserland is (een buitenlandse leverancier van e-diensten aan een Zwitserse consument voldoet daaraan — place of supply = klantland) **én** (b) de wereldomzet CHF 100k/jaar raakt. Dus **niet** irrelevant voor een kleine verkoper: zodra onze **globale** omzet ~CHF 100k (~€107k) raakt, triggert zelfs een handvol Zwitserse B2C-sales een verplichte Zwitserse registratie (met Zwitserse fiscaal vertegenwoordiger). Onder CHF 100k wereldwijd: geen registratie nodig, ook mét Zwitserse sales. Tarief 8,1% (sinds 2024).
Bron: https://www.estv.admin.ch/estv/en/home/value-added-tax/vat-tax-liability/foreign-companies.html · https://www.estv.admin.ch/de/mwst-steuerpflicht-auslaendische-unternehmen

### GB — Verenigd Koninkrijk (geverifieerd tegen gov.uk/HMRC)
**Geen registratiedrempel voor een Non-Established Taxable Person (NETP)** — registratie vanaf de eerste belastbare levering. De normale UK-drempel (£90.000) geldt alleen voor UK-gevestigde bedrijven. VAT Notice 700/1:

> "If you're a non-established taxable person (NETP), the registration threshold for taxable supplies does not apply to you, so you'll have to register for VAT if you make taxable supplies of any value in the UK."

NL-bedrijf zonder UK-vaste-inrichting dat e-diensten aan UK-consumenten levert = NETP → registreren vanaf sale 1. Tarief 20%. Grondslag: VATA 1994 Schedule 1A.
Bron: https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat · https://www.gov.uk/hmrc-internal-manuals/vat-registration-manual/vatreg37150

### KR — Zuid-Korea
Niet-ingezeten leveranciers van e-diensten aan Koreaanse consumenten registreren via **Simplified Business Registration** (NTS) — **nul drempel, vanaf sale 1**. Tarief 10%. Geen input-VAT-aftrek in het vereenvoudigde schema; kwartaalaangiften.
⚠ Regime bevestigd via PwC/Grant Thornton, niet van een nts.go.kr-pagina. Autoriteit: https://www.nts.go.kr

### TR — Turkije
Niet-ingezeten e-service-providers aan Turkse consumenten registreren via de **KDV-3 ("VAT No. 3")**-portal — **nul drempel**. Tarief 20% (sinds midden 2023). Maandaangiften. B2C; B2B blijft reverse charge.
⚠ Portal digitalservice.gib.gov.tr; specifics secundair. Autoriteit: https://www.gib.gov.tr

### IN — India
Buitenlandse **OIDAR**-aanbieders aan niet-geregistreerde Indiase consumenten moeten GST registreren — **verplicht vanaf de eerste transactie, geen drempel** (CGST §24(ix)). Tarief 18% IGST. GSTR-5A; vertegenwoordiger in India vereist.
⚠ Statutaire basis via ClearTax/secundair, niet van cbic-gst.gov.in. Autoriteit: https://cbic-gst.gov.in

### BR — Brazilië
**Nieuw en nog in fase-in.** Onder de hervorming (LC 214/2025) vallen niet-ingezeten digitale aanbieders onder de bestemmings-**CBS** (federaal, 8,8%) en **IBS** (staat/gemeente, ~17,7%) — samen ~26,5%. **Geen drempel, geen B2B/B2C-onderscheid** voor de registratieplicht. Tijdlijn: registratie/e-invoicing voor niet-ingezetenen verwacht vanaf ~1-8-2026; CBS-inning vanaf 2027; IBS gefaseerd t/m 2033.
⚠ Bewegend doel — herijk vóór je erop vertrouwt. Autoriteit: https://www.gov.br/receitafederal

### UY — Uruguay
Niet-ingezeten aanbieders van digitale/audiovisuele diensten aan Uruguayaanse consumenten registreren voor IVA — **nul drempel, vanaf sale 1** (vereenvoudigde procedure). Tarief 22%. Sinds 2018.
⚠ Via PwC/GT/Avalara, niet van dgi.gub.uy. Autoriteit: https://www.dgi.gub.uy

### OM — Oman
Sinds 1-4-2021 registreren niet-ingezeten leveranciers van digitale diensten aan Omaanse consumenten voor BTW — **nul drempel, vanaf sale 1**. Tarief 5%. Via OTA-portal; "Responsible Person"/vertegenwoordiger in Oman vereist; mogelijk bankgarantie (~5% verwachte jaaromzet).
⚠ OTA "VAT Taxpayer Guide — Electronic Commerce" bestaat; niet regel-voor-regel gefetcht. Autoriteit: https://tms.taxoman.gov.om

### RS — Servië
Niet-ingezeten aanbieders van elektronisch geleverde diensten aan Servische consumenten registreren **vóór aanvang — nul drempel** en benoemen een fiscaal vertegenwoordiger. Tarief 20%. Eigenaardigheid: zodra geregistreerd worden álle Servische leveringen (ook B2B) Servisch-BTW-plichtig.
⚠ Via GT/Fonoa/vatcalc, niet van purs.gov.rs. Autoriteit: https://www.purs.gov.rs

## Bronkwaliteit (eerlijk)
- **Volledig geverifieerd tegen overheidsbron (geciteerd):** CH (ESTV), GB (gov.uk/HMRC) — de twee belangrijkste.
- **Regime + nul-drempel bevestigd via reputabele professionele/secundaire bronnen** (PwC, Grant Thornton, vatcalc, Avalara), niet van de overheidspagina zelf: KR, TR, IN, UY, OM, RS. Autoriteits-URL's staan per land vermeld ter bevestiging.
- **Nieuw/onzeker:** BR (CBS/IBS-hervorming, nog in fase-in — herijk).
