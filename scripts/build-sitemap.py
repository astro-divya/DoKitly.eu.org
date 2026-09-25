from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
BASE='https://dokitly.in/'
urls=[]
for p in sorted(ROOT.rglob('*.html')):
    if 'scripts' in p.parts: continue
    s=BeautifulSoup(p.read_text(encoding='utf-8',errors='ignore'),'html.parser')
    r=s.find('meta',attrs={'name':'robots'})
    if r and 'noindex' in (r.get('content') or '').lower(): continue
    c=s.find('link',rel='canonical')
    if not c: continue
    u=(c.get('href') or '').strip()
    if not u.startswith(BASE): continue
    urls.append(u)
urls=sorted(set(urls),key=lambda u:(u!=BASE,u))
xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
xml += [f'  <url><loc>{u}</loc></url>' for u in urls]
xml += ['</urlset>','']
(ROOT/'sitemap.xml').write_text('\n'.join(xml),encoding='utf-8')
print(f'Wrote {len(urls)} indexable canonical URLs to sitemap.xml')
