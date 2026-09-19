const DEFAULT_ALLOWED_ORIGINS = [
  'https://astro-divya.github.io',
  'https://dokitly.eu.org',
  'https://www.dokitly.eu.org'
];

export default {
  async fetch(request, env) {
    const reqUrl = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = getAllowedOrigins(env);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      if (origin && !isAllowedOrigin(origin, allowed)) {
        return json({ ok: false, error: 'Origin not allowed.' }, 403, cors);
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'GET') {
      return json({ ok: false, error: 'Method not allowed.' }, 405, cors);
    }

    if (origin && !isAllowedOrigin(origin, allowed)) {
      return json({ ok: false, error: 'Origin not allowed.' }, 403, cors);
    }

    if (reqUrl.pathname === '/' || reqUrl.pathname === '/health') {
      return json({ ok: true, service: 'DoKitly Website Analyzer Engine', version: '1.0.1' }, 200, cors);
    }

    if (reqUrl.pathname !== '/analyze') {
      return json({ ok: false, error: 'Not found.' }, 404, cors);
    }

    const raw = (reqUrl.searchParams.get('url') || '').trim();
    if (!raw || raw.length > 2048) {
      return json({ ok: false, error: 'Enter a valid website URL.' }, 400, cors);
    }

    let target;
    try {
      target = normalizeTarget(raw);
    } catch (e) {
      return json({ ok: false, error: e.message || 'Invalid website URL.' }, 400, cors);
    }

    try {
      const result = await analyzeWebsite(target, env);
      return json({ ok: true, ...result }, 200, cors);
    } catch (e) {
      const status = e && e.status ? e.status : 502;
      return json({ ok: false, error: cleanError(e) }, status, cors);
    }
  }
};

function getAllowedOrigins(env) {
  const extra = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}

function isAllowedOrigin(origin, allowed) {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && (u.protocol === 'http:' || u.protocol === 'https:');
  } catch {
    return false;
  }
}

function corsHeaders(origin, allowed) {
  const h = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (origin && isAllowedOrigin(origin, allowed)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

function normalizeTarget(raw) {
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only HTTP and HTTPS websites are supported.');
  if (u.username || u.password) throw new Error('URLs with embedded credentials are not supported.');
  if (!u.hostname || isBlockedHostname(u.hostname)) throw new Error('This hostname is not allowed.');
  u.hash = '';
  return u;
}

function isBlockedHostname(hostname) {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return h === 'localhost' || h === 'localhost.localdomain' || h === 'metadata.google.internal' ||
    h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') ||
    h.endsWith('.home') || h.endsWith('.lan') || isPrivateIpLiteral(h);
}

function isPrivateIpLiteral(host) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return isPrivateIPv4(host);
  if (host.includes(':')) return isPrivateIPv6(host);
  return false;
}

function isPrivateIPv4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a,b] = p;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224;
}

function isPrivateIPv6(ip) {
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::' || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true;
  if (v.startsWith('::ffff:')) {
    const tail = v.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(tail)) return isPrivateIPv4(tail);
  }
  return false;
}

async function validatePublicHost(hostname) {
  if (isBlockedHostname(hostname)) throw httpError(400, 'Private or local network targets are not allowed.');
  const [a, aaaa] = await Promise.all([
    dnsQuery(hostname, 'A').catch(() => []),
    dnsQuery(hostname, 'AAAA').catch(() => [])
  ]);
  const addresses = [...a, ...aaaa].map(x => x.data).filter(Boolean);
  if (!addresses.length) throw httpError(422, 'No public DNS address was found for this hostname.');
  if (addresses.some(ip => isPrivateIpLiteral(ip))) {
    throw httpError(400, 'The hostname resolves to a private or local network address.');
  }
  return { a, aaaa };
}

async function dnsQuery(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const r = await fetchWithTimeout(url, {
    headers: { 'accept': 'application/dns-json' }
  }, 7000);
  if (!r.ok) throw new Error(`DNS ${type} lookup failed`);
  const j = await r.json();
  return (j.Answer || []).filter(x => Number(x.type) !== 5).map(x => ({
    name: String(x.name || '').replace(/\.$/, ''),
    ttl: Number(x.TTL || 0),
    data: normalizeDnsData(x.data, type)
  }));
}

function normalizeDnsData(data, type) {
  let s = String(data || '').trim();
  if (type === 'NS' || type === 'CNAME') s = s.replace(/\.$/, '');
  if (type === 'MX') s = s.replace(/\.$/, '');
  if (type === 'TXT') s = s.replace(/^"|"$/g, '').replace(/"\s+"/g, '');
  return s;
}

async function safeFetch(startUrl, init = {}, maxRedirects = 5) {
  let current = new URL(startUrl);
  const redirects = [];
  for (let i = 0; i <= maxRedirects; i++) {
    await validatePublicHost(current.hostname);
    const started = Date.now();
    const r = await fetchWithTimeout(current.toString(), {
      ...init,
      redirect: 'manual',
      headers: {
        'accept': 'text/html, application/xhtml+xml, application/xml;q=0.9',
        'accept-language': 'en-US,en;q=0.8',
        ...(init.headers || {})
      }
    }, 12000);
    const elapsedMs = Date.now() - started;
    if ([301,302,303,307,308].includes(r.status)) {
      const loc = r.headers.get('location');
      if (!loc) return { response: r, finalUrl: current.toString(), redirects, elapsedMs };
      const next = new URL(loc, current);
      if (!['http:', 'https:'].includes(next.protocol)) throw httpError(400, 'A redirect used an unsupported protocol.');
      redirects.push({ from: current.toString(), to: next.toString(), status: r.status });
      current = next;
      continue;
    }
    return { response: r, finalUrl: current.toString(), redirects, elapsedMs };
  }
  throw httpError(508, 'Too many redirects.');
}

async function analyzeWebsite(target, env) {
  const host = target.hostname.toLowerCase();
  const dnsPromise = getDnsBundle(host);
  const rdapPromise = getRdap(host);
  const trafficPromise = getTrafficSignals(host, env);
  const main = await safeFetch(target.toString(), { method: 'GET' });
  const response = main.response;
  const contentType = response.headers.get('content-type') || '';
  const html = /text\/html|application\/xhtml\+xml/i.test(contentType)
    ? await readLimitedText(response, 1_500_000)
    : '';

  const page = extractPageSignals(html, main.finalUrl);
  const headers = extractHeaders(response.headers);
  const security = extractSecurity(response.headers, new URL(main.finalUrl));
  const tech = detectTechnology(html, response.headers);

  const final = new URL(main.finalUrl);
  const robotsUrl = `${final.origin}/robots.txt`;
  const sitemapUrl = page.sitemaps[0] || `${final.origin}/sitemap.xml`;

  const [dns, rdap, robots, sitemap, pagespeed, traffic] = await Promise.all([
    dnsPromise,
    rdapPromise,
    checkTextResource(robotsUrl, 'robots'),
    checkTextResource(sitemapUrl, 'sitemap'),
    getPageSpeed(main.finalUrl, env),
    trafficPromise
  ]);

  if (robots.text) {
    const fromRobots = [...robots.text.matchAll(/^\s*Sitemap:\s*(\S+)/gmi)].map(m => m[1]).slice(0, 6);
    if (fromRobots.length) page.sitemaps = [...new Set([...page.sitemaps, ...fromRobots])];
  }

  return {
    analyzedAt: new Date().toISOString(),
    inputUrl: target.toString(),
    hostname: host,
    http: {
      status: response.status,
      ok: response.ok,
      finalUrl: main.finalUrl,
      redirects: main.redirects,
      responseTimeMs: main.elapsedMs,
      contentType,
      contentLength: response.headers.get('content-length') || null
    },
    page,
    dns,
    rdap,
    robots: { url: robotsUrl, status: robots.status, exists: robots.ok },
    sitemap: { url: sitemapUrl, status: sitemap.status, exists: sitemap.ok },
    headers,
    security,
    technology: tech,
    pagespeed,
    traffic
  };
}

async function getDnsBundle(host) {
  const types = ['A','AAAA','NS','MX','TXT','CNAME'];
  const entries = await Promise.all(types.map(async t => [t, await dnsQuery(host, t).catch(() => [])]));
  return Object.fromEntries(entries);
}

async function getRdap(host) {
  const parse = async r => {
    const j = await r.json();
    const registrar = findRdapEntityName(j.entities || [], 'registrar');
    const eventMap = {};
    for (const e of (j.events || [])) if (e.eventAction && e.eventDate) eventMap[e.eventAction] = e.eventDate;
    return {available:true,ldhName:j.ldhName||host,handle:j.handle||null,registrar:registrar||null,status:Array.isArray(j.status)?j.status:[],nameservers:(j.nameservers||[]).map(n=>n.ldhName).filter(Boolean).slice(0,10),registration:eventMap.registration||null,expiration:eventMap.expiration||null,lastChanged:eventMap['last changed']||null};
  };
  try {
    const primary = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(host)}`, {headers:{'accept':'application/rdap+json,application/json'}}, 9000);
    if (primary.ok) return await parse(primary);
  } catch {}
  try {
    const tld = host.toLowerCase().split('.').pop();
    const boot = await fetchWithTimeout('https://data.iana.org/rdap/dns.json',{headers:{'accept':'application/json'}},7000);
    if (!boot.ok) throw new Error('RDAP bootstrap unavailable');
    const j = await boot.json();
    let base = null;
    for (const svc of (j.services || [])) {
      if (Array.isArray(svc[0]) && svc[0].map(x=>String(x).toLowerCase()).includes(tld)) { base = Array.isArray(svc[1]) ? svc[1][0] : null; break; }
    }
    if (!base) return {available:false};
    const r = await fetchWithTimeout(`${String(base).replace(/\/+$/,'')}/domain/${encodeURIComponent(host)}`,{headers:{'accept':'application/rdap+json,application/json'}},9000);
    if (!r.ok) return {available:false,status:r.status};
    return await parse(r);
  } catch { return {available:false}; }
}

function findRdapEntityName(entities, role) {
  for (const e of entities) {
    if ((e.roles || []).includes(role)) {
      const v = e.vcardArray && e.vcardArray[1];
      if (Array.isArray(v)) {
        for (const item of v) {
          if (Array.isArray(item) && item[0] === 'fn') return item[3] || null;
        }
      }
      return e.handle || null;
    }
  }
  return null;
}

async function checkTextResource(url, kind) {
  try {
    const { response, finalUrl } = await safeFetch(url, {
      method: 'GET',
      headers: { 'accept': kind === 'sitemap' ? 'application/xml, text/xml, text/plain' : 'text/plain' }
    }, 3);
    const text = response.ok ? await readLimitedText(response, 300_000) : '';
    return { ok: response.ok, status: response.status, finalUrl, text };
  } catch {
    return { ok: false, status: null, finalUrl: url, text: '' };
  }
}

async function getTrafficSignals(host, env) {
  if (!env.CLOUDFLARE_RADAR_TOKEN) return { available:false, reason:'radar_token_not_configured' };
  try {
    const r = await fetchWithTimeout(`https://api.cloudflare.com/client/v4/radar/ranking/domain/${encodeURIComponent(host)}?includeTopLocations=true`, {
      headers: { 'accept':'application/json', 'authorization':`Bearer ${env.CLOUDFLARE_RADAR_TOKEN}` }
    }, 9000);
    if (!r.ok) return { available:false, reason:'radar_unavailable', status:r.status };
    const j = await r.json();
    const d = j && j.result && (j.result.details_0 || j.result.details || {});
    return { available:true, source:'Cloudflare Radar', rank:d.rank??null, bucket:d.bucket??null, topLocations:Array.isArray(d.top_locations)?d.top_locations.slice(0,8):[], monthlyVisits:null, pageviews:null, revenue:null, siteValue:null };
  } catch { return { available:false, reason:'radar_unavailable' }; }
}

async function getPageSpeed(url, env) {
  try {
    let api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`;
    if (env.PAGESPEED_API_KEY) api += `&key=${encodeURIComponent(env.PAGESPEED_API_KEY)}`;
    const r = await fetchWithTimeout(api, { headers: { 'accept': 'application/json' } }, 14000);
    if (!r.ok) return { available: false, status: r.status, reason: r.status === 429 ? 'rate_limited' : 'http_error' };
    const j = await r.json();
    const c = j.lighthouseResult && j.lighthouseResult.categories || {};
    const audits = j.lighthouseResult && j.lighthouseResult.audits || {};
    return {
      available: true,
      performance: score(c.performance),
      seo: score(c.seo),
      accessibility: score(c.accessibility),
      bestPractices: score(c['best-practices']),
      fcp: auditDisplay(audits['first-contentful-paint']),
      lcp: auditDisplay(audits['largest-contentful-paint']),
      cls: auditDisplay(audits['cumulative-layout-shift']),
      tbt: auditDisplay(audits['total-blocking-time'])
    };
  } catch {
    return { available: false, reason:'request_failed' };
  }
}

function score(x) {
  return x && typeof x.score === 'number' ? Math.round(x.score * 100) : null;
}
function auditDisplay(a) {
  return a && a.displayValue ? a.displayValue : null;
}

function extractPageSignals(html, baseUrl) {
  const title = firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = metaContent(html, 'name', 'description');
  const robots = metaContent(html, 'name', 'robots');
  const viewport = metaContent(html, 'name', 'viewport');
  const generator = metaContent(html, 'name', 'generator');
  const canonicalRaw = linkHref(html, 'canonical');
  const canonical = toAbsolute(canonicalRaw, baseUrl);
  const lang = firstMatch(html, /<html\b[^>]*\blang\s*=\s*["']?([^\s"'>]+)/i);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map(m => cleanText(m[1]))
    .filter(Boolean)
    .slice(0, 8);
  const ogTitle = metaContent(html, 'property', 'og:title');
  const ogDescription = metaContent(html, 'property', 'og:description');
  const ogImage = toAbsolute(metaContent(html, 'property', 'og:image'), baseUrl);
  const twitterCard = metaContent(html, 'name', 'twitter:card');
  const sitemaps = [];
  return {
    title: cleanText(title),
    titleLength: cleanText(title).length,
    metaDescription: cleanText(metaDescription),
    metaDescriptionLength: cleanText(metaDescription).length,
    h1: h1s,
    h1Count: h1s.length,
    canonical,
    robotsMeta: cleanText(robots),
    viewport: cleanText(viewport),
    lang: cleanText(lang),
    generator: cleanText(generator),
    openGraph: { title: cleanText(ogTitle), description: cleanText(ogDescription), image: ogImage || null },
    twitterCard: cleanText(twitterCard),
    sitemaps
  };
}

function firstMatch(html, re) {
  const m = String(html || '').match(re);
  return m ? m[1] || '' : '';
}

function metaContent(html, attrName, attrValue) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = parseAttrs(tag);
    if (String(attrs[attrName] || '').toLowerCase() === String(attrValue).toLowerCase()) return attrs.content || '';
  }
  return '';
}

function linkHref(html, relValue) {
  const tags = String(html || '').match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs = parseAttrs(tag);
    const rel = String(attrs.rel || '').toLowerCase().split(/\s+/);
    if (rel.includes(String(relValue).toLowerCase())) return attrs.href || '';
  }
  return '';
}

function parseAttrs(tag) {
  const out = {};
  const re = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}

function cleanText(s) {
  return decodeEntities(String(s || '').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 1000);
}
function decodeEntities(s) {
  return s.replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&nbsp;/gi,' ');
}
function toAbsolute(v, base) {
  if (!v) return null;
  try { return new URL(v, base).toString(); } catch { return v; }
}

function extractHeaders(h) {
  const keys = ['server','content-type','content-encoding','cache-control','etag','last-modified','vary','cf-cache-status','via','x-powered-by'];
  const out = {};
  for (const k of keys) {
    const v = h.get(k);
    if (v) out[k] = v;
  }
  return out;
}

function extractSecurity(h, finalUrl) {
  const checks = {
    hsts: !!h.get('strict-transport-security'),
    csp: !!h.get('content-security-policy'),
    xContentTypeOptions: !!h.get('x-content-type-options'),
    frameProtection: !!(h.get('x-frame-options') || /frame-ancestors/i.test(h.get('content-security-policy') || '')),
    referrerPolicy: !!h.get('referrer-policy'),
    permissionsPolicy: !!h.get('permissions-policy')
  };
  return { https: finalUrl.protocol === 'https:', checks, passed:Object.values(checks).filter(Boolean).length, total:Object.keys(checks).length };
}

function detectTechnology(html, headers) {
  const s = String(html || '').toLowerCase();
  const out = new Set();
  const server = (headers.get('server') || '').toLowerCase();
  const powered = (headers.get('x-powered-by') || '').toLowerCase();
  if (server.includes('cloudflare') || headers.get('cf-ray')) out.add('Cloudflare');
  if (server.includes('nginx')) out.add('Nginx');
  if (server.includes('apache')) out.add('Apache');
  if (powered.includes('php')) out.add('PHP');
  if (s.includes('wp-content/') || s.includes('wp-includes/') || /generator[^>]+wordpress/.test(s)) out.add('WordPress');
  if (s.includes('cdn.shopify.com') || s.includes('shopify.theme')) out.add('Shopify');
  if (s.includes('static.parastorage.com') || s.includes('wixstatic.com')) out.add('Wix');
  if (s.includes('static1.squarespace.com')) out.add('Squarespace');
  if (s.includes('/_next/static/') || s.includes('__next_data__')) out.add('Next.js');
  if (s.includes('/_nuxt/')) out.add('Nuxt');
  if (s.includes('googletagmanager.com/gtm.js')) out.add('Google Tag Manager');
  if (s.includes('googletagmanager.com/gtag/js') || s.includes('google-analytics.com')) out.add('Google Analytics');
  if (/jquery(?:-|\.)\d|jquery\.min\.js/.test(s)) out.add('jQuery');
  if (s.includes('bootstrap.min.css') || s.includes('bootstrap.min.js')) out.add('Bootstrap');
  return [...out].slice(0, 20);
}

async function readLimitedText(response, limit) {
  if (!response.body || !response.body.getReader) {
    return (await response.text()).slice(0, limit);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  let size = 0;
  try {
    while (size < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (out.length >= limit) break;
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  out += decoder.decode();
  return out.slice(0, limit);
}

async function fetchWithTimeout(url, init, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
function cleanError(e) {
  if (!e) return 'Website analysis failed.';
  if (String(e.name || '').toLowerCase().includes('abort')) return 'The website took too long to respond.';
  return String(e.message || 'Website analysis failed.').slice(0, 300);
}
