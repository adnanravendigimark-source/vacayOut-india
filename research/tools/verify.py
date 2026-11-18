#!/usr/bin/env python3
"""Re-fetches every source page in a content file and checks each evidence quote appears on it.

  python3 research/tools/verify.py content/travel/<cluster>.json
Set SSL_CERT_FILE to a bundle that adds missing intermediates for sites with broken chains.
Writes content/travel/checks/<cluster>.json (keys "<factId>#<index>"), the format scripts/seed-content.mts reads.
Text is compared after unescaping HTML (including JSON-embedded page data), stripping tags and collapsing whitespace.
"""
import html, json, re, sys, os, datetime, urllib.request

def norm(s):
    s = html.unescape(html.unescape(s))
    s = s.replace('\\/', '/').replace(' ', ' ')
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'[‘’]', "'", s); s = re.sub(r'[“”]', '"', s); s = re.sub(r'[–—]', '-', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s+([.,;:)\]])', r'\1', s); s = re.sub(r'([(\[])\s+', r'\1', s)
    return s.strip().lower()

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (VacayOut source check)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8', 'ignore')

path = sys.argv[1]
d = json.load(open(path))
pages, out = {}, {}
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
for sid, src in d['sources'].items():
    try: pages[sid] = norm(fetch(src['url']))
    except Exception as e: pages[sid] = None; print('unreachable', sid, e)
for fid, f in d['facts'].items():
    for i, ev in enumerate(f['evidence']):
        page = pages.get(ev['source'])
        sup = 'unreachable' if page is None else ('supports' if norm(ev['quote']) in page else 'quote_not_found')
        out[f'{fid}#{i}'] = {'support': sup, 'checkedAt': now, 'pageDate': None, 'quote': ev['quote'], 'strict': True}
        if sup != 'supports': print(sup, fid, ev['quote'][:80])
dst = os.path.join(os.path.dirname(path), 'checks', os.path.basename(path))
json.dump(out, open(dst, 'w'), indent=1, ensure_ascii=False)
print(f"{sum(v['support']=='supports' for v in out.values())}/{len(out)} quotes found -> {dst}")
