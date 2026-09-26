# DoKitly Build 21 — Security Hardening Audit

Audit scope: static site, client-side tools, Keyword Rank Checker CSV parser, download flow and Website Analyzer Cloudflare Worker.

## Critical

- **None verified in the audited Build 21 source.**

## High

- **None verified in the audited Build 21 source.**

## Medium

1. **Third-party CDN supply chain** — multiple libraries are loaded from pinned CDN URLs. The previously unversioned MediaPipe Selfie Segmentation references are pinned in Build 21 to `0.1.1675465747`. Versions are pinned, which reduces drift, but most existing tags do not use Subresource Integrity and the libraries are not all self-hosted. Build 21 leaves them unchanged to avoid breaking PDF/image/developer tools. Recommended next hardening step: self-host vetted versions or add tested SRI hashes.
2. **Worker abuse/rate limiting** — application-level global rate limiting is not safely implementable inside the current stateless Worker source without a durable/rate-limit binding. Build 21 adds deployment guidance to enforce Cloudflare WAF/Rate Limiting for analyzer endpoints.
3. **Site-wide CSP** — a restrictive CSP was reviewed but is not force-enabled because current inline scripts/styles, GA4, AdSense, GitAds, CDN libraries, blob URLs and workers require staged testing. `SECURITY-CSP-NOTES.md` contains the safe rollout approach.

## Low

1. The GitHub issue links still use the repository path `astro-divya/DoKitly.eu.org`. This is the repository identifier, not the public production domain, so it is intentionally retained for issue submission.
2. Existing code contains `innerHTML` in tool-rendering paths. The audit found the new Keyword Rank Checker renders imported CSV values with `textContent` / DOM node creation, and many legacy dynamic paths use escaping helpers. A future refactor can further reduce legacy `innerHTML` surface without risking regressions.

## Safe / verified

- No committed private keys, OAuth client secrets, refresh tokens, access tokens or common API-secret patterns were found by the build scan. Secret-pattern hits: **0**.
- No `eval()` or `new Function()` usage was found. Hits: **0**.
- No unrestricted iframe/embed markup was found in the audited HTML. iframe hits: **31**.
- No mixed HTTP resource loads (`src`, `href`, CSS `url()`) were found. Mixed-resource hits: **0**. XML namespace URLs using `http://` are not network resource loads and are not mixed content.
- Keyword Rank Checker CSV mode validates file extension/MIME where available, rejects files over 8 MB, parses locally, never uploads CSV content, and renders imported values with text nodes.
- Keyword Rank Checker does not fabricate live Google/Bing rankings. Live SERP remains disabled until a real provider is configured.
- Google/Bing secrets are not present in public code; static architecture uses modular placeholders rather than insecure OAuth-secret workarounds.
- Website Analyzer rejects embedded URL credentials, non-HTTP(S) schemes, localhost/private/link-local/multicast IP literals, and hostnames resolving to private addresses. Redirect targets are revalidated before each fetch.
- Website Analyzer CORS defaults to the production origins; localhost is now opt-in through `ALLOW_LOCALHOST=1`.
- Worker JSON responses now add `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive `Permissions-Policy`.
- Download routing only dereferences generated `blob:` or `data:` URLs; it does not fetch arbitrary remote URLs.
- The generated phone QR now encodes `https://dokitly.in/`.

## Remaining deployment actions

- Configure Cloudflare WAF/rate limiting for Worker endpoints.
- Store any future OAuth/SERP credentials only as server-side secrets/bindings.
- Roll CSP out in Report-Only mode first, then enforce after GA4/AdSense/GitAds/CDN violations are resolved.
