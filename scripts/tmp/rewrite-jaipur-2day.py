# Pilot rewrite: jaipur-2-days-forts-and-old-city, in place in content/travel/jaipur.json (same slug, same place).
import json, sys
P = "content/travel/jaipur.json"
d = json.load(open(P))
d["sources"].update({
 "CPO_VISIT": {"url": "https://citypalace.org/visit", "title": "Visit — The City Palace, Jaipur (official)", "authority": "other"},
 "PCP_FEES26": {"url": "https://www.pinkcitypost.com/visiting-jaipurs-heritage-sites-to-cost-more-from-jan-1-what-tourists-should-know/", "title": "Visiting Jaipur's heritage sites to cost more from Jan 1 — PinkCity Post (29 Dec 2025)", "authority": "media"},
 "HM_COMPOSITE": {"url": "https://www.hawa-mahal.com/tourist-composite-ticket/", "title": "Tourist Composite Ticket — hawa-mahal.com", "authority": "other"},
 "TRV_FORTS": {"url": "https://www.trivenicabs.in/blog/nahargarh-fort-jaipur-complete-guide-2026", "title": "Nahargarh Fort Jaipur guide 2026 — Triveni Cabs", "authority": "travel_platform"},
 "CAT_JG": {"url": "https://www.captureatrip.com/blog/jaigarh-fort", "title": "Jaigarh Fort: History, Timings and What to See — Capture A Trip", "authority": "travel_platform"},
})
F = d["facts"]
F.update({
 "CPV1": {"place": "rajasthan/city-palace", "topic": "City Palace tickets (official)", "claimType": "price",
  "claim": "The City Palace sells a Museum ticket (₹400 adult) covering the courtyards and galleries, and a Composite ticket (₹500 adult) that also covers Jaigarh Fort and the Royal Cenotaphs.",
  "conflictNote": "The official page shows one price set under both Indian and international headings; confirm the foreign-visitor price at the counter.",
  "evidence": [{"source": "CPO_VISIT", "quote": "Composite ₹500 — Courtyards, galleries, Jaigarh, Royal Cenotaphs"}]},
 "CPV2": {"place": "rajasthan/city-palace", "topic": "City Palace hours and gates (official)", "claimType": "opening_hours",
  "claim": "The City Palace museum is open 9:30 am–6:30 pm daily (last tickets 6 pm) and closes on Dhulandi, the second day of Holi; tickets are sold at Gate 1 near Jantar Mantar and Gate 2 at Jaleb Chowk.",
  "conflictNote": "Replaces CP5 (9:30 am–7:30 pm), which no longer matches the official page.",
  "evidence": [{"source": "CPO_VISIT", "quote": "open from 9.30 AM to 6.30 PM, seven days a week"}]},
 "RJF1": {"place": "rajasthan/jaipur", "topic": "State monument fees from 1 January 2026", "claimType": "price",
  "claim": "From 1 January 2026 Rajasthan's Department of Archaeology and Museums charges ₹200 (Indian) / ₹1,000 (foreign) at Amber Fort, and ₹100 / ₹600 at Hawa Mahal, Jantar Mantar, Nahargarh Fort and Albert Hall.",
  "conflictNote": "Reported by the press from the department's revision; confirm on the state ticket portal or at the counter.",
  "evidence": [{"source": "PCP_FEES26", "quote": "Amer/Amber Fort (Jaipur) Rs 100 Rs 200 Rs 300 Rs 1,000", "sourceDate": "29 December 2025"}]},
 "RJF2": {"place": "rajasthan/jaipur", "topic": "Jaipur two-day composite ticket", "claimType": "price", "kind": "estimate",
  "claim": "The state's two-day Jaipur composite ticket (Amber, Hawa Mahal, Jantar Mantar, Nahargarh, Albert Hall and the state gardens) costs about ₹550 for Indian adults and ₹1,700 for foreign adults.",
  "conflictNote": "Several sites still quote the pre-2026 ₹300 / ₹1,000; confirm on the day.",
  "evidence": [{"source": "HM_COMPOSITE", "quote": "An Indian adult pays Rs. 550, a foreign adult Rs. 1,700, and students less."}]},
 "JGD1": {"place": "rajasthan/jaigarh-fort", "topic": "Road from Amber up to Jaigarh", "claimType": "distance", "kind": "estimate",
  "claim": "Jaigarh is about 2.5 km by road above Amber Fort, or roughly a 30-minute walk uphill.",
  "evidence": [{"source": "CAT_JG", "quote": "The road to Jaigarh Fort is 2.5 km upward, or you can take a walk of 30 minutes"}]},
 "NGD1": {"place": "rajasthan/nahargarh-fort", "topic": "Ridge road between the three forts", "claimType": "distance", "kind": "estimate",
  "claim": "Nahargarh is about 6 km from the city by the winding Nahargarh Fort Road (20–25 minutes by taxi), and about 16 km from Amber along the ridge road via Jaigarh.",
  "evidence": [{"source": "TRV_FORTS", "quote": "Via Jaigarh Fort: 16 km (scenic ridge road with fort views)"}]},
})
plan = {
 "overview": "Jaipur's sights fall into two clusters, and this plan gives each its own day. Day 1 drives the ridge of hill forts north of the city — Amber, Jaigarh and Nahargarh — finishing with the view over Jaipur at dusk. Day 2 stays inside the walled old city, where Hawa Mahal, Jantar Mantar and the City Palace are a few minutes' walk apart, then the bazaars and an evening at Ram Niwas Garden. If one of your days is a Sunday, make it Day 1: most old-city bazaars close on Sundays.",
 "style": "Heritage city break, moderate pace",
 "start": "Jaipur (hotel in or near the walled city)",
 "end": "Jaipur",
 "season": "October to March is most comfortable. April–June afternoons are extremely hot — start at 8–9 am and rest indoors after lunch. July–August brings most of the rain.",
 "difficulty": "Easy to moderate — steep ramps at Amber and a lot of walking on Day 2",
 "transport": "Day 1: taxi or app cab for the fort loop (about 35 km in total). Day 2: on foot in the old city, with an e-rickshaw or auto for the last leg.",
 "days": [
  {"title": "Day 1 — Amber, Jaigarh and Nahargarh: the hill forts",
   "summary": "Amber's palaces in the cool of the morning, the cannon fort above it after lunch, and Nahargarh's ramparts for the late-afternoon view over the city.",
   "stops": [
    {"time": "8:30 am", "name": "Jal Mahal (roadside view)", "placeSlug": "jal-mahal", "duration": "10–15 minutes", "note": "Photo stop on the Amer road; the palace is seen from the promenade, not visited."},
    {"time": "9 am", "name": "Amber Fort", "placeSlug": "amber-fort", "duration": "2.5–3 hours", "note": "Enter by Suraj Pol into Jaleb Chowk, then the Diwan-e-Aam and the Sheesh Mahal. Arriving at opening beats the tour-group crowds. Buy the two-day composite ticket here if you are using it."},
    {"time": "12 noon", "name": "Lunch in Amer town", "duration": "About 1 hour", "note": "Eat below the fort before driving up — there are few food options at Jaigarh."},
    {"time": "1:15 pm", "name": "Jaigarh Fort", "placeSlug": "jaigarh-fort", "duration": "About 1.5 hours", "note": "The Jaivana cannon and views down onto Amber and Maota Lake. Jaigarh is run separately: pay at its gate, or use the City Palace Composite ticket."},
    {"time": "3:30 pm", "name": "Nahargarh Fort", "placeSlug": "nahargarh-fort", "duration": "About 2 hours", "note": "Madhvendra Palace and the ramparts over Jaipur. Closing time varies by season and between sources — ask at the gate, and in winter (sunset around 5:30–5:45 pm) arrive by 4 pm."}
   ],
   "travel": "Old city → Amber about 11 km (20–45 minutes depending on traffic). Amber → Jaigarh about 2.5 km uphill. Jaigarh → Nahargarh along the ridge road, about 16 km from Amber in all. Nahargarh → old city about 6 km down Nahargarh Fort Road (20–25 minutes). Agree a fixed price for the whole loop with the driver before setting off.",
   "distanceKm": 35, "distance": "About 35 km in a loop (estimate)", "driveTime": "About 1.5–2 hours of driving across the day (estimate)",
   "transport": "Taxi or app cab for the day",
   "meals": "Breakfast before 8:30 am. Lunch in Amer town. Dinner back in the city — try dal baati churma or laal maas.",
   "overnight": "Jaipur — in or near the walled city, so Day 2 starts on foot",
   "logistics": "Carry water and a hat: the Amber ramps and Jaigarh ramparts have little shade. Monuments close on Dhulandi (the day after Holika Dahan)."},
  {"title": "Day 2 — The walled city: Hawa Mahal, Jantar Mantar and City Palace",
   "summary": "Three of Jaipur's best-known sights within a few minutes' walk, the bazaars in the afternoon, and street food beside the lit-up Albert Hall.",
   "stops": [
    {"time": "9 am", "name": "Hawa Mahal", "placeSlug": "hawa-mahal", "duration": "About 1 hour", "note": "See the 953-window facade from the street first, then enter from the rear and climb the ramps for the view over Siredeori Bazaar."},
    {"time": "10:15 am", "name": "Jantar Mantar", "placeSlug": "jantar-mantar", "duration": "About 1 hour", "note": "A guide makes the instruments far easier to understand; the giant Vrihat Samrat Yantra sundial is the centrepiece."},
    {"time": "11:30 am", "name": "City Palace", "placeSlug": "city-palace", "duration": "2–2.5 hours", "note": "Enter at Gate 1 by Jantar Mantar. The Museum ticket covers the courtyards and galleries; the upper Chandra Mahal floors need the Royal Tour, sold only at the counter."},
    {"time": "2 pm", "name": "Lunch and rest", "duration": "1.5 hours", "note": "Get out of the midday sun before the markets."},
    {"time": "3:30 pm", "name": "Johari Bazaar and Bapu Bazaar", "duration": "2–2.5 hours", "note": "Jewellery and textiles on Johari; mojari shoes and block prints on Bapu. Most shops close on Sundays."},
    {"time": "6:30 pm", "name": "Albert Hall (lit up) and Masala Chowk", "placeSlug": "albert-hall-museum", "duration": "1.5–2 hours", "note": "The museum building is lit in colour every evening; Masala Chowk in the same Ram Niwas Garden gathers Jaipur's street-food stalls."}
   ],
   "travel": "Hawa Mahal, Jantar Mantar and the City Palace are a short walk apart. Bapu Bazaar → Ram Niwas Garden is a short e-rickshaw or auto ride. The Metro Pink Line stops at Badi Chaupar beside Hawa Mahal.",
   "distance": "Under 5 km, mostly on foot (estimate)",
   "transport": "Walking, e-rickshaw or auto",
   "meals": "Lassi or kachori in the old city for breakfast; lunch near the City Palace; dinner at Masala Chowk.",
   "overnight": "Jaipur, or an evening train or flight onward",
   "logistics": "The old city's bazaars are busy and crowded; keep valuables close. Carry small cash for rickshaws, though UPI is widely accepted."}
 ],
 "budget": {
  "assumptions": "Per adult, monument entry and local transport only. Hotel, meals, guides and shopping are not included because they vary too widely to estimate honestly. Rates are those reported after the 1 January 2026 revision — confirm at the counter.",
  "lines": [
   {"label": "Jaipur two-day composite ticket", "amount": "About ₹550 (Indian) / ₹1,700 (foreign)", "basis": "Covers Amber, Hawa Mahal, Jantar Mantar, Nahargarh and Albert Hall; reported price, confirm on the day"},
   {"label": "Or single tickets: Amber Fort", "amount": "₹200 (Indian) / ₹1,000 (foreign)", "basis": "State rate from 1 January 2026"},
   {"label": "Or single tickets: Hawa Mahal, Jantar Mantar, Nahargarh", "amount": "₹100 / ₹600 each", "basis": "State rate from 1 January 2026"},
   {"label": "City Palace Museum ticket", "amount": "₹400 per adult", "basis": "Official City Palace site"},
   {"label": "City Palace Composite (adds Jaigarh and Royal Cenotaphs)", "amount": "₹500 per adult", "basis": "Official City Palace site"},
   {"label": "Auto-rickshaw, Jaipur to Amer", "amount": "₹200–250 one way", "basis": "Incredible India guidance"}
  ]
 },
 "booking": [
  {"item": "State monument tickets", "detail": "Buy single or composite tickets at the Amber, Hawa Mahal, Jantar Mantar or Albert Hall counters; the composite is valid for two days."},
  {"item": "City Palace", "detail": "Tickets at Gate 1 (near Jantar Mantar) or Gate 2 (Jaleb Chowk); the Chandra Mahal Royal Tour is sold only at the counter."},
  {"item": "Day 1 taxi", "detail": "Book a cab for the Amber–Jaigarh–Nahargarh loop the evening before and fix the price and waiting time."},
  {"item": "Trains onward", "detail": "Book Jaipur–Delhi Shatabdi or Rajdhani services on IRCTC in advance, especially October–March."}
 ],
 "alternatives": [
  "Indian visitors: the composite only saves money if you also go into Albert Hall — Amber, Hawa Mahal, Jantar Mantar and Nahargarh bought singly total ₹500.",
  "Foreign visitors: the composite (about ₹1,700) is well below the four single tickets (₹2,800).",
  "Planning to see both Jaigarh and the City Palace? Take the City Palace Composite (₹500) instead of the Museum ticket, and ask whether it can be used across two days.",
  "Amber's evening sound and light show can replace the Nahargarh visit — check the season's show times.",
  "On a Sunday, swap the bazaars for the Albert Hall Museum inside and a longer City Palace visit.",
  "Families with young children: drop Jaigarh and keep a longer lunch break on Day 1."
 ],
 "tips": [
  "Be at Amber by 9 am: tour coaches arrive mid-morning.",
  "Do the hill forts on the same day — they share one ridge road, so splitting them doubles the driving.",
  "All state monuments and the City Palace close on Dhulandi, the day after Holika Dahan.",
  "Hire licensed guides at the monument counters rather than from touts at the gates."
 ],
 "prep": [
  {"title": "Heat", "body": "From April to June, keep outdoor sightseeing to the morning and late afternoon; carry water, a hat and sunscreen."},
  {"title": "Money", "body": "UPI works at most counters and shops. International visitors can use the UPI One World wallet after a passport-and-visa check; carry some cash for rickshaws."},
  {"title": "Dress", "body": "Shoulders and knees covered is respectful at temples such as Sila Devi inside Amber; comfortable shoes for the ramps and ramparts."}
 ],
 "faqs": [
  {"q": "Is two days enough for Jaipur?", "a": "Two days covers the main sights — the three hill forts on one day and the walled city on the other. Add a third day for the Albert Hall Museum inside, Galtaji, or a slower pace."},
  {"q": "Should I buy the Jaipur composite ticket?", "a": "Foreign visitors almost always save. Indian visitors save only if they also enter Albert Hall. Jaigarh and the City Palace are not part of it."},
  {"q": "How do I get from Jaipur to Amber Fort?", "a": "It is about 11 km. An auto-rickshaw takes about 20–25 minutes and costs ₹200–250; a taxi for the full fort loop is easier if you are also going to Jaigarh and Nahargarh."}
 ]
}
for it in d["itineraries"]:
    if it["slug"] == "jaipur-2-days-forts-and-old-city":
        it["summary"] = "Day one on the ridge of hill forts — Amber, Jaigarh and Nahargarh; day two on foot in the walled city at Hawa Mahal, Jantar Mantar, the City Palace and the bazaars."
        it["seoDescription"] = "A realistic two-day Jaipur itinerary with timings, distances and 2026 ticket prices: Amber, Jaigarh and Nahargarh forts, then Hawa Mahal, Jantar Mantar and City Palace."
        it["plan"] = plan
        it["facts"] = ["AM1","AM3","AM4","AMX1","JG2","JG3","JGD1","NG2","NG4","NGD1","JL3","HM2","HM3","JM4","JM6","CP4","CPV1","CPV2","AH5","JP8","JP9","JP10","JP11","JP12","JP17","RJF1","RJF2"]
        break
else: sys.exit("slug not found")
open(P, "w").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
print("ok")
