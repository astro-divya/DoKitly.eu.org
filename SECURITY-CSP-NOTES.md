# Content-Security-Policy rollout note

Build 21 does not force a site-wide CSP meta tag because the current site uses GA4, AdSense, GitAds, multiple pinned CDN libraries, blob/data URLs and PDF/image workers. A too-narrow policy would break working tools or monetization.

Recommended rollout: deploy a **Content-Security-Policy-Report-Only** header first through a host/proxy that supports response headers, collect violations, then tighten and enforce. GitHub Pages does not provide arbitrary response-header configuration.

A starting policy must account for at least:
- self
- www.googletagmanager.com / Google Analytics endpoints
- Google AdSense / doubleclick frames and scripts
- gitads.dev where used
- cdn.jsdelivr.net and cdnjs.cloudflare.com while CDN dependencies remain external
- blob: workers and generated-file/object URLs
- data: images where required

Keep `object-src 'none'`, `base-uri 'self'`, and a narrow `form-action` where practical. Remove `unsafe-inline` only after inline scripts/styles are migrated to external nonce/hash-capable files.
