from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlparse,unquote
ROOT=Path(__file__).resolve().parents[1]
bad=[]
for p in ROOT.rglob('*.html'):
    s=BeautifulSoup(p.read_text(encoding='utf-8',errors='ignore'),'html.parser')
    for tag,attr in [('a','href'),('img','src'),('script','src'),('link','href')]:
        for el in s.find_all(tag):
            v=el.get(attr)
            if not v or v.startswith(('#','mailto:','tel:','javascript:','data:','blob:','http://','https://','//')): continue
            u=urlparse(v); path=unquote(u.path)
            if not path: continue
            q=(ROOT/path.lstrip('/')) if path.startswith('/') else (p.parent/path)
            q=q.resolve()
            candidates=[q]
            if path.endswith('/'): candidates.append(q/'index.html')
            if not q.suffix: candidates.append(q/'index.html')
            if not any(c.exists() for c in candidates): bad.append((str(p.relative_to(ROOT)),v))
if bad:
    print('BROKEN',len(bad))
    for x in bad[:100]: print(*x,sep=' -> ')
    raise SystemExit(1)
print('Internal link/path check passed')
