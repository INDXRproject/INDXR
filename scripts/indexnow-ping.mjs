// IndexNow ping (Bing, Yandex, Seznam, … — Google does not use IndexNow).
// Usage, after a production deploy:  node scripts/indexnow-ping.mjs [url ...]
// Without arguments it submits every URL in https://indxr.ai/sitemap.xml.
// The key is public by design: it must be served at https://indxr.ai/<key>.txt
// (apps/marketing/public/<key>.txt). Spec: https://www.indexnow.org/documentation
const HOST = "indxr.ai"
const KEY = "634f84e4f12e6b41bc212ebb642cab94"

let urls = process.argv.slice(2)
if (urls.length === 0) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text()
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
})
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URLs`)
if (res.status !== 200 && res.status !== 202) process.exit(1)
