DoKitly Website Analyzer Engine (Cloudflare Worker)
===================================================

WHY THIS EXISTS
The DoKitly front-end is hosted on GitHub Pages. A browser cannot reliably fetch arbitrary websites because of CORS. This Worker is the server-side engine that performs live website checks and returns JSON to DoKitly.

DEPLOY (Cloudflare Dashboard - easiest)
1. Cloudflare Dashboard -> Workers & Pages -> Create -> Worker.
2. Replace the sample Worker code with website-analyzer-worker.js from this folder.
3. Deploy it.
4. Copy the workers.dev URL, for example:
   https://dokitly-website-analyzer.YOUR-SUBDOMAIN.workers.dev
5. Open assets/website-analyzer-config.js in the DoKitly repo and put that URL in analyzerApi.
6. Commit/upload the site files.

OPTIONAL PAGESPEED KEY
Google PageSpeed works without a key only when public quota permits. For reliable PageSpeed scores, add a Worker secret named PAGESPEED_API_KEY.
Cloudflare Dashboard -> Worker -> Settings -> Variables and Secrets -> Add secret.

OPTIONAL CUSTOM API ROUTE
When dokitly.eu.org is active behind Cloudflare, you can route /api/* to this Worker. If you do that, set analyzerApi to "https://dokitly.eu.org" and keep the /analyze endpoint.

SECURITY
The Worker blocks localhost/private-network destinations and validates redirect targets. CORS is limited to DoKitly/GitHub Pages origins by default.

OPTIONAL CLOUDFLARE RADAR TOKEN (Build 8)
Build 8 can show Cloudflare Radar popularity rank/bucket and top-location signals when a Radar token is configured.
Add a Worker secret named CLOUDFLARE_RADAR_TOKEN with Radar read permission.
Important: Radar does not provide exact monthly visit counts, so DoKitly does not invent visits, revenue or site value from rank alone.
