import { getHomepageData } from "@/lib/data/homepage";
import { site } from "@/lib/site";
import { HomeShell } from "@/components/home/home-shell";


// Destination sections read published data from the database on each request,
// so a publish/unpublish shows up immediately without a cache refresh.
export const dynamic = "force-dynamic";

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


