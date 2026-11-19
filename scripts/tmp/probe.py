import sys,re
src=open("research/tools/verify.py").read(); ns={}; exec(src.split("path = sys.argv[1]")[0], ns)
url=sys.argv[1]
try: t=ns["norm"](ns["fetch"](url))
except Exception as e: print("ERR",str(e)[:100]); sys.exit()
print("len",len(t))
for pat in sys.argv[2:]:
  for m in list(re.finditer(re.escape(ns["norm"](pat)),t))[:3]: print('  >',t[max(0,m.start()-150):m.end()+150])
