// citeproc-js ships no types and @types/citeproc doesn't exist on npm — minimal shape for the
// one API surface citation.ts actually uses (Engine + updateItems + makeBibliography).
declare module "citeproc" {
  interface CiteprocSys {
    retrieveLocale: (lang: string) => string
    retrieveItem: (id: string) => Record<string, unknown>
  }
  export class Engine {
    constructor(sys: CiteprocSys, styleXml: string, lang?: string)
    updateItems(ids: string[]): void
    makeBibliography(): [Record<string, unknown>, string[]]
  }
  const CSL: { Engine: typeof Engine }
  export default CSL
}
