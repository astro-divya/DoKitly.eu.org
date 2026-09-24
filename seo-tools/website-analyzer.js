(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg=window.DOKITLY_WEBSITE_ANALYZER||{};
  const engineBase=String(cfg.analyzerApi||'').trim().replace(/\/+$/,'');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})};
  const yesNo=v=>v?'Yes':'No';
  const list=v=>Array.isArray(v)&&v.length?v.join(', '):'—';
  const score=v=>v==null?'—':Math.round(v);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const row=(a,b)=>`<div class="wa-row"><b>${esc(a)}</b><span>${esc(b==null||b===''?'—':b)}</span></div>`;
  const section=(title,body,small='')=>`<h2><span>${esc(title)}</span>${small?`<small>${esc(small)}</small>`:''}</h2>${body}`;
  const compact=n=>{n=Number(n);if(!Number.isFinite(n))return '—';return new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:n>=1000?1:0}).format(n)};
  const money=n=>Number.isFinite(Number(n))?'$'+compact(Number(n)):'—';
  const range=(v,currency=false)=>{if(!v||!Number.isFinite(Number(v.low))||!Number.isFinite(Number(v.high)))return '—';const one=x=>currency?money(x):compact(x);return `${one(v.low)}–${one(v.high)}`};
  const decimalRange=(v,suffix='')=>!v?'—':`${Number(v.low).toLocaleString(undefined,{maximumFractionDigits:1})}${suffix}–${Number(v.high).toLocaleString(undefined,{maximumFractionDigits:1})}${suffix}`;
  const domainAge=reg=>{if(!reg)return '—';const t=new Date(reg).getTime();if(!Number.isFinite(t))return '—';const y=Math.max(0,(Date.now()-t)/31557600000);return y<1?`${Math.max(1,Math.round(y*12))} mo`:`${y.toFixed(y<10?1:0)} yr`};
  const duration=n=>{n=Math.max(0,Math.round(Number(n)||0));const m=Math.floor(n/60),s=n%60;return `${m}:${String(s).padStart(2,'0')}`};
  const durationRange=v=>v?`${duration(v.low)}–${duration(v.high)}`:'—';
  const tone=s=>s==null?'':s>=80?'good':s>=55?'warn':'bad';
  const cacheKey=host=>`dokitly-analyzer-v11:${host}`;

  function saveCachedReport(u,data){try{localStorage.setItem(cacheKey(u.hostname),JSON.stringify({savedAt:Date.now(),data}))}catch{}}
  function getCachedReport(u,maxAge=6*60*60*1000){try{const raw=localStorage.getItem(cacheKey(u.hostname));if(!raw)return null;const hit=JSON.parse(raw);if(!hit?.data||Date.now()-Number(hit.savedAt||0)>maxAge)return null;return hit}catch{return null}}

  async function fetchEngineWithRetry(u){
    let lastError=null;
    const delays=[0,700];
    for(let i=0;i<delays.length;i++){
      if(delays[i])await sleep(delays[i]);
      try{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),30000);
        const r=await fetch(`${engineBase}/analyze?url=${encodeURIComponent(u.href)}`,{headers:{accept:'application/json'},signal:controller.signal});
        clearTimeout(timeout);
        const j=await r.json().catch(()=>({}));
        if(!r.ok||!j.ok)throw new Error(j.error||`Engine returned ${r.status}`);
        saveCachedReport(u,j);
        return j;
      }catch(e){lastError=e}
    }
    throw lastError||new Error('Full engine temporarily unavailable');
  }

  async function run(){
    let raw=$('waUrl').value.trim();
    if(!raw){showError('Enter a website URL or domain.');return;}
    if(!/^https?:\/\//i.test(raw))raw='https://'+raw;
    let u;try{u=new URL(raw);if(!/^https?:$/.test(u.protocol))throw 0}catch{showError('Enter a valid HTTP or HTTPS website.');return;}
    setBusy(true);hideError();$('waResults').classList.remove('show');
    try{
      let data,mode='engine';
      if(engineBase){
        try{data=await fetchEngineWithRetry(u)}
        catch(e){
          const cached=getCachedReport(u);
          if(cached){mode='cached';data=cached.data;data._cachedReport=true;data._engineError=e.message||'Full engine temporarily unavailable'}
          else{mode='basic';data=await basicAnalyze(u);data._engineError=e.message||'Full engine temporarily unavailable'}
        }
      }else{mode='basic';data=await basicAnalyze(u);data._engineError='Full engine is not configured'}
      render(data,mode);
    }catch(e){showError(e.message||'Could not analyze this website.')}
    finally{setBusy(false)}
  }

  async function basicAnalyze(u){
    const host=u.hostname;
    const dns=await getDnsBundle(host);
    const [rdap,pagespeed]=await Promise.all([getRdap(host),getPageSpeed(u.href)]);
    return {ok:true,hostname:host,inputUrl:u.href,http:{finalUrl:u.href,status:null,redirects:[],responseTimeMs:null,contentType:null},page:null,dns,rdap,robots:null,sitemap:null,headers:{},security:null,technology:[],pagespeed,traffic:{available:false,reason:'full_engine_required'},_basic:true};
  }
  async function dnsQuery(host,type){try{const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,{headers:{accept:'application/dns-json'}});if(!r.ok)return[];const j=await r.json();return(j.Answer||[]).filter(x=>Number(x.type)!==5).map(x=>String(x.data||'').replace(/\.$/,''))}catch{return[]}}
  async function getDnsBundle(host){const types=['A','AAAA','NS','MX','TXT'];const vals=await Promise.all(types.map(async t=>[t,await dnsQuery(host,t)]));return Object.fromEntries(vals)}
  async function getRdap(host){try{const r=await fetch(`https://rdap.org/domain/${encodeURIComponent(host)}`,{headers:{accept:'application/rdap+json,application/json'}});if(!r.ok)return{available:false,status:r.status};const j=await r.json(),events={};(j.events||[]).forEach(e=>{if(e.eventAction&&e.eventDate)events[e.eventAction]=e.eventDate});let registrar=null;(j.entities||[]).some(e=>{if(!(e.roles||[]).includes('registrar'))return false;const rows=e.vcardArray?.[1]||[];const fn=rows.find(x=>Array.isArray(x)&&x[0]==='fn');registrar=fn?.[3]||e.handle||null;return true});return{available:true,registrar,status:j.status||[],nameservers:(j.nameservers||[]).map(n=>n.ldhName).filter(Boolean),registration:events.registration||null,expiration:events.expiration||null,lastChanged:events['last changed']||null}}catch{return{available:false}}}
  async function getPageSpeed(url){try{const api=`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`;const r=await fetch(api);if(!r.ok)return{available:false,status:r.status};const j=await r.json();const c=j.lighthouseResult?.categories||{},a=j.lighthouseResult?.audits||{};const s=k=>typeof c[k]?.score==='number'?Math.round(c[k].score*100):null;return{available:true,performance:s('performance'),seo:s('seo'),accessibility:s('accessibility'),bestPractices:s('best-practices'),fcp:a['first-contentful-paint']?.displayValue||null,lcp:a['largest-contentful-paint']?.displayValue||null,cls:a['cumulative-layout-shift']?.displayValue||null,tbt:a['total-blocking-time']?.displayValue||null}}catch{return{available:false}}}

  function seoHealth(d){const p=d.page||{};let pts=0,max=0;const add=(ok,w)=>{max+=w;if(ok)pts+=w};add(!!p.title,15);add(p.titleLength>=20&&p.titleLength<=65,8);add(!!p.metaDescription,15);add(p.metaDescriptionLength>=70&&p.metaDescriptionLength<=170,8);add(p.h1Count===1,12);add(!!p.canonical,10);add(!!p.lang,5);add(!!d.robots?.exists,10);add(!!d.sitemap?.exists,12);add(!!d.security?.https,5);const local=max?Math.round(pts/max*100):null;return d.pagespeed?.available&&Number.isFinite(d.pagespeed.seo)?Math.round(local*.55+d.pagespeed.seo*.45):local}
  function securityHealth(sec){if(!sec)return null;const h=sec.total?sec.passed/sec.total:0;return Math.round((sec.https?20:0)+h*80)}
  function recommendations(d){const p=d.page||{},sec=d.security,ps=d.pagespeed||{},out=[];const push=(level,title,msg)=>out.push({level,title,msg});if(!p.title)push('bad','Add a page title','A descriptive title is one of the strongest basic SEO signals.');else if(p.titleLength<20||p.titleLength>65)push('warn','Review title length',`Current title length is ${p.titleLength}. Aim for a concise, descriptive search title.`);if(!p.metaDescription)push('bad','Add a meta description','Give search users a clear summary of the page.');else if(p.metaDescriptionLength<70||p.metaDescriptionLength>170)push('warn','Review meta description length',`Current description length is ${p.metaDescriptionLength}.`);if(p.h1Count!==1)push('warn','Use one clear H1',`Detected ${p.h1Count||0} H1 headings.`);if(!p.canonical)push('warn','Add a canonical URL','A canonical helps search engines understand the preferred URL.');if(!d.robots?.exists)push('warn','Add robots.txt','No robots.txt was found at the standard location.');if(!d.sitemap?.exists)push('warn','Add a sitemap','No sitemap.xml was found at the checked location.');if(sec){const c=sec.checks||{};if(!c.hsts)push('warn','Consider HSTS','HSTS tells supported browsers to prefer HTTPS for future visits.');if(!c.csp)push('warn','Consider a Content-Security-Policy','A well-tested CSP can reduce several classes of content-injection risk.');if(!c.xContentTypeOptions)push('warn','Add X-Content-Type-Options','Use nosniff where appropriate to reduce MIME-type confusion.')}if(ps.reason==='rate_limited')push('warn','PageSpeed temporarily rate-limited','Core checks still completed. Re-run later for Lighthouse scores.');if((d.http?.redirects||[]).length>2)push('warn','Shorten the redirect chain',`${d.http.redirects.length} redirects were detected before the final page.`);if(!out.length)push('good','No major basic issue detected','The checked public signals look healthy. Continue monitoring content quality, performance and real analytics.');return out}

  function ring(scoreValue,label,desc){const s=Number.isFinite(Number(scoreValue))?clamp(Math.round(scoreValue),0,100):0;return `<div class="wa-health-head"><div class="wa-ring" style="--score:${s}"><strong>${Number.isFinite(Number(scoreValue))?s:'—'}</strong></div><div class="wa-health-copy"><b>${esc(label)}</b><p>${esc(desc)}</p></div></div>`}
  function reportCard(label,value,toneClass='',small=''){return `<div class="wa-summary-card ${toneClass}"><b>${esc(label)}</b><strong>${esc(value)}</strong><small>${esc(small)}</small></div>`}

  function render(d,mode){
    const http=d.http||{},page=d.page||{},dns=d.dns||{},rdap=d.rdap||{},sec=d.security,ps=d.pagespeed||{},traffic=d.traffic||{};
    const seoScore=seoHealth(d),securityScore=securityHealth(sec),perf=ps.available?Number(ps.performance):null;
    const statusLabel=mode==='engine'?'Full live engine':mode==='cached'?'Cached full report':'Basic live mode';
    $('waStatus').innerHTML=`<span class="wa-pill ${mode==='engine'?'ok':'warn'}">${statusLabel}</span><span>${esc(d.hostname||new URL(d.inputUrl).hostname)}</span>`;
    $('waVersion').textContent=d.engineVersion?`Worker ${d.engineVersion}${mode==='cached'?' · cached':''}`:(mode==='engine'?'Live worker':mode==='cached'?'Cached report':'Basic mode');
    const likelyVisits=traffic.available&&Number.isFinite(Number(traffic.likelyMonthlyVisits))?compact(traffic.likelyMonthlyVisits):traffic.available?range(traffic.monthlyVisits):'—';
    const earningText=traffic.available?range(traffic.revenueMonthlyUsd,true):'—';
    $('waSummary').innerHTML=[
      reportCard('HTTP',http.status==null?'—':http.status,http.status>=200&&http.status<400?'good':http.status?'bad':'','Live response'),
      reportCard('Response',http.responseTimeMs==null?'—':http.responseTimeMs+' ms',http.responseTimeMs!=null?(http.responseTimeMs<800?'good':http.responseTimeMs<1800?'warn':'bad'):'','Server response'),
      reportCard('SEO Score',seoScore==null?'—':seoScore+'/100',tone(seoScore),'DoKitly health score'),
      reportCard('Security',securityScore==null?'—':securityScore+'/100',tone(securityScore),'HTTPS + headers'),
      reportCard('Domain Age',domainAge(rdap.registration),'','Registration age'),
      reportCard('Est. Visits',likelyVisits,'highlight','Likely monthly scale'),
      reportCard('Est. Earnings',earningText,'highlight','Monthly ad range'),
      reportCard('Performance',perf==null?'—':Math.round(perf)+'/100',tone(perf),ps.cached?'Cached PageSpeed':'Mobile PageSpeed')
    ].join('');

    renderTraffic(traffic);
    renderCharts(traffic);
    renderEngagement(traffic);
    renderGeo(traffic);
    renderHealthSections(d,seoScore,securityScore);
    renderTechnical(d);
    const recs=recommendations(d);$('waRecommendations').innerHTML=section('Recommended Fixes',`<div class="wa-recs">${recs.map(r=>`<div class="wa-rec ${r.level}"><i>${r.level==='good'?'✓':r.level==='bad'?'!':'•'}</i><div><b>${esc(r.title)}</b><p>${esc(r.msg)}</p></div></div>`).join('')}</div>`);
    $('waFootnote').textContent=mode==='engine'?'Live public checks plus clearly labelled estimates. Traffic and revenue figures are directional ranges, not owner analytics.':mode==='cached'?'Showing the last successful full report because the live engine is temporarily unavailable.':'Full engine temporarily unavailable. Basic browser checks are shown where possible.';
    $('waResults').classList.add('show');
    wireTooltips();
  }

  function renderTraffic(t){
    if(!t.available){$('waTraffic').innerHTML=`<div class="wa-panel-title"><div><h2>Traffic Intelligence</h2><p>Public popularity signals are needed for traffic estimation.</p></div><span class="wa-est-badge">Estimate unavailable</span></div><div class="wa-empty">Full engine temporarily unavailable. Retry in a moment; the browser-only fallback cannot produce a useful traffic estimate.</div>`;return}
    const lo=Number(t.monthlyVisits?.low)||0,hi=Number(t.monthlyVisits?.high)||0,likely=Number(t.likelyMonthlyVisits)||Math.sqrt(Math.max(1,lo)*Math.max(1,hi));
    let marker=50;if(lo>0&&hi>lo&&likely>0){const l=Math.log10(lo),h=Math.log10(hi),m=Math.log10(clamp(likely,lo,hi));marker=clamp((m-l)/(h-l)*100,4,96)}
    const rank=t.tranco?.medianRank||t.rank||null;
    $('waTraffic').innerHTML=`<div class="wa-panel-title"><div><h2>Traffic Intelligence</h2><p>Estimated scale from public popularity and web-footprint signals.</p></div><span class="wa-est-badge">Estimated · ${esc(t.confidence||'Low')} confidence (${esc(t.confidenceScore||'—')}/100)</span></div>
      <div class="wa-traffic-grid">
        <div class="wa-hero-metric"><span class="label">Likely monthly visits</span><strong>${esc(compact(likely))}</strong><span class="range">Estimated range: ${esc(range(t.monthlyVisits))}</span><div class="wa-range-track"><span class="wa-range-fill"></span><span class="wa-range-marker" style="left:${marker}%" data-wa-tip="Likely estimate: ${esc(compact(likely))}"></span></div><div class="wa-range-labels"><span>${esc(compact(lo))}</span><span>${esc(compact(hi))}</span></div><span class="note">This is a calibrated estimate, not private analytics. A popularity rank anchors large sites so crawler blocking does not automatically make them look tiny.</span></div>
        <div class="wa-side-metrics">
          <div class="wa-mini"><span>Daily visits</span><strong>${esc(range(t.dailyVisits))}</strong><small>Estimated range</small></div>
          <div class="wa-mini"><span>Monthly pageviews</span><strong>${esc(range(t.pageviews))}</strong><small>Estimated range</small></div>
          <div class="wa-mini"><span>Monthly ad revenue</span><strong>${esc(range(t.revenueMonthlyUsd,true))}</strong><small>Modelled RPM range</small></div>
          <div class="wa-mini"><span>Website value</span><strong>${esc(range(t.siteValueUsd,true))}</strong><small>Directional valuation</small></div>
        </div>
      </div>
      <div class="wa-source-line"><b>Signals:</b> ${esc(t.source||'DoKitly public-signal model')}${rank?` · Popularity rank ~#${esc(Number(rank).toLocaleString())}`:''}. ${esc(t.note||'')}</div>
      ${t.tranco?`<div class="wa-attribution">Popularity ranking attribution: <a href="https://tranco-list.eu/" target="_blank" rel="noopener">Tranco</a> — Le Pochat et al., NDSS 2019.</div>`:''}`;
  }

  function renderCharts(t){
    if(!t.available){['waScaleChart','waRankChart','waSignalChart','waChannelChart'].forEach(id=>$(id).style.display='none');return}
    ['waScaleChart','waRankChart','waSignalChart','waChannelChart'].forEach(id=>$(id).style.display='block');
    $('waScaleChart').innerHTML=`<h3>Traffic Scale</h3><p>Likely monthly visits versus estimated monthly pageviews.</p><div class="wa-chart">${barChart([
      {label:'Visits',value:Number(t.likelyMonthlyVisits)||0,tip:`Likely monthly visits: ${compact(t.likelyMonthlyVisits)}`},
      {label:'Pageviews',value:Number(t.likelyMonthlyPageviews)||0,tip:`Likely monthly pageviews: ${compact(t.likelyMonthlyPageviews)}`}
    ])}</div>`;
    const ranks=t.tranco?.ranks||[];
    $('waRankChart').innerHTML=`<h3>Popularity Rank Trend</h3><p>${ranks.length>1?'Public Tranco rank history. Lower rank means stronger relative popularity.':'Rank history appears when the domain is present in the public Tranco list.'}</p><div class="wa-chart">${ranks.length>1?rankLineChart(ranks):'<div class="wa-empty">No rank history available for this domain.</div>'}</div>`;
    $('waSignalChart').innerHTML=`<h3>Estimate Signal Strength</h3><p>How much usable evidence the estimator found. This is not a traffic-source breakdown.</p><div class="wa-chart">${signalBars(t.signalStrengths||{})}</div>`;
    $('waChannelChart').innerHTML=`<h3>Modeled Channel Mix</h3><p>Category-based directional mix — not measured analytics. Hover a segment for its share.</p><div class="wa-chart">${donutChart(t.modeledChannelMix||{})}</div>`;
  }

  function renderEngagement(t){
    if(!t.available){$('waEngagement').innerHTML=`<div class="wa-panel-title"><div><h2>Engagement Estimate</h2><p>Available when the full traffic model runs.</p></div></div><div class="wa-empty">No engagement estimate in basic mode.</div>`;return}
    $('waEngagement').innerHTML=`<div class="wa-panel-title"><div><h2>Engagement Estimate</h2><p>Modeled from the detected site category (${esc((t.category||'general').replaceAll('_',' '))}); these are ranges, not measured visitor analytics.</p></div><span class="wa-est-badge">Modeled</span></div><div class="wa-engagement">
      <div class="wa-engage-card"><span>Pages / Visit</span><strong>${esc(decimalRange(t.pagesPerVisit))}</strong><small>Estimated session depth</small></div>
      <div class="wa-engage-card"><span>Bounce Rate</span><strong>${esc(decimalRange(t.bounceRatePct,'%'))}</strong><small>Directional range</small></div>
      <div class="wa-engage-card"><span>Avg. Visit Duration</span><strong>${esc(durationRange(t.avgVisitDurationSec))}</strong><small>Minutes : seconds</small></div>
      <div class="wa-engage-card"><span>Yearly Ad Revenue</span><strong>${esc(range(t.revenueYearlyUsd,true))}</strong><small>Broad monetization range</small></div>
    </div>`;
  }

  function renderGeo(t){
    const locs=(t?.topLocations||[]).filter(Boolean).slice(0,8);
    if(!locs.length){$('waGeo').classList.remove('show');$('waGeo').innerHTML='';return}
    const max=Math.max(...locs.map(x=>Number(x.share||x.value||0)),1);
    $('waGeo').classList.add('show');
    $('waGeo').innerHTML=`<div class="wa-panel-title"><div><h2>Traffic Geography</h2><p>Shown only when a supported public geography signal is available.</p></div></div><div class="wa-country-list">${locs.map(x=>{const name=x.locationName||x.locationCode||'Location',v=Number(x.share||x.value||0);return `<div class="wa-country-row"><b>${esc(name)}</b><div class="wa-country-bar"><div class="wa-country-fill" style="width:${v?clamp(v/max*100,4,100):15}%"></div></div><span>${v?esc(v)+'%':x.rank?`#${esc(x.rank)}`:'—'}</span></div>`}).join('')}</div>`;
  }

  function renderHealthSections(d,seoScore,securityScore){
    const page=d.page||{},sec=d.security,ps=d.pagespeed||{},rdap=d.rdap||{};
    const seoRows=d.page?`${row('Title',page.title||'Missing')}${row('Meta description',page.metaDescription||'Missing')}${row('H1',list(page.h1))}${row('Canonical',page.canonical||'Missing')}${row('robots.txt',d.robots?(d.robots.exists?'Found':'Not found'):'—')}${row('Sitemap',d.sitemap?(d.sitemap.exists?`Found${d.sitemap.urlCount?` · ${d.sitemap.urlCount} entries`:''}`:'Not found'):'—')}`:'<div class="wa-empty">Page-level SEO inspection requires the full engine.</div>';
    $('waSeo').innerHTML=section('SEO Health',`${ring(seoScore,'Search readiness','Title, description, headings, canonical, robots and sitemap signals combined.')}<div class="wa-kv">${seoRows}</div>`,seoScore==null?'':`${seoScore}/100`);
    if(ps.available){$('waSpeed').innerHTML=section('Performance',`${ring(ps.performance,'Mobile performance','Google PageSpeed/Lighthouse lab score when available.')}<div class="wa-kv">${row('SEO',score(ps.seo)==='—'?'—':score(ps.seo)+'/100')}${row('Accessibility',score(ps.accessibility)==='—'?'—':score(ps.accessibility)+'/100')}${row('Best Practices',score(ps.bestPractices)==='—'?'—':score(ps.bestPractices)+'/100')}${row('First Contentful Paint',ps.fcp||'—')}${row('Largest Contentful Paint',ps.lcp||'—')}${row('CLS',ps.cls||'—')}${row('Total Blocking Time',ps.tbt||'—')}${row('Real-user field data',ps.hasFieldData?'Available':'Not detected')}</div>`,ps.cached?'Mobile · cached':'Mobile')}
    else $('waSpeed').innerHTML=section('Performance',`${ring(0,'Performance unavailable',ps.reason==='rate_limited'?'Google PageSpeed is temporarily rate-limited. Other analyzer sections still work.':'PageSpeed data is currently unavailable.')}<div class="wa-empty">Retry later for Lighthouse scores; the rest of the report does not depend on PageSpeed.</div>`,'Mobile');
    if(sec){const c=sec.checks||{};$('waSecurity').innerHTML=section('Security',`${ring(securityScore,'Header coverage','HTTPS plus six common response-header checks.')}<div class="wa-kv">${row('HTTPS',yesNo(sec.https))}${row('HSTS',yesNo(c.hsts))}${row('Content-Security-Policy',yesNo(c.csp))}${row('X-Content-Type-Options',yesNo(c.xContentTypeOptions))}${row('Frame protection',yesNo(c.frameProtection))}${row('Referrer-Policy',yesNo(c.referrerPolicy))}${row('Permissions-Policy',yesNo(c.permissionsPolicy))}</div>`,`${sec.passed}/${sec.total} headers`)}
    else $('waSecurity').innerHTML=section('Security','<div class="wa-empty">Security-header inspection requires the full engine.</div>');
    $('waDomain').innerHTML=section('Domain',rdap.available?`${ring(Math.min(100,Math.round((Date.now()-new Date(rdap.registration||Date.now()).getTime())/31557600000*6)),'Domain history','Registration age is useful context, not a quality guarantee.')}<div class="wa-kv">${row('Registrar',rdap.registrar||'—')}${row('Registered',fmtDate(rdap.registration))}${row('Expires',fmtDate(rdap.expiration))}${row('Last changed',fmtDate(rdap.lastChanged))}${row('Status',list(rdap.status))}</div>`:'<div class="wa-empty">RDAP information was not available for this domain.</div>');
    const tech=Array.isArray(d.technology)?d.technology:[];$('waTech').innerHTML=section('Technology',tech.length?`<div class="wa-tags">${tech.map(x=>`<span class="wa-tag">${esc(x)}</span>`).join('')}</div><div class="wa-footnote">Best-effort detection from public HTML and response headers.</div>`:'<div class="wa-empty">No technology signal detected.</div>');
  }

  function renderTechnical(d){
    const http=d.http||{},page=d.page||{},dns=d.dns||{};
    $('waOverview').innerHTML=`<div class="wa-kv">${row('Final URL',http.finalUrl||d.inputUrl)}${row('Root domain',d.registrableDomain||d.hostname||'—')}${row('HTTP status',http.status==null?'Full engine required':http.status)}${row('Content type',http.contentType||'—')}${row('Redirect chain',Array.isArray(http.redirects)&&http.redirects.length?http.redirects.map(x=>`${x.status}: ${x.to}`).join('\n'):'None detected')}${row('Title length',page.titleLength??'—')}${row('Description length',page.metaDescriptionLength??'—')}${row('H1 count',page.h1Count??'—')}${row('Language',page.lang||'—')}${row('Links detected',page.linkCount??'—')}${row('Images detected',page.imageCount??'—')}${row('A records',list((dns.A||[]).map(x=>x.data||x)))}${row('AAAA records',list((dns.AAAA||[]).map(x=>x.data||x)))}${row('Nameservers',list((dns.NS||[]).map(x=>x.data||x)))}${row('MX',list((dns.MX||[]).map(x=>x.data||x)))}${row('TXT',list((dns.TXT||[]).map(x=>x.data||x)))}</div>`;
  }

  function barChart(items){
    const vals=items.map(x=>Math.max(0,Number(x.value)||0)),max=Math.max(...vals,1),w=460,h=210,padL=46,padB=36,padT=16,plotH=h-padB-padT,barW=90,gap=68;
    const bars=items.map((it,i)=>{const bh=Math.max(2,(Number(it.value)||0)/max*plotH),x=padL+35+i*(barW+gap),y=padT+plotH-bh;return `<rect class="wa-bar ${i%2?'alt':''}" x="${x}" y="${y}" width="${barW}" height="${bh}" rx="8" data-wa-tip="${esc(it.tip||`${it.label}: ${compact(it.value)}`)}"></rect><text class="wa-chart-text" x="${x+barW/2}" y="${h-12}" text-anchor="middle">${esc(it.label)}</text><text class="wa-chart-text" x="${x+barW/2}" y="${Math.max(12,y-7)}" text-anchor="middle">${esc(compact(it.value))}</text>`}).join('');
    return `<svg viewBox="0 0 ${w} ${h}" aria-label="Traffic scale bar chart"><line class="wa-axis" x1="${padL}" y1="${padT+plotH}" x2="${w-15}" y2="${padT+plotH}"></line>${bars}</svg>`;
  }
  function rankLineChart(rows){
    const data=rows.slice(-30),w=480,h=220,pad={l:52,r:16,t:18,b:38};const ranks=data.map(x=>Number(x.rank)).filter(Number.isFinite);const min=Math.min(...ranks),max=Math.max(...ranks);const span=Math.max(1,max-min);const px=i=>pad.l+(i/Math.max(1,data.length-1))*(w-pad.l-pad.r);const py=r=>pad.t+((r-min)/span)*(h-pad.t-pad.b);const pts=data.map((x,i)=>[px(i),py(Number(x.rank)),x]);const d=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');const area=`${d} L${pts[pts.length-1][0]},${h-pad.b} L${pts[0][0]},${h-pad.b} Z`;const dots=pts.map(p=>`<circle class="wa-point" cx="${p[0]}" cy="${p[1]}" r="4" data-wa-tip="${esc(p[2].date)} · Rank #${esc(Number(p[2].rank).toLocaleString())}"></circle>`).join('');const first=data[0],last=data[data.length-1];return `<svg viewBox="0 0 ${w} ${h}" aria-label="Popularity rank history"><defs><linearGradient id="waLineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5bc9bd" stop-opacity=".55"></stop><stop offset="1" stop-color="#5bc9bd" stop-opacity="0"></stop></linearGradient></defs><line class="wa-axis" x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}"></line><line class="wa-gridline" x1="${pad.l}" y1="${pad.t}" x2="${w-pad.r}" y2="${pad.t}"></line><path class="wa-line-area" d="${area}"></path><path class="wa-line-path" d="${d}"></path>${dots}<text class="wa-chart-text" x="${pad.l}" y="${h-13}">${esc(first.date.slice(5))}</text><text class="wa-chart-text" x="${w-pad.r}" y="${h-13}" text-anchor="end">${esc(last.date.slice(5))}</text><text class="wa-chart-text" x="8" y="${pad.t+5}">#${esc(min.toLocaleString())}</text><text class="wa-chart-text" x="8" y="${h-pad.b}">#${esc(max.toLocaleString())}</text></svg>`;
  }
  function signalBars(obj){const entries=Object.entries(obj);if(!entries.length)return'<div class="wa-empty">No signal-strength data available.</div>';return entries.map(([k,v])=>{const n=clamp(Number(v)||0,0,100);return `<div class="wa-signal-row" data-wa-tip="${esc(k)}: ${Math.round(n)}/100"><span class="wa-signal-name">${esc(k)}</span><div class="wa-signal-track"><div class="wa-signal-fill" style="--w:${n}%"></div></div><span class="wa-signal-val">${Math.round(n)}</span></div>`}).join('')}
  function donutChart(obj){const entries=Object.entries(obj).filter(([,v])=>Number(v)>0);if(!entries.length)return'<div class="wa-empty">No modeled channel mix available.</div>';const palette=['#179b98','#4b85db','#7b61d1','#e89a3d','#d95f83','#6f9d3b'];let offset=0;const segs=entries.map(([name,val],i)=>{const pct=Number(val);const circle=`<circle class="wa-donut-segment" cx="82.5" cy="82.5" r="61" pathLength="100" stroke="${palette[i%palette.length]}" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${-offset}" transform="rotate(-90 82.5 82.5)" data-wa-tip="${esc(name)}: ${pct}%"></circle>`;offset+=pct;return circle}).join('');const legend=entries.map(([name,val],i)=>`<div class="wa-legend-item" data-wa-tip="${esc(name)}: ${esc(val)}%"><span class="wa-legend-dot" style="background:${palette[i%palette.length]}"></span><span>${esc(name)}</span><b>${esc(val)}%</b></div>`).join('');return `<div class="wa-donut-wrap"><svg class="wa-donut" viewBox="0 0 165 165" aria-label="Modeled traffic channel mix"><circle cx="82.5" cy="82.5" r="61" fill="none" stroke="#edf2f5" stroke-width="18"></circle>${segs}<text x="82.5" y="78" text-anchor="middle" class="wa-chart-text">MODELED</text><text x="82.5" y="96" text-anchor="middle" style="font:700 14px system-ui;fill:#173f56">100%</text></svg><div class="wa-legend">${legend}</div></div>`}

  function wireTooltips(){
    const tip=$('waTooltip');if(!tip)return;
    document.querySelectorAll('[data-wa-tip]').forEach(el=>{
      if(el.dataset.waBound)return;el.dataset.waBound='1';
      const move=e=>{tip.textContent=el.getAttribute('data-wa-tip')||'';tip.classList.add('show');const x=(e.clientX||e.touches?.[0]?.clientX||0)+14,y=(e.clientY||e.touches?.[0]?.clientY||0)+14;tip.style.left=Math.min(x,window.innerWidth-tip.offsetWidth-12)+'px';tip.style.top=Math.min(y,window.innerHeight-tip.offsetHeight-12)+'px'};
      el.addEventListener('pointerenter',move);el.addEventListener('pointermove',move);el.addEventListener('pointerleave',()=>tip.classList.remove('show'));el.addEventListener('click',move);
    });
  }
  function setBusy(v){$('waLoading').classList.toggle('show',v);$('waRun').disabled=v;$('waRun').textContent=v?'Analyzing…':'Analyze Website'}
  function showError(msg){$('waError').textContent=msg;$('waError').classList.add('show')}
  function hideError(){$('waError').classList.remove('show');$('waError').textContent=''}
  $('waRun').addEventListener('click',run);$('waUrl').addEventListener('keydown',e=>{if(e.key==='Enter')run()});
})();
