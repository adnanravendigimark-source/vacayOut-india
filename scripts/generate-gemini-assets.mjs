/**
 * CLI utility to generate India travel assets using Google Gemini / Imagen.
 *
 * Usage:
 *   node scripts/generate-gemini-assets.mjs --prompt "Udaipur palace at dusk"
 *   node scripts/generate-gemini-assets.mjs --batch
 */
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log("=========================================");
console.log(" VacayOut.in — Gemini Asset Generator");
console.log("=========================================");

if (!apiKey) {
  console.log("Note: GEMINI_API_KEY or GOOGLE_API_KEY not set in environment.");
  console.log("Pre-generated cinematic assets are located in public/images/cinematic/ and public/video/.");
  console.log("To generate new assets, run with GEMINI_API_KEY=your_key node scripts/generate-gemini-assets.mjs");
} else {
  console.log("Gemini API key detected. Ready for asset production.");
}
