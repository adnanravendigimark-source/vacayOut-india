#!/usr/bin/env python3
"""Helper for the itinerary rewrite (content/travel/*.json). Commands:
  facts <regex> [place-regex]          search facts in all content files
  import <target.json> <file:FID>...   copy facts (+their sources) into target; same claim => same finding on seed
  verify <file.json> <FID>...          re-check quotes of these facts on live pages; append to checks/<file>
  put <file.json> <itinerary.json>     insert/replace itinerary by slug in file (keeps file formatting)
"""
import json, re, sys, glob, os, datetime
D = "content/travel"
def load(p): return json.load(open(p))
def save(p, d): open(p, "w").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
def allfiles(): return sorted(f for f in glob.glob(f"{D}/*.json"))
cmd = sys.argv[1]
if cmd == "facts":
    rx = re.compile(sys.argv[2], re.I); prx = re.compile(sys.argv[3], re.I) if len(sys.argv) > 3 else None
    for f in allfiles():
        d = load(f)
        for k, v in d.get("facts", {}).items():
            if (prx is None or prx.search(v["place"])) and (rx.search(v["claim"]) or rx.search(v["topic"])):
                print(f"{os.path.basename(f)[:-5]}:{k} [{v['place']}] ({v['claimType']}{'/'+v.get('kind') if v.get('kind') else ''}) {v['claim'][:220]}")
elif cmd == "import":
    tp = sys.argv[2]; t = load(tp); out = []
    for ref in sys.argv[3:]:
        fn, fid = ref.split(":"); s = load(f"{D}/{fn}.json"); fc = s["facts"][fid]
        same = [k for k, v in t["facts"].items() if v["place"] == fc["place"] and v["claim"] == fc["claim"] and v["topic"] == fc["topic"]]
        if same: out.append(same[0]); continue
        nid = fid if fid not in t["facts"] else f"{fn.upper()[:6]}_{fid}"
        for ev in fc["evidence"]:
            sid = ev["source"]
            if sid not in t["sources"]: t["sources"][sid] = s["sources"][sid]
            elif t["sources"][sid]["url"] != s["sources"][sid]["url"]: raise SystemExit(f"source id clash {sid}")
        t["facts"][nid] = fc; out.append(nid)
        # carry the quote checks too
        sc = f"{D}/checks/{fn}.json"; tc = f"{D}/checks/{os.path.basename(tp)}"
        if os.path.exists(sc):
            a = load(sc); b = load(tc) if os.path.exists(tc) else {}
            for i in range(len(fc["evidence"])):
                if f"{fid}#{i}" in a: b[f"{nid}#{i}"] = a[f"{fid}#{i}"]
            open(tc, "w").write(json.dumps(b, indent=1, ensure_ascii=False))
    save(tp, t); print(" ".join(out))
elif cmd == "verify":
    src = open("research/tools/verify.py").read(); ns = {}; exec(src.split("path = sys.argv[1]")[0], ns)
    p = sys.argv[2]; d = load(p); cp = f"{D}/checks/{os.path.basename(p)}"; c = load(cp) if os.path.exists(cp) else {}
    pages = {}; now = datetime.datetime.now(datetime.timezone.utc).isoformat(); bad = 0
    for fid in sys.argv[3:]:
        for i, ev in enumerate(d["facts"][fid]["evidence"]):
            s = ev["source"]
            if s not in pages:
                try: pages[s] = ns["norm"](ns["fetch"](d["sources"][s]["url"]))
                except Exception as e: pages[s] = None; print("unreachable", s, str(e)[:80])
            pg = pages[s]; sup = "unreachable" if pg is None else ("supports" if ns["norm"](ev["quote"]) in pg else "quote_not_found")
            c[f"{fid}#{i}"] = {"support": sup, "checkedAt": now, "pageDate": ev.get("sourceDate"), "quote": ev["quote"], "strict": True}
            if sup != "supports": bad += 1; print(sup, fid, s, ev["quote"][:90])
    open(cp, "w").write(json.dumps(c, indent=1, ensure_ascii=False)); print("bad", bad)
elif cmd == "put":
    p = sys.argv[2]; d = load(p); it = load(sys.argv[3])
    for k in list(it.get("newSources", {})): d["sources"][k] = it["newSources"][k]
    for k, v in it.get("newFacts", {}).items(): d["facts"][k] = v
    it.pop("newSources", None); it.pop("newFacts", None)
    idx = [i for i, x in enumerate(d["itineraries"]) if x["slug"] == it["slug"]]
    if idx: d["itineraries"][idx[0]] = it
    else: d["itineraries"].append(it)
    save(p, d); print("put", it["slug"], "replaced" if idx else "added")
