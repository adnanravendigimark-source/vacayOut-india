import { quickAnswer } from "@/lib/chat/live/agent";
const q = process.argv[2];
let t0 = performance.now();
const res = await quickAnswer({ turns: [{ role: "user", content: q }], memory: null }, (e) => {
  if (e.type === "block") console.log("BLOCK", Math.round(performance.now() - t0), JSON.stringify(e.block).slice(0, 1500));
}, { allowResearch: async () => true, getCachedAnswer: async () => null, putCachedAnswer: async () => {} });
console.log(res.meta.timing);
process.exit(0);
