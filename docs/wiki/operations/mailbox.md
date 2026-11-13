# Mailbox contact@indxr.ai (Fastmail) — werkwijze

Bijgewerkt: 2026-11-13 (hoofdchat). Eén Fastmail-account voor Tiny Web Ventures, met drie domeinen naast elkaar: indxr.ai, watkosteenhond.nl en zwartopwit.online. Het account werkt met **labels**, niet met mappen. Mail van watkosteenhond.nl en zwartopwit.online valt buiten INDXR-werk: niet labelen, niet verplaatsen, niet verwijderen.

## Labels

| Label | Id | Kleur | Wat erin zit |
|---|---|---|---|
| `indxr.ai` (top-level) | `P8DV` | `#FFB000` (amber, `--accent` uit de huisstijl) | Alle mail van of aan een @indxr.ai-adres, buiten de prullenbak |
| `Proton-archief/indxr.ai` | `Py-` | `#FFB000` | Het uit Proton geïmporteerde archief (161 mails); die hebben nu ook het top-level label |

Let op: er zijn twee labels met de naam `indxr.ai`. In de Fastmail-koppeling (`update_email`, `search_email` met `in:`) altijd het **id `P8DV`** gebruiken, nooit de naam: `in:"indxr.ai"` is dubbelzinnig.

Stand 2026-11-13: 191 mails in `P8DV`. Controle: `(from:indxr.ai OR to:indxr.ai) -in:trash -in:P8DV` geeft 0 resultaten (zelfde check in de UI met `-in:"indxr.ai"`: "No matches found").

## Regel voor binnenkomende mail

Filters & Rules → "Label indxr.ai (alles aan *@indxr.ai)": To/Cc/Bcc bevat `indxr.ai` → label `indxr.ai` (`P8DV`), niet archiveren, "Continue to apply other rules" aan. In de Sieve-code staat hij als `fileinto :copy :mailboxid "P8DV"` en matcht hij ook op deliveredTo. Zelfde opbouw als de regels voor watkosteenhond.nl en zwartopwit.online.

**Een regel werkt niet op verzonden mail en niet op concepten.** Elk concept of elke mail die Claude via de Fastmail-koppeling maakt (`draft_email`/`send_email`) krijgt daarna zelf het label: `update_email` met `addLabels: ["P8DV"]` op het id van dat bericht.

## Handtekening contact@indxr.ai

Ingesteld onder Instellingen → My email addresses → Signatures. Alleen het logo met link naar de site, daaronder site · mailadres. Geen slogan.

- Logo: `https://indxr.ai/logo/handtekening.png` (in de repo: `apps/marketing/public/logo/handtekening.png`, commit `cf08383`). 400×86 px, getoond op 200×43 (2x voor retina). Horizontaal logo, inkt op **witte** achtergrond, zodat het ook in dark-mode-mailclients leesbaar blijft (een transparant zwart logo verdwijnt daar). Niet verplaatsen of hernoemen: verzonden mails verwijzen naar deze URL.
- Fastmail neemt een afbeelding alleen via URL op, dus het bestand moet openbaar op de site blijven staan.

**Concepten via de Fastmail-koppeling krijgen de handtekening niet vanzelf.** Plak dit HTML-blok onderaan de body van elke mail of elk concept dat via `draft_email`/`send_email` vanaf contact@indxr.ai wordt gemaakt:

```html
<div><a href="https://indxr.ai"><img src="https://indxr.ai/logo/handtekening.png" alt="INDXR.AI" width="200" height="43" style="width:200px;height:43px;"></a></div>
<div><a href="https://indxr.ai">indxr.ai</a> · <a href="mailto:contact@indxr.ai">contact@indxr.ai</a></div>
```

Daarna: label `P8DV` toevoegen (zie hierboven).

Alleen contact@indxr.ai heeft een handtekening. De catch-all `*@indxr.ai` heeft er geen: een antwoord op mail die aan een ander @indxr.ai-adres is gestuurd, gaat zonder handtekening de deur uit, tenzij je vanaf contact@ antwoordt.

## Wie ruimt de inbox op

- **Postronde (geplande taak "Administratie TWV: postronde (dagelijks)", 21:47):** archiveert alleen factuur- en betaalmails, en pas nadat de pdf in de kwartaalmap staat. Al het andere en mails met een ster laat hij bewust staan. Stand 13-11: de taak staat **uit** (sinds 13-11 16:31, samen met de andere TWV-taken) en heeft nog nooit gedraaid.
- **Inboxronde watkosteenhond.nl:** alleen mail aan info@watkosteenhond.nl.
- **INDXR-meldingen** (Sentry, Ahrefs, Google-beveiliging, aanmeldcodes): geen automatische ronde. Ze krijgen het label `P8DV` en worden met de hand gearchiveerd. Mails met een ster zijn van Khidr en blijven in de inbox.

## Valkuil: labelen in bulk

"Alles selecteren" + Labels in de Fastmail-UI labelde op 13-11 maar 60 van de 184 gevonden mails (alleen de geladen gesprekken), terwijl de teller "184 selected" toonde. Na een bulkactie altijd de controlezoekopdracht draaien; de rest via de koppeling labelen (`update_email`, in batches van 50 ids).
