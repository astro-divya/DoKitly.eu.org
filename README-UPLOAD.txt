DoKitly — BUILD 12
==================

Production domain:
https://dokitly.in/

Repository:
astro-divya/DoKitly.eu.org

UPLOAD
1. Extract this ZIP.
2. Upload/replace the CONTENTS directly in the repository root.
3. Delete retired tool files listed below if they still exist in GitHub.
4. Do not upload the outer Build-12 folder as a nested directory.
5. Keep the root CNAME file; its content is: dokitly.in

RETIRED FILES TO DELETE
- creator-tools/creator-trends.html
- creator-tools/aspect-ratio.html
- creator-tools/timestamp-list.html
- student-tools/focus-timer.html
- student-tools/revision-planner.html
- student-tools/assignment-tracker.html
- student-tools/study-time.html
- everyday-tools/coin-flip.html
- everyday-tools/list-picker.html

WEBSITE ANALYZER
Deploy cloudflare-worker/website-analyzer-worker.js (or the root Build 12 Worker TXT) to the existing DoKitly Analyzer Worker.
The /health endpoint should show version 1.4.0-build12.

DOMAIN / SEO MIGRATION
- Public canonical domain: https://dokitly.in/
- sitemap: https://dokitly.in/sitemap.xml
- robots: https://dokitly.in/robots.txt
- Search Console sitemap can be submitted after this build is live.

GitHub Pages remains the hosting repository; normal visitor-facing metadata uses dokitly.in.
