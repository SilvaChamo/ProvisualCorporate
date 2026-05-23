import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "./SiteBreadcrumb.types";

interface SitePageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export default function SitePageHeader({ title, breadcrumbs }: SitePageHeaderProps) {
  return (
    <div className="bg-[#3d001d] text-white">
      <div className="px-6 py-8 text-center sm:py-10">
        <h1 className="site-section-title mb-0 text-white">{title}</h1>
      </div>

      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 pb-3 flex items-center justify-center min-h-[40px]">
          <nav aria-label="Caminho">
            <ol className="flex flex-wrap items-center justify-center gap-1 text-sm text-white/75">
              {breadcrumbs.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight size={13} className="text-white/40 shrink-0" />}
                  {item.href ? (
                    <Link to={item.href} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-white/90">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
    </div>
  );
}
