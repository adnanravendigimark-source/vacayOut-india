import { Icon, type Name } from "@/components/icons/icon";

interface TrustPoint {
  title: string;
  subtitle: string;
  icon: Name;
}

const TRUST_POINTS: TrustPoint[] = [
  {
    title: "Fact-checked",
    subtitle: "Information verified from trusted sources",
    icon: "checkCircle",
  },
  {
    title: "Expert-reviewed",
    subtitle: "Our editors review all pages before publishing",
    icon: "award",
  },
  {
    title: "AI-powered",
    subtitle: "Answers from our travel guides and verified data",
    icon: "sparkles",
  },
  {
    title: "Licensed photos",
    subtitle: "All images are properly credited",
    icon: "camera",
  },
  {
    title: "Affiliate disclosure",
    subtitle: "We may earn a commission if you book through our links",
    icon: "dollarSign",
  },
];

export function TravelSmarter() {
  return (
    <section className="bg-[#FAF9F5] border-y border-[#ECE9E2] py-8 sm:py-10">
      <div className="container-site">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
          {/* Left Title & Tagline */}
          <div className="shrink-0 max-w-xs">
            <h2 className="text-sm sm:text-base font-bold text-ink">
              Travel Smarter with VacayOut
            </h2>
            <p className="mt-0.5 text-xs text-[#777777]">
              Real information. Verified sources. Honest travel advice.
            </p>
          </div>

          {/* 5 Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 flex-1">
            {TRUST_POINTS.map((pt) => (
              <div key={pt.title} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-ink/80">
                  <Icon name={pt.icon} size={16} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">
                    {pt.title}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-[#777777] leading-relaxed">
                    {pt.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
