import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

const CONTACT = "hello@vacayout.in";

export default function Page() {
  return (
    <InfoPage
      eyebrow="LEGAL"
      title="Privacy Policy"
      intro="What VacayOut collects, why, who helps us run the service, how long we keep it, and how to have it deleted. Last updated 13 November 2026."
      note="Draft written from how the service actually works. It still needs legal review (including India's Digital Personal Data Protection Act, 2023) before launch."
      blocks={[
        {
          heading: "What we collect",
          list: [
            "Account details if you sign up: your name, email address, a securely hashed password (or your Google account ID if you use Google sign-in), and when you last signed in.",
            "Your trip questions. They are sent to our AI provider to write the answer. Your conversations are saved in your own browser, not on our servers.",
            "Usage records for each AI answer: time, outcome, destination discussed and cost. These are linked to a scrambled (hashed) visitor key, never to your raw IP address.",
            "Technical data needed to keep the service safe: hashed network identifiers for rate limits, failed sign-in attempts (kept for one day) and error reports (kept for 30 days).",
          ],
        },
        {
          heading: "Cookies",
          list: [
            "Sign-in cookie: keeps you signed in (up to 30 days).",
            "vo_anon: a random ID that counts free AI questions for visitors who are not signed in (up to one year).",
            "Google reCAPTCHA on the sign-up and sign-in forms, to stop automated sign-ups. Google's privacy policy applies to it.",
            "We do not use advertising cookies.",
          ],
        },
        {
          heading: "Who helps us run VacayOut",
          paragraphs: ["We share only what each service needs to do its job:"],
          list: [
            "OpenAI: writes AI answers from your questions.",
            "Vercel: hosting and image storage.",
            "Neon: our database (account details and usage records).",
            "Resend: sends account confirmation emails.",
            "Google: optional sign-in with Google, and reCAPTCHA.",
            "OpenStreetMap and Wikimedia Commons: map tiles and photos load from them, so they see your IP address like any website you visit.",
            "Booking partners: if you click a booking link you leave VacayOut, and that site's own policy applies.",
          ],
        },
        {
          heading: "How long we keep it",
          list: [
            "Account details: until you delete your account.",
            "AI usage records: 12 months, then deleted.",
            "Error reports: 30 days. Failed sign-in records: 1 day. Email confirmation links: deleted 7 days after they expire.",
            "Database backups made for recovery are kept for up to 14 days.",
          ],
        },
        {
          heading: "Your choices and rights",
          list: [
            "Delete your account at any time from Your account → Delete my account. It removes your name, email and sign-in details right away.",
            "Ask us for a copy of your data, a correction, or deletion by emailing " + CONTACT + ".",
            "Clear your browser storage to remove conversations saved on your device.",
          ],
        },
        {
          heading: "Contact and grievances",
          paragraphs: ["For any privacy question or complaint, email " + CONTACT + ". We aim to reply within 7 days."],
        },
      ]}
    />
  );
}
