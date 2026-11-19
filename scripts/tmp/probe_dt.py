import sys,re
src=open("research/tools/verify.py").read(); ns={}; exec(src.split("path = sys.argv[1]")[0], ns)
for pair in sys.argv[1:]:
  url=f"https://daytrip.com/en/transfers/{pair}"
  try: t=ns["norm"](ns["fetch"](url))
  except Exception as e: print(pair,"ERR",str(e)[:60]); continue
  m=re.search(r"total distance ↔ [0-9.]+ km estimated time [0-9a-z ]+?(?= rated)",t)
  print(pair, "|", m.group(0) if m else "none")
