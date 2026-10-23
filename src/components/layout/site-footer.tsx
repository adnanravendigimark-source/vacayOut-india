"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { routes } from "@/lib/routes";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ECE9E2] bg-white text-ink">
      <div className="container-site py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-8">
          {/* Brand Column (spans 2 on desktop) */}
          <div className="col-span-2 space-y-3">
            <Logo tone="dark" />
            <p className="text-xs text-[#777777] leading-relaxed">
              Discover India. Plan Better. Travel Smarter.
            </p>

            {/* Social Icons matching screenshot */}
            <div className="pt-2 flex items-center gap-3.5 text-[#777777]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="hover:text-coral transition-colors"
              >
                <Icon name="instagram" size={16} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="hover:text-coral transition-colors"
              >
                <Icon name="facebook" size={16} />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="hover:text-coral transition-colors"
              >
                <Icon name="youtube" size={16} />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (Twitter)"
                className="hover:text-coral transition-colors"
              >
                <Icon name="x" size={15} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="hover:text-coral transition-colors"
              >
                <Icon name="linkedin" size={16} />
              </a>
            </div>

            <p className="pt-4 text-[0.6875rem] text-[#999999]">
              &copy; {new Date().getFullYear()} VacayOut. All rights reserved.
            </p>
          </div>

          {/* Explore India Column */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink">Explore India</p>
            <ul className="space-y-2 text-xs text-[#666666]">
              <li>
                <Link href="/india" className="hover:text-coral transition-colors">
                  States & UTs
                </Link>
              </li>
              <li>
                <Link href={routes.destinations} className="hover:text-coral transition-colors">
                  Destinations
                </Link>
              </li>
              <li>
                <Link href="/#trip-types" className="hover:text-coral transition-colors">
                  Things to do
                </Link>
              </li>
              <li>
                <Link href="/#guides" className="hover:text-coral transition-colors">
                  Travel guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink">Quick Links</p>
            <ul className="space-y-2 text-xs text-[#666666]">
              <li>
                <Link href="/#itineraries" className="hover:text-coral transition-colors">
                  Itineraries
                </Link>
              </li>
              <li>
                <Link href={routes.chat} className="hover:text-coral transition-colors">
                  Plan a trip with AI
                </Link>
              </li>
              <li>
                <Link href={routes.about} className="hover:text-coral transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <a href="mailto:hello@vacayout.in" className="hover:text-coral transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink">Legal</p>
            <ul className="space-y-2 text-xs text-[#666666]">
              <li>
                <Link href="/privacy" className="hover:text-coral transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-coral transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-coral transition-colors">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/sources" className="hover:text-coral transition-colors">
                  Sources & Editorial Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Column (spans 2 on desktop) */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:min-w-[15rem] space-y-3">
            <p className="text-xs font-bold text-ink">Get travel inspiration</p>
            <p className="text-xs text-[#777777] leading-relaxed">
              Join our newsletter for the latest destinations, travel tips and special deals.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you for subscribing to VacayOut!");
              }}
              className="flex items-center rounded-lg border border-[#D5D1C7] bg-white p-1 shadow-xs focus-within:border-coral focus-within:ring-2 focus-within:ring-coral/20"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Your email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="Your email address"
                className="flex-1 min-w-0 bg-transparent px-2 text-xs text-ink outline-none placeholder:text-[#999999]"
              />
              <button
                type="submit"
                aria-label="Subscribe to newsletter"
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#2D5A3F] text-white hover:bg-[#234832] transition-colors"
              >
                <Icon name="send" size={12} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar matching screenshot */}
        <div className="mt-12 pt-6 border-t border-[#ECE9E2] flex items-center justify-between text-[0.6875rem] text-[#888888]">
          <p>India only</p>
          <p>Affiliate links may earn us a commission</p>
        </div>
      </div>
    </footer>
  );
}
