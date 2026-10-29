import { getHomepageData } from "@/lib/data/homepage";
import { site } from "@/lib/site";
import { HomeShell } from "@/components/home/home-shell";


// Served from the CDN cache and rebuilt at most every 5 minutes; publishing in the admin refreshes it at once.
export const revalidate = 300;

export default async function HomePage() {
  const data = await getHomepageData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    inLanguage: "en-IN",
    description: "Cinematic AI-powered travel discovery and trip-planning platform for India.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <HomeShell data={data} />
    </>
  );
}


