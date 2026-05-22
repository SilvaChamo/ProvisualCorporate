import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoHorizontal from "../../Logo/logo_horizontal_clean.png";
import { SITE_NAV_LINKS } from "../../lib/siteNav";
import SitePageHeader from "./SitePageHeader";
import type { BreadcrumbItem } from "./SiteBreadcrumb.types";
import SiteFooter from "./SiteFooter";

interface SiteShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export default function SiteShell({ children, title, breadcrumbs }: SiteShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="site-bg min-h-screen text-gray-900 font-sans">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-[75px] grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <Link to="/" className="shrink-0 flex items-center h-full">
            <img src={logoHorizontal} alt="ProVisual Corporate" className="h-[52px] w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 flex-wrap">
            {SITE_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[15px] lg:text-base font-normal text-gray-700 hover:text-[#a21b7e] transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex text-[15px] lg:text-base font-normal text-[#a21b7e] border border-[#a21b7e] rounded-full px-6 py-2 hover:bg-[#a21b7e]/5 transition-colors whitespace-nowrap"
            >
              Gestão
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-gray-700"
              aria-label="Menu"
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-3">
            {SITE_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base text-gray-700 py-2.5"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="mt-2 text-center border border-[#a21b7e] text-[#a21b7e] text-sm py-2 rounded-full"
            >
              Gestão
            </Link>
          </div>
        )}

        {title && <SitePageHeader title={title} breadcrumbs={breadcrumbs} />}
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-14">{children}</main>

      <SiteFooter />
    </div>
  );
}
