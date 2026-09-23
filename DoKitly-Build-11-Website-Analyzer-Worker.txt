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
      return json({ ok: true, service: 'DoKitly Website Analyzer Engine', version: '1.3.0-build11' }, 200, cors);
    }

    if (reqUrl.pathname === '/creator-context') {
      const raw = (reqUrl.searchParams.get('url') || '').trim();
      if (!raw || raw.length > 2048) return json({ ok:false, error:'Enter a valid public URL.' }, 400, cors);
      try {
        const target = normalizeTarget(raw);
        const result = await getCreatorContext(target);
        return json({ ok:true, ...result }, 200, cors);
      } catch (e) {
        return json({ ok:false, error:cleanError(e) }, e && e.status ? e.status : 502, cors);
      }
    }

    if (reqUrl.pathname === '/creator-trends') {
      try {
        const geo = String(reqUrl.searchParams.get('geo') || 'IN').toUpperCase().replace(/[^A-Z]/g,'').slice(0,2) || 'IN';
        const platform = String(reqUrl.searchParams.get('platform') || 'General').slice(0,40);
        const category = String(reqUrl.searchParams.get('category') || 'General').slice(0,40);
        const result = await getCreatorTrends(geo, platform, category);
        return json({ ok:true, ...result }, 200, cors);
      } catch (e) {
        return json({ ok:false, error:cleanError(e) }, 502, cors);
      }
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


async function safeFetchWithRetry(startUrl, init = {}, maxRedirects = 5, attempts = 2) {
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await safeFetch(startUrl, init, maxRedirects);
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await sleep(300 * (i + 1));
    }
  }
  throw lastError || new Error('Website fetch failed.');
}


async function getCreatorContext(target) {
  const main = await safeFetch(target.toString(), { method:'GET' }, 4);
  const r = main.response;
  const contentType = r.headers.get('content-type') || '';
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw httpError(415, 'This link is not a readable public HTML page. Paste the text instead.');
  }
  const html = await readLimitedText(r, 900_000);
  const page = extractPageSignals(html, main.finalUrl);
  const contextText = extractReadableText(html).slice(0, 6000);
  return {
    hostname: new URL(main.finalUrl).hostname,
    finalUrl: main.finalUrl,
    title: page.title || '',
    description: page.metaDescription || page.openGraph?.description || '',
    image: page.openGraph?.image || null,
    contextText,
    note: 'Public page context only. Private, blocked or script-only pages may not be readable.'
  };
}

function extractReadableText(html) {
  let s = String(html || '');
  s = s.replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<\/?(?:nav|header|footer|aside)\b[^>]*>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s).replace(/\s+/g, ' ').trim();
  return s;
}

async function getCreatorTrends(geo, platform, category) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(`https://dokitly-trends-cache.invalid/?geo=${encodeURIComponent(geo)}`);
  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const j = await hit.json();
        return { ...j, platform, category, cached:true };
      }
    } catch {}
  }
  const url = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
  const r = await fetchWithTimeout(url, { headers:{'accept':'application/rss+xml,text/xml;q=0.9,*/*;q=0.5','user-agent':'Mozilla/5.0 DoKitly/1.0'} }, 9000);
  if (!r.ok) throw new Error(`Trend source returned HTTP ${r.status}`);
  const xml = await readLimitedText(r, 500_000);
  const items = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks.slice(0,30)) {
    const titleRaw = firstMatch(block, /<title>([\s\S]*?)<\/title>/i).replace(/^<!\[CDATA\[|\]\]>$/g,'');
    const trafficRaw = firstMatch(block, /<(?:ht:)?approx_traffic>([\s\S]*?)<\/(?:ht:)?approx_traffic>/i).replace(/^<!\[CDATA\[|\]\]>$/g,'');
    const pubDate = firstMatch(block, /<pubDate>([\s\S]*?)<\/pubDate>/i).replace(/^<!\[CDATA\[|\]\]>$/g,'');
    const title = cleanText(titleRaw);
    if (title) items.push({ title, approxTraffic:cleanText(trafficRaw)||null, pubDate:cleanText(pubDate)||null });
  }
  if (!items.length) throw new Error('Live trend source returned no readable items.');
  const result = {
    source:'Google Trends public RSS',
    geo,
    platform,
    category,
    fetchedAt:new Date().toISOString(),
    items:items.slice(0,18),
    note:'These are live Google web-search trends for the selected country, not a private Instagram/TikTok/YouTube trending feed.'
  };
  if (cache) {
    try { await cache.put(key, new Response(JSON.stringify(result), {headers:{'content-type':'application/json','cache-control':'public, max-age=900'}})); } catch {}
  }
  return result;
}

async function analyzeWebsite(target, env) {
  const host = target.hostname.toLowerCase();
  const dnsPromise = getDnsBundle(host);
  const rdapPromise = getRdap(host);
  const trafficSignalsPromise = getTrafficSignals(host, env);
  const main = await safeFetchWithRetry(target.toString(), { method: 'GET' }, 5, 2);
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

  const jobs = await Promise.allSettled([
    dnsPromise,
    rdapPromise,
    checkTextResource(robotsUrl, 'robots'),
    checkTextResource(sitemapUrl, 'sitemap'),
    getPageSpeed(main.finalUrl, env),
    trafficSignalsPromise
  ]);
  const val = (i, fallback) => jobs[i] && jobs[i].status === 'fulfilled' ? jobs[i].value : fallback;
  const dns = val(0, {A:[],AAAA:[],NS:[],MX:[],TXT:[],CNAME:[]});
  const rdap = val(1, {available:false});
  const robots = val(2, {ok:false,status:null,finalUrl:robotsUrl,text:''});
  const sitemap = val(3, {ok:false,status:null,finalUrl:sitemapUrl,text:''});
  const pagespeed = val(4, {available:false,reason:'request_failed'});
  const radar = val(5, {available:false,commonCrawl:{available:false},tranco:{available:false},radar:{available:false}});

  if (robots.text) {
    const fromRobots = [...robots.text.matchAll(/^\s*Sitemap:\s*(\S+)/gmi)].map(m => m[1]).slice(0, 6);
    if (fromRobots.length) page.sitemaps = [...new Set([...page.sitemaps, ...fromRobots])];
  }

  const sitemapUrlCount = countSitemapEntries(sitemap.text);
  const traffic = estimateTrafficAndValue({
    host,
    page,
    rdap,
    sitemapUrlCount,
    pagespeed,
    security,
    responseTimeMs: main.elapsedMs,
    radar,
    technology: tech
  });

  return {
    analyzedAt: new Date().toISOString(),
    engineVersion: '1.3.0-build11',
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
    sitemap: { url: sitemapUrl, status: sitemap.status, exists: sitemap.ok, urlCount: sitemapUrlCount || null },
    headers,
    security,
    technology: tech,
    pagespeed,
    traffic
  };
}

function countSitemapEntries(text) {
  const s = String(text || '');
  if (!s) return 0;
  const urls = (s.match(/<url\b/gi) || []).length;
  const maps = (s.match(/<sitemap\b/gi) || []).length;
  return Math.max(urls, maps);
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
  const [commonCrawl, tranco, radar] = await Promise.all([
    getCommonCrawlFootprint(host),
    getTrancoSignal(host),
    getRadarSignal(host, env)
  ]);
  return {
    available: !!(commonCrawl.available || tranco.available || radar.available),
    commonCrawl,
    tranco,
    radar
  };
}

async function getTrancoSignal(host) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://dokitly-tranco-cache.invalid/?host=${encodeURIComponent(host)}`);
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return { ...(await hit.json()), cached:true };
    } catch {}
  }
  try {
    const r = await fetchWithTimeout(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(host)}`, {
      headers: { 'accept':'application/json', 'user-agent':'DoKitly-Website-Analyzer/1.3 (+https://dokitly.eu.org)' }
    }, 9000);
    if (!r.ok) return { available:false, status:r.status, reason:'tranco_unavailable' };
    const j = await r.json();
    const rows = Array.isArray(j && j.ranks) ? j.ranks : [];
    const ranks = rows.map(x => ({ date:String(x.date || ''), rank:Number(x.rank) }))
      .filter(x => x.date && Number.isFinite(x.rank) && x.rank > 0 && x.rank <= 100000000)
      .sort((a,b) => a.date.localeCompare(b.date));
    if (!ranks.length) return { available:false, reason:'not_ranked' };
    const latest = ranks[ranks.length - 1];
    const recent = ranks.slice(-30);
    const nums = recent.map(x => x.rank).sort((a,b)=>a-b);
    const median = nums.length ? nums[Math.floor(nums.length/2)] : latest.rank;
    const best = nums.length ? nums[0] : latest.rank;
    const result = {
      available:true,
      source:'Tranco popularity rank',
      rank:latest.rank,
      medianRank:median,
      bestRank:best,
      ranks:recent,
      attribution:'Tranco — Le Pochat et al., NDSS 2019'
    };
    if (cache) {
      try {
        await cache.put(cacheKey, new Response(JSON.stringify(result), {
          headers:{'content-type':'application/json','cache-control':'public, max-age=86400'}
        }));
      } catch {}
    }
    return result;
  } catch {
    return { available:false, reason:'request_failed' };
  }
}

async function getRadarSignal(host, env) {
  // Cloudflare Radar data is optional and disabled by default.
  // Enable only after checking the data licence for your intended use.
  const enabled = String(env.ENABLE_CLOUDFLARE_RADAR || '').toLowerCase();
  if (!env.CLOUDFLARE_RADAR_TOKEN || !['1','true','yes'].includes(enabled)) {
    return { available:false, reason:'radar_not_enabled' };
  }
  try {
    const r = await fetchWithTimeout(`https://api.cloudflare.com/client/v4/radar/ranking/domain/${encodeURIComponent(host)}?includeTopLocations=true`, {
      headers: { 'accept':'application/json', 'authorization':`Bearer ${env.CLOUDFLARE_RADAR_TOKEN}` }
    }, 9000);
    if (!r.ok) return { available:false, reason:'radar_unavailable', status:r.status };
    const j = await r.json();
    const d = j && j.result && (j.result.details_0 || j.result.details || {});
    return {
      available:true,
      source:'Cloudflare Radar',
      rank:d.rank??null,
      bucket:d.bucket??null,
      topLocations:Array.isArray(d.top_locations)?d.top_locations.slice(0,8):[]
    };
  } catch {
    return { available:false, reason:'radar_unavailable' };
  }
}

async function getLatestCommonCrawlIndex() {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request('https://dokitly-commoncrawl-index.invalid/latest');
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const j = await hit.json();
        if (j && j.id) return j.id;
      }
    } catch {}
  }
  try {
    const r = await fetchWithTimeout('https://index.commoncrawl.org/collinfo.json', {
      headers: { 'accept':'application/json', 'user-agent':'DoKitly-Website-Analyzer/1.3 (+https://dokitly.eu.org)' }
    }, 8000);
    if (!r.ok) return 'CC-MAIN-2026-34';
    const list = await r.json();
    const id = Array.isArray(list) && list[0] && list[0].id ? String(list[0].id) : 'CC-MAIN-2026-34';
    if (cache) {
      try {
        await cache.put(cacheKey, new Response(JSON.stringify({id}), {
          headers:{'content-type':'application/json','cache-control':'public, max-age=21600'}
        }));
      } catch {}
    }
    return id;
  } catch {
    return 'CC-MAIN-2026-34';
  }
}

async function getCommonCrawlFootprint(host) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(`https://dokitly-commoncrawl-cache.invalid/?host=${encodeURIComponent(host)}`);
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return { ...(await hit.json()), cached:true };
    } catch {}
  }
  try {
    const indexId = await getLatestCommonCrawlIndex();
    const api = `https://index.commoncrawl.org/${encodeURIComponent(indexId)}-index?url=${encodeURIComponent(host)}&matchType=domain&output=json&showNumPages=true&pageSize=5`;
    const r = await fetchWithTimeout(api, {
      headers: { 'accept':'application/json,text/plain', 'user-agent':'DoKitly-Website-Analyzer/1.3 (+https://dokitly.eu.org)' }
    }, 10000);
    if (!r.ok) return { available:false, status:r.status, indexId };
    const text = (await r.text()).trim();
    if (!text) return { available:false, indexId };
    let j;
    try { j = JSON.parse(text.split(/\n+/)[0]); } catch { return { available:false, indexId, reason:'parse_failed' }; }
    const blocks = Math.max(0, Number(j.blocks || 0));
    const pages = Math.max(0, Number(j.pages || 0));
    const pageSize = Math.max(1, Number(j.pageSize || 5));
    const result = {
      available: blocks > 0 || pages > 0,
      source:'Common Crawl URL Index',
      indexId,
      blocks,
      pages,
      pageSize,
      // Common Crawl blocks contain many capture lines. Keep this deliberately broad.
      estimatedCaptures: blocks > 0 ? rangeObj(blocks * 900, blocks * 3600) : null
    };
    if (cache) {
      try {
        await cache.put(cacheKey, new Response(JSON.stringify(result), {
          headers:{'content-type':'application/json','cache-control':'public, max-age=21600'}
        }));
      } catch {}
    }
    return result;
  } catch {
    return { available:false, reason:'request_failed' };
  }
}

function ageYears(date) {
  if (!date) return 0;
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / 31557600000);
}
function clamp(n,a,b){ return Math.min(b,Math.max(a,n)); }
function roundNice(n) {
  n = Math.max(0, Number(n) || 0);
  if (n < 100) return Math.round(n / 10) * 10;
  if (n < 1000) return Math.round(n / 50) * 50;
  if (n < 10000) return Math.round(n / 500) * 500;
  if (n < 100000) return Math.round(n / 5000) * 5000;
  if (n < 1000000) return Math.round(n / 50000) * 50000;
  if (n < 10000000) return Math.round(n / 500000) * 500000;
  if (n < 100000000) return Math.round(n / 5000000) * 5000000;
  return Math.round(n / 25000000) * 25000000;
}
function rangeObj(low, high) {
  low = roundNice(low); high = roundNice(high);
  if (high <= low) high = roundNice(low * 1.8 + 100);
  return { low, high };
}
function geometricMean(a,b){
  a=Math.max(1,Number(a)||1); b=Math.max(1,Number(b)||1);
  return Math.sqrt(a*b);
}
function blendRanges(a,b) {
  if (!a) return b;
  if (!b) return a;
  const low = geometricMean(a.low,b.low) * 0.72;
  const high = geometricMean(a.high,b.high) * 1.38;
  return rangeObj(low,high);
}
function radarVisitRange(radar) {
  if (!radar || !radar.available) return null;
  const rank = Number(radar.rank);
  if (Number.isFinite(rank) && rank > 0) {
    if (rank <= 100) return rangeObj(40_000_000, 600_000_000);
    if (rank <= 1_000) return rangeObj(6_000_000, 120_000_000);
    if (rank <= 10_000) return rangeObj(700_000, 18_000_000);
    if (rank <= 100_000) return rangeObj(90_000, 2_500_000);
    if (rank <= 200_000) return rangeObj(45_000, 1_200_000);
    if (rank <= 500_000) return rangeObj(12_000, 450_000);
    if (rank <= 1_000_000) return rangeObj(3_000, 140_000);
  }
  const bucket = String(radar.bucket || '').toLowerCase().replace(/[,\s]/g,'');
  if (bucket.includes('100k') || bucket.includes('100000')) return rangeObj(90_000,2_500_000);
  if (bucket.includes('200k') || bucket.includes('200000')) return rangeObj(45_000,1_200_000);
  if (bucket.includes('500k') || bucket.includes('500000')) return rangeObj(12_000,450_000);
  if (bucket.includes('1m') || bucket.includes('1000000')) return rangeObj(3_000,140_000);
  return null;
}
function commonCrawlVisitRange(cc, hasCruxFieldData) {
  if (!cc || !cc.available) return null;
  const b = Math.max(0, Number(cc.blocks || 0));
  let r;
  if (b >= 15000) r = rangeObj(25_000_000, 300_000_000);
  else if (b >= 5000) r = rangeObj(8_000_000, 140_000_000);
  else if (b >= 1500) r = rangeObj(2_000_000, 45_000_000);
  else if (b >= 500) r = rangeObj(600_000, 14_000_000);
  else if (b >= 150) r = rangeObj(180_000, 4_000_000);
  else if (b >= 50) r = rangeObj(50_000, 1_200_000);
  else if (b >= 15) r = rangeObj(12_000, 350_000);
  else if (b >= 5) r = rangeObj(3_000, 120_000);
  else if (b >= 1) r = rangeObj(600, 35_000);
  else return null;
  if (hasCruxFieldData) {
    r = rangeObj(r.low * 1.35, r.high * 1.8);
  }
  return r;
}
function inferSiteCategory(page, technology, host='') {
  const h = String(host || '').toLowerCase();
  const text = [page?.title,page?.metaDescription,...(page?.h1||[]),...(technology||[]),h].filter(Boolean).join(' ').toLowerCase();
  const has = re => re.test(text);
  // Host text is included so a blocked homepage can still get a broad category when the domain name is informative.
  if (has(/godaddy|namecheap|hostinger|bluehost|dreamhost|siteground|web hosting|domain registrar|domain registration|website builder|hosting provider/)) return 'hosting_domain';
  if (has(/flipkart|amazon\.|ebay|walmart|etsy|alibaba|shopping|shop online|store|marketplace|buy online|cart|e-?commerce|product/)) return 'ecommerce';
  if (has(/bank|finance|loan|credit|insurance|invest|stock|broker|mortgage|tax/)) return 'finance';
  if (has(/news|magazine|journal|newspaper|breaking|media/)) return 'media';
  if (has(/school|college|university|course|learn|education|exam|quiz|student|tutorial/)) return 'education';
  if (has(/software|developer|api|saas|tool|converter|calculator|generator|analyzer/)) return 'software_tools';
  if (has(/social|community|forum|chat|dating|network/)) return 'community';
  if (has(/video|music|movie|stream|game|gaming|entertainment/)) return 'entertainment';
  return 'general';
}
function categoryEconomics(category) {
  const map = {
    ecommerce:{pages:[3.0,7.0],rpm:[0.7,5.0]},
    hosting_domain:{pages:[2.0,5.2],rpm:[2.0,15.0]},
    finance:{pages:[1.7,3.6],rpm:[4.0,24.0]},
    media:{pages:[1.8,4.5],rpm:[1.0,9.0]},
    education:{pages:[1.6,3.4],rpm:[1.2,8.0]},
    software_tools:{pages:[1.4,3.2],rpm:[1.5,12.0]},
    community:{pages:[3.0,9.0],rpm:[0.5,5.0]},
    entertainment:{pages:[2.0,6.0],rpm:[0.6,6.0]},
    general:{pages:[1.4,3.2],rpm:[0.8,8.0]}
  };
  return map[category] || map.general;
}
function trancoVisitRange(tranco) {
  if (!tranco || !tranco.available) return null;
  const rank = Number(tranco.medianRank || tranco.rank);
  if (!Number.isFinite(rank) || rank <= 0 || rank > 1_000_000) return null;
  // Log-interpolated calibration anchors. These are deliberately broad because popularity rank is not a visit counter.
  const anchors = [
    [1,5_000_000_000],[10,1_500_000_000],[100,350_000_000],[500,180_000_000],
    [1_000,170_000_000],[5_000,55_000_000],[10_000,25_000_000],[50_000,7_000_000],
    [100_000,3_000_000],[500_000,500_000],[1_000_000,120_000]
  ];
  let a=anchors[0], b=anchors[anchors.length-1];
  for (let i=0;i<anchors.length-1;i++) {
    if (rank >= anchors[i][0] && rank <= anchors[i+1][0]) { a=anchors[i]; b=anchors[i+1]; break; }
  }
  const x=(Math.log(rank)-Math.log(a[0]))/Math.max(.0001,(Math.log(b[0])-Math.log(a[0])));
  const likely=Math.exp(Math.log(a[1])+(Math.log(b[1])-Math.log(a[1]))*clamp(x,0,1));
  return { ...rangeObj(likely*.20, likely*3.6), likely:roundNice(likely), rank };
}

function categoryTrafficFactor(category) {
  return ({ecommerce:1.35,hosting_domain:.28,finance:.75,media:1.0,education:.68,software_tools:.65,community:1.15,entertainment:1.1,general:1.0})[category] || 1;
}
function rangeFloat(low, high, digits=1) {
  const f = 10 ** digits;
  return { low:Math.round(Number(low)*f)/f, high:Math.round(Number(high)*f)/f };
}
function categoryEngagement(category) {
  const map = {
    ecommerce:{bounce:[38,58],duration:[150,360]},
    hosting_domain:{bounce:[40,62],duration:[170,440]},
    finance:{bounce:[40,64],duration:[150,340]},
    media:{bounce:[50,74],duration:[80,260]},
    education:{bounce:[42,66],duration:[130,330]},
    software_tools:{bounce:[44,68],duration:[130,360]},
    community:{bounce:[28,55],duration:[260,780]},
    entertainment:{bounce:[34,61],duration:[220,650]},
    general:{bounce:[44,70],duration:[100,320]}
  };
  return map[category] || map.general;
}
function modeledChannelMix(category) {
  const map = {
    ecommerce:{Direct:38,'Organic Search':34,Referral:10,Social:9,'Paid Search':9},
    hosting_domain:{Direct:36,'Organic Search':42,Referral:8,Social:3,'Paid Search':11},
    finance:{Direct:34,'Organic Search':45,Referral:10,Social:4,'Paid Search':7},
    media:{Direct:24,'Organic Search':40,Referral:10,Social:22,'Paid Search':4},
    education:{Direct:28,'Organic Search':50,Referral:8,Social:10,'Paid Search':4},
    software_tools:{Direct:35,'Organic Search':45,Referral:9,Social:6,'Paid Search':5},
    community:{Direct:44,'Organic Search':25,Referral:8,Social:21,'Paid Search':2},
    entertainment:{Direct:34,'Organic Search':30,Referral:8,Social:25,'Paid Search':3},
    general:{Direct:35,'Organic Search':40,Referral:10,Social:10,'Paid Search':5}
  };
  return map[category] || map.general;
}
function estimateTrafficAndValue({host,page,rdap,sitemapUrlCount,pagespeed,security,responseTimeMs,radar,technology}) {
  const signals = radar && radar.commonCrawl !== undefined ? radar : {radar:radar||{available:false},commonCrawl:{available:false},tranco:{available:false}};
  const radarSignal = signals.radar || {available:false};
  const tranco = signals.tranco || {available:false};
  const cc = signals.commonCrawl || {available:false};
  const hasCrux = !!(pagespeed && pagespeed.hasFieldData);
  const category = inferSiteCategory(page, technology, host);

  let modelScore = 10;
  const years = ageYears(rdap && rdap.registration);
  modelScore += clamp(years * 2.5, 0, 18);
  const sm = Number(sitemapUrlCount || 0);
  if (sm > 0) modelScore += clamp(Math.log10(sm + 1) * 8, 2, 18);
  if (page && page.title) modelScore += 3;
  if (page && page.metaDescription) modelScore += 3;
  if (page && page.h1Count === 1) modelScore += 3;
  if (page && page.canonical) modelScore += 2;
  if (page && Number(page.linkCount || 0) > 20) modelScore += 3;
  if (hasCrux) modelScore += 18;
  if (tranco.available) modelScore += 26;
  if (cc.available) modelScore += clamp(Math.log10(Number(cc.blocks||0)+1)*10, 2, 20);
  if (pagespeed && Number.isFinite(pagespeed.seo)) modelScore += clamp((pagespeed.seo - 50) / 8, 0, 6);
  if (security && security.https) modelScore += 2;
  if (Number.isFinite(responseTimeMs) && responseTimeMs < 800) modelScore += 2;
  modelScore = clamp(Math.round(modelScore), 0, 100);

  const trancoRange = trancoVisitRange(tranco);
  const radarRange = radarVisitRange(radarSignal);
  const ccRange = commonCrawlVisitRange(cc, hasCrux);
  let monthly = null;
  let likelyVisits = null;

  if (trancoRange) {
    const factor = categoryTrafficFactor(category);
    likelyVisits = roundNice(trancoRange.likely * factor);
    // Common Crawl is only a supporting footprint signal; crawlers can be blocked, so it cannot collapse a strong popularity rank.
    if (ccRange) {
      const trMid = Math.max(1, likelyVisits);
      const ccMid = geometricMean(ccRange.low, ccRange.high);
      const evidence = clamp(Math.pow(ccMid / trMid, 0.10), 0.86, 1.18);
      likelyVisits = roundNice(likelyVisits * evidence);
    }
    const ranked = Number(trancoRange.rank || tranco.medianRank || tranco.rank || 0);
    const tightRankBand = ranked > 0 && ranked <= 10_000;
    const mediumRankBand = ranked > 0 && ranked <= 100_000;
    const lowFactor = tightRankBand ? .35 : mediumRankBand ? .28 : .20;
    const highFactor = tightRankBand ? 2.2 : mediumRankBand ? 2.8 : 3.6;
    monthly = rangeObj(likelyVisits * lowFactor, likelyVisits * highFactor);
    if (radarRange) monthly = blendRanges(monthly, radarRange);
  } else {
    monthly = blendRanges(radarRange, ccRange);
    if (monthly) likelyVisits = roundNice(geometricMean(monthly.low, monthly.high));
  }

  if (!monthly && hasCrux) {
    monthly = rangeObj(20_000, 1_500_000);
    likelyVisits = 180_000;
  }
  if (!monthly) {
    if (modelScore >= 82) monthly = rangeObj(60_000, 2_000_000);
    else if (modelScore >= 68) monthly = rangeObj(15_000, 600_000);
    else if (modelScore >= 54) monthly = rangeObj(3_000, 180_000);
    else if (modelScore >= 40) monthly = rangeObj(600, 45_000);
    else monthly = rangeObj(100, 12_000);
    likelyVisits = roundNice(geometricMean(monthly.low, monthly.high));
  }
  likelyVisits = clamp(likelyVisits || roundNice(geometricMean(monthly.low, monthly.high)), monthly.low, monthly.high);

  const economics = categoryEconomics(category);
  const engagement = categoryEngagement(category);
  const pagesPerVisit = rangeFloat(economics.pages[0], economics.pages[1], 1);
  const bounceRatePct = rangeFloat(engagement.bounce[0], engagement.bounce[1], 0);
  const avgVisitDurationSec = rangeFloat(engagement.duration[0], engagement.duration[1], 0);
  const pageviews = rangeObj(monthly.low * pagesPerVisit.low, monthly.high * pagesPerVisit.high);
  const likelyPageviews = roundNice(likelyVisits * ((pagesPerVisit.low + pagesPerVisit.high) / 2));
  const daily = rangeObj(monthly.low/30, monthly.high/30);
  const revenueMonthlyUsd = rangeObj((pageviews.low/1000)*economics.rpm[0], (pageviews.high/1000)*economics.rpm[1]);
  const revenueYearlyUsd = rangeObj(revenueMonthlyUsd.low*12, revenueMonthlyUsd.high*12);
  const siteValueUsd = rangeObj(revenueMonthlyUsd.low*18, revenueMonthlyUsd.high*42);

  const signalNames = [];
  if (tranco.available) signalNames.push('Tranco popularity rank');
  if (cc.available) signalNames.push('Common Crawl footprint');
  if (hasCrux) signalNames.push('Chrome real-user field-data signal');
  if (radarSignal.available) signalNames.push('Cloudflare Radar rank');
  if (rdap && rdap.registration) signalNames.push('domain age');
  if (sm > 0) signalNames.push('sitemap footprint');

  let confidence = 'Low';
  let confidenceScore = 30;
  if (tranco.available) confidenceScore += 32;
  if (cc.available) confidenceScore += Math.min(16, 4 + Math.log10(Number(cc.blocks||0)+1)*4);
  if (hasCrux) confidenceScore += 12;
  if (radarSignal.available) confidenceScore += 12;
  if (rdap && rdap.registration) confidenceScore += 4;
  confidenceScore = clamp(Math.round(confidenceScore), 20, 95);
  if (confidenceScore >= 76) confidence = 'High';
  else if (confidenceScore >= 55) confidence = 'Medium';

  const strengths = {
    Popularity: tranco.available ? clamp(100 - Math.log10(Math.max(1,Number(tranco.medianRank||tranco.rank))) * 14, 18, 98) : (radarSignal.available?70:10),
    'Web footprint': cc.available ? clamp(20 + Math.log10(Number(cc.blocks||0)+1)*22, 18, 96) : 8,
    'Real-user data': hasCrux ? 88 : 8,
    'Site footprint': sm > 0 ? clamp(30 + Math.log10(sm+1)*18, 30, 92) : 12,
    Longevity: years > 0 ? clamp(years*6, 10, 92) : 8
  };

  return {
    available:true,
    estimated:true,
    source: signalNames.length ? `${signalNames.join(' + ')} + DoKitly calibration model` : 'DoKitly public-signal estimation model',
    confidence,
    confidenceScore,
    modelScore,
    category,
    rank: tranco.available ? (tranco.rank ?? null) : (radarSignal.available ? (radarSignal.rank ?? null) : null),
    bucket: radarSignal.available ? (radarSignal.bucket ?? null) : null,
    topLocations: radarSignal.available ? (radarSignal.topLocations || []) : [],
    tranco: tranco.available ? {
      rank:tranco.rank||null,
      medianRank:tranco.medianRank||null,
      bestRank:tranco.bestRank||null,
      ranks:tranco.ranks||[],
      attribution:tranco.attribution||'Tranco — Le Pochat et al., NDSS 2019',
      cached:!!tranco.cached
    } : null,
    commonCrawl: cc.available ? {
      indexId:cc.indexId||null,
      blocks:cc.blocks||0,
      pages:cc.pages||0,
      estimatedCaptures:cc.estimatedCaptures||null,
      cached:!!cc.cached
    } : null,
    cruxFieldData:hasCrux,
    monthlyVisits: monthly,
    likelyMonthlyVisits: likelyVisits,
    dailyVisits: daily,
    pageviews,
    likelyMonthlyPageviews: likelyPageviews,
    pagesPerVisit,
    bounceRatePct,
    avgVisitDurationSec,
    modeledChannelMix:modeledChannelMix(category),
    signalStrengths:strengths,
    revenueMonthlyUsd,
    revenueYearlyUsd,
    siteValueUsd,
    note:'Directional estimate from public popularity and web-footprint signals. Tranco gives a relative popularity rank, not measured visits; engagement and channel mix are modelled ranges. This is not private analytics or a Similarweb/Semrush measurement.'
  };
}

async function getPageSpeed(url, env) {
  const cacheKey = new Request(`https://dokitly-pagespeed-cache.invalid/?url=${encodeURIComponent(url)}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return { ...(await hit.json()), cached:true };
    } catch {}
  }
  let lastStatus = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`;
      if (env.PAGESPEED_API_KEY) api += `&key=${encodeURIComponent(env.PAGESPEED_API_KEY)}`;
      const r = await fetchWithTimeout(api, { headers: { 'accept': 'application/json' } }, 14000);
      lastStatus = r.status;
      if (r.status === 429 && attempt < 2) { await sleep(450 * (attempt + 1)); continue; }
      if (!r.ok) return { available: false, status: r.status, reason: r.status === 429 ? 'rate_limited' : 'http_error' };
      const j = await r.json();
      const c = j.lighthouseResult && j.lighthouseResult.categories || {};
      const audits = j.lighthouseResult && j.lighthouseResult.audits || {};
      const result = {
        available: true,
        performance: score(c.performance),
        seo: score(c.seo),
        accessibility: score(c.accessibility),
        bestPractices: score(c['best-practices']),
        fcp: auditDisplay(audits['first-contentful-paint']),
        lcp: auditDisplay(audits['largest-contentful-paint']),
        cls: auditDisplay(audits['cumulative-layout-shift']),
        tbt: auditDisplay(audits['total-blocking-time']),
        hasFieldData: !!(j.loadingExperience && j.loadingExperience.metrics && Object.keys(j.loadingExperience.metrics).length) || !!(j.originLoadingExperience && j.originLoadingExperience.metrics && Object.keys(j.originLoadingExperience.metrics).length)
      };
      if (cache) {
        try { await cache.put(cacheKey, new Response(JSON.stringify(result), {headers:{'content-type':'application/json','cache-control':'public, max-age=21600'}})); } catch {}
      }
      return result;
    } catch (e) {
      if (attempt < 2) { await sleep(350 * (attempt + 1)); continue; }
    }
  }
  return { available:false, status:lastStatus, reason:lastStatus===429?'rate_limited':'request_failed' };
}
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

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
  const linkCount = (String(html || '').match(/<a\b[^>]*\bhref\s*=/gi) || []).length;
  const imageCount = (String(html || '').match(/<img\b/gi) || []).length;
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
    linkCount,
    imageCount,
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
